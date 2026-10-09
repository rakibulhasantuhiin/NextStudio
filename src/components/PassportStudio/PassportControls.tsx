import React, { useRef, useState } from 'react';
import {
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Edit3,
  ImageIcon,
  Loader2,
  Minus,
  Plus,
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
  onAutoFitPhoto: (index: number) => void;
  autoRemoveBg: boolean;
  setAutoRemoveBg: (val: boolean) => void;
  uploadBgMode: 'studio-blue' | 'white' | 'sky-blue' | 'off-white';
  setUploadBgMode: (mode: 'studio-blue' | 'white' | 'sky-blue' | 'off-white') => void;
  onQuickApplyBg: (index: number, mode: 'studio-blue' | 'white' | 'original') => void;
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
  setManualCount: (updater: (prev: number) => number) => void;
  margins: MarginSettings;
  setMargins: (updater: (prev: MarginSettings) => MarginSettings) => void;
  cuttingGuide: CuttingGuideStyle;
  setCuttingGuide: (g: CuttingGuideStyle) => void;
  bleedArea: number;
  setBleedArea: (b: number) => void;
  colorProfile: 'srgb' | 'cmyk' | 'bw';
  setColorProfile: (p: 'srgb' | 'cmyk' | 'bw') => void;
  dpi: 150 | 300 | 600;
  setDpi: (dpi: 150 | 300 | 600) => void;
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
      {/* 1. PHOTO & BACKGROUND (ছবি আপলোড ও ব্যাকগ্রাউন্ড)          */}
      {/* ======================================================== */}
      <section className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
              ১
            </div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-normal">
              ছবি আপলোড ও ব্যাকগ্রাউন্ড
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {photos.length === 0 ? 'খালি' : `${photos.length}টি ছবি`}
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
                  ছবি আপলোড করুন
                </span>
                <span className="text-[10px] text-slate-400 leading-normal">ফাইল ড্রপ বা ব্রাউজ</span>
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
              ক্যামেরা স্ন্যাপ
            </span>
            <span className="text-[10px] text-slate-400 leading-normal">সরাসরি ছবি তুলুন</span>
          </div>
        </div>

        {/* Empty state hint if no photos loaded yet */}
        {photos.length === 0 && (
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
              কোনো ছবি লোড করা নেই। শুরু করতে উপরের বাটনে ক্লিক করে ছবি আপলোড করুন।
            </p>
          </div>
        )}

        {/* Active Photo Card & Quick Actions (Only rendered if photo exists) */}
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
                    নির্বাচিত ছবি #{activePhotoIndex + 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onDuplicatePhoto(activePhotoIndex)}
                      className="p-1 text-slate-400 hover:text-blue-600 rounded cursor-pointer"
                      title="ডুপ্লিকেট কপি"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {photos.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onRemovePhoto(activePhotoIndex)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                        title="ছবি মুছুন"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 1-Click Background Options */}
                <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-slate-500 font-medium">ব্যাকগ্রাউন্ড:</span>
                  <button
                    type="button"
                    onClick={() => onQuickApplyBg(activePhotoIndex, 'original')}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition cursor-pointer ${
                      activePhoto.adjustments.backgroundMode === 'original'
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 ring-2 ring-blue-500 shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {activePhoto.adjustments.backgroundMode === 'original' ? '✓ মূল ব্যাকগ্রাউন্ড' : 'মূল ব্যাকগ্রাউন্ড'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onQuickApplyBg(activePhotoIndex, 'studio-blue')}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition cursor-pointer shadow-2xs ${
                      activePhoto.adjustments.backgroundMode === 'studio-blue'
                        ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                        : 'bg-blue-600/90 text-white hover:bg-blue-700'
                    }`}
                  >
                    {activePhoto.adjustments.backgroundMode === 'studio-blue' ? '✓ নীল' : 'নীল'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onQuickApplyBg(activePhotoIndex, 'white')}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition cursor-pointer shadow-2xs ${
                      activePhoto.adjustments.backgroundMode === 'white'
                        ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border-blue-600 ring-2 ring-blue-400'
                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {activePhoto.adjustments.backgroundMode === 'white' ? '✓ সাদা' : 'সাদা'}
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/80 dark:border-slate-800">
              <button
                type="button"
                onClick={() => onAutoFitPhoto(activePhotoIndex)}
                className="py-1.5 px-2 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 hover:bg-emerald-100 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>অটো সোজা ও ফিট</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenEditor(activePhotoIndex)}
                className="py-1.5 px-2 rounded-md bg-slate-900 dark:bg-slate-800 text-white hover:bg-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 shrink-0" />
                <span>ক্রপ ও ফুল এডিটর</span>
              </button>
            </div>
          </div>
        )}

        {/* Multi-Photo Carousel (When >1 photo loaded) */}
        {photos.length > 1 && (
          <div className="pt-1">
            <span className="text-[11px] font-semibold text-slate-500 block mb-1.5 leading-normal">
              সব ছবি ({photos.length}টি):
            </span>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {photos.map((item, idx) => {
                const isSelected = idx === activePhotoIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActivePhotoIndex(idx)}
                    className={`relative rounded-md p-0.5 border shrink-0 transition cursor-pointer ${
                      isSelected
                        ? 'border-blue-600 ring-2 ring-blue-500/30'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-400'
                    }`}
                  >
                    <img
                      src={item.processedSrc || item.originalSrc}
                      alt={`Photo ${idx + 1}`}
                      className="w-10 h-12 object-cover rounded"
                    />
                    <span className="absolute bottom-0.5 right-0.5 bg-black/70 text-white text-[9px] font-mono px-1 rounded">
                      #{idx + 1}
                    </span>
                  </button>
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
              ২
            </div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-normal">
              ছবির নির্দিষ্ট সাইজ ও অনুপাত
            </h2>
          </div>
          <span className="text-xs text-blue-600 dark:text-blue-400 font-mono font-semibold">
            {preset !== 'custom'
              ? `${PHOTO_PRESETS[preset]?.width || 35} × ${PHOTO_PRESETS[preset]?.height || 45} মিমি`
              : `${customWidth} × ${customHeight} মিমি`}
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
                  {item.width} × {item.height} মিমি
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
                প্রস্থ (Width মিমি):
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
                উচ্চতা (Height মিমি):
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
      <section className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
              ৩
            </div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-normal">
              কপির সংখ্যা ও সাজানো
            </h2>
          </div>
        </div>

        {/* Layout Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* Top 5 Standard */}
          <button
            type="button"
            onClick={() => setLayoutMode('top-5')}
            className={`p-2.5 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
              layoutMode === 'top-5'
                ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-semibold shadow-2xs'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-slate-50/50 dark:bg-slate-950/30 text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs leading-normal">শীর্ষে ৫ কপি</span>
              {layoutMode === 'top-5' && <Check className="w-3.5 h-3.5 text-blue-600 ml-1" />}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 leading-normal">
              A4 পেপারের উপরে স্ট্যান্ডার্ড ১ সারি
            </span>
          </button>

          {/* Full Page Fill */}
          <button
            type="button"
            onClick={() => setLayoutMode('full-grid')}
            className={`p-2.5 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
              layoutMode === 'full-grid'
                ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-semibold shadow-2xs'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-slate-50/50 dark:bg-slate-950/30 text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs leading-normal">পুরো পেপার ভর্তি</span>
              {layoutMode === 'full-grid' && <Check className="w-3.5 h-3.5 text-blue-600 ml-1" />}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 leading-normal">
              সম্পূর্ণ পাতা জুড়ে সর্বোচ্চ কপি
            </span>
          </button>

          {/* Custom Count */}
          <button
            type="button"
            onClick={() => setLayoutMode('manual')}
            className={`p-2.5 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
              layoutMode === 'manual'
                ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-semibold shadow-2xs'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-slate-50/50 dark:bg-slate-950/30 text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs leading-normal">নির্দিষ্ট সংখ্যা</span>
              {layoutMode === 'manual' && <Check className="w-3.5 h-3.5 text-blue-600 ml-1" />}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 leading-normal">
              কাস্টম কপি ({manualCount} কপি)
            </span>
          </button>
        </div>

        {/* Counter controls if manual */}
        {layoutMode === 'manual' && (
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-normal">
              কপির সংখ্যা নির্ধারণ করুন:
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
                {manualCount} কপি
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
      </section>

      {/* ======================================================== */}
      {/* 4. PAPER & CUTTING GUIDE (পেপার ও কাটিং লাইন)               */}
      {/* ======================================================== */}
      <section className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
              ৪
            </div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-normal">
              পেপার ও কাটিং লাইন
            </h2>
          </div>
        </div>

        {/* Paper Size & Orientation Selector */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1 leading-normal">
              কাগজের সাইজ:
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
              কাগজের দিক:
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
                লম্বালম্বি
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
                আড়াআড়ি
              </button>
            </div>
          </div>
        </div>

        {/* Cutting Guide Options */}
        <div>
          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1 leading-normal">
            কাটার সুবিধার জন্য গাইড দাগ:
          </label>
          <div className="grid grid-cols-4 gap-1.5 text-xs">
            {[
              { id: 'none', label: '❌ নেই' },
              { id: 'scissors', label: '✂️ কাঁচি' },
              { id: 'dashed', label: '╌ ড্যাশ' },
              { id: 'solid', label: '⬛ বর্ডার' },
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
              <span>মার্জিন ও স্পেসিং অ্যাডজাস্টমেন্ট (ঐচ্ছিক)</span>
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
                  <span>উভয় পাশে জায়গা কভার করে সর্বোচ্চ ফাঁকা ({maxSpreadGap} মিমি)</span>
                </button>
              )}

              {/* Slider 1: Col Gap (ছবির পাশাপাশি ফাঁকা) */}
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 leading-normal block">
                      ছবির পাশাপাশি ফাঁকা (গ্যাপ):
                    </span>
                    <span className="text-[10px] text-slate-400">
                      মাঝখানের গ্যাপ বড় করতে স্লাইডার ডানে টানুন
                    </span>
                  </div>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded border border-blue-200/60">
                    {margins.colGap} মিমি
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
                      দুই পাশের মার্জিন (বাম ও ডান):
                    </span>
                    <span className="text-[10px] text-slate-400">
                      দুই পাশের অতিরিক্ত জায়গা কমাতে মার্জিন কমান
                    </span>
                  </div>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 text-xs">
                    {margins.left} মিমি
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
                    উপরের মার্জিন:
                  </span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {margins.top} মিমি
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
                    ছবির উপর-নিচ ফাঁকা:
                  </span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {margins.rowGap} মিমি
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
                  সর্বোচ্চ ছড়ানো ({maxSpreadGap} মিমি)
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
                  ডিফল্ট রিসেট (৫ মিমি)
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
