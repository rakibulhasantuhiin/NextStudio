import {
  ProcessedFileResult,
  canvasToBlob,
  getBaseName,
  loadImageFromFile,
  mimeToExt,
  toBnDigits,
} from './toolsEngine';

export type WatermarkRemoveMode =
  | 'smart-doc'
  | 'colored-watermark'
  | 'color-pick'
  | 'deep-scan';

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface BrushStroke {
  type: 'erase' | 'restore';
  /** Normalized coordinates (0..1 relative to image width/height) for resolution-independent accuracy */
  points: { x: number; y: number }[];
  /** Radius relative to image width (0..0.2) */
  radiusNorm: number;
}

export interface WatermarkRemoveOptions {
  mode: WatermarkRemoveMode;
  /** 0 to 100 — higher removes stronger/darker watermarks */
  strength: number;
  /** 0 to 100 — deepens & sharpens document text edges without losing quality */
  textCrispness: number;
  /** Protects rich dark blue/red stamps & signatures while lifting pale watermarks */
  preserveColorInk: boolean;
  /** Sampled watermark colors used when mode === 'color-pick' */
  targetColors: RgbColor[];
  /** 10 to 100 — tolerance around sampled colors */
  colorTolerance: number;
  /** Optional manual brush strokes (white erase / restore original) */
  strokes: BrushStroke[];
  /** Output format — default image/png for 100% lossless document fidelity */
  outputFormat: 'image/png' | 'image/jpeg';
}

export const DEFAULT_WATERMARK_OPTIONS: WatermarkRemoveOptions = {
  mode: 'smart-doc',
  strength: 58,
  textCrispness: 45,
  preserveColorInk: true,
  targetColors: [],
  colorTolerance: 42,
  strokes: [],
  outputFormat: 'image/png',
};

/**
 * Computes luminance (0..255) and chroma saturation (0..255)
 */
function getLumAndChroma(r: number, g: number, b: number): { lum: number; chroma: number; maxC: number; minC: number } {
  const maxC = r > g ? (r > b ? r : b) : g > b ? g : b;
  const minC = r < g ? (r < b ? r : b) : g < b ? g : b;
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return { lum, chroma: maxC - minC, maxC, minC };
}

/**
 * Applies high-precision, full-resolution watermark & logo background removal
 * directly on a source image, returning a new output HTMLCanvasElement at exact native resolution.
 */
