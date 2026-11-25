import {
  LayoutMode,
  MarginSettings,
  PaperDimensions,
  PaperOrientation,
  PhotoPresetType,
  PlacedSheetItem,
  StudioPhotoItem,
} from '../types';
import { PHOTO_PRESETS } from './constants';

export interface CalculatedItem {
  id: string; // unique placement ID
  photoId: string;
  x: number; // mm
  y: number; // mm
  width: number; // mm
  height: number; // mm
  photo: StudioPhotoItem;
  index: number;
  preset?: PhotoPresetType;
  customPositioned?: boolean;
}

/**
 * Calculates the maximum side-by-side gap that fits across the paper width
 * so photos can spread out and cover the margins on both sides.
 */
export function calculateMaxSpreadColGap(options: {
  paperWidth: number;
  photoWidth: number;
  colsPerRow: number;
  minSideMargin?: number;
}): number {
  const { paperWidth, photoWidth, colsPerRow, minSideMargin = 3.5 } = options;
  if (colsPerRow <= 1) return 0;
  const availableWidth = paperWidth - 2 * minSideMargin;
  const totalPhotosWidth = colsPerRow * photoWidth;
  const gapSpace = availableWidth - totalPhotosWidth;
  if (gapSpace <= 0) return 0;
  return Math.round((gapSpace / (colsPerRow - 1)) * 10) / 10;
}

/**
 * Generates initial placed items for a given layout mode and paper configuration.
 */
