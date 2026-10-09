import { MarginSettings, PaperDimensions, PaperSizeType, PhotoAdjustments, PhotoPresetConfig, PhotoPresetType } from '../types';

export const PAPER_SIZES: Record<PaperSizeType, PaperDimensions> = {
  a4: {
    name: 'A4 (210 × 297 mm)',
    width: 210,
    height: 297,
  },
  '4r': {
    name: '4R / 4x6" (102 × 152 mm)',
    width: 102,
    height: 152,
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
  custom: {
    name: 'Custom (কাস্টম)',
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
    nameBn: 'কাপল ছবি / যুগল (৫০ × ৪০ মিমি - সর্বোচ্চ ৪টি)',
    nameEn: 'Couple Photo (50 × 40 mm - Max 4)',
    width: 50,
    height: 40,
    defaultCols: 4,
  },
  'us-passport': {
    id: 'us-passport',
    nameBn: 'আমেরিকান / ভিসা ২×২ ইঞ্চি (৫১ × ৫১ মিমি)',
    nameEn: 'US Visa / 2x2 inch (51 × 51 mm)',
    width: 50.8,
    height: 50.8,
    defaultCols: 4,
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
