import React, { useRef, useState } from 'react';
import {
  Bold,
  Camera,
  FileDown,
  FileText,
  Highlighter,
  Italic,
  LayoutGrid,
  Loader2,
  Printer,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Type,
  Underline,
} from 'lucide-react';
import {
  ReadyDocPaperOverride,
  ReadyDocState,
  ReadyDocTemplate,
} from '../../types/readyDocs';
import {
  getDefaultValuesForTemplate,
  READY_DOC_PAPER_SPECS,
  resolveReadyDocPaper,
} from '../../utils/readyDocs';
import {
  BANGLA_FONTS,
  BanglaFontId,
  DEFAULT_BANGLA_FONT,
  HIGHLIGHT_COLORS,
} from '../../utils/richText';

interface ReadyDocControlsProps {
  lang: 'bn' | 'en';
  template: ReadyDocTemplate;
  readyDocState: ReadyDocState;
  setReadyDocState: React.Dispatch<React.SetStateAction<ReadyDocState>>;
  showGallery: boolean;
  setShowGallery: (show: boolean) => void;
  onPrintDoc: () => void;
  onDownloadDocPdf: () => void;
  isExporting?: boolean;
}

export const ReadyDocControls: React.FC<ReadyDocControlsProps> = ({
  lang,
  template,
  readyDocState,
  setReadyDocState,
  showGallery,
  setShowGallery,
  onPrintDoc,
  onDownloadDocPdf,
  isExporting = false,
}) => {
  const isBn = lang === 'bn';
  const [tab, setTab] = useState<'fields' | 'style'>('fields');
  const photoInputRef = useRef<HTMLInputElement>(null);

  const values = readyDocState.valuesByDoc[template.id] || {};
  const photoSrc = readyDocState.photosByDoc[template.id] || '';
  const activePaper = resolveReadyDocPaper(template, readyDocState.paperOverride);

  const filledCount = template.fields.filter((f) => Boolean((values[f.key] || '').trim())).length;

  const updateField = (key: string, val: string) => {
    setReadyDocState((prev) => ({
      ...prev,
      valuesByDoc: {
        ...prev.valuesByDoc,
        [template.id]: {
          ...(prev.valuesByDoc[template.id] || {}),
          [key]: val,
        },
      },
    }));
  };

  const handleQuickFillSample = () => {
    if (!template.sampleValues) return;
    setReadyDocState((prev) => ({
      ...prev,
      valuesByDoc: {
        ...prev.valuesByDoc,
        [template.id]: {
          ...getDefaultValuesForTemplate(template),
          ...template.sampleValues,
        },
      },
    }));
  };

  const handleResetDocFields = () => {
    setReadyDocState((prev) => ({
      ...prev,
      valuesByDoc: {
        ...prev.valuesByDoc,
        [template.id]: getDefaultValuesForTemplate(template),
      },
      tablesByDoc: {
        ...prev.tablesByDoc,
        [template.id]: template.defaultTableRows
          ? template.defaultTableRows.map((r) => [...r])
          : [],
      },
    }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setReadyDocState((prev) => ({
        ...prev,
        photosByDoc: {
          ...prev.photosByDoc,
          [template.id]: dataUrl,
        },
      }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      {/* Top Active Document Card & 65-Docs Switcher */}
      <div className="glass-strip rounded-2xl p-3.5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              {isBn ? 'রেডিমেড কাগজপত্র' : 'Ready-Made Docs'}
            </div>
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white leading-snug mt-0.5 truncate">
              {template.title}
            </h2>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {isBn ? activePaper.labelBn : activePaper.labelEn} ·{' '}
              {filledCount}/{template.fields.length} {isBn ? 'ঘর ভরা' : 'filled'}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowGallery(!showGallery)}
            className="glass-tile px-2.5 py-1.5 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>{showGallery ? (isBn ? 'এডিটর' : 'Editor') : isBn ? '৬৫টি কাগজ' : '65 Docs'}</span>
          </button>
        </div>

        {/* Direct Print & PDF CTAs */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onDownloadDocPdf}
            disabled={isExporting}
            className="glass-btn-emerald py-2 px-3 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            {isExporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileDown className="w-3.5 h-3.5" />
            )}
            <span>{isBn ? 'PDF সেভ' : 'Save PDF'}</span>
          </button>
          <button
            type="button"
            onClick={onPrintDoc}
            className="glass-btn-primary py-2 px-3 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{isBn ? 'প্রিন্ট করুন' : 'Print Now'}</span>
          </button>
        </div>
      </div>

      {/* Inspector Tabs */}
      <div className="grid grid-cols-2 gap-1 glass-track p-1 rounded-xl">
        <button
          type="button"
          onClick={() => setTab('fields')}
          className={`py-1.5 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition ${
            tab === 'fields'
              ? 'glass-tab-active text-blue-600 dark:text-blue-400'
              : 'text-slate-600 dark:text-slate-300'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>{isBn ? 'তথ্য ভরুন' : 'Fill Fields'}</span>
        </button>
        <button
          type="button"
          onClick={() => setTab('style')}
          className={`py-1.5 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition ${
            tab === 'style'
              ? 'glass-tab-active text-blue-600 dark:text-blue-400'
              : 'text-slate-600 dark:text-slate-300'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>{isBn ? 'পেজ ও স্টাইল' : 'Page & Style'}</span>
        </button>
      </div>

      {/* Tab 1: Rapid Sidebar Form */}
      {tab === 'fields' ? (
        <div className="space-y-3">
          {/* Quick Actions */}
          <div className="flex items-center justify-between gap-2">
            {template.sampleValues ? (
              <button
                type="button"
                onClick={handleQuickFillSample}
                className="glass-tile px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>{isBn ? 'স্যাম্পল ভরুন' : 'Fill Sample'}</span>
              </button>
            ) : (
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {isBn ? 'সরাসরি কাগজেও ক্লিক করে লেখা যাবে' : 'Or click fields on sheet'}
              </span>
            )}
            <button
              type="button"
              onClick={handleResetDocFields}
              className="glass-tile px-2.5 py-1.5 rounded-xl text-[11px] font-semibold text-red-600 dark:text-red-400 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{isBn ? 'খালি করুন' : 'Clear'}</span>
            </button>
          </div>

          {/* Photo Box Uploader (for Admission Form / Exam Admit Card) */}
          {template.hasPhotoBox && (
            <div className="glass-tile rounded-xl p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                {photoSrc ? (
                  <img
                    src={photoSrc}
                    alt="Uploaded"
                    className="w-10 h-12 rounded-lg object-cover border border-slate-200 dark:border-slate-700"
                  />
                ) : (
                  <div className="w-10 h-12 rounded-lg bg-amber-100/80 dark:bg-amber-500/20 border border-dashed border-amber-400 flex items-center justify-center">
                    <Camera className="w-4 h-4 text-amber-700 dark:text-amber-300" />
                  </div>
                )}
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    {isBn ? 'পাসপোর্ট ছবি' : 'Passport Photo'}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {photoSrc
                      ? isBn
                        ? 'ছবি যুক্ত করা হয়েছে'
                        : 'Photo attached'
                      : isBn
                      ? 'ফরম/প্রবেশপত্রে বসবে'
                      : 'Appears on form'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="glass-btn-primary px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-white cursor-pointer"
                >
                  {photoSrc ? (isBn ? 'বদলান' : 'Change') : isBn ? 'আপলোড' : 'Upload'}
                </button>
                {photoSrc && (
                  <button
                    type="button"
                    onClick={() =>
                      setReadyDocState((prev) => ({
                        ...prev,
                        photosByDoc: { ...prev.photosByDoc, [template.id]: '' },
                      }))
                    }
                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>
          )}

          {/* Field Inputs List */}
          <div className="space-y-2.5">
            {template.fields.map((field) => (
              <div key={field.key} className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {field.label}
                  {field.hint && (
                    <span className="font-normal text-[11px] text-slate-400 ml-1">
                      ({field.hint})
                    </span>
                  )}
                </label>
                {field.inputType === 'textarea' ? (
                  <textarea
                    rows={3}
                    value={values[field.key] || ''}
                    onChange={(e) => updateField(field.key, e.target.value)}
                    placeholder={field.hint || field.label}
                    className="glass-input w-full rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                  />
                ) : (
                  <input
                    type="text"
                    value={values[field.key] || ''}
                    onChange={(e) => updateField(field.key, e.target.value)}
                    placeholder={field.hint || field.label}
                    className="glass-input w-full rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Tab 2: Page, Stamp Clearance & Typography Settings */
        <div className="space-y-4">
          {/* Paper Size Override */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
              {isBn ? 'পেপার সাইজ' : 'Paper Size'}
            </label>
            <select
              value={readyDocState.paperOverride}
              onChange={(e) =>
                setReadyDocState((prev) => ({
                  ...prev,
                  paperOverride: e.target.value as ReadyDocPaperOverride,
                }))
              }
              className="glass-input w-full rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="auto">
                {isBn
                  ? `অটো (${READY_DOC_PAPER_SPECS[template.paper].labelBn})`
                  : `Auto (${READY_DOC_PAPER_SPECS[template.paper].labelEn})`}
              </option>
              <option value="a4">A4 (210 × 297 mm)</option>
              <option value="a4-landscape">
                {isBn ? 'A4 আড়াআড়ি (297 × 210 mm)' : 'A4 Landscape (297 × 210 mm)'}
              </option>
              <option value="legal">Legal 14" (215.9 × 355.6 mm)</option>
              <option value="legal135">Legal 13.5" (215.9 × 343 mm)</option>
            </select>
          </div>

          {/* Stamp Paper Top Blank Space */}
          {template.isStampPaper && (
            <div className="glass-tile rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  {isBn ? 'স্ট্যাম্প-পেপার উপরের ফাঁকা' : 'Stamp Top Clearance'}
                </span>
                <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-300 tabular-nums">
                  {readyDocState.stampTopMm}mm ({(readyDocState.stampTopMm / 25.4).toFixed(1)}")
                </span>
              </div>
              <input
                type="range"
                min={20}
                max={135}
                step={2}
                value={readyDocState.stampTopMm}
                onChange={(e) =>
                  setReadyDocState((prev) => ({
                    ...prev,
                    stampTopMm: Number(e.target.value),
                  }))
                }
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { mm: 48, label: isBn ? 'প্যাড (২")' : 'Pad 2"' },
                  { mm: 95, label: isBn ? 'স্ট্যাম্প ৩.৭"' : 'Stamp 3.7"' },
                  { mm: 112, label: isBn ? 'বড় ৪.৪"' : 'Tall 4.4"' },
                ].map((preset) => (
                  <button
                    key={preset.mm}
                    type="button"
                    onClick={() =>
                      setReadyDocState((prev) => ({ ...prev, stampTopMm: preset.mm }))
                    }
                    className={`py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                      readyDocState.stampTopMm === preset.mm
                        ? 'glass-btn-primary text-white'
                        : 'glass-tile text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Bangla Font Family Selector (Default: SolaimanLipi) */}
          <div className="glass-tile rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-100">
              <Type className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>{isBn ? 'বাংলা ফন্ট সিলেক্ট করুন' : 'Select Bangla Font'}</span>
            </div>
            <select
              value={readyDocState.fontFamily || DEFAULT_BANGLA_FONT}
              onChange={(e) =>
                setReadyDocState((prev) => ({
                  ...prev,
                  fontFamily: e.target.value as BanglaFontId,
                }))
              }
              className="glass-input w-full rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {BANGLA_FONTS.map((f) => (
                <option
                  key={f.id}
                  value={f.id}
                  style={{ fontFamily: f.fontFamily }}
                  className="text-slate-900 bg-white"
                >
                  {isBn ? f.nameBn : f.nameEn}
                </option>
              ))}
            </select>

            {/* Manual Bold / Italic / Underline Buttons */}
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              <button
                type="button"
                onClick={() =>
                  setReadyDocState((prev) => ({ ...prev, textBold: !prev.textBold }))
                }
                className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition ${
                  readyDocState.textBold
                    ? 'glass-btn-primary text-white'
                    : 'glass-tile text-slate-700 dark:text-slate-200'
                }`}
              >
                <Bold className="w-3.5 h-3.5" />
                <span>{isBn ? 'বোল্ড' : 'Bold'}</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  setReadyDocState((prev) => ({ ...prev, textItalic: !prev.textItalic }))
                }
                className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition ${
                  readyDocState.textItalic
                    ? 'glass-btn-primary text-white'
                    : 'glass-tile text-slate-700 dark:text-slate-200'
                }`}
              >
                <Italic className="w-3.5 h-3.5" />
                <span>{isBn ? 'ইটালিক' : 'Italic'}</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  setReadyDocState((prev) => ({
                    ...prev,
                    textUnderline: !prev.textUnderline,
                  }))
                }
                className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition ${
                  readyDocState.textUnderline
                    ? 'glass-btn-primary text-white'
                    : 'glass-tile text-slate-700 dark:text-slate-200'
                }`}
              >
                <Underline className="w-3.5 h-3.5" />
                <span>{isBn ? 'আন্ডারলাইন' : 'Underline'}</span>
              </button>
            </div>

            {/* Highlighter Swatches */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                <Highlighter className="w-3.5 h-3.5 text-amber-500" />
                <span>{isBn ? 'হাইলাইটার:' : 'Highlighter:'}</span>
              </span>
              <div className="flex items-center gap-1.5">
                {HIGHLIGHT_COLORS.map((c) => {
                  const selected = (readyDocState.textHighlight || 'none') === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() =>
                        setReadyDocState((prev) => ({ ...prev, textHighlight: c.id }))
                      }
                      className={`w-5 h-5 rounded-full border transition cursor-pointer flex items-center justify-center text-[10px] font-bold ${
                        selected
                          ? 'ring-2 ring-blue-500 scale-110 border-slate-900'
                          : 'border-slate-300 dark:border-white/25 hover:scale-110'
                      }`}
                      style={{
                        backgroundColor: c.id === 'none' ? '#ffffff' : c.hex,
                        color: '#0f172a',
                      }}
                      title={isBn ? c.labelBn : c.labelEn}
                    >
                      {c.id === 'none' ? '✕' : ''}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Font Size */}
          <div className="glass-tile rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                {isBn ? 'লেখার সাইজ' : 'Font Size'}
              </span>
              <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                {readyDocState.fontSizePx}px
              </span>
            </div>
            <input
              type="range"
              min={10}
              max={24}
              step={0.5}
              value={readyDocState.fontSizePx}
              onChange={(e) =>
                setReadyDocState((prev) => ({ ...prev, fontSizePx: Number(e.target.value) }))
              }
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          {/* Line Height */}
          <div className="glass-tile rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                {isBn ? 'লাইনের ফাঁকা' : 'Line Spacing'}
              </span>
              <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                {readyDocState.lineHeight.toFixed(2)}×
              </span>
            </div>
            <input
              type="range"
              min={1.35}
              max={2.2}
              step={0.05}
              value={readyDocState.lineHeight}
              onChange={(e) =>
                setReadyDocState((prev) => ({ ...prev, lineHeight: Number(e.target.value) }))
              }
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          {/* Toggles */}
          <div className="space-y-2">
            {template.hasOptionalHeaderToggle && (
              <label className="glass-tile rounded-xl px-3 py-2.5 flex items-center justify-between cursor-pointer">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                  {isBn ? 'প্রতিষ্ঠানের হেডার দেখান' : 'Show Letterhead Header'}
                </span>
                <input
                  type="checkbox"
                  checked={readyDocState.showHeader}
                  onChange={(e) =>
                    setReadyDocState((prev) => ({ ...prev, showHeader: e.target.checked }))
                  }
                  className="w-4 h-4 accent-blue-600 cursor-pointer"
                />
              </label>
            )}

            <label className="glass-tile rounded-xl px-3 py-2.5 flex items-center justify-between cursor-pointer">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                {isBn ? 'কাগজে ডাবল বর্ডার ফ্রেম' : 'Decorative Page Border'}
              </span>
              <input
                type="checkbox"
                checked={readyDocState.showBorder}
                onChange={(e) =>
                  setReadyDocState((prev) => ({ ...prev, showBorder: e.target.checked }))
                }
                className="w-4 h-4 accent-blue-600 cursor-pointer"
              />
            </label>

            <label className="glass-tile rounded-xl px-3 py-2.5 flex items-center justify-between cursor-pointer">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                {isBn ? 'পৃষ্ঠা নম্বর দেখান' : 'Show Page Number'}
              </span>
              <input
                type="checkbox"
                checked={readyDocState.showPageNumber}
                onChange={(e) =>
                  setReadyDocState((prev) => ({ ...prev, showPageNumber: e.target.checked }))
                }
                className="w-4 h-4 accent-blue-600 cursor-pointer"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
};
