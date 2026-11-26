import jsPDF from 'jspdf';
import {
  ColorProfile,
  CuttingGuideStyle,
  DocumentPageItem,
  DocumentPrintSettings,
  LaminationCardSettings,
  MarginSettings,
  NIDCardSettings,
  PaperDimensions,
  PaperOrientation,
  PhotoPrintSettings,
  PrintQuality,
  StudioMode,
  StudioPhotoItem,
} from '../types';
import { calculateDocumentPlacement } from './documentLayout';
import { loadImage } from './imageProcessing';
import { calculatePhotoPrintGrid } from './photoPrintLayout';

export interface RenderSheetOptions {
  mode: StudioMode;
  paper: PaperDimensions;
  orientation: PaperOrientation;
  margins: MarginSettings;
  cuttingGuide: CuttingGuideStyle;
  bleedArea: number; // mm
  colorProfile: ColorProfile;
  dpi: PrintQuality;
  // Passport items
  photos?: StudioPhotoItem[];
  itemPositions?: { x: number; y: number; width: number; height: number; photo: StudioPhotoItem }[];
  // NID items
  nid?: NIDCardSettings;
  // Lamination Side-by-Side ID Card items
  lamination?: LaminationCardSettings;
  // Document / Fit-to-Paper items
  documentSettings?: DocumentPrintSettings;
  // Photo Print (4R / 4-Up A4 / Studio Print Sizes)
  photoPrintSettings?: PhotoPrintSettings;
}

/**
 * Converts millimeters to pixels given a target DPI
 */
export function mmToPixels(mm: number, dpi: number): number {
  return Math.round((mm / 25.4) * dpi);
}

/**
 * Renders the complete paper sheet onto an offscreen canvas at exact physical DPI
 */