export function renderWatermarkRemovedCanvas(
  sourceImg: HTMLImageElement | HTMLCanvasElement,
  opts: WatermarkRemoveOptions,
  maxPreviewDim?: number
): HTMLCanvasElement {
  const natW = sourceImg instanceof HTMLImageElement ? sourceImg.naturalWidth : sourceImg.width;
  const natH = sourceImg instanceof HTMLImageElement ? sourceImg.naturalHeight : sourceImg.height;

  let w = Math.max(1, natW);
  let h = Math.max(1, natH);

  if (maxPreviewDim && (w > maxPreviewDim || h > maxPreviewDim)) {
    const scale = maxPreviewDim / Math.max(w, h);
    w = Math.max(1, Math.round(w * scale));
    h = Math.max(1, Math.round(h * scale));
  }

  // Keep clean copy of original for restore brush & smooth blending
  const origCanvas = document.createElement('canvas');
  origCanvas.width = w;
  origCanvas.height = h;
  const origCtx = origCanvas.getContext('2d', { willReadFrequently: true })!;
  origCtx.fillStyle = '#ffffff';
  origCtx.fillRect(0, 0, w, h);
  origCtx.imageSmoothingEnabled = true;
  origCtx.imageSmoothingQuality = 'high';
  origCtx.drawImage(sourceImg, 0, 0, w, h);

  const origData = origCtx.getImageData(0, 0, w, h);
  const src = origData.data;

  const outCanvas = document.createElement('canvas');
  outCanvas.width = w;
  outCanvas.height = h;
  const outCtx = outCanvas.getContext('2d', { willReadFrequently: true })!;
  const outImgData = outCtx.createImageData(w, h);
  const dst = outImgData.data;

  // Estimate document paper background luminance (88th percentile sample)
  const stride = Math.max(1, Math.floor((w * h) / 25000));
  const samples: number[] = [];
  for (let p = 0; p < w * h; p += stride) {
    const i = p * 4;
    samples.push(Math.round(0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2]));
  }
  samples.sort((a, b) => a - b);
  const paperLum = samples[Math.floor(samples.length * 0.88)] || 245;

  const strengthNorm = Math.max(0, Math.min(100, opts.strength)) / 100;
  const crispNorm = Math.max(0, Math.min(100, opts.textCrispness)) / 100;

  // Threshold calibration based on mode & strength
  // Higher strength lowers the white cutoff so darker watermarks become pure white
  const baseWhiteCut = Math.min(248, paperLum - 6) - strengthNorm * 92; // ~240 down to ~148
  const whiteCut = Math.max(115, Math.min(248, baseWhiteCut));
  const inkGuard = Math.max(40, whiteCut - 58);

  // Colored watermark thresholds
  const colorChromaCut = Math.max(10, 44 - strengthNorm * 30); // lower = removes subtler tints
  const colorLumFloor = Math.max(60, 145 - strengthNorm * 75);

  // Color-pick tolerance radius in RGB space
  const pickDistSq = Math.pow(18 + (opts.colorTolerance / 100) * 145, 2);

  for (let i = 0; i < src.length; i += 4) {
    const r = src[i];
    const g = src[i + 1];
    const b = src[i + 2];
    const { lum, chroma, minC } = getLumAndChroma(r, g, b);

    let outR = r;
    let outG = g;
    let outB = b;

    if (opts.mode === 'smart-doc') {
      // Detect light/semi-transparent gray OR colored logo watermark behind document text
      const isFaintColorWatermark =
        chroma >= 14 && lum >= Math.max(105, whiteCut - 28) && minC >= Math.max(75, whiteCut - 65);
      const isDarkOfficialSeal =
        opts.preserveColorInk && chroma >= 45 && lum < Math.max(125, whiteCut - 35);

      if (isDarkOfficialSeal) {
        // Keep rich dark blue/red stamp or signature intact & slightly crisp
        const boost = 1 - crispNorm * 0.14;
        outR = Math.max(0, Math.round(r * boost));
        outG = Math.max(0, Math.round(g * boost));
        outB = Math.max(0, Math.round(b * boost));
      } else if (lum >= whiteCut || isFaintColorWatermark) {
        outR = 255;
        outG = 255;
        outB = 255;
      } else if (lum > inkGuard) {
        // Smooth anti-aliased transition so text edges stay silky & crisp (zero jagged pixels)
        const t = (lum - inkGuard) / Math.max(1, whiteCut - inkGuard);
        const smooth = Math.pow(t, 1.35 - crispNorm * 0.45);
        // Slightly deepen ink side before blending to white
        const inkScale = 1 - crispNorm * 0.28;
        const dr = r * inkScale;
        const dg = g * inkScale;
        const db = b * inkScale;
        outR = Math.min(255, Math.round(dr + (255 - dr) * smooth));
        outG = Math.min(255, Math.round(dg + (255 - dg) * smooth));
        outB = Math.min(255, Math.round(db + (255 - db) * smooth));
      } else {
        // Pure ink / text core: deepen crisply without crushing dark photos
        const inkScale = 1 - crispNorm * 0.32;
        outR = Math.max(0, Math.round(r * inkScale));
        outG = Math.max(0, Math.round(g * inkScale));
        outB = Math.max(0, Math.round(b * inkScale));
      }
    } else if (opts.mode === 'colored-watermark') {
      // Specifically target colored logo/stamp/text watermarks while keeping dark black text untouched
      const isColoredWatermark = chroma >= colorChromaCut && lum >= colorLumFloor;
      const isPalePaperNoise = lum >= Math.min(246, paperLum - 8 - strengthNorm * 28);

      if (isColoredWatermark || isPalePaperNoise) {
        outR = 255;
        outG = 255;
        outB = 255;
      } else if (chroma >= colorChromaCut * 0.65 && lum >= colorLumFloor - 25) {
        // Anti-aliased halo around colored watermark edges -> neutralize tint cleanly to white/gray
        const gray = Math.round(lum);
        const t = Math.min(1, (lum - (colorLumFloor - 25)) / 50);
        outR = Math.min(255, Math.round(gray + (255 - gray) * t));
        outG = outR;
        outB = outR;
      } else {
        // Neutral black/dark text — sharpen and deepen
        const inkScale = 1 - crispNorm * 0.28;
        outR = Math.max(0, Math.round(r * inkScale));
        outG = Math.max(0, Math.round(g * inkScale));
        outB = Math.max(0, Math.round(b * inkScale));
      }
    } else if (opts.mode === 'color-pick') {
      // Match user-sampled watermark color(s) while protecting dark document ink
      let matched = false;
      let minRatio = 2;

      for (const tc of opts.targetColors) {
        const dr = r - tc.r;
        const dg = g - tc.g;
        const db = b - tc.b;
        const distSq = dr * dr + dg * dg + db * db;
        if (distSq <= pickDistSq) {
          matched = true;
          const ratio = Math.sqrt(distSq / Math.max(1, pickDistSq));
          if (ratio < minRatio) minRatio = ratio;
        }
      }

      // Also lift near-white paper cast
      const isPaper = lum >= Math.min(246, paperLum - 6 - strengthNorm * 22);
      const isDarkInk = lum < Math.max(55, 108 - strengthNorm * 38) && chroma < 35;

      if (isPaper || (matched && !isDarkInk)) {
        if (matched && minRatio > 0.72) {
          const blend = 1 - (minRatio - 0.72) / 0.28;
          outR = Math.min(255, Math.round(r + (255 - r) * blend));
          outG = Math.min(255, Math.round(g + (255 - g) * blend));
          outB = Math.min(255, Math.round(b + (255 - b) * blend));
        } else {
          outR = 255;
          outG = 255;
          outB = 255;
        }
      } else {
        const inkScale = 1 - crispNorm * 0.25;
        outR = Math.max(0, Math.round(r * inkScale));
        outG = Math.max(0, Math.round(g * inkScale));
        outB = Math.max(0, Math.round(b * inkScale));
      }
    } else {
      // 'deep-scan': High-contrast clean black text on spotless pure white paper
      const scanWhite = Math.max(108, Math.min(242, paperLum - 12 - strengthNorm * 95));
      const scanBlack = Math.max(32, scanWhite - 52);

      if (lum >= scanWhite) {
        outR = 255;
        outG = 255;
        outB = 255;
      } else if (lum <= scanBlack) {
        const v = Math.max(0, Math.round(lum * (0.45 - crispNorm * 0.25)));
        outR = v;
        outG = v;
        outB = v;
      } else {
        const t = (lum - scanBlack) / Math.max(1, scanWhite - scanBlack);
        const eased = Math.pow(t, 1.15);
        const v = Math.min(255, Math.max(0, Math.round(eased * 255)));
        outR = v;
        outG = v;
        outB = v;
      }
    }

    dst[i] = outR;
    dst[i + 1] = outG;
    dst[i + 2] = outB;
    dst[i + 3] = 255;
  }

  outCtx.putImageData(outImgData, 0, 0);

  // Subtle High-Clarity Unsharp Pass for crisp small Bangla/English fonts when crispNorm > 0.25
  if (crispNorm > 0.25 && w * h <= 16_000_000) {
    applySubtleTextSharpen(outCtx, w, h, crispNorm * 0.42);
  }

  // Apply manual resolution-independent brush strokes (white erase / restore original)
  if (opts.strokes.length > 0) {
    for (const stroke of opts.strokes) {
      if (stroke.points.length === 0) continue;
      const radiusPx = Math.max(2, stroke.radiusNorm * w);

      if (stroke.type === 'erase') {
        outCtx.save();
        outCtx.strokeStyle = '#ffffff';
        outCtx.fillStyle = '#ffffff';
        outCtx.lineCap = 'round';
        outCtx.lineJoin = 'round';
        outCtx.lineWidth = radiusPx * 2;

        if (stroke.points.length === 1) {
          outCtx.beginPath();
          outCtx.arc(stroke.points[0].x * w, stroke.points[0].y * h, radiusPx, 0, Math.PI * 2);
          outCtx.fill();
        } else {
          outCtx.beginPath();
          outCtx.moveTo(stroke.points[0].x * w, stroke.points[0].y * h);
          for (let k = 1; k < stroke.points.length; k++) {
            outCtx.lineTo(stroke.points[k].x * w, stroke.points[k].y * h);
          }
          outCtx.stroke();
        }
        outCtx.restore();
      } else {
        // Restore original pixels cleanly using clipped path
        outCtx.save();
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = w;
        maskCanvas.height = h;
        const mCtx = maskCanvas.getContext('2d')!;
        mCtx.strokeStyle = '#000000';
        mCtx.fillStyle = '#000000';
        mCtx.lineCap = 'round';
        mCtx.lineJoin = 'round';
        mCtx.lineWidth = radiusPx * 2;

        if (stroke.points.length === 1) {
          mCtx.beginPath();
          mCtx.arc(stroke.points[0].x * w, stroke.points[0].y * h, radiusPx, 0, Math.PI * 2);
          mCtx.fill();
        } else {
          mCtx.beginPath();
          mCtx.moveTo(stroke.points[0].x * w, stroke.points[0].y * h);
          for (let k = 1; k < stroke.points.length; k++) {
            mCtx.lineTo(stroke.points[k].x * w, stroke.points[k].y * h);
          }
          mCtx.stroke();
        }

        mCtx.globalCompositeOperation = 'source-in';
        mCtx.drawImage(origCanvas, 0, 0);
        outCtx.drawImage(maskCanvas, 0, 0);
        outCtx.restore();
      }
    }
  }

  return outCanvas;
}

