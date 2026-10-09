import {
  MarginSettings,
  PaperDimensions,
  PaperOrientation,
  StudioPhotoItem,
} from '../types';

export interface CalculatedItem {
  x: number; // mm
  y: number; // mm
  width: number; // mm
  height: number; // mm
  photo: StudioPhotoItem;
  index: number;
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

export function calculatePhotoPositions(options: {
  paper: PaperDimensions;
  orientation: PaperOrientation;
  margins: MarginSettings;
  photoWidth: number; // mm
  photoHeight: number; // mm
  layoutMode: 'top-5' | 'top-4-couple' | 'top-6' | 'full-grid' | 'manual';
  manualCount: number;
  photos: StudioPhotoItem[];
}): CalculatedItem[] {
  const {
    paper,
    orientation,
    margins,
    photoWidth,
    photoHeight,
    layoutMode,
    manualCount,
    photos,
  } = options;

  if (photos.length === 0) return [];

  const isLandscape = orientation === 'landscape';
  const paperWidth = isLandscape ? paper.height : paper.width;
  const paperHeight = isLandscape ? paper.width : paper.height;

  const printableWidth = paperWidth - margins.left - margins.right;
  const printableHeight = paperHeight - margins.top - margins.bottom;

  let countToRender = 1;
  let maxColsOverride: number | null = null;

  switch (layoutMode) {
    case 'top-5':
      countToRender = 5;
      maxColsOverride = 5;
      break;
    case 'top-4-couple':
      countToRender = 4;
      maxColsOverride = 4;
      break;
    case 'top-6':
      countToRender = 6;
      maxColsOverride = 6;
      break;
    case 'manual':
      countToRender = Math.max(1, manualCount);
      break;
    case 'full-grid': {
      // Calculate how many fit on the page
      const cols = Math.max(1, Math.floor((printableWidth + margins.colGap) / (photoWidth + margins.colGap)));
      const rows = Math.max(1, Math.floor((printableHeight + margins.rowGap) / (photoHeight + margins.rowGap)));
      countToRender = cols * rows;
      break;
    }
  }

  // Calculate items per row
  let colsPerRow = maxColsOverride;
  if (!colsPerRow) {
    colsPerRow = Math.max(
      1,
      Math.floor((paperWidth - 2 * 3.5 + margins.colGap) / (photoWidth + margins.colGap))
    );
  }

  // Safe minimum printable margin on physical paper
  const minSafeMargin = 3.5; // mm
  const maxPhysicalWidth = paperWidth - 2 * minSafeMargin;

  // Maximum gap that can physically fit on this paper width
  const maxPossibleColGap = colsPerRow > 1
    ? Math.max(0, (maxPhysicalWidth - colsPerRow * photoWidth) / (colsPerRow - 1))
    : 0;

  // Adjust gap dynamically: allow gap to expand across the page into side margins down to minSafeMargin
  let effectiveColGap = margins.colGap;
  if (colsPerRow > 1) {
    effectiveColGap = Math.min(margins.colGap, maxPossibleColGap);
  }

  // Total row width with this effective gap
  const totalRowWidth = colsPerRow * photoWidth + (colsPerRow - 1) * effectiveColGap;

  // Auto-center the row:
  // If row fits within user's configured margins, center inside printableWidth.
  // If user increased colGap to cover the side spaces, center across the full paperWidth!
  let startX = margins.left;
  if (totalRowWidth <= printableWidth) {
    startX = margins.left + (printableWidth - totalRowWidth) / 2;
  } else {
    startX = Math.max(minSafeMargin, (paperWidth - totalRowWidth) / 2);
  }

  const items: CalculatedItem[] = [];

  for (let i = 0; i < countToRender; i++) {
    const col = i % colsPerRow;
    const row = Math.floor(i / colsPerRow);

    const x = startX + col * (photoWidth + effectiveColGap);
    const y = margins.top + row * (photoHeight + margins.rowGap);

    // Stop if photo falls completely outside printable page height
    if (y + photoHeight > paperHeight && layoutMode !== 'manual') {
      break;
    }

    // Pick photo: cycle through uploaded photos or repeat active photo
    const photo = photos[i % photos.length];

    items.push({
      x,
      y,
      width: photoWidth,
      height: photoHeight,
      photo,
      index: i,
    });
  }

  return items;
}
