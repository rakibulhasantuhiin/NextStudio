import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  ClipboardList,
  Copy,
  Download,
  Eye,
  FileCode2,
  FileSpreadsheet,
  FileText,
  Globe,
  HardDriveDownload,
  Image as ImageIcon,
  Languages,
  Loader2,
  PenTool,
  Plus,
  RefreshCw,
  Smartphone,
  Sparkles,
  Trash2,
  Upload,
  WifiOff,
} from 'lucide-react';
import {
  BanglaFormField,
  BanglaOcrDocumentResult,
  BanglaOcrExportFormat,
  BanglaOcrPresetId,
  OcrEnginePreference,
  checkBanglaOcrServerAvailability,
  computeScriptStats,
  exportBanglaOcrResultToFormat,
  getPdfPageCountForOcr,
  recognizeDocumentWithBanglaOcr,
} from '../../utils/banglaOcr';
import {
  OcrLangMode,
  PdfRenderOptions,
  getCachedOcrLangs,
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

interface BanglaOcrStudioProps {
  lang?: ToolsLang;
  onBack: () => void;
}

interface PresetMeta {
  id: BanglaOcrPresetId;
  titleEn: string;
  titleBn: string;
  descEn: string;
  descBn: string;
  accept: string;
  fileKind: 'image' | 'pdf';
  defaultExport: BanglaOcrExportFormat;
  defaultLangMode: OcrLangMode;
  icon: React.ReactNode;
}

const PRESET_LIST: PresetMeta[] = [
  {
    id: 'all-ocr',
    titleEn: 'Bengali OCR (Online + Offline)',
    titleBn: 'বাংলা OCR (অনলাইন ও অফলাইন)',
    descEn: 'Convert printed or handwritten Bangla images, scans & PDFs to editable text.',
    descBn: 'ছাপা বা হাতে লেখা বাংলা ছবি, স্ক্যান ও PDF থেকে এডিটযোগ্য লেখা বের করুন।',
    accept: 'image/jpeg,image/png,image/webp,image/bmp,application/pdf,.jpg,.jpeg,.png,.webp,.bmp,.pdf',
    fileKind: 'image',
    defaultExport: 'docx',
    defaultLangMode: 'ben+eng',
    icon: <Globe className="w-4 h-4" />,
  },
  {
    id: 'image-to-text',
    titleEn: 'Bangla Image to Text',
    titleBn: 'বাংলা ছবি থেকে টেক্সট',
    descEn: 'Convert JPG, PNG or WebP images of Bangla documents into crisp Unicode text.',
    descBn: 'JPG, PNG বা WebP ডকুমেন্ট ছবি থেকে স্পষ্ট ইউনিকোড বাংলা টেক্সট বের করুন।',
    accept: 'image/jpeg,image/png,image/webp,image/bmp,.jpg,.jpeg,.png,.webp,.bmp',
    fileKind: 'image',
    defaultExport: 'txt',
    defaultLangMode: 'ben+eng',
    icon: <ImageIcon className="w-4 h-4" />,
  },
  {
    id: 'photo-to-text',
    titleEn: 'JPG / Phone Photo to Bangla',
    titleBn: 'ফোন বা WhatsApp ছবি থেকে বাংলা',
    descEn: 'Phone camera photos, screenshots & WhatsApp/Facebook images to Bangla text.',
    descBn: 'মোবাইল ক্যামেরা, স্ক্রিনশট বা WhatsApp/Facebook-এর ছবি থেকে বাংলা লেখা।',
    accept: 'image/jpeg,image/png,image/webp,image/bmp,.jpg,.jpeg,.png,.webp,.bmp',
    fileKind: 'image',
    defaultExport: 'docx',
    defaultLangMode: 'ben+eng',
    icon: <Smartphone className="w-4 h-4" />,
  },
  {
    id: 'handwriting',
    titleEn: 'Bangla Handwriting to Text',
    titleBn: 'বাংলা হাতের লেখা থেকে টেক্সট',
    descEn: 'Reads handwritten Bangla notes, letters & entries while keeping ০১২৩ numerals.',
    descBn: 'হাতের লেখা বাংলা নোট, চিঠি ও বাংলা সংখ্যা (০১২৩) হুবহু টেক্সটে রূপান্তর করে।',
    accept: 'image/jpeg,image/png,image/webp,image/bmp,application/pdf,.jpg,.jpeg,.png,.webp,.bmp,.pdf',
    fileKind: 'image',
    defaultExport: 'docx',
    defaultLangMode: 'ben',
    icon: <PenTool className="w-4 h-4" />,
  },
  {
    id: 'pdf-to-text',
    titleEn: 'Bangla PDF to Text',
    titleBn: 'বাংলা PDF থেকে টেক্সট',
    descEn: 'Pick PDF pages, adjust sharpness & convert scanned Bangla PDF to searchable text.',
    descBn: 'PDF-এর নির্দিষ্ট পাতা বাছাই করে স্ক্যান করা বাংলা PDF থেকে এডিটেবল টেক্সট।',
    accept: 'application/pdf,.pdf',
    fileKind: 'pdf',
    defaultExport: 'txt',
    defaultLangMode: 'ben+eng',
    icon: <FileText className="w-4 h-4" />,
  },
  {
    id: 'pdf-to-word',
    titleEn: 'Bangla PDF to Word',
    titleBn: 'বাংলা PDF থেকে Word (.docx)',
    descEn: 'Get an editable Word (.docx/.doc) file with proper Unicode Bangla — no broken fonts.',
    descBn: 'যুক্তাক্ষর ও ফন্ট না ভেঙে স্ক্যান করা বাংলা PDF থেকে সরাসরি Word ফাইল।',
    accept: 'application/pdf,.pdf',
    fileKind: 'pdf',
    defaultExport: 'docx',
    defaultLangMode: 'ben+eng',
    icon: <FileSpreadsheet className="w-4 h-4" />,
  },
  {
    id: 'mixed-bn-en',
    titleEn: 'Mixed Bangla-English OCR',
    titleBn: 'মিশ্র বাংলা-ইংরেজি OCR',
    descEn: 'Single-pass reading for mixed Bangla & English scripts plus both numeral systems.',
    descBn: 'একসাথে বাংলা ও ইংরেজি লেখা এবং উভয় সংখ্যা পদ্ধতি অক্ষুণ্ণ রেখে টেক্সট বের করুন।',
    accept: 'image/jpeg,image/png,image/webp,image/bmp,application/pdf,.jpg,.jpeg,.png,.webp,.bmp,.pdf',
    fileKind: 'image',
    defaultExport: 'docx',
    defaultLangMode: 'ben+eng',
    icon: <Languages className="w-4 h-4" />,
  },
  {
    id: 'form-ocr',
    titleEn: 'Bangla Form OCR',
    titleBn: 'বাংলা ফরম OCR (তথ্য বের করা)',
    descEn: 'Extract printed form labels and handwritten entries into editable fields & JSON.',
    descBn: 'পূরণ করা ফরমের ছাপা হেডিং ও হাতের লেখা আলাদা ফিল্ড ও JSON-এ রূপান্তর করুন।',
    accept: 'image/jpeg,image/png,image/webp,image/bmp,application/pdf,.jpg,.jpeg,.png,.webp,.bmp,.pdf',
    fileKind: 'image',
    defaultExport: 'json',
    defaultLangMode: 'ben+eng',
    icon: <ClipboardList className="w-4 h-4" />,
  },
  {
    id: 'export-suite',
    titleEn: 'Export Word, PDF & JSON',
    titleBn: 'Word, PDF ও JSON এক্সপোর্ট',
    descEn: 'Copy text or export batches as Word (.docx/.doc), TXT, JSON, HTML or PDF ZIP.',
    descBn: 'লেখা কপি করুন অথবা Word, TXT, JSON, HTML ও প্রিন্টযোগ্য PDF/ZIP-এ নামান।',
    accept: 'image/jpeg,image/png,image/webp,image/bmp,application/pdf,.jpg,.jpeg,.png,.webp,.bmp,.pdf',
    fileKind: 'image',
    defaultExport: 'json',
    defaultLangMode: 'ben+eng',
    icon: <Upload className="w-4 h-4" />,
  },
];

const EXPORT_BUTTONS: { id: BanglaOcrExportFormat; label: string; extLabel: string }[] = [
  { id: 'docx', label: 'Word (.docx)', extLabel: 'DOCX' },
  { id: 'doc', label: 'Word (.doc)', extLabel: 'DOC' },
  { id: 'pdf', label: 'Unicode PDF', extLabel: 'PDF' },
  { id: 'json', label: 'JSON Data', extLabel: 'JSON' },
  { id: 'txt', label: 'Plain Text', extLabel: 'TXT' },
  { id: 'html', label: 'Web HTML', extLabel: 'HTML' },
];

export const BanglaOcrStudio: React.FC<BanglaOcrStudioProps> = ({
  lang = 'en',
  onBack,
}) => {
  const isBn = lang === 'bn';

  const [preset, setPreset] = useState<BanglaOcrPresetId>('all-ocr');
  const [enginePref, setEnginePref] = useState<OcrEnginePreference>('auto-hybrid');
  const [langMode, setLangMode] = useState<OcrLangMode>('ben+eng');
  const [batchExportFormat, setBatchExportFormat] = useState<BanglaOcrExportFormat>('docx');

  // Online / Offline connectivity & offline OCR cache state
  const [browserOnline, setBrowserOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [geminiConfigured, setGeminiConfigured] = useState<boolean>(false);
  const [cachedOcrLangs, setCachedOcrLangs] = useState<string[]>(() => getCachedOcrLangs());
  const [isCachingOcr, setIsCachingOcr] = useState(false);
  const [cacheMessage, setCacheMessage] = useState<string | null>(null);

  // Files & PDF options
  const [files, setFiles] = useState<SelectedFileItem[]>([]);
  const [pdfPageRange, setPdfPageRange] = useState('all');
  const [pdfDpiScale, setPdfDpiScale] = useState(2.4);
  const [preferDigitalPdfText, setPreferDigitalPdfText] = useState(true);

  // Image clarity options
  const [enhanceSharpness, setEnhanceSharpness] = useState(true);
  const [upscale2x, setUpscale2x] = useState(true);
  const [adaptiveThreshold, setAdaptiveThreshold] = useState(true);

  // PDF Unicode export font options
  const [pdfFont, setPdfFont] = useState<BanglaFontId>(DEFAULT_BANGLA_FONT);

  // Results & editor states
  const [ocrResults, setOcrResults] = useState<BanglaOcrDocumentResult[]>([]);
  const [activeResultIdx, setActiveResultIdx] = useState(0);
  const [activePageIdx, setActivePageIdx] = useState(0);
  const [batchFiles, setBatchFiles] = useState<ProcessedFileResult[]>([]);
  const [copiedText, setCopiedText] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const syncAvailability = async () => {
      const info = await checkBanglaOcrServerAvailability();
      setBrowserOnline(info.browserOnline);
      setGeminiConfigured(info.geminiConfigured);
    };
    void syncAvailability();

    const onOnline = () => {
      setBrowserOnline(true);
      void syncAvailability();
    };
    const onOffline = () => {
      setBrowserOnline(false);
      setGeminiConfigured(false);
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const activePresetMeta = useMemo(
    () => PRESET_LIST.find((p) => p.id === preset) || PRESET_LIST[0],
    [preset]
  );

  const hasPdfQueued = useMemo(
    () =>
      files.some(
        (f) =>
          f.file.name.toLowerCase().endsWith('.pdf') || f.file.type === 'application/pdf'
      ),
    [files]
  );

  const activeDoc = ocrResults[activeResultIdx] || null;
  const activePage = activeDoc?.pages[activePageIdx] || activeDoc?.pages[0] || null;

  const pdfRenderOptions: PdfRenderOptions = useMemo(
    () => ({
      pageSize: 'a4',
      orientation: 'portrait',
      banglaFont: pdfFont,
      fontSizePx: 14,
      marginMm: 16,
    }),
    [pdfFont]
  );

  const handleSelectPreset = (nextId: BanglaOcrPresetId) => {
    const meta = PRESET_LIST.find((p) => p.id === nextId) || PRESET_LIST[0];
    setPreset(nextId);
    setLangMode(meta.defaultLangMode);
    setBatchExportFormat(meta.defaultExport);
    if (nextId === 'handwriting' || nextId === 'photo-to-text') {
      setEnhanceSharpness(true);
      setUpscale2x(true);
    }
    if (nextId === 'handwriting' || nextId === 'form-ocr') {
      setPreferDigitalPdfText(false);
    } else if (nextId === 'pdf-to-text' || nextId === 'pdf-to-word') {
      setPreferDigitalPdfText(true);
    }
    setError(null);
  };

  const handleAddFiles = async (incoming: File[]) => {
    const items = createFileItems(incoming, 'image').map((item) => {
      const isPdf =
        item.file.name.toLowerCase().endsWith('.pdf') ||
        item.file.type === 'application/pdf';
      return {
        ...item,
        previewUrl: isPdf ? undefined : URL.createObjectURL(item.file),
        metaText: isPdf ? 'PDF' : 'IMAGE',
      };
    });

    setFiles((prev) => [...prev, ...items]);
    setError(null);

    // Enrich PDF page counts asynchronously
    for (const item of items) {
      if (item.metaText === 'PDF') {
        try {
          const count = await getPdfPageCountForOcr(item.file);
          setFiles((prev) =>
            prev.map((f) =>
              f.id === item.id
                ? {
                    ...f,
                    metaText: isBn
                      ? `PDF · ${fmtToolNum(count, lang)} পাতা`
                      : `PDF · ${count} pages`,
                  }
                : f
            )
          );
        } catch {
          // ignore corrupted metadata preview
        }
      }
    }
  };

  const handleCacheOfflineOcr = async () => {
    setIsCachingOcr(true);
    setCacheMessage(null);
    setError(null);
    try {
      await prewarmOfflineOcrPack('ben+eng', (pct, msg) => {
        setProgressPct(pct);
        setProgressLabel(msg);
      });
      setCachedOcrLangs(getCachedOcrLangs());
      setCacheMessage(
        isBn
          ? 'বাংলা ও ইংরেজি অফলাইন OCR প্যাক ব্রাউজারে সেভ হয়েছে — ইন্টারনেট ছাড়াই চলবে।'
          : 'Bangla & English offline OCR pack saved in browser — ready without internet.'
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isBn
          ? 'অফলাইন প্যাক সেভ করা যায়নি।'
          : 'Failed to cache offline OCR pack.'
      );
    } finally {
      setIsCachingOcr(false);
      setProgressPct(0);
      setProgressLabel('');
    }
  };

  const handleRunOcr = async (alsoExportBatch = false) => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setError(null);
    setProgressPct(0);
    setProgressLabel('');

    const nextResults: BanglaOcrDocumentResult[] = [];
    const nextBatchExports: ProcessedFileResult[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const item = files[i];
        const prefix = files.length > 1 ? `[${i + 1}/${files.length}] ` : '';

        const docResult = await recognizeDocumentWithBanglaOcr(
          item.file,
          {
            preset,
            enginePreference: enginePref,
            langMode,
            enhanceSharpness,
            upscale2x,
            adaptiveThreshold,
            pdfPageRange,
            pdfDpiScale,
            preferDigitalPdfText,
          },
          (pct, msg) => {
            const totalPct = alsoExportBatch
              ? Math.round(((i + pct / 100) / files.length) * 80)
              : Math.round(((i + pct / 100) / files.length) * 100);
            setProgressPct(totalPct);
            setProgressLabel(`${prefix}${msg}`);
          }
        );

        nextResults.push(docResult);

        if (alsoExportBatch) {
          setProgressPct(
            Math.min(98, 80 + Math.round(((i + 0.5) / files.length) * 18))
          );
          setProgressLabel(
            `${prefix}${
              isBn
                ? `${batchExportFormat.toUpperCase()} ফাইল তৈরি হচ্ছে...`
                : `Exporting ${batchExportFormat.toUpperCase()}...`
            }`
          );
          const { blob, ext } = await exportBanglaOcrResultToFormat(
            docResult,
            batchExportFormat,
            pdfRenderOptions
          );
          nextBatchExports.push({
            id: `${docResult.id}-${ext}`,
            name: `${getBaseName(item.file.name)}.${ext}`,
            originalName: item.file.name,
            blob,
            originalSize: item.file.size,
            infoText: `${docResult.engineUsed.toUpperCase()} · ${ext.toUpperCase()}`,
          });
        }
      }

      setOcrResults(nextResults);
      setActiveResultIdx(0);
      setActivePageIdx(0);
      setCachedOcrLangs(getCachedOcrLangs());
      if (alsoExportBatch) {
        setBatchFiles(nextBatchExports);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isBn
          ? 'বাংলা OCR প্রসেস করতে সমস্যা হয়েছে।'
          : 'Bangla OCR processing failed.'
      );
    } finally {
      setIsProcessing(false);
      setProgressPct(0);
      setProgressLabel('');
    }
  };

  const handleUpdateActiveText = (nextText: string) => {
    setOcrResults((prev) =>
      prev.map((doc, idx) => {
        if (idx !== activeResultIdx) return doc;
        const stats = computeScriptStats(nextText);
        return {
          ...doc,
          fullText: nextText,
          detectedScript: stats.detectedScript,
          banglaCharCount: stats.banglaCharCount,
          englishCharCount: stats.englishCharCount,
          banglaNumeralCount: stats.banglaNumeralCount,
          englishNumeralCount: stats.englishNumeralCount,
        };
      })
    );
  };

  const handleUpdateFormField = (
    fieldId: string,
    key: 'label' | 'value',
    nextVal: string
  ) => {
    setOcrResults((prev) =>
      prev.map((doc, idx) => {
        if (idx !== activeResultIdx) return doc;
        return {
          ...doc,
          formFields: doc.formFields.map((f) =>
            f.id === fieldId ? { ...f, [key]: nextVal } : f
          ),
        };
      })
    );
  };

  const handleAddFormField = () => {
    if (!activeDoc) return;
    const nextField: BanglaFormField = {
      id: `fld-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      label: isBn ? 'নতুন ফিল্ড' : 'New Field',
      value: '',
    };
    setOcrResults((prev) =>
      prev.map((doc, idx) =>
        idx === activeResultIdx
          ? { ...doc, formFields: [...doc.formFields, nextField] }
          : doc
      )
    );
  };

  const handleDeleteFormField = (fieldId: string) => {
    setOcrResults((prev) =>
      prev.map((doc, idx) =>
        idx === activeResultIdx
          ? { ...doc, formFields: doc.formFields.filter((f) => f.id !== fieldId) }
          : doc
      )
    );
  };

  const handleExportSingle = async (format: BanglaOcrExportFormat) => {
    if (!activeDoc) return;
    setIsProcessing(true);
    setError(null);
    try {
      const { blob, ext } = await exportBanglaOcrResultToFormat(
        activeDoc,
        format,
        pdfRenderOptions,
        (pct, msg) => {
          setProgressPct(pct);
          setProgressLabel(msg);
        }
      );
      downloadBlob(blob, `${getBaseName(activeDoc.sourceName)}.${ext}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isBn
          ? 'ফাইল এক্সপোর্ট করা যায়নি।'
          : 'Export failed.'
      );
    } finally {
      setIsProcessing(false);
      setProgressPct(0);
      setProgressLabel('');
    }
  };

  const handleBatchExportAllDocs = async (format: BanglaOcrExportFormat) => {
    if (ocrResults.length === 0) return;
    setIsProcessing(true);
    setError(null);
    try {
      const list: ProcessedFileResult[] = [];
      for (let i = 0; i < ocrResults.length; i++) {
        const doc = ocrResults[i];
        setProgressPct(Math.round(((i + 0.5) / ocrResults.length) * 100));
        setProgressLabel(
          isBn
            ? `${doc.sourceName} → ${format.toUpperCase()}...`
            : `Exporting ${doc.sourceName} → ${format.toUpperCase()}...`
        );
        const { blob, ext } = await exportBanglaOcrResultToFormat(
          doc,
          format,
          pdfRenderOptions
        );
        list.push({
          id: `${doc.id}-${ext}`,
          name: `${getBaseName(doc.sourceName)}.${ext}`,
          originalName: doc.sourceName,
          blob,
          originalSize: blob.size,
          infoText: `${doc.engineUsed.toUpperCase()} · ${ext.toUpperCase()}`,
        });
      }
      setBatchFiles(list);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isBn
          ? 'ব্যাচ এক্সপোর্ট করা যায়নি।'
          : 'Batch export failed.'
      );
    } finally {
      setIsProcessing(false);
      setProgressPct(0);
      setProgressLabel('');
    }
  };

  const handleCopyText = async () => {
    if (!activeDoc?.fullText) return;
    try {
      await navigator.clipboard.writeText(activeDoc.fullText);
      setCopiedText(true);
      window.setTimeout(() => setCopiedText(false), 1800);
    } catch {
      // Clipboard blocked in sandbox
    }
  };

  return (
    <div className="space-y-5">
      <ToolHeader
        title={
          isBn
            ? 'বাংলা ও বেঙ্গলি OCR স্টুডিও (ছবি, হাতের লেখা ও PDF)'
            : 'Free Bangla & Bengali OCR Studio (Images, Handwriting & PDF)'
        }
        subtitle={
          isBn
            ? 'অনলাইন AI ও অফলাইন ব্রাউজার OCR—দুইভাবেই ছাপা লেখা, ফোন/WhatsApp ছবি, হাতের লেখা, ফরম এবং বাংলা PDF থেকে যুক্তাক্ষর ও সংখ্যা (০১২৩) অক্ষুণ্ণ রেখে Word, PDF, TXT ও JSON-এ রূপান্তর করুন।'
            : 'Hybrid Online AI + Offline OCR — extract printed text, phone/WhatsApp photos, Bangla handwriting (keeping ০১২৩ numerals), filled forms & scanned PDFs into Word, PDF, TXT & JSON.'
        }
        categoryLabel={isBn ? 'সব টুলস' : 'All Tools'}
        onBack={onBack}
      />

      {/* Engine Mode + Online/Offline Readiness Strip */}
      <div className="glass-panel rounded-2xl p-3.5 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700 dark:text-slate-200">
          {browserOnline ? (
            <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          )}
          <span className="font-bold">
            {browserOnline
              ? geminiConfigured
                ? isBn
                  ? 'অনলাইন AI ও অফলাইন OCR দুটিই প্রস্তুত'
                  : 'Online AI & Offline OCR both ready'
                : isBn
                ? 'অনলাইন সংযুক্ত · অফলাইন OCR প্রস্তুত'
                : 'Connected · Offline Browser OCR ready'
              : isBn
              ? 'অফলাইন মোড চালু — ব্রাউজারে কাজ করবে'
              : 'Offline mode active — running locally in browser'}
          </span>
          <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
            ·
          </span>
          <span className="text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            {cachedOcrLangs.includes('ben+eng')
              ? isBn
                ? 'অফলাইন বাংলা+ইংরেজি প্যাক সেভ করা আছে'
                : 'Offline pack cached (ben+eng)'
              : isBn
              ? 'প্রথমবার অফলাইন প্যাক সেভ করে নিন'
              : 'Cache offline pack once for offline scans'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Hybrid / Offline / Online selector */}
          <div className="inline-flex items-center p-1 rounded-xl bg-slate-900/5 dark:bg-white/10">
            {(
              [
                { id: 'auto-hybrid', en: 'Auto Hybrid', bn: 'অটো হাইব্রিড' },
                { id: 'offline-local', en: 'Offline Only', bn: 'শুধু অফলাইন' },
                { id: 'online-ai', en: 'Online AI', bn: 'অনলাইন AI' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setEnginePref(opt.id)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
                  enginePref === opt.id
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {isBn ? opt.bn : opt.en}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void handleCacheOfflineOcr()}
            disabled={isCachingOcr || isProcessing}
            className="glass-tile px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-300 inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60 whitespace-nowrap"
          >
            {isCachingOcr ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <HardDriveDownload className="w-3.5 h-3.5" />
            )}
            <span>
              {cachedOcrLangs.includes('ben+eng')
                ? isBn
                  ? 'অফলাইন OCR আপডেট'
                  : 'Refresh Offline Pack'
                : isBn
                ? 'অফলাইন প্যাক সেভ করুন'
                : 'Cache Offline Pack'}
            </span>
          </button>
        </div>
      </div>

      {cacheMessage && (
        <div className="rounded-xl bg-emerald-500/12 border border-emerald-500/30 px-3.5 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{cacheMessage}</span>
        </div>
      )}

      {/* 9-Feature Preset Selector Grid (from user's feature list) */}
      <div className="glass-panel rounded-2xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
            {isBn
              ? '১. OCR কাজের ধরন বেছে নিন (৯টি বিশেষ মোড)'
              : '1. Choose Bangla OCR Mode (All 9 Capabilities)'}
          </h2>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {isBn ? activePresetMeta.descBn : activePresetMeta.descEn}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {PRESET_LIST.map((item) => {
            const active = preset === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectPreset(item.id)}
                className={`text-left rounded-xl p-3 border transition cursor-pointer flex items-start gap-2.5 ${
                  active
                    ? 'bg-blue-600/10 dark:bg-blue-500/20 border-blue-500/60 text-slate-900 dark:text-white'
                    : 'bg-white/55 dark:bg-white/5 border-slate-900/8 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:border-blue-400/50'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    active
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-900/6 dark:bg-white/10 text-blue-600 dark:text-blue-400'
                  }`}
                >
                  {item.icon}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-extrabold leading-snug truncate">
                    {isBn ? item.titleBn : item.titleEn}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                    {isBn ? item.descBn : item.descEn}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Upload + Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Upload Queue & PDF Page Picker */}
        <div className="lg:col-span-7 glass-panel rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
              {isBn ? '২. ছবি বা PDF ফাইল দিন' : '2. Upload Images or Scanned PDFs'}
            </h2>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              JPG · PNG · WebP · PDF
            </span>
          </div>

          <FileDropzone
            lang={lang}
            accept={activePresetMeta.accept}
            multiple
            title={
              isBn
                ? activePresetMeta.titleBn
                : activePresetMeta.titleEn
            }
            subtitle={
              isBn
                ? 'একসাথে এক বা একাধিক ছবি অথবা বাংলা PDF ফাইল ড্র্যাগ করে ছেড়ে দিন'
                : 'Drop one or multiple photos, screenshots, handwritten notes, or Bangla PDFs'
            }
            files={files}
            onAddFiles={(incoming) => void handleAddFiles(incoming)}
            onRemoveFile={(id) => setFiles((prev) => prev.filter((f) => f.id !== id))}
            onClearAll={() => {
              setFiles([]);
              setOcrResults([]);
              setBatchFiles([]);
            }}
            fileKind={activePresetMeta.fileKind}
          />

          {/* Contextual PDF Page Range & Quality Bar */}
          {(hasPdfQueued || preset === 'pdf-to-text' || preset === 'pdf-to-word') && (
            <div className="rounded-xl bg-slate-900/4 dark:bg-white/5 border border-slate-900/8 dark:border-white/10 p-3.5 space-y-3">
              <div className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                {isBn
                  ? 'PDF পাতা বাছাই ও স্ক্যান মান'
                  : 'PDF Page Picker & Scan Resolution'}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    {isBn
                      ? 'কোন পাতাগুলো পড়বেন (যেমন: all বা 1-3, 5)'
                      : 'Pages to convert (e.g. all, 1, 1-3, 5)'}
                  </label>
                  <input
                    type="text"
                    value={pdfPageRange}
                    onChange={(e) => setPdfPageRange(e.target.value)}
                    placeholder="all"
                    className="w-full rounded-xl px-3 py-2 text-xs font-mono bg-white/85 dark:bg-slate-900/80 border border-slate-300/80 dark:border-white/15 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    {isBn ? 'PDF রেন্ডার স্পষ্টতা' : 'PDF Render Clarity'}
                  </label>
                  <select
                    value={pdfDpiScale}
                    onChange={(e) => setPdfDpiScale(Number(e.target.value))}
                    className="w-full rounded-xl px-3 py-2 text-xs font-bold bg-white/85 dark:bg-slate-900/80 border border-slate-300/80 dark:border-white/15 text-slate-900 dark:text-white"
                  >
                    <option value={2}>
                      {isBn ? 'স্ট্যান্ডার্ড (দ্রুত)' : 'Standard (Fast · 2x)'}
                    </option>
                    <option value={2.4}>
                      {isBn ? 'হাই HD (প্রস্তাবিত)' : 'High HD (Recommended · 2.4x)'}
                    </option>
                    <option value={3}>
                      {isBn ? 'আলট্রা (ছোট লেখা / হাতের লেখা)' : 'Ultra Sharp (Small Text · 3x)'}
                    </option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferDigitalPdfText}
                  onChange={(e) => setPreferDigitalPdfText(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600"
                />
                <span>
                  {isBn
                    ? 'ডিজিটাল PDF হলে সরাসরি ইউনিকোড টেক্সট নিন (স্ক্যান বা হাতের লেখা হলে OCR চলবে)'
                    : 'Use embedded Unicode text when available (runs image OCR automatically on scans)'}
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Right: Recognition & Export Settings */}
        <div className="lg:col-span-5 glass-panel rounded-2xl p-4 sm:p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
              {isBn
                ? '৩. ভাষা, স্পষ্টতা ও এক্সপোর্ট সেটিংস'
                : '3. Script, Clarity & Export Options'}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  {isBn ? 'ভাষা ও সংখ্যা' : 'Script & Numerals'}
                </label>
                <select
                  value={langMode}
                  onChange={(e) => setLangMode(e.target.value as OcrLangMode)}
                  className="w-full rounded-xl px-3 py-2 text-xs font-bold bg-white/85 dark:bg-slate-900/80 border border-slate-300/80 dark:border-white/15 text-slate-900 dark:text-white"
                >
                  <option value="ben+eng">
                    {isBn ? 'বাংলা + ইংরেজি (মিশ্র)' : 'Bangla + English (Mixed)'}
                  </option>
                  <option value="ben">
                    {isBn ? 'শুধু বাংলা (০১২৩ সংখ্যা)' : 'Bangla Only (০১২৩ Numerals)'}
                  </option>
                  <option value="eng">
                    {isBn ? 'শুধু ইংরেজি' : 'English Only'}
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  {isBn ? 'ব্যাচ এক্সপোর্ট ফরম্যাট' : 'Batch Export Format'}
                </label>
                <select
                  value={batchExportFormat}
                  onChange={(e) =>
                    setBatchExportFormat(e.target.value as BanglaOcrExportFormat)
                  }
                  className="w-full rounded-xl px-3 py-2 text-xs font-bold bg-white/85 dark:bg-slate-900/80 border border-slate-300/80 dark:border-white/15 text-slate-900 dark:text-white"
                >
                  {EXPORT_BUTTONS.map((btn) => (
                    <option key={btn.id} value={btn.id}>
                      {btn.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                {isBn
                  ? 'PDF এক্সপোর্টের বাংলা ফন্ট (যুক্তাক্ষর ঠিক রাখতে)'
                  : 'Unicode Bangla Font for PDF Export'}
              </label>
              <select
                value={pdfFont}
                onChange={(e) => setPdfFont(e.target.value as BanglaFontId)}
                className="w-full rounded-xl px-3 py-2 text-xs font-bold bg-white/85 dark:bg-slate-900/80 border border-slate-300/80 dark:border-white/15 text-slate-900 dark:text-white"
              >
                {BANGLA_FONTS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {isBn ? f.nameBn : f.nameEn}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enhanceSharpness}
                  onChange={(e) => setEnhanceSharpness(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600"
                />
                <span>
                  {isBn
                    ? 'ছবির লেখা শার্প ও ছায়া পরিষ্কার করুন (ফোন ও WhatsApp ছবির জন্য)'
                    : 'Sharpen text & level shadows (best for phone/WhatsApp photos)'}
                </span>
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={upscale2x}
                  onChange={(e) => setUpscale2x(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600"
                />
                <span>
                  {isBn
                    ? 'ছোট বাংলা মাত্রা-যুক্তাক্ষর স্পষ্ট করতে ২× HD আপস্কেল'
                    : '2× HD upscale for small Bengali vowel signs & conjuncts'}
                </span>
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={adaptiveThreshold}
                  onChange={(e) => setAdaptiveThreshold(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600"
                />
                <span>
                  {isBn
                    ? 'অফলাইন OCR-এর জন্য সাদা-কালো কনট্রাস্ট ফিল্টার'
                    : 'Adaptive black-on-white contrast filter for offline OCR'}
                </span>
              </label>
            </div>
          </div>

          {/* Primary Actions */}
          <div className="space-y-2.5 pt-3 border-t border-slate-900/8 dark:border-white/10">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={files.length === 0 || isProcessing}
                onClick={() => void handleRunOcr(false)}
                className="glass-tile px-4 py-2.5 rounded-xl text-xs font-extrabold text-slate-800 dark:text-white flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                )}
                <span>
                  {isBn ? 'টেক্সট বের করুন (প্রিভিউ)' : 'Extract Text & Preview'}
                </span>
              </button>

              <button
                type="button"
                disabled={files.length === 0 || isProcessing}
                onClick={() => void handleRunOcr(true)}
                className="glass-btn-primary px-4 py-2.5 rounded-xl text-white text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>
                  {isBn
                    ? `বের করে ${batchExportFormat.toUpperCase()} বানান`
                    : `Extract & Export ${batchExportFormat.toUpperCase()}`}
                </span>
              </button>
            </div>

            {isProcessing && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-600 dark:text-slate-300 tabular-nums">
                  <span className="truncate pr-2">
                    {progressLabel || (isBn ? 'প্রসেস হচ্ছে...' : 'Processing...')}
                  </span>
                  <span>{fmtToolNum(progressPct, lang)}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-900/10 dark:bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-150"
                    style={{ width: `${Math.max(4, progressPct)}%` }}
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-xl bg-red-500/12 border border-red-500/30 px-3 py-2 text-xs font-semibold text-red-700 dark:text-red-300">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Live Extracted Results, Image Comparison, Form Fields Table & Editable Text */}
      {activeDoc && (
        <div className="glass-panel rounded-2xl p-4 sm:p-5 space-y-4">
          {/* Document Tabs if multiple files */}
          {ocrResults.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {ocrResults.map((doc, idx) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => {
                    setActiveResultIdx(idx);
                    setActivePageIdx(0);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer ${
                    idx === activeResultIdx
                      ? 'bg-blue-600 text-white'
                      : 'glass-tile text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {doc.sourceName}
                </button>
              ))}
            </div>
          )}

          {/* Header & Copy / Export Strip */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-900/8 dark:border-white/10">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                {activeDoc.sourceName}
              </h3>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span>
                  {activeDoc.engineUsed === 'online-ai'
                    ? isBn
                      ? 'ইঞ্জিন: অনলাইন AI ভিশন'
                      : 'Engine: Online AI Vision'
                    : activeDoc.engineUsed === 'offline-ocr'
                    ? isBn
                      ? 'ইঞ্জিন: অফলাইন ব্রাউজার OCR'
                      : 'Engine: Offline Browser OCR'
                    : isBn
                    ? 'ইঞ্জিন: হাইব্রিড'
                    : 'Engine: Hybrid'}
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  {isBn
                    ? `বাংলা বর্ণ: ${fmtToolNum(activeDoc.banglaCharCount, lang)}`
                    : `Bangla chars: ${activeDoc.banglaCharCount}`}
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  {isBn
                    ? `বাংলা সংখ্যা (০-৯): ${fmtToolNum(activeDoc.banglaNumeralCount, lang)}`
                    : `Bangla digits: ${activeDoc.banglaNumeralCount}`}
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  {isBn
                    ? `ইংরেজি বর্ণ: ${fmtToolNum(activeDoc.englishCharCount, lang)}`
                    : `English chars: ${activeDoc.englishCharCount}`}
                </span>
                {typeof activeDoc.avgConfidence === 'number' && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>
                      {isBn
                        ? `স্পষ্টতা: ${fmtToolNum(activeDoc.avgConfidence, lang)}%`
                        : `Confidence: ${activeDoc.avgConfidence}%`}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => void handleCopyText()}
                className="glass-tile px-3 py-1.5 rounded-xl text-xs font-bold text-slate-800 dark:text-white inline-flex items-center gap-1.5 cursor-pointer"
              >
                {copiedText ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>
                  {copiedText
                    ? isBn
                      ? 'কপি হয়েছে'
                      : 'Copied'
                    : isBn
                    ? 'টেক্সট কপি'
                    : 'Copy Text'}
                </span>
              </button>

              {EXPORT_BUTTONS.map((btn) => (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => void handleExportSingle(btn.id)}
                  disabled={isProcessing}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50 ${
                    btn.id === batchExportFormat
                      ? 'glass-btn-primary text-white'
                      : 'glass-tile text-slate-800 dark:text-slate-100'
                  }`}
                >
                  <Download className="w-3 h-3" />
                  <span>{btn.extLabel}</span>
                </button>
              ))}
            </div>
          </div>

          {activeDoc.fallbackNotice && (
            <div className="rounded-xl bg-amber-500/12 border border-amber-500/30 px-3 py-2 text-xs font-medium text-amber-800 dark:text-amber-300">
              {activeDoc.fallbackNotice}
            </div>
          )}

          {/* Side-by-side Preview & Editable Text */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Visual Original vs Enhanced Preview */}
            {activePage && (activePage.originalPreviewUrl || activePage.enhancedPreviewUrl) && (
              <div className="lg:col-span-5 space-y-2.5">
                {activeDoc.pages.length > 1 && (
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200">
                    <span>
                      {isBn
                        ? `পাতা ${fmtToolNum(activePage.pageNumber, lang)} / ${fmtToolNum(
                            activeDoc.pages.length,
                            lang
                          )}`
                        : `Page ${activePage.pageNumber} of ${activeDoc.pages.length}`}
                    </span>
                    <div className="flex items-center gap-1">
                      {activeDoc.pages.map((p, idx) => (
                        <button
                          key={p.pageNumber}
                          type="button"
                          onClick={() => setActivePageIdx(idx)}
                          className={`px-2 py-1 rounded-lg text-[11px] font-mono tabular-nums cursor-pointer ${
                            idx === activePageIdx
                              ? 'bg-blue-600 text-white'
                              : 'glass-tile text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {fmtToolNum(p.pageNumber, lang)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {activePage.originalPreviewUrl && (
                    <div className="rounded-xl border border-slate-900/10 dark:border-white/10 p-2 bg-white/70 dark:bg-slate-900/50">
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                        {isBn ? 'মূল ছবি / পাতা' : 'Original'}
                      </div>
                      <img
                        src={activePage.originalPreviewUrl}
                        alt="Original scan"
                        className="w-full max-h-64 object-contain rounded-lg bg-white"
                      />
                    </div>
                  )}
                  {activePage.enhancedPreviewUrl && (
                    <div className="rounded-xl border border-slate-900/10 dark:border-white/10 p-2 bg-white/70 dark:bg-slate-900/50">
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                        {isBn ? 'শার্প করা প্রিভিউ' : 'OCR Enhanced'}
                      </div>
                      <img
                        src={activePage.enhancedPreviewUrl}
                        alt="Sharpened preview"
                        className="w-full max-h-64 object-contain rounded-lg bg-white"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Editable Text Area */}
            <div
              className={
                activePage && (activePage.originalPreviewUrl || activePage.enhancedPreviewUrl)
                  ? 'lg:col-span-7 space-y-2'
                  : 'lg:col-span-12 space-y-2'
              }
            >
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200">
                <span>
                  {isBn
                    ? 'শনাক্ত করা বাংলা ও ইংরেজি লেখা (এখানেই এডিট করতে পারবেন)'
                    : 'Extracted Unicode Text (Editable before Word / PDF / JSON export)'}
                </span>
                {ocrResults.length > 1 && (
                  <button
                    type="button"
                    onClick={() => void handleBatchExportAllDocs(batchExportFormat)}
                    className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>
                      {isBn
                        ? `সব ফাইল ${batchExportFormat.toUpperCase()} ZIP বানান`
                        : `Build Batch ${batchExportFormat.toUpperCase()} ZIP`}
                    </span>
                  </button>
                )}
              </div>

              <textarea
                value={activeDoc.fullText}
                onChange={(e) => handleUpdateActiveText(e.target.value)}
                rows={12}
                placeholder={
                  isBn
                    ? 'কোনো লেখা পাওয়া যায়নি — ছবি পরিষ্কার করে আবার চেষ্টা করুন।'
                    : 'No text detected — try enabling sharpness enhancement or switching engine.'
                }
                className="w-full rounded-xl p-3.5 text-sm leading-relaxed bg-white/90 dark:bg-slate-950/75 border border-slate-300/80 dark:border-white/15 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Structured Form Fields Editor (Bangla Form OCR + JSON Export) */}
          {(preset === 'form-ocr' ||
            preset === 'export-suite' ||
            activeDoc.formFields.length > 0) && (
            <div className="pt-3 border-t border-slate-900/8 dark:border-white/10 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <FileCode2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>
                      {isBn
                        ? `ফরম ফিল্ড ও JSON ডেটা (${fmtToolNum(
                            activeDoc.formFields.length,
                            lang
                          )}টি ফিল্ড)`
                        : `Structured Form Fields & JSON Data (${activeDoc.formFields.length} fields)`}
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isBn
                      ? 'ফিল্ডের নাম ও তথ্য এডিট করুন — JSON, Word ও PDF এক্সপোর্টে স্বয়ংক্রিয়ভাবে যুক্ত হবে।'
                      : 'Edit extracted label-value pairs — automatically included in JSON, Word, and PDF exports.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddFormField}
                  className="glass-tile px-3 py-1.5 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isBn ? 'ফিল্ড যোগ করুন' : 'Add Field'}</span>
                </button>
              </div>

              {activeDoc.formFields.length === 0 ? (
                <div className="text-xs text-slate-500 dark:text-slate-400 py-2">
                  {isBn
                    ? 'কোনো আলাদা ফরম ফিল্ড পাওয়া যায়নি। চাইলে "+ ফিল্ড যোগ করুন" দিয়ে যুক্ত করতে পারেন।'
                    : 'No structured label-value pairs detected yet. You can add custom fields manually.'}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {activeDoc.formFields.map((field) => (
                    <div
                      key={field.id}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                    >
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) =>
                          handleUpdateFormField(field.id, 'label', e.target.value)
                        }
                        placeholder={isBn ? 'ফিল্ডের নাম' : 'Label'}
                        className="sm:col-span-4 rounded-xl px-3 py-1.5 text-xs font-bold bg-white/85 dark:bg-slate-900/80 border border-slate-300/70 dark:border-white/15 text-slate-900 dark:text-white"
                      />
                      <input
                        type="text"
                        value={field.value}
                        onChange={(e) =>
                          handleUpdateFormField(field.id, 'value', e.target.value)
                        }
                        placeholder={isBn ? 'তথ্য / মান' : 'Value'}
                        className="sm:col-span-7 rounded-xl px-3 py-1.5 text-xs bg-white/85 dark:bg-slate-900/80 border border-slate-300/70 dark:border-white/15 text-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleDeleteFormField(field.id)}
                        className="sm:col-span-1 p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 justify-self-end cursor-pointer"
                        title={isBn ? 'মুছুন' : 'Delete field'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Batch ZIP Downloads */}
      <ProcessedResultsList
        lang={lang}
        results={batchFiles}
        zipFileName={`Bangla_OCR_${batchExportFormat.toUpperCase()}.zip`}
        onClear={() => setBatchFiles([])}
        title={isBn ? 'এক্সপোর্ট করা OCR ফাইলসমূহ' : 'Exported Bangla OCR Files'}
      />
    </div>
  );
};
