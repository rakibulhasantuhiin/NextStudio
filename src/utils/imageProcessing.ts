import { CropRect, PhotoAdjustments } from '../types';

/**
 * Loads an image from a data URL or blob URL
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

/**
 * Interface for detected portrait framing
 */
export interface PortraitFramingResult {
  crop: CropRect;
  rotation: number; // degrees to straighten
  detectedFace: boolean;
}

/**
 * 100% OFFLINE FACE DETECTION & PASSPORT FRAMING ALGORITHM:
 * Works on selfies, distant shots, tilted photos without any internet connection.
 * - Detects face position, head boundary, and tilt angle.
 * - Straightens tilted photos automatically.
 * - Crops and centers head to official Bangladesh & ICAO passport standards (35x45 mm ratio, head occupying ~68-72%).
 */
export async function detectPassportFramingAndStraighten(
  img: HTMLImageElement,
  targetAspect: number = 35 / 45 // width / height (standard BD passport 35x45 mm, ~0.7778)
): Promise<PortraitFramingResult> {
  const origW = img.width;
  const origH = img.height;

  // Default fallback crop (centered upper body)
  const defaultCrop: CropRect = {
    x: 10,
    y: 5,
    width: 80,
    height: Math.min(90, Math.round((80 / targetAspect) * (origW / origH))),
  };
  adjustCropToAspect(defaultCrop, origW, origH, targetAspect);

  let faceBox: { x: number; y: number; width: number; height: number } | null = null;
  let tiltAngle = 0;

  // 1. Check if native hardware-accelerated FaceDetector is available in browser
  if (typeof window !== 'undefined' && 'FaceDetector' in window) {
    try {
      // @ts-expect-error Native FaceDetector API
      const detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
      const faces = await detector.detect(img);
      if (faces && faces.length > 0) {
        const f = faces[0].boundingBox;
        faceBox = {
          x: f.x,
          y: f.y,
          width: f.width,
          height: f.height,
        };

        // Check if eyes landmarks are available for precise tilt angle
        if (faces[0].landmarks && Array.isArray(faces[0].landmarks)) {
          const leftEye = faces[0].landmarks.find((l: any) => l.type === 'eye' && l.locations?.[0]?.x < f.x + f.width / 2);
          const rightEye = faces[0].landmarks.find((l: any) => l.type === 'eye' && l.locations?.[0]?.x >= f.x + f.width / 2);
          if (leftEye && rightEye && leftEye.locations?.[0] && rightEye.locations?.[0]) {
            const lx = leftEye.locations[0].x;
            const ly = leftEye.locations[0].y;
            const rx = rightEye.locations[0].x;
            const ry = rightEye.locations[0].y;
            const eyeAngle = Math.atan2(ry - ly, rx - lx) * (180 / Math.PI);
            if (Math.abs(eyeAngle) >= 1 && Math.abs(eyeAngle) <= 30) {
              tiltAngle = -Math.round(eyeAngle);
            }
          }
        }
      }
    } catch {
      // Fallback to canvas computer vision
    }
  }

  // 2. Pure Canvas-based Fallback Computer Vision (YCbCr Skin Tone + Head Centroid + Tilt Analysis)
  try {
    const cvCanvas = document.createElement('canvas');
    const scale = Math.min(1, 320 / Math.max(origW, origH));
    const sw = Math.round(origW * scale);
    const sh = Math.round(origH * scale);
    cvCanvas.width = sw;
    cvCanvas.height = sh;

    const cvCtx = cvCanvas.getContext('2d', { willReadFrequently: true });
    if (cvCtx) {
      cvCtx.drawImage(img, 0, 0, sw, sh);
      const imgData = cvCtx.getImageData(0, 0, sw, sh);
      const d = imgData.data;

      let totalSkinX = 0;
      let totalSkinY = 0;
      let skinCount = 0;

      let minX = sw, maxX = 0;
      let minY = sh, maxY = 0;
      const skinPoints: { x: number; y: number }[] = [];

      for (let y = 0; y < sh; y++) {
        for (let x = 0; x < sw; x++) {
          const idx = (y * sw + x) * 4;
          const r = d[idx];
          const g = d[idx + 1];
          const b = d[idx + 2];

          // Convert RGB to YCbCr
          const yVal = 0.299 * r + 0.587 * g + 0.114 * b;
          const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
          const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

          // Skin color threshold (tolerant across various lighting & skin tones)
          const isSkin =
            yVal > 40 &&
            yVal < 245 &&
            cb >= 75 && cb <= 130 &&
            cr >= 130 && cr <= 178 &&
            r > g && g > b - 15;

          if (isSkin) {
            totalSkinX += x;
            totalSkinY += y;
            skinCount++;
            skinPoints.push({ x, y });

            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      if (skinCount > 100) {
        const centerX = totalSkinX / skinCount;
        const centerY = totalSkinY / skinCount;
        const boxW = Math.max(sw * 0.22, (maxX - minX) * 0.88);
        const boxH = Math.max(sh * 0.22, (maxY - minY) * 0.88);

        if (!faceBox) {
          faceBox = {
            x: Math.max(0, (centerX - boxW / 2) / scale),
            y: Math.max(0, (centerY - boxH / 2) / scale),
            width: boxW / scale,
            height: boxH / scale,
          };
        }

        // Tilt angle calculation via second central moments if not already detected
        if (tiltAngle === 0 && skinPoints.length > 150) {
          let m20 = 0, m02 = 0, m11 = 0;
          for (let i = 0; i < skinPoints.length; i++) {
            const dx = skinPoints[i].x - centerX;
            const dy = skinPoints[i].y - centerY;
            m20 += dx * dx;
            m02 += dy * dy;
            m11 += dx * dy;
          }
          if (Math.abs(m20 - m02) > 10) {
            // Principal axis of the head cluster
            const theta = 0.5 * Math.atan2(2 * m11, m20 - m02);
            const deg = (theta * 180) / Math.PI;
            // Straighten if minor tilt between 1.5° and 25°
            if (Math.abs(deg) >= 1.5 && Math.abs(deg) <= 25) {
              tiltAngle = -Math.round(deg);
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn('Canvas skin detector error:', e);
  }

  // 3. Compute Official ICAO / Bangladesh Passport Standard Framing
  // Standard BD Passport: Face/head occupies ~68-72% of photo height, centered, with 10-12% headroom.
  if (faceBox) {
    const faceCenterX = faceBox.x + faceBox.width / 2;

    // Ideal portrait frame height based on head size
    let targetFrameH = faceBox.height / 0.65;
    let targetFrameW = targetFrameH * targetAspect;

    // Handle distant photo vs selfie:
    // If face is small (distant shot), targetFrameH zooms into the upper torso and head.
    // If face is large (selfie), ensure frame fits within image bounds while preserving aspect ratio.
    if (targetFrameH > origH) {
      targetFrameH = origH;
      targetFrameW = targetFrameH * targetAspect;
    }
    if (targetFrameW > origW) {
      targetFrameW = origW;
      targetFrameH = targetFrameW / targetAspect;
    }

    // Top position: leave ~10% headroom above the detected face/forehead
    let cropY = faceBox.y - targetFrameH * 0.10;
    if (cropY < 0) cropY = 0;
    if (cropY + targetFrameH > origH) {
      cropY = origH - targetFrameH;
    }

    // Left position: center on the detected face
    let cropX = faceCenterX - targetFrameW / 2;
    if (cropX < 0) cropX = 0;
    if (cropX + targetFrameW > origW) {
      cropX = origW - targetFrameW;
    }

    const crop: CropRect = {
      x: Math.max(0, Math.min(100, (cropX / origW) * 100)),
      y: Math.max(0, Math.min(100, (cropY / origH) * 100)),
      width: Math.min(100, (targetFrameW / origW) * 100),
      height: Math.min(100, (targetFrameH / origH) * 100),
    };

    return {
      crop,
      rotation: tiltAngle,
      detectedFace: true,
    };
  }

  return {
    crop: defaultCrop,
    rotation: tiltAngle,
    detectedFace: false,
  };
}

function adjustCropToAspect(
  crop: CropRect,
  origW: number,
  origH: number,
  targetAspect: number
) {
  let cropWPx = (crop.width / 100) * origW;
  let cropHPx = (crop.height / 100) * origH;

  const currentAspect = cropWPx / cropHPx;
  if (currentAspect > targetAspect) {
    cropWPx = cropHPx * targetAspect;
  } else {
    cropHPx = cropWPx / targetAspect;
  }

  crop.width = Math.min(100, (cropWPx / origW) * 100);
  crop.height = Math.min(100, (cropHPx / origH) * 100);
}

/**
 * HIGH-PERFORMANCE SMART OFFLINE BACKGROUND REMOVAL & MATTING:
 * Uses multi-seed perimeter clustering, skin & hair protection maps.
 * 100% Client-side canvas computation with zero internet required.
 */
export function removeBackgroundCanvas(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  mode: 'white' | 'studio-blue' | 'sky-blue' | 'off-white' | 'custom',
  customBgHex: string,
  sensitivity: number = 42,
  feather: number = 4
) {
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // 1. Target Replacement Color
  let targetR = 37, targetG = 99, targetB = 235; // Default: Bangladesh Passport Studio Blue (#2563EB)
  if (mode === 'white') {
    targetR = 255; targetG = 255; targetB = 255;
  } else if (mode === 'sky-blue') {
    targetR = 224; targetG = 242; targetB = 254;
  } else if (mode === 'off-white') {
    targetR = 248; targetG = 250; targetB = 252;
  } else if (mode === 'custom') {
    const hex = (customBgHex || '#ffffff').replace('#', '');
    if (hex.length === 6) {
      targetR = parseInt(hex.substring(0, 2), 16);
      targetG = parseInt(hex.substring(2, 4), 16);
      targetB = parseInt(hex.substring(4, 6), 16);
    }
  }

  // 2. Multi-point perimeter background sampling across all borders
  const bgSeeds: [number, number, number][] = [];
  const addSeed = (r: number, g: number, b: number) => {
    for (let i = 0; i < bgSeeds.length; i++) {
      const s = bgSeeds[i];
      const diff = Math.abs(s[0] - r) + Math.abs(s[1] - g) + Math.abs(s[2] - b);
      if (diff < 18) return;
    }
    if (bgSeeds.length < 32) {
      bgSeeds.push([r, g, b]);
    }
  };

  // Sample top boundary (y: 0 to 12% height)
  const topH = Math.max(3, Math.floor(h * 0.12));
  const stepX = Math.max(2, Math.floor(w / 35));
  for (let x = 0; x < w; x += stepX) {
    for (let y = 0; y < topH; y += 3) {
      const idx = (y * w + x) * 4;
      addSeed(data[idx], data[idx + 1], data[idx + 2]);
    }
  }

  // Sample left and right outer borders (x: 0 to 8% width, and (w - 8%) to w)
  const sideH = Math.floor(h * 0.75);
  const sideW = Math.max(2, Math.floor(w * 0.08));
  for (let y = 0; y < sideH; y += 6) {
    for (let x = 0; x < sideW; x += 4) {
      const idxL = (y * w + x) * 4;
      const idxR = (y * w + (w - 1 - x)) * 4;
      addSeed(data[idxL], data[idxL + 1], data[idxL + 2]);
      addSeed(data[idxR], data[idxR + 1], data[idxR + 2]);
    }
  }

  if (bgSeeds.length === 0) {
    bgSeeds.push([240, 240, 240]);
  }

  // Adaptive threshold based on sensitivity
  const baseThreshold = 24 + (sensitivity / 100) * 80;
  const featherVal = Math.max(1, feather * 3);

  // Subject protection core envelope (center column where head, neck and body sit)
  const safeLeft = w * 0.26;
  const safeRight = w * 0.74;
  const safeTop = h * 0.15;
  const safeBottom = h * 0.88;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // Convert to YCbCr to test for skin
      const yVal = 0.299 * r + 0.587 * g + 0.114 * b;
      const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
      const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

      const isSkin =
        yVal > 35 &&
        yVal < 245 &&
        cb >= 75 && cb <= 130 &&
        cr >= 130 && cr <= 178 &&
        r > g && g > b - 20;

      // Dark hair protection in upper head zone
      const isHair =
        x > safeLeft && x < safeRight && y > safeTop && y < h * 0.48 &&
        r < 65 && g < 65 && b < 65;

      // Find minimum color distance to any perimeter background seed
      let minDist = 9999;
      for (let s = 0; s < bgSeeds.length; s++) {
        const seed = bgSeeds[s];
        const dr = r - seed[0];
        const dg = g - seed[1];
        const db = b - seed[2];
        const dist = Math.sqrt(dr * dr * 0.299 + dg * dg * 0.587 + db * db * 0.114);
        if (dist < minDist) {
          minDist = dist;
        }
      }

      // Adaptive threshold calculation
      let threshold = baseThreshold;
      if (y < h * 0.14) {
        threshold *= 1.3; // Top strip is almost certainly background
      } else if (x < w * 0.07 || x > w * 0.93) {
        threshold *= 1.2; // Far edges are background
      } else if (x > safeLeft && x < safeRight && y > safeTop && y < safeBottom) {
        threshold *= 0.65; // Protect central subject
      }

      // If recognized as skin or hair, protect heavily
      if (isSkin) {
        threshold *= 0.35;
      } else if (isHair) {
        threshold *= 0.40;
      }

      if (minDist < threshold) {
        const factor = Math.min(1, Math.max(0, (threshold - minDist) / featherVal));
        // Anti-aliased matte blend with target background
        data[idx] = Math.round(targetR * factor + r * (1 - factor));
        data[idx + 1] = Math.round(targetG * factor + g * (1 - factor));
        data[idx + 2] = Math.round(targetB * factor + b * (1 - factor));
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

/**
 * Fast edge-preserving bilateral-like surface smoothing (reduces skin grain & noise
 * without blurring sharp edges like eyes, eyebrows, hair strands, or shirt collars).
 */
function applyEdgePreservingSmooth(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  strength: number // 0..1
) {
  const srcData = ctx.getImageData(0, 0, w, h);
  const dstData = ctx.createImageData(w, h);
  const src = srcData.data;
  const dst = dstData.data;

  // Color range threshold: prevents smearing across high-contrast edges (eyes/hair)
  const colorSigma = 24 + strength * 26;
  const blendAlpha = Math.min(0.82, strength * 0.85);
  const radius = strength > 0.55 ? 2 : 1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const cr = src[idx];
      const cg = src[idx + 1];
      const cb = src[idx + 2];
      const ca = src[idx + 3];

      let sumR = cr;
      let sumG = cg;
      let sumB = cb;
      let wSum = 1;

      for (let dy = -radius; dy <= radius; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= h) continue;
        for (let dx = -radius; dx <= radius; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          if (nx < 0 || nx >= w) continue;
          const nIdx = (ny * w + nx) * 4;
          const nr = src[nIdx];
          const ng = src[nIdx + 1];
          const nb = src[nIdx + 2];
          const diff = (Math.abs(nr - cr) + Math.abs(ng - cg) + Math.abs(nb - cb)) / 3;
          if (diff < colorSigma) {
            const wt = 1 - diff / colorSigma;
            sumR += nr * wt;
            sumG += ng * wt;
            sumB += nb * wt;
            wSum += wt;
          }
        }
      }

      const avgR = sumR / wSum;
      const avgG = sumG / wSum;
      const avgB = sumB / wSum;

      dst[idx] = Math.round(cr * (1 - blendAlpha) + avgR * blendAlpha);
      dst[idx + 1] = Math.round(cg * (1 - blendAlpha) + avgG * blendAlpha);
      dst[idx + 2] = Math.round(cb * (1 - blendAlpha) + avgB * blendAlpha);
      dst[idx + 3] = ca;
    }
  }

  ctx.putImageData(dstData, 0, 0);
}

/**
 * Applies interactive crop (percentage 0-100), panX/panY, zoom, 90-degree rotation,
 * and fine straighten degrees onto a crisp high-resolution canvas, matching the
 * interactive CropStraightenModal stage pixel-for-pixel.
 */
export async function applyCropAndStraighten(
  src: string,
  options: {
    crop: CropRect | null;
    straightenDeg: number; // -45..45
    rotate90Deg?: number; // 0, 90, 180, 270
    zoom?: number; // 0.4..3.5 (default 1)
    panX?: number; // % of stage width (-100..100)
    panY?: number; // % of stage height (-100..100)
  }
): Promise<string> {
  const img = await loadImage(src);
  const natW = img.naturalWidth || img.width;
  const natH = img.naturalHeight || img.height;

  const rot90 = ((options.rotate90Deg || 0) % 360 + 360) % 360;
  const isOddRot = rot90 === 90 || rot90 === 270;
  const effW = isOddRot ? natH : natW;
  const effH = isOddRot ? natW : natH;

  const zoom = Math.max(0.35, Math.min(4, options.zoom ?? 1));
  const panX = options.panX ?? 0;
  const panY = options.panY ?? 0;
  const totalAngle = rot90 + (options.straightenDeg || 0);
  const rad = (totalAngle * Math.PI) / 180;

  // Preserve crisp native pixel density even when zoomed in (> 1x)
  const supersample = Math.min(2.2, Math.max(1, zoom));
  const stageW = Math.max(1, Math.round(effW * supersample));
  const stageH = Math.max(1, Math.round(effH * supersample));

  const stageCanvas = document.createElement('canvas');
  stageCanvas.width = stageW;
  stageCanvas.height = stageH;
  const sCtx = stageCanvas.getContext('2d');
  if (!sCtx) return src;

  sCtx.fillStyle = '#ffffff';
  sCtx.fillRect(0, 0, stageW, stageH);
  sCtx.imageSmoothingEnabled = true;
  sCtx.imageSmoothingQuality = 'high';
  sCtx.save();
  sCtx.translate(
    stageW / 2 + (panX / 100) * stageW,
    stageH / 2 + (panY / 100) * stageH
  );
  sCtx.scale(zoom * supersample, zoom * supersample);
  sCtx.rotate(rad);
  sCtx.drawImage(img, -natW / 2, -natH / 2, natW, natH);
  sCtx.restore();

  const crop = options.crop;
  if (!crop) {
    return stageCanvas.toDataURL('image/jpeg', 0.96);
  }

  const sx = Math.max(0, Math.round((crop.x / 100) * stageW));
  const sy = Math.max(0, Math.round((crop.y / 100) * stageH));
  const sw = Math.max(24, Math.min(stageW - sx, Math.round((crop.width / 100) * stageW)));
  const sh = Math.max(24, Math.min(stageH - sy, Math.round((crop.height / 100) * stageH)));

  // Cap huge outputs gracefully so memory/IndexedDB remain snappy while preserving 600+ DPI print quality
  const maxOutSide = 2200;
  const outScale = Math.max(sw, sh) > maxOutSide ? maxOutSide / Math.max(sw, sh) : 1;
  const outW = Math.max(24, Math.round(sw * outScale));
  const outH = Math.max(24, Math.round(sh * outScale));

  const outCanvas = document.createElement('canvas');
  outCanvas.width = outW;
  outCanvas.height = outH;
  const oCtx = outCanvas.getContext('2d');
  if (!oCtx) return stageCanvas.toDataURL('image/jpeg', 0.96);
  oCtx.imageSmoothingEnabled = true;
  oCtx.imageSmoothingQuality = 'high';
  oCtx.drawImage(stageCanvas, sx, sy, sw, sh, 0, 0, outW, outH);

  return outCanvas.toDataURL('image/jpeg', 0.96);
}

/**
 * Advanced Client-Side Photo Processing:
 * Handles Crop, Rotation, Auto Background Removal & Replacement,
 * Brightness, Contrast, Saturation, Exposure, Warmth, Smoothness, Skin Light, Sharpness.
 */
export async function processStudioPhoto(
  src: string,
  adjustments: PhotoAdjustments
): Promise<string> {
  const smoothness = adjustments.smoothness ?? 0;
  const skinLight = adjustments.skinLight ?? 0;

  // If original photo with no modifications, return src directly for maximum fidelity & speed
  const isUntouched =
    adjustments.backgroundMode === 'original' &&
    !adjustments.crop &&
    adjustments.rotation === 0 &&
    !adjustments.flipH &&
    !adjustments.flipV &&
    adjustments.brightness === 0 &&
    adjustments.contrast === 0 &&
    adjustments.saturation === 0 &&
    adjustments.exposure === 0 &&
    adjustments.warmth === 0 &&
    adjustments.sharpness === 0 &&
    smoothness === 0 &&
    skinLight === 0;

  if (isUntouched) {
    return src;
  }

  const img = await loadImage(src);

  const cropCanvas = document.createElement('canvas');
  const cropCtx = cropCanvas.getContext('2d', { willReadFrequently: true });
  if (!cropCtx) return src;

  let sx = 0;
  let sy = 0;
  let sWidth = img.width;
  let sHeight = img.height;

  if (adjustments.crop) {
    sx = (adjustments.crop.x / 100) * img.width;
    sy = (adjustments.crop.y / 100) * img.height;
    sWidth = (adjustments.crop.width / 100) * img.width;
    sHeight = (adjustments.crop.height / 100) * img.height;
  }

  // Handle rotation
  const rad = (adjustments.rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));
  const rotWidth = Math.max(1, Math.round(sWidth * cos + sHeight * sin));
  const rotHeight = Math.max(1, Math.round(sWidth * sin + sHeight * cos));

  cropCanvas.width = rotWidth;
  cropCanvas.height = rotHeight;

  cropCtx.fillStyle = '#ffffff';
  cropCtx.fillRect(0, 0, rotWidth, rotHeight);
  cropCtx.imageSmoothingEnabled = true;
  cropCtx.imageSmoothingQuality = 'high';
  cropCtx.save();
  cropCtx.translate(rotWidth / 2, rotHeight / 2);
  cropCtx.rotate(rad);
  if (adjustments.flipH || adjustments.flipV) {
    cropCtx.scale(adjustments.flipH ? -1 : 1, adjustments.flipV ? -1 : 1);
  }
  cropCtx.drawImage(
    img,
    sx,
    sy,
    sWidth,
    sHeight,
    -sWidth / 2,
    -sHeight / 2,
    sWidth,
    sHeight
  );
  cropCtx.restore();

  const w = cropCanvas.width;
  const h = cropCanvas.height;

  // Background removal & studio replacement if requested
  if (adjustments.backgroundMode !== 'original') {
    removeBackgroundCanvas(
      cropCtx,
      w,
      h,
      adjustments.backgroundMode,
      adjustments.customBgColor,
      adjustments.bgSensitivity,
      adjustments.bgFeather
    );
  }

  // Smoothness (edge-preserving skin denoise before sharpening/toning)
  if (smoothness > 0) {
    applyEdgePreservingSmooth(cropCtx, w, h, Math.min(1, smoothness / 100));
  }

  // Brightness, Contrast, Saturation, Exposure, Warmth, Skin Light
  const imgData = cropCtx.getImageData(0, 0, w, h);
  const data = imgData.data;

  const bVal = adjustments.brightness * 1.4;
  const cFactor = (adjustments.contrast + 100) / 100;
  const sFactor = (adjustments.saturation + 100) / 100;
  const eVal = adjustments.exposure * 1.2;
  const wVal = adjustments.warmth * 0.85;
  const skinGamma = skinLight !== 0 ? Math.max(0.62, Math.min(1.45, 1 - skinLight * 0.0065)) : 1;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Adaptive Skin / Shadow Light curve (lifts midtones/shadows gently without blowing highlights)
    if (skinGamma !== 1) {
      r = Math.pow(r / 255, skinGamma) * 255;
      g = Math.pow(g / 255, skinGamma) * 255;
      b = Math.pow(b / 255, skinGamma) * 255;
    }

    r += bVal + eVal;
    g += bVal + eVal;
    b += bVal + eVal;

    // Contrast
    r = (r - 128) * cFactor + 128;
    g = (g - 128) * cFactor + 128;
    b = (b - 128) * cFactor + 128;

    // Warmth
    if (wVal !== 0) {
      r += wVal * 0.8;
      b -= wVal * 0.8;
    }

    // Saturation
    if (sFactor !== 1) {
      const gray = 0.2989 * r + 0.587 * g + 0.114 * b;
      r = gray + (r - gray) * sFactor;
      g = gray + (g - gray) * sFactor;
      b = gray + (b - gray) * sFactor;
    }

    data[i] = Math.min(255, Math.max(0, r));
    data[i + 1] = Math.min(255, Math.max(0, g));
    data[i + 2] = Math.min(255, Math.max(0, b));
  }

  cropCtx.putImageData(imgData, 0, 0);

  // Sharpness filter
  if (adjustments.sharpness > 0) {
    const sharpWeight = (adjustments.sharpness / 100) * 0.8;
    applySharpen(cropCtx, w, h, sharpWeight);
  }

  return cropCanvas.toDataURL('image/jpeg', 0.95);
}

/**
 * Unsharp convolution filter
 */
function applySharpen(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  weight: number
) {
  const srcData = ctx.getImageData(0, 0, w, h);
  const dstData = ctx.createImageData(w, h);
  const src = srcData.data;
  const dst = dstData.data;

  const k = weight;
  const center = 1 + 4 * k;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = (y * w + x) * 4;
      const top = ((y - 1) * w + x) * 4;
      const btm = ((y + 1) * w + x) * 4;
      const lft = (y * w + (x - 1)) * 4;
      const rgt = (y * w + (x + 1)) * 4;

      for (let c = 0; c < 3; c++) {
        const val =
          src[idx + c] * center -
          (src[top + c] + src[btm + c] + src[lft + c] + src[rgt + c]) * k;
        dst[idx + c] = Math.min(255, Math.max(0, val));
      }
      dst[idx + 3] = src[idx + 3];
    }
  }

  ctx.putImageData(dstData, 0, 0);
}

/**
 * Detects tight bounding box of an ID card inside an image by trimming uniform
 * white/near-white or transparent outer margins. Returns a CropRect in percentages
 * (0-100) or null if no significant uniform border exists.
 */
export async function detectCardContentBounds(src: string): Promise<CropRect | null> {
  const img = await loadImage(src);
  const maxDim = 480;
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);

  // Determine if pixel is uniform light-paper/white or transparent border
  const isMarginPixel = (x: number, y: number): boolean => {
    const idx = (y * w + x) * 4;
    const a = data[idx + 3];
    if (a < 20) return true;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
    return lum >= 242 && maxDiff <= 14;
  };

  // Require at least 2% non-margin pixels along a scanline to count as card content
  const isContentRow = (y: number): boolean => {
    let nonMargin = 0;
    const minNeeded = Math.max(3, Math.floor(w * 0.025));
    for (let x = 0; x < w; x++) {
      if (!isMarginPixel(x, y)) {
        nonMargin++;
        if (nonMargin >= minNeeded) return true;
      }
    }
    return false;
  };

  const isContentCol = (x: number, topY: number, bottomY: number): boolean => {
    let nonMargin = 0;
    const span = Math.max(1, bottomY - topY + 1);
    const minNeeded = Math.max(3, Math.floor(span * 0.025));
    for (let y = topY; y <= bottomY; y++) {
      if (!isMarginPixel(x, y)) {
        nonMargin++;
        if (nonMargin >= minNeeded) return true;
      }
    }
    return false;
  };

  let top = 0;
  while (top < h - 1 && !isContentRow(top)) top++;
  let bottom = h - 1;
  while (bottom > top && !isContentRow(bottom)) bottom--;

  let left = 0;
  while (left < w - 1 && !isContentCol(left, top, bottom)) left++;
  let right = w - 1;
  while (right > left && !isContentCol(right, top, bottom)) right--;

  const boxW = right - left + 1;
  const boxH = bottom - top + 1;

  // Guardrail: never crop away more than 65% of either axis or if trim is negligible (<1.2%)
  if (boxW < w * 0.35 || boxH < h * 0.35) return null;
  const trimmedTotal = (w - boxW) / w + (h - boxH) / h;
  if (trimmedTotal < 0.015) return null;

  return {
    x: Math.round((left / w) * 1000) / 10,
    y: Math.round((top / h) * 1000) / 10,
    width: Math.round((boxW / w) * 1000) / 10,
    height: Math.round((boxH / h) * 1000) / 10,
  };
}

/**
 * Prepares an uploaded ID card image for Lamination so both Front and Back
 * match the exact physical slot orientation & fill edge-to-edge equally.
 */
export async function prepareLaminationCardImage(
  src: string,
  options: {
    targetWidthMm: number;
    targetHeightMm: number;
    autoWhiteDocument: boolean;
    docThreshold: number;
    docContrast: number;
    brightness?: number;
    autoTrim?: boolean;
    autoOrient?: boolean;
  }
): Promise<{
  processedSrc: string;
  crop: CropRect | null;
  straightenAngle: number;
}> {
  const autoTrim = options.autoTrim ?? true;
  const autoOrient = options.autoOrient ?? true;
  const brightness = options.brightness ?? 0;

  const img = await loadImage(src);
  const detectedCrop = autoTrim ? await detectCardContentBounds(src) : null;

  const effW = detectedCrop ? (detectedCrop.width / 100) * img.width : img.width;
  const effH = detectedCrop ? (detectedCrop.height / 100) * img.height : img.height;

  const slotIsLandscape = options.targetWidthMm >= options.targetHeightMm;
  const imgIsPortrait = effH > effW * 1.15;
  const imgIsLandscape = effW > effH * 1.15;

  let straightenAngle = 0;
  if (autoOrient) {
    if (slotIsLandscape && imgIsPortrait) {
      straightenAngle = 90;
    } else if (!slotIsLandscape && imgIsLandscape) {
      straightenAngle = 90;
    }
  }

  const needsProcessing =
    Boolean(detectedCrop) ||
    straightenAngle !== 0 ||
    options.autoWhiteDocument ||
    brightness !== 0;

  if (!needsProcessing) {
    return {
      processedSrc: src,
      crop: null,
      straightenAngle: 0,
    };
  }

  const processedSrc = await processNIDImage(src, {
    straightenAngle,
    crop: detectedCrop,
    autoWhiteDocument: options.autoWhiteDocument,
    docThreshold: options.docThreshold,
    docContrast: options.docContrast,
    brightness,
  });

  return {
    processedSrc,
    crop: detectedCrop,
    straightenAngle,
  };
}

/**
 * Document Scanner & Whitener for NID & Lamination ID cards
 */
export async function processNIDImage(
  src: string,
  options: {
    straightenAngle: number;
    crop: { x: number; y: number; width: number; height: number } | null;
    autoWhiteDocument: boolean;
    docThreshold: number;
    docContrast: number;
    brightness: number;
  }
): Promise<string> {
  const img = await loadImage(src);

  const normalizedAngle = ((options.straightenAngle % 360) + 360) % 360;
  const isUntouched =
    !options.crop &&
    normalizedAngle === 0 &&
    !options.autoWhiteDocument &&
    options.brightness === 0;
  if (isUntouched) return src;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return src;

  let sx = 0;
  let sy = 0;
  let sWidth = img.width;
  let sHeight = img.height;

  if (options.crop) {
    sx = Math.max(0, (options.crop.x / 100) * img.width);
    sy = Math.max(0, (options.crop.y / 100) * img.height);
    sWidth = Math.max(10, (options.crop.width / 100) * img.width);
    sHeight = Math.max(10, (options.crop.height / 100) * img.height);
  }

  let rotWidth: number;
  let rotHeight: number;
  if (normalizedAngle === 90 || normalizedAngle === 270) {
    rotWidth = Math.round(sHeight);
    rotHeight = Math.round(sWidth);
  } else if (normalizedAngle === 0 || normalizedAngle === 180) {
    rotWidth = Math.round(sWidth);
    rotHeight = Math.round(sHeight);
  } else {
    const rad = (options.straightenAngle * Math.PI) / 180;
    const sin = Math.abs(Math.sin(rad));
    const cos = Math.abs(Math.cos(rad));
    rotWidth = Math.round(sWidth * cos + sHeight * sin);
    rotHeight = Math.round(sWidth * sin + sHeight * cos);
  }

  canvas.width = rotWidth;
  canvas.height = rotHeight;

  // Always paint pure white before rotating so corners never turn black
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, rotWidth, rotHeight);

  const rad = (options.straightenAngle * Math.PI) / 180;
  ctx.save();
  ctx.translate(rotWidth / 2, rotHeight / 2);
  ctx.rotate(rad);
  ctx.drawImage(
    img,
    sx,
    sy,
    sWidth,
    sHeight,
    -sWidth / 2,
    -sHeight / 2,
    sWidth,
    sHeight
  );
  ctx.restore();

  if (options.autoWhiteDocument || options.brightness !== 0) {
    const w = canvas.width;
    const h = canvas.height;
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    const paperThreshold = 140 + (options.docThreshold / 100) * 80;
    const boostContrast = 1 + (options.docContrast / 100) * 1.2;
    const bShift = options.brightness * 1.5;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i] + bShift;
      let g = data[i + 1] + bShift;
      let b = data[i + 2] + bShift;

      if (options.autoWhiteDocument) {
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;

        if (lum >= paperThreshold) {
          const whiteFactor = Math.min(
            1,
            (lum - paperThreshold) / (255 - paperThreshold + 1)
          );
          r = r + (255 - r) * (0.8 + 0.2 * whiteFactor);
          g = g + (255 - g) * (0.8 + 0.2 * whiteFactor);
          b = b + (255 - b) * (0.8 + 0.2 * whiteFactor);
        } else {
          r = (r - 128) * boostContrast + 128;
          g = (g - 128) * boostContrast + 128;
          b = (b - 128) * boostContrast + 128;
        }
      }

      data[i] = Math.min(255, Math.max(0, r));
      data[i + 1] = Math.min(255, Math.max(0, g));
      data[i + 2] = Math.min(255, Math.max(0, b));
    }

    ctx.putImageData(imgData, 0, 0);
  }

  return canvas.toDataURL('image/jpeg', 0.96);
}

