import React, { useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Crop,
  Edit3,
  FileDown,
  Loader2,
  Maximize2,
  Printer,
  RotateCw,
  Scan,
  ScanLine,
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
import { translations } from '../../utils/translations';
import {
  InspectorHeader,
  InspectorSection,
  InspectorTabs,
  PaperOutputSection,
} from '../ui/InspectorPrimitives';

interface Props {
  lang: 'bn' | 'en';
  documentSettings: DocumentPrintSettings;
  setDocumentSettings: React.Dispatch<React.SetStateAction<DocumentPrintSettings>>;
  onUploadDocuments: (files: FileList | null) => void;
  onRotatePage: (index: number) => void;
  onToggleWhiteFilter: (index: number) => void;
  onToggleAllWhiteFilter: () => void;
  onReorderPage: (index: number, direction: 'up' | 'down') => void;
  onClearAllPages: () => void;
  onOpenEditor: (index: number) => void;
  onRemovePage: (index: number) => void;
  onPrintAll: () => void;
  onDownloadAllPdf: () => void;
  autoPdfOnUpload: boolean;
  setAutoPdfOnUpload: (enabled: boolean) => void;
  onOpenCamScanner?: () => void;
  isUploading?: boolean;
  isExporting?: boolean;
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

type DocTab = 'pages' | 'fit' | 'paper';

export const DocumentControls: React.FC<Props> = ({
  lang,
  documentSettings,
  setDocumentSettings,
  onUploadDocuments,
  onRotatePage,
  onToggleWhiteFilter,
  onToggleAllWhiteFilter,
  onReorderPage,
  onClearAllPages,
  onOpenEditor,
  onRemovePage,
  onPrintAll,
  onDownloadAllPdf,
  autoPdfOnUpload,
  setAutoPdfOnUpload,
  onOpenCamScanner,
  isUploading = false,
  isExporting = false,
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
  const [activeTab, setActiveTab] = useState<DocTab>('pages');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { pages, activePageIndex, fitMode, marginMm, autoRotateToFit } = documentSettings;
  const activePage = pages[activePageIndex] || pages[0] || null;
  const allPagesWhite = pages.length > 0 && pages.every((p) => p.autoWhiteDocument);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUploadDocuments(e.dataTransfer.files);
    }
  };

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
      desc: lang === 'en' ? 'Full page visible, preserves ratio' : 'পুরো পেজ অক্ষত রেখে ফিট হবে',
    },
    {
      id: 'cover',
      icon: <Crop className="w-3.5 h-3.5" />,
      title: lang === 'en' ? 'Fill & Crop' : 'ফিল ও ক্রপ',
      desc: lang === 'en' ? 'Fills entire sheet, trims excess edges' : 'খালি জায়গা ছাড়া পুরো পেজ ভরবে',
    },
    {
      id: 'stretch',
      icon: <Scan className="w-3.5 h-3.5" />,
      title: lang === 'en' ? 'Stretch Full' : 'স্ট্রেচ ফুল',
      desc: lang === 'en' ? 'Stretches exact to sheet bounds' : 'পেজের মাপ অনুযায়ী টেনে বসাবে',
    },
  ];

  return (
    <div className="space-y-4 text-slate-800 dark:text-slate-100">
      <InspectorHeader
        title={lang === 'bn' ? 'পেপার প্রিন্ট ও মাল্টি-পেজ PDF' : 'Multi-Paper Print & PDF'}
        description={
          lang === 'bn'
            ? 'একসাথে একাধিক পেপার বা ছবি আপলোড করে ফিট করুন, সব পেজ একসাথে প্রিন্ট বা PDF ডাউনলোড করুন'
            : 'Upload multiple papers at once, auto-fit every page to A4/A5/Letter, print all together, or save one combined PDF.'
        }
        meta={`${pages.length} ${lang === 'bn' ? 'পেজ' : pages.length === 1 ? 'page' : 'pages'}`}
      />

      <InspectorTabs<DocTab>
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'pages', label: lang === 'bn' ? 'মাল্টি পেপার ও PDF' : 'Papers & PDF' },
          { id: 'fit', label: lang === 'bn' ? 'ফিট ও মার্জিন' : 'Fit & Margin' },
          { id: 'paper', label: lang === 'bn' ? 'পেপার ও প্রিন্ট' : 'Paper & Print' },
        ]}
      />

      {activeTab === 'pages' && (
        <div className="space-y-4">
          <InspectorSection
            first
            title={lang === 'bn' ? 'মাল্টিপল পেপার আপলোড' : 'Upload Multiple Papers'}
            meta={
              pages.length > 0
                ? `${pages.length} ${lang === 'en' ? (pages.length === 1 ? 'Page' : 'Pages') : 'টি পেজ'}`
                : undefined
            }
            action={
              pages.length > 1 ? (
                <button
                  type="button"
                  onClick={onClearAllPages}
                  className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                >
                  {lang === 'en' ? 'Clear All' : 'সব মুছুন'}
                </button>
              ) : undefined
            }
          >
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-2xl glass-dropzone p-5 text-center cursor-pointer group"
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
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-inner border border-blue-400/25 group-hover:scale-105 transition-transform">
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                </div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {isUploading
                    ? lang === 'en'
                      ? 'Loading & fitting papers...'
                      : 'পেপার লোড ও ফিট হচ্ছে...'
                    : pages.length > 0
                    ? lang === 'en'
                      ? 'Add More Papers / Images (Multi-Select)'
                      : 'আরও পেপার বা ছবি যোগ করুন (একাধিক)'
                    : lang === 'en'
                    ? 'Drop or Select Single / Multiple Papers'
                    : 'একসাথে ১টি বা অনেকগুলো পেপার আপলোড করুন'}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {lang === 'en'
                    ? 'Every uploaded photo auto-fits cleanly for batch printing & PDF'
                    : 'আপলোড করলেই প্রতিটি ছবি পেজে ফিট হয়ে একসাথে প্রিন্ট ও PDF তৈরি হবে'}
                </p>
              </div>
            </div>

            {/* CamScanner Pro Direct Shortcut */}
            {onOpenCamScanner && (
              <button
                type="button"
                onClick={onOpenCamScanner}
                className="w-full p-2.5 rounded-xl bg-teal-500/12 hover:bg-teal-500/18 border border-teal-500/35 text-teal-800 dark:text-teal-200 flex items-center justify-between gap-2 transition cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0 text-left">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <ScanLine className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold truncate">
                      {lang === 'bn'
                        ? 'ডকুমেন্ট স্ক্যানার (CamScanner প্রো)'
                        : 'Document Scanner (CamScanner Pro)'}
                    </div>
                    <div className="text-[11px] text-teal-700/80 dark:text-teal-300/80 truncate">
                      {lang === 'bn'
                        ? '৪-কোনা অটো ক্রপ · ম্যাজিক প্রো · সাদা Full HD'
                        : '4-corner crop · Magic Pro · White Full HD'}
                    </div>
                  </div>
                </div>
                <span className="text-xs font-bold shrink-0">→</span>
              </button>
            )}

            {/* Auto-Download PDF Immediately on Upload Toggle */}
            <label className="p-2.5 rounded-xl glass-tile flex items-center justify-between gap-2.5 cursor-pointer">
              <div className="flex items-center gap-2 min-w-0">
                <FileDown className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block leading-tight">
                    {lang === 'en' ? 'Instant PDF Download on Upload' : 'আপলোড দিলেই সাথে সাথে PDF ডাউনলোড'}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-snug mt-0.5">
                    {lang === 'en'
                      ? 'Automatically saves all uploaded pages as one PDF right after upload'
                      : 'চালু রাখলে ছবিগুলো আপলোড করা মাত্রই সব পেজের PDF অটো ডাউনলোড হবে'}
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={autoPdfOnUpload}
                onChange={(e) => setAutoPdfOnUpload(e.target.checked)}
                className="w-4 h-4 accent-emerald-600 cursor-pointer shrink-0"
              />
            </label>

            {/* Primary Batch Actions: Print All Together & Download All Pages as One PDF */}
            {pages.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onPrintAll}
                  className="py-2.5 px-3 rounded-xl glass-btn-primary text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    {lang === 'en'
                      ? `Print All (${pages.length})`
                      : `সব প্রিন্ট (${pages.length})`}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={onDownloadAllPdf}
                  disabled={isExporting}
                  className="py-2.5 px-3 rounded-xl glass-btn-emerald text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {isExporting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                  ) : (
                    <FileDown className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span className="truncate">
                    {isExporting
                      ? lang === 'en'
                        ? 'Building PDF...'
                        : 'PDF তৈরি হচ্ছে...'
                      : lang === 'en'
                      ? `Save PDF (${pages.length})`
                      : `PDF সেভ (${pages.length})`}
                  </span>
                </button>
              </div>
            )}

            {/* Uploaded Pages Queue with Reorder, Rotate, Edit, Remove */}
            {pages.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5">
                {pages.map((p, idx) => {
                  const isActive = idx === activePageIndex;
                  return (
                    <div
                      key={p.id}
                      onClick={() =>
                        setDocumentSettings((prev) => ({ ...prev, activePageIndex: idx }))
                      }
                      className={`p-2 rounded-xl flex items-center gap-2 cursor-pointer transition-all ${
                        isActive
                          ? 'bg-blue-500/15 border border-blue-500/55 dark:border-blue-400/55 shadow-sm'
                          : 'glass-tile'
                      }`}
                    >
                      <div className="w-9 h-11 rounded-lg border border-white/70 dark:border-white/15 bg-white overflow-hidden shrink-0 flex items-center justify-center">
                        <img
                          src={p.processedSrc || p.originalSrc}
                          alt={p.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                            #{idx + 1}
                          </span>
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                            {p.name}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5 tabular-nums">
                          <span>
                            {p.naturalWidth || '?'} × {p.naturalHeight || '?'} px
                          </span>
                          {p.autoWhiteDocument && (
                            <span className="text-emerald-600 dark:text-emerald-400 font-sans font-semibold">
                              · {lang === 'en' ? 'White' : 'সাদা'}
                            </span>
                          )}
                        </div>
                      </div>
                      <div
                        className="flex items-center gap-0.5 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {pages.length > 1 && (
                          <>
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => onReorderPage(idx, 'up')}
                              className="p-1 rounded-md text-slate-500 hover:text-blue-600 hover:bg-white/60 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                              title={lang === 'en' ? 'Move page up' : 'উপরে নিন'}
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === pages.length - 1}
                              onClick={() => onReorderPage(idx, 'down')}
                              className="p-1 rounded-md text-slate-500 hover:text-blue-600 hover:bg-white/60 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                              title={lang === 'en' ? 'Move page down' : 'নিচে নিন'}
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => onRotatePage(idx)}
                          className="p-1 rounded-md text-slate-500 hover:text-blue-600 hover:bg-white/60 dark:hover:bg-white/10 cursor-pointer"
                          title={t.rotate90}
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenEditor(idx)}
                          className="p-1 rounded-md text-slate-500 hover:text-blue-600 hover:bg-white/60 dark:hover:bg-white/10 cursor-pointer"
                          title={t.editDocument}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemovePage(idx)}
                          className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-white/60 dark:hover:bg-white/10 cursor-pointer"
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

            {/* White Paper Scanner: Single Page + Batch All Pages */}
            {activePage && (
              <div className="space-y-2">
                <label className="p-3 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/12 border border-emerald-500/25 backdrop-blur-md flex items-center justify-between gap-3 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                        {lang === 'en'
                          ? `Clean White Scanner (Page #${activePageIndex + 1})`
                          : `সাদা কাগজ স্ক্যানার (পেজ #${activePageIndex + 1})`}
                      </span>
                      <span className="text-[11px] text-slate-600 dark:text-slate-400 block">
                        {lang === 'en'
                          ? 'Removes gray camera shadow for crisp white print'
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
                </label>

                {pages.length > 1 && (
                  <button
                    type="button"
                    onClick={onToggleAllWhiteFilter}
                    className="w-full py-2 px-3 rounded-xl glass-tile text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>
                      {allPagesWhite
                        ? lang === 'en'
                          ? `Disable White Scanner on All ${pages.length} Pages`
                          : `সব ${pages.length}টি পেজ থেকে সাদা স্ক্যান সরান`
                        : lang === 'en'
                        ? `Apply Clean White Scanner to All ${pages.length} Pages`
                        : `সব ${pages.length}টি পেজে একসাথে সাদা স্ক্যান দিন`}
                    </span>
                  </button>
                )}
              </div>
            )}
          </InspectorSection>
        </div>
      )}

      {activeTab === 'fit' && (
        <div className="space-y-4">
          <InspectorSection
            first
            title={t.fitModeLabel}
            action={
              activePage ? (
                <button
                  type="button"
                  onClick={() => onRotatePage(activePageIndex)}
                  className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>{t.rotate90}</span>
                </button>
              ) : undefined
            }
          >
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
                    className={`p-2.5 rounded-xl text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                      active
                        ? 'glass-btn-primary text-white'
                        : 'glass-tile text-slate-800 dark:text-slate-100'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        active
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-900/5 dark:bg-white/10 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {opt.icon}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold block leading-tight">{opt.title}</span>
                      <span
                        className={`text-[11px] block leading-tight mt-0.5 ${
                          active ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {opt.desc}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </InspectorSection>

          <InspectorSection title={t.pageMarginLabel} meta={`${marginMm} mm`}>
            <div className="grid grid-cols-4 gap-1.5 text-xs">
              {[0, 5, 10, 15].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() =>
                    setDocumentSettings((prev) => ({ ...prev, marginMm: m }))
                  }
                  className={`py-1.5 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    marginMm === m
                      ? 'glass-btn-primary text-white'
                      : 'glass-tile text-slate-700 dark:text-slate-200'
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

            <label className="p-3 rounded-xl glass-tile flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 block">
                  {t.autoRotateLabel}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                  {lang === 'en'
                    ? 'Turns landscape scans automatically to maximize sheet space'
                    : 'আড়াআড়ি পেপারকে প্রয়োজনে ঘুরিয়ে সর্বোচ্চ জায়গায় ফিট করে'}
                </span>
              </div>
              <input
                type="checkbox"
                checked={autoRotateToFit}
                onChange={(e) =>
                  setDocumentSettings((prev) => ({
                    ...prev,
                    autoRotateToFit: e.target.checked,
                  }))
                }
                className="w-4 h-4 accent-blue-600 cursor-pointer shrink-0 ml-2"
              />
            </label>
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
