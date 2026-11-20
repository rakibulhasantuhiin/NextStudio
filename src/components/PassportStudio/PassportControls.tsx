import React, { useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
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
  RotateCcw,
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
import {
  InspectorHeader,
  InspectorSection,
  InspectorTabs,
  PaperOutputSection,
} from '../ui/InspectorPrimitives';

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

export const PassportControls: React.FC<Props> = ({
  lang,
  photos,
  activePhotoIndex,
  setActivePhotoIndex,
  onUploadPhotos,
  onRemovePhoto,
  onDuplicatePhoto,
  onOpenEditor,
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
  onDistributeAllPhotos,
  onSwitchItemPhoto,
  onToggleItemSize,
  onNudgeItem,
  onDuplicateItem,
  onDeleteItem,
}) => {
  const [activeTab, setActiveTab] = useState<PassportTab>('photos');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

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
    layoutMode === 'top-5' ? 5 : layoutMode === 'top-4-couple' ? 4 : layoutMode === 'top-6' ? 6 : 5;

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

  const layoutTemplates: {
    id: LayoutMode;
    titleEn: string;
    titleBn: string;
    subEn: string;
    subBn: string;
  }[] = [
    {
      id: 'top-5',
      titleEn: 'Top 5 Passport',
      titleBn: 'উপরে ৫ পাসপোর্ট',
      subEn: 'Standard A4 top row',
      subBn: 'A4 পেপারে ১ সারি (৩৫×৪৫)',
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

  return (
    <div className="space-y-4 text-slate-800 dark:text-slate-100">
      <InspectorHeader
        title={lang === 'bn' ? 'পাসপোর্ট ও স্ট্যাম্প স্টুডিও' : 'Passport & Stamp Studio'}
        description={
          lang === 'bn'
            ? 'ছবি আপলোড, ক্রপ, এডজাস্টমেন্ট ও নিখুঁত মিলিমিটার গ্রিড প্রিন্ট'
            : 'Upload portraits, adjust & crop, and arrange precision print grids.'
        }
        meta={`${placedItems.length} ${lang === 'bn' ? 'কপি' : 'items'}`}
      />

      <InspectorTabs<PassportTab>
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'photos', label: lang === 'bn' ? 'ছবি ও সাইজ' : 'Photos & Size' },
          { id: 'layout', label: lang === 'bn' ? 'লেআউট ও গ্যাপ' : 'Layout & Grid' },
          { id: 'paper', label: lang === 'bn' ? 'পেপার ও প্রিন্ট' : 'Paper & Print' },
        ]}
      />

      {/* TAB 1: PHOTOS & SIZE */}
      {activeTab === 'photos' && (
        <div className="space-y-4">
          <InspectorSection
            first
            title={lang === 'bn' ? 'ছবি আপলোড' : 'Upload Photos'}
            meta={
              photos.length === 0
                ? lang === 'bn'
                  ? 'খালি'
                  : 'Empty'
                : `${photos.length} ${lang === 'bn' ? 'টি ছবি' : photos.length === 1 ? 'Photo' : 'Photos'}`
            }
          >
            <div className="grid grid-cols-2 gap-2">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="glass-dropzone rounded-2xl p-3.5 text-center cursor-pointer flex flex-col items-center justify-center min-h-[84px]"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => {
                    onUploadPhotos(e.target.files);
                    e.target.value = '';
                  }}
                  className="hidden"
                />
                {isUploading ? (
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                ) : (
                  <>
                    <Upload className="w-4 h-4 text-blue-600 dark:text-blue-400 mb-1.5" />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                      {lang === 'bn' ? 'ছবি বাছাই করুন' : 'Browse Files'}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {lang === 'bn' ? 'ড্রপ বা ক্লিক করুন' : 'Drop or click'}
                    </span>
                  </>
                )}
              </div>

              <div
                onClick={() => cameraInputRef.current?.click()}
                className="glass-tile rounded-xl p-3.5 text-center cursor-pointer flex flex-col items-center justify-center min-h-[84px]"
              >
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  onChange={(e) => {
                    onUploadPhotos(e.target.files);
                    e.target.value = '';
                  }}
                  className="hidden"
                />
                <Camera className="w-4 h-4 text-slate-700 dark:text-slate-200 mb-1.5" />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                  {lang === 'bn' ? 'ক্যামেরা স্ন্যাপ' : 'Camera Snap'}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {lang === 'bn' ? 'সরাসরি ছবি তুলুন' : 'Capture live'}
                </span>
              </div>
            </div>

            {activePhoto && (
              <div className="p-3 rounded-xl glass-track space-y-2.5">
                <div className="flex items-center gap-3">
                  <img
                    src={activePhoto.processedSrc || activePhoto.originalSrc}
                    alt="Active"
                    className="w-12 h-15 object-cover rounded-lg border border-white/60 dark:border-white/15 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {lang === 'bn'
                          ? `নির্বাচিত ছবি #${activePhotoIndex + 1}`
                          : `Selected Photo #${activePhotoIndex + 1}`}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => onDuplicatePhoto(activePhotoIndex)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-white/70 dark:hover:bg-white/10 rounded-md cursor-pointer"
                          title={lang === 'bn' ? 'ডুপ্লিকেট' : 'Duplicate'}
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        {photos.length > 1 && (
                          <button
                            type="button"
                            onClick={() => onRemovePhoto(activePhotoIndex)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white/70 dark:hover:bg-white/10 rounded-md cursor-pointer"
                            title={lang === 'bn' ? 'মুছুন' : 'Delete'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                      {lang === 'bn'
                        ? 'আলো, কনট্রাস্ট ও ক্রপ ঠিক করতে এডিটর খুলুন'
                        : 'Fine-tune brightness, contrast, or crop frame'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenEditor(activePhotoIndex)}
                  className="w-full py-2 px-3 rounded-xl glass-btn-primary text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{lang === 'bn' ? 'ক্রপ ও এডজাস্টমেন্ট এডিটর' : 'Open Adjustments & Crop'}</span>
                </button>
              </div>
            )}

            {photos.length > 1 && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    {lang === 'en'
                      ? `Uploaded Queue (${photos.length})`
                      : `আপলোডকৃত ছবি (${photos.length}টি)`}
                  </span>
                  {onDistributeAllPhotos && (
                    <button
                      type="button"
                      onClick={onDistributeAllPhotos}
                      className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{lang === 'en' ? 'Distribute All' : 'সব সাজান'}</span>
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-0.5">
                  {photos.map((item, idx) => {
                    const isSelected = idx === activePhotoIndex;
                    return (
                      <div
                        key={item.id}
                        className={`p-2 rounded-lg border transition-colors ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/30'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                        }`}
                      >
                        <div
                          onClick={() => setActivePhotoIndex(idx)}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <img
                            src={item.processedSrc || item.originalSrc}
                            alt={`Photo ${idx + 1}`}
                            className="w-9 h-11 object-cover rounded border border-slate-200 dark:border-slate-700 shrink-0"
                          />
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
                                className="p-0.5 text-slate-500 hover:text-blue-600 cursor-pointer"
                                title={lang === 'en' ? 'Edit' : 'এডিট'}
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRemovePhoto(idx);
                                }}
                                className="p-0.5 text-slate-400 hover:text-red-600 cursor-pointer"
                                title={lang === 'en' ? 'Delete' : 'মুছুন'}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-1 mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                          {onAddPassportCopy && (
                            <button
                              type="button"
                              onClick={() => onAddPassportCopy(item.id)}
                              className="py-1 px-1 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950 text-slate-700 dark:text-slate-200 hover:text-blue-600 text-center transition-colors cursor-pointer"
                            >
                              {lang === 'en' ? '+ Pass' : '+ পাসপোর্ট'}
                            </button>
                          )}
                          {onAddStampCopy && (
                            <button
                              type="button"
                              onClick={() => onAddStampCopy(item.id)}
                              className="py-1 px-1 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-200 hover:text-emerald-600 text-center transition-colors cursor-pointer"
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
          </InspectorSection>

          <InspectorSection
            title={lang === 'en' ? 'Photo Size Preset' : 'ছবির সাইজ নির্বাচন'}
            meta={`${effectivePhotoWidth} × ${effectivePhotoHeight} mm`}
          >
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(PHOTO_PRESETS).map(([key, item]) => {
                const isSelected = preset === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPreset(key as PhotoPresetType)}
                    className={`p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'glass-btn-primary text-white'
                        : 'glass-tile text-slate-800 dark:text-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-xs leading-tight">
                        {lang === 'bn' ? item.nameBn : item.nameEn}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                    </div>
                    <span
                      className={`text-[11px] font-mono block mt-1 tabular-nums ${
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
              <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl glass-track">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                    {lang === 'en' ? 'Width (mm)' : 'প্রস্থ (মিমি)'}
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="250"
                    value={customWidth}
                    onChange={(e) => setCustomWidth(Math.max(10, Number(e.target.value)))}
                    className="w-full px-2.5 py-1.5 rounded-lg glass-input text-slate-900 dark:text-slate-100 text-xs font-mono font-semibold tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                    {lang === 'en' ? 'Height (mm)' : 'উচ্চতা (মিমি)'}
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="250"
                    value={customHeight}
                    onChange={(e) => setCustomHeight(Math.max(10, Number(e.target.value)))}
                    className="w-full px-2.5 py-1.5 rounded-lg glass-input text-slate-900 dark:text-slate-100 text-xs font-mono font-semibold tabular-nums"
                  />
                </div>
              </div>
            )}
          </InspectorSection>
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
              meta={isSelectedItemStamp ? '20 × 25 mm' : '35 × 45 mm'}
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
                  {lang === 'en' ? `Auto Spread (${maxSpreadGap}mm)` : `সর্বোচ্চ গ্যাপ (${maxSpreadGap}মিমি)`}
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
