/**
 * 100% OFFLINE SMART PASSPORT PHOTO AUTO-STUDIO ENGINE
 * ----------------------------------------------------
 * Pure client-side HTML5 Canvas Computer Vision pipeline (zero server calls, zero CDN downloads):
 * 1. Multi-Cue Portrait Geometry Detection (FaceDetector + YCbCr/HSV Skin Cluster + Eye-Line Roll + Hair Crown)
 * 2. Automatic Head Straightening & Official Bangladesh / ICAO Passport Framing (35x45 mm)
 * 3. Geodesic Edge-Aware Border-Connected Segmentation with Foreground Torso/Clothing Protection
 * 4. Fast O(N) Guided Filter Alpha Matting + Hair/Beard Despill Decontamination
 * 5. Foreground-Only Studio Softbox Relighting (Auto White Balance + Shadow Recovery + Natural Clarity)
 * 6. Studio Royal Blue (#1574F5 default), Pure White (#FFFFFF), Sky Blue, Classic Blue, or Custom Backdrop
 */

export type PassportBgMode =
  | 'studio-blue'
  | 'white'
  | 'classic-blue'
  | 'sky-blue'
  | 'off-white'
  | 'original'
  | 'custom';

export interface PassportStudioOptions {
  bgMode: PassportBgMode;
  customBgColor: string;
  studioBackdropGlow: boolean;
  /** Total rotation in degrees (can include auto tilt + user fine tilt) */
  rotation: number;
  /** Coarse 90-degree increments (0, 90, 180, 270) */
  baseRotation: number;
  /** Scale multiplier relative to cover-fit (>= 0.65) */
  zoom: number;
  /** Normalized pan offset (-0.8 to +0.8 of output width/height) */
  panX: number;
  panY: number;
  flipH: boolean;
  /** Auto studio softbox lighting & white balance on subject */
  autoStudioLight: boolean;
  /** Manual foreground face brightness (-45 to +65) */
  brightness: number;
  /** Manual foreground contrast (-35 to +45) */
  contrast: number;
  /** Manual skin warmth (-30 to +30) */
  warmth: number;
  /** Portrait clarity / micro-sharpening (0 to 100) */
  sharpness: number;
  /** Background removal threshold sensitivity (15 to 85) */
  bgSensitivity: number;
  /** Hair & edge refinement / flyaway cleanup (0 to 100) */
  hairEdgeClean: number;
  /** Output width / height aspect ratio (default 35/45 = Bangladesh Passport) */
  aspectRatio: number;
}

export interface MaskBrushStroke {
  mode: 'keep' | 'erase';
  /** Normalized radius relative to canvas width (e.g., 0.04) */
  radius: number;
  points: { x: number; y: number }[]; // normalized 0..1 coordinates in output frame
}

export interface PortraitAutoAnalysis {
  detectedFace: boolean;
  autoRotation: number; // fine straightening angle in degrees
  autoZoom: number;
  autoPanX: number;
  autoPanY: number;
  autoBrightness: number; // recommended face brightness boost
  faceLuminance: number; // measured 0..255
  /** Normalized face center inside raw image (0..1) */
  faceCenterNorm: { x: number; y: number };
  /** Normalized face height inside raw image (0..1) */
  faceHeightNorm: number;
}

export const STUDIO_BG_PRESETS: {
  id: PassportBgMode;
  hex: string;
  glowHex?: string;
  labelEn: string;
  labelBn: string;
  swatchClass: string;
}[] = [
  {
    id: 'studio-blue',
    hex: '#1273F2',
    glowHex: '#3392FF',
    labelEn: 'Studio Blue',
    labelBn: 'স্টুডিও নীল',
    swatchClass: 'bg-[#1273F2]',
  },
  {
    id: 'white',
    hex: '#FFFFFF',
    labelEn: 'Pure White',
    labelBn: 'সাদা (White)',
    swatchClass: 'bg-white border-slate-300',
  },
  {
    id: 'classic-blue',
    hex: '#1D4ED8',
    glowHex: '#3B82F6',
    labelEn: 'Deep Blue',
    labelBn: 'গাঢ় নীল',
    swatchClass: 'bg-[#1D4ED8]',
  },
  {
    id: 'sky-blue',
    hex: '#38A3F1',
    glowHex: '#6CC1FF',
    labelEn: 'Sky Blue',
    labelBn: 'আকাশি নীল',
    swatchClass: 'bg-[#38A3F1]',
  },
  {
    id: 'off-white',
    hex: '#F4F7FA',
    labelEn: 'Off-White',
    labelBn: 'অফ-হোয়াইট',
    swatchClass: 'bg-[#F4F7FA] border-slate-300',
  },
  {
    id: 'original',
    hex: 'transparent',
    labelEn: 'Original',
    labelBn: 'আসল ব্যাকগ্রাউন্ড',
    swatchClass: 'bg-gradient-to-br from-slate-200 to-slate-400',
  },
];

export const DEFAULT_PASSPORT_STUDIO_OPTIONS: PassportStudioOptions = {
  bgMode: 'studio-blue',
  customBgColor: '#1273F2',
  studioBackdropGlow: true,
  rotation: 0,
  baseRotation: 0,
  zoom: 1,
  panX: 0,
  panY: 0,
  flipH: false,
  autoStudioLight: true,
  brightness: 12,
  contrast: 8,
  warmth: 4,
  sharpness: 28,
  bgSensitivity: 50,
  hairEdgeClean: 58,
  aspectRatio: 35 / 45,
};

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = (hex || '#1273F2').replace('#', '').trim();
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) {
      return [r, g, b];
    }
  }
  return [18, 115, 242];
}

export function loadStudioImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

/**
 * Perceptual color check for human skin (robust across South Asian, light, medium & deep tones)
 */
function isSkinPixel(r: number, g: number, b: number): boolean {
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  const maxC = Math.max(r, g, b);
  const minC = Math.min(r, g, b);
  const sat = maxC > 0 ? (maxC - minC) / maxC : 0;

  return (
    y > 42 &&
    y < 244 &&
    cb >= 76 &&
    cb <= 128 &&
    cr >= 132 &&
    cr <= 178 &&
    r > g - 4 &&
    r > b + 10 &&
    sat >= 0.12 &&
    sat <= 0.78
  );
}

/**
 * Weighted perceptual RGB distance (approximates CIELAB Euclidean distance very fast)
 */
function colorDist(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number
): number {
  const rMean = (r1 + r2) * 0.5;
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  const wr = 2 + rMean / 256;
  const wg = 4;
  const wb = 2 + (255 - rMean) / 256;
  return Math.sqrt(wr * dr * dr + wg * dg * dg + wb * db * db) * 0.35;
}

// ============================================================================
// STAGE 1: PORTRAIT FACE, EYE-LINE ROLL, HAIR CROWN & STUDIO LIGHTING ANALYSIS
// ============================================================================

