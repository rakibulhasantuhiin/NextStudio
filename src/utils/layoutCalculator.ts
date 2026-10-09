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
      Math.floor((printableWidth + margins.colGap) / (photoWidth + margins.colGap))
    );
  }

  // Adjust gap dynamically if fixed colsPerRow exceeds printableWidth
  let effectiveColGap = margins.colGap;
  const initialRowWidth = colsPerRow * photoWidth + (colsPerRow - 1) * margins.colGap;
  if (colsPerRow > 1 && initialRowWidth > printableWidth) {
    const fittedGap = (printableWidth - colsPerRow * photoWidth) / (colsPerRow - 1);
    if (fittedGap >= 0) {
      effectiveColGap = fittedGap;
    }
  }

  // Auto-center the row on paper
  const totalRowWidth = colsPerRow * photoWidth + (colsPerRow - 1) * effectiveColGap;
  const startX = totalRowWidth <= printableWidth
    ? margins.left + (printableWidth - totalRowWidth) / 2
    : margins.left;

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
