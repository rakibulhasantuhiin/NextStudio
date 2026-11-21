import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  FileDown,
  LayoutGrid,
  Loader2,
  Maximize2,
  MousePointerClick,
  Printer,
  Settings2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  ReadyDocPaperOverride,
  ReadyDocState,
  ReadyDocTemplate,
} from '../../types/readyDocs';
import {
  getDefaultValuesForTemplate,
  getReadyDocTemplateById,
  READY_DOC_PAPER_SPECS,
  resolveReadyDocPaper,
  toBanglaDigits,
} from '../../utils/readyDocs';
import { ReadyDocFieldModal } from './ReadyDocFieldModal';
import { ReadyDocGallery } from './ReadyDocGallery';
import { ReadyDocSheetRenderer } from './ReadyDocSheetRenderer';
import { DocumentTypographyBar } from '../RichTextToolbar';
import { DEFAULT_BANGLA_FONT } from '../../utils/richText';

interface ReadyDocWorkspaceProps {
  lang: 'bn' | 'en';
  template: ReadyDocTemplate;
  readyDocState: ReadyDocState;
  setReadyDocState: React.Dispatch<React.SetStateAction<ReadyDocState>>;
  showGallery: boolean;
  setShowGallery: (show: boolean) => void;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  onFitZoom: () => void;
  onPrintDoc: () => void;
  onDownloadDocPdf: () => void;
  isExporting?: boolean;
}

