import { PDFDocument } from 'pdf-lib';
import {
  ProcessedFileResult,
  canvasToBlob,
  getBaseName,
  loadImageFromFile,
  mimeToExt,
  toBnDigits,
} from './toolsEngine';

export interface NormPoint {
  /** Normalized 0..1 relative to rotated source width */
  x: number;
  /** Normalized 0..1 relative to rotated source height */
  y: number;
}

/** Order: Top-Left, Top-Right, Bottom-Right, Bottom-Left */
export type DocumentQuad = [NormPoint, NormPoint, NormPoint, NormPoint];

export type ScannerFilterId =
  | 'original'
  | 'lighten'
  | 'magic-color'
  | 'magic-pro'
  | 'no-shadow'
  | 'bw-pro'
  | 'grayscale';

export type ScannerPaperSize = 'auto' | 'a4-fit' | 'a4-fill' | 'legal-fit' | 'a5-fit';

export interface ScannerEnhanceOptions {
  filter: ScannerFilterId;
  /** -40 to +40 */
  brightness: number;
  /** -40 to +40 */
  contrast: number;
  /** 0 to 100 */
  sharpness: number;
  /** Paper layout mode */
  paperSize: ScannerPaperSize;
  /** Margin in mm (0, 4, 8, 12) */
  marginMm: number;
  /** Output format */
  outputFormat: 'image/png' | 'image/jpeg';
}

export const DEFAULT_SCANNER_OPTIONS: ScannerEnhanceOptions = {
  filter: 'magic-pro',
  brightness: 0,
  contrast: 0,
  sharpness: 38,
  paperSize: 'a4-fit',
  marginMm: 4,
  outputFormat: 'image/png',
};

export interface ScannerFilterMeta {
  id: ScannerFilterId;
  labelBn: string;
  labelEn: string;
  featured?: boolean;
}

export const SCANNER_FILTERS: ScannerFilterMeta[] = [
  { id: 'original', labelBn: 'আসল', labelEn: 'Original' },
  { id: 'lighten', labelBn: 'উজ্জ্বল', labelEn: 'Lighten' },
  { id: 'magic-color', labelBn: 'ম্যাজিক কালার', labelEn: 'Magic Color' },
  { id: 'magic-pro', labelBn: 'ম্যাজিক প্রো', labelEn: 'Magic Pro', featured: true },
  { id: 'no-shadow', labelBn: 'ছায়া মুক্ত', labelEn: 'No Shadow' },
  { id: 'bw-pro', labelBn: 'সাদা-কালো', labelEn: 'B&W Pro' },
  { id: 'grayscale', labelBn: 'গ্রেস্কেল', labelEn: 'Grayscale' },
];

export const FULL_IMAGE_QUAD: DocumentQuad = [
  { x: 0.005, y: 0.005 },
  { x: 0.995, y: 0.005 },
  { x: 0.995, y: 0.995 },
  { x: 0.005, y: 0.995 },
];

/**
 * Renders a source image rotated by 0, 90, 180, or 270 degrees onto a clean canvas.
 */
export function getRotatedSourceCanvas(
  img: HTMLImageElement | HTMLCanvasElement,
  rotationDeg: number,
  maxDim?: number
): HTMLCanvasElement {
  const normRot = ((rotationDeg % 360) + 360) % 360;
  const natW = img instanceof HTMLImageElement ? img.naturalWidth : img.width;
  const natH = img instanceof HTMLImageElement ? img.naturalHeight : img.height;

  let drawW = Math.max(1, natW);
  let drawH = Math.max(1, natH);
  if (maxDim && (drawW > maxDim || drawH > maxDim)) {
    const scale = maxDim / Math.max(drawW, drawH);
    drawW = Math.max(1, Math.round(drawW * scale));
    drawH = Math.max(1, Math.round(drawH * scale));
  }

  const swap = normRot === 90 || normRot === 270;
  const canvas = document.createElement('canvas');
  canvas.width = swap ? drawH : drawW;
  canvas.height = swap ? drawW : drawH;

  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((normRot * Math.PI) / 180);
  ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();

  return canvas;
}

/**
 * Automatically detects the 4 corners of a photographed document/paper on a desk or background.
 * Runs 100% offline in <25ms on a downsampled analysis canvas.
 */
