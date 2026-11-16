import { DocumentFitMode } from '../types';

export interface DocumentPlacementResult {
  /** Left offset in mm on the physical sheet */
  xMm: number;
  /** Top offset in mm on the physical sheet */
  yMm: number;
  /** Rendered width in mm on the physical sheet */
  widthMm: number;
  /** Rendered height in mm on the physical sheet */
  heightMm: number;
  /** Printable bounding box (after margins) in mm */
  availXmm: number;
  availYmm: number;
  availWmm: number;
  availHmm: number;
  /** Whether auto-rotate rotated the image 90 degrees to maximize fit */
  shouldRotate90: boolean;
}

/**
 * Computes exact 1:1 millimeter placement on any paper sheet for Fit-to-Paper printing.
 * Shared identically by PaperPreview, PrintSheetHidden, and high-res PDF/PNG/JPG export.
 */
export function calculateDocumentPlacement(options: {
  imgWidth: number;
  imgHeight: number;
  paperWidthMm: number;
  paperHeightMm: number;
  marginMm: number;
  fitMode: DocumentFitMode;
  autoRotateToFit: boolean;
}): DocumentPlacementResult {
  const {
    imgWidth,
    imgHeight,
    paperWidthMm,
    paperHeightMm,
    marginMm,
    fitMode,
    autoRotateToFit,
  } = options;

  const safeMargin = Math.max(0, Math.min(marginMm, Math.min(paperWidthMm, paperHeightMm) / 2 - 2));
  const availXmm = safeMargin;
  const availYmm = safeMargin;
  const availWmm = Math.max(10, paperWidthMm - safeMargin * 2);
  const availHmm = Math.max(10, paperHeightMm - safeMargin * 2);

  const safeImgW = Math.max(1, imgWidth || 1000);
  const safeImgH = Math.max(1, imgHeight || 1414);

  // Determine whether rotating 90 degrees yields meaningfully better page utilization
  let shouldRotate90 = false;
  if (autoRotateToFit && fitMode !== 'stretch') {
    const scaleNormal =
      fitMode === 'cover'
        ? Math.max(availWmm / safeImgW, availHmm / safeImgH)
        : Math.min(availWmm / safeImgW, availHmm / safeImgH);
    const scaleRotated =
      fitMode === 'cover'
        ? Math.max(availWmm / safeImgH, availHmm / safeImgW)
        : Math.min(availWmm / safeImgH, availHmm / safeImgW);

    // For contain: larger scale fills more of the sheet without cropping.
    // For cover: choose orientation whose aspect ratio matches the sheet more closely.
    if (fitMode === 'contain') {
      if (scaleRotated > scaleNormal * 1.03) {
        shouldRotate90 = true;
      }
    } else if (fitMode === 'cover') {
      const sheetAspect = availWmm / availHmm;
      const normalDiff = Math.abs(safeImgW / safeImgH - sheetAspect);
      const rotDiff = Math.abs(safeImgH / safeImgW - sheetAspect);
      if (rotDiff + 0.05 < normalDiff) {
        shouldRotate90 = true;
      }
    }
  }

  const effImgW = shouldRotate90 ? safeImgH : safeImgW;
  const effImgH = shouldRotate90 ? safeImgW : safeImgH;

  if (fitMode === 'stretch') {
    return {
      xMm: availXmm,
      yMm: availYmm,
      widthMm: availWmm,
      heightMm: availHmm,
      availXmm,
      availYmm,
      availWmm,
      availHmm,
      shouldRotate90: false,
    };
  }

  if (fitMode === 'cover') {
    const scale = Math.max(availWmm / effImgW, availHmm / effImgH);
    const drawW = effImgW * scale;
    const drawH = effImgH * scale;
    return {
      xMm: availXmm + (availWmm - drawW) / 2,
      yMm: availYmm + (availHmm - drawH) / 2,
      widthMm: drawW,
      heightMm: drawH,
      availXmm,
      availYmm,
      availWmm,
      availHmm,
      shouldRotate90,
    };
  }

  // Default: 'contain' — Fit cleanly inside printable area, centered, preserving aspect ratio
  const scale = Math.min(availWmm / effImgW, availHmm / effImgH);
  const drawW = effImgW * scale;
  const drawH = effImgH * scale;

  return {
    xMm: availXmm + (availWmm - drawW) / 2,
    yMm: availYmm + (availHmm - drawH) / 2,
    widthMm: drawW,
    heightMm: drawH,
    availXmm,
    availYmm,
    availWmm,
    availHmm,
    shouldRotate90,
  };
}