export async function generateHighResSheetCanvas(
  options: RenderSheetOptions
): Promise<HTMLCanvasElement> {
  const {
    paper,
    orientation,
    margins,
    cuttingGuide,
    bleedArea,
    colorProfile,
    dpi,
    mode,
    itemPositions,
    nid,
    lamination,
    documentSettings,
    photoPrintSettings,
  } = options;

  const isLandscape = orientation === 'landscape';
  const sheetWidthMm = isLandscape ? paper.height : paper.width;
  const sheetHeightMm = isLandscape ? paper.width : paper.height;

  const canvas = document.createElement('canvas');
  canvas.width = mmToPixels(sheetWidthMm, dpi);
  canvas.height = mmToPixels(sheetHeightMm, dpi);

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');

  // Fill pure white paper background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const scale = dpi / 25.4; // pixels per mm

  if (mode === 'passport' && itemPositions && itemPositions.length > 0) {
    const uniqueSrcs = Array.from(
      new Set(itemPositions.map((item) => item.photo.processedSrc || item.photo.originalSrc).filter(Boolean))
    );
    const loadedEntries = await Promise.all(
      uniqueSrcs.map(async (src) => {
        try {
          return [src, await loadImage(src)] as const;
        } catch (err) {
          console.error('Failed to preload passport image:', err);
          return null;
        }
      })
    );
    const imgCache = new Map<string, HTMLImageElement>();
    for (const entry of loadedEntries) {
      if (entry) imgCache.set(entry[0], entry[1]);
    }

    for (const item of itemPositions) {
      const { x, y, width, height, photo } = item;
      const px = x * scale;
      const py = y * scale;
      const pWidth = width * scale;
      const pHeight = height * scale;

      // Draw photo using aspect-preserving object-fit: cover (matches preview & print 1:1)
      const img = imgCache.get(photo.processedSrc || photo.originalSrc);
      if (img) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(px, py, pWidth, pHeight);
        ctx.clip();
        const imgAspect = img.width / Math.max(1, img.height);
        const boxAspect = pWidth / Math.max(1, pHeight);
        let drawW = pWidth;
        let drawH = pHeight;
        if (imgAspect > boxAspect) {
          drawW = pHeight * imgAspect;
        } else {
          drawH = pWidth / imgAspect;
        }
        ctx.drawImage(img, px + (pWidth - drawW) / 2, py + (pHeight - drawH) / 2, drawW, drawH);
        ctx.restore();
      }

      // Draw cutting guide and bleed around photo
      drawCuttingGuides(ctx, px, py, pWidth, pHeight, cuttingGuide, bleedArea * scale, scale);
    }
  } else if (mode === 'nid' && nid && (nid.processedFrontImage || nid.processedBackImage || nid.frontImage || nid.backImage)) {
    const cardWidthMm = nid.cardWidth || 85.6;
    const cardHeightMm = nid.cardHeight || 53.98;
    const vGapMm = nid.verticalSpacing || 15;

    const totalHeightMm = cardHeightMm * 2 + vGapMm;
    const startXmm = nid.centerOnPage
      ? (sheetWidthMm - cardWidthMm) / 2
      : margins.left;
    const startYmm = nid.centerOnPage
      ? (sheetHeightMm - totalHeightMm) / 2
      : margins.top;

    const px = startXmm * scale;
    const pyFront = startYmm * scale;
    const pyBack = (startYmm + cardHeightMm + vGapMm) * scale;
    const pWidth = cardWidthMm * scale;
    const pHeight = cardHeightMm * scale;

    const frontSrc = nid.processedFrontImage || nid.frontImage;
    const backSrc = nid.processedBackImage || nid.backImage;
    const [frontImg, backImg] = await Promise.all([
      frontSrc ? loadImage(frontSrc).catch(() => null) : Promise.resolve(null),
      backSrc ? loadImage(backSrc).catch(() => null) : Promise.resolve(null),
    ]);

    // Draw Front
    if (frontSrc) {
      if (frontImg) ctx.drawImage(frontImg, px, pyFront, pWidth, pHeight);
      drawCuttingGuides(ctx, px, pyFront, pWidth, pHeight, cuttingGuide, bleedArea * scale, scale);
    }

    // Draw Back
    if (backSrc) {
      if (backImg) ctx.drawImage(backImg, px, pyBack, pWidth, pHeight);
      drawCuttingGuides(ctx, px, pyBack, pWidth, pHeight, cuttingGuide, bleedArea * scale, scale);
    }
  } else if (
    mode === 'lamination' &&
    lamination &&
    (lamination.processedFrontImage ||
      lamination.frontImage ||
      lamination.processedBackImage ||
      lamination.backImage)
  ) {
    const cardW = lamination.cardWidth || 85.6;
    const cardH = lamination.cardHeight || 54;
    const pW = cardW * scale;
    const pH = cardH * scale;
    const fx = lamination.frontX * scale;
    const fy = lamination.frontY * scale;
    const bx = lamination.backX * scale;
    const by = lamination.backY * scale;

    const drawCardImage = (
      img: HTMLImageElement,
      dx: number,
      dy: number,
      dw: number,
      dh: number,
      rotate180: boolean
    ) => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(dx, dy, dw, dh);
      ctx.clip();

      if (rotate180) {
        ctx.translate(dx + dw / 2, dy + dh / 2);
        ctx.rotate(Math.PI);
        ctx.translate(-(dx + dw / 2), -(dy + dh / 2));
      }

      if (lamination.imageFit === 'cover') {
        const imgAspect = img.width / Math.max(1, img.height);
        const boxAspect = dw / Math.max(1, dh);
        let drawW = dw;
        let drawH = dh;
        if (imgAspect > boxAspect) {
          drawW = dh * imgAspect;
        } else {
          drawH = dw / imgAspect;
        }
        ctx.drawImage(img, dx + (dw - drawW) / 2, dy + (dh - drawH) / 2, drawW, drawH);
      } else {
        ctx.drawImage(img, dx, dy, dw, dh);
      }
      ctx.restore();
    };

    const lamFrontSrc = lamination.processedFrontImage || lamination.frontImage;
    const lamBackSrc = lamination.processedBackImage || lamination.backImage;
    const [fImg, bImg] = await Promise.all([
      lamFrontSrc ? loadImage(lamFrontSrc).catch(() => null) : Promise.resolve(null),
      lamBackSrc ? loadImage(lamBackSrc).catch(() => null) : Promise.resolve(null),
    ]);

    if (lamFrontSrc) {
      if (fImg) drawCardImage(fImg, fx, fy, pW, pH, false);
      drawCuttingGuides(ctx, fx, fy, pW, pH, lamination.outerCutGuide, 0, scale);
    }

    if (lamBackSrc) {
      if (bImg) drawCardImage(bImg, bx, by, pW, pH, lamination.backRotate180);
      drawCuttingGuides(ctx, bx, by, pW, pH, lamination.outerCutGuide, 0, scale);
    }

    // Center fold crease line
    if (lamination.showFoldLine && Math.abs(lamination.frontY - lamination.backY) <= 1) {
      const seamXmm =
        lamination.frontX < lamination.backX
          ? (lamination.frontX + cardW + lamination.backX) / 2
          : (lamination.backX + cardW + lamination.frontX) / 2;
      const minYmm = Math.min(lamination.frontY, lamination.backY);
      const sx = seamXmm * scale;
      const sy1 = Math.max(0, minYmm - 3) * scale;
      const sy2 = (minYmm + cardH + 3) * scale;
      ctx.save();
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = Math.max(1, Math.round(0.25 * scale));
      ctx.setLineDash([2.5 * scale, 2 * scale]);
      drawLine(ctx, sx, sy1, sx, sy2);
      ctx.restore();
    }
  } else if (mode === 'document' && documentSettings && documentSettings.pages.length > 0) {
    const activeDoc =
      documentSettings.pages[documentSettings.activePageIndex] || documentSettings.pages[0];
    if (activeDoc) {
      await drawDocumentPageOnCanvas(
        ctx,
        activeDoc,
        sheetWidthMm,
        sheetHeightMm,
        scale,
        documentSettings
      );
    }
  } else if (mode === 'photoprint' && photoPrintSettings) {
    const grid = calculatePhotoPrintGrid({
      paper,
      orientation,
      sizeId: photoPrintSettings.sizeId,
      customWidthMm: photoPrintSettings.customWidthMm,
      customHeightMm: photoPrintSettings.customHeightMm,
      marginMm: photoPrintSettings.marginMm,
      gapMm: photoPrintSettings.gapMm,
      autoRotateToFit: photoPrintSettings.autoRotateToFit,
    });

    const uniqueSrcs = Array.from(
      new Set(
        grid.slots
          .map((rect) => photoPrintSettings.slots[rect.index]?.imageSrc)
          .filter((src): src is string => Boolean(src))
      )
    );
    const loadedEntries = await Promise.all(
      uniqueSrcs.map(async (src) => {
        try {
          return [src, await loadImage(src)] as const;
        } catch (err) {
          console.error('Failed to preload photo print slot:', err);
          return null;
        }
      })
    );
    const imgCache = new Map<string, HTMLImageElement>();
    for (const entry of loadedEntries) {
      if (entry) imgCache.set(entry[0], entry[1]);
    }

    for (const rect of grid.slots) {
      const slot = photoPrintSettings.slots[rect.index];
      if (!slot || !slot.imageSrc) continue;
      const px = rect.x * scale;
      const py = rect.y * scale;
      const pWidth = rect.width * scale;
      const pHeight = rect.height * scale;

      const img = imgCache.get(slot.imageSrc);
      if (img) {
        const rotDeg = ((slot.rotation % 360) + 360) % 360;
        const isOdd90 = rotDeg === 90 || rotDeg === 270;
        const targetW = isOdd90 ? pHeight : pWidth;
        const targetH = isOdd90 ? pWidth : pHeight;
        const fit = slot.fitMode || photoPrintSettings.fitMode || 'cover';
        const ratio =
          fit === 'contain'
            ? Math.min(targetW / Math.max(1, img.width), targetH / Math.max(1, img.height))
            : Math.max(targetW / Math.max(1, img.width), targetH / Math.max(1, img.height));
        const drawW = img.width * ratio;
        const drawH = img.height * ratio;

        ctx.save();
        ctx.beginPath();
        ctx.rect(px, py, pWidth, pHeight);
        ctx.clip();
        ctx.translate(px + pWidth / 2, py + pHeight / 2);
        if (rotDeg !== 0) {
          ctx.rotate((rotDeg * Math.PI) / 180);
        }
        ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();
      }

      drawCuttingGuides(ctx, px, py, pWidth, pHeight, cuttingGuide, bleedArea * scale, scale);
    }
  }

  // Apply color profile if Black & White or CMYK
  if (colorProfile === 'bw') {
    applyGrayscale(ctx, canvas.width, canvas.height);
  } else if (colorProfile === 'cmyk') {
    applyCmykSimulation(ctx, canvas.width, canvas.height);
  }

  return canvas;
}