/**
 * Lightweight 3x3 sharpening pass that crisps up text strokes without creating white-background noise.
 */
function applySubtleTextSharpen(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  amount: number
): void {
  const img = ctx.getImageData(0, 0, w, h);
  const src = img.data;
  const copy = new Uint8ClampedArray(src);

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = (y * w + x) * 4;
      // Skip pure white background pixels for speed & zero noise
      if (copy[idx] >= 252 && copy[idx + 1] >= 252 && copy[idx + 2] >= 252) continue;

      const up = idx - w * 4;
      const dn = idx + w * 4;
      const lt = idx - 4;
      const rt = idx + 4;

      for (let c = 0; c < 3; c++) {
        const center = copy[idx + c];
        const avgNeighbors =
          (copy[up + c] + copy[dn + c] + copy[lt + c] + copy[rt + c]) * 0.25;
        const val = center + (center - avgNeighbors) * amount;
        src[idx + c] = val < 0 ? 0 : val > 255 ? 255 : Math.round(val);
      }
    }
  }

  ctx.putImageData(img, 0, 0);
}

/**
 * Process a single document/image file at 100% FULL native resolution (zero quality downscale).
 */
export async function processWatermarkRemovalFile(
  file: File,
  opts: WatermarkRemoveOptions,
  lang: 'en' | 'bn' = 'en'
): Promise<ProcessedFileResult> {
  const img = await loadImageFromFile(file);
  const outCanvas = renderWatermarkRemovedCanvas(img, opts);
  const quality = opts.outputFormat === 'image/jpeg' ? 0.98 : undefined;
  const blob = await canvasToBlob(outCanvas, opts.outputFormat, quality);
  const ext = mimeToExt(opts.outputFormat);
  const previewUrl = URL.createObjectURL(blob);

  return {
    id: `wm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: `${getBaseName(file.name)}_clean.${ext}`,
    originalName: file.name,
    originalSize: file.size,
    blob,
    previewUrl,
    width: outCanvas.width,
    height: outCanvas.height,
    infoText:
      lang === 'bn'
        ? `হাই-কোয়ালিটি (${toBnDigits(outCanvas.width)}×${toBnDigits(outCanvas.height)} px)`
        : `High Quality (${outCanvas.width}×${outCanvas.height} px)`,
  };
}

/**
 * Instant, crisp, zero-chrome Direct Print using a hidden iframe (never uses window.open).
 * Prints one or multiple cleaned documents cleanly fitted to A4 paper on pure white background.
 */
export function printCleanedDocumentsDirectly(imageUrls: string[]): void {
  if (imageUrls.length === 0) return;

  const existing = document.getElementById('nextstudio-clean-print-iframe');
  if (existing) existing.remove();

  const iframe = document.createElement('iframe');
  iframe.id = 'nextstudio-clean-print-iframe';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) return;

  const pagesHtml = imageUrls
    .map(
      (url, i) => `
      <div class="print-page" style="${i < imageUrls.length - 1 ? 'page-break-after: always; break-after: page;' : ''}">
        <img src="${url}" alt="Cleaned Document ${i + 1}" />
      </div>`
    )
    .join('');

  doc.open();
  doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>NextStudio Clean Document Print</title>
  <style>
    @page { size: A4 auto; margin: 6mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { background: #ffffff; width: 100%; height: 100%; }
    .print-page {
      width: 100%;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #ffffff;
      overflow: hidden;
    }
    .print-page img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      display: block;
    }
  </style>
</head>
<body>
  ${pagesHtml}
</body>
</html>`);
  doc.close();

  const trigger = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      window.print();
    }
    window.setTimeout(() => {
      iframe.remove();
    }, 60_000);
  };

  // Wait until all images inside iframe finish decoding
  const imgs = Array.from(doc.querySelectorAll('img'));
  if (imgs.length === 0) {
    trigger();
    return;
  }

  let loadedCount = 0;
  const checkReady = () => {
    loadedCount++;
    if (loadedCount >= imgs.length) {
      window.setTimeout(trigger, 80);
    }
  };

  imgs.forEach((im) => {
    if (im.complete) checkReady();
    else {
      im.onload = checkReady;
      im.onerror = checkReady;
    }
  });
}
