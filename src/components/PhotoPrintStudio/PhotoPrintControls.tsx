import React, { useMemo, useRef, useState } from 'react';
import {
  Check,
  Copy,
  FileDown,
  Image as ImageIcon,
  ImageDown,
  Loader2,
  Maximize2,
  Printer,
  RotateCw,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  ColorProfile,
  CuttingGuideStyle,
  PaperDimensions,
  PaperOrientation,
  PaperSizeType,
  PhotoPrintSettings,
  PhotoPrintSizeId,
  PrintQuality,
} from '../../types';
import {
  PHOTO_PRINT_PRESETS,
  calculatePhotoPrintGrid,
} from '../../utils/photoPrintLayout';
import {
  InspectorHeader,
  InspectorSection,
  InspectorTabs,
  PaperOutputSection,
} from '../ui/InspectorPrimitives';

interface Props {
  lang: 'bn' | 'en';
  settings: PhotoPrintSettings;
  setSettings: React.Dispatch<React.SetStateAction<PhotoPrintSettings>>;
  paper: PaperDimensions;
  paperSize: PaperSizeType;
  setPaperSize: (size: PaperSizeType) => void;
  customPaperWidth: number;
  setCustomPaperWidth: (w: number) => void;
  customPaperHeight: number;
  setCustomPaperHeight: (h: number) => void;
  orientation: PaperOrientation;
  setOrientation: (o: PaperOrientation) => void;
  cuttingGuide: CuttingGuideStyle;
  setCuttingGuide: (g: CuttingGuideStyle) => void;
  colorProfile: ColorProfile;
  setColorProfile: (p: ColorProfile) => void;
  dpi: PrintQuality;
  setDpi: (d: PrintQuality) => void;
  onUploadBatch: (files: FileList | File[]) => void;
  onUploadSlot: (slotIndex: number) => void;
  onRotateSlot: (slotIndex: number) => void;
  onToggleSlotFit: (slotIndex: number) => void;
  onClearSlot: (slotIndex: number) => void;
  onFillAllWithFirst: () => void;
  onClearAllSlots: () => void;
  onPrint: () => void;
  onDownloadPdf: () => void;
  onDownloadImage: (format: 'png' | 'jpeg') => void;
  isExporting?: boolean;
}

type PhotoPrintTab = 'photos' | 'paper';