async function drawDocumentPageOnCanvas(
  ctx: CanvasRenderingContext2D,
  docPage: DocumentPageItem,
  sheetWidthMm: number,
  sheetHeightMm: number,
  scale: number,
  documentSettings: DocumentPrintSettings
) {
  try {
    const img = await loadImage(docPage.processedSrc || docPage.originalSrc);
    const placement = calculateDocumentPlacement({
      imgWidth: docPage.naturalWidth || img.width || 1000,
      imgHeight: docPage.naturalHeight || img.height || 1414,
      paperWidthMm: sheetWidthMm,
      paperHeightMm: sheetHeightMm,
      marginMm: documentSettings.marginMm,
      fitMode: documentSettings.fitMode,
      autoRotateToFit: documentSettings.autoRotateToFit,
    });

    const clipX = placement.availXmm * scale;
    const clipY = placement.availYmm * scale;
    const clipW = placement.availWmm * scale;
    const clipH = placement.availHmm * scale;

    const drawX = placement.xMm * scale;
    const drawY = placement.yMm * scale;
    const drawW = placement.widthMm * scale;
    const drawH = placement.heightMm * scale;

    ctx.save();
    ctx.beginPath();
    ctx.rect(clipX, clipY, clipW, clipH);
    ctx.clip();

    if (placement.shouldRotate90) {
      ctx.translate(drawX + drawW / 2, drawY + drawH / 2);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(img, -drawH / 2, -drawW / 2, drawH, drawW);
    } else {
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
    }
    ctx.restore();
  } catch (err) {
    console.error('Failed to draw document page on canvas:', err);
  }
}

