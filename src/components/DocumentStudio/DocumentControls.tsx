import React, { useRef, useState } from 'react';
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

type DocTab = 'pages' | 'fit' | 'paper';

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
  const [activeTab, setActiveTab] = useState<DocTab>('pages');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { pages, activePageIndex, fitMode, marginMm, autoRotateToFit } = documentSettings;
  const activePage = pages[activePageIndex] || pages[0] || null;

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
        title={lang === 'bn' ? 'পেপার প্রিন্ট (ফিট টু পেজ)' : 'Paper Print Studio'}
        description={
          lang === 'bn'
            ? 'যেকোনো ডকুমেন্ট বা পেপার আপলোড করলেই A4, A5 বা যেকোনো পেজে ফিট হবে'
            : 'Auto-fit any paper scan or image cleanly to A4, A5, Letter, Legal, or custom sheets.'
        }
        meta={`${pages.length} ${lang === 'bn' ? 'পেজ' : pages.length === 1 ? 'page' : 'pages'}`}
      />

      <InspectorTabs<DocTab>
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'pages', label: lang === 'bn' ? 'পেপার আপলোড' : 'Papers' },
          { id: 'fit', label: lang === 'bn' ? 'ফিট ও মার্জিন' : 'Fit & Margin' },
          { id: 'paper', label: lang === 'bn' ? 'পেপার ও প্রিন্ট' : 'Paper & Print' },
        ]}
      />

      {activeTab === 'pages' && (
        <div className="space-y-4">
          <InspectorSection
            first
            title={t.uploadDocument}
            meta={
              pages.length > 0
                ? `${pages.length} ${lang === 'en' ? (pages.length === 1 ? 'Page' : 'Pages') : 'টি পেজ'}`
                : undefined
            }
          >
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 bg-slate-50/70 dark:bg-slate-900 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 p-5 text-center cursor-pointer transition-colors group"
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
                <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Upload className="w-4 h-4" />
                </div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {isUploading
                    ? lang === 'en'
                      ? 'Loading document...'
                      : 'পেপার লোড হচ্ছে...'
                    : pages.length > 0
                    ? t.addMoreDocuments
                    : lang === 'en'
                    ? 'Click or drop any paper / document'
                    : 'যেকোনো পেপার বা ডকুমেন্ট দিন'}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {lang === 'en'
                    ? 'Automatically scales to fit selected paper size'
                    : 'আপলোড করলেই নির্বাচিত পেজে স্বয়ংক্রিয়ভাবে ফিট হয়ে যাবে'}
                </p>
              </div>
            </div>

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
                      className={`p-2 rounded-lg border flex items-center gap-2.5 cursor-pointer transition-colors ${
                        isActive
                          ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
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
                          <span className="text-[11px] font-mono font-bold text-slate-500 tabular-nums">
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
                              · {lang === 'en' ? 'Clean White' : 'সাদা স্ক্যান'}
                            </span>
                          )}
                        </div>
                      </div>
                      <div
                        className="flex items-center gap-0.5 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => onRotatePage(idx)}
                          className="p-1.5 rounded-md text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          title={t.rotate90}
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenEditor(idx)}
                          className="p-1.5 rounded-md text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          title={t.editDocument}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemovePage(idx)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
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

            {activePage && (
              <label className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/60 flex items-center justify-between gap-3 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                      {lang === 'en' ? 'Clean White Paper Scanner' : 'সাদা কাগজ স্ক্যানার ফিল্টার'}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
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
                    className={`p-2.5 rounded-lg border text-left transition-colors flex items-center gap-2.5 cursor-pointer ${
                      active
                        ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-blue-400'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                        active
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
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
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                    marginMm === m
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
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

            <label className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
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