export const PhotoPrintControls: React.FC<Props> = ({
  lang,
  settings,
  setSettings,
  paper,
  paperSize,
  setPaperSize,
  customPaperWidth,
  setCustomPaperWidth,
  customPaperHeight,
  setCustomPaperHeight,
  orientation,
  setOrientation,
  cuttingGuide,
  setCuttingGuide,
  colorProfile,
  setColorProfile,
  dpi,
  setDpi,
  onUploadBatch,
  onUploadSlot,
  onRotateSlot,
  onToggleSlotFit,
  onClearSlot,
  onFillAllWithFirst,
  onClearAllSlots,
  onPrint,
  onDownloadPdf,
  onDownloadImage,
  isExporting = false,
}) => {
  const [activeTab, setActiveTab] = useState<PhotoPrintTab>('photos');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const grid = useMemo(
    () =>
      calculatePhotoPrintGrid({
        paper,
        orientation,
        sizeId: settings.sizeId,
        customWidthMm: settings.customWidthMm,
        customHeightMm: settings.customHeightMm,
        marginMm: settings.marginMm,
        gapMm: settings.gapMm,
        autoRotateToFit: settings.autoRotateToFit,
      }),
    [
      paper,
      orientation,
      settings.sizeId,
      settings.customWidthMm,
      settings.customHeightMm,
      settings.marginMm,
      settings.gapMm,
      settings.autoRotateToFit,
    ]
  );

  const filledCount = grid.slots.filter((_, i) => Boolean(settings.slots[i])).length;
  const anyFilled = settings.slots.some(Boolean);
  const presetList = Object.values(PHOTO_PRINT_PRESETS);

  const handleSelectSize = (sizeId: PhotoPrintSizeId) => {
    setSettings((prev) => ({ ...prev, sizeId }));
    // Convenience: selecting '4up-a4' or 'a4-full' on 4R paper switches to A4 automatically so 4-up / full A4 fits
    if ((sizeId === '4up-a4' || sizeId === 'a4-full') && paperSize === '4r') {
      setPaperSize('a4');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUploadBatch(e.dataTransfer.files);
    }
  };

  return (
    <div className="space-y-4">
      <InspectorHeader
        title={lang === 'bn' ? 'ছবি প্রিন্ট স্টুডিও' : 'Photo Print Studio'}
        description={
          lang === 'bn'
            ? 'সাইজ বেছে নিন, ছবি আপলোড করুন এবং সরাসরি প্রিন্ট বা ডাউনলোড করুন।'
            : 'Choose a photo size, upload into slots, and print or download.'
        }
        meta={`${filledCount}/${grid.totalSlots} · ${dpi} DPI`}
      />

      <InspectorTabs<PhotoPrintTab>
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'photos', label: lang === 'bn' ? 'ছবি ও সাইজ' : 'Photo & Size' },
          { id: 'paper', label: lang === 'bn' ? 'পেপার ও প্রিন্ট' : 'Paper & Print' },
        ]}
      />

      {activeTab === 'photos' && (
        <div className="space-y-4">
          {/* 1. Direct Multi-Upload & Slot Fill Controls */}
          <InspectorSection
            first
            title={lang === 'bn' ? '১. ছবি আপলোড করুন' : '1. Upload Photos'}
            meta={
              lang === 'bn'
                ? `${grid.totalSlots}টি ঘর রেডি`
                : `${grid.totalSlots} slots ready`
            }
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  onUploadBatch(e.target.files);
                }
                e.target.value = '';
              }}
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="rounded-xl border-2 border-dashed border-blue-400/70 dark:border-blue-500/50 bg-blue-50/45 dark:bg-blue-950/20 hover:bg-blue-50/80 dark:hover:bg-blue-950/35 p-3.5 text-center cursor-pointer transition space-y-1.5"
            >
              <Upload className="w-5 h-5 text-blue-600 dark:text-blue-400 mx-auto" />
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                {lang === 'bn'
                  ? 'ছবি বেছে নিন (১টি বা একসাথে ৪টি+)'
                  : 'Choose Photo(s) — Single or Multiple'}
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                {lang === 'bn'
                  ? 'আপলোড করলেই প্রিভিউয়ে চলে যাবে — চাইলে ডান পাশের যেকোনো ঘরেও ক্লিক করে দিতে পারবেন।'
                  : 'Uploads straight to preview — or click any slot on the sheet.'}
              </p>
            </div>

            {/* Single-photo Fill Behavior Switch */}
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl glass-track">
              <button
                type="button"
                onClick={() => setSettings((prev) => ({ ...prev, fillMode: 'individual' }))}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  settings.fillMode === 'individual'
                    ? 'glass-btn-primary text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {lang === 'bn' ? 'প্রতি ঘরে আলাদা ছবি' : 'Separate Per Slot'}
              </button>
              <button
                type="button"
                onClick={() => setSettings((prev) => ({ ...prev, fillMode: 'repeat-all' }))}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  settings.fillMode === 'repeat-all'
                    ? 'glass-btn-primary text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {lang === 'bn' ? '১ ছবিতে সব ঘর' : '1 Photo Fills All'}
              </button>
            </div>

            {anyFilled && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {grid.totalSlots > 1 && (
                  <button
                    type="button"
                    onClick={onFillAllWithFirst}
                    className="flex-1 py-1.5 px-2.5 rounded-lg glass-tile text-[11px] font-semibold text-blue-700 dark:text-blue-300 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3 shrink-0" />
                    <span>
                      {lang === 'bn' ? `সব ${grid.totalSlots} ঘরে কপি` : `Fill All ${grid.totalSlots}`}
                    </span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClearAllSlots}
                  className="py-1.5 px-2.5 rounded-lg glass-tile text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3 shrink-0" />
                  <span>{lang === 'bn' ? 'সব মুছুন' : 'Clear'}</span>
                </button>
              </div>
            )}

            {/* Quick Slot Thumbnails Strip */}
            <div className="grid grid-cols-4 gap-1.5">
              {grid.slots.slice(0, 12).map((rect, idx) => {
                const slot = settings.slots[idx];
                return (
                  <div
                    key={rect.index}
                    className="relative rounded-lg border border-slate-200/80 dark:border-white/15 bg-white/75 dark:bg-slate-900/70 overflow-hidden aspect-[3/4] flex flex-col items-center justify-center group"
                  >
                    {slot ? (
                      <>
                        <img
                          src={slot.imageSrc}
                          alt={slot.name}
                          onClick={() => onUploadSlot(idx)}
                          className="w-full h-full object-cover cursor-pointer"
                          style={{ transform: `rotate(${slot.rotation}deg)` }}
                        />
                        <span className="absolute top-0.5 left-0.5 px-1 rounded bg-slate-900/75 text-white text-[9px] font-mono tabular-nums">
                          #{idx + 1}
                        </span>
                        <div className="absolute inset-x-0 bottom-0 bg-slate-950/75 flex items-center justify-around py-0.5 opacity-0 group-hover:opacity-100 transition">
                          <button
                            type="button"
                            onClick={() => onRotateSlot(idx)}
                            className="p-0.5 text-white hover:text-blue-300 cursor-pointer"
                            title={lang === 'bn' ? 'ঘোরান' : 'Rotate'}
                          >
                            <RotateCw className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onToggleSlotFit(idx)}
                            className="p-0.5 text-white hover:text-emerald-300 cursor-pointer"
                            title={lang === 'bn' ? 'ফিট মোড' : 'Fit Mode'}
                          >
                            <Maximize2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onClearSlot(idx)}
                            className="p-0.5 text-white hover:text-rose-400 cursor-pointer"
                            title={lang === 'bn' ? 'বাদ দিন' : 'Remove'}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onUploadSlot(idx)}
                        className="w-full h-full flex flex-col items-center justify-center gap-0.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/40 dark:hover:bg-blue-950/30 transition cursor-pointer"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-mono font-bold tabular-nums">
                          #{idx + 1}
                        </span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </InspectorSection>

          {/* 2. All Photo Sizes + Sheet Capacity */}
          <InspectorSection
            title={lang === 'bn' ? '২. ছবির সাইজ ও পেপার' : '2. Photo Size & Sheet'}
            meta={`${grid.slotWidthMm}×${grid.slotHeightMm} mm`}
          >
            {/* Quick Paper Presets */}
            <div className="grid grid-cols-4 gap-1.5">
              {(
                [
                  { id: 'a4', label: 'A4' },
                  { id: '4r', label: '4R' },
                  { id: 'a5', label: 'A5' },
                  { id: 'letter', label: 'Letter' },
                ] as { id: PaperSizeType; label: string }[]
              ).map((pOpt) => {
                const active = paperSize === pOpt.id;
                return (
                  <button
                    key={pOpt.id}
                    type="button"
                    onClick={() => setPaperSize(pOpt.id)}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      active
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                        : 'glass-tile text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {pOpt.label}
                  </button>
                );
              })}
            </div>

            {/* Complete Studio Photo Size Grid */}
            <div className="grid grid-cols-2 gap-1.5">
              {presetList.map((preset) => {
                const isSelected = settings.sizeId === preset.id;
                const previewFit = calculatePhotoPrintGrid({
                  paper,
                  orientation,
                  sizeId: preset.id,
                  customWidthMm: settings.customWidthMm,
                  customHeightMm: settings.customHeightMm,
                  marginMm: settings.marginMm,
                  gapMm: settings.gapMm,
                  autoRotateToFit: settings.autoRotateToFit,
                });

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectSize(preset.id)}
                    className={`p-2 rounded-xl text-left transition cursor-pointer ${
                      isSelected
                        ? 'glass-btn-primary text-white'
                        : 'glass-tile text-slate-800 dark:text-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-[11px] leading-tight truncate">
                        {lang === 'bn' ? preset.shortLabelBn : preset.shortLabelEn}
                      </span>
                      {isSelected && <Check className="w-3 h-3 shrink-0" />}
                    </div>
                    <div
                      className={`text-[10px] font-mono mt-0.5 tabular-nums flex items-center justify-between gap-1 ${
                        isSelected ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <span>
                        {preset.id === 'custom'
                          ? `${settings.customWidthMm}×${settings.customHeightMm}`
                          : `${preset.widthMm}×${preset.heightMm}`}
                      </span>
                      <span className="font-semibold">
                        {lang === 'bn'
                          ? `${previewFit.totalSlots}টি`
                          : `${previewFit.totalSlots}/pg`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {settings.sizeId === 'custom' && (
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl glass-track">
                <div>
                  <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                    {lang === 'bn' ? 'প্রস্থ (মিমি)' : 'Width (mm)'}
                  </label>
                  <input
                    type="number"
                    min="15"
                    max="400"
                    value={settings.customWidthMm}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        customWidthMm: Math.max(15, Math.min(400, Number(e.target.value) || 100)),
                      }))
                    }
                    className="w-full px-2 py-1 rounded-lg glass-input text-xs font-mono font-semibold tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                    {lang === 'bn' ? 'উচ্চতা (মিমি)' : 'Height (mm)'}
                  </label>
                  <input
                    type="number"
                    min="15"
                    max="400"
                    value={settings.customHeightMm}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        customHeightMm: Math.max(15, Math.min(400, Number(e.target.value) || 140)),
                      }))
                    }
                    className="w-full px-2 py-1 rounded-lg glass-input text-xs font-mono font-semibold tabular-nums"
                  />
                </div>
              </div>
            )}

            {/* Fit Mode & Auto-Rotate */}
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl glass-track">
              <button
                type="button"
                onClick={() => setSettings((prev) => ({ ...prev, fitMode: 'cover' }))}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  settings.fitMode === 'cover'
                    ? 'glass-tab-active text-blue-600 dark:text-blue-400'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {lang === 'bn' ? 'ফুল বর্ডার ফিট' : 'Crop to Fill'}
              </button>
              <button
                type="button"
                onClick={() => setSettings((prev) => ({ ...prev, fitMode: 'contain' }))}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  settings.fitMode === 'contain'
                    ? 'glass-tab-active text-blue-600 dark:text-blue-400'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {lang === 'bn' ? 'পুরো ছবি (না কেটে)' : 'Full Photo'}
              </button>
            </div>

            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoRotateToFit}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, autoRotateToFit: e.target.checked }))
                }
                className="rounded accent-blue-600 w-3.5 h-3.5 cursor-pointer"
              />
              <span>
                {lang === 'bn'
                  ? 'বেশি ছবি ধরতে অটো ঘুরিয়ে সাজান'
                  : 'Auto-rotate slots to fit max per sheet'}
              </span>
            </label>

            {/* Compact Margin & Gap */}
            <div className="grid grid-cols-2 gap-2.5 text-[11px]">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-600 dark:text-slate-400">
                    {lang === 'bn' ? 'মার্জিন' : 'Margin'}
                  </span>
                  <span className="font-mono font-semibold tabular-nums">{settings.marginMm} mm</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="1"
                  value={settings.marginMm}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, marginMm: Number(e.target.value) }))
                  }
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-600 dark:text-slate-400">
                    {lang === 'bn' ? 'গ্যাপ' : 'Gap'}
                  </span>
                  <span className="font-mono font-semibold tabular-nums">{settings.gapMm} mm</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="15"
                  step="1"
                  value={settings.gapMm}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, gapMm: Number(e.target.value) }))
                  }
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>
            </div>
          </InspectorSection>

          {/* 3. Direct DPI Quality & Quick Print / Download */}
          <InspectorSection
            title={lang === 'bn' ? '৩. প্রিন্ট কোয়ালিটি (DPI) ও ডাউনলোড' : '3. DPI Quality & Export'}
          >
            <div className="grid grid-cols-3 gap-1.5">
              {([150, 300, 600] as PrintQuality[]).map((q) => {
                const active = dpi === q;
                return (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setDpi(q)}
                    className={`py-2 px-1.5 rounded-xl text-center transition cursor-pointer ${
                      active
                        ? 'glass-btn-primary text-white'
                        : 'glass-tile text-slate-800 dark:text-slate-100'
                    }`}
                  >
                    <span className="text-xs font-mono font-bold block tabular-nums">{q} DPI</span>
                    <span
                      className={`text-[10px] block ${
                        active ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {q === 150
                        ? lang === 'bn'
                          ? 'দ্রুত'
                          : 'Fast'
                        : q === 300
                        ? lang === 'bn'
                          ? 'স্টুডিও HD'
                          : 'Studio HD'
                        : lang === 'bn'
                        ? 'আল্ট্রা 4K'
                        : 'Ultra 4K'}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onPrint}
                className="py-2.5 px-3 rounded-xl glass-btn-primary text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4 shrink-0" />
                <span>{lang === 'bn' ? 'প্রিন্ট করুন' : 'Print Now'}</span>
              </button>
              <button
                type="button"
                disabled={isExporting}
                onClick={onDownloadPdf}
                className="py-2.5 px-3 rounded-xl glass-tile text-slate-900 dark:text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
                ) : (
                  <FileDown className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                )}
                <span>{lang === 'bn' ? 'PDF ডাউনলোড' : 'Download PDF'}</span>
              </button>
              <button
                type="button"
                disabled={isExporting}
                onClick={() => onDownloadImage('jpeg')}
                className="py-2 px-3 rounded-xl glass-tile text-slate-800 dark:text-slate-100 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <ImageDown className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{lang === 'bn' ? 'JPG ডাউনলোড' : 'Download JPG'}</span>
              </button>
              <button
                type="button"
                disabled={isExporting}
                onClick={() => onDownloadImage('png')}
                className="py-2 px-3 rounded-xl glass-tile text-slate-800 dark:text-slate-100 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <ImageDown className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>{lang === 'bn' ? 'PNG ডাউনলোড' : 'Download PNG'}</span>
              </button>
            </div>
          </InspectorSection>
        </div>
      )}

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