/**
 * Draws cutting guides, scissor icons, dashed outlines, corner crosshairs
 */
function drawCuttingGuides(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  style: CuttingGuideStyle,
  bleedPx: number,
  scale: number
) {
  if (style === 'none') return;

  ctx.save();
  ctx.strokeStyle = '#94a3b8'; // subtle slate-400
  ctx.lineWidth = Math.max(1, Math.round(0.2 * scale));

  if (style === 'dashed') {
    ctx.setLineDash([4 * scale, 3 * scale]);
    ctx.strokeRect(x, y, w, h);
  } else if (style === 'solid') {
    ctx.setLineDash([]);
    ctx.strokeRect(x, y, w, h);
  } else if (style === 'crosshair') {
    ctx.setLineDash([]);
    const markLen = 3 * scale; // 3mm mark
    // Top-left
    drawLine(ctx, x - markLen, y, x, y);
    drawLine(ctx, x, y - markLen, x, y);
    // Top-right
    drawLine(ctx, x + w, y, x + w + markLen, y);
    drawLine(ctx, x + w, y - markLen, x + w, y);
    // Bottom-left
    drawLine(ctx, x - markLen, y + h, x, y + h);
    drawLine(ctx, x, y + h, x, y + h + markLen);
    // Bottom-right
    drawLine(ctx, x + w, y + h, x + w + markLen, y + h);
    drawLine(ctx, x + w, y + h, x + w, y + h + markLen);
  } else if (style === 'scissors') {
    // Subtle dotted rectangle + scissors glyph
    ctx.setLineDash([2 * scale, 2 * scale]);
    ctx.strokeRect(x, y, w, h);

    // Tiny scissor mark at top-left
    ctx.font = `${Math.round(3.5 * scale)}px sans-serif`;
    ctx.fillStyle = '#64748b';
    ctx.fillText('✂', x - 4 * scale, y - 1 * scale);
  }

  // Draw bleed indicator if bleedArea > 0
  if (bleedPx > 0) {
    ctx.setLineDash([2 * scale, 2 * scale]);
    ctx.strokeStyle = '#cbd5e1';
    ctx.strokeRect(x - bleedPx, y - bleedPx, w + bleedPx * 2, h + bleedPx * 2);
  }

  ctx.restore();
}

function drawLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number
) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function applyGrayscale(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    d[i] = gray;
    d[i + 1] = gray;
    d[i + 2] = gray;
  }
  ctx.putImageData(imgData, 0, 0);
}

function applyCmykSimulation(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;
  // Simulates standard printer ink gamut compression
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i] / 255;
    const g = d[i + 1] / 255;
    const b = d[i + 2] / 255;

    const k = 1 - Math.max(r, g, b);
    const c = (1 - r - k) / (1 - k || 1);
    const m = (1 - g - k) / (1 - k || 1);
    const y = (1 - b - k) / (1 - k || 1);

    // Reconstruct into printer simulated sRGB
    d[i] = Math.round(255 * (1 - c) * (1 - k));
    d[i + 1] = Math.round(255 * (1 - m) * (1 - k));
    d[i + 2] = Math.round(255 * (1 - y) * (1 - k));
  }
  ctx.putImageData(imgData, 0, 0);
}

/**
 * Exports to exact mm-sized PDF using jsPDF (supports multi-page documents)
 */
