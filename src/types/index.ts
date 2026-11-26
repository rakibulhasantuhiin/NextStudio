import { CvData } from './cv';
import { ReadyDocState } from './readyDocs';
export * from './cv';
export * from './readyDocs';

export type StudioMode =
  | 'passport'
  | 'photoprint'
  | 'nid'
  | 'lamination'
  | 'document'
  | 'cv'
  | 'readydocs'
  | 'tools';

export type PhotoPresetType =
  | 'bd-passport'
  | 'bd-classic'
  | 'intl-passport'
  | 'bd-stamp'
  | 'couple'
  | 'us-passport'
  | 'custom';

export type PaperSizeType =
  | 'a4'
  | 'a5'
  | 'a6'
  | 'a3'
  | 'b5'
  | 'letter'
  | 'legal'
  | '2r'
  | '3r'
  | '4r'
  | '5r'
  | '6r'
  | '8r'
  | '10r'
  | 'custom';

export type DocumentFitMode = 'contain' | 'stretch' | 'cover';

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
  smoothness?: number; // 0 to 100, skin grain/blemish smoothing
  skinLight?: number; // -50 to 50, adaptive facial shadow lift
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

export type StudioBackdropPreset = 'classic-blue' | 'soft-blue' | 'white' | 'custom';

export type StudioEnhanceIntensity = 'light' | 'normal' | 'strong';

export interface StudioPhotoItem {
  id: string;
  originalSrc: string; // working/cropped source
  rawOriginalSrc?: string; // untouched pre-AI/pre-crop image for Before/After comparison & re-cropping
  processedSrc: string; // active image rendered onto the print sheet
  enhancedSrc?: string; // cached AI/studio-enhanced output
  unenhancedSrc?: string; // cached non-enhanced output for instant Before/After job toggle
  cutoutSrc?: string; // cached transparent aligned portrait for instant BG color switching
  useEnhanced?: boolean; // true = এনহ্যান্স করা, false = এনহ্যান্স ছাড়া
  aiBgPreset?: StudioBackdropPreset;
  customBgColor?: string;
  enhanceIntensity?: StudioEnhanceIntensity;
  needsReprocess?: boolean; // true when BG/enhance settings changed since last processing
  isUserCropped?: boolean; // true when crop & straighten were already baked into originalSrc
  clarityBaseline?: {
    sharpness: number;
    smoothness: number;
  };
  fileName?: string;
  fileSizeBytes?: number;
  dimensionsLabel?: string;
  adjustments: PhotoAdjustments;
  label?: string;
  type?: 'individual' | 'couple';
}

export interface PhotoCopyAllocation {
  sizeMode: 'passport' | 'stamp' | 'both';
  passportCount: number;
  stampCount: number;
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

export type LaminationCardPreset =
  | 'smart-nid'
  | 'driving-license'
  | 'laminating-nid'
  | 'old-voter-id'
  | 'student-id-h'
  | 'student-id-v'
  | 'job-id-h'
  | 'job-id-v'
  | 'custom';

export interface LaminationCardSettings {
  preset: LaminationCardPreset;
  frontImage: string | null;
  backImage: string | null;
  processedFrontImage: string | null;
  processedBackImage: string | null;
  /** Strictly identical physical dimensions applied to BOTH Front & Back cards */
  cardWidth: number; // mm
  cardHeight: number; // mm
  /** Millimeter coordinates on the sheet for independent or collective dragging */
  frontX: number; // mm
  frontY: number; // mm
  backX: number; // mm
  backY: number; // mm
  /** Gap between Front (left) and Back (right) along the fold seam (0mm = touching crease) */
  foldGap: number; // mm
  showFoldLine: boolean;
  outerCutGuide: CuttingGuideStyle;
  imageFit: 'fill' | 'cover';
  backRotate180: boolean;
  autoWhiteDocument: boolean;
  docThreshold: number;
  docContrast: number;
  frontStraighten: number;
  backStraighten: number;
  frontCrop: CropRect | null;
  backCrop: CropRect | null;
  frontBrightness: number;
  backBrightness: number;
}

export interface DocumentPageItem {
  id: string;
  name: string;
  originalSrc: string;
  processedSrc: string;
  rotation: number; // degrees
  flipH: boolean;
  flipV: boolean;
  autoWhiteDocument: boolean;
  docThreshold: number; // 0 to 100
  docContrast: number; // 0 to 100
  brightness: number; // -50 to 50
  contrast: number; // -50 to 50
  crop: CropRect | null;
  naturalWidth?: number;
  naturalHeight?: number;
}

export interface DocumentPrintSettings {
  pages: DocumentPageItem[];
  activePageIndex: number;
  fitMode: DocumentFitMode;
  marginMm: number;
  autoRotateToFit: boolean;
}

export type PhotoPrintSizeId =
  | '4up-a4'
  | 'passport-35x45'
  | 'passport-40x50'
  | 'stamp-20x25'
  | '2r'
  | '3r'
  | '4r'
  | '5r'
  | '6r'
  | '8r'
  | '10r'
  | 'sq-4x4'
  | 'sq-5x5'
  | 'a6'
  | 'a5'
  | 'a4-full'
  | 'a3-full'
  | 'custom';

export interface PhotoPrintSlotItem {
  id: string;
  imageSrc: string;
  name: string;
  rotation: number; // 0, 90, 180, 270
  fitMode: 'cover' | 'contain';
}

export interface PhotoPrintSlotRectOverride {
  x: number; // mm
  y: number; // mm
  width?: number; // mm
  height?: number; // mm
}

export interface PhotoPrintSettings {
  sizeId: PhotoPrintSizeId;
  customWidthMm: number;
  customHeightMm: number;
  fitMode: 'cover' | 'contain';
  fillMode: 'individual' | 'repeat-all';
  marginMm: number;
  gapMm: number;
  autoRotateToFit: boolean;
  slots: (PhotoPrintSlotItem | null)[];
  slotPositions?: Record<number, PhotoPrintSlotRectOverride>;
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
  autoRemoveBgOnUpload?: boolean;
  uploadBgMode?: 'studio-blue' | 'white' | 'sky-blue' | 'off-white';
  placedItems?: PlacedSheetItem[];
  selectedItemId?: string | null;
  // NID state
  nid: NIDCardSettings;
  nidMargins: MarginSettings;
  // Lamination Side-by-Side ID Card state
  lamination?: LaminationCardSettings;
  // Document / Fit-to-Paper state
  documentSettings?: DocumentPrintSettings;
  // Photo Print (4R / 4-Up A4 / Studio Print Sizes) state
  photoPrintSettings?: PhotoPrintSettings;
  // CV Builder state
  cvData?: CvData;
  // Ready-Made Documents state
  readyDocState?: ReadyDocState;
}
