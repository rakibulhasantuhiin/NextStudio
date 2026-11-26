import {
  PaperDimensions,
  PaperOrientation,
  PhotoPrintSettings,
  PhotoPrintSizeId,
  PhotoPrintSlotRectOverride,
} from '../types';

export interface PhotoPrintPresetConfig {
  id: PhotoPrintSizeId;
  nameBn: string;
  nameEn: string;
  shortLabelBn: string;
  shortLabelEn: string;
  widthMm: number;
  heightMm: number;
  inchLabel: string;
}

export const PHOTO_PRINT_PRESETS: Record<PhotoPrintSizeId, PhotoPrintPresetConfig> = {
  '4up-a4': {
    id: '4up-a4',
    nameBn: '৪টি ছবি এক পেজে (A4-এ 4R মাপ)',
    nameEn: '4 Photos on A4 (4R Ratio)',
    shortLabelBn: '৪টি / A4',
    shortLabelEn: '4-Up A4',
    widthMm: 95,
    heightMm: 138,
    inchLabel: '3.7 × 5.4"',
  },
  '4r': {
    id: '4r',
    nameBn: '4R (৪ × ৬ ইঞ্চি)',
    nameEn: '4R (4 × 6 inch)',
    shortLabelBn: '4R (৪×৬")',
    shortLabelEn: '4R (4×6")',
    widthMm: 102,
    heightMm: 152,
    inchLabel: '4 × 6"',
  },
  '3r': {
    id: '3r',
    nameBn: '3R (৩.৫ × ৫ ইঞ্চি · A4-এ ৪টি)',
    nameEn: '3R (3.5 × 5 inch · 4 on A4)',
    shortLabelBn: '3R (৩.৫×৫")',
    shortLabelEn: '3R (3.5×5")',
    widthMm: 89,
    heightMm: 127,
    inchLabel: '3.5 × 5"',
  },
  '2r': {
    id: '2r',
    nameBn: '2R / ওয়ালেট (২.৫ × ৩.৫ ইঞ্চি)',
    nameEn: '2R / Wallet (2.5 × 3.5 inch)',
    shortLabelBn: '2R (২.৫×৩.৫")',
    shortLabelEn: '2R Wallet',
    widthMm: 64,
    heightMm: 89,
    inchLabel: '2.5 × 3.5"',
  },
  '5r': {
    id: '5r',
    nameBn: '5R (৫ × ৭ ইঞ্চি)',
    nameEn: '5R (5 × 7 inch)',
    shortLabelBn: '5R (৫×৭")',
    shortLabelEn: '5R (5×7")',
    widthMm: 127,
    heightMm: 178,
    inchLabel: '5 × 7"',
  },
  '6r': {
    id: '6r',
    nameBn: '6R (৬ × ৮ ইঞ্চি)',
    nameEn: '6R (6 × 8 inch)',
    shortLabelBn: '6R (৬×৮")',
    shortLabelEn: '6R (6×8")',
    widthMm: 152,
    heightMm: 203,
    inchLabel: '6 × 8"',
  },
  '8r': {
    id: '8r',
    nameBn: '8R (৮ × ১০ ইঞ্চি)',
    nameEn: '8R (8 × 10 inch)',
    shortLabelBn: '8R (৮×১০")',
    shortLabelEn: '8R (8×10")',
    widthMm: 203,
    heightMm: 254,
    inchLabel: '8 × 10"',
  },
  '10r': {
    id: '10r',
    nameBn: '10R / বড় ফটো (৮ × ১২ ইঞ্চি)',
    nameEn: '10R (8 × 12 inch)',
    shortLabelBn: '10R (৮×১২")',
    shortLabelEn: '10R (8×12")',
    widthMm: 203,
    heightMm: 305,
    inchLabel: '8 × 12"',
  },
  'passport-35x45': {
    id: 'passport-35x45',
    nameBn: 'পাসপোর্ট (৩৫ × ৪৫ মিমি)',
    nameEn: 'Passport (35 × 45 mm)',
    shortLabelBn: 'পাসপোর্ট',
    shortLabelEn: 'Passport',
    widthMm: 35,
    heightMm: 45,
    inchLabel: '35×45 mm',
  },
  'passport-40x50': {
    id: 'passport-40x50',
    nameBn: 'বড় পাসপোর্ট / কাপল (৪০ × ৫০ মিমি)',
    nameEn: 'Classic / Couple (40 × 50 mm)',
    shortLabelBn: 'বড় পাসপোর্ট',
    shortLabelEn: 'Classic 40×50',
    widthMm: 40,
    heightMm: 50,
    inchLabel: '40×50 mm',
  },
  'stamp-20x25': {
    id: 'stamp-20x25',
    nameBn: 'স্ট্যাম্প সাইজ (২০ × ২৫ মিমি)',
    nameEn: 'Stamp Size (20 × 25 mm)',
    shortLabelBn: 'স্ট্যাম্প',
    shortLabelEn: 'Stamp',
    widthMm: 20,
    heightMm: 25,
    inchLabel: '20×25 mm',
  },
  'sq-4x4': {
    id: 'sq-4x4',
    nameBn: 'স্কয়ার ৪ × ৪ ইঞ্চি',
    nameEn: 'Square 4 × 4 inch',
    shortLabelBn: '৪×৪" স্কয়ার',
    shortLabelEn: 'Square 4×4"',
    widthMm: 102,
    heightMm: 102,
    inchLabel: '4 × 4"',
  },
  'sq-5x5': {
    id: 'sq-5x5',
    nameBn: 'স্কয়ার ৫ × ৫ ইঞ্চি',
    nameEn: 'Square 5 × 5 inch',
    shortLabelBn: '৫×৫" স্কয়ার',
    shortLabelEn: 'Square 5×5"',
    widthMm: 127,
    heightMm: 127,
    inchLabel: '5 × 5"',
  },
  a6: {
    id: 'a6',
    nameBn: 'A6 / পোস্টকার্ড (১০৫ × ১৪৮ মিমি)',
    nameEn: 'A6 / Postcard (105 × 148 mm)',
    shortLabelBn: 'A6 কার্ড',
    shortLabelEn: 'A6 Postcard',
    widthMm: 105,
    heightMm: 148,
    inchLabel: '4.1 × 5.8"',
  },
  a5: {
    id: 'a5',
    nameBn: 'A5 ফটো (১৪৮ × ২১০ মিমি)',
    nameEn: 'A5 Photo (148 × 210 mm)',
    shortLabelBn: 'A5 ফটো',
    shortLabelEn: 'A5 Photo',
    widthMm: 148,
    heightMm: 210,
    inchLabel: '5.8 × 8.3"',
  },
  'a4-full': {
    id: 'a4-full',
    nameBn: 'A4 ফুল পেজ (২১০ × ২৯৭ মিমি)',
    nameEn: 'A4 Full Page (210 × 297 mm)',
    shortLabelBn: 'A4 ফুল',
    shortLabelEn: 'A4 Full',
    widthMm: 210,
    heightMm: 297,
    inchLabel: '8.3 × 11.7"',
  },
  'a3-full': {
    id: 'a3-full',
    nameBn: 'A3 পোস্টার (২৯৭ × ৪২০ মিমি)',
    nameEn: 'A3 Poster (297 × 420 mm)',
    shortLabelBn: 'A3 পোস্টার',
    shortLabelEn: 'A3 Poster',
    widthMm: 297,
    heightMm: 420,
    inchLabel: '11.7 × 16.5"',
  },
  custom: {
    id: 'custom',
    nameBn: 'কাস্টম সাইজ (নিজের মাপ)',
    nameEn: 'Custom Size (mm)',
    shortLabelBn: 'কাস্টম',
    shortLabelEn: 'Custom',
    widthMm: 100,
    heightMm: 140,
    inchLabel: 'mm',
  },
};