export async function exportToPdf(options: RenderSheetOptions, filename: string) {
  const isLandscape = options.orientation === 'landscape';
  const sheetWidthMm = isLandscape ? options.paper.height : options.paper.width;
  const sheetHeightMm = isLandscape ? options.paper.width : options.paper.height;

  const pdf = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [sheetWidthMm, sheetHeightMm],
    compress: true,
  });

  if (options.mode === 'document' && options.documentSettings && options.documentSettings.pages.length > 0) {
    const pages = options.documentSettings.pages;
    for (let i = 0; i < pages.length; i++) {
      if (i > 0) {
        pdf.addPage([sheetWidthMm, sheetHeightMm], isLandscape ? 'landscape' : 'portrait');
      }
      const pageCanvas = await generateHighResSheetCanvas({
        ...options,
        documentSettings: {
          ...options.documentSettings,
          activePageIndex: i,
        },
      });
      const imgData = pageCanvas.toDataURL('image/jpeg', 0.94);
      pdf.addImage(imgData, 'JPEG', 0, 0, sheetWidthMm, sheetHeightMm, undefined, 'FAST');
    }
    pdf.save(filename);
    return;
  }

  const canvas = await generateHighResSheetCanvas(options);
  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  pdf.addImage(imgData, 'JPEG', 0, 0, sheetWidthMm, sheetHeightMm, undefined, 'FAST');
  pdf.save(filename);
}

/**
 * Exports to high-res PNG or JPG file download
 */