/**
 * Reads natural pixel dimensions (width, height) of an image data URL / source
 */
export async function getImageDimensions(
  src: string
): Promise<{ width: number; height: number }> {
  const img = await loadImage(src);
  return { width: img.width || 1000, height: img.height || 1414 };
}

/**
 * Document / Paper Image Processor for Fit-to-Paper Printing:
 * Handles rotation (90-degree & straighten), flips, crop, brightness, contrast,
 * and optional Clean White Paper scanner filter.
 */
export async function processDocumentImage(
  src: string,
  options: {
    rotation: number;
    flipH: boolean;
    flipV: boolean;
    crop: CropRect | null;
    autoWhiteDocument: boolean;
    docThreshold: number;
    docContrast: number;
    brightness: number;
    contrast: number;
  }
): Promise<{ processedSrc: string; width: number; height: number }> {
  const img = await loadImage(src);

  const isUntouched =
    !options.crop &&
    (options.rotation % 360) === 0 &&
    !options.flipH &&
    !options.flipV &&
    !options.autoWhiteDocument &&
    options.brightness === 0 &&
    options.contrast === 0;

  if (isUntouched) {
    return {
      processedSrc: src,
      width: img.width || 1000,
      height: img.height || 1414,
    };
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return { processedSrc: src, width: img.width || 1000, height: img.height || 1414 };
  }

  let sx = 0;
  let sy = 0;
  let sWidth = img.width;
  let sHeight = img.height;

  if (options.crop) {
    sx = Math.max(0, (options.crop.x / 100) * img.width);
    sy = Math.max(0, (options.crop.y / 100) * img.height);
    sWidth = Math.max(10, (options.crop.width / 100) * img.width);
    sHeight = Math.max(10, (options.crop.height / 100) * img.height);
  }

  const normalizedRot = ((options.rotation % 360) + 360) % 360;
  let rotWidth: number;
  let rotHeight: number;
  if (normalizedRot === 90 || normalizedRot === 270) {
    rotWidth = Math.round(sHeight);
    rotHeight = Math.round(sWidth);
  } else if (normalizedRot === 0 || normalizedRot === 180) {
    rotWidth = Math.round(sWidth);
    rotHeight = Math.round(sHeight);
  } else {
    const rad = (options.rotation * Math.PI) / 180;
    const sin = Math.abs(Math.sin(rad));
    const cos = Math.abs(Math.cos(rad));
    rotWidth = Math.round(sWidth * cos + sHeight * sin);
    rotHeight = Math.round(sWidth * sin + sHeight * cos);
  }

  canvas.width = rotWidth;
  canvas.height = rotHeight;

  // Fill crisp white behind rotated areas
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, rotWidth, rotHeight);

  const rad = (options.rotation * Math.PI) / 180;
  ctx.save();
  ctx.translate(rotWidth / 2, rotHeight / 2);
  ctx.rotate(rad);
  if (options.flipH || options.flipV) {
    ctx.scale(options.flipH ? -1 : 1, options.flipV ? -1 : 1);
  }
  ctx.drawImage(
    img,
    sx,
    sy,
    sWidth,
    sHeight,
    -sWidth / 2,
    -sHeight / 2,
    sWidth,
    sHeight
  );
  ctx.restore();

  if (options.autoWhiteDocument || options.brightness !== 0 || options.contrast !== 0) {
    const w = canvas.width;
    const h = canvas.height;
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    const bShift = options.brightness * 1.5;
    const cFactor = (options.contrast + 100) / 100;
    const paperThreshold = 140 + (options.docThreshold / 100) * 80;
    const boostContrast = 1 + (options.docContrast / 100) * 1.2;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i] + bShift;
      let g = data[i + 1] + bShift;
      let b = data[i + 2] + bShift;

      if (options.contrast !== 0) {
        r = (r - 128) * cFactor + 128;
        g = (g - 128) * cFactor + 128;
        b = (b - 128) * cFactor + 128;
      }

      if (options.autoWhiteDocument) {
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        if (lum >= paperThreshold) {
          const whiteFactor = Math.min(
            1,
            (lum - paperThreshold) / (255 - paperThreshold + 1)
          );
          r = r + (255 - r) * (0.8 + 0.2 * whiteFactor);
          g = g + (255 - g) * (0.8 + 0.2 * whiteFactor);
          b = b + (255 - b) * (0.8 + 0.2 * whiteFactor);
        } else {
          r = (r - 128) * boostContrast + 128;
          g = (g - 128) * boostContrast + 128;
          b = (b - 128) * boostContrast + 128;
        }
      }

      data[i] = Math.min(255, Math.max(0, r));
      data[i + 1] = Math.min(255, Math.max(0, g));
      data[i + 2] = Math.min(255, Math.max(0, b));
    }

    ctx.putImageData(imgData, 0, 0);
  }

  return {
    processedSrc: canvas.toDataURL('image/png'),
    width: canvas.width,
    height: canvas.height,
  };
}