export const DEFAULT_PHOTO_PRINT_SETTINGS: PhotoPrintSettings = {
  sizeId: '4up-a4',
  customWidthMm: 100,
  customHeightMm: 140,
  fitMode: 'cover',
  fillMode: 'individual',
  marginMm: 6,
  gapMm: 5,
  autoRotateToFit: true,
  slots: [null, null, null, null],
  slotPositions: {},
};

export interface PhotoPrintGridSlotRect {
  index: number;
  x: number; // mm
  y: number; // mm
  width: number; // mm
  height: number; // mm
  rotatedToFit: boolean;
  customPositioned?: boolean;
}

export interface PhotoPrintGridLayout {
  slots: PhotoPrintGridSlotRect[];
  cols: number;
  rows: number;
  totalSlots: number;
  slotWidthMm: number;
  slotHeightMm: number;
  rotatedToFit: boolean;
  sheetWidthMm: number;
  sheetHeightMm: number;
}

/**
 * Computes symmetrically centered millimeter rectangles for all photos that fit on the paper,
 * optionally applying user-dragged / aligned per-slot millimeter overrides.
 */
export function calculatePhotoPrintGrid(options: {
  paper: PaperDimensions;
  orientation: PaperOrientation;
  sizeId: PhotoPrintSizeId;
  customWidthMm?: number;
  customHeightMm?: number;
  marginMm?: number;
  gapMm?: number;
  autoRotateToFit?: boolean;
  slotPositions?: Record<number, PhotoPrintSlotRectOverride>;
}): PhotoPrintGridLayout {
  const {
    paper,
    orientation,
    sizeId,
    customWidthMm = 100,
    customHeightMm = 140,
    marginMm = 6,
    gapMm = 5,
    autoRotateToFit = true,
    slotPositions,
  } = options;

  const isLandscape = orientation === 'landscape';
  const sheetWidthMm = isLandscape ? paper.height : paper.width;
  const sheetHeightMm = isLandscape ? paper.width : paper.height;

  const preset = PHOTO_PRINT_PRESETS[sizeId] || PHOTO_PRINT_PRESETS['4up-a4'];
  const rawW = sizeId === 'custom' ? Math.max(15, customWidthMm) : preset.widthMm;
  const rawH = sizeId === 'custom' ? Math.max(15, customHeightMm) : preset.heightMm;

  const evaluateFit = (w: number, h: number) => {
    // Allow edge-to-edge fit when photo size matches or nearly matches paper size (e.g. 4R on 4R, A4 on A4)
    const effMarginX =
      w >= sheetWidthMm - 0.5
        ? 0
        : Math.min(marginMm, Math.max(0, (sheetWidthMm - w) / 2));
    const effMarginY =
      h >= sheetHeightMm - 0.5
        ? 0
        : Math.min(marginMm, Math.max(0, (sheetHeightMm - h) / 2));

    const availW = Math.max(1, sheetWidthMm - effMarginX * 2);
    const availH = Math.max(1, sheetHeightMm - effMarginY * 2);

    const effW = Math.min(w, sheetWidthMm);
    const effH = Math.min(h, sheetHeightMm);

    const cols = Math.max(1, Math.floor((availW + gapMm + 0.05) / (effW + gapMm)));
    const rows = Math.max(1, Math.floor((availH + gapMm + 0.05) / (effH + gapMm)));

    return {
      cols,
      rows,
      total: cols * rows,
      slotW: effW,
      slotH: effH,
    };
  };

  const upright = evaluateFit(rawW, rawH);
  let chosen = upright;
  let rotatedToFit = false;

  if (autoRotateToFit && Math.abs(rawW - rawH) > 0.5) {
    const rotated = evaluateFit(rawH, rawW);
    if (rotated.total > upright.total) {
      chosen = rotated;
      rotatedToFit = true;
    }
  }

  const gridW = chosen.cols * chosen.slotW + Math.max(0, chosen.cols - 1) * gapMm;
  const gridH = chosen.rows * chosen.slotH + Math.max(0, chosen.rows - 1) * gapMm;
  const startX = Math.max(0, (sheetWidthMm - gridW) / 2);
  const startY = Math.max(0, (sheetHeightMm - gridH) / 2);

  const slots: PhotoPrintGridSlotRect[] = [];
  let idx = 0;
  for (let r = 0; r < chosen.rows; r++) {
    for (let c = 0; c < chosen.cols; c++) {
      const baseX = Math.round((startX + c * (chosen.slotW + gapMm)) * 10) / 10;
      const baseY = Math.round((startY + r * (chosen.slotH + gapMm)) * 10) / 10;
      const baseW = Math.round(chosen.slotW * 10) / 10;
      const baseH = Math.round(chosen.slotH * 10) / 10;

      const override = slotPositions?.[idx];
      const finalW = override?.width ? Math.min(sheetWidthMm, Math.max(10, override.width)) : baseW;
      const finalH = override?.height ? Math.min(sheetHeightMm, Math.max(10, override.height)) : baseH;
      const finalX =
        override !== undefined
          ? Math.round(Math.max(0, Math.min(sheetWidthMm - finalW, override.x)) * 10) / 10
          : baseX;
      const finalY =
        override !== undefined
          ? Math.round(Math.max(0, Math.min(sheetHeightMm - finalH, override.y)) * 10) / 10
          : baseY;

      slots.push({
        index: idx,
        x: finalX,
        y: finalY,
        width: finalW,
        height: finalH,
        rotatedToFit,
        customPositioned: override !== undefined,
      });
      idx++;
    }
  }

  return {
    slots,
    cols: chosen.cols,
    rows: chosen.rows,
    totalSlots: slots.length,
    slotWidthMm: Math.round(chosen.slotW * 10) / 10,
    slotHeightMm: Math.round(chosen.slotH * 10) / 10,
    rotatedToFit,
    sheetWidthMm,
    sheetHeightMm,
  };
}