export async function analyzePortraitForPassport(
  img: HTMLImageElement,
  aspectRatio: number = 35 / 45
): Promise<PortraitAutoAnalysis> {
  const origW = img.naturalWidth || img.width || 1000;
  const origH = img.naturalHeight || img.height || 1000;

  // Work on a compact analysis canvas (~340px max dim)
  const maxDim = 340;
  const scale = Math.min(1, maxDim / Math.max(origW, origH));
  const w = Math.max(40, Math.round(origW * scale));
  const h = Math.max(40, Math.round(origH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  const fallback: PortraitAutoAnalysis = {
    detectedFace: false,
    autoRotation: 0,
    autoZoom: 1,
    autoPanX: 0,
    autoPanY: 0,
    autoBrightness: 12,
    faceLuminance: 145,
    faceCenterNorm: { x: 0.5, y: 0.38 },
    faceHeightNorm: 0.34,
  };

  if (!ctx) return fallback;
  ctx.drawImage(img, 0, 0, w, h);
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // 1A. Try hardware-accelerated native FaceDetector if available
  let faceBox: { x: number; y: number; w: number; h: number } | null = null;
  let eyeAngleDeg: number | null = null;

  if (typeof window !== 'undefined' && 'FaceDetector' in window) {
    try {
      // @ts-expect-error Native browser FaceDetector API
      const detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
      const faces = await detector.detect(canvas);
      if (faces && faces.length > 0) {
        const f = faces[0].boundingBox;
        faceBox = { x: f.x, y: f.y, w: f.width, h: f.height };

        if (Array.isArray(faces[0].landmarks)) {
          const eyes = faces[0].landmarks.filter(
            (l: { type?: string; locations?: { x: number; y: number }[] }) =>
              l.type === 'eye' && l.locations && l.locations.length > 0
          );
          if (eyes.length >= 2) {
            const sortedEyes = [...eyes].sort(
              (a, b) => a.locations[0].x - b.locations[0].x
            );
            const left = sortedEyes[0].locations[0];
            const right = sortedEyes[sortedEyes.length - 1].locations[0];
            const dx = right.x - left.x;
            const dy = right.y - left.y;
            if (dx > f.width * 0.15) {
              const deg = (Math.atan2(dy, dx) * 180) / Math.PI;
              if (Math.abs(deg) <= 24) {
                eyeAngleDeg = -Math.round(deg * 10) / 10;
              }
            }
          }
        }
      }
    } catch {
      // Fall through cleanly to offline CV detector
    }
  }

  // 1B. Offline Connected-Component Skin Cluster Detector (upper 82% portrait zone)
  const skinMask = new Uint8Array(w * h);
  for (let y = 0; y < Math.floor(h * 0.85); y++) {
    for (let x = Math.floor(w * 0.08); x < Math.ceil(w * 0.92); x++) {
      const i = y * w + x;
      const idx = i * 4;
      if (isSkinPixel(data[idx], data[idx + 1], data[idx + 2])) {
        skinMask[i] = 1;
      }
    }
  }

  // Find largest skin connected component biased toward upper-center face position
  const visited = new Uint8Array(w * h);
  let bestClusterScore = 0;
  let bestCluster: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    sumX: number;
    sumY: number;
    count: number;
    sumLum: number;
  } | null = null;

  const queue = new Int32Array(w * h);

  for (let y = 4; y < Math.floor(h * 0.78); y += 2) {
    for (let x = Math.floor(w * 0.12); x < Math.ceil(w * 0.88); x += 2) {
      const start = y * w + x;
      if (!skinMask[start] || visited[start]) continue;

      let head = 0;
      let tail = 0;
      queue[tail++] = start;
      visited[start] = 1;

      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      let sumX = 0;
      let sumY = 0;
      let count = 0;
      let sumLum = 0;

      while (head < tail) {
        const curr = queue[head++];
        const cx = curr % w;
        const cy = (curr - cx) / w;
        const idx = curr * 4;
        const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];

        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;
        sumX += cx;
        sumY += cy;
        sumLum += lum;
        count++;

        // 4-neighbors
        if (cx > 0 && skinMask[curr - 1] && !visited[curr - 1]) {
          visited[curr - 1] = 1;
          queue[tail++] = curr - 1;
        }
        if (cx + 1 < w && skinMask[curr + 1] && !visited[curr + 1]) {
          visited[curr + 1] = 1;
          queue[tail++] = curr + 1;
        }
        if (cy > 0 && skinMask[curr - w] && !visited[curr - w]) {
          visited[curr - w] = 1;
          queue[tail++] = curr - w;
        }
        if (cy + 1 < h && skinMask[curr + w] && !visited[curr + w]) {
          visited[curr + w] = 1;
          queue[tail++] = curr + w;
        }
      }

      if (count < 45) continue;
      const bw = maxX - minX + 1;
      const bh = maxY - minY + 1;
      const aspect = bw / Math.max(1, bh);
      // Faces are roughly oval (aspect 0.45..1.5)
      if (aspect < 0.35 || aspect > 1.85) continue;

      const meanX = sumX / count;
      const meanY = sumY / count;
      const centerBias = 1 - Math.abs(meanX / w - 0.5) * 1.1;
      const verticalBias = meanY / h < 0.65 ? 1.15 : 0.6;
      const score = count * Math.max(0.25, centerBias) * verticalBias;

      if (score > bestClusterScore) {
        bestClusterScore = score;
        bestCluster = { minX, maxX, minY, maxY, sumX, sumY, count, sumLum };
      }
    }
  }

  let faceLum = 148;
  if (bestCluster) {
    faceLum = bestCluster.sumLum / Math.max(1, bestCluster.count);
  }

  if (!faceBox && bestCluster) {
    const bw = bestCluster.maxX - bestCluster.minX + 1;
    const bh = bestCluster.maxY - bestCluster.minY + 1;
    // Clamp skin height if neck merged with face (face height ~1.25x face width)
    const clampedH = Math.min(bh, bw * 1.48);
    faceBox = {
      x: bestCluster.minX,
      y: bestCluster.minY,
      w: bw,
      h: clampedH,
    };
  }

  if (!faceBox) {
    return fallback;
  }

  // 1C. Measure true face luminance inside faceBox if FaceDetector was used
  {
    let lSum = 0;
    let lCnt = 0;
    const fx0 = clamp(Math.floor(faceBox.x + faceBox.w * 0.2), 0, w - 1);
    const fx1 = clamp(Math.ceil(faceBox.x + faceBox.w * 0.8), 0, w - 1);
    const fy0 = clamp(Math.floor(faceBox.y + faceBox.h * 0.15), 0, h - 1);
    const fy1 = clamp(Math.ceil(faceBox.y + faceBox.h * 0.72), 0, h - 1);
    for (let y = fy0; y <= fy1; y++) {
      for (let x = fx0; x <= fx1; x++) {
        const idx = (y * w + x) * 4;
        if (isSkinPixel(data[idx], data[idx + 1], data[idx + 2])) {
          lSum += 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
          lCnt++;
        }
      }
    }
    if (lCnt > 20) faceLum = lSum / lCnt;
  }

  // 1D. Detect Head Crown (scan upward from forehead to top of hair)
  // Sample background color near top-left & top-right corners
  const bgSamples: [number, number, number][] = [];
  for (let y = 2; y < Math.max(6, Math.floor(h * 0.06)); y += 2) {
    for (const x of [4, Math.floor(w * 0.08), Math.floor(w * 0.92), w - 5]) {
      const cx = clamp(x, 0, w - 1);
      const idx = (y * w + cx) * 4;
      bgSamples.push([data[idx], data[idx + 1], data[idx + 2]]);
    }
  }
  const avgBg: [number, number, number] = bgSamples.reduce<[number, number, number]>(
    (acc, c) => [acc[0] + c[0] / bgSamples.length, acc[1] + c[1] / bgSamples.length, acc[2] + c[2] / bgSamples.length],
    [220, 220, 220]
  );

  const fCenterX = faceBox.x + faceBox.w * 0.5;
  let hairTopY = Math.max(0, faceBox.y - faceBox.h * 0.22);
  const scanStartY = Math.max(0, Math.floor(faceBox.y));
  const scanLimitY = Math.max(0, Math.floor(faceBox.y - faceBox.h * 0.58));
  let consecutiveBg = 0;

  for (let y = scanStartY; y >= scanLimitY; y--) {
    let fgVotes = 0;
    const xStart = clamp(Math.floor(fCenterX - faceBox.w * 0.22), 0, w - 1);
    const xEnd = clamp(Math.ceil(fCenterX + faceBox.w * 0.22), 0, w - 1);
    let totalSamples = 0;
    for (let x = xStart; x <= xEnd; x += 2) {
      const idx = (y * w + x) * 4;
      const dist = colorDist(data[idx], data[idx + 1], data[idx + 2], avgBg[0], avgBg[1], avgBg[2]);
      if (dist > 22) fgVotes++;
      totalSamples++;
    }
    if (totalSamples > 0 && fgVotes / totalSamples >= 0.35) {
      hairTopY = y;
      consecutiveBg = 0;
    } else {
      consecutiveBg++;
      if (consecutiveBg >= 4) break;
    }
  }

  // Also scan down below chin for beard if dark pixels exist right below faceBox
  let chinOrBeardBottomY = faceBox.y + faceBox.h;
  const beardScanEnd = Math.min(h - 1, Math.floor(faceBox.y + faceBox.h * 1.38));
  for (let y = Math.floor(faceBox.y + faceBox.h * 0.92); y <= beardScanEnd; y++) {
    let darkVotes = 0;
    let total = 0;
    const xStart = clamp(Math.floor(fCenterX - faceBox.w * 0.26), 0, w - 1);
    const xEnd = clamp(Math.ceil(fCenterX + faceBox.w * 0.26), 0, w - 1);
    for (let x = xStart; x <= xEnd; x += 2) {
      const idx = (y * w + x) * 4;
      const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      if (lum < 68) darkVotes++;
      total++;
    }
    if (total > 0 && darkVotes / total >= 0.38) {
      chinOrBeardBottomY = y;
    }
  }

  // 1E. Eye-Pair Valley Tilt Estimation (fallback when native FaceDetector lacked eye landmarks)
  let autoRotation = eyeAngleDeg ?? 0;
  if (eyeAngleDeg === null) {
    const eyeBandTop = clamp(Math.floor(faceBox.y + faceBox.h * 0.22), 0, h - 1);
    const eyeBandBot = clamp(Math.floor(faceBox.y + faceBox.h * 0.52), 0, h - 1);
    const midX = Math.floor(fCenterX);
    const leftX0 = clamp(Math.floor(faceBox.x + faceBox.w * 0.12), 0, w - 1);
    const leftX1 = clamp(Math.floor(midX - faceBox.w * 0.08), 0, w - 1);
    const rightX0 = clamp(Math.ceil(midX + faceBox.w * 0.08), 0, w - 1);
    const rightX1 = clamp(Math.ceil(faceBox.x + faceBox.w * 0.88), 0, w - 1);

    const findDarkEyeCenter = (x0: number, x1: number) => {
      let bestScore = Infinity;
      let bx = (x0 + x1) * 0.5;
      let by = (eyeBandTop + eyeBandBot) * 0.5;
      for (let y = eyeBandTop + 1; y < eyeBandBot - 1; y++) {
        for (let x = x0 + 1; x < x1 - 1; x++) {
          // 3x3 average luminance around candidate eye center
          let lum = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const idx = ((y + dy) * w + (x + dx)) * 4;
              lum += 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
            }
          }
          lum /= 9;
          if (lum < bestScore) {
            bestScore = lum;
            bx = x;
            by = y;
          }
        }
      }
      return { x: bx, y: by, lum: bestScore };
    };

    if (leftX1 > leftX0 + 3 && rightX1 > rightX0 + 3 && eyeBandBot > eyeBandTop + 4) {
      const lEye = findDarkEyeCenter(leftX0, leftX1);
      const rEye = findDarkEyeCenter(rightX0, rightX1);
      const dx = rEye.x - lEye.x;
      const dy = rEye.y - lEye.y;
      // Validate eyes are meaningfully darker than skin and reasonably symmetric
      if (
        dx > faceBox.w * 0.24 &&
        lEye.lum < faceLum * 0.82 &&
        rEye.lum < faceLum * 0.82 &&
        Math.abs(lEye.lum - rEye.lum) < 42
      ) {
        const deg = (Math.atan2(dy, dx) * 180) / Math.PI;
        if (Math.abs(deg) >= 1.2 && Math.abs(deg) <= 18) {
          autoRotation = -Math.round(deg * 10) / 10;
        }
      }
    }
  }

  // 1F. Compute ideal Bangladesh / ICAO Passport Auto-Zoom & Auto-Pan
  // Head (hair crown to chin) should occupy ~58–64% of the 35x45mm frame height,
  // with ~10–12% clean studio margin above the top of the hair, and face centered horizontally!
  const fullHeadH = Math.max(faceBox.h * 1.18, chinOrBeardBottomY - hairTopY);
  const fullHeadCenterY = hairTopY + fullHeadH * 0.48;
  const targetHeadRatio = 0.58; // Ideal Bangladesh Passport portrait framing (head + generous clean shoulders)

  // At zoom=1 in cover-fit mode, determine what source region covers the output frame
  const srcAspect = origW / origH;
  const coverVisibleH = srcAspect > aspectRatio ? h : w / aspectRatio;
  const desiredVisibleH = fullHeadH / targetHeadRatio;

  // Zoom > 1 zooms IN (smaller visible region), zoom < 1 zooms OUT
  let autoZoom = coverVisibleH / Math.max(20, desiredVisibleH);
  autoZoom = clamp(Math.round(autoZoom * 100) / 100, 0.88, 1.85);

  // Desired head center Y in output frame: ~43% from top (leaving ~12% above crown + nice shoulders below)
  const targetCenterYOut = 0.43;
  const visibleHAtZoom = coverVisibleH / autoZoom;
  const visibleWAtZoom = visibleHAtZoom * aspectRatio;

  // panX/panY shift the drawn image in normalized output coordinates:
  // If face is to the right of image center, shift image LEFT (negative panX)
  const rawShiftX = (w * 0.5 - fCenterX) / Math.max(1, visibleWAtZoom);
  const rawShiftY =
    (h * 0.5 - fullHeadCenterY) / Math.max(1, visibleHAtZoom) - (0.5 - targetCenterYOut);

  const autoPanX = clamp(Math.round(rawShiftX * 1000) / 1000, -0.42, 0.42);
  const autoPanY = clamp(Math.round(rawShiftY * 1000) / 1000, -0.42, 0.42);

  // 1G. Auto-calibrate Studio Face Brightness (gentle lift for dim indoor faces, safe for bright ones)
  let autoBrightness = 10;
  if (faceLum < 100) autoBrightness = 26;
  else if (faceLum < 125) autoBrightness = 20;
  else if (faceLum < 148) autoBrightness = 14;
  else if (faceLum < 170) autoBrightness = 8;
  else autoBrightness = 3;

  return {
    detectedFace: true,
    autoRotation,
    autoZoom,
    autoPanX,
    autoPanY,
    autoBrightness,
    faceLuminance: Math.round(faceLum),
    faceCenterNorm: { x: fCenterX / w, y: fullHeadCenterY / h },
    faceHeightNorm: fullHeadH / h,
  };
}

