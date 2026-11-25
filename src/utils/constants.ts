import {
  DocumentPrintSettings,
  LaminationCardPreset,
  LaminationCardSettings,
  MarginSettings,
  PaperDimensions,
  PaperSizeType,
  PhotoAdjustments,
  PhotoPresetConfig,
  PhotoPresetType,
} from '../types';

export const PAPER_SIZES: Record<PaperSizeType, PaperDimensions> = {
  a4: {
    name: 'A4 (210 × 297 mm)',
    width: 210,
    height: 297,
  },
  a5: {
    name: 'A5 (148 × 210 mm)',
    width: 148,
    height: 210,
  },
  letter: {
    name: 'Letter (215.9 × 279.4 mm)',
    width: 215.9,
    height: 279.4,
  },
  legal: {
    name: 'Legal (215.9 × 355.6 mm)',
    width: 215.9,
    height: 355.6,
  },
  b5: {
    name: 'B5 (176 × 250 mm)',
    width: 176,
    height: 250,
  },
  '4r': {
    name: '4R / 4x6" (102 × 152 mm)',
    width: 102,
    height: 152,
  },
  custom: {
    name: 'Custom Size',
    width: 210,
    height: 297,
  },
};

export const PHOTO_PRESETS: Record<PhotoPresetType, PhotoPresetConfig> = {
  'bd-passport': {
    id: 'bd-passport',
    nameBn: 'বাংলাদেশ পাসপোর্ট / ই-পাসপোর্ট (৩৫ × ৪৫ মিমি)',
    nameEn: 'Bangladesh Passport (35 × 45 mm)',
    width: 35,
    height: 45,
    defaultCols: 5,
  },
  'bd-classic': {
    id: 'bd-classic',
    nameBn: 'বাংলাদেশ ক্লাসিক / বড় (৪০ × ৫০ মিমি)',
    nameEn: 'Bangladesh Classic / Large (40 × 50 mm)',
    width: 40,
    height: 50,
    defaultCols: 4,
  },
  'intl-passport': {
    id: 'intl-passport',
    nameBn: 'আন্তর্জাতিক পাসপোর্ট (৩৫ × ৪৫ মিমি)',
    nameEn: 'International Passport (35 × 45 mm)',
    width: 35,
    height: 45,
    defaultCols: 5,
  },
  'bd-stamp': {
    id: 'bd-stamp',
    nameBn: 'বাংলাদেশ স্ট্যাম্প সাইজ (২০ × ২৫ মিমি)',
    nameEn: 'Bangladesh Stamp Size (20 × 25 mm)',
    width: 20,
    height: 25,
    defaultCols: 8,
  },
  couple: {
    id: 'couple',
    nameBn: 'কাপল পাসপোর্ট (৯০° অ্যাঙ্গেল - ৪০ × ৫০ মিমি)',
    nameEn: 'Couple Passport (90° Angle - 40 × 50 mm)',
    width: 40,
    height: 50,
    defaultCols: 4,
  },
  'us-passport': {
    id: 'us-passport',
    nameBn: 'আমেরিকান / ভিসা ২×২ ইঞ্চি (৫১ × ৫১ মিমি)',
    nameEn: 'US Visa / 2x2 inch (51 × 51 mm)',
    width: 50.8,
    height: 50.8,
    defaultCols: 3,
  },
  custom: {
    id: 'custom',
    nameBn: 'কাস্টম সাইজ (Custom Size)',
    nameEn: 'Custom Size',
    width: 35,
    height: 45,
    defaultCols: 5,
  },
};

export const DEFAULT_ADJUSTMENTS: PhotoAdjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  sharpness: 0,
  smoothness: 0,
  skinLight: 0,
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
};

export const DEFAULT_MARGINS: MarginSettings = {
  top: 10,
  bottom: 10,
  left: 6,
  right: 6,
  colGap: 5,
  rowGap: 5,
};

export const DEFAULT_NID_MARGINS: MarginSettings = {
  top: 25,
  bottom: 25,
  left: 20,
  right: 20,
  colGap: 10,
  rowGap: 15,
};

// Standard Bangladesh Smart NID physical size (ISO/IEC 7810 ID-1 standard)
export const NID_STANDARD_WIDTH = 85.6; // mm
export const NID_STANDARD_HEIGHT = 53.98; // mm

