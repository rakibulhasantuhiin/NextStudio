import { StudioBackdropPreset } from '../types';

export interface AiProgressUpdate {
  percent: number;
  labelBn: string;
  labelEn: string;
}

export interface FreeAiPassportResult {
  /** Upright studio-composited portrait (for editor & preview reference) */
  studioDataUrl: string;
  /** Upright transparent aligned portrait cutout (cached for instant BG color switching) */
  cutoutDataUrl: string;
  bgPreset: StudioBackdropPreset;
}

interface PortraitMetrics {
  width: number;
  height: number;
  topY: number;
  bottomY: number;
  leftX: number;
  rightX: number;
  headCenterX: number;
  headHeight: number;
  eyeLineY: number;
  faceLuminance: number;
}

interface DetectedFaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

const SINGLE_OUT_W = 1050; // Exact 35:45 Bangladesh Passport ratio (~760 DPI)
const SINGLE_OUT_H = 1350;
const COUPLE_OUT_W = 1500; // Exact 50:40 Couple Passport ratio (~760 DPI)
const COUPLE_OUT_H = 1200;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to decode image file.'));
    img.src = src;
  });
}

/**
 * Normalizes any uploaded image File into an EXIF-upright capped working canvas
 * so mobile browsers never run out of RAM during ONNX segmentation.
 */
async function fileToWorkingCanvas(file: File, maxSide = 1280): Promise<HTMLCanvasElement> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const natW = img.naturalWidth || 1024;
    const natH = img.naturalHeight || 1024;
    let w = natW;
    let h = natH;
    if (Math.max(w, h) > maxSide) {
      const scale = maxSide / Math.max(w, h);
      w = Math.max(1, Math.round(w * scale));
      h = Math.max(1, Math.round(h * scale));
    }
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable.');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, w, h);
    return canvas;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, mime = 'image/png', quality = 0.96): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Could not encode image canvas.'));
      },
      mime,
      quality
    );
  });
}

/**
 * Optional native Browser FaceDetector API (zero-cost when supported on Chrome).
 */
async function detectFaceNative(canvas: HTMLCanvasElement): Promise<DetectedFaceBox | null> {
  try {
    const win = window as unknown as {
      FaceDetector?: new (opts?: { fastMode?: boolean; maxDetectedFaces?: number }) => {
        detect: (src: HTMLCanvasElement) => Promise<Array<{ boundingBox: DOMRectReadOnly }>>;
      };
    };
    if (typeof win.FaceDetector !== 'function') return null;
    const detector = new win.FaceDetector({ fastMode: true, maxDetectedFaces: 3 });
    const faces = await detector.detect(canvas);
    if (!faces || faces.length === 0) return null;
    // Pick largest detected face
    let best = faces[0].boundingBox;
    for (const f of faces) {
      if (f.boundingBox.width * f.boundingBox.height > best.width * best.height) {
        best = f.boundingBox;
      }
    }
    return {
      x: best.x,
      y: best.y,
      width: best.width,
      height: best.height,
    };
  } catch {
    return null;
  }
}

/**
 * Fallback lightweight edge-connected background matte if the ONNX CDN is unreachable
 * (e.g., strict firewall or completely offline first visit before model cache).
 */