export function detectDocumentQuad(sourceCanvas: HTMLCanvasElement): DocumentQuad {
  const maxAnalysis = 260;
  const scale = Math.min(1, maxAnalysis / Math.max(sourceCanvas.width, sourceCanvas.height));
  const w = Math.max(32, Math.round(sourceCanvas.width * scale));
  const h = Math.max(32, Math.round(sourceCanvas.height * scale));

  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(sourceCanvas, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);

  // 1. Sample border pixels to estimate surrounding table/background color & luminance
  const borderR: number[] = [];
  const borderG: number[] = [];
  const borderB: number[] = [];
  const borderLum: number[] = [];
  const pad = Math.max(2, Math.round(Math.min(w, h) * 0.025));

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x < pad || x >= w - pad || y < pad || y >= h - pad) {
        const i = (y * w + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        borderR.push(r);
        borderG.push(g);
        borderB.push(b);
        borderLum.push(0.299 * r + 0.587 * g + 0.114 * b);
      }
    }
  }

  const median = (arr: number[]) => {
    const s = [...arr].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)] ?? 128;
  };

  const bgR = median(borderR);
  const bgG = median(borderG);
  const bgB = median(borderB);
  const bgLum = median(borderLum);

  // Sample center region to estimate paper color & luminance
  const centerLum: number[] = [];
  const cx0 = Math.floor(w * 0.25);
  const cx1 = Math.floor(w * 0.75);
  const cy0 = Math.floor(h * 0.25);
  const cy1 = Math.floor(h * 0.75);
  for (let y = cy0; y < cy1; y += 2) {
    for (let x = cx0; x < cx1; x += 2) {
      const i = (y * w + x) * 4;
      centerLum.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    }
  }
  centerLum.sort((a, b) => a - b);
  const paperLum = centerLum[Math.floor(centerLum.length * 0.78)] ?? 200;

  // Build foreground document mask
  const mask = new Uint8Array(w * h);
  const lumDelta = paperLum - bgLum;

  // If the center paper is clearly brighter or distinct from the outer border
  if (lumDelta > 16 || Math.abs(lumDelta) > 22) {
    const lumThresh = bgLum + lumDelta * 0.42;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        const i = idx * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const colorDist = Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB);

        const isPaperBright = lumDelta > 0 ? lum >= lumThresh : lum <= lumThresh;
        if (isPaperBright || colorDist > 92) {
          mask[idx] = 1;
        }
      }
    }
  } else {
    // Low border contrast (already tightly framed photo) -> use Sobel edge density
    const gray = new Float32Array(w * h);
    for (let p = 0; p < w * h; p++) {
      const i = p * 4;
      gray[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }

    const rowEdge = new Float32Array(h);
    const colEdge = new Float32Array(w);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const gx = Math.abs(gray[y * w + (x + 1)] - gray[y * w + (x - 1)]);
        const gy = Math.abs(gray[(y + 1) * w + x] - gray[(y - 1) * w + x]);
        const mag = gx + gy;
        if (mag > 22) {
          rowEdge[y] += mag;
          colEdge[x] += mag;
        }
      }
    }

    const findBound = (arr: Float32Array, fromStart: boolean, limitFrac: number) => {
      const len = arr.length;
      const limit = Math.floor(len * limitFrac);
      let bestIdx = fromStart ? Math.round(len * 0.03) : Math.round(len * 0.97);
      let bestVal = 0;
      if (fromStart) {
        for (let i = 2; i < limit; i++) {
          if (arr[i] > bestVal) {
            bestVal = arr[i];
            bestIdx = i;
          }
        }
      } else {
        for (let i = len - 3; i > len - limit; i--) {
          if (arr[i] > bestVal) {
            bestVal = arr[i];
            bestIdx = i;
          }
        }
      }
      return bestVal > 180 ? bestIdx / len : fromStart ? 0.03 : 0.97;
    };

    const top = Math.max(0.01, Math.min(0.22, findBound(rowEdge, true, 0.28)));
    const bottom = Math.min(0.99, Math.max(0.78, findBound(rowEdge, false, 0.28)));
    const left = Math.max(0.01, Math.min(0.22, findBound(colEdge, true, 0.28)));
    const right = Math.min(0.99, Math.max(0.78, findBound(colEdge, false, 0.28)));

    return [
      { x: left, y: top },
      { x: right, y: top },
      { x: right, y: bottom },
      { x: left, y: bottom },
    ];
  }

  // 2. Morphological erosion + dilation (3x3) to remove small background noise specks
  const morph = (src: Uint8Array, erode: boolean) => {
    const out = new Uint8Array(w * h);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        let count = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            count += src[(y + dy) * w + (x + dx)];
          }
        }
        out[y * w + x] = erode ? (count >= 7 ? 1 : 0) : count >= 3 ? 1 : 0;
      }
    }
    return out;
  };

  let clean = morph(mask, true);
  clean = morph(clean, false);
  clean = morph(clean, false);

  // 3. Find largest connected component (the paper sheet)
  const visited = new Uint8Array(w * h);
  let bestPixels: number[] = [];
  const queue = new Int32Array(w * h);

  for (let p = 0; p < w * h; p++) {
    if (clean[p] === 1 && visited[p] === 0) {
      let head = 0;
      let tail = 0;
      queue[tail++] = p;
      visited[p] = 1;
      const comp: number[] = [];

      while (head < tail) {
        const cur = queue[head++];
        comp.push(cur);
        const cx = cur % w;
        const cy = (cur - cx) / w;

        if (cx > 0 && clean[cur - 1] === 1 && visited[cur - 1] === 0) {
          visited[cur - 1] = 1;
          queue[tail++] = cur - 1;
        }
        if (cx < w - 1 && clean[cur + 1] === 1 && visited[cur + 1] === 0) {
          visited[cur + 1] = 1;
          queue[tail++] = cur + 1;
        }
        if (cy > 0 && clean[cur - w] === 1 && visited[cur - w] === 0) {
          visited[cur - w] = 1;
          queue[tail++] = cur - w;
        }
        if (cy < h - 1 && clean[cur + w] === 1 && visited[cur + w] === 0) {
          visited[cur + w] = 1;
          queue[tail++] = cur + w;
        }
      }

      if (comp.length > bestPixels.length) {
        bestPixels = comp;
      }
    }
  }

  const areaFrac = bestPixels.length / (w * h);
  if (areaFrac < 0.16 || areaFrac > 0.985) {
    return [
      { x: 0.04, y: 0.04 },
      { x: 0.96, y: 0.04 },
      { x: 0.96, y: 0.96 },
      { x: 0.04, y: 0.96 },
    ];
  }

  // 4. Extract extreme quad corners from the largest component:
  // TL = min(x + y), TR = max(x - y), BR = max(x + y), BL = min(x - y)
  let tlX = 0,
    tlY = 0,
    minSum = Infinity;
  let brX = w - 1,
    brY = h - 1,
    maxSum = -Infinity;
  let trX = w - 1,
    trY = 0,
    maxDiff = -Infinity;
  let blX = 0,
    blY = h - 1,
    minDiff = Infinity;

  for (let k = 0; k < bestPixels.length; k++) {
    const idx = bestPixels[k];
    const x = idx % w;
    const y = (idx - x) / w;
    const sum = x + y;
    const diff = x - y;

    if (sum < minSum) {
      minSum = sum;
      tlX = x;
      tlY = y;
    }
    if (sum > maxSum) {
      maxSum = sum;
      brX = x;
      brY = y;
    }
    if (diff > maxDiff) {
      maxDiff = diff;
      trX = x;
      trY = y;
    }
    if (diff < minDiff) {
      minDiff = diff;
      blX = x;
      blY = y;
    }
  }

  const clamp01 = (v: number) => Math.max(0.005, Math.min(0.995, v));
  const candidate: DocumentQuad = [
    { x: clamp01(tlX / w), y: clamp01(tlY / h) },
    { x: clamp01(trX / w), y: clamp01(trY / h) },
    { x: clamp01(brX / w), y: clamp01(brY / h) },
    { x: clamp01(blX / w), y: clamp01(blY / h) },
  ];

  // Validate quad sanity (not degenerate or inverted)
  if (!isValidConvexQuad(candidate)) {
    return [
      { x: 0.04, y: 0.04 },
      { x: 0.96, y: 0.04 },
      { x: 0.96, y: 0.96 },
      { x: 0.04, y: 0.96 },
    ];
  }

  return candidate;
}

