import jsPDF from 'jspdf';
import {
  ColorProfile,
  CuttingGuideStyle,
  MarginSettings,
  NIDCardSettings,
  PaperDimensions,
  PaperOrientation,
  PrintQuality,
  StudioMode,
  StudioPhotoItem,
} from '../types';
import { loadImage } from './imageProcessing';

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
    for (const item of itemPositions) {
      const { x, y, width, height, photo } = item;
      const px = x * scale;
      const py = y * scale;
      const pWidth = width * scale;
      const pHeight = height * scale;

      // Draw photo
      try {
        const img = await loadImage(photo.processedSrc || photo.originalSrc);
        ctx.save();
        ctx.drawImage(img, px, py, pWidth, pHeight);
        ctx.restore();
      } catch (err) {
        console.error('Failed to draw photo on canvas:', err);
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

    // Draw Front
    if (nid.processedFrontImage || nid.frontImage) {
      try {
        const frontImg = await loadImage(nid.processedFrontImage || nid.frontImage!);
        ctx.drawImage(frontImg, px, pyFront, pWidth, pHeight);
      } catch (err) {
        console.error('Failed to draw NID front:', err);
      }
      drawCuttingGuides(ctx, px, pyFront, pWidth, pHeight, cuttingGuide, bleedArea * scale, scale);
    }

    // Draw Back
    if (nid.processedBackImage || nid.backImage) {
      try {
        const backImg = await loadImage(nid.processedBackImage || nid.backImage!);
        ctx.drawImage(backImg, px, pyBack, pWidth, pHeight);
      } catch (err) {
        console.error('Failed to draw NID back:', err);
      }
      drawCuttingGuides(ctx, px, pyBack, pWidth, pHeight, cuttingGuide, bleedArea * scale, scale);
    }
  }

  // Apply color profile if Black & White
  if (colorProfile === 'bw') {
    applyGrayscale(ctx, canvas.width, canvas.height);
  } else if (colorProfile === 'cmyk') {
    applyCmykSimulation(ctx, canvas.width, canvas.height);
  }

  return canvas;
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
 * Exports to exact mm-sized PDF using jsPDF
 */
export async function exportToPdf(options: RenderSheetOptions, filename: string) {
  const canvas = await generateHighResSheetCanvas(options);
  const isLandscape = options.orientation === 'landscape';
  const sheetWidthMm = isLandscape ? options.paper.height : options.paper.width;
  const sheetHeightMm = isLandscape ? options.paper.width : options.paper.height;

  const pdf = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [sheetWidthMm, sheetHeightMm],
    compress: true,
  });

  const imgData = canvas.toDataURL('image/png');
  pdf.addImage(imgData, 'PNG', 0, 0, sheetWidthMm, sheetHeightMm, undefined, 'FAST');
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

/**
 * Triggers native system printing (Ctrl+P / Command+P)
 */
export function triggerDirectPrint() {
  window.print();
}
