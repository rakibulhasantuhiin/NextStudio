import React, { useRef, useState } from 'react';
import {
  AlignCenterHorizontal,
  ArrowLeftRight,
  Columns2,
  Edit3,
  Lock,
  Maximize2,
  RotateCw,
  Scissors,
  Sparkles,
  Target,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  ColorProfile,
  CuttingGuideStyle,
  LaminationCardPreset,
  LaminationCardSettings,
  PaperOrientation,
  PaperSizeType,
  PrintQuality,
} from '../../types';
import {
  alignLaminationTopCenter,
  LAMINATION_CARD_PRESETS,
  PAPER_SIZES,
} from '../../utils/constants';
import { translations } from '../../utils/translations';
import {
  InspectorHeader,
  InspectorSection,
  InspectorTabs,
  PaperOutputSection,
} from '../ui/InspectorPrimitives';

interface Props {
  lang: 'bn' | 'en';
  lamination: LaminationCardSettings;
  setLamination: React.Dispatch<React.SetStateAction<LaminationCardSettings>>;
  onUploadSide: (side: 'front' | 'back', file: File) => void;
  onRotateSide: (side: 'front' | 'back') => void;
  onAutoFitBoth: () => void;
  onEditSide: (side: 'front' | 'back') => void;
  onSwapSides: () => void;
  onToggleWhiteFilter: (enabled: boolean) => void;
  onAlignTopCenter: () => void;
  onCenterPage: () => void;
  onSnapLevel: () => void;
  paperSize: PaperSizeType;
  setPaperSize: (size: PaperSizeType) => void;
  customPaperWidth: number;
  setCustomPaperWidth: (w: number) => void;
  customPaperHeight: number;
  setCustomPaperHeight: (h: number) => void;
  orientation: PaperOrientation;
  setOrientation: (o: PaperOrientation) => void;
  colorProfile: ColorProfile;
  setColorProfile: (p: ColorProfile) => void;
  dpi: PrintQuality;
  setDpi: (dpi: PrintQuality) => void;
}

type LamTab = 'cards' | 'fold' | 'paper';