/**
 * Checks whether 4 points form a reasonably sized, non-self-intersecting clockwise quad.
 */
export function isValidConvexQuad(q: DocumentQuad): boolean {
  const cross = (a: NormPoint, b: NormPoint, c: NormPoint) =>
    (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);

  const c0 = cross(q[0], q[1], q[2]);
  const c1 = cross(q[1], q[2], q[3]);
  const c2 = cross(q[2], q[3], q[0]);
  const c3 = cross(q[3], q[0], q[1]);

  if (!(c0 > 0 && c1 > 0 && c2 > 0 && c3 > 0)) return false;

  // Shoelace area
  const area =
    0.5 *
    Math.abs(
      q[0].x * q[1].y -
        q[1].x * q[0].y +
        q[1].x * q[2].y -
        q[2].x * q[1].y +
        q[2].x * q[3].y -
        q[3].x * q[2].y +
        q[3].x * q[0].y -
        q[0].x * q[3].y
    );

  return area > 0.05;
}

/**
 * Solves an 8x8 linear system Ax = b via Gaussian elimination with partial pivoting
 * to compute the 3x3 projective homography matrix mapping dst -> src.
 */
function computeHomography(
  srcPts: [number, number][],
  dstPts: [number, number][]
): Float64Array | null {
  const A: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < 4; i++) {
    const [dx, dy] = dstPts[i];
    const [sx, sy] = srcPts[i];
    A.push([dx, dy, 1, 0, 0, 0, -sx * dx, -sx * dy]);
    b.push(sx);
    A.push([0, 0, 0, dx, dy, 1, -sy * dx, -sy * dy]);
    b.push(sy);
  }

  const n = 8;
  for (let col = 0; col < n; col++) {
    let maxRow = col;
    let maxVal = Math.abs(A[col][col]);
    for (let row = col + 1; row < n; row++) {
      const v = Math.abs(A[row][col]);
      if (v > maxVal) {
        maxVal = v;
        maxRow = row;
      }
    }
    if (maxVal < 1e-10) return null;

    if (maxRow !== col) {
      [A[col], A[maxRow]] = [A[maxRow], A[col]];
      [b[col], b[maxRow]] = [b[maxRow], b[col]];
    }

    const pivot = A[col][col];
    for (let j = col; j < n; j++) A[col][j] /= pivot;
    b[col] /= pivot;

    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = A[row][col];
      for (let j = col; j < n; j++) A[row][j] -= factor * A[col][j];
      b[row] -= factor * b[col];
    }
  }

  return new Float64Array([b[0], b[1], b[2], b[3], b[4], b[5], b[6], b[7], 1]);
}

/**
 * Estimates natural pixel output dimensions for a perspective-cropped document quad,
 * preserving full HD quality while respecting the document's natural aspect ratio.
 */
export function estimateQuadOutputSize(
  srcW: number,
  srcH: number,
  quad: DocumentQuad,
  maxLongEdge: number
): { width: number; height: number } {
  const px = quad.map((p) => ({ x: p.x * srcW, y: p.y * srcH }));
  const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(b.x - a.x, b.y - a.y);

  const topW = dist(px[0], px[1]);
  const botW = dist(px[3], px[2]);
  const leftH = dist(px[0], px[3]);
  const rightH = dist(px[1], px[2]);

  let outW = Math.max(64, Math.round(Math.max(topW, botW)));
  let outH = Math.max(64, Math.round(Math.max(leftH, rightH)));

  // Cap long edge to maxLongEdge for memory safety, or upscale tiny mobile crops slightly to crisp HD
  const longEdge = Math.max(outW, outH);
  if (longEdge > maxLongEdge) {
    const s = maxLongEdge / longEdge;
    outW = Math.max(32, Math.round(outW * s));
    outH = Math.max(32, Math.round(outH * s));
  }

  return { width: outW, height: outH };
}

