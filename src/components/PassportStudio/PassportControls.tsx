import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowUp,
  Camera,
  Check,
  Copy,
  Edit3,
  Grid,
  Loader2,
  Minus,
  Move,
  Plus,
  Printer,
  RotateCcw,
  Scissors,
  Sparkles,
  Trash2,
  Upload,
  User,
  Users,
  X,
} from 'lucide-react';
import {
  CuttingGuideStyle,
  LayoutMode,
  MarginSettings,
  PaperOrientation,
  PaperSizeType,
  PhotoCopyAllocation,
  PhotoPresetType,
  PlacedSheetItem,
  StudioBackdropPreset,
  StudioEnhanceIntensity,
  StudioPhotoItem,
} from '../../types';
import { PAPER_SIZES, PHOTO_PRESETS } from '../../utils/constants';
import { calculateMaxSpreadColGap } from '../../utils/layoutCalculator';
import {
  InspectorSection,
  InspectorTabs,
  PaperOutputSection,
} from '../ui/InspectorPrimitives';

interface Props {
  lang: 'bn' | 'en';
  photos: StudioPhotoItem[];
  activePhotoIndex: number;
  setActivePhotoIndex: (idx: number) => void;
  onSmartUploadFiles: (files: File[]) => void;
  onRemovePhoto: (index: number) => void;
  onDuplicatePhoto: (index: number) => void;
  onOpenEditor: (index: number) => void;
  onOpenCropModal: (index: number) => void;
  onOpenWebcam: () => void;
  coupleMode: boolean;
  setCoupleMode: (val: boolean) => void;
  autoBgRemove: boolean;
  setAutoBgRemove: (val: boolean) => void;
  selectedBgPreset: StudioBackdropPreset;
  customBgColor: string;
  onSelectBackdrop: (bgPreset: StudioBackdropPreset, customHex?: string) => void;
  autoStudioEnhance: boolean;
  setAutoStudioEnhance: (val: boolean) => void;
  enhanceIntensity: StudioEnhanceIntensity;
  setEnhanceIntensity: (val: StudioEnhanceIntensity) => void;
  photoAllocations: Record<string, PhotoCopyAllocation>;
  onUpdatePhotoAllocation: (photoId: string, next: PhotoCopyAllocation) => void;
  isAiGenerating?: boolean;
  aiProgress?: number;
  aiStatusText?: string;
  aiError?: string | null;
  onClearAiError?: () => void;
  isUploading?: boolean;
  preset: PhotoPresetType;
  setPreset: (preset: PhotoPresetType) => void;
  customWidth: number;
  setCustomWidth: (w: number) => void;
  customHeight: number;
  setCustomHeight: (h: number) => void;
  paperSize: PaperSizeType;
  setPaperSize: (size: PaperSizeType) => void;
  customPaperWidth?: number;
  setCustomPaperWidth?: (w: number) => void;
  customPaperHeight?: number;
  setCustomPaperHeight?: (h: number) => void;
  orientation: PaperOrientation;
  setOrientation: (o: PaperOrientation) => void;
  layoutMode: LayoutMode;
  setLayoutMode: (mode: LayoutMode) => void;
  manualCount: number;
  setManualCount: (updater: number | ((prev: number) => number)) => void;
  margins: MarginSettings;
  setMargins: (updater: MarginSettings | ((prev: MarginSettings) => MarginSettings)) => void;
  cuttingGuide: CuttingGuideStyle;
  setCuttingGuide: (g: CuttingGuideStyle) => void;
  bleedArea: number;
  setBleedArea: (b: number) => void;
  colorProfile: 'srgb' | 'cmyk' | 'bw';
  setColorProfile: (p: 'srgb' | 'cmyk' | 'bw') => void;
  dpi: 150 | 300 | 600;
  setDpi: (dpi: 150 | 300 | 600) => void;
  placedItems?: PlacedSheetItem[];
  selectedItemId?: string | null;
  onSelectItem?: (id: string | null) => void;
  onAddStampCopy?: (photoId?: string) => void;
  onAddPassportCopy?: (photoId?: string) => void;
  onAutoAlignGrid?: () => void;
  onResetPlacedItems?: () => void;
  onDistributeAllPhotos?: () => void;
  onSwitchItemPhoto?: (itemId: string, photoId: string) => void;
  onCycleItemPhoto?: (itemId: string) => void;
  onToggleItemSize?: (id: string, targetPreset: 'bd-passport' | 'bd-stamp') => void;
  onNudgeItem?: (id: string, deltaX: number, deltaY: number) => void;
  onDuplicateItem?: (id: string) => void;
  onDeleteItem?: (id: string) => void;
}