export const ReadyDocWorkspace: React.FC<ReadyDocWorkspaceProps> = ({
  lang,
  template,
  readyDocState,
  setReadyDocState,
  showGallery,
  setShowGallery,
  zoom,
  setZoom,
  onFitZoom,
  onPrintDoc,
  onDownloadDocPdf,
  isExporting = false,
}) => {
  const isBn = lang === 'bn';
  const [activeFieldKey, setActiveFieldKey] = useState<string | null>(null);
  const [isFinalPreview, setIsFinalPreview] = useState(false);
  const [showOptionsStrip, setShowOptionsStrip] = useState(false);
  const [scrollZoomEnabled, setScrollZoomEnabled] = useState(true);
  const [zoomHudVisible, setZoomHudVisible] = useState(false);
  const [sheetHeight, setSheetHeight] = useState(1123);

  const stageRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const zoomTimerRef = useRef<number | null>(null);

  const activePaper = useMemo(
    () => resolveReadyDocPaper(template, readyDocState.paperOverride),
    [template, readyDocState.paperOverride]
  );

  const values = readyDocState.valuesByDoc[template.id] || {};
  const tableRows = useMemo(() => {
    const saved = readyDocState.tablesByDoc[template.id];
    if (saved && saved.length > 0) return saved;
    return template.defaultTableRows ? template.defaultTableRows.map((r) => [...r]) : [];
  }, [readyDocState.tablesByDoc, template]);

  const photoSrc = readyDocState.photosByDoc[template.id] || '';

  const filledCount = template.fields.filter((f) => Boolean((values[f.key] || '').trim())).length;
  const totalFields = template.fields.length;
  const fillPercent = totalFields > 0 ? Math.round((filledCount / totalFields) * 100) : 100;

  const activeFieldIndex = activeFieldKey
    ? template.fields.findIndex((f) => f.key === activeFieldKey)
    : -1;
  const activeField = activeFieldIndex >= 0 ? template.fields[activeFieldIndex] : null;

  // Measure sheet height accurately for scaled wrapper
  useEffect(() => {
    if (showGallery) return;
    const node = measureRef.current;
    if (!node) return;
    const update = () => {
      setSheetHeight(Math.max(activePaper.heightPx, Math.ceil(node.scrollHeight)));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(node);
    return () => ro.disconnect();
  }, [showGallery, template, values, tableRows, readyDocState, activePaper.heightPx, isFinalPreview]);

  // Smooth mouse-wheel hover zoom over the document sheet
  useEffect(() => {
    if (showGallery) return;
    const el = stageRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (!scrollZoomEnabled && !e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      e.stopPropagation();

      const direction = e.deltaY < 0 ? 1 : -1;
      const step = Math.abs(e.deltaY) < 25 ? 0.04 : 0.08;
      setZoom((prev) => {
        const next = Math.round((prev + direction * step) * 100) / 100;
        return Math.min(1.8, Math.max(0.38, next));
      });

      setZoomHudVisible(true);
      if (zoomTimerRef.current) window.clearTimeout(zoomTimerRef.current);
      zoomTimerRef.current = window.setTimeout(() => setZoomHudVisible(false), 950);
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
      if (zoomTimerRef.current) window.clearTimeout(zoomTimerRef.current);
    };
  }, [scrollZoomEnabled, setZoom, showGallery]);

  const handleSelectDocument = (docId: string) => {
    const nextTemplate = getReadyDocTemplateById(docId);
    setReadyDocState((prev) => ({
      ...prev,
      selectedDocId: docId,
      stampTopMm: nextTemplate.defaultStampTopMm ?? prev.stampTopMm,
      paperOverride: 'auto',
      valuesByDoc: prev.valuesByDoc[docId]
        ? prev.valuesByDoc
        : {
            ...prev.valuesByDoc,
            [docId]: getDefaultValuesForTemplate(nextTemplate),
          },
    }));
    setActiveFieldKey(null);
    setIsFinalPreview(false);
    setShowGallery(false);
  };

  const handleFieldChange = (key: string, val: string) => {
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

  const handleJumpNextEmpty = () => {
    setIsFinalPreview(false);
    const nextEmpty = template.fields.find((f) => !(values[f.key] || '').trim());
    if (nextEmpty) {
      setActiveFieldKey(nextEmpty.key);
    } else if (template.fields.length > 0) {
      setActiveFieldKey(template.fields[0].key);
    }
  };

  const handlePrevField = () => {
    if (activeFieldIndex > 0) {
      setActiveFieldKey(template.fields[activeFieldIndex - 1].key);
    } else {
      setActiveFieldKey(template.fields[template.fields.length - 1]?.key || null);
    }
  };

  const handleNextField = () => {
    if (activeFieldIndex >= 0 && activeFieldIndex < template.fields.length - 1) {
      setActiveFieldKey(template.fields[activeFieldIndex + 1].key);
    } else {
      setActiveFieldKey(null);
    }
  };

  const handleUpdateTableCell = (rowIdx: number, colIdx: number, val: string) => {
    setReadyDocState((prev) => {
      const currentRows = prev.tablesByDoc[template.id]?.length
        ? prev.tablesByDoc[template.id].map((r) => [...r])
        : (template.defaultTableRows || []).map((r) => [...r]);
      if (!currentRows[rowIdx]) return prev;
      currentRows[rowIdx][colIdx] = val;
      return {
        ...prev,
        tablesByDoc: {
          ...prev.tablesByDoc,
          [template.id]: currentRows,
        },
      };
    });
  };

  const handleAddTableRow = () => {
    setReadyDocState((prev) => {
      const currentRows = prev.tablesByDoc[template.id]?.length
        ? prev.tablesByDoc[template.id].map((r) => [...r])
        : (template.defaultTableRows || []).map((r) => [...r]);
      const colCount = currentRows[0]?.length || 5;
      const newRow = Array.from({ length: colCount }, (_, cIdx) =>
        cIdx === 0
          ? template.lang === 'bn'
            ? toBanglaDigits(currentRows.length + 1)
            : String(currentRows.length + 1)
          : ''
      );
      return {
        ...prev,
        tablesByDoc: {
          ...prev.tablesByDoc,
          [template.id]: [...currentRows, newRow],
        },
      };
    });
  };

  const handleRemoveTableRow = (rowIdx: number) => {
    setReadyDocState((prev) => {
      const currentRows = prev.tablesByDoc[template.id]?.length
        ? prev.tablesByDoc[template.id].map((r) => [...r])
        : (template.defaultTableRows || []).map((r) => [...r]);
      if (currentRows.length <= 1) return prev;
      return {
        ...prev,
        tablesByDoc: {
          ...prev.tablesByDoc,
          [template.id]: currentRows.filter((_, i) => i !== rowIdx),
        },
      };
    });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setReadyDocState((prev) => ({
        ...prev,
        photosByDoc: { ...prev.photosByDoc, [template.id]: dataUrl },
      }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  if (showGallery) {
    return (
      <div className="flex-1 w-full overflow-y-auto">
        <ReadyDocGallery
          selectedDocId={template.id}
          lang={lang}
          onSelectDoc={handleSelectDocument}
          onBackToEditor={() => setShowGallery(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-full relative">
      {/* Top Floating Liquid Glass Document Toolbar (Matching Screenshots 10–12) */}
      <div className="sticky top-0 z-20 px-2 pt-2 pb-1.5 lg:px-5 lg:pt-3 lg:pb-2 space-y-1.5 lg:space-y-2">
        <div className="glass-strip rounded-2xl px-2 lg:px-3.5 py-1.5 lg:py-2 flex flex-wrap items-center justify-between gap-1.5 lg:gap-2">
          {/* Left: Switch Doc + Progress + Next Empty Field + Options + Page Size */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setShowGallery(true)}
              className="glass-tile px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 cursor-pointer"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>{isBn ? 'অন্য কাগজ' : 'All 65 Docs'}</span>
            </button>

            {/* Progress Indicator (e.g. ১/১০ ঘর ভরা) */}
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl glass-track">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 tabular-nums">
                {isBn
                  ? `${toBanglaDigits(filledCount)}/${toBanglaDigits(totalFields)} ঘর ভরা`
                  : `${filledCount}/${totalFields} filled`}
              </span>
              <div className="w-12 h-1.5 rounded-full bg-slate-900/10 dark:bg-white/15 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${fillPercent}%` }}
                />
              </div>
            </div>

            {/* Next Empty Field Jump Button */}
            <button
              type="button"
              onClick={handleJumpNextEmpty}
              className="glass-btn-primary px-2.5 py-1.5 rounded-xl text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>{isBn ? 'পরের ফাঁকা ঘর' : 'Next Empty'}</span>
              <ArrowDown className="w-3.5 h-3.5" />
            </button>

            {/* Options Toggle */}
            <button
              type="button"
              onClick={() => setShowOptionsStrip((v) => !v)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer transition ${
                showOptionsStrip
                  ? 'bg-blue-600/15 dark:bg-blue-500/25 text-blue-700 dark:text-blue-300 border border-blue-400/50'
                  : 'glass-tile text-slate-700 dark:text-slate-200'
              }`}
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>{isBn ? 'অপশন' : 'Options'}</span>
            </button>

            {/* Page Size Dropdown */}
            <div className="flex items-center gap-1 glass-track px-2 py-1 rounded-xl text-xs">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {isBn ? 'পাতা:' : 'Page:'}
              </span>
              <select
                value={readyDocState.paperOverride}
                onChange={(e) =>
                  setReadyDocState((prev) => ({
                    ...prev,
                    paperOverride: e.target.value as ReadyDocPaperOverride,
                  }))
                }
                className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
              >
                <option value="auto" className="text-slate-900">
                  {isBn
                    ? `অটো (${READY_DOC_PAPER_SPECS[template.paper].labelBn})`
                    : `Auto (${READY_DOC_PAPER_SPECS[template.paper].labelEn})`}
                </option>
                <option value="a4" className="text-slate-900">A4</option>
                <option value="a4-landscape" className="text-slate-900">
                  {isBn ? 'A4 আড়াআড়ি' : 'A4 Landscape'}
                </option>
                <option value="legal" className="text-slate-900">LEGAL</option>
                <option value="legal135" className="text-slate-900">LEGAL135</option>
              </select>
            </div>
          </div>

          {/* Right: Bangla Font + Size + Bold/Italic/Underline/Highlight + Zoom + Final Preview + PDF + Print */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <DocumentTypographyBar
              lang={lang}
              fontFamily={readyDocState.fontFamily || DEFAULT_BANGLA_FONT}
              onChangeFontFamily={(fontFamily) =>
                setReadyDocState((p) => ({ ...p, fontFamily }))
              }
              fontSizePx={readyDocState.fontSizePx}
              onChangeFontSizePx={(fontSizePx) =>
                setReadyDocState((p) => ({ ...p, fontSizePx }))
              }
              minFontSize={10}
              maxFontSize={24}
              bold={Boolean(readyDocState.textBold)}
              onToggleBold={() =>
                setReadyDocState((p) => ({ ...p, textBold: !p.textBold }))
              }
              italic={Boolean(readyDocState.textItalic)}
              onToggleItalic={() =>
                setReadyDocState((p) => ({ ...p, textItalic: !p.textItalic }))
              }
              underline={Boolean(readyDocState.textUnderline)}
              onToggleUnderline={() =>
                setReadyDocState((p) => ({ ...p, textUnderline: !p.textUnderline }))
              }
              highlight={readyDocState.textHighlight || 'none'}
              onChangeHighlight={(textHighlight) =>
                setReadyDocState((p) => ({ ...p, textHighlight }))
              }
              compact
            />

            {/* Zoom Strip (visible on both Desktop and Mobile!) */}
            <div className="flex items-center gap-0.5 glass-track p-0.5 rounded-xl">
              <button
                type="button"
                onClick={() => setScrollZoomEnabled((v) => !v)}
                className={`hidden md:inline-flex p-1.5 rounded-lg transition cursor-pointer ${
                  scrollZoomEnabled
                    ? 'glass-tab-active text-blue-600 dark:text-blue-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
                title={isBn ? 'মাউস স্ক্রল জুম টগল' : 'Toggle Mouse Wheel Hover Zoom'}
              >
                <MousePointerClick className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.32, Math.round((z - 0.1) * 100) / 100))}
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-white/10 cursor-pointer"
                aria-label="Zoom out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-200 px-1 min-w-[38px] text-center tabular-nums">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(1.8, Math.round((z + 0.1) * 100) / 100))}
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-white/10 cursor-pointer"
                aria-label="Zoom in"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onFitZoom}
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-white/10 cursor-pointer"
                aria-label="Fit to screen"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Final Preview Toggle */}
            <button
              type="button"
              onClick={() => setIsFinalPreview((v) => !v)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition ${
                isFinalPreview
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'glass-tile text-slate-800 dark:text-slate-100'
              }`}
            >
              {isFinalPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>
                {isFinalPreview
                  ? isBn
                    ? 'কাগজে এডিট'
                    : 'Edit Sheet'
                  : isBn
                  ? 'শেষ চেহারা'
                  : 'Final View'}
              </span>
            </button>

            <button
              type="button"
              onClick={onDownloadDocPdf}
              disabled={isExporting}
              className="hidden lg:flex glass-btn-emerald px-3 py-1.5 rounded-xl text-white text-xs font-bold items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {isExporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileDown className="w-3.5 h-3.5" />
              )}
              <span>PDF</span>
            </button>

            <button
              type="button"
              onClick={onPrintDoc}
              className="hidden lg:flex glass-btn-primary px-3 py-1.5 rounded-xl text-white text-xs font-bold items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isBn ? 'প্রিন্ট' : 'Print'}</span>
            </button>
          </div>
        </div>

        {/* Collapsible Extra Options Bar (Matching Screenshot 10: অপশন — কাগজের লেখায় সরাসরি নেই এমন ঘর) */}
        <div className="glass-banner rounded-xl px-3.5 py-2">
          <button
            type="button"
            onClick={() => setShowOptionsStrip((v) => !v)}
            className="w-full flex items-center justify-between gap-2 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              {showOptionsStrip ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
              <span>
                {isBn
                  ? `অপশন — ${template.title} (${activePaper.labelBn}) · কাগজের হলুদ/নীল ঘরে ক্লিক করে সরাসরি লিখুন`
                  : `Options — ${template.titleEn} (${activePaper.labelEn}) · Click any highlighted token on the paper to edit`}
              </span>
            </span>
          </button>

          {showOptionsStrip && (
            <div className="mt-2.5 pt-2.5 border-t border-slate-900/10 dark:border-white/10 flex flex-wrap items-center gap-4 text-xs">
              {template.isStampPaper && (
                <label className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-200">
                  <span>{isBn ? 'স্ট্যাম্প ফাঁকা:' : 'Stamp Top:'}</span>
                  <input
                    type="range"
                    min={20}
                    max={135}
                    step={2}
                    value={readyDocState.stampTopMm}
                    onChange={(e) =>
                      setReadyDocState((p) => ({ ...p, stampTopMm: Number(e.target.value) }))
                    }
                    className="w-28 accent-blue-600 cursor-pointer"
                  />
                  <span className="font-mono text-[11px]">{readyDocState.stampTopMm}mm</span>
                </label>
              )}

              <label className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={readyDocState.showBorder}
                  onChange={(e) =>
                    setReadyDocState((p) => ({ ...p, showBorder: e.target.checked }))
                  }
                  className="accent-blue-600"
                />
                <span>{isBn ? 'বর্ডার ফ্রেম' : 'Border Frame'}</span>
              </label>

              {template.hasOptionalHeaderToggle && (
                <label className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={readyDocState.showHeader}
                    onChange={(e) =>
                      setReadyDocState((p) => ({ ...p, showHeader: e.target.checked }))
                    }
                    className="accent-blue-600"
                  />
                  <span>{isBn ? 'প্রতিষ্ঠানের হেডার' : 'Show Header'}</span>
                </label>
              )}

              <label className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={readyDocState.showPageNumber}
                  onChange={(e) =>
                    setReadyDocState((p) => ({ ...p, showPageNumber: e.target.checked }))
                  }
                  className="accent-blue-600"
                />
                <span>{isBn ? 'পৃষ্ঠা নম্বর' : 'Page Number'}</span>
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Main Scrollable Document Drafting Stage */}
      <div className="flex-1 flex flex-col items-center px-3 sm:px-6 pb-8 pt-2 overflow-auto">
        <div ref={stageRef} className="relative glass-stage p-2.5 sm:p-3.5 rounded-2xl">
          {zoomHudVisible && (
            <div className="glass-hud pointer-events-none fixed bottom-20 right-6 z-40 px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-white">
              {Math.round(zoom * 100)}%
            </div>
          )}

          <div
            className="relative bg-white rounded-lg overflow-hidden shadow-sm"
            style={{
              width: `${Math.round(activePaper.widthPx * zoom)}px`,
              minHeight: `${Math.round(sheetHeight * zoom)}px`,
            }}
          >
            <div
              ref={measureRef}
              style={{
                width: `${activePaper.widthPx}px`,
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
              }}
            >
              <ReadyDocSheetRenderer
                template={template}
                paper={activePaper}
                values={values}
                tableRows={tableRows}
                photoSrc={photoSrc}
                fontFamily={readyDocState.fontFamily || DEFAULT_BANGLA_FONT}
                fontSizePx={readyDocState.fontSizePx}
                lineHeight={readyDocState.lineHeight}
                textBold={Boolean(readyDocState.textBold)}
                textItalic={Boolean(readyDocState.textItalic)}
                textUnderline={Boolean(readyDocState.textUnderline)}
                textHighlight={readyDocState.textHighlight || 'none'}
                stampTopMm={readyDocState.stampTopMm}
                showHeader={readyDocState.showHeader}
                showBorder={readyDocState.showBorder}
                showPageNumber={readyDocState.showPageNumber}
                interactive={!isFinalPreview}
                activeFieldKey={activeFieldKey}
                onClickField={(key) => setActiveFieldKey(key)}
                onUpdateTableCell={handleUpdateTableCell}
                onAddTableRow={handleAddTableRow}
                onRemoveTableRow={handleRemoveTableRow}
                onClickPhoto={() => photoInputRef.current?.click()}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Hidden Photo Upload Input for Admission Form / Exam Admit Card */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoUpload}
        className="hidden"
      />

      {/* Floating Field Editor Popover Modal */}
      <ReadyDocFieldModal
        field={activeField}
        value={activeField ? values[activeField.key] || '' : ''}
        docLang={template.lang}
        uiLang={lang}
        currentIndex={activeFieldIndex}
        totalFields={totalFields}
        onChange={(val) => {
          if (activeField) handleFieldChange(activeField.key, val);
        }}
        onPrev={handlePrevField}
        onNext={handleNextField}
        onClose={() => setActiveFieldKey(null)}
      />
    </div>
  );
};