// ============================================================================
// STAGE 2: FAST O(N) INTEGRAL-IMAGE BOX FILTER & GUIDED FILTER ALPHA MATTING
// ============================================================================

function boxFilterFloat(
  src: Float32Array,
  w: number,
  h: number,
  radius: number
): Float32Array {
  const dst = new Float32Array(w * h);
  const temp = new Float32Array(w * h);
  const r = Math.max(1, Math.round(radius));

  // Horizontal pass
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let sum = 0;
    let count = 0;
    for (let x = 0; x <= Math.min(r, w - 1); x++) {
      sum += src[row + x];
      count++;
    }
    for (let x = 0; x < w; x++) {
      temp[row + x] = sum / count;
      const addIdx = x + r + 1;
      const remIdx = x - r;
      if (addIdx < w) {
        sum += src[row + addIdx];
        count++;
      }
      if (remIdx >= 0) {
        sum -= src[row + remIdx];
        count--;
      }
    }
  }

  // Vertical pass
  for (let x = 0; x < w; x++) {
    let sum = 0;
    let count = 0;
    for (let y = 0; y <= Math.min(r, h - 1); y++) {
      sum += temp[y * w + x];
      count++;
    }
    for (let y = 0; y < h; y++) {
      dst[y * w + x] = sum / count;
      const addY = y + r + 1;
      const remY = y - r;
      if (addY < h) {
        sum += temp[addY * w + x];
        count++;
      }
      if (remY >= 0) {
        sum -= temp[remY * w + x];
        count--;
      }
    }
  }

  return dst;
}

