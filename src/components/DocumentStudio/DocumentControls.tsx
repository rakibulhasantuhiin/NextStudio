import React, { useRef } from 'react';
import {
  Crop,
  Edit3,
  Maximize2,
  RotateCw,
  Scan,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  ColorProfile,
  DocumentFitMode,
  DocumentPrintSettings,
  PaperOrientation,
  PaperSizeType,
  PrintQuality,
} from '../../types';
import { PAPER_SIZES } from '../../utils/constants';
import { translations } from '../../utils/translations';

interface Props {
  lang: 'bn' | 'en';
  documentSettings: DocumentPrintSettings;
  setDocumentSettings: React.Dispatch<React.SetStateAction<DocumentPrintSettings>>;
  onUploadDocuments: (files: FileList | null) => void;
  onRotatePage: (index: number) => void;
  onToggleWhiteFilter: (index: number) => void;
  onOpenEditor: (index: number) => void;
  onRemovePage: (index: number) => void;
  isUploading?: boolean;
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
  setDpi: (d: PrintQuality) => void;
}

export const DocumentControls: React.FC<Props> = ({
  lang,
  documentSettings,
  setDocumentSettings,
  onUploadDocuments,
  onRotatePage,
  onToggleWhiteFilter,
  onOpenEditor,
  onRemovePage,
  isUploading = false,
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { pages, activePageIndex, fitMode, marginMm, autoRotateToFit } = documentSettings;
  const activePage = pages[activePageIndex] || pages[0] || null;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUploadDocuments(e.dataTransfer.files);
    }
  };

  const paperOptions: { id: PaperSizeType; title: string; sub: string }[] = [
    { id: 'a4', title: 'A4', sub: '210×297' },
    { id: 'a5', title: 'A5', sub: '148×210' },
    { id: 'letter', title: 'Letter', sub: '216×279' },
    { id: 'legal', title: 'Legal', sub: '216×356' },
    { id: 'b5', title: 'B5', sub: '176×250' },
    { id: '4r', title: '4R', sub: '102×152' },
    { id: 'custom', title: lang === 'en' ? 'Custom' : 'কাস্টম', sub: 'mm' },
  ];

  const fitOptions: {
    id: DocumentFitMode;
    icon: React.ReactNode;
    title: string;
    desc: string;
  }[] = [
    {
      id: 'contain',
      icon: <Maximize2 className="w-3.5 h-3.5" />,
      title: lang === 'en' ? 'Fit to Paper' : 'ফিট টু পেপার',
      desc: lang === 'en' ? 'Full document, keeps ratio (Best)' : 'পুরো পেজ অক্ষত রেখে ফিট হবে',
    },
    {
      id: 'cover',
      icon: <Crop className="w-3.5 h-3.5" />,
      title: lang === 'en' ? 'Fill & Crop' : 'ফিল ও ক্রপ',
      desc: lang === 'en' ? 'Fills area cleanly, trims edges' : 'খালি জায়গা না রেখে পুরো পেজ ভরবে',
    },
    {
      id: 'stretch',
      icon: <Scan className="w-3.5 h-3.5" />,
      title: lang === 'en' ? 'Stretch Full' : 'স্ট্রেচ ফুল',
      desc: lang === 'en' ? 'Stretches exact to page bounds' : 'পেজের মাপ অনুযায়ী পুরোটা টেনে বসাবে',
    },
  ];

  const effPaper =
    paperSize === 'custom'
      ? { width: customPaperWidth, height: customPaperHeight }
      : PAPER_SIZES[paperSize];

  return (
    <div className="space-y-4 text-slate-800 dark:text-slate-100">
      {/* ======================================================== */}
      {/* 1. UPLOAD PAPER / DOCUMENT                               */}
      {/* ======================================================== */}
      <section className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
              1
            </div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-normal">
              {t.uploadDocument}
            </h2>
          </div>
          {pages.length > 0 && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              {pages.length} {lang === 'en' ? (pages.length === 1 ? 'Page' : 'Pages') : 'টি পেজ'}
            </span>
          )}
        </div>

        {/* Drag & Drop Upload Box */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 bg-slate-50/70 dark:bg-slate-950/40 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 p-4 text-center cursor-pointer transition group"
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => {
              onUploadDocuments(e.target.files);
              e.target.value = '';
            }}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition">
              <Upload className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
              {isUploading
                ? (lang === 'en' ? 'Loading document...' : 'পেপার লোড হচ্ছে...')
                : pages.length > 0
                ? t.addMoreDocuments
                : (lang === 'en' ? 'Click or drop any paper/document image' : 'যেকোনো পেপার বা ডকুমেন্টের ছবি দিন')}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {lang === 'en'
                ? 'Automatically fits A4, A5, Letter, Legal or any page size'
                : 'আপলোড করলেই স্বয়ংক্রিয়ভাবে A4 / A5 পেজে প্রিন্টের জন্য ফিট হয়ে যাবে'}
            </p>
          </div>
        </div>

        {/* Uploaded Pages List */}
        {pages.length > 0 && (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {pages.map((p, idx) => {
              const isActive = idx === activePageIndex;
              return (
                <div
                  key={p.id}
                  onClick={() =>
                    setDocumentSettings((prev) => ({ ...prev, activePageIndex: idx }))
                  }
                  className={`p-2 rounded-lg border flex items-center gap-2.5 cursor-pointer transition ${
                    isActive
                      ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/30 ring-1 ring-blue-500/30'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/30 hover:border-slate-300'
                  }`}
                >
                  <div className="w-10 h-12 rounded border border-slate-200 dark:border-slate-700 bg-white overflow-hidden shrink-0 flex items-center justify-center">
                    <img
                      src={p.processedSrc || p.originalSrc}
                      alt={p.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                        #{idx + 1}
                      </span>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {p.name}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                      <span>{p.naturalWidth || '?'} × {p.naturalHeight || '?'} px</span>
                      {p.autoWhiteDocument && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          • {lang === 'en' ? 'Clean White' : 'সাদা স্ক্যান'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div
                    className="flex items-center gap-1 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => onRotatePage(idx)}
                      className="p-1.5 rounded-md text-slate-500 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-800 transition cursor-pointer"
                      title={t.rotate90}
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenEditor(idx)}
                      className="p-1.5 rounded-md text-slate-500 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-800 transition cursor-pointer"
                      title={t.editDocument}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemovePage(idx)}
                      className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-white dark:hover:bg-slate-800 transition cursor-pointer"
                      title={lang === 'en' ? 'Remove page' : 'পেজ মুছুন'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Quick Clean White Paper Toggle for Active Page */}
        {activePage && (
          <div className="p-3 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block leading-normal">
                  {lang === 'en' ? 'Clean White Paper Scanner' : 'সাদা কাগজ ও ক্লিয়ার স্ক্যান ফিল্টার'}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block leading-normal">
                  {lang === 'en'
                    ? 'Removes gray camera shadow from scanned paper'
                    : 'ছবি তোলা কাগজের ছায়া মুছে ধবধবে সাদা প্রিন্ট দেয়'}
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={activePage.autoWhiteDocument}
              onChange={() => onToggleWhiteFilter(activePageIndex)}
              className="w-4 h-4 accent-emerald-600 cursor-pointer shrink-0"
            />
          </div>
        )}
      </section>

      {/* ======================================================== */}
      {/* 2. FIT TO PAPER & MARGIN SETTINGS                        */}
      {/* ======================================================== */}
      <section className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
              2
            </div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-normal">
              {t.fitModeLabel}
            </h2>
          </div>
          {activePage && (
            <button
              type="button"
              onClick={() => onRotatePage(activePageIndex)}
              className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RotateCw className="w-3 h-3" />
              <span>{t.rotate90}</span>
            </button>
          )}
        </div>

        {/* Fit Mode Cards */}
        <div className="grid grid-cols-1 gap-2">
          {fitOptions.map((opt) => {
            const active = fitMode === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() =>
                  setDocumentSettings((prev) => ({ ...prev, fitMode: opt.id }))
                }
                className={`p-2.5 rounded-lg border text-left transition flex items-center gap-2.5 cursor-pointer ${
                  active
                    ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 ring-1 ring-blue-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                    active
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {opt.icon}
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold block leading-tight">{opt.title}</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block leading-tight mt-0.5">
                    {opt.desc}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Margin Selector (Quick pills + fine slider) */}
        <div className="pt-1 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              {t.pageMarginLabel}
            </span>
            <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
              {marginMm} mm
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5 text-xs">
            {[0, 5, 10, 15].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() =>
                  setDocumentSettings((prev) => ({ ...prev, marginMm: m }))
                }
                className={`py-1.5 px-2 rounded-md text-xs font-semibold transition cursor-pointer ${
                  marginMm === m
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {m === 0 ? (lang === 'en' ? '0 (Full)' : '০ (ফুল)') : `${m} mm`}
              </button>
            ))}
          </div>

          <input
            type="range"
            min="0"
            max="25"
            step="1"
            value={marginMm}
            onChange={(e) =>
              setDocumentSettings((prev) => ({ ...prev, marginMm: Number(e.target.value) }))
            }
            className="w-full accent-blue-600 cursor-pointer"
          />
        </div>

        {/* Auto-Rotate to Fit Toggle */}
        <label className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between cursor-pointer">
          <div>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
              {t.autoRotateLabel}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
              {lang === 'en'
                ? 'Automatically turns landscape paper to fit portrait A4/A5 cleanly'
                : 'আড়াআড়ি পেপারকে প্রয়োজনে ঘুরিয়ে পেজের সর্বোচ্চ জায়গা জুড়ে বসাবে'}
            </span>
          </div>
          <input
            type="checkbox"
            checked={autoRotateToFit}
            onChange={(e) =>
              setDocumentSettings((prev) => ({ ...prev, autoRotateToFit: e.target.checked }))
            }
            className="w-4 h-4 accent-blue-600 cursor-pointer shrink-0 ml-2"
          />
        </label>
      </section>

      {/* ======================================================== */}
      {/* 3. PAGE SIZE, ORIENTATION & PRINT QUALITY                */}
      {/* ======================================================== */}
      <section className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
              3
            </div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-normal">
              {lang === 'en' ? 'Page Size & Print Quality' : 'পেইজ সাইজ ও প্রিন্ট কোয়ালিটি'}
            </h2>
          </div>
          <span className="text-[11px] font-mono font-semibold text-blue-600 dark:text-blue-400">
            {effPaper.width} × {effPaper.height} mm
          </span>
        </div>

        {/* All Page Sizes Grid */}
        <div>
          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1.5">
            {t.paperSizeLabel}
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
            {paperOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setPaperSize(opt.id)}
                className={`py-1.5 px-2 rounded-lg text-center border transition cursor-pointer ${
                  paperSize === opt.id
                    ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                    : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-400'
                }`}
              >
                <span className="text-xs font-bold block leading-tight">{opt.title}</span>
                <span
                  className={`text-[9px] font-mono block leading-tight mt-0.5 ${
                    paperSize === opt.id ? 'text-blue-100' : 'text-slate-400'
                  }`}
                >
                  {opt.sub}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Size Inputs */}
        {paperSize === 'custom' && (
          <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800">
            <div>
              <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                {lang === 'en' ? 'Width (mm)' : 'প্রস্থ (মিমি)'}
              </label>
              <input
                type="number"
                min="30"
                max="1000"
                value={customPaperWidth}
                onChange={(e) => setCustomPaperWidth(Math.max(30, Number(e.target.value) || 210))}
                className="w-full px-2 py-1 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                {lang === 'en' ? 'Height (mm)' : 'উচ্চতা (মিমি)'}
              </label>
              <input
                type="number"
                min="30"
                max="1000"
                value={customPaperHeight}
                onChange={(e) => setCustomPaperHeight(Math.max(30, Number(e.target.value) || 297))}
                className="w-full px-2 py-1 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
              />
            </div>
          </div>
        )}

        {/* Orientation */}
        <div>
          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
            {t.orientationLabel}
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => setOrientation('portrait')}
              className={`py-1.5 px-2 rounded-lg text-xs font-semibold text-center transition cursor-pointer ${
                orientation === 'portrait'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {t.portrait}
            </button>
            <button
              type="button"
              onClick={() => setOrientation('landscape')}
              className={`py-1.5 px-2 rounded-lg text-xs font-semibold text-center transition cursor-pointer ${
                orientation === 'landscape'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {t.landscape}
            </button>
          </div>
        </div>

        {/* Color Profile & DPI */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div>
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
              {t.colorProfile}
            </label>
            <select
              value={colorProfile}
              onChange={(e) => setColorProfile(e.target.value as ColorProfile)}
              className="w-full px-2 py-1.5 rounded-lg text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer"
            >
              <option value="srgb">{lang === 'en' ? 'Color (Original)' : 'রঙিন (স্বাভাবিক)'}</option>
              <option value="bw">{lang === 'en' ? 'Black & White' : 'সাদা-কালো (B&W)'}</option>
              <option value="cmyk">{lang === 'en' ? 'CMYK Print' : 'CMYK প্রিন্ট'}</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
              {t.resolution}
            </label>
            <select
              value={dpi}
              onChange={(e) => setDpi(Number(e.target.value) as PrintQuality)}
              className="w-full px-2 py-1.5 rounded-lg text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer"
            >
              <option value={150}>150 DPI</option>
              <option value={300}>300 DPI</option>
              <option value={600}>600 DPI</option>
            </select>
          </div>
        </div>
      </section>
    </div>
  );
};