/**
 * Performs true projective perspective rectification (quad -> flat rectangle)
 * with smooth bilinear pixel interpolation.
 */
export function warpPerspectiveCanvas(
  sourceCanvas: HTMLCanvasElement,
  quad: DocumentQuad,
  maxLongEdge = 2480
): HTMLCanvasElement {
  const srcW = sourceCanvas.width;
  const srcH = sourceCanvas.height;
  const { width: outW, height: outH } = estimateQuadOutputSize(srcW, srcH, quad, maxLongEdge);

  const outCanvas = document.createElement('canvas');
  outCanvas.width = outW;
  outCanvas.height = outH;
  const outCtx = outCanvas.getContext('2d', { willReadFrequently: true })!;

  const srcPts: [number, number][] = [
    [quad[0].x * (srcW - 1), quad[0].y * (srcH - 1)],
    [quad[1].x * (srcW - 1), quad[1].y * (srcH - 1)],
    [quad[2].x * (srcW - 1), quad[2].y * (srcH - 1)],
    [quad[3].x * (srcW - 1), quad[3].y * (srcH - 1)],
  ];
  const dstPts: [number, number][] = [
    [0, 0],
    [outW - 1, 0],
    [outW - 1, outH - 1],
    [0, outH - 1],
  ];

  const H = computeHomography(srcPts, dstPts);
  if (!H) {
    outCtx.drawImage(sourceCanvas, 0, 0, outW, outH);
    return outCanvas;
  }

  const srcCtx = sourceCanvas.getContext('2d', { willReadFrequently: true })!;
  const srcData = srcCtx.getImageData(0, 0, srcW, srcH).data;
  const dstImg = outCtx.createImageData(outW, outH);
  const dstData = dstImg.data;

  const h0 = H[0],
    h1 = H[1],
    h2 = H[2];
  const h3 = H[3],
    h4 = H[4],
    h5 = H[5];
  const h6 = H[6],
    h7 = H[7],
    h8 = H[8];

  const maxX = srcW - 1;
  const maxY = srcH - 1;

  for (let y = 0; y < outH; y++) {
    const rowOff = y * outW;
    const h1y_h2 = h1 * y + h2;
    const h4y_h5 = h4 * y + h5;
    const h7y_h8 = h7 * y + h8;

    for (let x = 0; x < outW; x++) {
      const denom = h6 * x + h7y_h8;
      const sx = (h0 * x + h1y_h2) / denom;
      const sy = (h3 * x + h4y_h5) / denom;

      const dstIdx = (rowOff + x) * 4;

      if (sx < 0 || sx > maxX || sy < 0 || sy > maxY) {
        dstData[dstIdx] = 255;
        dstData[dstIdx + 1] = 255;
        dstData[dstIdx + 2] = 255;
        dstData[dstIdx + 3] = 255;
        continue;
      }

      const x0 = sx | 0;
      const y0 = sy | 0;
      const x1 = x0 < maxX ? x0 + 1 : maxX;
      const y1 = y0 < maxY ? y0 + 1 : maxY;
      const fx = sx - x0;
      const fy = sy - y0;
      const ifx = 1 - fx;
      const ify = 1 - fy;

      const w00 = ifx * ify;
      const w10 = fx * ify;
      const w01 = ifx * fy;
      const w11 = fx * fy;

      const i00 = (y0 * srcW + x0) * 4;
      const i10 = (y0 * srcW + x1) * 4;
      const i01 = (y1 * srcW + x0) * 4;
      const i11 = (y1 * srcW + x1) * 4;

      dstData[dstIdx] = Math.round(
        srcData[i00] * w00 + srcData[i10] * w10 + srcData[i01] * w01 + srcData[i11] * w11
      );
      dstData[dstIdx + 1] = Math.round(
        srcData[i00 + 1] * w00 +
          srcData[i10 + 1] * w10 +
          srcData[i01 + 1] * w01 +
          srcData[i11 + 1] * w11
      );
      dstData[dstIdx + 2] = Math.round(
        srcData[i00 + 2] * w00 +
          srcData[i10 + 2] * w10 +
          srcData[i01 + 2] * w01 +
          srcData[i11 + 2] * w11
      );
      dstData[dstIdx + 3] = 255;
    }
  }

  outCtx.putImageData(dstImg, 0, 0);
  return outCanvas;
}

/**
 * Estimates smooth local paper illumination surface (shadows, gray cast, uneven lighting)
 * by running morphological dilation (max filter) + smoothing on a small pyramid grid,
 * then hardware-upscaling back to full image dimensions.
 */