/**
 * Fast Grayscale Guided Filter (He et al.) — snaps soft alpha mask sharply onto real hair,
 * beard, ear, and shoulder edges in O(N) time without haloing!
 */
function guidedFilterAlpha(
  guideGray: Float32Array,
  alphaIn: Float32Array,
  w: number,
  h: number,
  radius: number,
  eps: number
): Float32Array {
  const n = w * h;
  const meanI = boxFilterFloat(guideGray, w, h, radius);
  const meanP = boxFilterFloat(alphaIn, w, h, radius);

  const II = new Float32Array(n);
  const IP = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    II[i] = guideGray[i] * guideGray[i];
    IP[i] = guideGray[i] * alphaIn[i];
  }

  const corrI = boxFilterFloat(II, w, h, radius);
  const corrIP = boxFilterFloat(IP, w, h, radius);

  const a = new Float32Array(n);
  const b = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const varI = Math.max(0, corrI[i] - meanI[i] * meanI[i]);
    const covIP = corrIP[i] - meanI[i] * meanP[i];
    a[i] = covIP / (varI + eps);
    b[i] = meanP[i] - a[i] * meanI[i];
  }

  const meanA = boxFilterFloat(a, w, h, radius);
  const meanB = boxFilterFloat(b, w, h, radius);

  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = clamp(meanA[i] * guideGray[i] + meanB[i], 0, 1);
  }
  return out;
}

/**
 * Computes a high-accuracy portrait alpha matte (0 = background, 1 = foreground person)
 * using:
 *  - Border Background K-Clusters (top + upper left/right)
 *  - Central Person Color Model (skin, dark hair/beard, chest clothing)
 *  - Multi-Pass Geodesic Edge-Aware Propagation strictly inward from top/upper borders
 *  - Guided Filter Edge Matting + Flyaway Cleanup
 */