export const DEFAULT_DOCUMENT_SETTINGS: DocumentPrintSettings = {
  pages: [],
  activePageIndex: 0,
  fitMode: 'contain',
  marginMm: 5,
  autoRotateToFit: false,
};

export interface LaminationPresetConfig {
  id: LaminationCardPreset;
  nameBn: string;
  nameEn: string;
  width: number; // mm
  height: number; // mm
}

export const LAMINATION_CARD_PRESETS: Record<LaminationCardPreset, LaminationPresetConfig> = {
  'smart-nid': {
    id: 'smart-nid',
    nameBn: 'স্মার্ট এনআইডি / ভোটার আইডি',
    nameEn: 'Smart NID / Voter ID',
    width: 85.6,
    height: 54,
  },
  'driving-license': {
    id: 'driving-license',
    nameBn: 'ড্রাইভিং লাইসেন্স (CR80)',
    nameEn: 'Driving License (CR80)',
    width: 85.6,
    height: 54,
  },
  'laminating-nid': {
    id: 'laminating-nid',
    nameBn: 'লেমিনেটিং এনআইডি (স্ট্যান্ডার্ড)',
    nameEn: 'Laminating NID (Standard)',
    width: 88,
    height: 55,
  },
  'old-voter-id': {
    id: 'old-voter-id',
    nameBn: 'পুরাতন ভোটার আইডি (বড়)',
    nameEn: 'Old Voter ID (Large)',
    width: 92,
    height: 60,
  },
  'student-id-h': {
    id: 'student-id-h',
    nameBn: 'স্টুডেন্ট আইডি (আড়াআড়ি)',
    nameEn: 'Student ID (Horizontal)',
    width: 86,
    height: 54,
  },
  'student-id-v': {
    id: 'student-id-v',
    nameBn: 'স্টুডেন্ট আইডি (লম্বালম্বি)',
    nameEn: 'Student ID (Vertical)',
    width: 54,
    height: 86,
  },
  'job-id-h': {
    id: 'job-id-h',
    nameBn: 'জব / অফিস আইডি (আড়াআড়ি)',
    nameEn: 'Job / Office ID (Horizontal)',
    width: 86,
    height: 54,
  },
  'job-id-v': {
    id: 'job-id-v',
    nameBn: 'জব / অফিস আইডি (লম্বালম্বি)',
    nameEn: 'Job / Office ID (Vertical)',
    width: 54,
    height: 86,
  },
  custom: {
    id: 'custom',
    nameBn: 'কাস্টম আইডি সাইজ (উভয় সমান)',
    nameEn: 'Custom ID Size (Equal)',
    width: 85.6,
    height: 54,
  },
};

/**
 * Computes side-by-side Top-Center coordinates (Front on Left, Back on Right)
 * so both cards are strictly equal, level at the top, and centered around the fold seam.
 */
export function alignLaminationTopCenter(options: {
  paperWidthMm: number;
  cardWidth: number;
  foldGap: number;
  topY?: number;
}) {
  const { paperWidthMm, cardWidth, foldGap, topY = 10 } = options;
  const totalWidth = cardWidth * 2 + foldGap;
  const startX = Math.max(2, Math.round(((paperWidthMm - totalWidth) / 2) * 10) / 10);
  const frontX = startX;
  const backX = Math.round((startX + cardWidth + foldGap) * 10) / 10;
  return {
    frontX,
    frontY: topY,
    backX,
    backY: topY,
  };
}

export const DEFAULT_LAMINATION_SETTINGS: LaminationCardSettings = {
  preset: 'smart-nid',
  frontImage: '',
  backImage: '',
  processedFrontImage: '',
  processedBackImage: '',
  cardWidth: 85.6,
  cardHeight: 54,
  // Centered horizontally on portrait A4 (210mm): (210 - 171.2) / 2 = 19.4mm, top = 10mm
  frontX: 19.4,
  frontY: 10,
  backX: 105,
  backY: 10,
  foldGap: 0,
  showFoldLine: true,
  outerCutGuide: 'none',
  imageFit: 'fill',
  backRotate180: false,
  autoWhiteDocument: false,
  docThreshold: 45,
  docContrast: 25,
  frontStraighten: 0,
  backStraighten: 0,
  frontCrop: null,
  backCrop: null,
  frontBrightness: 0,
  backBrightness: 0,
};