function buildLocalIlluminationMap(
  rectifiedCanvas: HTMLCanvasElement,
  gridSize = 72
): Uint8ClampedArray {
  const w = rectifiedCanvas.width;
  const h = rectifiedCanvas.height;

  const scale = Math.min(1, gridSize / Math.max(w, h));
  const sw = Math.max(12, Math.round(w * scale));
  const sh = Math.max(12, Math.round(h * scale));

  const small = document.createElement('canvas');
  small.width = sw;
  small.height = sh;
  const sCtx = small.getContext('2d', { willReadFrequently: true })!;
  sCtx.imageSmoothingEnabled = true;
  sCtx.imageSmoothingQuality = 'medium';
  sCtx.drawImage(rectifiedCanvas, 0, 0, sw, sh);

  const img = sCtx.getImageData(0, 0, sw, sh);
  const src = img.data;
  const tmp = new Uint8ClampedArray(src.length);
  const dst = new Uint8ClampedArray(src.length);

  // Separable local-max dilation (radius = 4 on ~72px grid => bridges bold headings & lines!)
  const dilateR = Math.max(2, Math.round(Math.min(sw, sh) * 0.065));

  // Horizontal max pass
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      let maxR = 0,
        maxG = 0,
        maxB = 0;
      const xStart = Math.max(0, x - dilateR);
      const xEnd = Math.min(sw - 1, x + dilateR);
      for (let k = xStart; k <= xEnd; k++) {
        const i = (y * sw + k) * 4;
        if (src[i] > maxR) maxR = src[i];
        if (src[i + 1] > maxG) maxG = src[i + 1];
        if (src[i + 2] > maxB) maxB = src[i + 2];
      }
      const o = (y * sw + x) * 4;
      tmp[o] = maxR;
      tmp[o + 1] = maxG;
      tmp[o + 2] = maxB;
      tmp[o + 3] = 255;
    }
  }

  // Vertical max pass
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      let maxR = 0,
        maxG = 0,
        maxB = 0;
      const yStart = Math.max(0, y - dilateR);
      const yEnd = Math.min(sh - 1, y + dilateR);
      for (let k = yStart; k <= yEnd; k++) {
        const i = (k * sw + x) * 4;
        if (tmp[i] > maxR) maxR = tmp[i];
        if (tmp[i + 1] > maxG) maxG = tmp[i + 1];
        if (tmp[i + 2] > maxB) maxB = tmp[i + 2];
      }
      const o = (y * sw + x) * 4;
      dst[o] = maxR;
      dst[o + 1] = maxG;
      dst[o + 2] = maxB;
      dst[o + 3] = 255;
    }
  }

  // Smooth box blur pass so illumination transition is completely halo-free
  const blurR = Math.max(2, Math.round(dilateR * 0.85));
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      let sr = 0,
        sg = 0,
        sb = 0,
        cnt = 0;
      const xStart = Math.max(0, x - blurR);
      const xEnd = Math.min(sw - 1, x + blurR);
      for (let k = xStart; k <= xEnd; k++) {
        const i = (y * sw + k) * 4;
        sr += dst[i];
        sg += dst[i + 1];
        sb += dst[i + 2];
        cnt++;
      }
      const o = (y * sw + x) * 4;
      tmp[o] = Math.round(sr / cnt);
      tmp[o + 1] = Math.round(sg / cnt);
      tmp[o + 2] = Math.round(sb / cnt);
      tmp[o + 3] = 255;
    }
  }
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      let sr = 0,
        sg = 0,
        sb = 0,
        cnt = 0;
      const yStart = Math.max(0, y - blurR);
      const yEnd = Math.min(sh - 1, y + blurR);
      for (let k = yStart; k <= yEnd; k++) {
        const i = (k * sw + x) * 4;
        sr += tmp[i];
        sg += tmp[i + 1];
        sb += tmp[i + 2];
        cnt++;
      }
      const o = (y * sw + x) * 4;
      img.data[o] = Math.round(sr / cnt);
      img.data[o + 1] = Math.round(sg / cnt);
      img.data[o + 2] = Math.round(sb / cnt);
      img.data[o + 3] = 255;
    }
  }

  sCtx.putImageData(img, 0, 0);

  // Upscale smoothly back to full canvas dimensions
  const fullBg = document.createElement('canvas');
  fullBg.width = w;
  fullBg.height = h;
  const fCtx = fullBg.getContext('2d', { willReadFrequently: true })!;
  fCtx.imageSmoothingEnabled = true;
  fCtx.imageSmoothingQuality = 'high';
  fCtx.drawImage(small, 0, 0, w, h);

  return fCtx.getImageData(0, 0, w, h).data;
}

/**
 * Applies CamScanner-grade enhancement filters (Magic Pro, Magic Color, No Shadow, Lighten, B&W Pro, Grayscale)
 * onto a rectified document canvas.
 */