function computePortraitAlphaMatte(
  srcData: Uint8ClampedArray,
  w: number,
  h: number,
  sensitivity: number,
  hairEdgeClean: number,
  strokes: MaskBrushStroke[]
): { alpha: Float32Array; bgAverage: [number, number, number] } {
  // Run geodesic segmentation at fast ~280px working height, then upsample & Guided-Filter at full res
  const workScale = Math.min(1, 260 / Math.max(w, h));
  const sw = Math.max(60, Math.round(w * workScale));
  const sh = Math.max(60, Math.round(h * workScale));

  // Downsample RGB cleanly using a small canvas
  const tmpFull = document.createElement('canvas');
  tmpFull.width = w;
  tmpFull.height = h;
  const fCtx = tmpFull.getContext('2d')!;
  fCtx.putImageData(new ImageData(new Uint8ClampedArray(srcData), w, h), 0, 0);

  const tmpSmall = document.createElement('canvas');
  tmpSmall.width = sw;
  tmpSmall.height = sh;
  const sCtx = tmpSmall.getContext('2d', { willReadFrequently: true })!;
  sCtx.drawImage(tmpFull, 0, 0, sw, sh);
  const sd = sCtx.getImageData(0, 0, sw, sh).data;

  // 1. Sample Background Seeds strictly from Top strip (0..7%) and Upper Side borders (0..62% height)
  // Never sample bottom corners because shoulders/shirt sit there!
  const bgSeeds: [number, number, number][] = [];
  const addClusterSeed = (
    list: [number, number, number][],
    r: number,
    g: number,
    b: number,
    minGap: number,
    maxCount: number
  ) => {
    for (let i = 0; i < list.length; i++) {
      if (colorDist(list[i][0], list[i][1], list[i][2], r, g, b) < minGap) return;
    }
    if (list.length < maxCount) list.push([r, g, b]);
  };

  let bgSumR = 0;
  let bgSumG = 0;
  let bgSumB = 0;
  let bgCnt = 0;

  const topBand = Math.max(3, Math.floor(sh * 0.065));
  for (let y = 0; y < topBand; y += 2) {
    for (let x = 0; x < sw; x += 3) {
      const idx = (y * sw + x) * 4;
      const r = sd[idx];
      const g = sd[idx + 1];
      const b = sd[idx + 2];
      bgSumR += r;
      bgSumG += g;
      bgSumB += b;
      bgCnt++;
      addClusterSeed(bgSeeds, r, g, b, 11, 24);
    }
  }

  const sideLimitY = Math.floor(sh * 0.62);
  const sideBand = Math.max(3, Math.floor(sw * 0.06));
  for (let y = topBand; y < sideLimitY; y += 3) {
    for (let x = 0; x < sideBand; x += 2) {
      const iL = (y * sw + x) * 4;
      const iR = (y * sw + (sw - 1 - x)) * 4;
      bgSumR += sd[iL] + sd[iR];
      bgSumG += sd[iL + 1] + sd[iR + 1];
      bgSumB += sd[iL + 2] + sd[iR + 2];
      bgCnt += 2;
      addClusterSeed(bgSeeds, sd[iL], sd[iL + 1], sd[iL + 2], 12, 34);
      addClusterSeed(bgSeeds, sd[iR], sd[iR + 1], sd[iR + 2], 12, 34);
    }
  }

  if (bgSeeds.length === 0) bgSeeds.push([235, 235, 235]);
  const bgAverage: [number, number, number] =
    bgCnt > 0
      ? [Math.round(bgSumR / bgCnt), Math.round(bgSumG / bgCnt), Math.round(bgSumB / bgCnt)]
      : bgSeeds[0];

  // 2. Sample Definite Foreground Seeds from Central Head + Torso/Chest Core
  // This teaches the model the exact color of the person's shirt/dress/hijab/hair/skin!
  const fgSeeds: [number, number, number][] = [];
  // Face/Head center ellipse (x: 36..64%, y: 24..56%)
  for (let y = Math.floor(sh * 0.24); y < Math.floor(sh * 0.56); y += 3) {
    for (let x = Math.floor(sw * 0.36); x < Math.floor(sw * 0.64); x += 3) {
      const idx = (y * sw + x) * 4;
      addClusterSeed(fgSeeds, sd[idx], sd[idx + 1], sd[idx + 2], 14, 18);
    }
  }
  // Chest & Shirt/Clothing core (x: 26..74%, y: 74..98%)
  const shirtSeeds: [number, number, number][] = [];
  for (let y = Math.floor(sh * 0.74); y < sh - 2; y += 3) {
    for (let x = Math.floor(sw * 0.26); x < Math.floor(sw * 0.74); x += 3) {
      const idx = (y * sw + x) * 4;
      addClusterSeed(shirtSeeds, sd[idx], sd[idx + 1], sd[idx + 2], 12, 22);
      addClusterSeed(fgSeeds, sd[idx], sd[idx + 1], sd[idx + 2], 14, 34);
    }
  }

  // 3. Precompute Edge Gradient Magnitude & Per-Pixel Background Affinity on small canvas
  const sn = sw * sh;
  const gradMag = new Float32Array(sn);
  const bgDistMap = new Float32Array(sn);
  const fgDistMap = new Float32Array(sn);
  const isProtectedCore = new Uint8Array(sn);

  for (let y = 0; y < sh; y++) {
    const ny = y / sh;
    for (let x = 0; x < sw; x++) {
      const nx = x / sw;
      const i = y * sw + x;
      const idx = i * 4;
      const r = sd[idx];
      const g = sd[idx + 1];
      const b = sd[idx + 2];

      // Nearest background seed distance
      let minBg = 999;
      for (let k = 0; k < bgSeeds.length; k++) {
        const d = colorDist(r, g, b, bgSeeds[k][0], bgSeeds[k][1], bgSeeds[k][2]);
        if (d < minBg) minBg = d;
      }
      bgDistMap[i] = minBg;

      // Nearest foreground seed distance
      let minFg = 999;
      const refList = ny > 0.65 && shirtSeeds.length > 0 ? shirtSeeds : fgSeeds;
      for (let k = 0; k < refList.length; k++) {
        const d = colorDist(r, g, b, refList[k][0], refList[k][1], refList[k][2]);
        if (d < minFg) minFg = d;
      }
      fgDistMap[i] = minFg;

      // Sobel-like color gradient magnitude (barrier across hair/shoulder boundary!)
      const xL = Math.max(0, x - 1);
      const xR = Math.min(sw - 1, x + 1);
      const yT = Math.max(0, y - 1);
      const yB = Math.min(sh - 1, y + 1);
      const iL = (y * sw + xL) * 4;
      const iR = (y * sw + xR) * 4;
      const iT = (yT * sw + x) * 4;
      const iB = (yB * sw + x) * 4;
      const gx = colorDist(sd[iL], sd[iL + 1], sd[iL + 2], sd[iR], sd[iR + 1], sd[iR + 2]);
      const gy = colorDist(sd[iT], sd[iT + 1], sd[iT + 2], sd[iB], sd[iB + 1], sd[iB + 2]);
      gradMag[i] = Math.sqrt(gx * gx + gy * gy);

      // Protect central head oval + lower torso trapezoid from accidental erosion
      const headDx = (nx - 0.5) / 0.21;
      const headDy = (ny - 0.41) / 0.23;
      const inHeadCore = headDx * headDx + headDy * headDy <= 1.0;

      // Torso widens smoothly from neck (y=0.64) to shoulders at bottom (y=1.0)
      const torsoHalfW = ny >= 0.64 ? 0.16 + ((ny - 0.64) / 0.36) * 0.27 : 0;
      const inTorsoCore = ny >= 0.64 && Math.abs(nx - 0.5) <= torsoHalfW;

      const skin = isSkinPixel(r, g, b) && nx > 0.22 && nx < 0.78 && ny > 0.14 && ny < 0.85;
      if (inHeadCore || inTorsoCore || skin) {
        isProtectedCore[i] = 1;
      }
    }
  }

  // 4. Geodesic Barrier Propagation from Top & Upper-Left / Upper-Right Outer Borders
  // Cost represents how hard it is to reach pixel `i` from the outer background wall.
  const INF = 1e9;
  const cost = new Float32Array(sn);
  cost.fill(INF);

  // Sensitivity scales threshold cleanly (sensitivity 50 -> balanced studio default)
  const sensScale = 0.52 + (sensitivity / 100) * 1.15; // ~0.7 to ~1.5
  const cutoff = 58 * sensScale;

  // Initialize top edge and upper-side borders as zero-cost background entry seeds
  for (let x = 0; x < sw; x++) {
    cost[x] = bgDistMap[x] * 0.25;
  }
  for (let y = 0; y < Math.floor(sh * 0.72); y++) {
    const lIdx = y * sw;
    const rIdx = y * sw + (sw - 1);
    if (bgDistMap[lIdx] < 38 * sensScale) cost[lIdx] = bgDistMap[lIdx] * 0.28;
    if (bgDistMap[rIdx] < 38 * sensScale) cost[rIdx] = bgDistMap[rIdx] * 0.28;
  }

  // Fast sweeping geodesic distance transform (4 forward/backward passes = exact & ultra-fast!)
  const stepCost = (to: number, from: number, diag: boolean): number => {
    const idxTo = to * 4;
    const idxFrom = from * 4;
    const localJump = colorDist(
      sd[idxTo],
      sd[idxTo + 1],
      sd[idxTo + 2],
      sd[idxFrom],
      sd[idxFrom + 1],
      sd[idxFrom + 2]
    );
    const bgPenalty = bgDistMap[to];
    // Strong barrier if pixel looks clearly like foreground (skin/hair/shirt) AND not like background
    const fgAffinity = fgDistMap[to] < bgPenalty * 0.78 ? (bgPenalty - fgDistMap[to]) * 1.45 : 0;
    const edgeBarrier = gradMag[to] > 14 ? (gradMag[to] - 14) * 1.35 : 0;
    const coreBarrier = isProtectedCore[to] ? 26 : 0;

    // Slight downward resistance near shoulder/bottom zone so wall doesn't flood into light shirts
    const ny = (to / sw) / sh;
    const lowerBias = ny > 0.68 ? (ny - 0.68) * 32 : 0;

    const raw =
      bgPenalty * 0.42 +
      localJump * 1.15 +
      edgeBarrier +
      fgAffinity +
      coreBarrier +
      lowerBias;
    return diag ? raw * 1.35 : raw;
  };

  for (let pass = 0; pass < 4; pass++) {
    // Forward sweep (top-left -> bottom-right)
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        const i = y * sw + x;
        let best = cost[i];
        if (x > 0) {
          const c = cost[i - 1] + stepCost(i, i - 1, false);
          if (c < best) best = c;
        }
        if (y > 0) {
          const c = cost[i - sw] + stepCost(i, i - sw, false);
          if (c < best) best = c;
        }
        if (x > 0 && y > 0) {
          const c = cost[i - sw - 1] + stepCost(i, i - sw - 1, true);
          if (c < best) best = c;
        }
        if (x + 1 < sw && y > 0) {
          const c = cost[i - sw + 1] + stepCost(i, i - sw + 1, true);
          if (c < best) best = c;
        }
        cost[i] = best;
      }
    }
    // Backward sweep (bottom-right -> top-left)
    for (let y = sh - 1; y >= 0; y--) {
      for (let x = sw - 1; x >= 0; x--) {
        const i = y * sw + x;
        let best = cost[i];
        if (x + 1 < sw) {
          const c = cost[i + 1] + stepCost(i, i + 1, false);
          if (c < best) best = c;
        }
        if (y + 1 < sh) {
          const c = cost[i + sw] + stepCost(i, i + sw, false);
          if (c < best) best = c;
        }
        if (x + 1 < sw && y + 1 < sh) {
          const c = cost[i + sw + 1] + stepCost(i, i + sw + 1, true);
          if (c < best) best = c;
        }
        if (x > 0 && y + 1 < sh) {
          const c = cost[i + sw - 1] + stepCost(i, i + sw - 1, true);
          if (c < best) best = c;
        }
        cost[i] = best;
      }
    }
  }

  // Convert geodesic cost to soft initial foreground alpha on small canvas (0 = bg, 1 = fg)
  const smallAlpha = new Float32Array(sn);
  const softBand = Math.max(12, cutoff * 0.34);
  for (let i = 0; i < sn; i++) {
    const c = cost[i];
    if (c <= cutoff - softBand * 0.5) {
      smallAlpha[i] = 0;
    } else if (c >= cutoff + softBand * 0.5) {
      smallAlpha[i] = 1;
    } else {
      const t = (c - (cutoff - softBand * 0.5)) / softBand;
      // Smoothstep transition
      smallAlpha[i] = t * t * (3 - 2 * t);
    }
  }

  // 5. Remove small isolated foreground specks floating in the background (flyaway noise cleanup)
  // Keep only foreground components connected to the main person body (largest component)
  const fgVisited = new Uint8Array(sn);
  const compIds = new Int32Array(sn);
  compIds.fill(-1);
  const compSizes: number[] = [];
  const bfsQ = new Int32Array(sn);
  let nextCompId = 0;

  for (let i = 0; i < sn; i++) {
    if (smallAlpha[i] < 0.45 || fgVisited[i]) continue;
    const cid = nextCompId++;
    let head = 0;
    let tail = 0;
    bfsQ[tail++] = i;
    fgVisited[i] = 1;
    compIds[i] = cid;
    let size = 0;

    while (head < tail) {
      const cur = bfsQ[head++];
      size++;
      const cx = cur % sw;
      const cy = (cur - cx) / sw;
      if (cx > 0 && smallAlpha[cur - 1] >= 0.45 && !fgVisited[cur - 1]) {
        fgVisited[cur - 1] = 1;
        compIds[cur - 1] = cid;
        bfsQ[tail++] = cur - 1;
      }
      if (cx + 1 < sw && smallAlpha[cur + 1] >= 0.45 && !fgVisited[cur + 1]) {
        fgVisited[cur + 1] = 1;
        compIds[cur + 1] = cid;
        bfsQ[tail++] = cur + 1;
      }
      if (cy > 0 && smallAlpha[cur - sw] >= 0.45 && !fgVisited[cur - sw]) {
        fgVisited[cur - sw] = 1;
        compIds[cur - sw] = cid;
        bfsQ[tail++] = cur - sw;
      }
      if (cy + 1 < sh && smallAlpha[cur + sw] >= 0.45 && !fgVisited[cur + sw]) {
        fgVisited[cur + sw] = 1;
        compIds[cur + sw] = cid;
        bfsQ[tail++] = cur + sw;
      }
    }
    compSizes.push(size);
  }

  let mainCompId = -1;
  let mainCompSize = 0;
  for (let c = 0; c < compSizes.length; c++) {
    if (compSizes[c] > mainCompSize) {
      mainCompSize = compSizes[c];
      mainCompId = c;
    }
  }
  if (mainCompId >= 0) {
    for (let i = 0; i < sn; i++) {
      if (compIds[i] >= 0 && compIds[i] !== mainCompId) {
        smallAlpha[i] = 0;
      }
    }
  }

  // 6. Bilinearly upsample smallAlpha to full canvas resolution
  const fullAlpha = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const sy = (y / Math.max(1, h - 1)) * (sh - 1);
    const y0 = Math.floor(sy);
    const y1 = Math.min(sh - 1, y0 + 1);
    const fy = sy - y0;
    for (let x = 0; x < w; x++) {
      const sx = (x / Math.max(1, w - 1)) * (sw - 1);
      const x0 = Math.floor(sx);
      const x1 = Math.min(sw - 1, x0 + 1);
      const fx = sx - x0;

      const a00 = smallAlpha[y0 * sw + x0];
      const a10 = smallAlpha[y0 * sw + x1];
      const a01 = smallAlpha[y1 * sw + x0];
      const a11 = smallAlpha[y1 * sw + x1];

      fullAlpha[y * w + x] =
        (a00 * (1 - fx) + a10 * fx) * (1 - fy) + (a01 * (1 - fx) + a11 * fx) * fy;
    }
  }

  // 7. Apply optional Manual Touch-Up Brush Strokes (Keep Person / Erase BG)
  if (strokes.length > 0) {
    for (const stroke of strokes) {
      const radPx = Math.max(4, stroke.radius * w);
      const radSq = radPx * radPx;
      const targetVal = stroke.mode === 'keep' ? 1 : 0;

      for (let p = 0; p < stroke.points.length; p++) {
        const pt = stroke.points[p];
        const prevPt = p > 0 ? stroke.points[p - 1] : pt;
        const xA = prevPt.x * w;
        const yA = prevPt.y * h;
        const xB = pt.x * w;
        const yB = pt.y * h;
        const dist = Math.hypot(xB - xA, yB - yA);
        const steps = Math.max(1, Math.ceil(dist / (radPx * 0.3)));

        for (let s = 0; s <= steps; s++) {
          const t = steps > 0 ? s / steps : 0;
          const cx = xA + (xB - xA) * t;
          const cy = yA + (yB - yA) * t;
          const x0 = Math.max(0, Math.floor(cx - radPx));
          const x1 = Math.min(w - 1, Math.ceil(cx + radPx));
          const y0 = Math.max(0, Math.floor(cy - radPx));
          const y1 = Math.min(h - 1, Math.ceil(cy + radPx));

          for (let yy = y0; yy <= y1; yy++) {
            const dy = yy - cy;
            for (let xx = x0; xx <= x1; xx++) {
              const dx = xx - cx;
              const dSq = dx * dx + dy * dy;
              if (dSq <= radSq) {
                const falloff = 1 - Math.sqrt(dSq) / radPx;
                const blend = clamp(falloff * 1.6, 0, 1);
                const idx = yy * w + xx;
                fullAlpha[idx] = fullAlpha[idx] * (1 - blend) + targetVal * blend;
              }
            }
          }
        }
      }
    }
  }

  // 8. Full-Resolution Fast Guided Filter (locks alpha cleanly onto individual hair strands & shirt edge!)
  const guideGray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const idx = i * 4;
    guideGray[i] =
      (0.299 * srcData[idx] + 0.587 * srcData[idx + 1] + 0.114 * srcData[idx + 2]) / 255;
  }

  const filterRadius = Math.max(3, Math.round((w / 480) * (4 + (hairEdgeClean / 100) * 5)));
  const refined = guidedFilterAlpha(guideGray, fullAlpha, w, h, filterRadius, 0.0018);

  // 9. Crisp edge S-curve & flyaway halo choke based on hairEdgeClean
  const choke = (hairEdgeClean / 100) * 0.14; // gently trims detached fuzzy halo
  for (let i = 0; i < refined.length; i++) {
    let a = refined[i];
    if (a < 0.06 + choke * 0.5) {
      a = 0;
    } else if (a > 0.92 - choke * 0.25) {
      a = 1;
    } else {
      const lo = 0.06 + choke * 0.5;
      const hi = 0.92 - choke * 0.25;
      const t = clamp((a - lo) / Math.max(0.05, hi - lo), 0, 1);
      a = t * t * (3 - 2 * t);
    }
    refined[i] = a;
  }

  return { alpha: refined, bgAverage };
}

