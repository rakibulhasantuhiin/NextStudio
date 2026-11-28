import React, { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  HardDriveDownload,
  Image as ImageIcon,
  Loader2,
  Presentation,
  RefreshCw,
  Sparkles,
  WifiOff,
} from 'lucide-react';
import {
  ConverterMode,
  ExtractedDocumentPayload,
  OcrLangMode,
  OcrOptions,
  OutputFormat,
  PdfOrientationId,
  PdfPageSizeId,
  PdfRenderOptions,
  PptxMode,
  convertPayloadToFormat,
  detectSourceKind,
  getCachedOcrLangs,
  parseInputFileToPayload,
  prewarmOfflineOcrPack,
} from '../../utils/documentConverter';
import { BANGLA_FONTS, BanglaFontId, DEFAULT_BANGLA_FONT } from '../../utils/richText';
import { ProcessedFileResult, downloadBlob, getBaseName } from '../../utils/toolsEngine';
import {
  FileDropzone,
  ProcessedResultsList,
  SelectedFileItem,
  ToolHeader,
  ToolsLang,
  createFileItems,
  fmtToolNum,
} from './SharedToolUI';

interface DocumentConverterToolProps {
  lang?: ToolsLang;
  onBack: () => void;
}

interface FormatOptionMeta {
  id: OutputFormat;
  labelEn: string;
  labelBn: string;
  extLabel: string;
}

const OUTPUT_FORMATS: FormatOptionMeta[] = [
  { id: 'docx', labelEn: 'Word (.docx)', labelBn: 'ওয়ার্ড (.docx)', extLabel: 'DOCX' },
  { id: 'doc', labelEn: 'Word Legacy (.doc)', labelBn: 'ওয়ার্ড (.doc)', extLabel: 'DOC' },
  { id: 'pptx', labelEn: 'PowerPoint (.pptx)', labelBn: 'পাওয়ারপয়েন্ট (.pptx)', extLabel: 'PPTX' },
  { id: 'xlsx', labelEn: 'Excel (.xlsx)', labelBn: 'এক্সেল (.xlsx)', extLabel: 'XLSX' },
  { id: 'csv', labelEn: 'CSV Table (.csv)', labelBn: 'সিএসভি (.csv)', extLabel: 'CSV' },
  { id: 'pdf', labelEn: 'PDF Document (.pdf)', labelBn: 'PDF ডকুমেন্ট (.pdf)', extLabel: 'PDF' },
  { id: 'rtf', labelEn: 'Rich Text (.rtf)', labelBn: 'রিচ টেক্সট (.rtf)', extLabel: 'RTF' },
  { id: 'html', labelEn: 'Web Document (.html)', labelBn: 'HTML ফাইল (.html)', extLabel: 'HTML' },
  { id: 'txt', labelEn: 'Plain Text (.txt)', labelBn: 'টেক্সট ফাইল (.txt)', extLabel: 'TXT' },
];

const MODE_META: {
  id: ConverterMode;
  labelEn: string;
  labelBn: string;
  accept: string;
  defaultTarget: OutputFormat;
  allowedTargets: OutputFormat[];
}[] = [
  {
    id: 'pdf-to-office',
    labelEn: 'PDF → Word / PPTX / Excel',
    labelBn: 'PDF → ওয়ার্ড / PPTX / এক্সেল',
    accept: 'application/pdf,.pdf',
    defaultTarget: 'docx',
    allowedTargets: ['docx', 'doc', 'pptx', 'xlsx', 'csv', 'rtf', 'html', 'txt'],
  },
  {
    id: 'office-to-pdf',
    labelEn: 'Word / Excel / PPT → PDF',
    labelBn: 'ওয়ার্ড / এক্সেল / PPT → PDF',
    accept:
      '.docx,.doc,.xlsx,.xls,.csv,.ods,.pptx,.rtf,.html,.htm,.txt,.md,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/csv,text/plain,text/html',
    defaultTarget: 'pdf',
    allowedTargets: ['pdf'],
  },
  {
    id: 'image-to-word',
    labelEn: 'Image → Word (Sharp OCR)',
    labelBn: 'ছবি → ওয়ার্ড (স্পষ্ট OCR)',
    accept: 'image/jpeg,image/png,image/webp,image/bmp,.jpg,.jpeg,.png,.webp,.bmp',
    defaultTarget: 'docx',
    allowedTargets: ['docx', 'doc', 'pdf', 'rtf', 'txt', 'html'],
  },
  {
    id: 'cross-format',
    labelEn: 'All Formats (Any ↔ Any)',
    labelBn: 'সব ফরম্যাট (যেকোনো কনভার্ট)',
    accept:
      '.pdf,.docx,.doc,.xlsx,.xls,.csv,.ods,.pptx,.rtf,.html,.htm,.txt,.md,image/jpeg,image/png,image/webp,image/bmp',
    defaultTarget: 'docx',
    allowedTargets: ['docx', 'doc', 'pptx', 'xlsx', 'csv', 'pdf', 'rtf', 'html', 'txt'],
  },
];