export function applyScannerFilter(
  rectifiedCanvas: HTMLCanvasElement,
  filter: ScannerFilterId,
  brightness = 0,
  contrast = 0,
  sharpness = 35
): HTMLCanvasElement {
  const w = rectifiedCanvas.width;
  const h = rectifiedCanvas.height;

  const outCanvas = document.createElement('canvas');
  outCanvas.width = w;
  outCanvas.height = h;
  const outCtx = outCanvas.getContext('2d', { willReadFrequently: true })!;
  outCtx.drawImage(rectifiedCanvas, 0, 0);

  const needsIlluminationMap =
    filter === 'magic-pro' ||
    filter === 'magic-color' ||
    filter === 'no-shadow' ||
    filter === 'bw-pro' ||
    filter === 'grayscale';

  const bgData = needsIlluminationMap ? buildLocalIlluminationMap(rectifiedCanvas) : null;

  const imgData = outCtx.getImageData(0, 0, w, h);
  const d = imgData.data;

  const brightOffset = brightness * 1.4; // -56..+56
  const contrastFactor = Math.pow((contrast + 100) / 100, 1.35);

  const clamp255 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v));

  for (let i = 0; i < d.length; i += 4) {
    let r = d[i];
    let g = d[i + 1];
    let b = d[i + 2];

    if (bgData && filter !== 'original' && filter !== 'lighten') {
      // Illumination division: removes shadows & gray paper cast cleanly
      const br = bgData[i] < 32 ? 32 : bgData[i];
      const bg = bgData[i + 1] < 32 ? 32 : bgData[i + 1];
      const bb = bgData[i + 2] < 32 ? 32 : bgData[i + 2];

      const nr = Math.min(255, (r / br) * 255);
      const ng = Math.min(255, (g / bg) * 255);
      const nb = Math.min(255, (b / bb) * 255);

      if (filter === 'magic-pro') {
        // CamScanner Magic Pro signature look: spotless #FFFFFF paper + vivid rich colored ink + crisp black text
        const lum = 0.299 * nr + 0.587 * ng + 0.114 * nb;
        const maxC = Math.max(nr, ng, nb);
        const minC = Math.min(nr, ng, nb);
        const chroma = maxC - minC;

        if (lum >= 224 && chroma < 28) {
          r = 255;
          g = 255;
          b = 255;
        } else {
          // Boost ink depth & color vibrancy while smoothly feathering highlights to pure white
          let er = nr;
          let eg = ng;
          let eb = nb;

          // Deepen ink strokes via smooth gamma/contrast curve
          const normLum = lum / 255;
          const inkGain = normLum < 0.78 ? 0.86 : 1;
          er *= inkGain;
          eg *= inkGain;
          eb *= inkGain;

          // Boost color saturation on colored text/headers/stamps (like blue/red bills)
          const avg = (er + eg + eb) / 3;
          const satBoost = chroma > 18 ? 1.42 : 1.08;
          er = avg + (er - avg) * satBoost;
          eg = avg + (eg - avg) * satBoost;
          eb = avg + (eb - avg) * satBoost;

          // Crisp S-curve stretch: [24..226] -> [0..255]
          er = ((er - 22) / 204) * 255;
          eg = ((eg - 22) / 204) * 255;
          eb = ((eb - 22) / 204) * 255;

          // Smooth highlight white lift to kill faint paper specks
          if (lum > 192 && chroma < 24) {
            const t = (lum - 192) / 32;
            const smooth = t * t;
            er = er + (255 - er) * smooth;
            eg = eg + (255 - eg) * smooth;
            eb = eb + (255 - eb) * smooth;
          }

          r = er;
          g = eg;
          b = eb;
        }
      } else if (filter === 'magic-color') {
        // Vibrant, slightly softer Magic Color preserving photographic richness & white paper
        const blend = 0.86;
        let er = r * (1 - blend) + nr * blend;
        let eg = g * (1 - blend) + ng * blend;
        let eb = b * (1 - blend) + nb * blend;

        const avg = (er + eg + eb) / 3;
        er = avg + (er - avg) * 1.28;
        eg = avg + (eg - avg) * 1.28;
        eb = avg + (eb - avg) * 1.28;

        er = ((er - 14) / 226) * 255;
        eg = ((eg - 14) / 226) * 255;
        eb = ((eb - 14) / 226) * 255;

        r = er;
        g = eg;
        b = eb;
      } else if (filter === 'no-shadow') {
        // Pure illumination flattening — eliminates cast hand/phone shadows while preserving natural colors
        const lum = 0.299 * nr + 0.587 * ng + 0.114 * nb;
        let er = nr;
        let eg = ng;
        let eb = nb;
        if (lum > 234) {
          const t = (lum - 234) / 21;
          er = er + (255 - er) * t;
          eg = eg + (255 - eg) * t;
          eb = eb + (255 - eb) * t;
        } else {
          er = ((er - 8) / 240) * 255;
          eg = ((eg - 8) / 240) * 255;
          eb = ((eb - 8) / 240) * 255;
        }
        r = er;
        g = eg;
        b = eb;
      } else if (filter === 'bw-pro') {
        // High-contrast crisp anti-aliased B&W photocopy look on pure white paper
        const lum = 0.299 * nr + 0.587 * ng + 0.114 * nb;
        let v: number;
        if (lum >= 208) {
          v = 255;
        } else if (lum <= 135) {
          v = Math.max(0, Math.round(lum * 0.28));
        } else {
          const t = (lum - 135) / 73;
          v = Math.round(Math.pow(t, 1.25) * 255);
        }
        r = v;
        g = v;
        b = v;
      } else if (filter === 'grayscale') {
        const lum = 0.299 * nr + 0.587 * ng + 0.114 * nb;
        const v = lum > 228 ? 255 : ((lum - 18) / 210) * 255;
        r = v;
        g = v;
        b = v;
      }
    } else if (filter === 'lighten') {
      // Gentle brightener & clean white lift
      r = Math.pow(r / 255, 0.78) * 255 + 10;
      g = Math.pow(g / 255, 0.78) * 255 + 10;
      b = Math.pow(b / 255, 0.78) * 255 + 10;
    }

    // Apply user fine-tuning brightness & contrast
    if (brightness !== 0 || contrast !== 0) {
      r = (r - 128) * contrastFactor + 128 + brightOffset;
      g = (g - 128) * contrastFactor + 128 + brightOffset;
      b = (b - 128) * contrastFactor + 128 + brightOffset;
    }

    d[i] = clamp255(r);
    d[i + 1] = clamp255(g);
    d[i + 2] = clamp255(b);
    d[i + 3] = 255;
  }

  outCtx.putImageData(imgData, 0, 0);

  // Subtle HD text unsharp mask for razor-sharp printed Bangla & English fonts
  if (sharpness > 5 && filter !== 'original' && w * h <= 14_000_000) {
    applyHdTextSharpen(outCtx, w, h, (sharpness / 100) * 0.55);
  }

  return outCanvas;
}