// ============================================================================
// STAGE 3: STUDIO PORTRAIT RELIGHTING & FINAL COMPOSITING
// ============================================================================

/**
 * Unsharp mask strictly weighted by foreground alpha so the studio background stays silky smooth
 */
function applyForegroundSharpen(
  data: Uint8ClampedArray,
  alpha: Float32Array | null,
  w: number,
  h: number,
  amount: number
) {
  if (amount <= 0) return;
  const copy = new Uint8ClampedArray(data);
  const k = (amount / 100) * 0.52;
  const center = 1 + 4 * k;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const pIdx = y * w + x;
      const aWeight = alpha ? alpha[pIdx] : 1;
      if (aWeight < 0.35) continue;

      const idx = pIdx * 4;
      const top = ((y - 1) * w + x) * 4;
      const btm = ((y + 1) * w + x) * 4;
      const lft = (y * w + (x - 1)) * 4;
      const rgt = (y * w + (x + 1)) * 4;

      for (let c = 0; c < 3; c++) {
        const sharp =
          copy[idx + c] * center -
          (copy[top + c] + copy[btm + c] + copy[lft + c] + copy[rgt + c]) * k;
        const blended = copy[idx + c] * (1 - aWeight) + sharp * aWeight;
        data[idx + c] = clamp(Math.round(blended), 0, 255);
      }
    }
  }
}

/**
 * Renders the straightened, background-replaced, studio-lit passport portrait.
 * Use outputWidth = 440 for instant real-time interactive preview,
 * or outputWidth = 840 for 600 DPI Studio Print Export.
 */