type PassportTab = 'photos' | 'layout' | 'paper';

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const PassportControls: React.FC<Props> = ({
  lang,
  photos,
  activePhotoIndex,
  setActivePhotoIndex,
  onSmartUploadFiles,
  onRemovePhoto,
  onDuplicatePhoto,
  onOpenEditor,
  onOpenCropModal,
  onOpenWebcam,
  coupleMode,
  setCoupleMode,
  autoBgRemove,
  setAutoBgRemove,
  selectedBgPreset,
  customBgColor,
  onSelectBackdrop,
  autoStudioEnhance,
  setAutoStudioEnhance,
  enhanceIntensity,
  setEnhanceIntensity,
  photoAllocations,
  onUpdatePhotoAllocation,
  isAiGenerating = false,
  aiProgress = 0,
  aiStatusText = '',
  aiError = null,
  onClearAiError,
  isUploading = false,
  preset,
  setPreset,
  customWidth,
  setCustomWidth,
  customHeight,
  setCustomHeight,
  paperSize,
  setPaperSize,
  customPaperWidth = 210,
  setCustomPaperWidth,
  customPaperHeight = 297,
  setCustomPaperHeight,
  orientation,
  setOrientation,
  layoutMode,
  setLayoutMode,
  manualCount,
  setManualCount,
  margins,
  setMargins,
  cuttingGuide,
  setCuttingGuide,
  colorProfile,
  setColorProfile,
  dpi,
  setDpi,
  placedItems = [],
  selectedItemId,
  onAddStampCopy,
  onAddPassportCopy,
  onAutoAlignGrid,
  onResetPlacedItems,
  onSwitchItemPhoto,
  onToggleItemSize,
  onNudgeItem,
  onDuplicateItem,
  onDeleteItem,
}) => {
  const [activeTab, setActiveTab] = useState<PassportTab>('photos');
  const [showServiceSwitcher, setShowServiceSwitcher] = useState<boolean>(false);
  const [pendingBoyFile, setPendingBoyFile] = useState<File | null>(null);
  const [pendingGirlFile, setPendingGirlFile] = useState<File | null>(null);

  const mainFileInputRef = useRef<HTMLInputElement>(null);
  const boySlotInputRef = useRef<HTMLInputElement>(null);
  const girlSlotInputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0 || isAiGenerating) return;
    onClearAiError?.();
    const arr = Array.from(files);

    if (!coupleMode) {
      onSmartUploadFiles(arr);
      return;
    }

    if (arr.length >= 2) {
      setPendingBoyFile(null);
      setPendingGirlFile(null);
      onSmartUploadFiles([arr[0], arr[1]]);
      return;
    }

    const picked = arr[0];
    if (!pendingBoyFile) {
      if (pendingGirlFile) {
        const girl = pendingGirlFile;
        setPendingBoyFile(null);
        setPendingGirlFile(null);
        onSmartUploadFiles([picked, girl]);
      } else {
        setPendingBoyFile(picked);
      }
    } else {
      const boy = pendingBoyFile;
      setPendingBoyFile(null);
      setPendingGirlFile(null);
      onSmartUploadFiles([boy, picked]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  const updateMargin = <K extends keyof MarginSettings>(key: K, val: number) => {
    setMargins((prev) => ({ ...prev, [key]: val }));
  };

  const activePhoto = photos[activePhotoIndex] || (photos.length > 0 ? photos[0] : null);
  const currentPaper =
    paperSize === 'custom'
      ? { ...PAPER_SIZES.custom, width: customPaperWidth, height: customPaperHeight }
      : PAPER_SIZES[paperSize];
  const isLandscape = orientation === 'landscape';
  const paperWidthMm = isLandscape ? currentPaper.height : currentPaper.width;
  const effectivePhotoWidth =
    preset === 'custom' ? customWidth : PHOTO_PRESETS[preset]?.width || 35;
  const effectivePhotoHeight =
    preset === 'custom' ? customHeight : PHOTO_PRESETS[preset]?.height || 45;
  const currentCols =
    layoutMode === 'top-5'
      ? preset === 'custom'
        ? Math.max(1, Math.min(5, Math.floor((paperWidthMm - 7) / Math.max(1, effectivePhotoWidth))))
        : Math.min(
            PHOTO_PRESETS[preset]?.defaultCols || 5,
            Math.max(1, Math.floor((paperWidthMm - 7) / Math.max(1, effectivePhotoWidth)))
          )
      : layoutMode === 'top-4-couple'
      ? 4
      : layoutMode === 'top-6'
      ? 6
      : 5;

  const maxSpreadGap = calculateMaxSpreadColGap({
    paperWidth: paperWidthMm,
    photoWidth: effectivePhotoWidth,
    colsPerRow: currentCols,
    minSideMargin: 3.5,
  });

  const handleAutoSpread = () => {
    if (maxSpreadGap > 0) {
      setMargins((prev) => ({
        ...prev,
        colGap: maxSpreadGap,
        left: 3.5,
        right: 3.5,
      }));
    }
  };

  const sheetPassportCount = placedItems.filter(
    (i) =>
      i.preset === 'bd-passport' ||
      i.preset === 'intl-passport' ||
      (i.width === 35 && i.height === 45)
  ).length;
  const sheetStampCount = placedItems.filter(
    (i) => i.preset === 'bd-stamp' || (i.width === 20 && i.height === 25)
  ).length;
  const selectedItem = selectedItemId
    ? placedItems.find((i) => i.id === selectedItemId) || null
    : null;
  const isSelectedItemStamp = selectedItem
    ? selectedItem.width <= 25 || selectedItem.preset === 'bd-stamp'
    : false;

  const activeServiceName = coupleMode
    ? lang === 'bn'
      ? 'কাপল পাসপোর্ট ছবি (৫০×৪০ মিমি)'
      : 'Couple Passport Photo'
    : lang === 'bn'
    ? PHOTO_PRESETS[preset]?.nameBn || 'পাসপোর্ট ছবি'
    : PHOTO_PRESETS[preset]?.nameEn || 'Passport Photo';

  const layoutTemplates: {
    id: LayoutMode;
    titleEn: string;
    titleBn: string;
    subEn: string;
    subBn: string;
  }[] = [
    {
      id: 'top-5',
      titleEn: 'Top Strip Row',
      titleBn: 'উপরে ১ সারি',
      subEn: `${currentCols} copies (${effectivePhotoWidth}×${effectivePhotoHeight}mm)`,
      subBn: `১ সারিতে ${currentCols}টি (${effectivePhotoWidth}×${effectivePhotoHeight})`,
    },
    {
      id: 'combo-passport-stamp',
      titleEn: 'Passport + Stamp',
      titleBn: 'পাসপোর্ট + স্ট্যাম্প',
      subEn: '5 Passport + 16 Stamp',
      subBn: '৫ পাসপোর্ট + ১৬ স্ট্যাম্প',
    },
    {
      id: 'full-grid',
      titleEn: 'Full Page Passport',
      titleBn: 'পুরো পেজ পাসপোর্ট',
      subEn: 'Auto-fill full sheet',
      subBn: 'পুরো পাতা ভর্তি কপি',
    },
    {
      id: 'full-grid-stamp',
      titleEn: 'All Stamp Grid',
      titleBn: 'সব স্ট্যাম্প সাইজ',
      subEn: 'Fill sheet with 32+ stamps',
      subBn: 'পুরো পাতায় ৩২+ স্ট্যাম্প',
    },
    {
      id: 'manual',
      titleEn: 'Manual Copies',
      titleBn: 'নির্দিষ্ট সংখ্যা',
      subEn: `${manualCount} custom copies`,
      subBn: `${manualCount}টি কাস্টম কপি`,
    },
    {
      id: 'freeform',
      titleEn: 'Freeform Sheet',
      titleBn: 'মুক্ত ক্যানভাস',
      subEn: 'Drag freely anywhere',
      subBn: 'ইচ্ছামতো সাজান',
    },
  ];

  const getAlloc = (photoId: string): PhotoCopyAllocation => {
    const existing = photoAllocations[photoId];
    if (existing) return existing;
    return preset === 'bd-stamp'
      ? { sizeMode: 'stamp', passportCount: 0, stampCount: 8 }
      : { sizeMode: 'passport', passportCount: 4, stampCount: 0 };
  };

  return (
    <div className="space-y-3.5 text-slate-800 dark:text-slate-100">
      {/* 1. Top Service Header Card ("সার্ভিস: পাসপোর্ট ছবি" + "বদলান") */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-white/15 bg-white/85 dark:bg-slate-900/70 p-3 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {lang === 'bn' ? 'সার্ভিস:' : 'Service:'}{' '}
            </span>
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              {activeServiceName}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowServiceSwitcher((s) => !s)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-400 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer shrink-0 transition"
          >
            {showServiceSwitcher
              ? lang === 'bn'
                ? 'বন্ধ'
                : 'Done'
              : lang === 'bn'
              ? 'বদলান'
              : 'Change'}
          </button>
        </div>

        {/* Expandable Service Preset & Single/Couple Switcher */}
        {showServiceSwitcher && (
          <div className="pt-2.5 border-t border-slate-200/70 dark:border-white/10 space-y-2.5">
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl glass-track">
              <button
                type="button"
                disabled={isAiGenerating}
                onClick={() => {
                  setCoupleMode(false);
                  setPendingBoyFile(null);
                  setPendingGirlFile(null);
                }}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                  !coupleMode
                    ? 'glass-btn-primary text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'সিঙ্গেল ছবি' : 'Single Photo'}</span>
              </button>
              <button
                type="button"
                disabled={isAiGenerating}
                onClick={() => {
                  setCoupleMode(true);
                  setPendingBoyFile(null);
                  setPendingGirlFile(null);
                }}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                  coupleMode
                    ? 'glass-btn-primary text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'কাপল মোড' : 'Couple Mode'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(PHOTO_PRESETS).map(([key, item]) => {
                const isSelected = preset === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPreset(key as PhotoPresetType)}
                    className={`p-2 rounded-xl text-left transition cursor-pointer ${
                      isSelected
                        ? 'glass-btn-primary text-white'
                        : 'glass-tile text-slate-800 dark:text-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-[11px] leading-tight truncate">
                        {lang === 'bn' ? item.nameBn : item.nameEn}
                      </span>
                      {isSelected && <Check className="w-3 h-3 shrink-0" />}
                    </div>
                    <span
                      className={`text-[10px] font-mono block mt-0.5 tabular-nums ${
                        isSelected ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {item.width} × {item.height} mm
                    </span>
                  </button>
                );
              })}
            </div>

            {preset === 'custom' && (
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl glass-track">
                <div>
                  <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                    {lang === 'bn' ? 'প্রস্থ (মিমি)' : 'Width (mm)'}
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="250"
                    value={customWidth}
                    onChange={(e) => setCustomWidth(Math.max(10, Number(e.target.value)))}
                    className="w-full px-2 py-1 rounded-lg glass-input text-xs font-mono font-semibold tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                    {lang === 'bn' ? 'উচ্চতা (মিমি)' : 'Height (mm)'}
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="250"
                    value={customHeight}
                    onChange={(e) => setCustomHeight(Math.max(10, Number(e.target.value)))}
                    className="w-full px-2 py-1 rounded-lg glass-input text-xs font-mono font-semibold tabular-nums"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Compact Section Tabs */}
      <InspectorTabs<PassportTab>
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'photos', label: lang === 'bn' ? 'ফাইল ও কপি' : 'Files & Copies' },
          { id: 'layout', label: lang === 'bn' ? 'গ্রিড ও গ্যাপ' : 'Grid & Gaps' },
          { id: 'paper', label: lang === 'bn' ? 'পেপার ও প্রিন্ট' : 'Paper & Print' },
        ]}
      />

      {/* TAB 1: STEP-BY-STEP FILE UPLOAD, AUTO STUDIO & PER-PHOTO COPIES */}
      {activeTab === 'photos' && (
        <div className="space-y-3.5">
          {/* Hidden device inputs */}
          <input
            ref={mainFileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => {
              handleFilesSelected(e.target.files);
              e.target.value = '';
            }}
            className="hidden"
          />
          <input
            ref={boySlotInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                if (pendingGirlFile) {
                  const g = pendingGirlFile;
                  setPendingBoyFile(null);
                  setPendingGirlFile(null);
                  onSmartUploadFiles([f, g]);
                } else {
                  setPendingBoyFile(f);
                }
              }
              e.target.value = '';
            }}
            className="hidden"
          />
          <input
            ref={girlSlotInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                if (pendingBoyFile) {
                  const b = pendingBoyFile;
                  setPendingBoyFile(null);
                  setPendingGirlFile(null);
                  onSmartUploadFiles([b, f]);
                } else {
                  setPendingGirlFile(f);
                }
              }
              e.target.value = '';
            }}
            className="hidden"
          />

          {/* STEP 2 CARD: AUTO STUDIO PASSPORT UPLOAD + THUMBNAILS + WEBCAM + AUTO BG/ENHANCE */}
          <div className="rounded-2xl border border-slate-200/90 dark:border-white/15 bg-white/85 dark:bg-slate-900/70 p-3.5 shadow-xs space-y-3">
            {/* Step Heading */}
            <div className="flex items-start justify-between gap-2.5">
              <div className="flex items-start gap-2.5 min-w-0">
                <span className="w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {lang === 'bn' ? '২' : '2'}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                      {lang === 'bn' ? 'অটো স্টুডিও পাসপোর্ট' : 'Auto Studio Passport'}
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                    {coupleMode
                      ? lang === 'bn'
                        ? 'কাপল পাসপোর্টের জন্য ২টি ছবি দিন (ছেলে বামে + মেয়ে ডানে)'
                        : 'Select 2 photos for Couple Passport (Boy Left + Girl Right)'
                      : lang === 'bn'
                      ? 'ছবি দিন — নিখুঁত ব্যাকগ্রাউন্ড রিমুভ, ক্রপ, সোজা ও প্রিন্টের জন্য প্রস্তুত হবে'
                      : 'Upload portrait(s) — auto background removal, interactive crop & print ready'}
                  </p>
                </div>
              </div>
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            </div>

            {/* Dashed Dropzone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => {
                if (!isAiGenerating && !isUploading) mainFileInputRef.current?.click();
              }}
              className={`rounded-xl border-2 border-dashed p-5 text-center transition cursor-pointer ${
                isAiGenerating || isUploading
                  ? 'border-blue-400/60 bg-blue-50/40 dark:bg-blue-950/20 cursor-wait'
                  : 'border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/30 hover:border-blue-500 hover:bg-blue-50/35 dark:hover:bg-blue-950/25'
              }`}
            >
              <div className="flex flex-col items-center gap-1.5">
                {isAiGenerating || isUploading ? (
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                ) : (
                  <Upload className="w-6 h-6 text-slate-500 dark:text-slate-400" />
                )}
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  {isAiGenerating
                    ? aiStatusText || (lang === 'bn' ? 'প্রসেস হচ্ছে...' : 'Processing...')
                    : lang === 'bn'
                    ? 'ছবি বা ডকুমেন্ট বেছে নিন'
                    : 'Choose Photo or File'}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {lang === 'bn'
                    ? 'ক্লিক করুন বা টেনে এনে ছাড়ুন · একাধিক দেওয়া যাবে · JPG, PNG'
                    : 'Click or drag & drop · Multiple allowed · JPG, PNG'}
                </span>
              </div>
            </div>

            {/* Couple Mode 2-file helper strip when 1st photo is staged */}
            {coupleMode && !isAiGenerating && (pendingBoyFile || pendingGirlFile) && (
              <div className="p-2.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-300/60 dark:border-blue-800 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-blue-800 dark:text-blue-200">
                    {lang === 'bn'
                      ? 'দ্বিতীয় ছবিটি সিলেক্ট করুন (অটো কাপল তৈরি হবে):'
                      : 'Select 2nd photo to create Couple Passport:'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setPendingBoyFile(null);
                      setPendingGirlFile(null);
                    }}
                    className="p-1 text-slate-400 hover:text-red-500 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => boySlotInputRef.current?.click()}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border flex items-center justify-center gap-1 cursor-pointer ${
                      pendingBoyFile
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                        : 'bg-white dark:bg-slate-900 border-blue-400/50 text-blue-700 dark:text-blue-300'
                    }`}
                  >
                    {pendingBoyFile ? <Check className="w-3 h-3" /> : <Upload className="w-3 h-3" />}
                    <span>{lang === 'bn' ? 'ছেলে (বামে)' : 'Boy (Left)'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => girlSlotInputRef.current?.click()}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border flex items-center justify-center gap-1 cursor-pointer ${
                      pendingGirlFile
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                        : 'bg-white dark:bg-slate-900 border-pink-400/50 text-pink-700 dark:text-pink-300'
                    }`}
                  >
                    {pendingGirlFile ? <Check className="w-3 h-3" /> : <Upload className="w-3 h-3" />}
                    <span>{lang === 'bn' ? 'মেয়ে (ডানে)' : 'Girl (Right)'}</span>
                  </button>
                </div>
                {(pendingBoyFile || pendingGirlFile) && (
                  <button
                    type="button"
                    onClick={() => {
                      const b = pendingBoyFile;
                      setPendingBoyFile(pendingGirlFile);
                      setPendingGirlFile(b);
                    }}
                    className="w-full py-1 rounded-lg text-[10px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-white/60 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <ArrowLeftRight className="w-3 h-3" />
                    <span>{lang === 'bn' ? 'বাম ↔ ডান অদল-বদল' : 'Swap Boy ↔ Girl'}</span>
                  </button>
                )}
              </div>
            )}

            {/* Uploaded Thumbnails Verification Strip */}
            {photos.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {lang === 'bn'
                      ? `${photos.length}টি ফাইল বাছা হয়েছে — নিচে দেখে নিন ঠিক ফাইলটাই কি না`
                      : `${photos.length} file(s) selected — verify thumbnail below`}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {photos.map((item, idx) => {
                    const isSelected = idx === activePhotoIndex;
                    const sizeText = formatBytes(item.fileSizeBytes);
                    const metaText = [sizeText, item.dimensionsLabel].filter(Boolean).join(' · ');
                    return (
                      <div
                        key={item.id}
                        onClick={() => setActivePhotoIndex(idx)}
                        className={`relative rounded-xl border p-1.5 transition cursor-pointer bg-white dark:bg-slate-900 ${
                          isSelected
                            ? 'border-blue-600 ring-2 ring-blue-500/20'
                            : 'border-slate-200 dark:border-slate-700 hover:border-blue-400'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemovePhoto(idx);
                          }}
                          className="absolute top-2.5 right-2.5 z-10 w-5 h-5 rounded-full bg-white/95 hover:bg-red-600 text-rose-600 hover:text-white shadow border border-slate-200 flex items-center justify-center cursor-pointer transition"
                          title={lang === 'bn' ? 'মুছুন' : 'Remove'}
                        >
                          <X className="w-3 h-3" />
                        </button>

                        <div className="aspect-[4/4.3] w-full rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800">
                          <img
                            src={item.rawOriginalSrc || item.processedSrc || item.originalSrc}
                            alt={item.fileName || `Photo ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="mt-1.5 px-0.5">
                          <p className="text-[11px] font-bold text-slate-800 dark:text-slate-100 truncate">
                            {item.fileName || (lang === 'bn' ? `ছবি ${idx + 1}` : `Photo ${idx + 1}`)}
                          </p>
                          {metaText && (
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate font-mono tabular-nums">
                              {metaText}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Live Webcam Capture Button */}
            <button
              type="button"
              onClick={onOpenWebcam}
              className="w-full py-2.5 px-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 hover:border-blue-500 hover:bg-blue-50/40 dark:hover:bg-blue-950/30 text-slate-800 dark:text-slate-100 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Camera className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>{lang === 'bn' ? 'ওয়েবক্যাম থেকে ছবি তুলুন' : 'Capture from Webcam'}</span>
            </button>

            {/* Inline Processing Error Banner */}
            {aiError && (
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 text-[11px] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="flex-1 leading-snug">{aiError}</span>
                {onClearAiError && (
                  <button
                    type="button"
                    onClick={onClearAiError}
                    className="p-0.5 hover:bg-red-500/15 rounded cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Auto Background Removal & Studio Quality Panel */}
            <div className="rounded-xl border border-dashed border-slate-300/90 dark:border-slate-700 bg-slate-50/75 dark:bg-slate-800/40 p-3 space-y-2.5">
              {/* Auto BG Replace Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoBgRemove}
                  onChange={(e) => setAutoBgRemove(e.target.checked)}
                  className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                  {lang === 'bn'
                    ? 'ব্যাকগ্রাউন্ড স্বয়ংক্রিয়ভাবে বদলে দিন'
                    : 'Automatically replace background'}
                </span>
              </label>

              {/* Color Swatches: White, Blue, Soft Blue, Custom */}
              <div className="flex items-center gap-1.5 flex-wrap pl-1">
                <button
                  type="button"
                  onClick={() => onSelectBackdrop('white')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                    selectedBgPreset === 'white'
                      ? 'bg-blue-600/10 border-blue-600 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500/30'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-400'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full bg-white border border-slate-300 shrink-0" />
                  <span>{lang === 'bn' ? 'সাদা' : 'White'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectBackdrop('classic-blue')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                    selectedBgPreset === 'classic-blue'
                      ? 'bg-blue-600/10 border-blue-600 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500/30'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-400'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full bg-[#1B8CF2] shrink-0" />
                  <span>{lang === 'bn' ? 'নীল' : 'Blue'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectBackdrop('soft-blue')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                    selectedBgPreset === 'soft-blue'
                      ? 'bg-blue-600/10 border-blue-600 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500/30'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-400'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full bg-[#4EB0F7] shrink-0" />
                  <span>{lang === 'bn' ? 'হালকা নীল' : 'Soft Blue'}</span>
                </button>

                <label
                  title={lang === 'bn' ? 'পছন্দমতো রঙ পিন/সিলেক্ট করুন' : 'Pick Custom Color'}
                  className={`h-8 px-2 rounded-lg border flex items-center gap-1.5 cursor-pointer bg-white dark:bg-slate-900 ${
                    selectedBgPreset === 'custom'
                      ? 'border-blue-600 ring-1 ring-blue-500/30 text-blue-700 dark:text-blue-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <input
                    type="color"
                    value={customBgColor}
                    onChange={(e) => onSelectBackdrop('custom', e.target.value)}
                    className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent p-0"
                  />
                  <span className="text-[11px] font-bold">
                    {lang === 'bn' ? 'কাস্টম' : 'Custom'}
                  </span>
                </label>
              </div>

              {/* Studio Enhance Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer select-none pt-0.5">
                <input
                  type="checkbox"
                  checked={autoStudioEnhance}
                  onChange={(e) => setAutoStudioEnhance(e.target.checked)}
                  className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                  {lang === 'bn'
                    ? 'ছবি স্টুডিও-মানের করুন (রঙ, আলো ও ধার ঠিক করা)'
                    : 'Studio-quality portrait enhance (tone, light & crispness)'}
                </span>
              </label>

              {/* Intensity Dropdown */}
              <div className="flex items-center gap-2.5 pl-1">
                <span className="text-xs text-slate-600 dark:text-slate-300">
                  {lang === 'bn' ? 'মাত্রা:' : 'Level:'}
                </span>
                <select
                  value={enhanceIntensity}
                  onChange={(e) =>
                    setEnhanceIntensity(e.target.value as StudioEnhanceIntensity)
                  }
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-100 cursor-pointer focus:outline-none focus:border-blue-500"
                >
                  <option value="light">{lang === 'bn' ? 'হালকা' : 'Light'}</option>
                  <option value="normal">{lang === 'bn' ? 'স্বাভাবিক' : 'Normal'}</option>
                  <option value="strong">{lang === 'bn' ? 'জোরালো' : 'Strong'}</option>
                </select>
              </div>

              {/* Helpful Status Summary when cutout exists */}
              {activePhoto?.cutoutSrc && (
                <p className="text-[11px] leading-relaxed text-emerald-700 dark:text-emerald-400 pt-1 border-t border-slate-200/70 dark:border-white/10">
                  {lang === 'bn'
                    ? '✅ ব্যাকগ্রাউন্ড নিখুঁতভাবে বদলানো হয়েছে এবং ছবি স্টুডিও-মানের করা হয়েছে — ডানপাশে আগে/পরে মিলিয়ে দেখুন বা ক্রপ ও সোজা করুন।'
                    : '✅ Background removed cleanly & portrait studio-enhanced — compare Before/After or Crop & Straighten on the right.'}
                </p>
              )}
            </div>
          </div>

          {/* SECTION 3 CARD: PER-PHOTO PRINT COPY ALLOCATION ("প্রিন্টে কোন ছবি কয়টা?") */}
          {photos.length > 0 && (
            <div className="rounded-2xl border border-slate-200/90 dark:border-white/15 bg-white/85 dark:bg-slate-900/70 p-3.5 shadow-xs space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Printer className="w-4 h-4 text-slate-700 dark:text-slate-200 shrink-0" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {lang === 'bn' ? 'প্রিন্টে কোন ছবি কয়টা?' : 'Print Copies per Photo'}
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                  {placedItems.length} {lang === 'bn' ? 'কপি' : 'total'}
                </span>
              </div>

              <div className="space-y-2.5">
                {photos.map((item, idx) => {
                  const alloc = getAlloc(item.id);
                  const totalForPhoto =
                    (alloc.sizeMode === 'stamp' ? 0 : alloc.passportCount) +
                    (alloc.sizeMode === 'passport' ? 0 : alloc.stampCount);

                  return (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900/80 p-3 space-y-2.5"
                    >
                      {/* Photo Header */}
                      <div className="flex items-center justify-between gap-2">
                        <div
                          onClick={() => setActivePhotoIndex(idx)}
                          className="flex items-center gap-2.5 min-w-0 cursor-pointer"
                        >
                          <img
                            src={item.processedSrc || item.originalSrc}
                            alt={`Photo ${idx + 1}`}
                            className="w-9 h-11 object-cover rounded-lg border border-slate-200 dark:border-slate-700 shrink-0"
                          />
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                              {lang === 'bn' ? `ছবি ${idx + 1}` : `Photo ${idx + 1}`}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenCropModal(idx);
                                }}
                                className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                              >
                                <Scissors className="w-2.5 h-2.5" />
                                <span>{lang === 'bn' ? 'ক্রপ' : 'Crop'}</span>
                              </button>
                              <span className="text-slate-300 dark:text-slate-600">·</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenEditor(idx);
                                }}
                                className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                              >
                                <Edit3 className="w-2.5 h-2.5" />
                                <span>{lang === 'bn' ? 'এডিট' : 'Edit'}</span>
                              </button>
                              <span className="text-slate-300 dark:text-slate-600">·</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDuplicatePhoto(idx);
                                }}
                                className="text-[10px] font-semibold text-slate-500 hover:text-blue-600 flex items-center gap-0.5 cursor-pointer"
                              >
                                <Copy className="w-2.5 h-2.5" />
                                <span>{lang === 'bn' ? 'কপি' : 'Dup'}</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => onRemovePhoto(idx)}
                          className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 flex items-center justify-center cursor-pointer shrink-0"
                          title={lang === 'bn' ? 'মুছুন' : 'Remove'}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Segmented Size Selector: Passport | Stamp | Both */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {(
                          [
                            { id: 'passport' as const, bn: 'পাসপোর্ট', en: 'Passport' },
                            { id: 'stamp' as const, bn: 'স্ট্যাম্প', en: 'Stamp' },
                            { id: 'both' as const, bn: 'দুটোই', en: 'Both' },
                          ] as const
                        ).map((modeOpt) => {
                          const active = alloc.sizeMode === modeOpt.id;
                          return (
                            <button
                              key={modeOpt.id}
                              type="button"
                              onClick={() => {
                                const nextPassport =
                                  modeOpt.id === 'stamp'
                                    ? 0
                                    : alloc.passportCount > 0
                                    ? alloc.passportCount
                                    : 4;
                                const nextStamp =
                                  modeOpt.id === 'passport'
                                    ? 0
                                    : alloc.stampCount > 0
                                    ? alloc.stampCount
                                    : 4;
                                onUpdatePhotoAllocation(item.id, {
                                  sizeMode: modeOpt.id,
                                  passportCount: nextPassport,
                                  stampCount: nextStamp,
                                });
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                                active
                                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-emerald-400'
                              }`}
                            >
                              {lang === 'bn' ? modeOpt.bn : modeOpt.en}
                            </button>
                          );
                        })}
                      </div>

                      {/* Passport Count Row */}
                      {(alloc.sizeMode === 'passport' || alloc.sizeMode === 'both') && (
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-300 w-16 shrink-0">
                            {lang === 'bn' ? 'পাসপোর্ট' : 'Passport'}
                          </span>
                          <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-800">
                            <button
                              type="button"
                              onClick={() =>
                                onUpdatePhotoAllocation(item.id, {
                                  ...alloc,
                                  passportCount: Math.max(0, alloc.passportCount - 1),
                                })
                              }
                              className="w-7 h-7 flex items-center justify-center hover:bg-slate-200/70 dark:hover:bg-slate-700 cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-8 text-center text-xs font-bold font-mono tabular-nums bg-white dark:bg-slate-900 py-1">
                              {alloc.passportCount}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                onUpdatePhotoAllocation(item.id, {
                                  ...alloc,
                                  passportCount: Math.min(40, alloc.passportCount + 1),
                                })
                              }
                              className="w-7 h-7 flex items-center justify-center hover:bg-slate-200/70 dark:hover:bg-slate-700 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="flex items-center gap-1">
                            {[2, 4, 6, 8].map((n) => (
                              <button
                                key={n}
                                type="button"
                                onClick={() =>
                                  onUpdatePhotoAllocation(item.id, {
                                    ...alloc,
                                    passportCount: n,
                                  })
                                }
                                className={`w-7 h-7 rounded-lg text-xs font-bold border transition cursor-pointer tabular-nums ${
                                  alloc.passportCount === n
                                    ? 'bg-blue-600 border-blue-600 text-white'
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-400'
                                }`}
                              >
                                {n}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Stamp Count Row */}
                      {(alloc.sizeMode === 'stamp' || alloc.sizeMode === 'both') && (
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-300 w-16 shrink-0">
                            {lang === 'bn' ? 'স্ট্যাম্প' : 'Stamp'}
                          </span>
                          <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-800">
                            <button
                              type="button"
                              onClick={() =>
                                onUpdatePhotoAllocation(item.id, {
                                  ...alloc,
                                  stampCount: Math.max(0, alloc.stampCount - 1),
                                })
                              }
                              className="w-7 h-7 flex items-center justify-center hover:bg-slate-200/70 dark:hover:bg-slate-700 cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-8 text-center text-xs font-bold font-mono tabular-nums bg-white dark:bg-slate-900 py-1">
                              {alloc.stampCount}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                onUpdatePhotoAllocation(item.id, {
                                  ...alloc,
                                  stampCount: Math.min(60, alloc.stampCount + 1),
                                })
                              }
                              className="w-7 h-7 flex items-center justify-center hover:bg-slate-200/70 dark:hover:bg-slate-700 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="flex items-center gap-1">
                            {[4, 8, 12, 16].map((n) => (
                              <button
                                key={n}
                                type="button"
                                onClick={() =>
                                  onUpdatePhotoAllocation(item.id, {
                                    ...alloc,
                                    stampCount: n,
                                  })
                                }
                                className={`w-7 h-7 rounded-lg text-xs font-bold border transition cursor-pointer tabular-nums ${
                                  alloc.stampCount === n
                                    ? 'bg-blue-600 border-blue-600 text-white'
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-400'
                                }`}
                              >
                                {n}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                        {lang === 'bn' ? `মোট ${totalForPhoto} কপি` : `Total ${totalForPhoto} copies`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: LAYOUT, SPACING & SELECTED ITEM */}
      {activeTab === 'layout' && (
        <div className="space-y-4">
          <InspectorSection
            first
            title={lang === 'bn' ? 'প্রিন্ট লেআউট টেমপ্লেট' : 'Sheet Layout Presets'}
            meta={
              placedItems.length > 0
                ? `${sheetPassportCount}P · ${sheetStampCount}S`
                : lang === 'bn'
                ? 'খালি'
                : 'Empty'
            }
          >
            <div className="grid grid-cols-2 gap-1.5">
              {layoutTemplates.map((tpl) => {
                const active = layoutMode === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setLayoutMode(tpl.id)}
                    className={`p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                      active
                        ? 'glass-btn-primary text-white'
                        : 'glass-tile text-slate-800 dark:text-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-xs leading-tight">
                        {lang === 'bn' ? tpl.titleBn : tpl.titleEn}
                      </span>
                      {active && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                    </div>
                    <span
                      className={`text-[10px] block mt-0.5 leading-snug ${
                        active ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {lang === 'bn' ? tpl.subBn : tpl.subEn}
                    </span>
                  </button>
                );
              })}
            </div>

            {layoutMode === 'manual' && (
              <div className="p-3 rounded-xl glass-track flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {lang === 'bn' ? 'কপির সংখ্যা' : 'Copies Count'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setManualCount((c) => Math.max(1, c - 1))}
                    className="w-8 h-8 rounded-xl glass-tile flex items-center justify-center cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-12 text-center font-mono font-bold text-sm text-blue-600 dark:text-blue-400 tabular-nums">
                    {manualCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => setManualCount((c) => Math.min(60, c + 1))}
                    className="w-8 h-8 rounded-xl glass-tile flex items-center justify-center cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-1.5 pt-1">
              {onAddPassportCopy && (
                <button
                  type="button"
                  onClick={() => onAddPassportCopy()}
                  className="py-2 px-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/25 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{lang === 'bn' ? 'পাসপোর্ট (+১)' : 'Add Passport'}</span>
                </button>
              )}
              {onAddStampCopy && (
                <button
                  type="button"
                  onClick={() => onAddStampCopy()}
                  className="py-2 px-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{lang === 'bn' ? 'স্ট্যাম্প (+১)' : 'Add Stamp'}</span>
                </button>
              )}
              {onAutoAlignGrid && (
                <button
                  type="button"
                  onClick={onAutoAlignGrid}
                  className="py-2 px-2.5 rounded-xl glass-tile text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Grid className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>{lang === 'bn' ? 'গ্রিড সাজান' : 'Auto Align'}</span>
                </button>
              )}
              {onResetPlacedItems && (
                <button
                  type="button"
                  onClick={onResetPlacedItems}
                  className="py-2 px-2.5 rounded-xl glass-tile text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                  <span>{lang === 'bn' ? 'রিসেট গ্রিড' : 'Reset Grid'}</span>
                </button>
              )}
            </div>
          </InspectorSection>

          {/* Selected Sheet Item Controls */}
          {selectedItem && (
            <InspectorSection
              title={lang === 'bn' ? 'নির্বাচিত ছবি কন্ট্রোল' : 'Selected Sheet Item'}
              meta={`${selectedItem.width} × ${selectedItem.height} mm`}
            >
              <div className="p-3 rounded-xl bg-slate-900 text-white space-y-2.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {onToggleItemSize && (
                    <button
                      type="button"
                      onClick={() =>
                        onToggleItemSize(
                          selectedItem.id,
                          isSelectedItemStamp ? 'bd-passport' : 'bd-stamp'
                        )
                      }
                      className="py-1.5 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      {isSelectedItemStamp
                        ? lang === 'bn'
                          ? 'পাসপোর্ট করুন'
                          : 'Switch to Passport'
                        : lang === 'bn'
                        ? 'স্ট্যাম্প করুন'
                        : 'Switch to Stamp'}
                    </button>
                  )}

                  {onNudgeItem && (
                    <div className="flex items-center gap-0.5 bg-slate-800 p-0.5 rounded-lg border border-slate-700">
                      <button
                        type="button"
                        onClick={() => onNudgeItem(selectedItem.id, -1, 0)}
                        className="p-1.5 hover:bg-slate-700 rounded cursor-pointer"
                        title="Left"
                      >
                        <ArrowLeft className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onNudgeItem(selectedItem.id, 1, 0)}
                        className="p-1.5 hover:bg-slate-700 rounded cursor-pointer"
                        title="Right"
                      >
                        <ArrowRight className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onNudgeItem(selectedItem.id, 0, -1)}
                        className="p-1.5 hover:bg-slate-700 rounded cursor-pointer"
                        title="Up"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onNudgeItem(selectedItem.id, 0, 1)}
                        className="p-1.5 hover:bg-slate-700 rounded cursor-pointer"
                        title="Down"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {onDuplicateItem && (
                    <button
                      type="button"
                      onClick={() => onDuplicateItem(selectedItem.id)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                      title={lang === 'bn' ? 'কপি' : 'Duplicate'}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {onDeleteItem && (
                    <button
                      type="button"
                      onClick={() => onDeleteItem(selectedItem.id)}
                      className="p-1.5 rounded-lg bg-red-950/70 hover:bg-red-700 text-red-300 hover:text-white cursor-pointer"
                      title={lang === 'bn' ? 'মুছুন' : 'Delete'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {photos.length > 1 && onSwitchItemPhoto && (
                  <div className="pt-2 border-t border-slate-800">
                    <span className="text-[10px] text-slate-400 block mb-1.5">
                      {lang === 'bn' ? 'স্লটের ছবি পরিবর্তন:' : 'Assign photo to slot:'}
                    </span>
                    <div className="flex items-center gap-1.5 overflow-x-auto">
                      {photos.map((p, pIdx) => {
                        const isThisPhoto = p.id === selectedItem.photoId;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => onSwitchItemPhoto(selectedItem.id, p.id)}
                            className={`p-1 rounded-md flex items-center gap-1 border text-[11px] font-semibold cursor-pointer shrink-0 ${
                              isThisPhoto
                                ? 'bg-blue-600 border-blue-400 text-white'
                                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            <img
                              src={p.processedSrc || p.originalSrc}
                              alt=""
                              className="w-4 h-5 object-cover rounded-xs"
                            />
                            <span>#{pIdx + 1}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </InspectorSection>
          )}

          {/* Margins & Gaps */}
          <InspectorSection
            title={lang === 'en' ? 'Margins & Spacing' : 'মার্জিন ও ছবির গ্যাপ'}
            action={
              maxSpreadGap > 0 ? (
                <button
                  type="button"
                  onClick={handleAutoSpread}
                  className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  {lang === 'en'
                    ? `Auto Spread (${maxSpreadGap}mm)`
                    : `সর্বোচ্চ গ্যাপ (${maxSpreadGap}মিমি)`}
                </button>
              ) : undefined
            }
          >
            <div className="space-y-3 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-slate-600 dark:text-slate-400">
                    {lang === 'en' ? 'Horizontal Gap (Col)' : 'পাশাপাশি ফাঁকা (Col Gap)'}
                  </span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                    {margins.colGap} mm
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={Math.max(15, Math.ceil(maxSpreadGap))}
                  step="0.5"
                  value={margins.colGap}
                  onChange={(e) => updateMargin('colGap', Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-slate-600 dark:text-slate-400">
                    {lang === 'en' ? 'Left & Right Margin' : 'বাম ও ডান মার্জিন'}
                  </span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                    {margins.left} mm
                  </span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="25"
                  step="1"
                  value={margins.left}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setMargins((prev) => ({ ...prev, left: val, right: val }));
                  }}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-slate-600 dark:text-slate-400">
                    {lang === 'en' ? 'Top Margin' : 'উপরের মার্জিন'}
                  </span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                    {margins.top} mm
                  </span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="35"
                  step="1"
                  value={margins.top}
                  onChange={(e) => updateMargin('top', Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-slate-600 dark:text-slate-400">
                    {lang === 'en' ? 'Vertical Row Gap' : 'উপর-নিচ ফাঁকা (Row Gap)'}
                  </span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                    {margins.rowGap} mm
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="1"
                  value={margins.rowGap}
                  onChange={(e) => updateMargin('rowGap', Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Move className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>
                    {lang === 'en'
                      ? 'Drag on paper to move all photos together'
                      : 'পেপারে ড্র্যাগ করে সব ছবি একসাথে সরান'}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setMargins((prev) => ({
                      ...prev,
                      colGap: 5,
                      left: 6,
                      right: 6,
                      top: 10,
                      rowGap: 5,
                    }))
                  }
                  className="text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer shrink-0 ml-2"
                >
                  {lang === 'en' ? 'Reset' : 'রিসেট'}
                </button>
              </div>
            </div>
          </InspectorSection>
        </div>
      )}

      {/* TAB 3: PAPER & OUTPUT */}
      {activeTab === 'paper' && (
        <PaperOutputSection
          lang={lang}
          paperSize={paperSize}
          setPaperSize={setPaperSize}
          customPaperWidth={customPaperWidth}
          setCustomPaperWidth={setCustomPaperWidth}
          customPaperHeight={customPaperHeight}
          setCustomPaperHeight={setCustomPaperHeight}
          orientation={orientation}
          setOrientation={setOrientation}
          colorProfile={colorProfile}
          setColorProfile={setColorProfile}
          dpi={dpi}
          setDpi={setDpi}
          cuttingGuide={cuttingGuide}
          setCuttingGuide={setCuttingGuide}
          cuttingGuideOptions={[
            { id: 'none', labelEn: 'None', labelBn: 'নেই' },
            { id: 'scissors', labelEn: 'Scissors', labelBn: 'কাঁচি' },
            { id: 'dashed', labelEn: 'Dashed', labelBn: 'ড্যাশ' },
            { id: 'solid', labelEn: 'Border', labelBn: 'বর্ডার' },
          ]}
        />
      )}
    </div>
  );
};