function applyHdTextSharpen(
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
      if (copy[idx] >= 251 && copy[idx + 1] >= 251 && copy[idx + 2] >= 251) continue;

      const up = idx - w * 4;
      const dn = idx + w * 4;
      const lt = idx - 4;
      const rt = idx + 4;

      for (let c = 0; c < 3; c++) {
        const center = copy[idx + c];
        const avg = (copy[up + c] + copy[dn + c] + copy[lt + c] + copy[rt + c]) * 0.25;
        const v = center + (center - avg) * amount;
        src[idx + c] = v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
      }
    }
  }

  ctx.putImageData(img, 0, 0);
}

/**
 * Paper dimensions in mm for print-ready Full HD composition.
 */
export function getScannerPaperSpec(
  paperSize: ScannerPaperSize,
  docWidth: number,
  docHeight: number
): {
  widthMm: number;
  heightMm: number;
  labelEn: string;
  labelBn: string;
  pxW: number;
  pxH: number;
} {
  const isLandscape = docWidth > docHeight * 1.06;

  if (paperSize === 'a4-fit' || paperSize === 'a4-fill') {
    const wMm = isLandscape ? 297 : 210;
    const hMm = isLandscape ? 210 : 297;
    // Full HD 240-300 DPI equivalent (crisp print quality without crashing mobile RAM)
    const pxW = isLandscape ? 2970 : 2100;
    const pxH = isLandscape ? 2100 : 2970;
    return {
      widthMm: wMm,
      heightMm: hMm,
      labelEn: isLandscape ? 'A4 Landscape' : 'A4 Portrait',
      labelBn: isLandscape ? 'A4 ল্যান্ডস্কেপ' : 'A4 পোর্ট্রেট',
      pxW,
      pxH,
    };
  }

  if (paperSize === 'legal-fit') {
    const wMm = isLandscape ? 355.6 : 215.9;
    const hMm = isLandscape ? 215.9 : 355.6;
    const pxW = isLandscape ? 3200 : 1943;
    const pxH = isLandscape ? 1943 : 3200;
    return {
      widthMm: wMm,
      heightMm: hMm,
      labelEn: isLandscape ? 'Legal Landscape' : 'Legal Portrait',
      labelBn: isLandscape ? 'লিগ্যাল ল্যান্ডস্কেপ' : 'লিগ্যাল পোর্ট্রেট',
      pxW,
      pxH,
    };
  }

  if (paperSize === 'a5-fit') {
    const wMm = isLandscape ? 210 : 148;
    const hMm = isLandscape ? 148 : 210;
    const pxW = isLandscape ? 2100 : 1480;
    const pxH = isLandscape ? 1480 : 2100;
    return {
      widthMm: wMm,
      heightMm: hMm,
      labelEn: 'A5 (Receipt / Half A4)',
      labelBn: 'A5 (রসিদ / হাফ A4)',
      pxW,
      pxH,
    };
  }

  // 'auto': Exact document natural aspect ratio scaled cleanly for crisp Full HD print
  const ratio = docWidth / Math.max(1, docHeight);
  const baseLongMm = 297;
  const widthMm = isLandscape ? baseLongMm : Math.round(baseLongMm * ratio * 10) / 10;
  const heightMm = isLandscape ? Math.round((baseLongMm / ratio) * 10) / 10 : baseLongMm;
  return {
    widthMm,
    heightMm,
    labelEn: 'Auto (Document Aspect)',
    labelBn: 'ডকুমেন্টের নিজস্ব মাপ (অটো)',
    pxW: docWidth,
    pxH: docHeight,
  };
}

/**
 * Composes an enhanced scanned document canvas onto a pure white print-ready paper canvas
 * according to the selected Paper Size & Margin (Auto / A4 Fit / A4 Fill / Legal / A5).
 */
export function composeScannedPageToPaper(
  enhancedCanvas: HTMLCanvasElement,
  paperSize: ScannerPaperSize,
  marginMm: number
): { canvas: HTMLCanvasElement; widthMm: number; heightMm: number } {
  const docW = enhancedCanvas.width;
  const docH = enhancedCanvas.height;

  if (paperSize === 'auto') {
    const spec = getScannerPaperSpec('auto', docW, docH);
    if (marginMm <= 0) {
      return { canvas: enhancedCanvas, widthMm: spec.widthMm, heightMm: spec.heightMm };
    }
    const padPx = Math.round((marginMm / Math.max(spec.widthMm, spec.heightMm)) * Math.max(docW, docH));
    const c = document.createElement('canvas');
    c.width = docW + padPx * 2;
    c.height = docH + padPx * 2;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(enhancedCanvas, padPx, padPx, docW, docH);
    return {
      canvas: c,
      widthMm: spec.widthMm + marginMm * 2,
      heightMm: spec.heightMm + marginMm * 2,
    };
  }

  const spec = getScannerPaperSpec(paperSize, docW, docH);
  const out = document.createElement('canvas');
  out.width = spec.pxW;
  out.height = spec.pxH;
  const ctx = out.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const pxPerMm = out.width / spec.widthMm;
  const marginPx = Math.round(Math.max(0, marginMm) * pxPerMm);
  const availW = Math.max(10, out.width - marginPx * 2);
  const availH = Math.max(10, out.height - marginPx * 2);

  if (paperSize === 'a4-fill') {
    // Stretch-fit cleanly into available A4 printable region (ideal for slightly skewed A4 pages)
    ctx.drawImage(enhancedCanvas, marginPx, marginPx, availW, availH);
  } else {
    // Aspect-preserving contain centered cleanly on white paper
    const scale = Math.min(availW / docW, availH / docH);
    const drawW = Math.round(docW * scale);
    const drawH = Math.round(docH * scale);
    const dx = Math.round((out.width - drawW) / 2);
    const dy = Math.round((out.height - drawH) / 2);
    ctx.drawImage(enhancedCanvas, dx, dy, drawW, drawH);
  }

  return { canvas: out, widthMm: spec.widthMm, heightMm: spec.heightMm };
}