export function renderPassportStudioImage(
  img: HTMLImageElement,
  options: PassportStudioOptions,
  strokes: MaskBrushStroke[] = [],
  outputWidth: number = 440
): { dataUrl: string; width: number; height: number } {
  const aspect = options.aspectRatio || 35 / 45;
  const outW = Math.max(180, Math.round(outputWidth));
  const outH = Math.max(180, Math.round(outW / aspect));

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return { dataUrl: img.src, width: outW, height: outH };
  }

  // Fill with edge-matched color first so small straightening tilts never reveal black corners!
  ctx.fillStyle = '#d8dce2';
  ctx.fillRect(0, 0, outW, outH);

  // Sample average border tone from source image to fill rotation corners seamlessly
  try {
    const sampleC = document.createElement('canvas');
    sampleC.width = 16;
    sampleC.height = 16;
    const sCtx = sampleC.getContext('2d');
    if (sCtx) {
      sCtx.drawImage(img, 0, 0, 16, 16);
      const sd = sCtx.getImageData(0, 0, 16, 4).data;
      let rr = 0;
      let gg = 0;
      let bb = 0;
      const cnt = sd.length / 4;
      for (let i = 0; i < sd.length; i += 4) {
        rr += sd[i];
        gg += sd[i + 1];
        bb += sd[i + 2];
      }
      ctx.fillStyle = `rgb(${Math.round(rr / cnt)}, ${Math.round(gg / cnt)}, ${Math.round(bb / cnt)})`;
      ctx.fillRect(0, 0, outW, outH);
    }
  } catch {
    // ignore fallback fill
  }

  // 1. Draw Straightened & Framed Source Portrait
  const iw = img.naturalWidth || img.width || outW;
  const ih = img.naturalHeight || img.height || outH;
  const totalRotDeg = (options.baseRotation || 0) + (options.rotation || 0);
  const rad = (totalRotDeg * Math.PI) / 180;

  // Base cover scale (accounts for 90°/270° base rotation)
  const isQuarterTurn = Math.abs(options.baseRotation % 180) === 90;
  const effW = isQuarterTurn ? ih : iw;
  const effH = isQuarterTurn ? iw : ih;
  const coverScale = Math.max(outW / effW, outH / effH);
  const finalScale = coverScale * clamp(options.zoom || 1, 0.55, 2.8);

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.translate(outW / 2 + options.panX * outW, outH / 2 + options.panY * outH);
  ctx.rotate(rad);
  if (options.flipH) ctx.scale(-1, 1);
  ctx.drawImage(
    img,
    (-iw * finalScale) / 2,
    (-ih * finalScale) / 2,
    iw * finalScale,
    ih * finalScale
  );
  ctx.restore();

  const imgData = ctx.getImageData(0, 0, outW, outH);
  const data = imgData.data;

  // 2. Compute Portrait Alpha Matte if background replacement is active
  const replaceBg = options.bgMode !== 'original';
  let alpha: Float32Array | null = null;
  let oldBgAvg: [number, number, number] = [215, 215, 215];

  if (replaceBg) {
    const matte = computePortraitAlphaMatte(
      data,
      outW,
      outH,
      options.bgSensitivity,
      options.hairEdgeClean,
      strokes
    );
    alpha = matte.alpha;
    oldBgAvg = matte.bgAverage;
  }

  // 3. Measure Foreground Auto White Balance & Luminance for Studio Softbox Relighting
  let wbGainR = 1;
  let wbGainG = 1;
  let wbGainB = 1;

  if (options.autoStudioLight) {
    let sumR = 0;
    let sumG = 0;
    let sumB = 0;
    let cnt = 0;
    for (let i = 0; i < outW * outH; i += 2) {
      if (alpha && alpha[i] < 0.7) continue;
      const idx = i * 4;
      sumR += data[idx];
      sumG += data[idx + 1];
      sumB += data[idx + 2];
      cnt++;
    }
    if (cnt > 50) {
      const avgR = sumR / cnt;
      const avgG = sumG / cnt;
      const avgB = sumB / cnt;
      const gray = (avgR + avgG + avgB) / 3;
      // Gentle 32% white-balance neutralization (removes greenish/yellowish indoor cast without washing out skin!)
      wbGainR = clamp(1 + (gray / Math.max(20, avgR) - 1) * 0.32, 0.9, 1.12);
      wbGainG = clamp(1 + (gray / Math.max(20, avgG) - 1) * 0.32, 0.92, 1.08);
      wbGainB = clamp(1 + (gray / Math.max(20, avgB) - 1) * 0.32, 0.9, 1.15);
    }
  }

  // 4. Target Studio Background Color + Optional Gentle Studio Glow
  let targetR = 18;
  let targetG = 115;
  let targetB = 242;
  let glowR = 51;
  let glowG = 146;
  let glowB = 255;
  let allowGlow = false;

  if (replaceBg) {
    const preset = STUDIO_BG_PRESETS.find((p) => p.id === options.bgMode);
    if (options.bgMode === 'custom') {
      [targetR, targetG, targetB] = hexToRgb(options.customBgColor);
      glowR = Math.min(255, targetR + 28);
      glowG = Math.min(255, targetG + 28);
      glowB = Math.min(255, targetB + 28);
      allowGlow = options.studioBackdropGlow && targetR + targetG + targetB < 700;
    } else if (preset) {
      [targetR, targetG, targetB] = hexToRgb(preset.hex);
      if (preset.glowHex && options.studioBackdropGlow) {
        [glowR, glowG, glowB] = hexToRgb(preset.glowHex);
        allowGlow = true;
      }
    }
  }

  // Precompute foreground brightness/contrast/warmth factors
  const bShift = options.brightness * 1.15;
  const cFactor = (100 + options.contrast) / 100;
  const wShift = options.warmth * 0.65;
  const softboxLift = options.autoStudioLight ? 0.24 : 0; // lifts shadows naturally like studio softbox

  // 5. Pixel-wise Foreground Studio Relighting + Edge Despill + Clean Backdrop Composite
  for (let y = 0; y < outH; y++) {
    const ny = y / outH;
    for (let x = 0; x < outW; x++) {
      const nx = x / outW;
      const pIdx = y * outW + x;
      const idx = pIdx * 4;
      const a = alpha ? alpha[pIdx] : 1;

      // Compute studio backdrop pixel (flat white or subtle professional radial gradient for studio blue)
      let bgR = targetR;
      let bgG = targetG;
      let bgB = targetB;
      if (replaceBg && allowGlow) {
        const dx = (nx - 0.5) * 1.35;
        const dy = (ny - 0.42) * 1.25;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const glowAmt = clamp(1 - dist * 0.95, 0, 1) * 0.55;
        bgR = targetR + (glowR - targetR) * glowAmt;
        bgG = targetG + (glowG - targetG) * glowAmt;
        bgB = targetB + (glowB - targetB) * glowAmt;
      }

      if (replaceBg && a <= 0.005) {
        data[idx] = Math.round(bgR);
        data[idx + 1] = Math.round(bgG);
        data[idx + 2] = Math.round(bgB);
        data[idx + 3] = 255;
        continue;
      }

      let r = data[idx];
      let g = data[idx + 1];
      let b = data[idx + 2];

      // Color Decontamination (Despill) on semi-transparent hair/shoulder boundary pixels!
      // Removes old wall gray/beige tint around hair edges so dark hair looks ultra-crisp against blue/white.
      if (replaceBg && a < 0.96 && a > 0.08) {
        const invA = 1 / Math.max(0.28, a);
        const deR = clamp((r - oldBgAvg[0] * (1 - a)) * invA, 0, 255);
        const deG = clamp((g - oldBgAvg[1] * (1 - a)) * invA, 0, 255);
        const deB = clamp((b - oldBgAvg[2] * (1 - a)) * invA, 0, 255);
        // Blend 68% decontaminated edge color to preserve silky anti-aliasing
        r = r * 0.32 + deR * 0.68;
        g = g * 0.32 + deG * 0.68;
        b = b * 0.32 + deB * 0.68;
      }

      // Studio Softbox Relighting on Foreground Person
      if (options.autoStudioLight) {
        r *= wbGainR;
        g *= wbGainG;
        b *= wbGainB;

        // Softbox shadow recovery: boosts dark/midtone shadows gently while protecting bright highlights
        const lumN = clamp((0.299 * r + 0.587 * g + 0.114 * b) / 255, 0, 1);
        const lift = softboxLift * Math.pow(1 - lumN, 1.65) * 85;
        // Subtle highlight rolloff protection so shirt collars & foreheads never clip harshly
        const highlightProtect = lumN > 0.78 ? 1 - (lumN - 0.78) * 1.4 : 1;
        r += lift * highlightProtect;
        g += lift * highlightProtect;
        b += lift * highlightProtect;
      }

      // Manual Smart Brightness (highlight-aware so skin looks luminous, never washed out)
      if (bShift !== 0) {
        const lumN = clamp((0.299 * r + 0.587 * g + 0.114 * b) / 255, 0, 1);
        const curve = bShift > 0 ? 1 - 0.45 * lumN * lumN : 1;
        r += bShift * curve;
        g += bShift * curve;
        b += bShift * curve;
      }

      // Contrast
      if (options.contrast !== 0) {
        r = (r - 128) * cFactor + 128;
        g = (g - 128) * cFactor + 128;
        b = (b - 128) * cFactor + 128;
      }

      // Natural Skin Warmth
      if (wShift !== 0) {
        r += wShift;
        g += wShift * 0.2;
        b -= wShift * 0.85;
      }

      // Subtle healthy vibrance boost in auto studio mode (keeps skin & clothing natural & lively)
      if (options.autoStudioLight) {
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        const vib = 1.07;
        r = gray + (r - gray) * vib;
        g = gray + (g - gray) * vib;
        b = gray + (b - gray) * vib;
      }

      r = clamp(r, 0, 255);
      g = clamp(g, 0, 255);
      b = clamp(b, 0, 255);

      // Composite Foreground onto Studio Backdrop
      if (replaceBg) {
        data[idx] = Math.round(r * a + bgR * (1 - a));
        data[idx + 1] = Math.round(g * a + bgG * (1 - a));
        data[idx + 2] = Math.round(b * a + bgB * (1 - a));
      } else {
        data[idx] = Math.round(r);
        data[idx + 1] = Math.round(g);
        data[idx + 2] = Math.round(b);
      }
      data[idx + 3] = 255;
    }
  }

  // 6. Foreground-Only Portrait Clarity & Micro-Sharpening (eyes, hair, beard, shirt crispness)
  if (options.sharpness > 0) {
    applyForegroundSharpen(data, alpha, outW, outH, options.sharpness);
  }

  ctx.putImageData(imgData, 0, 0);

  return {
    dataUrl: canvas.toDataURL('image/jpeg', 0.96),
    width: outW,
    height: outH,
  };
}