export const LaminationControls: React.FC<Props> = ({
  lang,
  lamination,
  setLamination,
  onUploadSide,
  onRotateSide,
  onAutoFitBoth,
  onEditSide,
  onSwapSides,
  onToggleWhiteFilter,
  onAlignTopCenter,
  onCenterPage,
  onSnapLevel,
  paperSize,
  setPaperSize,
  customPaperWidth,
  setCustomPaperWidth,
  customPaperHeight,
  setCustomPaperHeight,
  orientation,
  setOrientation,
  colorProfile,
  setColorProfile,
  dpi,
  setDpi,
}) => {
  const t = translations[lang];
  const [activeTab, setActiveTab] = useState<LamTab>('cards');
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  const effPaper =
    paperSize === 'custom'
      ? { width: customPaperWidth, height: customPaperHeight }
      : PAPER_SIZES[paperSize];
  const paperWidthMm = orientation === 'landscape' ? effPaper.height : effPaper.width;
  const paperHeightMm = orientation === 'landscape' ? effPaper.width : effPaper.height;

  const handleSelectPreset = (presetId: LaminationCardPreset) => {
    const cfg = LAMINATION_CARD_PRESETS[presetId];
    setLamination((prev) => {
      const nextW = presetId === 'custom' ? prev.cardWidth : cfg.width;
      const nextH = presetId === 'custom' ? prev.cardHeight : cfg.height;
      const aligned = alignLaminationTopCenter({
        paperWidthMm,
        cardWidth: nextW,
        foldGap: prev.foldGap,
        topY: Math.min(prev.frontY, Math.max(4, paperHeightMm - nextH - 4)),
      });
      return {
        ...prev,
        preset: presetId,
        cardWidth: nextW,
        cardHeight: nextH,
        ...aligned,
      };
    });
  };

  const handleDimensionChange = (dim: 'width' | 'height', value: number) => {
    const safeVal = Math.max(20, Math.min(200, Number(value) || 54));
    setLamination((prev) => {
      const nextW = dim === 'width' ? safeVal : prev.cardWidth;
      const nextH = dim === 'height' ? safeVal : prev.cardHeight;
      const aligned = alignLaminationTopCenter({
        paperWidthMm,
        cardWidth: nextW,
        foldGap: prev.foldGap,
        topY: Math.min(prev.frontY, Math.max(4, paperHeightMm - nextH - 4)),
      });
      return {
        ...prev,
        preset: 'custom',
        cardWidth: nextW,
        cardHeight: nextH,
        ...aligned,
      };
    });
  };

  const handleFoldGapChange = (newGap: number) => {
    const safeGap = Math.max(0, Math.min(20, newGap));
    setLamination((prev) => {
      const aligned = alignLaminationTopCenter({
        paperWidthMm,
        cardWidth: prev.cardWidth,
        foldGap: safeGap,
        topY: prev.frontY,
      });
      return {
        ...prev,
        foldGap: safeGap,
        frontX: aligned.frontX,
        backX: aligned.backX,
        backY: prev.frontY,
      };
    });
  };

  const presetList: LaminationCardPreset[] = [
    'smart-nid',
    'driving-license',
    'laminating-nid',
    'old-voter-id',
    'student-id-h',
    'student-id-v',
    'job-id-h',
    'job-id-v',
    'custom',
  ];

  const imgFitClass = lamination.imageFit === 'cover' ? 'object-cover' : 'object-fill';
  const cardAspect = `${lamination.cardWidth} / ${lamination.cardHeight}`;

  return (
    <div className="space-y-4 text-slate-800 dark:text-slate-100">
      <InspectorHeader
        title={lang === 'bn' ? 'লেমিনেটিং আইডি কার্ড স্টুডিও' : 'Laminate ID Card Studio'}
        description={
          lang === 'bn'
            ? 'মাঝখান দিয়ে ভাঁজ করে লেমিনেটিংয়ের জন্য বাম ও ডান একদম সমান ফিট সাইজ'
            : 'Center-fold side-by-side ID layout with strict equal edge-to-edge Front & Back fit.'
        }
        meta={`${lamination.cardWidth} × ${lamination.cardHeight} mm`}
      />

      <InspectorTabs<LamTab>
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'cards', label: lang === 'bn' ? 'কার্ড ও সাইজ' : 'Cards & Size' },
          { id: 'fold', label: lang === 'bn' ? 'ভাঁজ ও মুভ' : 'Fold & Align' },
          { id: 'paper', label: lang === 'bn' ? 'পেপার ও প্রিন্ট' : 'Paper & Print' },
        ]}
      />

      {activeTab === 'cards' && (
        <div className="space-y-4">
          <InspectorSection
            first
            title={lang === 'en' ? 'Front (Left) & Back (Right)' : 'ফ্রন্ট (বাম) ও ব্যাক (ডান)'}
            action={
              lamination.frontImage || lamination.backImage ? (
                <button
                  type="button"
                  onClick={onSwapSides}
                  className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeftRight className="w-3 h-3" />
                  <span>{lang === 'en' ? 'Swap' : 'অদলবদল'}</span>
                </button>
              ) : undefined
            }
          >
            <div className="grid grid-cols-2 gap-2.5">
              {/* Front Left */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-400 truncate">
                    {lang === 'en' ? 'Front (Left)' : 'ফ্রন্ট (বাম)'}
                  </span>
                  {lamination.frontImage && (
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onRotateSide('front')}
                        className="p-1 text-slate-500 hover:text-blue-600 hover:bg-white/60 dark:hover:bg-white/10 rounded cursor-pointer"
                        title={lang === 'en' ? 'Rotate 90°' : '৯০° ঘোরান'}
                      >
                        <RotateCw className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditSide('front')}
                        className="p-1 text-blue-600 dark:text-blue-400 hover:bg-white/60 dark:hover:bg-white/10 rounded cursor-pointer"
                        title={lang === 'en' ? 'Edit Front' : 'এডিট'}
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setLamination((prev) => ({
                            ...prev,
                            frontImage: '',
                            processedFrontImage: '',
                            frontCrop: null,
                            frontStraighten: 0,
                          }))
                        }
                        className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                        title={lang === 'en' ? 'Remove' : 'মুছুন'}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
                <div
                  onClick={() => frontInputRef.current?.click()}
                  style={{ aspectRatio: cardAspect }}
                  className="relative max-h-36 mx-auto w-full rounded-2xl glass-dropzone overflow-hidden flex items-center justify-center cursor-pointer group"
                >
                  <input
                    ref={frontInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) onUploadSide('front', e.target.files[0]);
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                  {lamination.processedFrontImage || lamination.frontImage ? (
                    <img
                      src={(lamination.processedFrontImage || lamination.frontImage) || undefined}
                      alt="Front"
                      className={`w-full h-full ${imgFitClass} block`}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-slate-500 dark:text-slate-400 group-hover:text-blue-600 p-2 text-center">
                      <Upload className="w-4 h-4" />
                      <span className="text-[11px] font-semibold">
                        {lang === 'en' ? 'Upload Front' : 'ফ্রন্ট দিন'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Back Right */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-400 truncate">
                    {lang === 'en' ? 'Back (Right)' : 'ব্যাক (ডান)'}
                  </span>
                  {lamination.backImage && (
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onRotateSide('back')}
                        className="p-1 text-slate-500 hover:text-blue-600 hover:bg-white/60 dark:hover:bg-white/10 rounded cursor-pointer"
                        title={lang === 'en' ? 'Rotate 90°' : '৯০° ঘোরান'}
                      >
                        <RotateCw className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditSide('back')}
                        className="p-1 text-blue-600 dark:text-blue-400 hover:bg-white/60 dark:hover:bg-white/10 rounded cursor-pointer"
                        title={lang === 'en' ? 'Edit Back' : 'এডিট'}
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setLamination((prev) => ({
                            ...prev,
                            backImage: '',
                            processedBackImage: '',
                            backCrop: null,
                            backStraighten: 0,
                          }))
                        }
                        className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                        title={lang === 'en' ? 'Remove' : 'মুছুন'}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
                <div
                  onClick={() => backInputRef.current?.click()}
                  style={{ aspectRatio: cardAspect }}
                  className="relative max-h-36 mx-auto w-full rounded-2xl glass-dropzone overflow-hidden flex items-center justify-center cursor-pointer group"
                >
                  <input
                    ref={backInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) onUploadSide('back', e.target.files[0]);
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                  {lamination.processedBackImage || lamination.backImage ? (
                    <img
                      src={(lamination.processedBackImage || lamination.backImage) || undefined}
                      alt="Back"
                      className={`w-full h-full ${imgFitClass} block`}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-slate-500 dark:text-slate-400 group-hover:text-blue-600 p-2 text-center">
                      <Upload className="w-4 h-4" />
                      <span className="text-[11px] font-semibold">
                        {lang === 'en' ? 'Upload Back' : 'ব্যাক দিন'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 1-Click Auto-Fit & Trim Equal Size Guarantee */}
            {(lamination.frontImage || lamination.backImage) && (
              <button
                type="button"
                onClick={onAutoFitBoth}
                className="w-full py-2 px-3 rounded-xl glass-tile hover:border-blue-500 text-xs font-semibold text-blue-700 dark:text-blue-300 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {lang === 'en'
                    ? 'Auto-Fit & Trim Edges Equally (Front = Back)'
                    : 'অটো-ফিট ও বর্ডার ট্রিম (ফ্রন্ট ও ব্যাক সমান ফিট)'}
                </span>
              </button>
            )}

            <label className="p-2.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/12 border border-emerald-500/25 flex items-center justify-between gap-2.5 cursor-pointer">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                    {lang === 'en' ? 'Clean White Scanner Filter' : 'সাদা স্ক্যানার ফিল্টার'}
                  </span>
                  <span className="text-[10px] text-slate-600 dark:text-slate-400 block">
                    {lang === 'en'
                      ? 'Removes camera shadows from captured cards'
                      : 'ছবি তোলা কার্ডের ছায়া পরিষ্কার করে'}
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={lamination.autoWhiteDocument}
                onChange={(e) => onToggleWhiteFilter(e.target.checked)}
                className="w-4 h-4 accent-emerald-600 cursor-pointer shrink-0"
              />
            </label>
          </InspectorSection>

          <InspectorSection
            title={lang === 'en' ? 'ID Card Type (Equal Size Lock)' : 'আইডি কার্ডের ধরন (উভয় সমান)'}
            meta={`${lamination.cardWidth} × ${lamination.cardHeight} mm`}
          >
            <div className="flex items-center gap-2 text-[11px] text-blue-700 dark:text-blue-300 font-medium">
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span>{t.laminationEqualLocked}</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {presetList.map((pid) => {
                const cfg = LAMINATION_CARD_PRESETS[pid];
                const active = lamination.preset === pid;
                return (
                  <button
                    key={pid}
                    type="button"
                    onClick={() => handleSelectPreset(pid)}
                    className={`p-2 rounded-xl text-left transition-all cursor-pointer ${
                      pid === 'custom' ? 'col-span-2' : ''
                    } ${
                      active
                        ? 'glass-btn-primary text-white'
                        : 'glass-tile text-slate-800 dark:text-slate-100'
                    }`}
                  >
                    <span className="text-[11px] font-bold block leading-tight">
                      {lang === 'en' ? cfg.nameEn : cfg.nameBn}
                    </span>
                    <span
                      className={`text-[10px] font-mono block mt-0.5 tabular-nums ${
                        active ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {pid === 'custom'
                        ? `${lamination.cardWidth} × ${lamination.cardHeight} mm`
                        : `${cfg.width} × ${cfg.height} mm`}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl glass-track">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  {lang === 'en' ? 'Width (Front = Back)' : 'প্রস্থ (উভয় সমান, মিমি)'}
                </label>
                <input
                  type="number"
                  min="20"
                  max="180"
                  step="0.5"
                  value={lamination.cardWidth}
                  onChange={(e) => handleDimensionChange('width', Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg glass-input text-slate-900 dark:text-slate-100 font-mono tabular-nums"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  {lang === 'en' ? 'Height (Front = Back)' : 'উচ্চতা (উভয় সমান, মিমি)'}
                </label>
                <input
                  type="number"
                  min="20"
                  max="200"
                  step="0.5"
                  value={lamination.cardHeight}
                  onChange={(e) => handleDimensionChange('height', Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg glass-input text-slate-900 dark:text-slate-100 font-mono tabular-nums"
                />
              </div>
            </div>
          </InspectorSection>
        </div>
      )}

      {activeTab === 'fold' && (
        <div className="space-y-4">
          <InspectorSection
            first
            title={lang === 'en' ? 'Quick Alignment' : 'দ্রুত অবস্থান সেটিং'}
          >
            <div className="grid grid-cols-3 gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={onAlignTopCenter}
                className="py-2 px-2 rounded-xl glass-btn-primary text-white font-semibold flex items-center justify-center gap-1 cursor-pointer"
              >
                <AlignCenterHorizontal className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{t.laminationTopCenter}</span>
              </button>
              <button
                type="button"
                onClick={onSnapLevel}
                className="py-2 px-2 rounded-xl glass-tile text-slate-700 dark:text-slate-200 font-semibold flex items-center justify-center gap-1 cursor-pointer"
              >
                <Columns2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="truncate">{t.laminationSnapLevel}</span>
              </button>
              <button
                type="button"
                onClick={onCenterPage}
                className="py-2 px-2 rounded-xl glass-tile text-slate-700 dark:text-slate-200 font-semibold flex items-center justify-center gap-1 cursor-pointer"
              >
                <Target className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="truncate">{lang === 'en' ? 'Center' : 'পেজ মাঝে'}</span>
              </button>
            </div>
          </InspectorSection>

          <InspectorSection
            title={t.laminationFoldGap}
            meta={`${lamination.foldGap} mm`}
          >
            <div className="grid grid-cols-4 gap-1.5 text-[11px]">
              {[0, 1, 2, 4].map((gap) => (
                <button
                  key={gap}
                  type="button"
                  onClick={() => handleFoldGapChange(gap)}
                  className={`py-1.5 px-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
                    lamination.foldGap === gap
                      ? 'glass-btn-primary text-white'
                      : 'glass-tile text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {gap === 0 ? (lang === 'en' ? '0 (Fold)' : '০ (লাগানো)') : `${gap} mm`}
                </button>
              ))}
            </div>
            <input
              type="range"
              min="0"
              max="20"
              step="0.5"
              value={lamination.foldGap}
              onChange={(e) => handleFoldGapChange(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </InspectorSection>

          <InspectorSection title={lang === 'en' ? 'Fold Seam & Cut Borders' : 'ভাঁজের দাগ ও কাটিং বর্ডার'}>
            <div className="space-y-2">
              <label className="p-2.5 rounded-xl glass-tile flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  <Scissors className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                    {t.laminationFoldLine}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={lamination.showFoldLine}
                  onChange={(e) =>
                    setLamination((prev) => ({ ...prev, showFoldLine: e.target.checked }))
                  }
                  className="w-4 h-4 accent-blue-600 cursor-pointer"
                />
              </label>

              <label className="p-2.5 rounded-xl glass-tile flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  <RotateCw className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                    {lang === 'en' ? 'Flip Back Side 180°' : 'পেছনের অংশ ১৮০° উল্টান'}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={lamination.backRotate180}
                  onChange={(e) =>
                    setLamination((prev) => ({ ...prev, backRotate180: e.target.checked }))
                  }
                  className="w-4 h-4 accent-blue-600 cursor-pointer"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs pt-1">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  {lang === 'en' ? 'Card Image Fit' : 'কার্ডে ছবির ফিট'}
                </label>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => setLamination((prev) => ({ ...prev, imageFit: 'fill' }))}
                    className={`py-1.5 px-1 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
                      lamination.imageFit === 'fill'
                        ? 'glass-btn-primary text-white'
                        : 'glass-tile text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {lang === 'en' ? 'Exact Fit' : 'সম্পূর্ণ ফিট'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLamination((prev) => ({ ...prev, imageFit: 'cover' }))}
                    className={`py-1.5 px-1 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
                      lamination.imageFit === 'cover'
                        ? 'glass-btn-primary text-white'
                        : 'glass-tile text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {lang === 'en' ? 'Crop Fill' : 'ক্রপ ফিল'}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  {lang === 'en' ? 'Cut Border' : 'কাটিং বর্ডার'}
                </label>
                <select
                  value={lamination.outerCutGuide}
                  onChange={(e) =>
                    setLamination((prev) => ({
                      ...prev,
                      outerCutGuide: e.target.value as CuttingGuideStyle,
                    }))
                  }
                  className="w-full px-2 py-1.5 rounded-xl text-xs glass-input text-slate-900 dark:text-slate-100 cursor-pointer"
                >
                  <option value="none">{lang === 'en' ? 'None' : 'কোনো দাগ নেই'}</option>
                  <option value="dashed">{lang === 'en' ? 'Dashed Cut Line' : 'ড্যাশ কাটিং লাইন'}</option>
                  <option value="scissors">{lang === 'en' ? 'Scissors + Dots' : 'কাঁচি ও ডট দাগ'}</option>
                  <option value="solid">{lang === 'en' ? 'Thin Solid Border' : 'হালকা সোজা বর্ডার'}</option>
                </select>
              </div>
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
        />
      )}
    </div>
  );
};