export interface ScannedPageInput {
  file: File;
  rotation: number;
  quad: DocumentQuad;
  options: ScannerEnhanceOptions;
}

/**
 * Full-HD render pipeline for a single scanned page -> Blob + metadata.
 */
export async function renderFullHdScannedPage(
  page: ScannedPageInput,
  lang: 'en' | 'bn' = 'en'
): Promise<{
  result: ProcessedFileResult;
  canvas: HTMLCanvasElement;
  widthMm: number;
  heightMm: number;
}> {
  const img = await loadImageFromFile(page.file);
  const rotated = getRotatedSourceCanvas(img, page.rotation, 3200);
  const warped = warpPerspectiveCanvas(rotated, page.quad, 2480);
  const enhanced = applyScannerFilter(
    warped,
    page.options.filter,
    page.options.brightness,
    page.options.contrast,
    page.options.sharpness
  );
  const { canvas, widthMm, heightMm } = composeScannedPageToPaper(
    enhanced,
    page.options.paperSize,
    page.options.marginMm
  );

  const quality = page.options.outputFormat === 'image/jpeg' ? 0.96 : undefined;
  const blob = await canvasToBlob(canvas, page.options.outputFormat, quality);
  const ext = mimeToExt(page.options.outputFormat);
  const previewUrl = URL.createObjectURL(blob);

  return {
    canvas,
    widthMm,
    heightMm,
    result: {
      id: `scan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: `${getBaseName(page.file.name)}_scanned.${ext}`,
      originalName: page.file.name,
      originalSize: page.file.size,
      blob,
      previewUrl,
      width: canvas.width,
      height: canvas.height,
      infoText:
        lang === 'bn'
          ? `Full HD (${toBnDigits(canvas.width)}×${toBnDigits(canvas.height)} px)`
          : `Full HD (${canvas.width}×${canvas.height} px)`,
    },
  };
}

/**
 * Builds a print-ready multi-page PDF from one or more scanned pages with exact physical mm sizes.
 */
export async function buildScannedPdf(
  pages: ScannedPageInput[],
  pdfFileName = 'NextStudio_Scanned_Document.pdf',
  lang: 'en' | 'bn' = 'en'
): Promise<ProcessedFileResult> {
  const pdfDoc = await PDFDocument.create();
  let totalOrigSize = 0;

  for (const page of pages) {
    totalOrigSize += page.file.size;
    const { canvas, widthMm, heightMm } = await renderFullHdScannedPage(page, lang);
    const jpgBlob = await canvasToBlob(canvas, 'image/jpeg', 0.95);
    const bytes = new Uint8Array(await jpgBlob.arrayBuffer());
    const embedded = await pdfDoc.embedJpg(bytes);

    // 1 mm = 2.83464567 PDF points
    const ptW = widthMm * 2.83464567;
    const ptH = heightMm * 2.83464567;
    const pdfPage = pdfDoc.addPage([ptW, ptH]);
    pdfPage.drawImage(embedded, {
      x: 0,
      y: 0,
      width: ptW,
      height: ptH,
    });
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });

  return {
    id: `scan-pdf-${Date.now()}`,
    name: pdfFileName,
    originalName: pdfFileName,
    originalSize: totalOrigSize,
    blob,
    infoText:
      lang === 'bn'
        ? `${toBnDigits(pages.length)} পাতার Full HD প্রিন্ট-রেডি PDF`
        : `${pages.length}-page Full HD Print-Ready PDF`,
  };
}

/**
 * Direct Print for scanned Full HD pages using an invisible iframe (never calls window.open).
 */
export function printScannedPagesDirectly(
  renderedPages: { url: string; widthMm: number; heightMm: number }[]
): void {
  if (renderedPages.length === 0) return;

  const existing = document.getElementById('nextstudio-scanner-print-iframe');
  if (existing) existing.remove();

  const iframe = document.createElement('iframe');
  iframe.id = 'nextstudio-scanner-print-iframe';
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

  const first = renderedPages[0];
  const pagesHtml = renderedPages
    .map(
      (p, i) => `
      <div class="scan-print-page" style="${
        i < renderedPages.length - 1 ? 'page-break-after: always; break-after: page;' : ''
      }">
        <img src="${p.url}" alt="Scanned Page ${i + 1}" />
      </div>`
    )
    .join('');

  doc.open();
  doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>NextStudio Document Scanner Print</title>
  <style>
    @page { size: ${first.widthMm}mm ${first.heightMm}mm; margin: 0mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { background: #ffffff; width: 100%; height: 100%; }
    .scan-print-page {
      width: 100vw;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #ffffff;
      overflow: hidden;
    }
    .scan-print-page img {
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
    window.setTimeout(() => iframe.remove(), 60_000);
  };

  const imgs = Array.from(doc.querySelectorAll('img'));
  if (imgs.length === 0) {
    trigger();
    return;
  }

  let loaded = 0;
  const done = () => {
    loaded++;
    if (loaded >= imgs.length) {
      window.setTimeout(trigger, 80);
    }
  };
  imgs.forEach((im) => {
    if (im.complete) done();
    else {
      im.onload = done;
      im.onerror = done;
    }
  });
}