function escapeHtmlBasic(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export const DocumentConverterTool: React.FC<DocumentConverterToolProps> = ({
  lang = 'en',
  onBack,
}) => {
  const isBn = lang === 'bn';

  const [mode, setMode] = useState<ConverterMode>('pdf-to-office');
  const [targetFormat, setTargetFormat] = useState<OutputFormat>('docx');
  const [files, setFiles] = useState<SelectedFileItem[]>([]);
  const [results, setResults] = useState<ProcessedFileResult[]>([]);
  const [payloads, setPayloads] = useState<ExtractedDocumentPayload[]>([]);
  const [activePreviewIdx, setActivePreviewIdx] = useState(0);
  const [activeSheetIdx, setActiveSheetIdx] = useState(0);
  const [copiedText, setCopiedText] = useState(false);

  // Office / PDF / PPTX / OCR options
  const [pptxMode, setPptxMode] = useState<PptxMode>('editable');
  const [autoOcrScannedPdf, setAutoOcrScannedPdf] = useState(true);
  const [ocrOptions, setOcrOptions] = useState<OcrOptions>({
    lang: 'ben+eng',
    enhanceSharpness: true,
    upscale2x: true,
    adaptiveThreshold: true,
  });
  const [pdfOptions, setPdfOptions] = useState<PdfRenderOptions>({
    pageSize: 'a4',
    orientation: 'portrait',
    banglaFont: DEFAULT_BANGLA_FONT,
    fontSizePx: 14,
    marginMm: 16,
  });

  // Processing & Offline Cache states
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cachedOcrLangs, setCachedOcrLangs] = useState<string[]>(() => getCachedOcrLangs());
  const [isCachingOcr, setIsCachingOcr] = useState(false);
  const [ocrCacheMsg, setOcrCacheMsg] = useState<string | null>(null);

  const activeModeMeta = useMemo(
    () => MODE_META.find((m) => m.id === mode) || MODE_META[0],
    [mode]
  );

  const availableOutputs = useMemo(
    () => OUTPUT_FORMATS.filter((f) => activeModeMeta.allowedTargets.includes(f.id)),
    [activeModeMeta]
  );

  const handleModeChange = (nextMode: ConverterMode) => {
    const nextMeta = MODE_META.find((m) => m.id === nextMode) || MODE_META[0];
    setMode(nextMode);
    setTargetFormat(nextMeta.defaultTarget);
    setFiles([]);
    setResults([]);
    setPayloads([]);
    setActivePreviewIdx(0);
    setActiveSheetIdx(0);
    setError(null);
  };

  const handleAddFiles = (newFiles: File[]) => {
    const isImageMode = mode === 'image-to-word';
    const items = createFileItems(newFiles, isImageMode ? 'image' : 'pdf').map((item) => {
      const kind = detectSourceKind(item.file);
      return {
        ...item,
        previewUrl:
          kind === 'image' ? URL.createObjectURL(item.file) : item.previewUrl,
        metaText: kind.toUpperCase(),
      };
    });
    setFiles((prev) => [...prev, ...items]);
    setError(null);
  };

  const handleCacheOfflineOcr = async () => {
    setIsCachingOcr(true);
    setOcrCacheMsg(null);
    setError(null);
    try {
      await prewarmOfflineOcrPack('ben+eng', (pct, msg) => {
        setProgressPct(pct);
        setProgressLabel(msg);
      });
      const updated = getCachedOcrLangs();
      setCachedOcrLangs(updated);
      setOcrCacheMsg(
        isBn
          ? 'বাংলা ও ইংরেজি অফলাইন OCR ডেটা সফলভাবে সেভ হয়েছে — এখন ইন্টারনেট ছাড়াই কাজ করবে।'
          : 'Bangla & English offline OCR pack cached in browser — ready for 100% offline use.'
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : isBn
          ? 'অফলাইন OCR ডেটা সেভ করতে সমস্যা হয়েছে।'
          : 'Failed to cache offline OCR pack.'
      );
    } finally {
      setIsCachingOcr(false);
      setProgressPct(0);
      setProgressLabel('');
    }
  };

  const runConversion = async (previewOnly = false) => {
    if (files.length === 0) return;
    setError(null);
    setIsProcessing(true);
    setProgressPct(0);
    setProgressLabel('');

    const nextPayloads: ExtractedDocumentPayload[] = [];
    const nextResults: ProcessedFileResult[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const item = files[i];
        const filePrefix = files.length > 1 ? `[${i + 1}/${files.length}] ` : '';

        const payload = await parseInputFileToPayload(item.file, {
          ocrOptions,
          autoOcrScannedPdf: autoOcrScannedPdf,
          capturePdfSnapshots: targetFormat === 'pptx' && pptxMode === 'hybrid',
          onProgress: (pct, msg) => {
            const overall = Math.round(((i + pct / 100) / files.length) * 80);
            setProgressPct(overall);
            setProgressLabel(`${filePrefix}${msg}`);
          },
        });
        nextPayloads.push(payload);

        if (!previewOnly) {
          setProgressLabel(
            `${filePrefix}${isBn ? 'ফাইল তৈরি হচ্ছে...' : `Generating ${targetFormat.toUpperCase()}...`}`
          );
          const exported = await convertPayloadToFormat(payload, targetFormat, {
            pdfOptions,
            pptxMode,
            onProgress: (pct, msg) => {
              const overall = Math.round(((i + 0.8 + (pct / 100) * 0.2) / files.length) * 100);
              setProgressPct(overall);
              setProgressLabel(`${filePrefix}${msg}`);
            },
          });

          const infoParts: string[] = [exported.filename.split('.').pop()?.toUpperCase() || ''];
          if (payload.pages?.length) {
            infoParts.push(
              isBn
                ? `${fmtToolNum(payload.pages.length, lang)} পাতা`
                : `${payload.pages.length} page${payload.pages.length === 1 ? '' : 's'}`
            );
          }
          if (payload.slides?.length) {
            infoParts.push(
              isBn
                ? `${fmtToolNum(payload.slides.length, lang)} স্লাইড`
                : `${payload.slides.length} slide${payload.slides.length === 1 ? '' : 's'}`
            );
          }
          if (payload.sheets?.length) {
            infoParts.push(
              isBn
                ? `${fmtToolNum(payload.sheets.length, lang)} শিট`
                : `${payload.sheets.length} sheet${payload.sheets.length === 1 ? '' : 's'}`
            );
          }
          if (typeof payload.detectedOcrConfidence === 'number') {
            infoParts.push(
              isBn
                ? `OCR মান ${fmtToolNum(payload.detectedOcrConfidence, lang)}%`
                : `OCR ${payload.detectedOcrConfidence}%`
            );
          }

          nextResults.push({
            id: `conv-${item.id}-${Date.now()}`,
            name: exported.filename,
            originalName: item.file.name,
            originalSize: item.file.size,
            blob: exported.blob,
            previewUrl: payload.enhancedPreviewUrl || item.previewUrl,
            infoText: infoParts.filter(Boolean).join(' · '),
          });
        }
      }

      setPayloads(nextPayloads);
      setActivePreviewIdx(0);
      setActiveSheetIdx(0);
      if (!previewOnly) {
        setResults(nextResults);
      }
      setProgressPct(100);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : isBn
          ? 'ফাইল কনভার্ট করতে সমস্যা হয়েছে।'
          : 'Failed to convert file(s).'
      );
    } finally {
      setIsProcessing(false);
      setProgressLabel('');
    }
  };

  // Live edit handler for extracted OCR / document preview text
  const activePayload = payloads[activePreviewIdx] || null;

  const handleUpdateActivePlainText = (nextText: string) => {
    setPayloads((prev) =>
      prev.map((p, idx) => {
        if (idx !== activePreviewIdx) return p;
        const htmlContent = nextText
          .replace(/\r\n/g, '\n')
          .split(/\n{2,}/)
          .map((para) => `<p>${escapeHtmlBasic(para).replace(/\n/g, '<br/>')}</p>`)
          .join('\n');
        return {
          ...p,
          plainText: nextText,
          htmlContent,
          pages: undefined,
          sheets: undefined,
        };
      })
    );
  };

  const handleExportEditedPreview = async (fmt: OutputFormat) => {
    if (!activePayload) return;
    setIsProcessing(true);
    setError(null);
    try {
      const exported = await convertPayloadToFormat(activePayload, fmt, {
        pdfOptions,
        pptxMode,
        onProgress: (pct, msg) => {
          setProgressPct(pct);
          setProgressLabel(msg);
        },
      });
      downloadBlob(exported.blob, exported.filename);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed.');
    } finally {
      setIsProcessing(false);
      setProgressLabel('');
    }
  };

  const handleCopyPreviewText = async () => {
    if (!activePayload?.plainText) return;
    try {
      await navigator.clipboard.writeText(activePayload.plainText);
      setCopiedText(true);
      window.setTimeout(() => setCopiedText(false), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  const isOcrCachedBoth = cachedOcrLangs.includes('ben') && cachedOcrLangs.includes('eng');
  const needsPdfAppearance =
    targetFormat === 'pdf' || mode === 'office-to-pdf';
  const needsOcrControls =
    mode === 'image-to-word' ||
    mode === 'pdf-to-office' ||
    mode === 'cross-format';

  return (
    <div>
      <ToolHeader
        title={
          isBn
            ? 'অফিস, PDF ও ছবি কনভার্টার (Word / Excel / PPTX / OCR)'
            : 'Document, Office & Image-to-Word Converter'
        }
        subtitle={
          isBn
            ? 'PDF থেকে Word (.docx/.doc), PowerPoint (.pptx), Excel (.xlsx), অথবা Word/Excel/PPTX থেকে ফন্ট না ভেঙে PDF — সাথে ছবি থেকে স্পষ্ট বাংলা-ইংরেজি Word OCR, সব অফলাইনে।'
            : 'Convert PDF to Word, PowerPoint, or Excel, convert Office documents to crisp Unicode PDF without broken fonts, and extract sharp Bengali & English text from images into Word — 100% locally.'
        }
        categoryLabel={isBn ? 'ছবি ও PDF টুলস' : 'Image & PDF Tools'}
        onBack={onBack}
      />

      {/* Mode Switcher Tabs + Offline OCR Cache Status */}
      <div className="glass-panel rounded-2xl p-3 sm:p-4 mb-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 p-1 glass-track rounded-xl overflow-x-auto no-scrollbar">
            {MODE_META.map((m) => {
              const active = mode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleModeChange(m.id)}
                  className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition cursor-pointer ${
                    active
                      ? 'glass-btn-primary text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {isBn ? m.labelBn : m.labelEn}
                </button>
              );
            })}
          </div>

          {/* Offline OCR Pack Readiness & One-Click Pre-Cache */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <span className="text-slate-600 dark:text-slate-300 font-medium inline-flex items-center gap-1.5">
              <WifiOff className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>
                {isOcrCachedBoth
                  ? isBn
                    ? 'অফলাইন OCR (বাংলা+ইংরেজি) প্রস্তুত'
                    : 'Offline OCR (BN+EN) Cached'
                  : isBn
                  ? 'অফলাইন OCR প্যাক সেভ নেই'
                  : 'Offline OCR Pack Not Cached'}
              </span>
            </span>

            <button
              type="button"
              onClick={() => void handleCacheOfflineOcr()}
              disabled={isCachingOcr || isProcessing}
              className="glass-tile px-3 py-1.5 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
            >
              {isCachingOcr ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : isOcrCachedBoth ? (
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <HardDriveDownload className="w-3.5 h-3.5" />
              )}
              <span>
                {isCachingOcr
                  ? isBn
                    ? 'সেভ হচ্ছে...'
                    : 'Caching...'
                  : isOcrCachedBoth
                  ? isBn
                    ? 'OCR প্যাক আপডেট'
                    : 'Refresh OCR Cache'
                  : isBn
                  ? 'অফলাইন OCR সেভ করুন'
                  : 'Cache Offline OCR'}
              </span>
            </button>
          </div>
        </div>

        {ocrCacheMsg && (
          <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 px-1">
            <Check className="w-3.5 h-3.5 shrink-0" />
            <span>{ocrCacheMsg}</span>
          </div>
        )}
      </div>

      {/* Main 2-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Upload + Conversion Settings */}
        <div className="lg:col-span-5 space-y-4">
          <FileDropzone
            lang={lang}
            accept={activeModeMeta.accept}
            multiple={true}
            fileKind={mode === 'image-to-word' ? 'image' : 'pdf'}
            title={
              mode === 'pdf-to-office'
                ? isBn
                  ? 'PDF ফাইল দিন (১টি বা একাধিক)'
                  : 'Drop PDF File(s)'
                : mode === 'office-to-pdf'
                ? isBn
                  ? 'Word (.docx/.doc), Excel (.xlsx/.csv) বা PPTX ফাইল দিন'
                  : 'Drop Word, Excel, PowerPoint, RTF or Text Files'
                : mode === 'image-to-word'
                ? isBn
                  ? 'লেখাসহ ছবি দিন (JPG / PNG / WebP)'
                  : 'Drop Document Photo(s) or Scans'
                : isBn
                ? 'যেকোনো PDF, Office ডকুমেন্ট বা ছবি দিন'
                : 'Drop Any PDF, Office File, or Image'
            }
            subtitle={
              mode === 'pdf-to-office'
                ? isBn
                  ? 'Word, PowerPoint, Excel, CSV, RTF বা টেক্সটে রূপান্তর হবে'
                  : 'Convert to editable DOCX, DOC, PPTX, XLSX, CSV, RTF, or TXT'
                : mode === 'office-to-pdf'
                ? isBn
                  ? 'বাংলা ও ইংরেজি ফন্ট অটুট রেখে নিখুঁত PDF তৈরি হবে'
                  : 'Unicode Bangla & English font shaping preserved in output PDF'
                : mode === 'image-to-word'
                ? isBn
                  ? 'অস্পষ্ট ছবি পরিষ্কার করে স্পষ্ট বাংলা ও ইংরেজি লেখা ডিটেক্ট করে'
                  : 'Auto-enhances contrast & sharpness to extract crisp Bangla/English text'
                : isBn
                ? 'PDF ↔ Word ↔ Excel ↔ PPTX ↔ Image ↔ TXT/HTML/RTF'
                : 'Universal local conversion across PDF, Office, Text & Image formats'
            }
            files={files}
            onAddFiles={handleAddFiles}
            onRemoveFile={(id) => setFiles((prev) => prev.filter((f) => f.id !== id))}
            onClearAll={() => {
              setFiles([]);
              setResults([]);
              setPayloads([]);
            }}
          />

          {/* Configuration Controls */}
          <div className="glass-panel rounded-2xl p-4 sm:p-5 space-y-4">
            {/* Target Format Selector */}
            {availableOutputs.length > 1 && (
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-slate-800 dark:text-slate-100 block">
                  {isBn ? 'কোন ফরম্যাটে পরিবর্তন করবেন?' : 'Convert Output Format'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {availableOutputs.map((fmt) => {
                    const selected = targetFormat === fmt.id;
                    return (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => setTargetFormat(fmt.id)}
                        className={`px-2.5 py-2 rounded-xl text-xs font-bold text-left transition cursor-pointer flex items-center justify-between gap-1 ${
                          selected
                            ? 'glass-btn-primary text-white shadow-sm'
                            : 'glass-tile text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <span className="truncate">{isBn ? fmt.labelBn : fmt.labelEn}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* PPTX Layout Mode (when PPTX selected) */}
            {targetFormat === 'pptx' && (
              <div className="space-y-2 pt-2 border-t border-slate-900/8 dark:border-white/10">
                <label className="text-xs font-extrabold text-slate-800 dark:text-slate-100 block">
                  {isBn ? 'PowerPoint স্লাইড স্টাইল' : 'PowerPoint Slide Layout'}
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPptxMode('editable')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                      pptxMode === 'editable'
                        ? 'glass-btn-primary text-white'
                        : 'glass-tile text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {isBn ? 'এডিটযোগ্য লেখা ও টেবিল' : 'Editable Text & Tables'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPptxMode('hybrid')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                      pptxMode === 'hybrid'
                        ? 'glass-btn-primary text-white'
                        : 'glass-tile text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {isBn ? 'হুবহু ভিজ্যুয়াল স্লাইড' : 'Exact Visual Slides'}
                  </button>
                </div>
              </div>
            )}

            {/* PDF Output Settings (Zero-Broken-Font Controls) */}
            {needsPdfAppearance && (
              <div className="space-y-3 pt-2 border-t border-slate-900/8 dark:border-white/10">
                <div className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                  {isBn ? 'PDF পেইজ ও ফন্ট সেটিংস (ফন্ট ঠিক রাখতে)' : 'PDF Layout & Font Settings'}
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                      {isBn ? 'পেপার সাইজ' : 'Paper Size'}
                    </label>
                    <select
                      value={pdfOptions.pageSize}
                      onChange={(e) =>
                        setPdfOptions((p) => ({
                          ...p,
                          pageSize: e.target.value as PdfPageSizeId,
                        }))
                      }
                      className="w-full glass-input rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none"
                    >
                      <option value="a4">A4 (210×297 mm)</option>
                      <option value="letter">Letter (216×279 mm)</option>
                      <option value="legal">Legal (216×356 mm)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                      {isBn ? 'ওরিয়েন্টেশন' : 'Orientation'}
                    </label>
                    <select
                      value={pdfOptions.orientation}
                      onChange={(e) =>
                        setPdfOptions((p) => ({
                          ...p,
                          orientation: e.target.value as PdfOrientationId,
                        }))
                      }
                      className="w-full glass-input rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none"
                    >
                      <option value="portrait">{isBn ? 'পোর্ট্রেট (লম্বা)' : 'Portrait'}</option>
                      <option value="landscape">{isBn ? 'ল্যান্ডস্কেপ (আড়াআড়ি)' : 'Landscape'}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                    {isBn ? 'বাংলা ও ইংরেজি ইউনিকোড ফন্ট' : 'Unicode Bangla & English Font'}
                  </label>
                  <select
                    value={pdfOptions.banglaFont}
                    onChange={(e) =>
                      setPdfOptions((p) => ({
                        ...p,
                        banglaFont: e.target.value as BanglaFontId,
                      }))
                    }
                    className="w-full glass-input rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none"
                  >
                    {BANGLA_FONTS.map((f) => (
                      <option key={f.id} value={f.id}>
                        {isBn ? f.nameBn : f.nameEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex justify-between mb-1 tabular-nums">
                      <span>{isBn ? 'ফন্ট সাইজ' : 'Font Size'}</span>
                      <span>{fmtToolNum(pdfOptions.fontSizePx, lang)} px</span>
                    </label>
                    <input
                      type="range"
                      min={10}
                      max={20}
                      value={pdfOptions.fontSizePx}
                      onChange={(e) =>
                        setPdfOptions((p) => ({ ...p, fontSizePx: Number(e.target.value) }))
                      }
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex justify-between mb-1 tabular-nums">
                      <span>{isBn ? 'মার্জিন' : 'Margins'}</span>
                      <span>{fmtToolNum(pdfOptions.marginMm, lang)} mm</span>
                    </label>
                    <input
                      type="range"
                      min={8}
                      max={26}
                      value={pdfOptions.marginMm}
                      onChange={(e) =>
                        setPdfOptions((p) => ({ ...p, marginMm: Number(e.target.value) }))
                      }
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* OCR & Scanned Document Options */}
            {needsOcrControls && (
              <div className="space-y-2.5 pt-2 border-t border-slate-900/8 dark:border-white/10">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>
                      {mode === 'image-to-word'
                        ? isBn
                          ? 'স্পষ্ট লেখা ডিটেকশন (OCR)'
                          : 'Sharp OCR Text Detection'
                        : isBn
                        ? 'স্ক্যান করা PDF অটো OCR'
                        : 'Scanned PDF Auto-OCR'}
                    </span>
                  </span>
                </div>

                {mode !== 'image-to-word' && (
                  <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoOcrScannedPdf}
                      onChange={(e) => setAutoOcrScannedPdf(e.target.checked)}
                      className="rounded accent-blue-600"
                    />
                    <span>
                      {isBn
                        ? 'স্ক্যান করা / ছবি-ভিত্তিক PDF হলে স্বয়ংক্রিয়ভাবে OCR চালান'
                        : 'Automatically run OCR when a PDF page is scanned/image-only'}
                    </span>
                  </label>
                )}

                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { id: 'ben+eng', bn: 'বাংলা + English', en: 'Bangla + Eng' },
                      { id: 'eng', bn: 'শুধু English', en: 'English Only' },
                      { id: 'ben', bn: 'শুধু বাংলা', en: 'Bangla Only' },
                    ] as { id: OcrLangMode; bn: string; en: string }[]
                  ).map((lOpt) => (
                    <button
                      key={lOpt.id}
                      type="button"
                      onClick={() => setOcrOptions((o) => ({ ...o, lang: lOpt.id }))}
                      className={`px-2 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer ${
                        ocrOptions.lang === lOpt.id
                          ? 'glass-btn-primary text-white'
                          : 'glass-tile text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {isBn ? lOpt.bn : lOpt.en}
                    </button>
                  ))}
                </div>

                {mode === 'image-to-word' && (
                  <div className="space-y-1.5 pt-1 text-xs text-slate-700 dark:text-slate-200">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ocrOptions.enhanceSharpness}
                        onChange={(e) =>
                          setOcrOptions((o) => ({ ...o, enhanceSharpness: e.target.checked }))
                        }
                        className="rounded accent-blue-600"
                      />
                      <span>
                        {isBn
                          ? 'কনট্রাস্ট বাড়ান ও অস্পষ্ট লেখা তীক্ষ্ণ (Sharpen) করুন'
                          : 'Auto-contrast & sharpen blurred text edges'}
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ocrOptions.upscale2x}
                        onChange={(e) =>
                          setOcrOptions((o) => ({ ...o, upscale2x: e.target.checked }))
                        }
                        className="rounded accent-blue-600"
                      />
                      <span>
                        {isBn
                          ? 'ছোট লেখার জন্য ২× হাই-রেজোলিউশন আপস্কেল'
                          : '2× high-resolution upscale for small fonts'}
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ocrOptions.adaptiveThreshold}
                        onChange={(e) =>
                          setOcrOptions((o) => ({ ...o, adaptiveThreshold: e.target.checked }))
                        }
                        className="rounded accent-blue-600"
                      />
                      <span>
                        {isBn
                          ? 'ছায়া দূর করে সাদা কাগজে কালো লেখা পরিষ্কার করুন'
                          : 'Remove shadows (clean black-on-white thresholding)'}
                      </span>
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                type="button"
                disabled={files.length === 0 || isProcessing}
                onClick={() => void runConversion(false)}
                className="flex-1 glass-btn-primary px-4 py-2.5 rounded-xl text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                <span>
                  {isProcessing
                    ? isBn
                      ? 'প্রসেস হচ্ছে...'
                      : 'Converting...'
                    : isBn
                    ? `কনভার্ট করুন (${targetFormat.toUpperCase()})`
                    : `Convert to ${targetFormat.toUpperCase()}`}
                </span>
              </button>

              <button
                type="button"
                disabled={files.length === 0 || isProcessing}
                onClick={() => void runConversion(true)}
                className="glass-tile px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title={isBn ? 'ডাউনলোডের আগে প্রিভিউ ও এডিট করুন' : 'Inspect & edit text before export'}
              >
                <Eye className="w-4 h-4" />
                <span>{isBn ? 'প্রিভিউ' : 'Inspect'}</span>
              </button>
            </div>

            {/* Live Progress Bar */}
            {(isProcessing || isCachingOcr) && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300 tabular-nums">
                  <span className="truncate">{progressLabel || (isBn ? 'কাজ চলছে...' : 'Working...')}</span>
                  <span>{fmtToolNum(progressPct, lang)}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-900/10 dark:bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-blue-600 dark:bg-blue-400 transition-all duration-150"
                    style={{ width: `${Math.max(6, progressPct)}%` }}
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-300 dark:border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-700 dark:text-red-300">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Right: Live Inspection, Editable OCR/Document Preview & Export */}
        <div className="lg:col-span-7 space-y-4">
          {activePayload ? (
            <div className="glass-panel rounded-2xl p-4 sm:p-5 space-y-4">
              {/* Top File Selector (when batch has > 1 file) & Quick Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-900/8 dark:border-white/10">
                <div className="flex flex-wrap items-center gap-1.5">
                  {payloads.length > 1 ? (
                    payloads.map((p, idx) => (
                      <button
                        key={`${p.sourceName}-${idx}`}
                        type="button"
                        onClick={() => {
                          setActivePreviewIdx(idx);
                          setActiveSheetIdx(0);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer truncate max-w-[160px] ${
                          idx === activePreviewIdx
                            ? 'glass-btn-primary text-white'
                            : 'glass-tile text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        {p.sourceName}
                      </button>
                    ))
                  ) : (
                    <div className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      {activePayload.sourceKind === 'image' ? (
                        <ImageIcon className="w-4 h-4 text-blue-600" />
                      ) : activePayload.sourceKind === 'xlsx' ||
                        activePayload.sourceKind === 'csv' ? (
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      ) : activePayload.sourceKind === 'pptx' ? (
                        <Presentation className="w-4 h-4 text-amber-600" />
                      ) : (
                        <FileText className="w-4 h-4 text-blue-600" />
                      )}
                      <span className="truncate max-w-[260px]">{activePayload.sourceName}</span>
                      {typeof activePayload.detectedOcrConfidence === 'number' && (
                        <span className="text-[11px] font-mono tabular-nums text-emerald-700 dark:text-emerald-300">
                          · {isBn ? 'নির্ভুলতা' : 'Accuracy'} {fmtToolNum(activePayload.detectedOcrConfidence, lang)}%
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => void handleCopyPreviewText()}
                    className="glass-tile px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedText ? (isBn ? 'কপি হয়েছে' : 'Copied') : isBn ? 'কপি' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Image Comparison Strip for Image-to-Word OCR */}
              {activePayload.enhancedPreviewUrl && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activePayload.originalPreviewUrl && (
                    <div className="space-y-1">
                      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        {isBn ? 'মূল ছবি' : 'Original Image'}
                      </div>
                      <div className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 p-1.5 h-44 flex items-center justify-center overflow-hidden">
                        <img
                          src={activePayload.originalPreviewUrl}
                          alt="Original"
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                    </div>
                  )}
                  <div className="space-y-1">
                    <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                      {isBn ? 'তীক্ষ্ণকৃত OCR প্রসেস ছবি' : 'Sharpened OCR Input'}
                    </div>
                    <div className="rounded-xl border border-blue-300/70 dark:border-blue-500/30 bg-white p-1.5 h-44 flex items-center justify-center overflow-hidden">
                      <img
                        src={activePayload.enhancedPreviewUrl}
                        alt="Sharpened OCR"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Spreadsheet Multi-Sheet Preview */}
              {activePayload.sheets && activePayload.sheets.length > 0 && (
                <div className="space-y-2">
                  {activePayload.sheets.length > 1 && (
                    <div className="flex flex-wrap gap-1">
                      {activePayload.sheets.map((sh, sIdx) => (
                        <button
                          key={`${sh.name}-${sIdx}`}
                          type="button"
                          onClick={() => setActiveSheetIdx(sIdx)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                            sIdx === activeSheetIdx
                              ? 'glass-btn-primary text-white'
                              : 'glass-tile text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {sh.name}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="max-h-60 overflow-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                    <table className="w-full text-xs border-collapse tabular-nums">
                      <tbody>
                        {(activePayload.sheets[activeSheetIdx]?.rows || [])
                          .slice(0, 40)
                          .map((row, rIdx) => (
                            <tr
                              key={rIdx}
                              className={
                                rIdx === 0
                                  ? 'bg-slate-100 dark:bg-slate-800 font-bold'
                                  : 'border-t border-slate-200/80 dark:border-slate-800'
                              }
                            >
                              {row.slice(0, 12).map((cell, cIdx) => (
                                <td
                                  key={cIdx}
                                  className="px-2.5 py-1.5 border-r border-slate-200/60 dark:border-slate-800 text-slate-800 dark:text-slate-200 whitespace-nowrap"
                                >
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Editable Extracted Text Area (Syncs directly to DOCX/DOC/PDF export!) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-extrabold text-slate-800 dark:text-slate-100">
                    {isBn
                      ? 'এডিটযোগ্য লেখা প্রিভিউ (প্রয়োজনে এখানে ঠিক করে ডাউনলোড করুন)'
                      : 'Editable Extracted Text (Edit before saving Word / PDF)'}
                  </label>
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                    {fmtToolNum(activePayload.plainText.length, lang)}{' '}
                    {isBn ? 'অক্ষর' : 'chars'}
                  </span>
                </div>
                <textarea
                  value={activePayload.plainText}
                  onChange={(e) => handleUpdateActivePlainText(e.target.value)}
                  rows={8}
                  className="w-full glass-input rounded-xl p-3 text-xs sm:text-sm leading-relaxed text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                  style={{
                    fontFamily: `'SolaimanLipi', 'Noto Sans Bengali', 'Plus Jakarta Sans', sans-serif`,
                  }}
                />
              </div>

              {/* Instant Direct Export Pills from Edited Preview */}
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-900/8 dark:border-white/10">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mr-1">
                  {isBn ? 'সরাসরি সেভ:' : 'Quick Save:'}
                </span>
                {(['docx', 'doc', 'pdf', 'pptx', 'xlsx', 'txt'] as OutputFormat[]).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    disabled={isProcessing}
                    onClick={() => void handleExportEditedPreview(fmt)}
                    className="glass-tile px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>.{fmt.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="glass-panel rounded-2xl p-6 sm:p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/12 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                {isBn
                  ? 'ডকুমেন্ট প্রিভিউ ও এডিট এরিয়া'
                  : 'Document Preview & Editable Inspector'}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
                {isBn
                  ? 'বাম পাশ থেকে ফাইল বাছাই করে "কনভার্ট করুন" অথবা "প্রিভিউ" চাপুন। এখানে আপনি বাংলা ও ইংরেজি ফন্টসহ লেখা যাচাই ও এডিট করে DOCX, DOC, PPTX, XLSX বা PDF হিসেবে সেভ করতে পারবেন।'
                  : 'Select file(s) on the left and click Convert or Inspect. You can verify tables, preview sharpened OCR scans, edit text directly, and export to DOCX, DOC, PPTX, XLSX, CSV, or PDF.'}
              </p>
              <div className="pt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <span>PDF ↔ Word (.docx / .doc)</span>
                <span aria-hidden="true">·</span>
                <span>PDF ↔ PowerPoint (.pptx)</span>
                <span aria-hidden="true">·</span>
                <span>PDF ↔ Excel (.xlsx / .csv)</span>
                <span aria-hidden="true">·</span>
                <span>{isBn ? 'ছবি → ওয়ার্ড (বাংলা+English OCR)' : 'Image → Word OCR'}</span>
              </div>
            </div>
          )}

          <ProcessedResultsList
            lang={lang}
            results={results}
            zipFileName={`NextStudio_Converted_${
              files[0] ? getBaseName(files[0].file.name).slice(0, 24) : 'Files'
            }.zip`}
            onClear={() => setResults([])}
            title={isBn ? 'কনভার্ট সম্পন্ন হয়েছে' : 'Converted Files Ready'}
          />
        </div>
      </div>
    </div>
  );
};
