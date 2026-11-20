import React from 'react';
import {
  ColorProfile,
  CuttingGuideStyle,
  PaperOrientation,
  PaperSizeType,
  PrintQuality,
} from '../../types';
import { PAPER_SIZES } from '../../utils/constants';
import { translations } from '../../utils/translations';

export interface InspectorTabItem<T extends string> {
  id: T;
  label: string;
}

export function InspectorHeader({
  title,
  description,
  meta,
}: {
  title: string;
  description: string;
  meta?: string;
}) {
  return (
    <div className="pb-3.5 border-b border-slate-900/8 dark:border-white/10">
      <div className="flex items-baseline justify-between gap-2">
        <h1 className="text-[15px] font-bold tracking-tight text-slate-900 dark:text-white leading-snug">
          {title}
        </h1>
        {meta && (
          <span className="text-[11px] font-mono font-semibold text-blue-600 dark:text-blue-400 shrink-0 tabular-nums">
            {meta}
          </span>
        )}
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
        {description}
      </p>
    </div>
  );
}

export function InspectorTabs<T extends string>({
  tabs,
  activeTab,
  onChange,
}: {
  tabs: InspectorTabItem<T>[];
  activeTab: T;
  onChange: (id: T) => void;
}) {
  return (
    <div
      role="tablist"
      className="grid gap-1 p-1 rounded-2xl glass-track"
      style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
    >
      {tabs.map((tab) => {
        const active = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap truncate ${
              active
                ? 'glass-tab-active text-blue-600 dark:text-blue-400'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function InspectorSection({
  title,
  meta,
  action,
  children,
  first = false,
}: {
  title: string;
  meta?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  first?: boolean;
}) {
  return (
    <section
      className={`space-y-3 ${
        first ? 'pt-1' : 'pt-4 border-t border-slate-900/8 dark:border-white/10'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[13px] font-bold text-slate-900 dark:text-slate-50 leading-snug">
          {title}
        </h2>
        <div className="flex items-center gap-2 shrink-0">
          {meta && (
            <span className="text-[11px] font-mono font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
              {meta}
            </span>
          )}
          {action}
        </div>
      </div>
      {children}
    </section>
  );
}

interface PaperOutputProps {
  lang: 'bn' | 'en';
  paperSize: PaperSizeType;
  setPaperSize: (size: PaperSizeType) => void;
  customPaperWidth: number;
  setCustomPaperWidth?: (w: number) => void;
  customPaperHeight: number;
  setCustomPaperHeight?: (h: number) => void;
  orientation: PaperOrientation;
  setOrientation: (o: PaperOrientation) => void;
  colorProfile: ColorProfile;
  setColorProfile: (p: ColorProfile) => void;
  dpi: PrintQuality;
  setDpi: (dpi: PrintQuality) => void;
  cuttingGuide?: CuttingGuideStyle;
  setCuttingGuide?: (g: CuttingGuideStyle) => void;
  cuttingGuideOptions?: { id: CuttingGuideStyle; labelEn: string; labelBn: string }[];
}

export const PaperOutputSection: React.FC<PaperOutputProps> = ({
  lang,
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
  cuttingGuide,
  setCuttingGuide,
  cuttingGuideOptions,
}) => {
  const t = translations[lang];
  const effPaper =
    paperSize === 'custom'
      ? { width: customPaperWidth, height: customPaperHeight }
      : PAPER_SIZES[paperSize];
  const activeW = orientation === 'landscape' ? effPaper.height : effPaper.width;
  const activeH = orientation === 'landscape' ? effPaper.width : effPaper.height;

  const paperOptions: { id: PaperSizeType; title: string; sub: string }[] = [
    { id: 'a4', title: 'A4', sub: '210×297' },
    { id: 'a5', title: 'A5', sub: '148×210' },
    { id: 'letter', title: 'Letter', sub: '216×279' },
    { id: 'legal', title: 'Legal', sub: '216×356' },
    { id: 'b5', title: 'B5', sub: '176×250' },
    { id: '4r', title: '4R', sub: '102×152' },
    { id: 'custom', title: lang === 'en' ? 'Custom' : 'কাস্টম', sub: 'mm' },
  ];

  return (
    <div className="space-y-4">
      <InspectorSection
        first
        title={lang === 'en' ? 'Paper Size & Orientation' : 'কাগজের সাইজ ও দিক'}
        meta={`${activeW} × ${activeH} mm`}
      >
        <div className="grid grid-cols-4 gap-1.5">
          {paperOptions.map((opt) => {
            const active = paperSize === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setPaperSize(opt.id)}
                className={`py-2 px-1.5 rounded-xl text-center transition-all cursor-pointer ${
                  active
                    ? 'glass-btn-primary text-white'
                    : 'glass-tile text-slate-800 dark:text-slate-100'
                }`}
              >
                <span className="text-xs font-bold block leading-tight">{opt.title}</span>
                <span
                  className={`text-[10px] font-mono block mt-0.5 tabular-nums ${
                    active ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {opt.sub}
                </span>
              </button>
            );
          })}
        </div>

        {paperSize === 'custom' && setCustomPaperWidth && setCustomPaperHeight && (
          <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl glass-track">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                {lang === 'en' ? 'Width (mm)' : 'প্রস্থ (মিমি)'}
              </label>
              <input
                type="number"
                min="30"
                max="1000"
                value={customPaperWidth}
                onChange={(e) => setCustomPaperWidth(Math.max(30, Number(e.target.value) || 210))}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg glass-input text-slate-900 dark:text-slate-100 font-mono tabular-nums"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                {lang === 'en' ? 'Height (mm)' : 'উচ্চতা (মিমি)'}
              </label>
              <input
                type="number"
                min="30"
                max="1000"
                value={customPaperHeight}
                onChange={(e) => setCustomPaperHeight(Math.max(30, Number(e.target.value) || 297))}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg glass-input text-slate-900 dark:text-slate-100 font-mono tabular-nums"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => setOrientation('portrait')}
            className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              orientation === 'portrait'
                ? 'glass-btn-primary text-white'
                : 'glass-tile text-slate-700 dark:text-slate-200'
            }`}
          >
            {t.portrait}
          </button>
          <button
            type="button"
            onClick={() => setOrientation('landscape')}
            className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              orientation === 'landscape'
                ? 'glass-btn-primary text-white'
                : 'glass-tile text-slate-700 dark:text-slate-200'
            }`}
          >
            {t.landscape}
          </button>
        </div>
      </InspectorSection>

      {cuttingGuide !== undefined && setCuttingGuide && cuttingGuideOptions && (
        <InspectorSection title={lang === 'en' ? 'Cutting Guides' : 'কাটিং গাইডলাইন'}>
          <div
            className="grid gap-1.5"
            style={{ gridTemplateColumns: `repeat(${cuttingGuideOptions.length}, minmax(0, 1fr))` }}
          >
            {cuttingGuideOptions.map((item) => {
              const active = cuttingGuide === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCuttingGuide(item.id)}
                  className={`py-2 px-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap truncate ${
                    active
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                      : 'glass-tile text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {lang === 'en' ? item.labelEn : item.labelBn}
                </button>
              );
            })}
          </div>
        </InspectorSection>
      )}

      <InspectorSection title={lang === 'en' ? 'Color & Export Quality' : 'কালার ও প্রিন্ট কোয়ালিটি'}>
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
              {t.colorProfile}
            </label>
            <select
              value={colorProfile}
              onChange={(e) => setColorProfile(e.target.value as ColorProfile)}
              className="w-full px-2.5 py-2 rounded-xl text-xs glass-input text-slate-900 dark:text-slate-100 cursor-pointer"
            >
              <option value="srgb">{lang === 'en' ? 'Color (Original)' : 'রঙিন (স্বাভাবিক)'}</option>
              <option value="bw">{lang === 'en' ? 'Black & White' : 'সাদা-কালো (B&W)'}</option>
              <option value="cmyk">{lang === 'en' ? 'CMYK Print' : 'CMYK প্রিন্ট'}</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
              {t.resolution}
            </label>
            <select
              value={dpi}
              onChange={(e) => setDpi(Number(e.target.value) as PrintQuality)}
              className="w-full px-2.5 py-2 rounded-xl text-xs glass-input text-slate-900 dark:text-slate-100 font-mono tabular-nums cursor-pointer"
            >
              <option value={150}>150 DPI</option>
              <option value={300}>300 DPI</option>
              <option value={600}>600 DPI</option>
            </select>
          </div>
        </div>
        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
          {lang === 'en'
            ? 'For true 1:1 millimeter print accuracy, choose Margins: None and Scale: 100% in your printer dialog.'
            : 'সঠিক মিলিমিটার মাপে প্রিন্ট পেতে প্রিন্টার ডায়ালগে Margins: None এবং Scale: 100% সিলেক্ট করুন।'}
        </p>
      </InspectorSection>
    </div>
  );
};