/**
 * Renders a single straightened, studio-lit portrait onto a transparent-background RGBA canvas
 * (or opaque canvas if removeBg is false) for seamless Couple Passport Photo compositing.
 */
export function renderForegroundPersonCanvas(
  img: HTMLImageElement,
  options: {
    rotation: number;
    zoom: number;
    panX: number;
    panY: number;
    flipH: boolean;
    brightness: number;
    contrast: number;
    warmth: number;
    bgSensitivity: number;
    hairEdgeClean: number;
    autoStudioLight: boolean;
    sharpness: number;
    removeBg: boolean;
  },
  outW: number,
  outH: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;

  // 1. Draw geometrically straightened & framed portrait
  const imgW = img.naturalWidth || img.width;
  const imgH = img.naturalHeight || img.height;
  const coverScale = Math.max(outW / Math.max(1, imgW), outH / Math.max(1, imgH));
  const drawW = imgW * coverScale * options.zoom;
  const drawH = imgH * coverScale * options.zoom;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, outW, outH);

  ctx.save();
  ctx.translate(outW / 2 + options.panX * outW, outH / 2 + options.panY * outH);
  if (options.flipH) ctx.scale(-1, 1);
  if (options.rotation !== 0) {
    ctx.rotate((options.rotation * Math.PI) / 180);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();

  const imgData = ctx.getImageData(0, 0, outW, outH);
  const data = imgData.data;

  // 2. Portrait Alpha Matte
  let alpha: Float32Array | null = null;
  let oldBgAvg: [number, number, number] = [215, 215, 215];
  if (options.removeBg) {
    const matte = computePortraitAlphaMatte(
      data,
      outW,
      outH,
      options.bgSensitivity,
      options.hairEdgeClean,
      []
    );
    alpha = matte.alpha;
    oldBgAvg = matte.bgAverage;
  }

  // 3. Foreground White Balance
  let wbGainR = 1;
  let wbGainG = 1;
  let wbGainB = 1;
  if (options.autoStudioLight) {
    let sumR = 0;
    let sumG = 0;
    let sumB = 0;
    let cnt = 0;
    for (let i = 0; i < outW * outH; i += 2) {
      if (alpha && alpha[i] < 0.7) continue;
      const idx = i * 4;
      sumR += data[idx];
      sumG += data[idx + 1];
      sumB += data[idx + 2];
      cnt++;
    }
    if (cnt > 50) {
      const avgR = sumR / cnt;
      const avgG = sumG / cnt;
      const avgB = sumB / cnt;
      const gray = (avgR + avgG + avgB) / 3;
      wbGainR = clamp(1 + (gray / Math.max(20, avgR) - 1) * 0.32, 0.9, 1.12);
      wbGainG = clamp(1 + (gray / Math.max(20, avgG) - 1) * 0.32, 0.92, 1.08);
      wbGainB = clamp(1 + (gray / Math.max(20, avgB) - 1) * 0.32, 0.9, 1.15);
    }
  }

  const bShift = options.brightness * 1.15;
  const cFactor = (100 + options.contrast) / 100;
  const wShift = options.warmth * 0.65;
  const softboxLift = options.autoStudioLight ? 0.24 : 0;

  for (let i = 0; i < outW * outH; i++) {
    const idx = i * 4;
    const a = alpha ? alpha[i] : 1;

    if (options.removeBg && a <= 0.01) {
      data[idx + 3] = 0;
      continue;
    }

    let r = data[idx];
    let g = data[idx + 1];
    let b = data[idx + 2];

    if (options.removeBg && a < 0.96 && a > 0.08) {
      const invA = 1 / Math.max(0.28, a);
      const deR = clamp((r - oldBgAvg[0] * (1 - a)) * invA, 0, 255);
      const deG = clamp((g - oldBgAvg[1] * (1 - a)) * invA, 0, 255);
      const deB = clamp((b - oldBgAvg[2] * (1 - a)) * invA, 0, 255);
      r = r * 0.32 + deR * 0.68;
      g = g * 0.32 + deG * 0.68;
      b = b * 0.32 + deB * 0.68;
    }

    if (options.autoStudioLight) {
      r *= wbGainR;
      g *= wbGainG;
      b *= wbGainB;
      const lumN = clamp((0.299 * r + 0.587 * g + 0.114 * b) / 255, 0, 1);
      const lift = softboxLift * Math.pow(1 - lumN, 1.65) * 85;
      const highlightProtect = lumN > 0.78 ? 1 - (lumN - 0.78) * 1.4 : 1;
      r += lift * highlightProtect;
      g += lift * highlightProtect;
      b += lift * highlightProtect;
    }

    if (bShift !== 0) {
      const lumN = clamp((0.299 * r + 0.587 * g + 0.114 * b) / 255, 0, 1);
      const curve = bShift > 0 ? 1 - 0.45 * lumN * lumN : 1;
      r += bShift * curve;
      g += bShift * curve;
      b += bShift * curve;
    }

    if (options.contrast !== 0) {
      r = (r - 128) * cFactor + 128;
      g = (g - 128) * cFactor + 128;
      b = (b - 128) * cFactor + 128;
    }

    if (wShift !== 0) {
      r += wShift;
      g += wShift * 0.2;
      b -= wShift * 0.85;
    }

    if (options.autoStudioLight) {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = gray + (r - gray) * 1.07;
      g = gray + (g - gray) * 1.07;
      b = gray + (b - gray) * 1.07;
    }

    data[idx] = Math.round(clamp(r, 0, 255));
    data[idx + 1] = Math.round(clamp(g, 0, 255));
    data[idx + 2] = Math.round(clamp(b, 0, 255));
    data[idx + 3] = Math.round(clamp(a, 0, 1) * 255);
  }

  if (options.sharpness > 0) {
    applyForegroundSharpen(data, alpha, outW, outH, options.sharpness);
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}