function fallbackColorMatteCutout(sourceCanvas: HTMLCanvasElement): HTMLCanvasElement {
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const ctx = out.getContext('2d')!;
  ctx.drawImage(sourceCanvas, 0, 0);
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // Sample border pixels (top + upper left/right) to estimate background color
  let bgR = 0;
  let bgG = 0;
  let bgB = 0;
  let count = 0;
  const samplePoint = (x: number, y: number) => {
    const idx = (y * w + x) * 4;
    bgR += data[idx];
    bgG += data[idx + 1];
    bgB += data[idx + 2];
    count++;
  };
  for (let x = 0; x < w; x += Math.max(1, Math.floor(w / 40))) {
    samplePoint(x, 2);
    samplePoint(x, Math.min(h - 1, 8));
  }
  for (let y = 0; y < Math.floor(h * 0.6); y += Math.max(1, Math.floor(h / 30))) {
    samplePoint(2, y);
    samplePoint(Math.max(0, w - 3), y);
  }
  bgR /= Math.max(1, count);
  bgG /= Math.max(1, count);
  bgB /= Math.max(1, count);

  const visited = new Uint8Array(w * h);
  const bgMask = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;
  const threshold = 58;

  const tryPush = (x: number, y: number) => {
    const p = y * w + x;
    if (visited[p]) return;
    const idx = p * 4;
    const dist = Math.hypot(data[idx] - bgR, data[idx + 1] - bgG, data[idx + 2] - bgB);
    if (dist <= threshold) {
      visited[p] = 1;
      bgMask[p] = 1;
      queue[tail++] = p;
    }
  };

  for (let x = 0; x < w; x++) {
    tryPush(x, 0);
    tryPush(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    tryPush(0, y);
    tryPush(w - 1, y);
  }

  while (head < tail) {
    const p = queue[head++];
    const x = p % w;
    const y = (p - x) / w;
    const idx = p * 4;
    const pr = data[idx];
    const pg = data[idx + 1];
    const pb = data[idx + 2];

    const neighbors = [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ];
    for (const [nx, ny] of neighbors) {
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
      const np = ny * w + nx;
      if (visited[np]) continue;
      const nIdx = np * 4;
      const distGlobal = Math.hypot(data[nIdx] - bgR, data[nIdx + 1] - bgG, data[nIdx + 2] - bgB);
      const distLocal = Math.hypot(data[nIdx] - pr, data[nIdx + 1] - pg, data[nIdx + 2] - pb);
      if (distGlobal <= threshold * 1.12 || (distGlobal <= threshold * 1.45 && distLocal <= 18)) {
        visited[np] = 1;
        bgMask[np] = 1;
        queue[tail++] = np;
      }
    }
  }

  for (let i = 0; i < w * h; i++) {
    if (bgMask[i]) {
      data[i * 4 + 3] = 0;
    }
  }
  ctx.putImageData(imgData, 0, 0);
  return out;
}

/**
 * Runs 100% Free On-Device Neural Portrait Segmentation (@imgly/background-removal ONNX)
 * directly inside the user's browser with zero API keys and zero cost.
 */
async function runNeuralPortraitCutout(
  workingCanvas: HTMLCanvasElement,
  onStageProgress: (fraction: number, isDownloading: boolean) => void
): Promise<HTMLCanvasElement> {
  const inputBlob = await canvasToBlob(workingCanvas, 'image/png', 1);

  try {
    const { removeBackground } = await import('@imgly/background-removal');

    const resultBlob = await removeBackground(inputBlob, {
      model: 'isnet_quint8',
      device: 'cpu',
      proxyToWorker: false,
      output: {
        format: 'image/png',
        quality: 1,
      },
      progress: (key: string, current: number, total: number) => {
        const isFetch = key.toLowerCase().includes('fetch');
        const frac = total > 0 ? Math.max(0, Math.min(1, current / total)) : 0.5;
        onStageProgress(frac, isFetch);
      },
    });

    const url = URL.createObjectURL(resultBlob);
    try {
      const cutImg = await loadImage(url);
      const cutCanvas = document.createElement('canvas');
      cutCanvas.width = workingCanvas.width;
      cutCanvas.height = workingCanvas.height;
      const ctx = cutCanvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(cutImg, 0, 0, cutCanvas.width, cutCanvas.height);
      return cutCanvas;
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch (err) {
    console.warn('[FreeAI] Neural segmentation fallback engaged:', err);
    return fallbackColorMatteCutout(workingCanvas);
  }
}

/**
 * Cleans stray semi-transparent background spill (hair halo decontamination)
 * and removes tiny isolated background specks while keeping fine hair strands natural.
 */
function refineCutoutAlphaAndDecontaminate(cutoutCanvas: HTMLCanvasElement): void {
  const w = cutoutCanvas.width;
  const h = cutoutCanvas.height;
  const ctx = cutoutCanvas.getContext('2d')!;
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // Keep a read-only snapshot of RGB/Alpha so decontamination reads pure interior colors
  const src = new Uint8ClampedArray(data);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const a = src[idx + 3];

      // Strip near-zero residual noise specks
      if (a <= 14) {
        data[idx + 3] = 0;
        continue;
      }

      // Slightly tighten semi-transparent edge to eliminate grey haze around hair/clothes
      if (a < 236) {
        const norm = (a - 14) / (236 - 14);
        const tightened = Math.round(Math.pow(norm, 1.15) * 255);
        data[idx + 3] = Math.max(0, Math.min(255, tightened));

        // Pull true foreground hair/cloth color from nearest solid interior pixels (radius 4)
        let sumR = 0;
        let sumG = 0;
        let sumB = 0;
        let weightSum = 0;

        for (let dy = -4; dy <= 4; dy += 2) {
          const ny = y + dy;
          if (ny < 0 || ny >= h) continue;
          for (let dx = -4; dx <= 4; dx += 2) {
            const nx = x + dx;
            if (nx < 0 || nx >= w) continue;
            const nIdx = (ny * w + nx) * 4;
            const na = src[nIdx + 3];
            if (na >= 242) {
              const dist = Math.hypot(dx, dy) || 1;
              const wt = 1 / dist;
              sumR += src[nIdx] * wt;
              sumG += src[nIdx + 1] * wt;
              sumB += src[nIdx + 2] * wt;
              weightSum += wt;
            }
          }
        }

        if (weightSum > 0) {
          const pureR = sumR / weightSum;
          const pureG = sumG / weightSum;
          const pureB = sumB / weightSum;
          // Blend stronger decontamination on outer fringe pixels
          const deconStrength = Math.min(0.85, (1 - norm) * 0.92 + 0.15);
          data[idx] = Math.round(src[idx] * (1 - deconStrength) + pureR * deconStrength);
          data[idx + 1] = Math.round(src[idx + 1] * (1 - deconStrength) + pureG * deconStrength);
          data[idx + 2] = Math.round(src[idx + 2] * (1 - deconStrength) + pureB * deconStrength);
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

/**
 * Analyzes the segmented portrait mask (+ optional native FaceDetector) to accurately
 * determine crown top, head center X, head height, eye line, and facial luminance.
 */
function analyzePortraitMetrics(
  cutoutCanvas: HTMLCanvasElement,
  nativeFace: DetectedFaceBox | null
): PortraitMetrics {
  const w = cutoutCanvas.width;
  const h = cutoutCanvas.height;
  const ctx = cutoutCanvas.getContext('2d')!;
  const data = ctx.getImageData(0, 0, w, h).data;

  const rowMinX = new Int32Array(h).fill(w);
  const rowMaxX = new Int32Array(h).fill(-1);
  const rowCount = new Int32Array(h);

  let topY = h;
  let bottomY = 0;
  let leftX = w;
  let rightX = 0;

  for (let y = 0; y < h; y++) {
    let minX = w;
    let maxX = -1;
    let cnt = 0;
    const rowOffset = y * w * 4;
    for (let x = 0; x < w; x++) {
      if (data[rowOffset + x * 4 + 3] >= 120) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        cnt++;
      }
    }
    rowMinX[y] = minX;
    rowMaxX[y] = maxX;
    rowCount[y] = cnt;
    // Require at least 8 solid pixels in a row to ignore tiny hair/noise specks
    if (cnt >= Math.max(6, Math.floor(w * 0.012))) {
      if (y < topY) topY = y;
      if (y > bottomY) bottomY = y;
      if (minX < leftX) leftX = minX;
      if (maxX > rightX) rightX = maxX;
    }
  }

  // Safety fallback if mask is nearly empty
  if (topY >= bottomY || rightX <= leftX) {
    return {
      width: w,
      height: h,
      topY: Math.round(h * 0.08),
      bottomY: h - 1,
      leftX: Math.round(w * 0.15),
      rightX: Math.round(w * 0.85),
      headCenterX: w * 0.5,
      headHeight: h * 0.45,
      eyeLineY: h * 0.34,
      faceLuminance: 120,
    };
  }

  const fgHeight = Math.max(1, bottomY - topY);
  const fgWidth = Math.max(1, rightX - leftX);

  let headCenterX = (leftX + rightX) * 0.5;
  let headHeight = Math.min(fgHeight * 0.54, fgWidth * 0.72);
  let eyeLineY = topY + headHeight * 0.46;

  if (nativeFace && nativeFace.width > w * 0.08 && nativeFace.height > h * 0.08) {
    headCenterX = nativeFace.x + nativeFace.width * 0.5;
    // Crown-to-chin is typically ~1.26x face box height (includes hair above forehead)
    const faceBottom = nativeFace.y + nativeFace.height;
    headHeight = Math.max(nativeFace.height * 1.24, faceBottom - topY);
    eyeLineY = nativeFace.y + nativeFace.height * 0.38;
  } else {
    // Analyze upper portrait silhouette to locate head width, center X, and neck/shoulder transition
    const scanEnd = Math.min(bottomY, topY + Math.round(fgHeight * 0.65));
    let headPeakWidth = 0;
    let headPeakY = topY + Math.round(fgHeight * 0.18);
    let weightedCenterSum = 0;
    let weightedCount = 0;

    // 1) Find maximum head width in upper 30% of foreground
    const headSearchEnd = Math.min(bottomY, topY + Math.round(Math.min(fgHeight * 0.34, fgWidth * 0.52)));
    for (let y = topY + 2; y <= headSearchEnd; y++) {
      if (rowMaxX[y] > rowMinX[y]) {
        const span = rowMaxX[y] - rowMinX[y];
        if (span > headPeakWidth) {
          headPeakWidth = span;
          headPeakY = y;
        }
        const mid = (rowMinX[y] + rowMaxX[y]) * 0.5;
        weightedCenterSum += mid * span;
        weightedCount += span;
      }
    }

    if (weightedCount > 0) {
      headCenterX = weightedCenterSum / weightedCount;
    }

    // 2) Detect shoulder widening below headPeakY (neck tapers, then shoulders jump > 1.38x headPeakWidth)
    let detectedShoulderY = -1;
    if (headPeakWidth > 20) {
      for (let y = headPeakY + Math.round(headPeakWidth * 0.45); y <= scanEnd; y++) {
        if (rowMaxX[y] > rowMinX[y]) {
          const span = rowMaxX[y] - rowMinX[y];
          if (span >= headPeakWidth * 1.36) {
            detectedShoulderY = y;
            break;
          }
        }
      }
    }

    // Human head aspect ratio (crown-to-chin / ear-to-ear width) is reliably ~1.30–1.38
    const widthBasedHeadH = headPeakWidth > 20 ? headPeakWidth * 1.34 : fgHeight * 0.48;
    if (detectedShoulderY > topY) {
      const shoulderBasedHeadH = (detectedShoulderY - topY) * 0.88;
      headHeight = Math.max(widthBasedHeadH * 0.85, Math.min(widthBasedHeadH * 1.18, shoulderBasedHeadH));
    } else {
      headHeight = Math.min(fgHeight * 0.62, widthBasedHeadH);
    }

    // Clamp sensible bounds for both tight selfies and full-body shots
    headHeight = Math.max(fgHeight * 0.18, Math.min(fgHeight * 0.72, headHeight));
    eyeLineY = topY + headHeight * 0.48;
  }

  // Measure average facial luminance inside the head region (excluding dark top hair)
  const faceSampleTop = Math.max(0, Math.round(topY + headHeight * 0.25));
  const faceSampleBottom = Math.min(h - 1, Math.round(topY + headHeight * 0.82));
  const faceSampleLeft = Math.max(0, Math.round(headCenterX - headHeight * 0.28));
  const faceSampleRight = Math.min(w - 1, Math.round(headCenterX + headHeight * 0.28));

  let lumSum = 0;
  let lumCount = 0;
  for (let y = faceSampleTop; y <= faceSampleBottom; y += 2) {
    const rowOff = y * w * 4;
    for (let x = faceSampleLeft; x <= faceSampleRight; x += 2) {
      const idx = rowOff + x * 4;
      if (data[idx + 3] >= 220) {
        const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        // Ignore very dark beard/hair/eyebrow pixels when measuring skin exposure
        if (lum > 42 && lum < 245) {
          lumSum += lum;
          lumCount++;
        }
      }
    }
  }
  const faceLuminance = lumCount > 25 ? lumSum / lumCount : 125;

  return {
    width: w,
    height: h,
    topY,
    bottomY,
    leftX,
    rightX,
    headCenterX,
    headHeight,
    eyeLineY,
    faceLuminance,
  };
}

/**
 * Applies adaptive Bright Studio Lighting + soft shadow recovery + crisp micro-sharpening
 * strictly to the segmented foreground portrait (preserving 100% real facial identity).
 */
function applyStudioForegroundLighting(
  cutoutCanvas: HTMLCanvasElement,
  faceLuminance: number
): void {
  const w = cutoutCanvas.width;
  const h = cutoutCanvas.height;
  const ctx = cutoutCanvas.getContext('2d')!;
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // Target bright, even Bangladesh photo-studio facial luminance (~156–164 on 0-255 scale)
  const targetLum = 158;
  const deficit = Math.max(-18, Math.min(68, targetLum - faceLuminance));
  // Smooth gamma curve lifts facial shadows without blowing out white shirts/highlights
  const gamma = Math.max(0.66, Math.min(1.06, 1 - deficit * 0.0046));
  const brightnessGain = Math.max(0.95, Math.min(1.22, 1 + deficit * 0.0024));
  const contrastFactor = 1.07; // Clean studio crispness
  const warmthBoost = 1.025; // Subtle healthy studio skin warmth
  const satBoost = 1.06;

  // Precompute 256-entry tone curve LUT for instant processing
  const lut = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++) {
    let v = i / 255;
    // Shadow-lifting gamma curve
    v = Math.pow(v, gamma) * brightnessGain;
    // Gentle shoulder roll-off so highlights never clip harshly
    if (v > 0.84) {
      v = 0.84 + (1 - Math.exp(-(v - 0.84) * 3.8)) * 0.16;
    }
    // Balanced studio midtone contrast
    v = (v - 0.5) * contrastFactor + 0.5;
    lut[i] = Math.max(0, Math.min(255, Math.round(v * 255)));
  }

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 8) continue;
    let r = lut[data[i]];
    let g = lut[data[i + 1]];
    let b = lut[data[i + 2]];

    // Gentle studio warmth + vibrance preserving natural skin tone
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    r = gray + (r - gray) * satBoost * warmthBoost;
    g = gray + (g - gray) * satBoost;
    b = gray + (b - gray) * satBoost * 0.985;

    data[i] = Math.max(0, Math.min(255, Math.round(r)));
    data[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
    data[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
  }

  // Crisp studio micro-sharpening strictly on opaque interior pixels (eyes, hair, collar)
  const copy = new Uint8ClampedArray(data);
  const sharpAmount = 0.26;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = (y * w + x) * 4;
      if (copy[idx + 3] < 235) continue;
      // Only sharpen when 4-neighbors are also inside foreground (avoids sharpening cutout edge)
      const up = idx - w * 4;
      const dn = idx + w * 4;
      const lt = idx - 4;
      const rt = idx + 4;
      if (
        copy[up + 3] < 220 ||
        copy[dn + 3] < 220 ||
        copy[lt + 3] < 220 ||
        copy[rt + 3] < 220
      ) {
        continue;
      }
      for (let c = 0; c < 3; c++) {
        const blur = (copy[up + c] + copy[dn + c] + copy[lt + c] + copy[rt + c]) * 0.25;
        const val = copy[idx + c] + (copy[idx + c] - blur) * sharpAmount;
        data[idx + c] = Math.max(0, Math.min(255, Math.round(val)));
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

/**
 * Frames a single segmented portrait into exact 35×45 Bangladesh Passport proportions
 * (clean headroom above hair crown, centered face, upper chest flush with bottom edge).
 */
function frameSinglePassportCutout(
  cutoutCanvas: HTMLCanvasElement,
  metrics: PortraitMetrics
): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = SINGLE_OUT_W;
  out.height = SINGLE_OUT_H;
  const ctx = out.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Standard BD passport proportion: head+hair occupies ~47% of height, crown starts at ~10% from top
  const targetHeadHeight = SINGLE_OUT_H * 0.47;
  const targetCrownY = SINGLE_OUT_H * 0.105;

  let scale = targetHeadHeight / Math.max(1, metrics.headHeight);

  // Ensure the portrait's bottom reaches the bottom of the passport frame (no floating cut torso!)
  const availableBelowCrown = Math.max(1, metrics.bottomY - metrics.topY);
  const minScaleForBottom = (SINGLE_OUT_H - targetCrownY) / availableBelowCrown;
  if (scale < minScaleForBottom) {
    // Allow slightly larger scale so torso touches bottom cleanly, while keeping reasonable zoom
    scale = Math.min(minScaleForBottom, scale * 1.42);
  }

  // Keep shoulders/head comfortably framed (don't zoom in too extreme)
  const maxScale = (SINGLE_OUT_W * 1.48) / Math.max(1, metrics.headHeight * 1.15);
  scale = Math.min(scale, maxScale);

  const drawW = cutoutCanvas.width * scale;
  const drawH = cutoutCanvas.height * scale;

  // Horizontally center on face center X
  const drawX = SINGLE_OUT_W * 0.5 - metrics.headCenterX * scale;
  // Vertically position crown at targetCrownY, nudged down if bottom wouldn't reach bottom edge
  let drawY = targetCrownY - metrics.topY * scale;
  const scaledBottomY = drawY + metrics.bottomY * scale;
  if (scaledBottomY < SINGLE_OUT_H - 2) {
    const gap = SINGLE_OUT_H - scaledBottomY;
    // Shift down gently without pushing crown past 24% from top
    const maxShift = SINGLE_OUT_H * 0.24 - (drawY + metrics.topY * scale);
    drawY += Math.min(gap, Math.max(0, maxShift));
  }

  ctx.drawImage(cutoutCanvas, drawX, drawY, drawW, drawH);
  return out;
}

/**
 * Combines segmented Boy (Left) + Girl (Right) cutouts into one unified 50:40 Couple Passport cutout
 * with matched head sizes, aligned studio eye level, and natural side-by-side spacing.
 */
function frameCouplePassportCutout(
  boyCanvas: HTMLCanvasElement,
  boyMetrics: PortraitMetrics,
  girlCanvas: HTMLCanvasElement,
  girlMetrics: PortraitMetrics
): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = COUPLE_OUT_W;
  out.height = COUPLE_OUT_H;
  const ctx = out.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Classic Bangladesh Couple Passport proportions on 50:40 landscape frame:
  // Boy on Left (~29% X, crown ~12% Y, head ~44% H)
  // Girl on Right (~71% X, crown ~14% Y, head ~42% H — natural couple studio posture)
  const placeSubject = (
    canvas: HTMLCanvasElement,
    m: PortraitMetrics,
    targetCenterX: number,
    targetCrownY: number,
    targetHeadH: number
  ) => {
    let scale = targetHeadH / Math.max(1, m.headHeight);
    const availableBelowCrown = Math.max(1, m.bottomY - m.topY);
    const minScaleForBottom = (COUPLE_OUT_H - targetCrownY) / availableBelowCrown;
    if (scale < minScaleForBottom) {
      scale = Math.min(minScaleForBottom, scale * 1.38);
    }

    const drawW = canvas.width * scale;
    const drawH = canvas.height * scale;
    const drawX = targetCenterX - m.headCenterX * scale;
    let drawY = targetCrownY - m.topY * scale;

    const scaledBottom = drawY + m.bottomY * scale;
    if (scaledBottom < COUPLE_OUT_H - 2) {
      const gap = COUPLE_OUT_H - scaledBottom;
      const maxShift = COUPLE_OUT_H * 0.26 - (drawY + m.topY * scale);
      drawY += Math.min(gap, Math.max(0, maxShift));
    }

    ctx.drawImage(canvas, drawX, drawY, drawW, drawH);
  };

  // Draw Boy on Left, then Girl on Right
  placeSubject(
    boyCanvas,
    boyMetrics,
    COUPLE_OUT_W * 0.295,
    COUPLE_OUT_H * 0.115,
    COUPLE_OUT_H * 0.445
  );
  placeSubject(
    girlCanvas,
    girlMetrics,
    COUPLE_OUT_W * 0.705,
    COUPLE_OUT_H * 0.135,
    COUPLE_OUT_H * 0.425
  );

  return out;
}

/**
 * Paints authentic studio backdrop (Classic BD Sky-Blue default, Soft Sky-Blue, or Pure White).
 */
function paintStudioBackdrop(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  bgPreset: StudioBackdropPreset
): void {
  if (bgPreset === 'white') {
    const grad = ctx.createRadialGradient(w * 0.5, h * 0.36, w * 0.08, w * 0.5, h * 0.48, Math.max(w, h) * 0.85);
    grad.addColorStop(0, '#FFFFFF');
    grad.addColorStop(1, '#F7F9FC');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    return;
  }

  if (bgPreset === 'soft-blue') {
    const grad = ctx.createRadialGradient(w * 0.5, h * 0.36, w * 0.08, w * 0.5, h * 0.48, Math.max(w, h) * 0.88);
    grad.addColorStop(0, '#72C5FF');
    grad.addColorStop(0.65, '#4EB0F7');
    grad.addColorStop(1, '#399AE8');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    return;
  }

  // Default: Classic Bangladesh Passport Studio Sky-Blue
  const grad = ctx.createRadialGradient(w * 0.5, h * 0.36, w * 0.08, w * 0.5, h * 0.48, Math.max(w, h) * 0.9);
  grad.addColorStop(0, '#2DA2FF');
  grad.addColorStop(0.6, '#1B8CF2');
  grad.addColorStop(1, '#1176DC');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

/**
 * Instantly composites any cached transparent cutout Data URL onto a chosen studio backdrop.
 * Takes <40ms — zero AI re-processing needed when toggling Blue / Soft Blue / White!
 */
export async function compositeCutoutWithBackdrop(
  cutoutDataUrl: string,
  bgPreset: StudioBackdropPreset
): Promise<string> {
  const img = await loadImage(cutoutDataUrl);
  const w = img.naturalWidth || SINGLE_OUT_W;
  const h = img.naturalHeight || SINGLE_OUT_H;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  paintStudioBackdrop(ctx, w, h, bgPreset);
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', 0.95);
}

/**
 * 100% Free On-Device AI Single Passport Studio Pipeline.
 */
export async function generateFreeAiSinglePassport(
  file: File,
  bgPreset: StudioBackdropPreset = 'classic-blue',
  onProgress?: (update: AiProgressUpdate) => void
): Promise<FreeAiPassportResult> {
  onProgress?.({
    percent: 8,
    labelBn: 'ছবি প্রস্তুত হচ্ছে...',
    labelEn: 'Preparing photo...',
  });

  const workingCanvas = await fileToWorkingCanvas(file, 1280);
  const nativeFacePromise = detectFaceNative(workingCanvas);

  onProgress?.({
    percent: 18,
    labelBn: 'ফ্রি AI ব্যাকগ্রাউন্ড রিমুভ হচ্ছে...',
    labelEn: 'Running free on-device AI segmentation...',
  });

  const cutoutCanvas = await runNeuralPortraitCutout(workingCanvas, (frac, isDownloading) => {
    if (isDownloading) {
      onProgress?.({
        percent: Math.round(18 + frac * 34),
        labelBn: 'ফ্রি AI মডেল লোড হচ্ছে (প্রথমবার)...',
        labelEn: 'Loading free AI model (first time)...',
      });
    } else {
      onProgress?.({
        percent: Math.round(52 + frac * 24),
        labelBn: 'চুল ও ব্যাকগ্রাউন্ড নিখুঁতভাবে আলাদা হচ্ছে...',
        labelEn: 'Removing background cleanly...',
      });
    }
  });

  onProgress?.({
    percent: 80,
    labelBn: 'স্টুডিও লাইটিং ও পাসপোর্ট ফ্রেমিং হচ্ছে...',
    labelEn: 'Applying studio lighting & passport framing...',
  });

  refineCutoutAlphaAndDecontaminate(cutoutCanvas);
  const nativeFace = await nativeFacePromise;
  const metrics = analyzePortraitMetrics(cutoutCanvas, nativeFace);
  applyStudioForegroundLighting(cutoutCanvas, metrics.faceLuminance);

  const framedCutout = frameSinglePassportCutout(cutoutCanvas, metrics);
  const cutoutDataUrl = framedCutout.toDataURL('image/png');

  onProgress?.({
    percent: 94,
    labelBn: 'নীল স্টুডিও ব্যাকগ্রাউন্ড যুক্ত হচ্ছে...',
    labelEn: 'Compositing sky-blue studio backdrop...',
  });

  const studioCanvas = document.createElement('canvas');
  studioCanvas.width = SINGLE_OUT_W;
  studioCanvas.height = SINGLE_OUT_H;
  const sCtx = studioCanvas.getContext('2d')!;
  paintStudioBackdrop(sCtx, SINGLE_OUT_W, SINGLE_OUT_H, bgPreset);
  sCtx.drawImage(framedCutout, 0, 0);

  const studioDataUrl = studioCanvas.toDataURL('image/jpeg', 0.95);

  onProgress?.({
    percent: 100,
    labelBn: 'সম্পন্ন হয়েছে!',
    labelEn: 'Studio portrait ready!',
  });

  return {
    studioDataUrl,
    cutoutDataUrl,
    bgPreset,
  };
}

/**
 * 100% Free On-Device AI Couple Passport Studio Pipeline (Boy Left + Girl Right).
 */
export async function generateFreeAiCouplePassport(
  boyFile: File,
  girlFile: File,
  bgPreset: StudioBackdropPreset = 'classic-blue',
  onProgress?: (update: AiProgressUpdate) => void
): Promise<FreeAiPassportResult> {
  onProgress?.({
    percent: 6,
    labelBn: 'ছেলের ছবি (বামে) প্রস্তুত হচ্ছে...',
    labelEn: 'Preparing Boy photo (Left)...',
  });

  const boyWorking = await fileToWorkingCanvas(boyFile, 1152);
  const boyFacePromise = detectFaceNative(boyWorking);

  const boyCutout = await runNeuralPortraitCutout(boyWorking, (frac, isDownloading) => {
    onProgress?.({
      percent: Math.round(10 + frac * 35),
      labelBn: isDownloading
        ? 'ফ্রি AI মডেল লোড হচ্ছে (প্রথমবার)...'
        : 'ছেলের ছবির ব্যাকগ্রাউন্ড রিমুভ হচ্ছে...',
      labelEn: isDownloading
        ? 'Loading free AI model (first time)...'
        : 'Removing background from Boy photo...',
    });
  });

  refineCutoutAlphaAndDecontaminate(boyCutout);
  const boyMetrics = analyzePortraitMetrics(boyCutout, await boyFacePromise);
  applyStudioForegroundLighting(boyCutout, boyMetrics.faceLuminance);

  onProgress?.({
    percent: 48,
    labelBn: 'মেয়ের ছবি (ডানে) প্রসেস হচ্ছে...',
    labelEn: 'Processing Girl photo (Right)...',
  });

  const girlWorking = await fileToWorkingCanvas(girlFile, 1152);
  const girlFacePromise = detectFaceNative(girlWorking);

  const girlCutout = await runNeuralPortraitCutout(girlWorking, (frac) => {
    onProgress?.({
      percent: Math.round(50 + frac * 32),
      labelBn: 'মেয়ের ছবির ব্যাকগ্রাউন্ড রিমুভ হচ্ছে...',
      labelEn: 'Removing background from Girl photo...',
    });
  });

  refineCutoutAlphaAndDecontaminate(girlCutout);
  const girlMetrics = analyzePortraitMetrics(girlCutout, await girlFacePromise);
  applyStudioForegroundLighting(girlCutout, girlMetrics.faceLuminance);

  onProgress?.({
    percent: 86,
    labelBn: 'ছেলে (বামে) ও মেয়ে (ডানে) কাপল ফ্রেমে সাজানো হচ্ছে...',
    labelEn: 'Aligning Boy (Left) + Girl (Right) couple portrait...',
  });

  const framedCoupleCutout = frameCouplePassportCutout(
    boyCutout,
    boyMetrics,
    girlCutout,
    girlMetrics
  );
  const cutoutDataUrl = framedCoupleCutout.toDataURL('image/png');

  const studioCanvas = document.createElement('canvas');
  studioCanvas.width = COUPLE_OUT_W;
  studioCanvas.height = COUPLE_OUT_H;
  const sCtx = studioCanvas.getContext('2d')!;
  paintStudioBackdrop(sCtx, COUPLE_OUT_W, COUPLE_OUT_H, bgPreset);
  sCtx.drawImage(framedCoupleCutout, 0, 0);

  const studioDataUrl = studioCanvas.toDataURL('image/jpeg', 0.95);

  onProgress?.({
    percent: 100,
    labelBn: 'কাপল পাসপোর্ট ছবি সম্পন্ন হয়েছে!',
    labelEn: 'Couple studio portrait ready!',
  });

  return {
    studioDataUrl,
    cutoutDataUrl,
    bgPreset,
  };
}