export async function exportToImage(
  options: RenderSheetOptions,
  format: 'png' | 'jpeg',
  filename: string
) {
  const canvas = await generateHighResSheetCanvas(options);
  const mime = format === 'png' ? 'image/png' : 'image/jpeg';
  const quality = format === 'png' ? undefined : 0.95;
  const dataUrl = canvas.toDataURL(mime, quality);

  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export interface DirectPrintOptions {
  widthMm?: number;
  heightMm?: number;
  title?: string;
}

/**
 * Collects all same-origin compiled CSS rules synchronously (zero network wait, 100% offline-safe)
 */
function collectSameOriginCss(): string {
  const chunks: string[] = [];

  for (const sheet of Array.from(document.styleSheets)) {
    const ownerEl = sheet.ownerNode as HTMLElement | null;
    if (ownerEl && ownerEl.id === 'dynamic-print-page-size') {
      continue;
    }

    try {
      const rules = sheet.cssRules;
      if (rules && rules.length > 0) {
        const parts: string[] = [];
        for (let i = 0; i < rules.length; i++) {
          parts.push(rules[i].cssText);
        }
        chunks.push(parts.join('\n'));
      }
    } catch {
      // Cross-origin stylesheets (e.g. Google Fonts) cannot be read via cssRules; skipped safely
    }
  }

  return chunks.join('\n');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Triggers ultra-fast direct printing using an isolated clean iframe.
 * Eliminates Chromium "Loading preview..." hangs caused by heavy SPA DOM & backdrop-filter layers.
 */
export function triggerDirectPrint(options?: DirectPrintOptions) {
  const printRoot = document.getElementById('print-sheet-root');
  if (!printRoot) {
    window.print();
    return;
  }

  const widthMm = options?.widthMm && options.widthMm > 0 ? options.widthMm : 210;
  const heightMm = options?.heightMm && options.heightMm > 0 ? options.heightMm : 297;
  const docTitle = escapeHtml(options?.title || 'NextStudio Print');

  // Remove any stale print iframe from a previous job
  const existingIframe = document.getElementById('nextstudio-print-iframe');
  if (existingIframe && existingIframe.parentNode) {
    existingIframe.parentNode.removeChild(existingIframe);
  }

  // Clone the print container and strip screen-hiding Tailwind classes so it paints immediately
  const clonedRoot = printRoot.cloneNode(true) as HTMLElement;
  clonedRoot.classList.remove('hidden', 'print:block');
  clonedRoot.style.display = 'block';
  clonedRoot.style.visibility = 'visible';
  clonedRoot.style.opacity = '1';
  clonedRoot.style.position = 'relative';
  clonedRoot.style.left = '0';
  clonedRoot.style.top = '0';
  clonedRoot.style.margin = '0';
  clonedRoot.style.backgroundColor = '#ffffff';

  // Ensure all images inside the clone decode eagerly
  const clonedImgs = clonedRoot.querySelectorAll('img');
  clonedImgs.forEach((img) => {
    img.setAttribute('loading', 'eager');
    img.setAttribute('decoding', 'sync');
  });

  // Create off-screen iframe with real physical sheet dimensions (never 0x0 or display:none,
  // otherwise Chromium defers layout/paint and stalls or outputs blank print previews)
  const iframe = document.createElement('iframe');
  iframe.id = 'nextstudio-print-iframe';
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.left = '-10000px';
  iframe.style.top = '0';
  iframe.style.width = `${widthMm}mm`;
  iframe.style.height = `${heightMm}mm`;
  iframe.style.border = '0';
  iframe.style.margin = '0';
  iframe.style.padding = '0';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  iframe.style.backgroundColor = '#ffffff';
  document.body.appendChild(iframe);

  const iframeWin = iframe.contentWindow;
  const iframeDoc = iframeWin?.document;
  if (!iframeWin || !iframeDoc) {
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    window.print();
    return;
  }

  const inlineCss = collectSameOriginCss();

  // Include Google Fonts & SolaimanLipi webfont links only if online (cached in browser memory, never blocks offline)
  const fontLinksHtml =
    typeof navigator !== 'undefined' && navigator.onLine
      ? Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
          .filter((el) => {
            const href = el.getAttribute('href') || '';
            return href.includes('fonts.googleapis.com') || href.includes('fonts.maateen.me');
          })
          .map((el) => `<link rel="stylesheet" href="${escapeHtml(el.getAttribute('href') || '')}" />`)
          .join('\n')
      : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${docTitle}</title>
  ${fontLinksHtml}
  <style>${inlineCss}</style>
  <style id="nextstudio-iframe-print-overrides">
    @page {
      size: ${widthMm}mm ${heightMm}mm;
      margin: 0mm;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: ${widthMm}mm !important;
      height: auto !important;
      min-height: 0 !important;
      background: #ffffff !important;
      background-color: #ffffff !important;
      background-image: none !important;
      color: #000000 !important;
      overflow: visible !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    *, *::before, *::after {
      box-shadow: none !important;
      text-shadow: none !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
    }
    #print-sheet-root {
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
      position: relative !important;
      left: 0 !important;
      top: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      background-color: #ffffff !important;
      box-shadow: none !important;
      border: none !important;
      outline: none !important;
    }
    #print-sheet-root .print-page {
      position: relative !important;
      background: #ffffff !important;
      background-color: #ffffff !important;
      overflow: hidden !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .no-print {
      display: none !important;
    }
  </style>
</head>
<body>${clonedRoot.outerHTML}</body>
</html>`;

  iframeDoc.open();
  iframeDoc.write(html);
  iframeDoc.close();

  let hasPrinted = false;
  const executePrint = () => {
    if (hasPrinted) return;
    hasPrinted = true;

    const cleanup = () => {
      window.setTimeout(() => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      }, 300);
    };

    try {
      iframeWin.addEventListener('afterprint', cleanup, { once: true });
      iframeWin.focus();
      iframeWin.print();
    } catch {
      cleanup();
      window.print();
    }
  };

  // Wait briefly for all images inside the iframe to decode (near-instant for local data/blob URLs)
  const imgs = Array.from(iframeDoc.images);
  const allLocalOrReady = imgs.every(
    (img) => (img.complete && img.naturalWidth > 0) || img.src.startsWith('data:') || img.src.startsWith('blob:')
  );
  const waitForImages = Promise.all(
    imgs.map((img) => {
      if (img.complete && img.naturalWidth > 0) {
        return typeof img.decode === 'function' ? img.decode().catch(() => undefined) : Promise.resolve();
      }
      return new Promise<void>((resolve) => {
        const done = () => resolve();
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
      });
    })
  );

  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
  const waitForFonts =
    !isOffline && iframeDoc.fonts && iframeDoc.fonts.status === 'loading'
      ? Promise.race([
          iframeDoc.fonts.ready.catch(() => undefined),
          new Promise<void>((resolve) => window.setTimeout(resolve, 90)),
        ])
      : Promise.resolve();

  Promise.race([
    Promise.all([waitForImages, waitForFonts]),
    new Promise<void>((resolve) => window.setTimeout(resolve, allLocalOrReady ? 160 : 320)),
  ]).finally(() => {
    // Allow 1 paint frame so Chromium's print compositor gets the fully laid-out sheet immediately
    if (typeof iframeWin.requestAnimationFrame === 'function') {
      iframeWin.requestAnimationFrame(() => executePrint());
    } else {
      executePrint();
    }
  });
}