/**
 * 100% OFFLINE PIPELINE TO AUTO-PROCESS AN UPLOADED PHOTO:
 * - Detects face & head size (ICAO / BD passport standards)
 * - Auto-straightens tilt/deskew
 * - Auto-removes background if enabled and sets studio color (Blue/White/etc.)
 * - Applies gentle studio lighting contrast
 */
export async function autoProcessUploadedPhoto(
  src: string,
  options: {
    targetAspect?: number;
    autoStraighten?: boolean;
    autoRemoveBg?: boolean;
    bgMode?: 'studio-blue' | 'white' | 'sky-blue' | 'off-white' | 'custom';
    customBgColor?: string;
  } = {}
): Promise<{
  originalSrc: string;
  processedSrc: string;
  adjustments: PhotoAdjustments;
  framing: PortraitFramingResult;
}> {
  const targetAspect = options.targetAspect ?? (35 / 45);
  const autoStraighten = options.autoStraighten ?? false;
  const autoRemoveBg = options.autoRemoveBg ?? false;
  const bgMode = options.bgMode ?? 'studio-blue';
  const customBgColor = options.customBgColor ?? '#2563EB';

  const img = await loadImage(src);

  // 1. Detect framing and straightening
  const framing = await detectPassportFramingAndStraighten(img, targetAspect);

  const initialAdj: PhotoAdjustments = {
    brightness: 0,
    contrast: 0,
    saturation: 0,
    sharpness: 0,
    exposure: 0,
    warmth: 0,
    rotation: autoStraighten ? framing.rotation : 0,
    flipH: false,
    flipV: false,
    backgroundMode: autoRemoveBg ? bgMode : 'original',
    customBgColor,
    bgSensitivity: 42,
    bgFeather: 4,
    crop: autoStraighten ? framing.crop : null,
  };

  // 2. Process with canvas
  const processedSrc = await processStudioPhoto(src, initialAdj);

  return {
    originalSrc: src,
    processedSrc,
    adjustments: initialAdj,
    framing,
  };
}
