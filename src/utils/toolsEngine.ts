import JSZip from 'jszip';
import { PDFDocument, degrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure pdf.js worker strictly offline (local Vite bundled worker, zero CDN)
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

// ============================================================================
// GENERAL HELPERS (Bangla digits, file sizing, download, ZIP packaging)
// ============================================================================

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

export function toBnDigits(input: number | string): string {
  return String(input).replace(/\d/g, (d) => BN_DIGITS[Number(d)] ?? d);
}

export function fromBnDigits(input: string): string {
  return input.replace(/[০-৯]/g, (ch) => String(BN_DIGITS.indexOf(ch)));
}

export function formatBytes(bytes: number, lang: 'bn' | 'en' = 'en'): string {
  if (bytes < 1024) {
    const val = `${bytes} B`;
    return lang === 'bn' ? toBnDigits(val) : val;
  }
  const kb = bytes / 1024;
  if (kb < 1024) {
    const val = `${kb.toFixed(kb >= 100 ? 0 : 1)} KB`;
    return lang === 'bn' ? toBnDigits(val) : val;
  }
  const mb = kb / 1024;
  const val = `${mb.toFixed(2)} MB`;
  return lang === 'bn' ? toBnDigits(val) : val;
}

export function getBaseName(filename: string): string {
  const dotIdx = filename.lastIndexOf('.');
  return dotIdx > 0 ? filename.slice(0, dotIdx) : filename;
}

export function mimeToExt(mime: string): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function downloadFilesAsZip(
  items: { name: string; blob: Blob }[],
  zipFilename: string
): Promise<void> {
  const zip = new JSZip();
  const usedNames = new Map<string, number>();

  for (const item of items) {
    let safeName = item.name;
    const count = usedNames.get(safeName) ?? 0;
    if (count > 0) {
      const dot = safeName.lastIndexOf('.');
      if (dot > 0) {
        safeName = `${safeName.slice(0, dot)}_${count + 1}${safeName.slice(dot)}`;
      } else {
        safeName = `${safeName}_${count + 1}`;
      }
    }
    usedNames.set(item.name, count + 1);
    zip.file(safeName, item.blob);
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(zipBlob, zipFilename);
}

// ============================================================================
// IMAGE LOADING & CANVAS UTILITIES
// ============================================================================

export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to load image: ${file.name}`));
    };
    img.src = url;
  });
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  mime: string,
  quality?: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to generate image from canvas.'));
      },
      mime,
      mime === 'image/png' ? undefined : quality
    );
  });
}

/**
 * Cleans phone-photographed signature on white paper:
 * Whiten off-white/gray paper background cleanly & deepen dark pen ink strokes
 * while keeping smooth anti-aliased edges.
 */
export function applySignatureCleanup(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Estimate paper background brightness from upper-percentile luminance
  const lums = new Uint8Array(Math.floor(data.length / 4));
  let idx = 0;
  for (let i = 0; i < data.length; i += 4) {
    lums[idx++] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
  }
  const sorted = Uint8Array.from(lums).sort();
  const bgLum = sorted[Math.floor(sorted.length * 0.82)] || 210;
  const whiteThreshold = Math.max(135, Math.min(235, bgLum - 22));
  const inkCutoff = Math.max(45, whiteThreshold - 70);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    if (lum >= whiteThreshold) {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = 255;
    } else if (lum <= inkCutoff) {
      // Deepen ink color while preserving subtle blue/black hue
      const factor = 0.42;
      data[i] = Math.max(0, Math.round(r * factor));
      data[i + 1] = Math.max(0, Math.round(g * factor));
      data[i + 2] = Math.max(0, Math.round(b * factor));
      data[i + 3] = 255;
    } else {
      // Smooth anti-aliased transition between ink and pure white paper
      const t = (lum - inkCutoff) / Math.max(1, whiteThreshold - inkCutoff);
      const curve = Math.pow(t, 0.72);
      const darkR = r * 0.45;
      const darkG = g * 0.45;
      const darkB = b * 0.45;
      data[i] = Math.min(255, Math.round(darkR + (255 - darkR) * curve));
      data[i + 1] = Math.min(255, Math.round(darkG + (255 - darkG) * curve));
      data[i + 2] = Math.min(255, Math.round(darkB + (255 - darkB) * curve));
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * Draw image onto a target canvas with specified fit mode ('crop' | 'contain' | 'stretch').
 */
function drawFittedCanvas(
  img: HTMLImageElement,
  targetW: number,
  targetH: number,
  fitMode: 'crop' | 'contain' | 'stretch',
  fillBg: string | null
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(targetW));
  canvas.height = Math.max(1, Math.round(targetH));
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  if (fillBg) {
    ctx.fillStyle = fillBg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const sw = img.naturalWidth;
  const sh = img.naturalHeight;
  const dw = canvas.width;
  const dh = canvas.height;

  if (fitMode === 'stretch') {
    ctx.drawImage(img, 0, 0, dw, dh);
  } else if (fitMode === 'contain') {
    const scale = Math.min(dw / sw, dh / sh);
    const rw = sw * scale;
    const rh = sh * scale;
    const dx = (dw - rw) / 2;
    const dy = (dh - rh) / 2;
    ctx.drawImage(img, dx, dy, rw, rh);
  } else {
    // 'crop' (cover centered)
    const scale = Math.max(dw / sw, dh / sh);
    const rw = sw * scale;
    const rh = sh * scale;
    const dx = (dw - rw) / 2;
    const dy = (dh - rh) / 2;
    ctx.drawImage(img, dx, dy, rw, rh);
  }

  return canvas;
}

/**
 * Compress a canvas to strictly stay under targetKb while preserving maximum visual quality.
 * Uses binary search over quality (0.08–0.96), and optionally downscales if needed.
 */
async function compressCanvasUnderKb(
  sourceCanvas: HTMLCanvasElement,
  mime: 'image/jpeg' | 'image/webp' | 'image/png',
  targetKb: number,
  allowDownscale: boolean,
  initialQuality = 0.94
): Promise<{ blob: Blob; width: number; height: number; qualityUsed: number }> {
  const maxBytes = Math.max(2 * 1024, Math.floor(targetKb * 1024));

  // PNG is lossless: if over targetKb, downscale gently if allowed
  if (mime === 'image/png') {
    let curCanvas = sourceCanvas;
    let blob = await canvasToBlob(curCanvas, 'image/png');
    if (blob.size <= maxBytes || !allowDownscale) {
      return { blob, width: curCanvas.width, height: curCanvas.height, qualityUsed: 1 };
    }
    let scale = 0.9;
    for (let attempt = 0; attempt < 10 && blob.size > maxBytes; attempt++) {
      const nextW = Math.max(16, Math.round(sourceCanvas.width * scale));
      const nextH = Math.max(16, Math.round(sourceCanvas.height * scale));
      const tmp = document.createElement('canvas');
      tmp.width = nextW;
      tmp.height = nextH;
      const ctx = tmp.getContext('2d')!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(sourceCanvas, 0, 0, nextW, nextH);
      blob = await canvasToBlob(tmp, 'image/png');
      curCanvas = tmp;
      scale *= 0.82;
    }
    return { blob, width: curCanvas.width, height: curCanvas.height, qualityUsed: 1 };
  }

  // First try high quality directly
  const firstBlob = await canvasToBlob(sourceCanvas, mime, initialQuality);
  if (firstBlob.size <= maxBytes) {
    return {
      blob: firstBlob,
      width: sourceCanvas.width,
      height: sourceCanvas.height,
      qualityUsed: initialQuality,
    };
  }

  // Binary search quality between 0.08 and initialQuality
  let low = 0.08;
  let high = initialQuality;
  let bestBlob: Blob | null = null;
  let bestQ = low;

  for (let step = 0; step < 9; step++) {
    const mid = (low + high) / 2;
    const candidate = await canvasToBlob(sourceCanvas, mime, mid);
    if (candidate.size <= maxBytes) {
      bestBlob = candidate;
      bestQ = mid;
      low = mid;
    } else {
      high = mid;
    }
  }

  if (bestBlob) {
    return {
      blob: bestBlob,
      width: sourceCanvas.width,
      height: sourceCanvas.height,
      qualityUsed: bestQ,
    };
  }

  // Even quality 0.08 was too large -> if downscale is allowed, shrink gradually
  let curCanvas = sourceCanvas;
  let smallestBlob = await canvasToBlob(curCanvas, mime, 0.08);
  if (!allowDownscale) {
    return {
      blob: smallestBlob,
      width: curCanvas.width,
      height: curCanvas.height,
      qualityUsed: 0.08,
    };
  }

  let scale = Math.min(0.88, Math.sqrt(maxBytes / Math.max(1, smallestBlob.size)) * 1.15);
  for (let attempt = 0; attempt < 8 && smallestBlob.size > maxBytes; attempt++) {
    const nextW = Math.max(24, Math.round(sourceCanvas.width * scale));
    const nextH = Math.max(24, Math.round(sourceCanvas.height * scale));
    const tmp = document.createElement('canvas');
    tmp.width = nextW;
    tmp.height = nextH;
    const ctx = tmp.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, nextW, nextH);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(sourceCanvas, 0, 0, nextW, nextH);

    // Search quality on scaled canvas
    let sLow = 0.25;
    let sHigh = 0.88;
    let sBest: Blob | null = null;
    let sBestQ = sLow;
    for (let j = 0; j < 6; j++) {
      const m = (sLow + sHigh) / 2;
      const b = await canvasToBlob(tmp, mime, m);
      if (b.size <= maxBytes) {
        sBest = b;
        sBestQ = m;
        sLow = m;
      } else {
        sHigh = m;
      }
    }
    if (sBest) {
      return { blob: sBest, width: nextW, height: nextH, qualityUsed: sBestQ };
    }
    smallestBlob = await canvasToBlob(tmp, mime, 0.15);
    curCanvas = tmp;
    scale *= 0.78;
  }

  return {
    blob: smallestBlob,
    width: curCanvas.width,
    height: curCanvas.height,
    qualityUsed: 0.15,
  };
}

// ============================================================================
// PROCESSED FILE RESULT TYPE
// ============================================================================

export interface ProcessedFileResult {
  id: string;
  name: string;
  originalName: string;
  originalSize: number;
  blob: Blob;
  previewUrl?: string;
  width?: number;
  height?: number;
  infoText?: string;
}

// ============================================================================
// 1. GOVT JOB PHOTO & SIGNATURE MAKER
// ============================================================================

export interface GovtPhotoSignOptions {
  width: number;
  height: number;
  maxKb: number;
  fitMode: 'crop' | 'contain';
  cleanSignature?: boolean;
  suffix: string;
}

export async function processGovtPhotoOrSign(
  file: File,
  opts: GovtPhotoSignOptions
): Promise<ProcessedFileResult> {
  const img = await loadImageFromFile(file);
  const targetW = Math.max(20, Math.round(opts.width));
  const targetH = Math.max(20, Math.round(opts.height));

  const canvas = drawFittedCanvas(img, targetW, targetH, opts.fitMode, '#ffffff');

  if (opts.cleanSignature) {
    const ctx = canvas.getContext('2d')!;
    applySignatureCleanup(ctx, targetW, targetH);
  }

  const { blob } = await compressCanvasUnderKb(
    canvas,
    'image/jpeg',
    Math.max(5, opts.maxKb),
    false, // keep exact px required by govt portal
    0.95
  );

  const previewUrl = URL.createObjectURL(blob);
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: `${getBaseName(file.name)}_${opts.suffix}_${targetW}x${targetH}.jpg`,
    originalName: file.name,
    originalSize: file.size,
    blob,
    previewUrl,
    width: targetW,
    height: targetH,
  };
}

// ============================================================================
// 2. IMAGE RESIZER
// ============================================================================

export interface ImageResizeOptions {
  unit: 'px' | 'percent';
  width: number | null; // null = auto aspect ratio
  height: number | null; // null = auto aspect ratio
  percent: number; // used when unit === 'percent'
  fitMode: 'fit' | 'crop' | 'stretch';
  maxKb: number | null;
  format: 'original' | 'image/jpeg' | 'image/png' | 'image/webp';
  quality: number; // 0.1 to 1.0
}

export async function processImageResize(
  file: File,
  opts: ImageResizeOptions
): Promise<ProcessedFileResult> {
  const img = await loadImageFromFile(file);
  const sw = img.naturalWidth;
  const sh = img.naturalHeight;

  let targetW = sw;
  let targetH = sh;

  if (opts.unit === 'percent') {
    const ratio = Math.max(5, Math.min(500, opts.percent)) / 100;
    targetW = Math.max(1, Math.round(sw * ratio));
    targetH = Math.max(1, Math.round(sh * ratio));
  } else {
    const hasW = typeof opts.width === 'number' && opts.width > 0;
    const hasH = typeof opts.height === 'number' && opts.height > 0;
    if (hasW && hasH) {
      if (opts.fitMode === 'fit') {
        // Fit inside bounding box keeping aspect ratio
        const scale = Math.min(opts.width! / sw, opts.height! / sh);
        targetW = Math.max(1, Math.round(sw * scale));
        targetH = Math.max(1, Math.round(sh * scale));
      } else {
        targetW = Math.round(opts.width!);
        targetH = Math.round(opts.height!);
      }
    } else if (hasW) {
      targetW = Math.round(opts.width!);
      targetH = Math.max(1, Math.round((sh / sw) * targetW));
    } else if (hasH) {
      targetH = Math.round(opts.height!);
      targetW = Math.max(1, Math.round((sw / sh) * targetH));
    }
  }

  let outputMime: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg';
  if (opts.format === 'original') {
    if (file.type === 'image/png') outputMime = 'image/png';
    else if (file.type === 'image/webp') outputMime = 'image/webp';
    else outputMime = 'image/jpeg';
  } else {
    outputMime = opts.format;
  }

  const drawMode = opts.fitMode === 'fit' ? 'stretch' : opts.fitMode;
  const fillBg = outputMime === 'image/jpeg' ? '#ffffff' : null;
  const canvas = drawFittedCanvas(img, targetW, targetH, drawMode, fillBg);

  let blob: Blob;
  let finalW = targetW;
  let finalH = targetH;

  if (opts.maxKb && opts.maxKb > 0) {
    const res = await compressCanvasUnderKb(canvas, outputMime, opts.maxKb, true, opts.quality);
    blob = res.blob;
    finalW = res.width;
    finalH = res.height;
  } else {
    blob = await canvasToBlob(canvas, outputMime, opts.quality);
  }

  const ext = mimeToExt(outputMime);
  const previewUrl = URL.createObjectURL(blob);
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: `${getBaseName(file.name)}_${finalW}x${finalH}.${ext}`,
    originalName: file.name,
    originalSize: file.size,
    blob,
    previewUrl,
    width: finalW,
    height: finalH,
  };
}

// ============================================================================
// 3. IMAGE COMPRESSOR (TARGET KB)
// ============================================================================

export async function processImageCompress(
  file: File,
  targetKb: number,
  format: 'image/jpeg' | 'image/webp' | 'image/png'
): Promise<ProcessedFileResult> {
  const img = await loadImageFromFile(file);
  const fillBg = format === 'image/jpeg' ? '#ffffff' : null;
  const canvas = drawFittedCanvas(img, img.naturalWidth, img.naturalHeight, 'stretch', fillBg);

  const { blob, width, height } = await compressCanvasUnderKb(
    canvas,
    format,
    Math.max(5, targetKb),
    true,
    0.94
  );

  const ext = mimeToExt(format);
  const previewUrl = URL.createObjectURL(blob);
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: `${getBaseName(file.name)}_${targetKb}kb.${ext}`,
    originalName: file.name,
    originalSize: file.size,
    blob,
    previewUrl,
    width,
    height,
  };
}

// ============================================================================
// 4. IMAGE FORMAT CONVERTER (JPG / PNG / WebP)
// ============================================================================

export async function processImageConvert(
  file: File,
  format: 'image/jpeg' | 'image/png' | 'image/webp',
  quality: number
): Promise<ProcessedFileResult> {
  const img = await loadImageFromFile(file);
  const fillBg = format === 'image/jpeg' ? '#ffffff' : null;
  const canvas = drawFittedCanvas(img, img.naturalWidth, img.naturalHeight, 'stretch', fillBg);
  const blob = await canvasToBlob(canvas, format, quality);
  const ext = mimeToExt(format);
  const previewUrl = URL.createObjectURL(blob);

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: `${getBaseName(file.name)}.${ext}`,
    originalName: file.name,
    originalSize: file.size,
    blob,
    previewUrl,
    width: img.naturalWidth,
    height: img.naturalHeight,
  };
}

// ============================================================================
// 5. IMAGE TO PDF
// ============================================================================

const MM_TO_PT = 72 / 25.4;

async function embedImageIntoPdf(pdfDoc: PDFDocument, file: File) {
  const buffer = await file.arrayBuffer();
  if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
    try {
      return await pdfDoc.embedJpg(buffer);
    } catch {
      // Fallback to canvas re-encode if malformed EXIF/JPEG
    }
  }
  if (file.type === 'image/png') {
    try {
      return await pdfDoc.embedPng(buffer);
    } catch {
      // Fallback to canvas re-encode
    }
  }

  // Convert WebP / BMP / GIF / fallback to crisp JPEG via Canvas
  const img = await loadImageFromFile(file);
  const canvas = drawFittedCanvas(img, img.naturalWidth, img.naturalHeight, 'stretch', '#ffffff');
  const jpgBlob = await canvasToBlob(canvas, 'image/jpeg', 0.94);
  const jpgBytes = await jpgBlob.arrayBuffer();
  return pdfDoc.embedJpg(jpgBytes);
}

export async function processImagesToPdf(
  files: File[],
  pageMode: 'a4' | 'image',
  marginMm: number
): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  const marginPt = Math.max(0, marginMm) * MM_TO_PT;
  const A4_W = 595.28;
  const A4_H = 841.89;

  for (const file of files) {
    const embedded = await embedImageIntoPdf(pdfDoc, file);
    const { width: iw, height: ih } = embedded.scale(1);

    if (pageMode === 'a4') {
      const page = pdfDoc.addPage([A4_W, A4_H]);
      const availW = Math.max(40, A4_W - marginPt * 2);
      const availH = Math.max(40, A4_H - marginPt * 2);
      const scale = Math.min(availW / iw, availH / ih);
      const drawW = iw * scale;
      const drawH = ih * scale;
      const x = (A4_W - drawW) / 2;
      const y = (A4_H - drawH) / 2;
      page.drawImage(embedded, { x, y, width: drawW, height: drawH });
    } else {
      // Fit page exactly to image (at 96dpi -> 72pt ratio = 0.75) + margins
      const imgPtW = iw * 0.75;
      const imgPtH = ih * 0.75;
      const page = pdfDoc.addPage([imgPtW + marginPt * 2, imgPtH + marginPt * 2]);
      page.drawImage(embedded, {
        x: marginPt,
        y: marginPt,
        width: imgPtW,
        height: imgPtH,
      });
    }
  }

  const bytes = await pdfDoc.save();
  return new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}

// ============================================================================
// 6A. PDF MERGE
// ============================================================================

export async function getPdfPageCount(file: File): Promise<number> {
  const bytes = await file.arrayBuffer();
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  return doc.getPageCount();
}

export async function mergePdfFiles(files: File[]): Promise<Blob> {
  const merged = await PDFDocument.create();
  for (const file of files) {
    const bytes = await file.arrayBuffer();
    const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const indices = src.getPageIndices();
    const copied = await merged.copyPages(src, indices);
    copied.forEach((p) => merged.addPage(p));
  }
  const outBytes = await merged.save();
  return new Blob([outBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}

// ============================================================================
// 6B. PDF SPLIT / EXTRACT PAGES
// ============================================================================

/**
 * Parse page range strings like "1-3, 5, 7-9" or Bangla "১-৩, ৫" into 0-based sorted unique indices.
 */
export function parsePageRanges(rangeStr: string, totalPages: number): number[] {
  const normalized = fromBnDigits(rangeStr).trim();
  if (!normalized) return [];

  const result: number[] = [];
  const seen = new Set<number>();
  const tokens = normalized.split(/[,;\s]+/).filter(Boolean);

  for (const token of tokens) {
    if (token.includes('-')) {
      const [startRaw, endRaw] = token.split('-');
      const start = Math.max(1, Math.min(totalPages, parseInt(startRaw, 10) || 1));
      const end = Math.max(1, Math.min(totalPages, parseInt(endRaw, 10) || totalPages));
      const step = start <= end ? 1 : -1;
      for (let p = start; step > 0 ? p <= end : p >= end; p += step) {
        if (!seen.has(p - 1)) {
          seen.add(p - 1);
          result.push(p - 1);
        }
      }
    } else {
      const num = parseInt(token, 10);
      if (!Number.isNaN(num) && num >= 1 && num <= totalPages && !seen.has(num - 1)) {
        seen.add(num - 1);
        result.push(num - 1);
      }
    }
  }
  return result;
}

export async function splitPdfFile(
  file: File,
  mode: 'extract' | 'each',
  rangeStr: string,
  lang: 'en' | 'bn' = 'en'
): Promise<ProcessedFileResult[]> {
  const isBn = lang === 'bn';
  const bytes = await file.arrayBuffer();
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const total = src.getPageCount();
  const base = getBaseName(file.name);

  if (mode === 'each') {
    const results: ProcessedFileResult[] = [];
    for (let i = 0; i < total; i++) {
      const single = await PDFDocument.create();
      const [copied] = await single.copyPages(src, [i]);
      single.addPage(copied);
      const outBytes = await single.save();
      const blob = new Blob([outBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      results.push({
        id: `page-${i + 1}-${Date.now()}`,
        name: `${base}_page_${i + 1}.pdf`,
        originalName: file.name,
        originalSize: file.size,
        blob,
        infoText: isBn ? `পাতা ${toBnDigits(i + 1)}` : `Page ${i + 1}`,
      });
    }
    return results;
  }

  const indices = parsePageRanges(rangeStr, total);
  if (indices.length === 0) {
    throw new Error(
      isBn
        ? 'সঠিক পাতার নম্বর লিখুন (যেমন: 1-3, 5)'
        : 'Please enter valid page numbers (e.g., 1-3, 5)'
    );
  }
  const extracted = await PDFDocument.create();
  const copied = await extracted.copyPages(src, indices);
  copied.forEach((p) => extracted.addPage(p));
  const outBytes = await extracted.save();
  const blob = new Blob([outBytes.buffer as ArrayBuffer], { type: 'application/pdf' });

  return [
    {
      id: `extract-${Date.now()}`,
      name: `${base}_pages_${fromBnDigits(rangeStr).replace(/\s+/g, '').replace(/,/g, '_')}.pdf`,
      originalName: file.name,
      originalSize: file.size,
      blob,
      infoText: isBn
        ? `${toBnDigits(indices.length)}টি পাতা আলাদা করা হয়েছে`
        : `${indices.length} page${indices.length === 1 ? '' : 's'} extracted`,
    },
  ];
}

// ============================================================================
// 6C. PDF ORGANIZE (THUMBNAILS + ROTATE / REORDER / DELETE)
// ============================================================================

export interface PdfPageThumb {
  id: string;
  originalIndex: number; // 0-based
  pageNumber: number; // 1-based original
  rotation: number; // 0, 90, 180, 270
  thumbUrl: string;
}

export async function renderPdfPageThumbnails(
  file: File,
  thumbWidth = 220
): Promise<PdfPageThumb[]> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjsLib.getDocument({ data: bytes });
  const pdf = await loadingTask.promise;
  const thumbs: PdfPageThumb[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const baseVp = page.getViewport({ scale: 1 });
    const scale = thumbWidth / Math.max(1, baseVp.width);
    const vp = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(vp.width);
    canvas.height = Math.round(vp.height);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise;
    const thumbUrl = canvas.toDataURL('image/jpeg', 0.82);

    thumbs.push({
      id: `pg-${i}-${Math.random().toString(36).slice(2, 6)}`,
      originalIndex: i - 1,
      pageNumber: i,
      rotation: 0,
      thumbUrl,
    });
  }

  await loadingTask.destroy();
  return thumbs;
}

export async function rebuildOrganizedPdf(
  file: File,
  pages: { originalIndex: number; rotation: number }[],
  lang: 'en' | 'bn' = 'en'
): Promise<Blob> {
  if (pages.length === 0) {
    throw new Error(lang === 'bn' ? 'অন্তত ১টি পাতা থাকতে হবে।' : 'At least 1 page is required.');
  }
  const bytes = await file.arrayBuffer();
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const out = await PDFDocument.create();

  for (const item of pages) {
    const [copied] = await out.copyPages(src, [item.originalIndex]);
    const existingAngle = copied.getRotation().angle;
    copied.setRotation(degrees((existingAngle + item.rotation + 360) % 360));
    out.addPage(copied);
  }

  const outBytes = await out.save();
  return new Blob([outBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}

// ============================================================================
// 6D. PDF TO IMAGES (JPG / PNG with DPI)
// ============================================================================

export async function renderPdfToImages(
  file: File,
  format: 'image/jpeg' | 'image/png',
  dpi: number,
  quality: number,
  onProgress?: (current: number, total: number) => void,
  lang: 'en' | 'bn' = 'en'
): Promise<ProcessedFileResult[]> {
  const isBn = lang === 'bn';
  const bytes = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjsLib.getDocument({ data: bytes });
  const pdf = await loadingTask.promise;
  const scale = dpi / 72;
  const base = getBaseName(file.name);
  const ext = mimeToExt(format);
  const results: ProcessedFileResult[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    onProgress?.(i, pdf.numPages);
    const page = await pdf.getPage(i);
    const vp = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(vp.width);
    canvas.height = Math.round(vp.height);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise;
    const blob = await canvasToBlob(canvas, format, quality);
    const previewUrl = URL.createObjectURL(blob);

    results.push({
      id: `pdfimg-${base}-${i}-${Date.now()}`,
      name: `${base}_page_${i}.${ext}`,
      originalName: file.name,
      originalSize: file.size,
      blob,
      previewUrl,
      width: canvas.width,
      height: canvas.height,
      infoText: isBn
        ? `পাতা ${toBnDigits(i)} · ${toBnDigits(dpi)} DPI`
        : `Page ${i} · ${dpi} DPI`,
    });
  }

  await loadingTask.destroy();
  return results;
}

// ============================================================================
// 6E. PDF COMPRESSOR (TARGET KB)
// ============================================================================

export async function compressPdfToTargetKb(
  file: File,
  targetKb: number,
  onProgress?: (label: string) => void,
  lang: 'en' | 'bn' = 'en'
): Promise<ProcessedFileResult> {
  const isBn = lang === 'bn';
  const maxBytes = Math.max(15 * 1024, Math.floor(targetKb * 1024));

  // If original file is already smaller than target, still optimize streams via pdf-lib
  if (file.size <= maxBytes) {
    const raw = await file.arrayBuffer();
    const doc = await PDFDocument.load(raw, { ignoreEncryption: true });
    const out = await doc.save({ useObjectStreams: true });
    const blob = new Blob([out.buffer as ArrayBuffer], { type: 'application/pdf' });
    return {
      id: `pdfcomp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: `${getBaseName(file.name)}_compressed.pdf`,
      originalName: file.name,
      originalSize: file.size,
      blob,
      infoText: isBn ? 'ইতিমধ্যেই টার্গেট সাইজের নিচে রয়েছে' : 'Already below target size',
    };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjsLib.getDocument({ data: bytes });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;

  // Compute per-page byte budget (leave small overhead for PDF container)
  const perPageBudgetKb = Math.max(8, (targetKb * 0.92) / Math.max(1, numPages));

  // Choose smart starting DPI based on per-page KB budget
  let dpi = 150;
  if (perPageBudgetKb < 35) dpi = 92;
  else if (perPageBudgetKb < 75) dpi = 115;
  else if (perPageBudgetKb < 160) dpi = 135;

  const buildAtSettings = async (useDpi: number, maxPageKb: number): Promise<Blob> => {
    const outDoc = await PDFDocument.create();
    const scale = useDpi / 72;

    for (let i = 1; i <= numPages; i++) {
      onProgress?.(
        isBn
          ? `পাতা ${toBnDigits(i)}/${toBnDigits(numPages)} কমপ্রেস হচ্ছে...`
          : `Compressing page ${i}/${numPages}...`
      );
      const page = await pdf.getPage(i);
      const baseVp = page.getViewport({ scale: 1 });
      const vp = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = Math.round(vp.width);
      canvas.height = Math.round(vp.height);
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise;
      const { blob: jpgBlob } = await compressCanvasUnderKb(
        canvas,
        'image/jpeg',
        maxPageKb,
        true,
        0.82
      );
      const jpgBytes = await jpgBlob.arrayBuffer();
      const embedded = await outDoc.embedJpg(jpgBytes);
      const outPage = outDoc.addPage([baseVp.width, baseVp.height]);
      outPage.drawImage(embedded, {
        x: 0,
        y: 0,
        width: baseVp.width,
        height: baseVp.height,
      });
    }

    const saved = await outDoc.save({ useObjectStreams: true });
    return new Blob([saved.buffer as ArrayBuffer], { type: 'application/pdf' });
  };

  let bestBlob = await buildAtSettings(dpi, perPageBudgetKb);
  // If still slightly above targetKb, do one refined second pass with tighter budget
  if (bestBlob.size > maxBytes) {
    const ratio = maxBytes / bestBlob.size;
    const nextDpi = Math.max(68, Math.round(dpi * Math.sqrt(ratio)));
    const nextBudget = Math.max(6, perPageBudgetKb * ratio * 0.86);
    bestBlob = await buildAtSettings(nextDpi, nextBudget);
  }

  await loadingTask.destroy();

  return {
    id: `pdfcomp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: `${getBaseName(file.name)}_${targetKb}kb.pdf`,
    originalName: file.name,
    originalSize: file.size,
    blob: bestBlob,
    infoText: isBn
      ? `${toBnDigits(numPages)} পাতা`
      : `${numPages} page${numPages === 1 ? '' : 's'}`,
  };
}

// ============================================================================
// 6F. PDF TEXT EXTRACTOR
// ============================================================================

export interface ExtractedPdfTextResult {
  fileName: string;
  pageCount: number;
  fullText: string;
  pages: { pageNumber: number; text: string }[];
}

export async function extractTextFromPdf(
  file: File,
  lang: 'en' | 'bn' = 'en'
): Promise<ExtractedPdfTextResult> {
  const isBn = lang === 'bn';
  const bytes = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjsLib.getDocument({ data: bytes });
  const pdf = await loadingTask.promise;
  const pages: { pageNumber: number; text: string }[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    let lastY: number | null = null;
    const lines: string[] = [];
    let currentLine = '';

    for (const item of content.items) {
      if (!('str' in item)) continue;
      const y = Array.isArray(item.transform) ? Math.round(item.transform[5]) : null;
      if (lastY !== null && y !== null && Math.abs(y - lastY) > 4) {
        lines.push(currentLine.trim());
        currentLine = item.str;
      } else {
        currentLine += (currentLine && item.str && !currentLine.endsWith(' ') ? ' ' : '') + item.str;
      }
      if (y !== null) lastY = y;
    }
    if (currentLine.trim()) lines.push(currentLine.trim());

    pages.push({
      pageNumber: i,
      text: lines.join('\n').trim(),
    });
  }

  await loadingTask.destroy();

  const fullText = pages
    .map((p) =>
      isBn
        ? `--- পাতা ${toBnDigits(p.pageNumber)} ---\n${p.text}`
        : `--- Page ${p.pageNumber} ---\n${p.text}`
    )
    .join('\n\n');

  return {
    fileName: file.name,
    pageCount: pages.length,
    fullText,
    pages,
  };
}

// ============================================================================
// 6G. PDF PAGE NUMBERS & WATERMARK (Bangla & English Unicode Crisp Canvas Overlay)
// ============================================================================

export interface PdfStampOptions {
  enablePageNumber: boolean;
  pageNumberScript: 'bn' | 'en';
  pageNumberFormat: 'plain' | 'ofTotal';
  pageNumberPosition: 'bottom-center' | 'bottom-right' | 'top-right';
  pageNumberFontSize: number;
  enableWatermark: boolean;
  watermarkText: string;
  watermarkOpacity: number; // 0.05 to 0.5
  watermarkFontSize: number;
  watermarkAngle: number; // e.g. -40 or 0
  watermarkColor: string;
}

/**
 * Renders crisp Unicode text (Bangla or English) onto a transparent hi-DPI canvas
 * and returns a PNG Uint8Array so pdf-lib embeds any Bangla glyph flawlessly offline.
 */
async function renderUnicodeTextPng(
  text: string,
  fontSizePt: number,
  color: string,
  opacity: number
): Promise<{ pngBytes: Uint8Array; widthPt: number; heightPt: number }> {
  const scale = 3; // 3x retina clarity for print-grade sharpness
  const measureCanvas = document.createElement('canvas');
  const mCtx = measureCanvas.getContext('2d')!;
  const fontFamily = `'SolaimanLipi', 'Noto Sans Bengali', 'Hind Siliguri', 'Plus Jakarta Sans', sans-serif`;
  const fontPx = fontSizePt * scale;
  mCtx.font = `600 ${fontPx}px ${fontFamily}`;
  const metrics = mCtx.measureText(text);

  const pad = Math.ceil(fontPx * 0.45);
  const wPx = Math.max(20, Math.ceil(metrics.width) + pad * 2);
  const hPx = Math.max(20, Math.ceil(fontPx * 1.45) + pad);

  const canvas = document.createElement('canvas');
  canvas.width = wPx;
  canvas.height = hPx;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, wPx, hPx);
  ctx.globalAlpha = Math.max(0.04, Math.min(1, opacity));
  ctx.font = `600 ${fontPx}px ${fontFamily}`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, wPx / 2, hPx / 2);

  const blob = await canvasToBlob(canvas, 'image/png');
  const pngBytes = new Uint8Array(await blob.arrayBuffer());
  return {
    pngBytes,
    widthPt: wPx / scale,
    heightPt: hPx / scale,
  };
}

export async function addPageNumbersAndWatermark(
  file: File,
  opts: PdfStampOptions,
  lang: 'en' | 'bn' = 'en'
): Promise<ProcessedFileResult> {
  const isBn = lang === 'bn';
  const bytes = await file.arrayBuffer();
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const pages = doc.getPages();
  const total = pages.length;

  // Pre-render watermark PNG once for all pages (super fast!)
  let wmImg: Awaited<ReturnType<PDFDocument['embedPng']>> | null = null;
  let wmW = 0;
  let wmH = 0;

  if (opts.enableWatermark && opts.watermarkText.trim()) {
    const rendered = await renderUnicodeTextPng(
      opts.watermarkText.trim(),
      opts.watermarkFontSize,
      opts.watermarkColor,
      opts.watermarkOpacity
    );
    wmImg = await doc.embedPng(rendered.pngBytes);
    wmW = rendered.widthPt;
    wmH = rendered.heightPt;
  }

  for (let i = 0; i < total; i++) {
    const page = pages[i];
    const { width: pw, height: ph } = page.getSize();

    // 1. Draw Watermark centered on page
    if (wmImg) {
      const maxW = pw * 0.82;
      const ratio = wmW > maxW ? maxW / wmW : 1;
      const drawW = wmW * ratio;
      const drawH = wmH * ratio;
      const rad = (opts.watermarkAngle * Math.PI) / 180;

      // Center rotated box precisely on page center
      const cx = pw / 2;
      const cy = ph / 2;
      const x = cx - (drawW / 2) * Math.cos(rad) + (drawH / 2) * Math.sin(rad);
      const y = cy - (drawW / 2) * Math.sin(rad) - (drawH / 2) * Math.cos(rad);

      page.drawImage(wmImg, {
        x,
        y,
        width: drawW,
        height: drawH,
        rotate: degrees(opts.watermarkAngle),
      });
    }

    // 2. Draw Page Number
    if (opts.enablePageNumber) {
      const curStr = opts.pageNumberScript === 'bn' ? toBnDigits(i + 1) : String(i + 1);
      const totStr = opts.pageNumberScript === 'bn' ? toBnDigits(total) : String(total);
      const label =
        opts.pageNumberFormat === 'ofTotal'
          ? opts.pageNumberScript === 'bn'
            ? `পৃষ্ঠা ${curStr} / ${totStr}`
            : `Page ${curStr} / ${totStr}`
          : curStr;

      const numStamp = await renderUnicodeTextPng(
        label,
        opts.pageNumberFontSize,
        '#1e293b',
        0.88
      );
      const numImg = await doc.embedPng(numStamp.pngBytes);
      const margin = 22;
      let nx = (pw - numStamp.widthPt) / 2;
      let ny = margin;

      if (opts.pageNumberPosition === 'bottom-right') {
        nx = pw - numStamp.widthPt - margin;
        ny = margin;
      } else if (opts.pageNumberPosition === 'top-right') {
        nx = pw - numStamp.widthPt - margin;
        ny = ph - numStamp.heightPt - margin;
      }

      page.drawImage(numImg, {
        x: Math.max(8, nx),
        y: Math.max(8, ny),
        width: numStamp.widthPt,
        height: numStamp.heightPt,
      });
    }
  }

  const outBytes = await doc.save();
  const blob = new Blob([outBytes.buffer as ArrayBuffer], { type: 'application/pdf' });

  return {
    id: `pdfstamp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: `${getBaseName(file.name)}_marked.pdf`,
    originalName: file.name,
    originalSize: file.size,
    blob,
    infoText: isBn
      ? `${toBnDigits(total)} পাতা আপডেট হয়েছে`
      : `${total} page${total === 1 ? '' : 's'} updated`,
  };
}
