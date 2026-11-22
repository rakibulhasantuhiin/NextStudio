/**
 * 100% Offline Couple Passport Photo Studio Engine
 * Joins Boy (Left) + Girl (Right) seamlessly onto Studio Blue / Pure White backdrop
 * and outputs 90°-angled print-ready Passport dimensions (40×50 mm or 35×45 mm).
 */

import { PhotoPresetType } from '../types';
import {
  PassportBgMode,
  STUDIO_BG_PRESETS,
  analyzePortraitForPassport,
  loadStudioImage,
  renderForegroundPersonCanvas,
} from './passportAutoStudio';

export type CoupleSizeVariant = '40x50' | '35x45';
export type CoupleOutputAngle = 90 | -90 | 0;

export interface CouplePersonSettings {
  zoom: number; // 0.65 to 1.9
  panX: number; // -0.45 to 0.45 (relative to person slot width)
  panY: number; // -0.45 to 0.45 (relative to person slot height)
  rotation: number; // -25 to 25 deg
  flipH: boolean;
  brightness: number; // -30 to 45
  contrast: number; // -20 to 35
  warmth: number; // -25 to 25
  bgSensitivity: number; // 15 to 85
  hairEdgeClean: number; // 0 to 100
}

export interface CoupleStudioSettings {
  bgMode: PassportBgMode;
  customBgColor: string;
  studioGlow: boolean;
  removeBg: boolean;
  autoStudioLight: boolean;
  sharpness: number; // 0 to 100
  joinOverlap: number; // -15 to 30 (shoulder proximity)
  frontPerson: 'left' | 'right';
  outputAngle: CoupleOutputAngle; // 90 deg default for passport sheet printing
  sizeVariant: CoupleSizeVariant;
}

export const DEFAULT_COUPLE_PERSON: CouplePersonSettings = {
  zoom: 1.0,
  panX: 0,
  panY: 0,
  rotation: 0,
  flipH: false,
  brightness: 10,
  contrast: 6,
  warmth: 2,
  bgSensitivity: 44,
  hairEdgeClean: 58,
};

export const DEFAULT_COUPLE_STUDIO: CoupleStudioSettings = {
  bgMode: 'studio-blue',
  customBgColor: '#1273F2',
  studioGlow: true,
  removeBg: true,
  autoStudioLight: true,
  sharpness: 28,
  joinOverlap: 8,
  frontPerson: 'left',
  outputAngle: 90,
  sizeVariant: '40x50',
};

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean.padEnd(6, '0').slice(0, 6);
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return [18, 115, 242];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/**
 * Analyzes an individual portrait and returns calibrated CouplePersonSettings
 * so both Boy (Left) and Girl (Right) are straight, eye-level matched, and naturally bright.
 */
export async function autoPrepareCouplePerson(
  src: string,
  slotAspect = 0.72
): Promise<CouplePersonSettings> {
  try {
    const img = await loadStudioImage(src);
    const analysis = await analyzePortraitForPassport(img, slotAspect);
    return {
      ...DEFAULT_COUPLE_PERSON,
      rotation: analysis.autoRotation,
      // Slightly zoom out relative to solo passport so shoulders sit comfortably in half-frame
      zoom: clamp(Math.round(analysis.autoZoom * 0.92 * 100) / 100, 0.78, 1.55),
      panX: clamp(analysis.autoPanX, -0.35, 0.35),
      panY: clamp(analysis.autoPanY + 0.02, -0.35, 0.35),
      brightness: analysis.autoBrightness,
    };
  } catch {
    return { ...DEFAULT_COUPLE_PERSON };
  }
}

export interface CoupleRenderResult {
  uprightDataUrl: string;
  printReadyDataUrl: string;
  physicalWidthMm: number;
  physicalHeightMm: number;
  recommendedPreset: PhotoPresetType;
}

/**
 * Resolves physical sheet dimensions (in mm) and recommended preset for the couple photo
 */
export function resolveCoupleOutputDimensions(
  sizeVariant: CoupleSizeVariant,
  outputAngle: CoupleOutputAngle
): {
  uprightWmm: number;
  uprightHmm: number;
  physicalWidthMm: number;
  physicalHeightMm: number;
  recommendedPreset: PhotoPresetType;
} {
  const uprightWmm = sizeVariant === '35x45' ? 45 : 50;
  const uprightHmm = sizeVariant === '35x45' ? 35 : 40;
  const isRotated = outputAngle === 90 || outputAngle === -90;
  const physicalWidthMm = isRotated ? uprightHmm : uprightWmm;
  const physicalHeightMm = isRotated ? uprightWmm : uprightHmm;

  let recommendedPreset: PhotoPresetType = 'couple';
  if (isRotated) {
    recommendedPreset = sizeVariant === '35x45' ? 'bd-passport' : 'couple';
  } else {
    recommendedPreset = 'custom';
  }

  return {
    uprightWmm,
    uprightHmm,
    physicalWidthMm,
    physicalHeightMm,
    recommendedPreset,
  };
}

