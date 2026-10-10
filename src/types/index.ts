export type StudioMode = 'passport' | 'nid';

export type PhotoPresetType =
  | 'bd-passport'
  | 'bd-classic'
  | 'intl-passport'
  | 'bd-stamp'
  | 'couple'
  | 'us-passport'
  | 'custom';

export type PaperSizeType = 'a4' | '4r' | 'a5' | 'letter' | 'custom';

export type PaperOrientation = 'portrait' | 'landscape';

export type LayoutMode =
  | 'top-5'
  | 'top-4-couple'
  | 'top-6'
  | 'combo-passport-stamp'
  | 'full-grid'
  | 'full-grid-stamp'
  | 'manual'
  | 'freeform';

export type CuttingGuideStyle = 'none' | 'dashed' | 'solid' | 'crosshair' | 'scissors';

export type ColorProfile = 'srgb' | 'cmyk' | 'bw';

export type PrintQuality = 150 | 300 | 600; // DPI

export interface PaperDimensions {
  width: number; // in mm
  height: number; // in mm
  name: string;
}

export interface PhotoPresetConfig {
  id: PhotoPresetType;
  nameBn: string;
  nameEn: string;
  width: number; // mm
  height: number; // mm
  defaultCols: number;
}

export interface MarginSettings {
  top: number; // mm
  bottom: number; // mm
  left: number; // mm
  right: number; // mm
  colGap: number; // mm
  rowGap: number; // mm
}

export interface CropRect {
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  width: number; // percentage 0-100
  height: number; // percentage 0-100
}

export interface PhotoAdjustments {
  brightness: number; // -100 to 100, 0 is normal
  contrast: number; // -100 to 100, 0 is normal
  saturation: number; // -100 to 100, 0 is normal
  sharpness: number; // 0 to 100, 0 is none
  exposure: number; // -100 to 100, 0 is normal
  warmth: number; // -100 to 100, 0 is normal
  rotation: number; // degrees: 0, 90, 180, 270 or fine angle
  flipH: boolean;
  flipV: boolean;
  backgroundMode: 'original' | 'white' | 'studio-blue' | 'sky-blue' | 'off-white' | 'custom';
  customBgColor: string;
  bgSensitivity: number; // 10 to 90
  bgFeather: number; // 1 to 10
  crop: CropRect | null;
}

export interface StudioPhotoItem {
  id: string;
  originalSrc: string; // original high-res base64 / blob
  processedSrc: string; // processed image base64
  adjustments: PhotoAdjustments;
  label?: string;
  type?: 'individual' | 'couple';
}

export interface PlacedSheetItem {
  id: string; // unique item instance id
  photoId: string; // references StudioPhotoItem.id
  x: number; // mm
  y: number; // mm
  width: number; // mm
  height: number; // mm
  preset: PhotoPresetType;
  customPositioned?: boolean;
}

export interface NIDCardSettings {
  frontImage: string | null;
  backImage: string | null;
  processedFrontImage: string | null;
  processedBackImage: string | null;
  cardWidth: number; // default 85.6 mm
  cardHeight: number; // default 53.98 mm
  verticalSpacing: number; // mm gap between front and back
  centerOnPage: boolean;
  autoWhiteDocument: boolean;
  docThreshold: number; // 0 to 100
  docContrast: number; // 0 to 100
  frontStraighten: number; // -45 to 45 deg
  backStraighten: number; // -45 to 45 deg
  frontCrop: CropRect | null;
  backCrop: CropRect | null;
  frontBrightness: number;
  backBrightness: number;
}

export interface StudioState {
  mode: StudioMode;
  lang: 'bn' | 'en';
  theme: 'light' | 'dark';
  // Passport state
  photoPreset: PhotoPresetType;
  customPhotoWidth: number;
  customPhotoHeight: number;
  paperSize: PaperSizeType;
  customPaperWidth: number;
  customPaperHeight: number;
  orientation: PaperOrientation;
  layoutMode: LayoutMode;
  manualCount: number;
  margins: MarginSettings;
  cuttingGuide: CuttingGuideStyle;
  bleedArea: number; // mm (0, 0.5, 1, 2)
  colorProfile: ColorProfile;
  printQuality: PrintQuality;
  photos: StudioPhotoItem[];
  activePhotoIndex: number;
  autoRemoveBgOnUpload: boolean;
  uploadBgMode: 'studio-blue' | 'white' | 'sky-blue' | 'off-white';
  placedItems?: PlacedSheetItem[];
  selectedItemId?: string | null;
  // NID state
  nid: NIDCardSettings;
  nidMargins: MarginSettings;
}
