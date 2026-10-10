import React, { useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Edit3,
  Grid,
  ImageIcon,
  Layers,
  Loader2,
  Minus,
  Move,
  Plus,
  RefreshCw,
  RotateCcw,
  Scissors,
  Settings2,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  CuttingGuideStyle,
  LayoutMode,
  MarginSettings,
  PaperOrientation,
  PaperSizeType,
  PhotoPresetType,
  PlacedSheetItem,
  StudioPhotoItem,
} from '../../types';
import { PAPER_SIZES, PHOTO_PRESETS } from '../../utils/constants';
import { calculateMaxSpreadColGap } from '../../utils/layoutCalculator';
import { translations } from '../../utils/translations';

interface Props {
  lang: 'bn' | 'en';
  photos: StudioPhotoItem[];
  activePhotoIndex: number;
  setActivePhotoIndex: (idx: number) => void;
  onUploadPhotos: (files: FileList | null) => void;
  onRemovePhoto: (index: number) => void;
  onDuplicatePhoto: (index: number) => void;
  onOpenEditor: (index: number) => void;
  onAutoFitPhoto?: (index: number) => void;
  autoRemoveBg?: boolean;
  setAutoRemoveBg?: (val: boolean) => void;
  uploadBgMode?: 'studio-blue' | 'white' | 'sky-blue' | 'off-white';
  setUploadBgMode?: (mode: 'studio-blue' | 'white' | 'sky-blue' | 'off-white') => void;
  onQuickApplyBg?: (index: number, mode: 'studio-blue' | 'white' | 'original') => void;
  autoStraighten?: boolean;
  setAutoStraighten?: (val: boolean) => void;
  onApplyBgToAll?: (mode: 'studio-blue' | 'white' | 'sky-blue' | 'off-white') => void;
  isUploading?: boolean;
  preset: PhotoPresetType;
  setPreset: (preset: PhotoPresetType) => void;
  customWidth: number;
  setCustomWidth: (w: number) => void;
  customHeight: number;
  setCustomHeight: (h: number) => void;
  paperSize: PaperSizeType;
  setPaperSize: (size: PaperSizeType) => void;
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
  // Multi-size and interactive sheet props
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

export const PassportControls: React.FC<Props> = ({
  lang,
  photos,
  activePhotoIndex,
  setActivePhotoIndex,
  onUploadPhotos,
  onRemovePhoto,
  onDuplicatePhoto,
  onOpenEditor,
  onAutoFitPhoto,
  onQuickApplyBg,
  isUploading = false,
  preset,
  setPreset,
  customWidth,
  setCustomWidth,
  customHeight,
  setCustomHeight,
  paperSize,
  setPaperSize,
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
  placedItems = [],
  selectedItemId,
  onSelectItem,
  onAddStampCopy,
  onAddPassportCopy,
  onAutoAlignGrid,
  onResetPlacedItems,
  onDistributeAllPhotos,
  onSwitchItemPhoto,
  onCycleItemPhoto,
  onToggleItemSize,
  onNudgeItem,
  onDuplicateItem,
  onDeleteItem,
}) => {
  const t = translations[lang];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [showMarginSliders, setShowMarginSliders] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUploadPhotos(e.dataTransfer.files);
    }
  };

  const updateMargin = <K extends keyof MarginSettings>(key: K, val: number) => {
    setMargins((prev) => ({ ...prev, [key]: val }));
  };

  const activePhoto = photos[activePhotoIndex] || (photos.length > 0 ? photos[0] : null);

  const currentPaper = PAPER_SIZES[paperSize];
  const isLandscape = orientation === 'landscape';
  const paperWidthMm = isLandscape ? currentPaper.height : currentPaper.width;
  const effectivePhotoWidth =
    preset === 'custom' ? customWidth : (PHOTO_PRESETS[preset]?.width || 35);
  const currentCols = layoutMode === 'top-5' ? 5 : layoutMode === 'top-4-couple' ? 4 : layoutMode === 'top-6' ? 6 : 5;

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

  return (
    <div className="space-y-4 text-slate-800 dark:text-slate-100">
      {/* ======================================================== */}
      {/* 1. PHOTO UPLOAD & MANAGEMENT (ছবি আপলোড ও গ্যালারি)        */}
      {/* ======================================================== */}
      <section className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
              1
            </div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-normal">
              {lang === 'bn' ? 'ছবি আপলোড ও ব্যবস্থাপনা' : 'Photo Upload & Management'}
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {photos.length === 0 ? (lang === 'bn' ? 'খালি' : 'Empty') : `${photos.length} ${lang === 'bn' ? 'টি ছবি' : 'Photos'}`}
          </span>
        </div>

        {/* Upload Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-blue-200 dark:border-blue-950 hover:border-blue-500 rounded-lg p-3 text-center bg-blue-50/40 dark:bg-slate-950/40 hover:bg-blue-50/70 transition cursor-pointer flex flex-col items-center justify-center min-h-[82px] group"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => onUploadPhotos(e.target.files)}
              className="hidden"
            />
            {isUploading ? (
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            ) : (
              <>
                <Upload className="w-5 h-5 text-blue-600 group-hover:scale-110 transition mb-1" />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-normal">
                  {lang === 'bn' ? 'ছবি আপলোড করুন' : 'Upload Photos'}
                </span>
                <span className="text-[10px] text-slate-400 leading-normal">
                  {lang === 'bn' ? 'ফাইল ড্রপ বা ব্রাউজ' : 'Drop or browse files'}
                </span>
              </>
            )}
          </div>

          <div
            onClick={() => cameraInputRef.current?.click()}
            className="border border-slate-200 dark:border-slate-800 hover:border-slate-400 rounded-lg p-3 text-center bg-slate-50 dark:bg-slate-950/40 hover:bg-slate-100 transition cursor-pointer flex flex-col items-center justify-center min-h-[82px] group"
          >
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="user"
              onChange={(e) => onUploadPhotos(e.target.files)}
              className="hidden"
            />
            <Camera className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:scale-110 transition mb-1" />
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-normal">
              {lang === 'bn' ? 'ক্যামেরা স্ন্যাপ' : 'Camera Snap'}
            </span>
            <span className="text-[10px] text-slate-400 leading-normal">
              {lang === 'bn' ? 'সরাসরি ছবি তুলুন' : 'Take instant photo'}
            </span>
          </div>
        </div>

        {/* Empty state hint if no photos loaded yet */}
        {photos.length === 0 && (
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
              {lang === 'bn'
                ? 'কোনো ছবি লোড করা নেই। শুরু করতে উপরের বাটনে ক্লিক করে ছবি আপলোড করুন।'
                : 'No photos loaded. Click above or drop files to upload multiple photos.'}
            </p>
          </div>
        )}

        {/* Active Photo Card & Action Button (Only rendered if photo exists) */}
        {activePhoto && (
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200/90 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center gap-3">
              <img
                src={activePhoto.processedSrc || activePhoto.originalSrc}
                alt="Selected"
                className="w-13 h-16 object-cover rounded-md border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-normal">
                    {lang === 'bn' ? `নির্বাচিত ছবি #${activePhotoIndex + 1}` : `Selected Photo #${activePhotoIndex + 1}`}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onDuplicatePhoto(activePhotoIndex)}
                      className="p-1 text-slate-400 hover:text-blue-600 rounded cursor-pointer"
                      title={lang === 'bn' ? 'ডুপ্লিকেট কপি' : 'Duplicate photo'}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {photos.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onRemovePhoto(activePhotoIndex)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                        title={lang === 'bn' ? 'ছবি মুছুন' : 'Delete photo'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                  {lang === 'bn'
                    ? 'উজ্জ্বলতা, কনট্রাস্ট বা ক্রপ পরিবর্তন করতে নিচের এডিট বাটনে চাপুন।'
                    : 'Adjust brightness, contrast, saturation or crop using the editor below.'}
                </p>
              </div>
            </div>

            {/* Quick Action Button: Crop & Adjustments */}
            <div className="pt-1.5 border-t border-slate-200/80 dark:border-slate-800">
              <button
                type="button"
                onClick={() => onOpenEditor(activePhotoIndex)}
                className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
              >
                <Edit3 className="w-3.5 h-3.5 shrink-0" />
                <span>{lang === 'bn' ? 'ক্রপ ও এডজাস্টমেন্ট এডিটর' : 'Crop & Adjustments Editor'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Multi-Photo Gallery & Per-Photo Quick Actions (When multiple photos loaded) */}
        {photos.length > 1 && (
          <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                {lang === 'en' ? `All Uploaded Photos (${photos.length}):` : `আপলোডকৃত সব ছবি (${photos.length}টি):`}
              </span>
              {onDistributeAllPhotos && (
                <button
                  type="button"
                  onClick={onDistributeAllPhotos}
                  className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                  title={lang === 'en' ? 'Arrange all uploaded photos across the sheet' : 'সবগুলো আপলোডকৃত ছবি পেপারে ভাগ করে সাজিয়ে দিন'}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{lang === 'en' ? 'Distribute All' : 'সব ছবি সাজান'}</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-0.5">
              {photos.map((item, idx) => {
                const isSelected = idx === activePhotoIndex;
                return (
                  <div
                    key={item.id}
                    className={`p-1.5 rounded-lg border transition ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/40 ring-1 ring-blue-500/40'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                    }`}
                  >
                    <div
                      onClick={() => setActivePhotoIndex(idx)}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <div className="relative shrink-0">
                        <img
                          src={item.processedSrc || item.originalSrc}
                          alt={`Photo ${idx + 1}`}
                          className="w-10 h-12 object-cover rounded border border-slate-200 dark:border-slate-700"
                        />
                        <span className="absolute bottom-0 right-0 bg-black/80 text-white text-[9px] font-mono px-1 rounded-tl">
                          #{idx + 1}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 block truncate">
                          {lang === 'en' ? `Photo #${idx + 1}` : `ছবি #${idx + 1}`}
                        </span>
                        <div className="flex items-center gap-1 mt-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenEditor(idx);
                            }}
                            className="p-0.5 text-slate-500 hover:text-blue-600 rounded"
                            title={lang === 'en' ? 'Edit Adjustments / Crop' : 'এডিট করুন'}
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemovePhoto(idx);
                            }}
                            className="p-0.5 text-slate-400 hover:text-red-600 rounded"
                            title={lang === 'en' ? 'Delete' : 'মুছুন'}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Quick Add buttons for this specific photo */}
                    <div className="grid grid-cols-2 gap-1 mt-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                      {onAddPassportCopy && (
                        <button
                          type="button"
                          onClick={() => onAddPassportCopy(item.id)}
                          className="py-0.5 px-1 rounded text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 text-center transition cursor-pointer"
                          title={lang === 'en' ? 'Add this photo as Passport size (35x45mm)' : 'এই ছবিটি পাসপোর্ট সাইজ (৩৫×৪৫ মিমি) হিসেবে পেপারে যোগ করুন'}
                        >
                          {lang === 'en' ? '+ Passport' : '+ পাসপোর্ট'}
                        </button>
                      )}
                      {onAddStampCopy && (
                        <button
                          type="button"
                          onClick={() => onAddStampCopy(item.id)}
                          className="py-0.5 px-1 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 text-center transition cursor-pointer"
                          title={lang === 'en' ? 'Add this photo as Stamp size (20x25mm)' : 'এই ছবিটি স্ট্যাম্প সাইজ (২০×২৫ মিমি) হিসেবে পেপারে যোগ করুন'}
                        >
                          {lang === 'en' ? '+ Stamp' : '+ স্ট্যাম্প'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* ======================================================== */}
      {/* 2. PHOTO SIZE & RATIO (ছবির সাইজ ও অনুপাত)                  */}
      {/* ======================================================== */}
      <section className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
              2
            </div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-normal">
              {lang === 'en' ? 'Photo Size & Aspect Ratio' : 'ছবির নির্দিষ্ট সাইজ ও অনুপাত'}
            </h2>
          </div>
          <span className="text-xs text-blue-600 dark:text-blue-400 font-mono font-semibold">
            {preset !== 'custom'
              ? `${PHOTO_PRESETS[preset]?.width || 35} × ${PHOTO_PRESETS[preset]?.height || 45} mm`
              : `${customWidth} × ${customHeight} mm`}
          </span>
        </div>

        {/* Presets Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {Object.entries(PHOTO_PRESETS).map(([key, item]) => {
            const isSelected = preset === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setPreset(key as PhotoPresetType)}
                className={`p-2.5 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between min-h-[64px] ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-semibold shadow-2xs'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-950/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs leading-normal">
                    {lang === 'bn' ? item.nameBn : item.nameEn}
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-1" />}
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-1 leading-normal">
                  {item.width} × {item.height} {lang === 'en' ? 'mm' : 'মিমি'}
                </div>
              </button>
            );
          })}
        </div>

        {/* Custom Size Inputs */}
        {preset === 'custom' && (
          <div className="p-3 rounded-lg bg-blue-50/40 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1 leading-normal">
                {lang === 'en' ? 'Width (mm):' : 'প্রস্থ (Width মিমি):'}
              </label>
              <input
                type="number"
                min="10"
                max="250"
                value={customWidth}
                onChange={(e) => setCustomWidth(Math.max(10, Number(e.target.value)))}
                className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-bold"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1 leading-normal">
                {lang === 'en' ? 'Height (mm):' : 'উচ্চতা (Height মিমি):'}
              </label>
              <input
                type="number"
                min="10"
                max="250"
                value={customHeight}
                onChange={(e) => setCustomHeight(Math.max(10, Number(e.target.value)))}
                className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-bold"
              />
            </div>
          </div>
        )}
      </section>

      {/* ======================================================== */}
      {/* 3. COPIES & SHEET LAYOUT (কপির সংখ্যা ও সাজানো)             */}
      {/* ======================================================== */}
      {(() => {
        const sheetPassportCount = placedItems.filter(
          (i) => i.preset === 'bd-passport' || i.preset === 'intl-passport' || (i.width === 35 && i.height === 45)
        ).length;
        const sheetStampCount = placedItems.filter(
          (i) => i.preset === 'bd-stamp' || (i.width === 20 && i.height === 25)
        ).length;
        const sheetTotalCount = placedItems.length;
        const selectedItem = selectedItemId ? placedItems.find((i) => i.id === selectedItemId) : null;
        const isSelectedItemStamp = selectedItem ? (selectedItem.width <= 25 || selectedItem.preset === 'bd-stamp') : false;

        return (
          <section className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                  3
                </div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-normal">
                  {lang === 'bn' ? 'কপির সংখ্যা, সাইজ ও সাজানো' : 'Copies, Size & Arrangement'}
                </h2>
              </div>
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 font-mono">
                {sheetTotalCount > 0 ? (lang === 'bn' ? `${sheetTotalCount}টি সাজানো` : `${sheetTotalCount} Placed`) : (lang === 'bn' ? 'খালি পেপার' : 'Empty Sheet')}
              </span>
            </div>

            {/* Layout Presets Grid (6 Distinct Templates including Passport + Stamp Combo) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {/* 1. Combo: Passport + Stamp on same sheet */}
              <button
                type="button"
                onClick={() => setLayoutMode('combo-passport-stamp')}
                className={`p-2.5 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between min-h-[74px] ${
                  layoutMode === 'combo-passport-stamp'
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-semibold shadow-2xs'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-slate-50/50 dark:bg-slate-950/30 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs leading-normal">
                    {lang === 'bn' ? 'পাসপোর্ট + স্ট্যাম্প' : 'Passport + Stamp'}
                  </span>
                  {layoutMode === 'combo-passport-stamp' && <Check className="w-3.5 h-3.5 text-blue-600 ml-1" />}
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">
                  {lang === 'bn' ? '৫ পাসপোর্ট + ১৬ স্ট্যাম্প কম্বো' : '5 Passport + 16 Stamp combo'}
                </span>
              </button>

              {/* 2. Full Grid Stamp: Fill page with Stamps */}
              <button
                type="button"
                onClick={() => setLayoutMode('full-grid-stamp')}
                className={`p-2.5 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between min-h-[74px] ${
                  layoutMode === 'full-grid-stamp'
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-semibold shadow-2xs'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-slate-50/50 dark:bg-slate-950/30 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs leading-normal">
                    {lang === 'bn' ? 'সব স্ট্যাম্প সাইজ' : 'All Stamp Grid'}
                  </span>
                  {layoutMode === 'full-grid-stamp' && <Check className="w-3.5 h-3.5 text-blue-600 ml-1" />}
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">
                  {lang === 'bn' ? 'পুরো পাতা জুড়ে ৩২+ কপি স্ট্যাম্প' : 'Fill page with 32+ Stamps'}
                </span>
              </button>

              {/* 3. Top 5 Standard Passport */}
              <button
                type="button"
                onClick={() => setLayoutMode('top-5')}
                className={`p-2.5 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between min-h-[74px] ${
                  layoutMode === 'top-5'
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-semibold shadow-2xs'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-slate-50/50 dark:bg-slate-950/30 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs leading-normal">
                    {lang === 'bn' ? 'শীর্ষে ৫ পাসপোর্ট' : 'Top 5 Passport'}
                  </span>
                  {layoutMode === 'top-5' && <Check className="w-3.5 h-3.5 text-blue-600 ml-1" />}
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">
                  {lang === 'bn' ? 'A4 পেপারের উপরে ১ সারি (৩৫×৪৫)' : 'Top row (35×45 mm)'}
                </span>
              </button>

              {/* 4. Full Page Fill Passport */}
              <button
                type="button"
                onClick={() => setLayoutMode('full-grid')}
                className={`p-2.5 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between min-h-[74px] ${
                  layoutMode === 'full-grid'
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-semibold shadow-2xs'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-slate-50/50 dark:bg-slate-950/30 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs leading-normal">
                    {lang === 'bn' ? 'পুরো পেপার পাসপোর্ট' : 'Full Page Grid'}
                  </span>
                  {layoutMode === 'full-grid' && <Check className="w-3.5 h-3.5 text-blue-600 ml-1" />}
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">
                  {lang === 'bn' ? 'সম্পূর্ণ পাতা জুড়ে সর্বোচ্চ পাসপোর্ট' : 'Full sheet filled with Passport'}
                </span>
              </button>

              {/* 5. Custom Count */}
              <button
                type="button"
                onClick={() => setLayoutMode('manual')}
                className={`p-2.5 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between min-h-[74px] ${
                  layoutMode === 'manual'
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-semibold shadow-2xs'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-slate-50/50 dark:bg-slate-950/30 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs leading-normal">
                    {lang === 'bn' ? 'নির্দিষ্ট সংখ্যা' : 'Manual Copies'}
                  </span>
                  {layoutMode === 'manual' && <Check className="w-3.5 h-3.5 text-blue-600 ml-1" />}
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">
                  {lang === 'bn' ? `কাস্টম কপি (${manualCount} কপি)` : `Custom (${manualCount} copies)`}
                </span>
              </button>

              {/* 6. Freeform Canvas */}
              <button
                type="button"
                onClick={() => setLayoutMode('freeform')}
                className={`p-2.5 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between min-h-[74px] ${
                  layoutMode === 'freeform'
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-semibold shadow-2xs'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-slate-50/50 dark:bg-slate-950/30 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs leading-normal">
                    {lang === 'bn' ? 'মুক্ত ক্যানভাস' : 'Freeform Canvas'}
                  </span>
                  {layoutMode === 'freeform' && <Check className="w-3.5 h-3.5 text-blue-600 ml-1" />}
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">
                  {lang === 'bn' ? 'মাউস ও কীবোর্ড দিয়ে নিজের মতো সরান' : 'Move freely via mouse & keys'}
                </span>
              </button>
            </div>

            {/* Counter controls if manual */}
            {layoutMode === 'manual' && (
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-normal">
                  {lang === 'bn' ? 'কপির সংখ্যা নির্ধারণ করুন:' : 'Set Copies Count:'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setManualCount((c) => Math.max(1, c - 1))}
                    className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold hover:bg-slate-100 transition cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-14 text-center font-mono font-bold text-sm text-blue-600">
                    {manualCount} {lang === 'bn' ? 'কপি' : 'copies'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setManualCount((c) => Math.min(60, c + 1))}
                    className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold hover:bg-slate-100 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Quick Add Buttons & Grid Formatting Toolbar */}
            <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 space-y-2">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                {lang === 'bn' ? 'পেপারে ছবি যোগ ও লেআউট টুলস:' : 'Sheet Placement Tools:'}
              </span>
              <div className="grid grid-cols-2 gap-2">
                {onAddPassportCopy && (
                  <button
                    type="button"
                    onClick={() => onAddPassportCopy()}
                    className="py-1.5 px-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                    title={lang === 'bn' ? 'পেপারে ১টি পাসপোর্ট সাইজ ছবি (৩৫ × ৪৫ মিমি) যোগ করুন' : 'Add 1 Passport photo (35 × 45 mm) to sheet'}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{lang === 'bn' ? '+ পাসপোর্ট ছবি' : '+ Passport Photo'}</span>
                  </button>
                )}
                {onAddStampCopy && (
                  <button
                    type="button"
                    onClick={() => onAddStampCopy()}
                    className="py-1.5 px-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                    title={lang === 'bn' ? 'পেপারে ১টি স্ট্যাম্প সাইজ ছবি (২০ × ২৫ মিমি) যোগ করুন' : 'Add 1 Stamp photo (20 × 25 mm) to sheet'}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{lang === 'bn' ? '+ স্ট্যাম্প ছবি' : '+ Stamp Photo'}</span>
                  </button>
                )}
                {onAutoAlignGrid && (
                  <button
                    type="button"
                    onClick={onAutoAlignGrid}
                    className="py-1.5 px-2.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                    title={lang === 'bn' ? 'সব ছবি গ্রিডে সারিবদ্ধ করুন' : 'Align all photos neatly in grid'}
                  >
                    <Grid className="w-3.5 h-3.5 text-blue-600" />
                    <span>{lang === 'bn' ? 'গ্রিডে সোজা সাজান' : 'Auto Align Grid'}</span>
                  </button>
                )}
                {onResetPlacedItems && (
                  <button
                    type="button"
                    onClick={onResetPlacedItems}
                    className="py-1.5 px-2.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                    title={lang === 'bn' ? 'লেআউট রিসেট করুন' : 'Reset sheet layout'}
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                    <span>{lang === 'bn' ? 'লেআউট রিসেট' : 'Reset Layout'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Sheet Current Status Box with Movement Guide */}
            <div className="p-2.5 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-900/60 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                <span>{lang === 'bn' ? 'বর্তমান পেপারে:' : 'On Sheet:'}</span>
                <span className="text-blue-600 dark:text-blue-400 font-mono">
                  {sheetPassportCount > 0 ? (lang === 'bn' ? `${sheetPassportCount} পাসপোর্ট ` : `${sheetPassportCount} Passport `) : ''}
                  {sheetStampCount > 0 ? (lang === 'bn' ? `+ ${sheetStampCount} স্ট্যাম্প` : `+ ${sheetStampCount} Stamp`) : ''}
                  {sheetTotalCount === 0 ? (lang === 'bn' ? '০ ছবি' : '0 photos') : ` (${sheetTotalCount})`}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-normal flex items-start gap-1.5 pt-0.5">
                <Move className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  <strong>{lang === 'bn' ? 'ছবি ডানে-বামে সরানো:' : 'Move photos:'}</strong>{' '}
                  {lang === 'bn'
                    ? 'মাউস দিয়ে টেনে ইচ্ছামতো সরান অথবা ছবিতে ক্লিক করে কীবোর্ডের অ্যারো কী (← → ↑ ↓) চাপুন।'
                    : 'Drag with mouse or select and press arrow keys (← → ↑ ↓) on keyboard to move anywhere.'}
                </span>
              </p>
            </div>

            {/* Inspector for Currently Selected Photo (If an item on canvas is clicked) */}
            {selectedItem && (
              <div className="p-3 rounded-lg bg-slate-900 text-white border border-slate-700 space-y-2 animate-in fade-in duration-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    <span>{lang === 'bn' ? 'নির্বাচিত ছবি পরিচালনা' : 'Selected Photo Actions'}</span>
                  </span>
                  <span className="text-[10px] font-mono bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                    {isSelectedItemStamp ? (lang === 'bn' ? 'স্ট্যাম্প (২০×২৫ মিমি)' : 'Stamp (20×25 mm)') : (lang === 'bn' ? 'পাসপোর্ট (৩৫×৪৫ মিমি)' : 'Passport (35×45 mm)')}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {/* Toggle Size */}
                  {onToggleItemSize && (
                    <button
                      type="button"
                      onClick={() => onToggleItemSize(selectedItem.id, isSelectedItemStamp ? 'bd-passport' : 'bd-stamp')}
                      className="py-1 px-2 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition cursor-pointer"
                    >
                      {isSelectedItemStamp
                        ? (lang === 'bn' ? '➡️ পাসপোর্ট সাইজ করুন' : '➡️ Change to Passport')
                        : (lang === 'bn' ? '➡️ স্ট্যাম্প সাইজ করুন' : '➡️ Change to Stamp')}
                    </button>
                  )}

                  {/* Nudge Arrows */}
                  {onNudgeItem && (
                    <div className="flex items-center gap-0.5 bg-slate-800 p-0.5 rounded border border-slate-700">
                      <button
                        type="button"
                        onClick={() => onNudgeItem(selectedItem.id, -1, 0)}
                        className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white"
                        title={lang === 'bn' ? 'বামে সরান (←)' : 'Nudge Left (←)'}
                      >
                        <ArrowLeft className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onNudgeItem(selectedItem.id, 1, 0)}
                        className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white"
                        title={lang === 'bn' ? 'ডানে সরান (→)' : 'Nudge Right (→)'}
                      >
                        <ArrowRight className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onNudgeItem(selectedItem.id, 0, -1)}
                        className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white"
                        title={lang === 'bn' ? 'উপরে সরান (↑)' : 'Nudge Up (↑)'}
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onNudgeItem(selectedItem.id, 0, 1)}
                        className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white"
                        title={lang === 'bn' ? 'নিচে সরান (↓)' : 'Nudge Down (↓)'}
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {/* Duplicate */}
                  {onDuplicateItem && (
                    <button
                      type="button"
                      onClick={() => onDuplicateItem(selectedItem.id)}
                      className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                      title={lang === 'bn' ? 'ডুপ্লিকেট কপি' : 'Duplicate'}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Delete */}
                  {onDeleteItem && (
                    <button
                      type="button"
                      onClick={() => onDeleteItem(selectedItem.id)}
                      className="p-1.5 rounded bg-red-950/60 hover:bg-red-800 text-red-400 hover:text-white transition cursor-pointer"
                      title={lang === 'bn' ? 'মুছুন' : 'Delete'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* If multiple photos uploaded, allow picking which photo is shown in this slot */}
                {photos.length > 1 && onSwitchItemPhoto && (
                  <div className="pt-2 border-t border-slate-800">
                    <span className="text-[10px] text-slate-400 block mb-1">
                      {lang === 'bn' ? 'এই স্লটে কোন ব্যক্তির ছবি থাকবে:' : 'Assign photo for this slot:'}
                    </span>
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                      {photos.map((p, pIdx) => {
                        const isThisPhoto = p.id === selectedItem.photoId;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => onSwitchItemPhoto(selectedItem.id, p.id)}
                            className={`p-1 rounded flex items-center gap-1 border text-[11px] font-semibold transition cursor-pointer ${
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
                            <span>{lang === 'bn' ? `ছবি #${pIdx + 1}` : `Photo #${pIdx + 1}`}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        );
      })()}

      {/* ======================================================== */}
      {/* 4. PAPER & CUTTING GUIDE (পেপার ও কাটিং লাইন)               */}
      {/* ======================================================== */}
      <section className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
              4
            </div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-normal">
              {lang === 'en' ? 'Paper & Cutting Guides' : 'পেপার ও কাটিং লাইন'}
            </h2>
          </div>
        </div>

        {/* Paper Size & Orientation Selector */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1 leading-normal">
              {lang === 'en' ? 'Paper Size:' : 'কাগজের সাইজ:'}
            </label>
            <div className="grid grid-cols-3 gap-1">
              {(['a4', '4r', 'letter'] as PaperSizeType[]).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setPaperSize(size)}
                  className={`py-1.5 px-1 rounded-md text-xs font-semibold text-center uppercase transition cursor-pointer ${
                    paperSize === size
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1 leading-normal">
              {lang === 'en' ? 'Orientation:' : 'কাগজের দিক:'}
            </label>
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => setOrientation('portrait')}
                className={`py-1.5 px-1 rounded-md text-xs font-semibold text-center transition cursor-pointer ${
                  orientation === 'portrait'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {lang === 'en' ? 'Portrait' : 'লম্বালম্বি'}
              </button>
              <button
                type="button"
                onClick={() => setOrientation('landscape')}
                className={`py-1.5 px-1 rounded-md text-xs font-semibold text-center transition cursor-pointer ${
                  orientation === 'landscape'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {lang === 'en' ? 'Landscape' : 'আড়াআড়ি'}
              </button>
            </div>
          </div>
        </div>

        {/* Cutting Guide Options */}
        <div>
          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1 leading-normal">
            {lang === 'en' ? 'Cutting Guides:' : 'কাটার সুবিধার জন্য গাইড দাগ:'}
          </label>
          <div className="grid grid-cols-4 gap-1.5 text-xs">
            {[
              { id: 'none', label: lang === 'en' ? '❌ None' : '❌ নেই' },
              { id: 'scissors', label: lang === 'en' ? '✂️ Scissors' : '✂️ কাঁচি' },
              { id: 'dashed', label: lang === 'en' ? '╌ Dashed' : '╌ ড্যাশ' },
              { id: 'solid', label: lang === 'en' ? '⬛ Border' : '⬛ বর্ডার' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setCuttingGuide(item.id as CuttingGuideStyle)}
                className={`py-1.5 px-1.5 rounded-md text-xs font-medium text-center transition cursor-pointer ${
                  cuttingGuide === item.id
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold shadow-2xs ring-1 ring-blue-500'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Optional Margin Adjuster Toggle */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowMarginSliders(!showMarginSliders)}
            className="w-full flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 py-1 transition cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <Settings2 className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? 'Margin & Spacing Adjustments (Optional)' : 'মার্জিন ও স্পেসিং অ্যাডজাস্টমেন্ট (ঐচ্ছিক)'}</span>
            </div>
            {showMarginSliders ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showMarginSliders && (
            <div className="mt-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
              {/* Auto-Spread Button to cover sides and maximize middle gaps */}
              {maxSpreadGap > 0 && (
                <button
                  type="button"
                  onClick={handleAutoSpread}
                  className="w-full py-2 px-3 rounded-lg bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs group"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-600 group-hover:scale-110 transition" />
                  <span>
                    {lang === 'en'
                      ? `Cover side space & maximize gaps (${maxSpreadGap} mm)`
                      : `উভয় পাশে জায়গা কভার করে সর্বোচ্চ ফাঁকা (${maxSpreadGap} মিমি)`}
                  </span>
                </button>
              )}

              {/* Slider 1: Col Gap (ছবির পাশাপাশি ফাঁকা) */}
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 leading-normal block">
                      {lang === 'en' ? 'Side-by-side gap between photos:' : 'ছবির পাশাপাশি ফাঁকা (গ্যাপ):'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {lang === 'en' ? 'Slide right to increase gap between photos' : 'মাঝখানের গ্যাপ বড় করতে স্লাইডার ডানে টানুন'}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded border border-blue-200/60">
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
                  className="w-full accent-blue-600 cursor-pointer mt-1.5"
                />
              </div>

              {/* Slider 2: Side Margins (দুই পাশের মার্জিন) */}
              <div className="pt-1 border-t border-slate-200/80 dark:border-slate-800/80">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 leading-normal block">
                      {lang === 'en' ? 'Side margins (Left & Right):' : 'দুই পাশের মার্জিন (বাম ও ডান):'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {lang === 'en' ? 'Decrease to cover more space on paper sides' : 'দুই পাশের অতিরিক্ত জায়গা কমাতে মার্জিন কমান'}
                    </span>
                  </div>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 text-xs">
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
                  className="w-full accent-blue-600 cursor-pointer mt-1.5"
                />
              </div>

              {/* Slider 3: Top Margin (উপরের মার্জিন) */}
              <div className="pt-1 border-t border-slate-200/80 dark:border-slate-800/80">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-600 dark:text-slate-400 leading-normal">
                    {lang === 'en' ? 'Top margin:' : 'উপরের মার্জিন:'}
                  </span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
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
                  className="w-full accent-blue-600 cursor-pointer mt-1.5"
                />
              </div>

              {/* Slider 4: Row Gap (ছবির উপর-নিচ ফাঁকা) */}
              <div className="pt-1 border-t border-slate-200/80 dark:border-slate-800/80">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-600 dark:text-slate-400 leading-normal">
                    {lang === 'en' ? 'Vertical gap between rows:' : 'ছবির উপর-নিচ ফাঁকা:'}
                  </span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
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
                  className="w-full accent-blue-600 cursor-pointer mt-1.5"
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-800/80">
                <button
                  type="button"
                  onClick={handleAutoSpread}
                  className="flex-1 py-1 px-2 rounded-md text-[11px] font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-blue-500 text-blue-600 dark:text-blue-400 transition cursor-pointer text-center"
                >
                  {lang === 'en' ? `Max Spread (${maxSpreadGap} mm)` : `সর্বোচ্চ ছড়ানো (${maxSpreadGap} মিমি)`}
                </button>
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
                  className="flex-1 py-1 px-2 rounded-md text-[11px] font-medium bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 text-slate-600 dark:text-slate-400 transition cursor-pointer text-center"
                >
                  {lang === 'en' ? 'Reset Default (5 mm)' : 'ডিফল্ট রিসেট (৫ মিমি)'}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