export function generateDefaultPlacedItems(options: {
  paper: PaperDimensions;
  orientation: PaperOrientation;
  margins: MarginSettings;
  photoPreset: PhotoPresetType;
  customPhotoWidth?: number;
  customPhotoHeight?: number;
  layoutMode: LayoutMode;
  manualCount?: number;
  photos: StudioPhotoItem[];
  activePhotoIndex?: number;
}): PlacedSheetItem[] {
  const {
    paper,
    orientation,
    margins,
    photoPreset,
    customPhotoWidth = 35,
    customPhotoHeight = 45,
    layoutMode,
    manualCount = 5,
    photos,
    activePhotoIndex = 0,
  } = options;

  if (photos.length === 0) return [];

  const isLandscape = orientation === 'landscape';
  const paperWidth = isLandscape ? paper.height : paper.width;
  const paperHeight = isLandscape ? paper.width : paper.height;

  const defaultPhotoId = photos[activePhotoIndex]?.id || photos[0]?.id;

  // 1. Special Preset: COMBO (Active Passport/Couple + Stamp 20x25 on same sheet)
  if (layoutMode === 'combo-passport-stamp') {
    const items: PlacedSheetItem[] = [];
    const useCoupleTop = photoPreset === 'couple' || photoPreset === 'bd-classic';
    const passportW = useCoupleTop ? PHOTO_PRESETS[photoPreset].width : 35;
    const passportH = useCoupleTop ? PHOTO_PRESETS[photoPreset].height : 45;
    const topPreset: PhotoPresetType = useCoupleTop ? photoPreset : 'bd-passport';
    const stampW = 20;
    const stampH = 25;

    // Row 1: 5 Passport photos (or 4 Couple / Classic photos)
    const maxTopFit = Math.max(1, Math.floor((paperWidth - 6) / passportW));
    const passCols = Math.min(useCoupleTop ? 4 : 5, maxTopFit);
    const passColGap = calculateMaxSpreadColGap({
      paperWidth,
      photoWidth: passportW,
      colsPerRow: passCols,
      minSideMargin: margins.left,
    });
    const passRowW = passCols * passportW + (passCols - 1) * passColGap;
    const passStartX = Math.max(margins.left, (paperWidth - passRowW) / 2);

    for (let i = 0; i < passCols; i++) {
      const pid = photos[i % photos.length]?.id || defaultPhotoId;
      items.push({
        id: `placed-pass-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
        photoId: pid,
        x: passStartX + i * (passportW + passColGap),
        y: margins.top,
        width: passportW,
        height: passportH,
        preset: topPreset,
      });
    }

    // Rows 2 & 3: 8 Stamp photos each row (Total 16 stamps)
    const stampCols = 8;
    const stampColGap = calculateMaxSpreadColGap({
      paperWidth,
      photoWidth: stampW,
      colsPerRow: stampCols,
      minSideMargin: margins.left,
    });
    const stampRowW = stampCols * stampW + (stampCols - 1) * stampColGap;
    const stampStartX = Math.max(margins.left, (paperWidth - stampRowW) / 2);

    const startStampY = margins.top + passportH + margins.rowGap + 3;

    for (let row = 0; row < 2; row++) {
      const y = startStampY + row * (stampH + margins.rowGap);
      if (y + stampH > paperHeight) break;

      for (let col = 0; col < stampCols; col++) {
        const itemIdx = passCols + row * stampCols + col;
        const pid = photos[itemIdx % photos.length]?.id || defaultPhotoId;
        items.push({
          id: `placed-stamp-${Date.now()}-${row}-${col}-${Math.random().toString(36).substr(2, 4)}`,
          photoId: pid,
          x: stampStartX + col * (stampW + stampColGap),
          y,
          width: stampW,
          height: stampH,
          preset: 'bd-stamp',
        });
      }
    }

    return items;
  }

  // 2. Special Preset: FULL-GRID-STAMP (All stamp size photos filling the page)
  if (layoutMode === 'full-grid-stamp') {
    const items: PlacedSheetItem[] = [];
    const stampW = 20;
    const stampH = 25;
    const cols = Math.max(1, Math.floor((paperWidth - margins.left - margins.right + margins.colGap) / (stampW + margins.colGap)));
    const rows = Math.max(1, Math.floor((paperHeight - margins.top - margins.bottom + margins.rowGap) / (stampH + margins.rowGap)));

    const colGap = calculateMaxSpreadColGap({
      paperWidth,
      photoWidth: stampW,
      colsPerRow: cols,
      minSideMargin: margins.left,
    });
    const rowW = cols * stampW + (cols - 1) * colGap;
    const startX = Math.max(margins.left, (paperWidth - rowW) / 2);

    let idx = 0;
    for (let r = 0; r < rows; r++) {
      const y = margins.top + r * (stampH + margins.rowGap);
      if (y + stampH > paperHeight) break;
      for (let c = 0; c < cols; c++) {
        const pid = photos[idx % photos.length]?.id || defaultPhotoId;
        items.push({
          id: `placed-stampfull-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
          photoId: pid,
          x: startX + c * (stampW + colGap),
          y,
          width: stampW,
          height: stampH,
          preset: 'bd-stamp',
        });
        idx++;
      }
    }
    return items;
  }

  // 3. Standard Layout Modes (top-5, top-4-couple, top-6, full-grid, manual, freeform)
  const effPhotoW = photoPreset === 'custom' ? customPhotoWidth : PHOTO_PRESETS[photoPreset].width;
  const effPhotoH = photoPreset === 'custom' ? customPhotoHeight : PHOTO_PRESETS[photoPreset].height;

  const minSafeMargin = 3.5;
  const maxPhysicalWidth = Math.max(effPhotoW, paperWidth - 2 * minSafeMargin);
  const maxFittingCols = Math.max(1, Math.floor(maxPhysicalWidth / Math.max(1, effPhotoW)));
  const presetDefaultCols =
    photoPreset === 'custom'
      ? Math.min(maxFittingCols, 5)
      : Math.min(PHOTO_PRESETS[photoPreset]?.defaultCols || 5, maxFittingCols);

  let countToRender = presetDefaultCols;
  let maxColsOverride: number | null = null;

  switch (layoutMode) {
    case 'top-5':
      countToRender = presetDefaultCols;
      maxColsOverride = presetDefaultCols;
      break;
    case 'top-4-couple':
      countToRender = Math.min(4, maxFittingCols);
      maxColsOverride = Math.min(4, maxFittingCols);
      break;
    case 'top-6':
      countToRender = Math.min(6, maxFittingCols);
      maxColsOverride = Math.min(6, maxFittingCols);
      break;
    case 'manual':
      countToRender = Math.max(1, manualCount);
      break;
    case 'freeform':
      countToRender = Math.min(presetDefaultCols, photos.length);
      break;
    case 'full-grid':
    default: {
      const printableW = Math.max(effPhotoW, paperWidth - margins.left - margins.right);
      const printableH = Math.max(effPhotoH, paperHeight - margins.top - margins.bottom);
      const cols = Math.max(1, Math.floor((printableW + margins.colGap) / (effPhotoW + margins.colGap)));
      const rows = Math.max(1, Math.floor((printableH + margins.rowGap) / (effPhotoH + margins.rowGap)));
      countToRender = cols * rows;
      break;
    }
  }

  // Calculate items per row (never exceeding what physically fits on the paper width)
  let colsPerRow = maxColsOverride;
  if (!colsPerRow) {
    colsPerRow = Math.max(
      1,
      Math.floor((maxPhysicalWidth + margins.colGap) / (effPhotoW + margins.colGap))
    );
  }
  colsPerRow = Math.max(1, Math.min(colsPerRow, maxFittingCols));

  const maxPossibleColGap = colsPerRow > 1
    ? Math.max(0, (maxPhysicalWidth - colsPerRow * effPhotoW) / (colsPerRow - 1))
    : 0;

  let effectiveColGap = margins.colGap;
  if (colsPerRow > 1) {
    effectiveColGap = Math.min(margins.colGap, maxPossibleColGap);
  }

  const totalRowWidth = colsPerRow * effPhotoW + (colsPerRow - 1) * effectiveColGap;
  const printableWidth = paperWidth - margins.left - margins.right;

  let startX = margins.left;
  if (totalRowWidth <= printableWidth) {
    startX = margins.left + (printableWidth - totalRowWidth) / 2;
  } else {
    startX = Math.max(minSafeMargin, (paperWidth - totalRowWidth) / 2);
  }

  const items: PlacedSheetItem[] = [];

  for (let i = 0; i < countToRender; i++) {
    const col = i % colsPerRow;
    const row = Math.floor(i / colsPerRow);

    const x = startX + col * (effPhotoW + effectiveColGap);
    const y = margins.top + row * (effPhotoH + margins.rowGap);

    if (y + effPhotoH > paperHeight && layoutMode !== 'manual') {
      break;
    }

    const pid = photos[i % photos.length]?.id || defaultPhotoId;

    items.push({
      id: `placed-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
      photoId: pid,
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      width: effPhotoW,
      height: effPhotoH,
      preset: photoPreset,
    });
  }

  return items;
}

/**
 * Generates virtual placeholder slots for the empty-sheet preview so switching any
 * photo preset, custom size, layout mode, or margin immediately updates the sheet preview.
 */
export function generateEmptyPreviewSlots(options: {
  paper: PaperDimensions;
  orientation: PaperOrientation;
  margins: MarginSettings;
  photoPreset: PhotoPresetType;
  customPhotoWidth?: number;
  customPhotoHeight?: number;
  layoutMode: LayoutMode;
  manualCount?: number;
}): PlacedSheetItem[] {
  const virtualPhotos: StudioPhotoItem[] = Array.from({ length: 12 }, (_, idx) => ({
    id: `__preview_slot_${idx}__`,
    name: `Slot ${idx + 1}`,
    type: options.photoPreset === 'couple' ? 'couple' : 'individual',
    originalSrc: '',
    processedSrc: '',
    naturalWidth: 700,
    naturalHeight: 900,
    adjustments: {
      brightness: 0,
      contrast: 0,
      saturation: 0,
      sharpness: 0,
      exposure: 0,
      warmth: 0,
      rotation: 0,
      flipH: false,
      flipV: false,
      backgroundMode: 'original',
      customBgColor: '#2563eb',
      bgSensitivity: 38,
      bgFeather: 3,
      crop: null,
    },
  }));

  return generateDefaultPlacedItems({
    ...options,
    photos: virtualPhotos,
    activePhotoIndex: 0,
  });
}

/**
 * Intelligently appends a new photo to the sheet, placing it at the next available spot
 * (e.g. in the current row, new row, or bottom empty space).
 */
export function addPhotoToSheet(options: {
  existingItems: PlacedSheetItem[];
  photoId: string;
  preset: PhotoPresetType;
  paper: PaperDimensions;
  orientation: PaperOrientation;
  margins: MarginSettings;
  customWidth?: number;
  customHeight?: number;
}): PlacedSheetItem[] {
  const {
    existingItems,
    photoId,
    preset,
    paper,
    orientation,
    margins,
    customWidth = 35,
    customHeight = 45,
  } = options;

  const isLandscape = orientation === 'landscape';
  const paperWidth = isLandscape ? paper.height : paper.width;
  const paperHeight = isLandscape ? paper.width : paper.height;

  const width = preset === 'custom' ? customWidth : PHOTO_PRESETS[preset]?.width || 35;
  const height = preset === 'custom' ? customHeight : PHOTO_PRESETS[preset]?.height || 45;

  let newX = margins.left;
  let newY = margins.top;

  if (existingItems.length > 0) {
    // Try placing to the right of the last item in the same row
    const lastItem = existingItems[existingItems.length - 1];
    const candidateRightX = lastItem.x + lastItem.width + margins.colGap;

    if (candidateRightX + width <= paperWidth - 3) {
      newX = candidateRightX;
      newY = lastItem.y;
    } else {
      // Start a new row right below all existing items
      const bottomMostY = Math.max(...existingItems.map((i) => i.y + i.height));
      const nextRowY = bottomMostY + margins.rowGap;

      if (nextRowY + height <= paperHeight - 3) {
        newX = margins.left;
        newY = nextRowY;
      } else {
        // If bottom exceeded, place offset in next column or at bottom with safe bounds
        newX = Math.min(paperWidth - width - 3, margins.left + ((existingItems.length % 5) * 5));
        newY = Math.min(paperHeight - height - 3, margins.top + ((existingItems.length % 5) * 5));
      }
    }
  }

  const newItem: PlacedSheetItem = {
    id: `placed-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    photoId,
    x: Math.round(newX * 10) / 10,
    y: Math.round(newY * 10) / 10,
    width,
    height,
    preset,
    customPositioned: true,
  };

  return [...existingItems, newItem];
}

/**
 * Re-aligns all current placed items into neat rows and columns (Auto-pack to grid)
 * while preserving each photo's size (Passport or Stamp).
 */
export function autoAlignPlacedItems(
  items: PlacedSheetItem[],
  paper: PaperDimensions,
  orientation: PaperOrientation,
  margins: MarginSettings
): PlacedSheetItem[] {
  if (items.length === 0) return [];

  const isLandscape = orientation === 'landscape';
  const paperWidth = isLandscape ? paper.height : paper.width;
  const minSafeMargin = 3.5;
  const maxContentRight = paperWidth - minSafeMargin;
  const printableWidth = Math.max(10, paperWidth - margins.left - margins.right);

  let currentY = margins.top;
  let currentX = margins.left;
  let rowMaxHeight = 0;

  type PackedRowItem = {
    item: PlacedSheetItem;
    x: number;
    y: number;
  };
  const rows: PackedRowItem[][] = [];
  let currentRow: PackedRowItem[] = [];

  for (const item of items) {
    if (currentX + item.width > maxContentRight && currentRow.length > 0) {
      rows.push(currentRow);
      currentRow = [];
      currentY += rowMaxHeight + margins.rowGap;
      currentX = margins.left;
      rowMaxHeight = 0;
    }

    currentRow.push({ item, x: currentX, y: currentY });
    currentX += item.width + margins.colGap;
    if (item.height > rowMaxHeight) {
      rowMaxHeight = item.height;
    }
  }
  if (currentRow.length > 0) {
    rows.push(currentRow);
  }

  // Symmetrically center each packed row inside printable bounds so there is no lopsided right gap
  const aligned: PlacedSheetItem[] = [];
  for (const row of rows) {
    const rowMinX = row[0].x;
    const last = row[row.length - 1];
    const rowWidth = last.x + last.item.width - rowMinX;
    const targetStartX =
      rowWidth <= printableWidth
        ? margins.left + (printableWidth - rowWidth) / 2
        : Math.max(minSafeMargin, (paperWidth - rowWidth) / 2);
    const shiftX = targetStartX - rowMinX;

    for (const entry of row) {
      aligned.push({
        ...entry.item,
        x: Math.round((entry.x + shiftX) * 10) / 10,
        y: Math.round(entry.y * 10) / 10,
        customPositioned: false,
      });
    }
  }

  return aligned;
}

/**
 * Resolves placed items into calculated printable/displayable items with photo objects attached.
 */
export function calculatePhotoPositions(options: {
  paper: PaperDimensions;
  orientation: PaperOrientation;
  margins: MarginSettings;
  photoPreset?: PhotoPresetType;
  photoWidth: number; // mm
  photoHeight: number; // mm
  layoutMode: LayoutMode;
  manualCount: number;
  photos: StudioPhotoItem[];
  placedItems?: PlacedSheetItem[];
  activePhotoIndex?: number;
}): CalculatedItem[] {
  const {
    paper,
    orientation,
    margins,
    photoPreset = 'bd-passport',
    photoWidth,
    photoHeight,
    layoutMode,
    manualCount,
    photos,
    placedItems,
    activePhotoIndex = 0,
  } = options;

  if (photos.length === 0) return [];

  const photoMap = new Map(photos.map((p) => [p.id, p]));
  const defaultPhoto = photos[activePhotoIndex] || photos[0];

  // If placedItems are explicitly provided (from dragging, adding, custom layout)
  if (placedItems && placedItems.length > 0) {
    return placedItems.map((item, index) => {
      const photo = photoMap.get(item.photoId) || defaultPhoto;
      return {
        id: item.id,
        photoId: item.photoId,
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height,
        photo,
        index,
        preset: item.preset,
        customPositioned: item.customPositioned,
      };
    });
  }

  // Fallback: auto-generate placed items
  const generated = generateDefaultPlacedItems({
    paper,
    orientation,
    margins,
    photoPreset,
    customPhotoWidth: photoWidth,
    customPhotoHeight: photoHeight,
    layoutMode,
    manualCount,
    photos,
    activePhotoIndex,
  });

  return generated.map((item, index) => {
    const photo = photoMap.get(item.photoId) || defaultPhoto;
    return {
      id: item.id,
      photoId: item.photoId,
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
      photo,
      index,
      preset: item.preset,
      customPositioned: item.customPositioned,
    };
  });
}