/**
 * Paints the unified studio backdrop (Studio Blue with optional glow, Pure White, etc.)
 */
function paintCoupleBackdrop(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  studio: CoupleStudioSettings
) {
  let targetR = 18;
  let targetG = 115;
  let targetB = 242;
  let glowR = 56;
  let glowG = 152;
  let glowB = 255;
  let allowGlow = false;

  if (studio.bgMode === 'custom') {
    [targetR, targetG, targetB] = hexToRgb(studio.customBgColor);
    glowR = Math.min(255, targetR + 28);
    glowG = Math.min(255, targetG + 28);
    glowB = Math.min(255, targetB + 28);
    allowGlow = studio.studioGlow && targetR + targetG + targetB < 700;
  } else if (studio.bgMode === 'original') {
    targetR = 242;
    targetG = 245;
    targetB = 250;
  } else {
    const preset = STUDIO_BG_PRESETS.find((p) => p.id === studio.bgMode);
    if (preset) {
      [targetR, targetG, targetB] = hexToRgb(preset.hex);
      if (preset.glowHex && studio.studioGlow) {
        [glowR, glowG, glowB] = hexToRgb(preset.glowHex);
        allowGlow = true;
      }
    }
  }

  ctx.fillStyle = `rgb(${targetR}, ${targetG}, ${targetB})`;
  ctx.fillRect(0, 0, w, h);

  if (allowGlow) {
    const grad = ctx.createRadialGradient(
      w * 0.5,
      h * 0.42,
      w * 0.05,
      w * 0.5,
      h * 0.44,
      Math.max(w, h) * 0.72
    );
    grad.addColorStop(0, `rgba(${glowR}, ${glowG}, ${glowB}, 0.62)`);
    grad.addColorStop(1, `rgba(${targetR}, ${targetG}, ${targetB}, 0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }
}

/**
 * Composites Boy (Left) + Girl (Right) into a seamless studio Couple Passport Photo,
 * returning both the upright preview and the 90°-angled print-ready HD image.
 */
export function renderCouplePassportComposite(params: {
  leftImg: HTMLImageElement | null;
  rightImg: HTMLImageElement | null;
  leftPerson: CouplePersonSettings;
  rightPerson: CouplePersonSettings;
  studio: CoupleStudioSettings;
  targetUprightWidth?: number; // e.g., 560 for preview, 1000 for 600 DPI export
  showEmptyPlaceholders?: boolean;
}): CoupleRenderResult {
  const {
    leftImg,
    rightImg,
    leftPerson,
    rightPerson,
    studio,
    targetUprightWidth = 560,
    showEmptyPlaceholders = false,
  } = params;

  const dims = resolveCoupleOutputDimensions(studio.sizeVariant, studio.outputAngle);
  const uprightAspect = dims.uprightWmm / dims.uprightHmm; // 1.25 (50/40) or 1.2857 (45/35)

  const compW = Math.max(240, Math.round(targetUprightWidth));
  const compH = Math.max(190, Math.round(compW / uprightAspect));

  const compCanvas = document.createElement('canvas');
  compCanvas.width = compW;
  compCanvas.height = compH;
  const ctx = compCanvas.getContext('2d');
  if (!ctx) {
    return {
      uprightDataUrl: '',
      printReadyDataUrl: '',
      physicalWidthMm: dims.physicalWidthMm,
      physicalHeightMm: dims.physicalHeightMm,
      recommendedPreset: dims.recommendedPreset,
    };
  }

  // 1. Paint unified backdrop across entire couple frame
  paintCoupleBackdrop(ctx, compW, compH, studio);

  const shouldRemoveBg = studio.removeBg && studio.bgMode !== 'original';
  // Give each portrait generous width (64% of couple width) so shoulders are never cut off when composited
  const personTileW = shouldRemoveBg ? Math.round(compW * 0.64) : Math.ceil(compW * 0.52);
  const personTileH = compH;

  const leftCanvas = leftImg
    ? renderForegroundPersonCanvas(
        leftImg,
        {
          rotation: leftPerson.rotation,
          zoom: leftPerson.zoom,
          panX: leftPerson.panX,
          panY: leftPerson.panY,
          flipH: leftPerson.flipH,
          brightness: leftPerson.brightness,
          contrast: leftPerson.contrast,
          warmth: leftPerson.warmth,
          bgSensitivity: leftPerson.bgSensitivity,
          hairEdgeClean: leftPerson.hairEdgeClean,
          autoStudioLight: studio.autoStudioLight,
          sharpness: studio.sharpness,
          removeBg: shouldRemoveBg,
        },
        personTileW,
        personTileH
      )
    : null;

  const rightCanvas = rightImg
    ? renderForegroundPersonCanvas(
        rightImg,
        {
          rotation: rightPerson.rotation,
          zoom: rightPerson.zoom,
          panX: rightPerson.panX,
          panY: rightPerson.panY,
          flipH: rightPerson.flipH,
          brightness: rightPerson.brightness,
          contrast: rightPerson.contrast,
          warmth: rightPerson.warmth,
          bgSensitivity: rightPerson.bgSensitivity,
          hairEdgeClean: rightPerson.hairEdgeClean,
          autoStudioLight: studio.autoStudioLight,
          sharpness: studio.sharpness,
          removeBg: shouldRemoveBg,
        },
        personTileW,
        personTileH
      )
    : null;

  const overlapShift = (studio.joinOverlap / 100) * compW * 0.24;

  const drawSide = (side: 'left' | 'right') => {
    const pCanvas = side === 'left' ? leftCanvas : rightCanvas;
    if (!pCanvas) {
      if (showEmptyPlaceholders) {
        const cx = side === 'left' ? compW * 0.26 : compW * 0.74;
        ctx.save();
        ctx.strokeStyle =
          studio.bgMode === 'white' || studio.bgMode === 'off-white'
            ? 'rgba(100,116,139,0.45)'
            : 'rgba(255,255,255,0.55)';
        ctx.lineWidth = Math.max(1.5, compW * 0.003);
        ctx.setLineDash([6, 5]);
        // Head silhouette
        ctx.beginPath();
        ctx.ellipse(cx, compH * 0.38, compW * 0.1, compH * 0.16, 0, 0, Math.PI * 2);
        ctx.stroke();
        // Shoulders arc
        ctx.beginPath();
        ctx.ellipse(cx, compH * 0.92, compW * 0.18, compH * 0.26, 0, Math.PI, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      return;
    }

    if (shouldRemoveBg) {
      // Seamless alpha-matted join: position each person's center on left or right half
      const centerX =
        side === 'left' ? compW * 0.265 + overlapShift : compW * 0.735 - overlapShift;
      const drawX = Math.round(centerX - personTileW / 2);
      ctx.drawImage(pCanvas, drawX, 0, personTileW, personTileH);
    } else {
      // Direct side-by-side split (when user turns off background removal)
      ctx.save();
      const halfW = compW / 2;
      if (side === 'left') {
        ctx.beginPath();
        ctx.rect(0, 0, halfW, compH);
        ctx.clip();
        ctx.drawImage(pCanvas, Math.round(halfW / 2 - personTileW / 2 + overlapShift * 0.5), 0);
      } else {
        ctx.beginPath();
        ctx.rect(halfW, 0, compW - halfW, compH);
        ctx.clip();
        ctx.drawImage(
          pCanvas,
          Math.round(halfW + halfW / 2 - personTileW / 2 - overlapShift * 0.5),
          0
        );
      }
      ctx.restore();
    }
  };

  // Respect layer order (who appears slightly in front if shoulders meet)
  if (studio.frontPerson === 'left') {
    drawSide('right');
    drawSide('left');
  } else {
    drawSide('left');
    drawSide('right');
  }

  const uprightDataUrl = compCanvas.toDataURL('image/jpeg', 0.96);

  // 2. Apply Print Output Angle (Default 90° clockwise for vertical passport sheet orientation!)
  let printReadyDataUrl = uprightDataUrl;
  if (studio.outputAngle === 90 || studio.outputAngle === -90) {
    const rotCanvas = document.createElement('canvas');
    rotCanvas.width = compH;
    rotCanvas.height = compW;
    const rCtx = rotCanvas.getContext('2d');
    if (rCtx) {
      rCtx.translate(rotCanvas.width / 2, rotCanvas.height / 2);
      rCtx.rotate((studio.outputAngle * Math.PI) / 180);
      rCtx.imageSmoothingEnabled = true;
      rCtx.imageSmoothingQuality = 'high';
      rCtx.drawImage(compCanvas, -compW / 2, -compH / 2, compW, compH);
      printReadyDataUrl = rotCanvas.toDataURL('image/jpeg', 0.96);
    }
  }

  return {
    uprightDataUrl,
    printReadyDataUrl,
    physicalWidthMm: dims.physicalWidthMm,
    physicalHeightMm: dims.physicalHeightMm,
    recommendedPreset: dims.recommendedPreset,
  };
}
