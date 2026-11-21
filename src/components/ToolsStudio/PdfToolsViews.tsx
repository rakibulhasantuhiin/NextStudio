import React, { useState } from 'react';
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Download,
  Loader2,
  RotateCcw,
  RotateCw,
  Trash2,
  Undo2,
} from 'lucide-react';
import {
  ExtractedPdfTextResult,
  PdfPageThumb,
  PdfStampOptions,
  ProcessedFileResult,
  addPageNumbersAndWatermark,
  compressPdfToTargetKb,
  downloadBlob,
  downloadFilesAsZip,
  extractTextFromPdf,
  getBaseName,
  getPdfPageCount,
  mergePdfFiles,
  rebuildOrganizedPdf,
  renderPdfPageThumbnails,
  renderPdfToImages,
  splitPdfFile,
  toBnDigits,
} from '../../utils/toolsEngine';
import {
  BulkZipNotice,
  FileDropzone,
  ProcessedResultsList,
  SelectedFileItem,
  ToolHeader,
  createFileItems,
} from './SharedToolUI';

interface PdfToolProps {
  onBack: () => void;
}

// ============================================================================
// 6A. PDF জোড়া (মার্জ)
// ============================================================================

export const PdfMergeTool: React.FC<PdfToolProps> = ({ onBack }) => {
  const [files, setFiles] = useState<SelectedFileItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ProcessedFileResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleAddFiles = async (newFiles: File[]) => {
    const items = createFileItems(newFiles, 'pdf');
    setFiles((prev) => [...prev, ...items]);

    // Populate page counts asynchronously
    for (const item of items) {
      try {
        const count = await getPdfPageCount(item.file);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === item.id ? { ...f, metaText: `${toBnDigits(count)} পাতা` } : f
          )
        );
      } catch {
        // ignore count error
      }
    }
  };

  const handleMove = (index: number, dir: -1 | 1) => {
    setFiles((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleMerge = async () => {
    if (files.length < 2) return;
    setError(null);
    setIsProcessing(true);
    try {
      const blob = await mergePdfFiles(files.map((f) => f.file));
      const totalOrig = files.reduce((sum, f) => sum + f.file.size, 0);
      setResults([
        {
          id: `merged-${Date.now()}`,
          name: `NextStudio_Merged_${files.length}files.pdf`,
          originalName: files[0].file.name,
          originalSize: totalOrig,
          blob,
          infoText: `${toBnDigits(files.length)}টি PDF একসাথে জোড়া দেওয়া হয়েছে`,
        },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'PDF জোড়া দিতে সমস্যা হয়েছে।');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <ToolHeader
        title="PDF জোড়া (মার্জ)"
        subtitle="একাধিক PDF ফাইলকে আপনার পছন্দমতো ক্রম অনুযায়ী সাজিয়ে একটি PDF-এ রূপান্তর করুন।"
        categoryLabel="ছবি ও PDF টুলস"
        onBack={onBack}
      />

      <div className="glass-panel rounded-2xl p-4 sm:p-6 space-y-5">
        <FileDropzone
          accept="application/pdf,.pdf"
          multiple
          allowReorder
          onMoveFile={handleMove}
          fileKind="pdf"
          title="PDF ফাইল বেছে নিন"
          subtitle="একাধিক PDF দিন · তালিকার ↑ ↓ বাটনে চাপ দিয়ে ক্রম বদলান"
          files={files}
          onAddFiles={(f) => void handleAddFiles(f)}
          onRemoveFile={(id) => setFiles((prev) => prev.filter((f) => f.id !== id))}
          onClearAll={() => setFiles([])}
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-900/6 dark:border-white/8">
          <button
            type="button"
            disabled={files.length < 2 || isProcessing}
            onClick={() => void handleMerge()}
            className="glass-btn-primary px-6 py-2.5 rounded-xl text-white text-sm font-extrabold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
          >
            {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>PDF জোড়া দিন ({toBnDigits(files.length)}টি)</span>
          </button>

          <BulkZipNotice text="১০০% অফলাইন — আপনার PDF ফাইল ব্রাউজারের বাইরে যায় না" />
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-2.5 text-xs font-semibold text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <ProcessedResultsList
        results={results}
        zipFileName="NextStudio_Merged_PDF.zip"
        onClear={() => setResults([])}
      />
    </div>
  );
};

// ============================================================================
// 6B. PDF ভাগ / পাতা বের করা (PDF Split / Extract)
// ============================================================================

export const PdfSplitTool: React.FC<PdfToolProps> = ({ onBack }) => {
  const [files, setFiles] = useState<SelectedFileItem[]>([]);
  const [splitMode, setSplitMode] = useState<'extract' | 'each'>('extract');
  const [rangeText, setRangeText] = useState<string>('1-3');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ProcessedFileResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleAddFiles = async (newFiles: File[]) => {
    const items = createFileItems(newFiles, 'pdf');
    setFiles((prev) => [...prev, ...items]);
    for (const item of items) {
      try {
        const count = await getPdfPageCount(item.file);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === item.id ? { ...f, metaText: `মোট ${toBnDigits(count)} পাতা` } : f
          )
        );
      } catch {
        // ignore
      }
    }
  };

  const handleSplit = async () => {
    if (files.length === 0) return;
    setError(null);
    setIsProcessing(true);
    try {
      const allOut: ProcessedFileResult[] = [];
      for (const item of files) {
        const res = await splitPdfFile(item.file, splitMode, rangeText);
        allOut.push(...res);
      }
      setResults(allOut);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'PDF ভাগ করতে সমস্যা হয়েছে।');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <ToolHeader
        title="PDF ভাগ / পাতা বের করা"
        subtitle="PDF থেকে বেছে নেওয়া নির্দিষ্ট পাতা আলাদা করুন অথবা প্রতিটি পাতাকে আলাদা PDF ফাইল বানিয়ে ZIP-এ নামান।"
        categoryLabel="ছবি ও PDF টুলস"
        onBack={onBack}
      />

      <div className="glass-panel rounded-2xl p-4 sm:p-6 space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5">
            <FileDropzone
              accept="application/pdf,.pdf"
              multiple
              fileKind="pdf"
              title="PDF ফাইল বেছে নিন"
              subtitle="এক বা একাধিক PDF ফাইল দিন · টেনে এনে ছাড়ুন"
              files={files}
              onAddFiles={(f) => void handleAddFiles(f)}
              onRemoveFile={(id) => setFiles((prev) => prev.filter((f) => f.id !== id))}
              onClearAll={() => setFiles([])}
            />
          </div>

          <div className="lg:col-span-7 space-y-4">
            <div className="space-y-1.5">
              <div className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                কীভাবে ভাগ করবেন?
              </div>
              <div className="flex flex-wrap gap-2">
                <label
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer ${
                    splitMode === 'extract'
                      ? 'bg-blue-600/12 dark:bg-blue-500/25 text-blue-700 dark:text-blue-300 border border-blue-500/60'
                      : 'glass-tile text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="pdf-split-mode"
                    checked={splitMode === 'extract'}
                    onChange={() => setSplitMode('extract')}
                    className="accent-blue-600"
                  />
                  <span>নির্দিষ্ট পাতা বের করুন</span>
                </label>
                <label
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer ${
                    splitMode === 'each'
                      ? 'bg-blue-600/12 dark:bg-blue-500/25 text-blue-700 dark:text-blue-300 border border-blue-500/60'
                      : 'glass-tile text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="pdf-split-mode"
                    checked={splitMode === 'each'}
                    onChange={() => setSplitMode('each')}
                    className="accent-blue-600"
                  />
                  <span>প্রতিটি পাতা আলাদা PDF করুন (ZIP)</span>
                </label>
              </div>
            </div>

            {splitMode === 'extract' && (
              <div className="space-y-1.5 max-w-md">
                <label className="text-xs font-extrabold text-slate-800 dark:text-slate-100 block">
                  কোন কোন পাতা লাগবে?
                </label>
                <input
                  type="text"
                  value={rangeText}
                  onChange={(e) => setRangeText(e.target.value)}
                  placeholder="যেমন: 1-3, 5, 7-9 অথবা ১-৩, ৫"
                  className="glass-input w-full px-3.5 py-2.5 rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  কমা (,) ও হাইফেন (-) দিয়ে লিখুন — বাংলা বা ইংরেজি দুই অঙ্কেই কাজ করবে।
                </p>
              </div>
            )}

            <button
              type="button"
              disabled={files.length === 0 || isProcessing}
              onClick={() => void handleSplit()}
              className="glass-btn-primary px-6 py-2.5 rounded-xl text-white text-sm font-extrabold inline-flex items-center gap-2 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
            >
              {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{splitMode === 'each' ? 'সব পাতা আলাদা করুন' : 'পাতা বের করুন'}</span>
            </button>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-900/6 dark:border-white/8">
          <BulkZipNotice text="ZIP চালু — আলাদা করা সব পাতা এক ক্লিকে ZIP-এ নামাতে পারবেন" />
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-2.5 text-xs font-semibold text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <ProcessedResultsList
        results={results}
        zipFileName="NextStudio_Split_PDFs.zip"
        onClear={() => setResults([])}
      />
    </div>
  );
};

// ============================================================================
// 6C. PDF পাতা সাজান / ঘোরান / মুছুন (Visual Organizer)
// ============================================================================

export const PdfOrganizeTool: React.FC<PdfToolProps> = ({ onBack }) => {
  const [sourceFile, setSourceFile] = useState<SelectedFileItem | null>(null);
  const [pages, setPages] = useState<PdfPageThumb[]>([]);
  const [initialPages, setInitialPages] = useState<PdfPageThumb[]>([]);
  const [isLoadingThumbs, setIsLoadingThumbs] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [results, setResults] = useState<ProcessedFileResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSelectPdf = async (newFiles: File[]) => {
    const file = newFiles[0];
    if (!file) return;
    setError(null);
    setResults([]);
    const item = createFileItems([file], 'pdf')[0];
    setSourceFile(item);
    setIsLoadingThumbs(true);
    try {
      const thumbs = await renderPdfPageThumbnails(file, 210);
      setPages(thumbs);
      setInitialPages(thumbs);
      setSourceFile({ ...item, metaText: `মোট ${toBnDigits(thumbs.length)} পাতা` });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'PDF পাতাগুলো প্রিভিউ করা যায়নি।');
    } finally {
      setIsLoadingThumbs(false);
    }
  };

  const rotatePage = (id: string, delta: 90 | -90) => {
    setPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, rotation: (p.rotation + delta + 360) % 360 } : p))
    );
  };

  const movePage = (idx: number, dir: -1 | 1) => {
    setPages((prev) => {
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const deletePage = (id: string) => {
    setPages((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSavePdf = async () => {
    if (!sourceFile || pages.length === 0) return;
    setError(null);
    setIsSaving(true);
    try {
      const blob = await rebuildOrganizedPdf(
        sourceFile.file,
        pages.map((p) => ({ originalIndex: p.originalIndex, rotation: p.rotation }))
      );
      setResults([
        {
          id: `org-${Date.now()}`,
          name: `${getBaseName(sourceFile.file.name)}_organized.pdf`,
          originalName: sourceFile.file.name,
          originalSize: sourceFile.file.size,
          blob,
          infoText: `${toBnDigits(pages.length)}টি পাতা সাজানো হয়েছে`,
        },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'নতুন PDF তৈরি করা যায়নি।');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <ToolHeader
        title="PDF পাতা সাজান / ঘোরান / মুছুন"
        subtitle="প্রতিটি পাতার প্রিভিউ ছবি দেখে রোটেট করুন, অপ্রয়োজনীয় পাতা বাদ দিন বা আগে-পরে সাজিয়ে নতুন PDF বানান।"
        categoryLabel="ছবি ও PDF টুলস"
        onBack={onBack}
      />

      <div className="glass-panel rounded-2xl p-4 sm:p-6 space-y-5">
        <FileDropzone
          accept="application/pdf,.pdf"
          multiple={false}
          fileKind="pdf"
          title="PDF ফাইল বেছে নিন"
          subtitle="যেকোনো PDF দিলে প্রতিটি পাতার প্রিভিউ এখানে দেখা যাবে"
          files={sourceFile ? [sourceFile] : []}
          onAddFiles={(f) => void handleSelectPdf(f)}
          onRemoveFile={() => {
            setSourceFile(null);
            setPages([]);
            setInitialPages([]);
          }}
        />

        {isLoadingThumbs && (
          <div className="py-10 flex flex-col items-center justify-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400" />
            <span>সব পাতার প্রিভিউ তৈরি হচ্ছে...</span>
          </div>
        )}

        {!isLoadingThumbs && pages.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-900/8 dark:border-white/10">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-200 tabular-nums">
                বর্তমানে {toBnDigits(pages.length)}টি পাতা রয়েছে (আগে ছিল{' '}
                {toBnDigits(initialPages.length)}টি)
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setPages((prev) =>
                      prev.map((p) => ({ ...p, rotation: (p.rotation + 90) % 360 }))
                    )
                  }
                  className="glass-tile px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>সব ৯০° ঘোরান</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPages(initialPages)}
                  className="glass-tile px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span>আগের অবস্থায় ফিরুন</span>
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => void handleSavePdf()}
                  className="glass-btn-primary px-4 py-1.5 rounded-xl text-white text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>নতুন PDF তৈরি করুন</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
              {pages.map((page, idx) => (
                <div
                  key={page.id}
                  className="glass-tile rounded-xl p-2.5 flex flex-col justify-between gap-2"
                >
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300 tabular-nums">
                    <span>ক্রম {toBnDigits(idx + 1)}</span>
                    <span className="text-slate-400">মূল #{toBnDigits(page.pageNumber)}</span>
                  </div>

                  <div className="aspect-[3/4] w-full rounded-lg bg-slate-100 dark:bg-slate-900/60 overflow-hidden flex items-center justify-center p-1">
                    <img
                      src={page.thumbUrl}
                      alt={`পাতা ${page.pageNumber}`}
                      style={{ transform: `rotate(${page.rotation}deg)` }}
                      className="max-w-full max-h-full object-contain transition-transform duration-150 shadow-sm bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-5 gap-1 pt-1">
                    <button
                      type="button"
                      onClick={() => movePage(idx, -1)}
                      disabled={idx === 0}
                      title="বামে নিন"
                      className="p-1.5 rounded-lg bg-white/70 dark:bg-white/5 hover:bg-blue-500/15 text-slate-700 dark:text-slate-200 disabled:opacity-25 flex items-center justify-center cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => movePage(idx, 1)}
                      disabled={idx === pages.length - 1}
                      title="ডানে নিন"
                      className="p-1.5 rounded-lg bg-white/70 dark:bg-white/5 hover:bg-blue-500/15 text-slate-700 dark:text-slate-200 disabled:opacity-25 flex items-center justify-center cursor-pointer"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => rotatePage(page.id, -90)}
                      title="বামে ৯০° ঘোরান"
                      className="p-1.5 rounded-lg bg-white/70 dark:bg-white/5 hover:bg-blue-500/15 text-slate-700 dark:text-slate-200 flex items-center justify-center cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => rotatePage(page.id, 90)}
                      title="ডানে ৯০° ঘোরান"
                      className="p-1.5 rounded-lg bg-white/70 dark:bg-white/5 hover:bg-blue-500/15 text-slate-700 dark:text-slate-200 flex items-center justify-center cursor-pointer"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deletePage(page.id)}
                      title="পাতা মুছুন"
                      className="p-1.5 rounded-lg bg-white/70 dark:bg-white/5 hover:bg-red-500/15 text-red-600 dark:text-red-400 flex items-center justify-center cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-2.5 text-xs font-semibold text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <ProcessedResultsList
        results={results}
        zipFileName="NextStudio_Organized_PDF.zip"
        onClear={() => setResults([])}
      />
    </div>
  );
};

// ============================================================================
// 6D. PDF থেকে ছবি (JPG / PNG)
// ============================================================================

export const PdfToImageTool: React.FC<PdfToolProps> = ({ onBack }) => {
  const [files, setFiles] = useState<SelectedFileItem[]>([]);
  const [format, setFormat] = useState<'image/jpeg' | 'image/png'>('image/jpeg');
  const [dpi, setDpi] = useState<number>(150);
  const [quality, setQuality] = useState<number>(92);
  const [progressText, setProgressText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ProcessedFileResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleConvert = async () => {
    if (files.length === 0) return;
    setError(null);
    setIsProcessing(true);
    try {
      const out: ProcessedFileResult[] = [];
      for (let fIdx = 0; fIdx < files.length; fIdx++) {
        const item = files[fIdx];
        const imgs = await renderPdfToImages(item.file, format, dpi, quality / 100, (cur, tot) => {
          setProgressText(
            `ফাইল ${toBnDigits(fIdx + 1)}/${toBnDigits(files.length)} · পাতা ${toBnDigits(cur)}/${toBnDigits(tot)}`
          );
        });
        out.push(...imgs);
      }
      setResults(out);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'PDF থেকে ছবি তৈরি করা যায়নি।');
    } finally {
      setIsProcessing(false);
      setProgressText('');
    }
  };

  return (
    <div>
      <ToolHeader
        title="PDF থেকে ছবি (JPG / PNG)"
        subtitle="PDF-এর প্রতিটি পাতাকে উচ্চমানের (DPI নির্ধারণসহ) ছবিতে রূপান্তর করে একসাথে ZIP আকারে ডাউনলোড করুন।"
        categoryLabel="ছবি ও PDF টুলস"
        onBack={onBack}
      />

      <div className="glass-panel rounded-2xl p-4 sm:p-6 space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5">
            <FileDropzone
              accept="application/pdf,.pdf"
              multiple
              fileKind="pdf"
              title="PDF ফাইল বেছে নিন"
              subtitle="একসাথে অনেকগুলো PDF দিতে পারবেন · টেনে এনে ছাড়ুন"
              files={files}
              onAddFiles={(newFiles) =>
                setFiles((prev) => [...prev, ...createFileItems(newFiles, 'pdf')])
              }
              onRemoveFile={(id) => setFiles((prev) => prev.filter((f) => f.id !== id))}
              onClearAll={() => setFiles([])}
            />
          </div>

          <div className="lg:col-span-7 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-800 dark:text-slate-100 block">
                  ছবির ফরম্যাট
                </label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as typeof format)}
                  className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="image/jpeg" className="text-slate-900">
                    JPG (দ্রুত ও ছোট সাইজ)
                  </option>
                  <option value="image/png" className="text-slate-900">
                    PNG (সর্বোচ্চ শার্প)
                  </option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-800 dark:text-slate-100 block">
                  ছবির মান (DPI)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { v: 72, label: '৭২ (হালকা)' },
                    { v: 150, label: '১৫০ (ভালো)' },
                    { v: 200, label: '২০০ (HD)' },
                    { v: 300, label: '৩০০ (প্রিন্ট)' },
                  ].map((opt) => (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => setDpi(opt.v)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition ${
                        dpi === opt.v
                          ? 'bg-blue-600/12 dark:bg-blue-500/25 text-blue-700 dark:text-blue-300 border border-blue-500/60'
                          : 'glass-tile text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {format === 'image/jpeg' && (
              <div className="flex items-center gap-3 max-w-xs">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 shrink-0">
                  কোয়ালিটি
                </span>
                <input
                  type="range"
                  min={50}
                  max={100}
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className="flex-1 accent-blue-600 cursor-pointer"
                />
                <span className="text-xs font-mono font-extrabold text-slate-900 dark:text-white w-10 text-right tabular-nums">
                  {toBnDigits(quality)}%
                </span>
              </div>
            )}

            <button
              type="button"
              disabled={files.length === 0 || isProcessing}
              onClick={() => void handleConvert()}
              className="glass-btn-primary px-6 py-2.5 rounded-xl text-white text-sm font-extrabold inline-flex items-center gap-2 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
            >
              {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{progressText || 'ছবিতে রূপান্তর করুন'}</span>
            </button>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-900/6 dark:border-white/8">
          <BulkZipNotice text="বাল্ক ও ZIP চালু — সব পাতার ছবি এক ক্লিকে ZIP-এ নামাতে পারবেন" />
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-2.5 text-xs font-semibold text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <ProcessedResultsList
        results={results}
        zipFileName={`NextStudio_PDF_Images_${dpi}DPI.zip`}
        onClear={() => setResults([])}
      />
    </div>
  );
};

// ============================================================================
// 6E. PDF-এর সাইজ কমান (KB)
// ============================================================================

const QUICK_PDF_KB = [100, 200, 300, 500, 1000, 2000];

export const PdfCompressTool: React.FC<PdfToolProps> = ({ onBack }) => {
  const [files, setFiles] = useState<SelectedFileItem[]>([]);
  const [targetKb, setTargetKb] = useState<number>(300);
  const [progressText, setProgressText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ProcessedFileResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleCompress = async () => {
    if (files.length === 0) return;
    setError(null);
    setIsProcessing(true);
    try {
      const out: ProcessedFileResult[] = [];
      for (let i = 0; i < files.length; i++) {
        const res = await compressPdfToTargetKb(files[i].file, targetKb || 300, (msg) => {
          setProgressText(`ফাইল ${toBnDigits(i + 1)}/${toBnDigits(files.length)} · ${msg}`);
        });
        out.push(res);
      }
      setResults(out);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'PDF কমপ্রেস করতে সমস্যা হয়েছে।');
    } finally {
      setIsProcessing(false);
      setProgressText('');
    }
  };

  return (
    <div>
      <ToolHeader
        title="PDF-এর সাইজ কমান (KB)"
        subtitle="PDF ছোট করুন — যত KB লাগে তত KB-তে নামান, একসাথে অনেকগুলো ফাইল কমপ্রেস করে ZIP-এ নামান।"
        categoryLabel="ছবি ও PDF টুলস"
        onBack={onBack}
      />

      <div className="glass-panel rounded-2xl p-4 sm:p-6 space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5">
            <FileDropzone
              accept="application/pdf,.pdf"
              multiple
              fileKind="pdf"
              title="PDF ফাইল বেছে নিন"
              subtitle="একসাথে অনেকগুলো PDF দিতে পারবেন · টেনে এনে ছাড়ুন"
              files={files}
              onAddFiles={(newFiles) =>
                setFiles((prev) => [...prev, ...createFileItems(newFiles, 'pdf')])
              }
              onRemoveFile={(id) => setFiles((prev) => prev.filter((f) => f.id !== id))}
              onClearAll={() => setFiles([])}
            />
          </div>

          <div className="lg:col-span-7 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-extrabold text-slate-800 dark:text-slate-100 block">
                PDF কত KB-র নিচে চান?
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={20}
                  max={25000}
                  value={targetKb}
                  onChange={(e) => setTargetKb(Math.max(20, Number(e.target.value) || 0))}
                  className="glass-input w-32 px-3 py-2 rounded-xl text-sm font-mono font-extrabold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">KB</span>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {QUICK_PDF_KB.map((kb) => (
                  <button
                    key={kb}
                    type="button"
                    onClick={() => setTargetKb(kb)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      targetKb === kb
                        ? 'bg-blue-600/12 dark:bg-blue-500/25 text-blue-700 dark:text-blue-300 border border-blue-500/60'
                        : 'glass-tile text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {kb >= 1000 ? `${toBnDigits(kb / 1000)} MB` : `${toBnDigits(kb)} KB`}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              disabled={files.length === 0 || isProcessing}
              onClick={() => void handleCompress()}
              className="glass-btn-primary px-6 py-2.5 rounded-xl text-white text-sm font-extrabold inline-flex items-center gap-2 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
            >
              {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{progressText || 'PDF সাইজ কমান'}</span>
            </button>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-900/6 dark:border-white/8">
          <BulkZipNotice />
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-2.5 text-xs font-semibold text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <ProcessedResultsList
        results={results}
        zipFileName={`NextStudio_Compressed_PDFs_${targetKb}KB.zip`}
        onClear={() => setResults([])}
      />
    </div>
  );
};

// ============================================================================
// 6F. PDF থেকে লেখা বের করুন (PDF Text Extractor)
// ============================================================================

export const PdfExtractTextTool: React.FC<PdfToolProps> = ({ onBack }) => {
  const [files, setFiles] = useState<SelectedFileItem[]>([]);
  const [extracted, setExtracted] = useState<ExtractedPdfTextResult[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExtract = async () => {
    if (files.length === 0) return;
    setError(null);
    setIsProcessing(true);
    try {
      const out: ExtractedPdfTextResult[] = [];
      for (const item of files) {
        out.push(await extractTextFromPdf(item.file));
      }
      setExtracted(out);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'PDF থেকে লেখা বের করা যায়নি।');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      window.setTimeout(() => setCopiedIdx(null), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleDownloadTxt = (res: ExtractedPdfTextResult) => {
    const blob = new Blob([res.fullText], { type: 'text/plain;charset=utf-8' });
    downloadBlob(blob, `${getBaseName(res.fileName)}.txt`);
  };

  const handleDownloadAllZip = async () => {
    await downloadFilesAsZip(
      extracted.map((r) => ({
        name: `${getBaseName(r.fileName)}.txt`,
        blob: new Blob([r.fullText], { type: 'text/plain;charset=utf-8' }),
      })),
      'NextStudio_Extracted_Texts.zip'
    );
  };

  return (
    <div>
      <ToolHeader
        title="PDF থেকে লেখা বের করুন"
        subtitle="PDF-এর ভেতরের সব লেখা বের করে এক ক্লিকে কপি করুন অথবা .txt ফাইলে ডাউনলোড করুন।"
        categoryLabel="ছবি ও PDF টুলস"
        onBack={onBack}
      />

      <div className="glass-panel rounded-2xl p-4 sm:p-6 space-y-5">
        <FileDropzone
          accept="application/pdf,.pdf"
          multiple
          fileKind="pdf"
          title="PDF ফাইল বেছে নিন"
          subtitle="এক বা একাধিক PDF ফাইল দিন · টেনে এনে ছাড়ুন"
          files={files}
          onAddFiles={(newFiles) =>
            setFiles((prev) => [...prev, ...createFileItems(newFiles, 'pdf')])
          }
          onRemoveFile={(id) => setFiles((prev) => prev.filter((f) => f.id !== id))}
          onClearAll={() => setFiles([])}
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-900/6 dark:border-white/8">
          <button
            type="button"
            disabled={files.length === 0 || isProcessing}
            onClick={() => void handleExtract()}
            className="glass-btn-primary px-6 py-2.5 rounded-xl text-white text-sm font-extrabold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
          >
            {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>লেখা বের করুন</span>
          </button>

          <BulkZipNotice text="বাল্ক চালু — একাধিক PDF দিলে সবগুলো .txt একসাথে ZIP-এ নামাতে পারবেন" />
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-2.5 text-xs font-semibold text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {extracted.length > 0 && (
        <div className="mt-5 space-y-4">
          {extracted.length > 1 && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => void handleDownloadAllZip()}
                className="glass-btn-emerald px-4 py-2 rounded-xl text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>সবগুলো .txt ZIP-এ নামান ({toBnDigits(extracted.length)})</span>
              </button>
            </div>
          )}

          {extracted.map((res, idx) => (
            <div key={`${res.fileName}-${idx}`} className="glass-panel rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {res.fileName}
                  </h3>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    মোট {toBnDigits(res.pageCount)} পাতা ·{' '}
                    {toBnDigits(res.fullText.length)} অক্ষর
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleCopy(res.fullText, idx)}
                    className="glass-tile px-3 py-1.5 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedIdx === idx ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>কপি হয়েছে</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>কপি করুন</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadTxt(res)}
                    className="glass-btn-primary px-3.5 py-1.5 rounded-xl text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>.txt ডাউনলোড</span>
                  </button>
                </div>
              </div>

              <textarea
                readOnly
                rows={10}
                value={
                  res.fullText.trim() ||
                  'এই PDF-এ কোনো সিলেক্টেবল টেক্সট পাওয়া যায়নি (সম্ভবত এটি স্ক্যান করা ছবি-ভিত্তিক PDF)।'
                }
                className="glass-input w-full rounded-xl p-3.5 text-xs sm:text-sm text-slate-800 dark:text-slate-100 leading-relaxed focus:outline-none"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 6G. PDF-এ পেজ নম্বর ও ওয়াটারমার্ক (Bangla & English Page Numbers + Watermark)
// ============================================================================

export const PdfWatermarkNumberTool: React.FC<PdfToolProps> = ({ onBack }) => {
  const [files, setFiles] = useState<SelectedFileItem[]>([]);
  const [opts, setOpts] = useState<PdfStampOptions>({
    enablePageNumber: true,
    pageNumberScript: 'bn',
    pageNumberFormat: 'ofTotal',
    pageNumberPosition: 'bottom-center',
    pageNumberFontSize: 11,
    enableWatermark: true,
    watermarkText: 'গোপনীয় কপি',
    watermarkOpacity: 0.16,
    watermarkFontSize: 44,
    watermarkAngle: -38,
    watermarkColor: '#1e3a8a',
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ProcessedFileResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleApply = async () => {
    if (files.length === 0) return;
    if (!opts.enablePageNumber && !opts.enableWatermark) {
      setError('পেজ নম্বর অথবা ওয়াটারমার্কের অন্তত একটি চালু রাখুন।');
      return;
    }
    setError(null);
    setIsProcessing(true);
    try {
      const out: ProcessedFileResult[] = [];
      for (const item of files) {
        out.push(await addPageNumbersAndWatermark(item.file, opts));
      }
      setResults(out);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'পেজ নম্বর/ওয়াটারমার্ক বসানো যায়নি।');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <ToolHeader
        title="PDF-এ পেজ নম্বর ও ওয়াটারমার্ক"
        subtitle="পাতায় বাংলা বা ইংরেজি পেজ নম্বর এবং কাস্টম হালকা ওয়াটারমার্ক বসান — একসাথে অনেকগুলো PDF-এ।"
        categoryLabel="ছবি ও PDF টুলস"
        onBack={onBack}
      />

      <div className="glass-panel rounded-2xl p-4 sm:p-6 space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5">
            <FileDropzone
              accept="application/pdf,.pdf"
              multiple
              fileKind="pdf"
              title="PDF ফাইল বেছে নিন"
              subtitle="একসাথে অনেকগুলো PDF দিতে পারবেন · টেনে এনে ছাড়ুন"
              files={files}
              onAddFiles={(newFiles) =>
                setFiles((prev) => [...prev, ...createFileItems(newFiles, 'pdf')])
              }
              onRemoveFile={(id) => setFiles((prev) => prev.filter((f) => f.id !== id))}
              onClearAll={() => setFiles([])}
            />
          </div>

          <div className="lg:col-span-7 space-y-5">
            {/* Page Number Section */}
            <div className="space-y-3 pb-4 border-b border-slate-900/8 dark:border-white/10">
              <label className="inline-flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={opts.enablePageNumber}
                  onChange={(e) => setOpts((p) => ({ ...p, enablePageNumber: e.target.checked }))}
                  className="accent-blue-600 w-4 h-4"
                />
                <span>পেজ নম্বর বসান</span>
              </label>

              {opts.enablePageNumber && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      নম্বরের ভাষা
                    </span>
                    <select
                      value={opts.pageNumberScript}
                      onChange={(e) =>
                        setOpts((p) => ({
                          ...p,
                          pageNumberScript: e.target.value as 'bn' | 'en',
                        }))
                      }
                      className="glass-input w-full px-2.5 py-2 rounded-xl text-xs font-bold text-slate-900 dark:text-white cursor-pointer"
                    >
                      <option value="bn" className="text-slate-900">
                        বাংলা (১, ২, ৩)
                      </option>
                      <option value="en" className="text-slate-900">
                        ইংরেজি (1, 2, 3)
                      </option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      নম্বরের ধরন
                    </span>
                    <select
                      value={opts.pageNumberFormat}
                      onChange={(e) =>
                        setOpts((p) => ({
                          ...p,
                          pageNumberFormat: e.target.value as 'plain' | 'ofTotal',
                        }))
                      }
                      className="glass-input w-full px-2.5 py-2 rounded-xl text-xs font-bold text-slate-900 dark:text-white cursor-pointer"
                    >
                      <option value="ofTotal" className="text-slate-900">
                        {opts.pageNumberScript === 'bn' ? 'পৃষ্ঠা ১ / ৫' : 'Page 1 / 5'}
                      </option>
                      <option value="plain" className="text-slate-900">
                        {opts.pageNumberScript === 'bn' ? 'শুধু নম্বর (১)' : 'শুধু নম্বর (1)'}
                      </option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      অবস্থান
                    </span>
                    <select
                      value={opts.pageNumberPosition}
                      onChange={(e) =>
                        setOpts((p) => ({
                          ...p,
                          pageNumberPosition: e.target.value as PdfStampOptions['pageNumberPosition'],
                        }))
                      }
                      className="glass-input w-full px-2.5 py-2 rounded-xl text-xs font-bold text-slate-900 dark:text-white cursor-pointer"
                    >
                      <option value="bottom-center" className="text-slate-900">
                        নিচে মাঝখানে
                      </option>
                      <option value="bottom-right" className="text-slate-900">
                        নিচে ডানে
                      </option>
                      <option value="top-right" className="text-slate-900">
                        উপরে ডানে
                      </option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Watermark Section */}
            <div className="space-y-3">
              <label className="inline-flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={opts.enableWatermark}
                  onChange={(e) => setOpts((p) => ({ ...p, enableWatermark: e.target.checked }))}
                  className="accent-blue-600 w-4 h-4"
                />
                <span>হালকা ওয়াটারমার্ক বসান (বাংলা / ইংরেজি)</span>
              </label>

              {opts.enableWatermark && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                      ওয়াটারমার্কের লেখা
                    </label>
                    <input
                      type="text"
                      value={opts.watermarkText}
                      onChange={(e) => setOpts((p) => ({ ...p, watermarkText: e.target.value }))}
                      placeholder="যেমন: গোপনীয় কপি / NextStudio / নমুনা"
                      className="glass-input w-full px-3 py-2 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        <span>স্বচ্ছতা (Opacity)</span>
                        <span className="font-mono">{toBnDigits(Math.round(opts.watermarkOpacity * 100))}%</span>
                      </div>
                      <input
                        type="range"
                        min={6}
                        max={45}
                        value={Math.round(opts.watermarkOpacity * 100)}
                        onChange={(e) =>
                          setOpts((p) => ({ ...p, watermarkOpacity: Number(e.target.value) / 100 }))
                        }
                        className="w-full accent-blue-600 cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        <span>ফন্ট সাইজ</span>
                        <span className="font-mono">{toBnDigits(opts.watermarkFontSize)}</span>
                      </div>
                      <input
                        type="range"
                        min={20}
                        max={76}
                        value={opts.watermarkFontSize}
                        onChange={(e) =>
                          setOpts((p) => ({ ...p, watermarkFontSize: Number(e.target.value) }))
                        }
                        className="w-full accent-blue-600 cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                        কোণ ও রং
                      </span>
                      <div className="flex items-center gap-2">
                        <select
                          value={opts.watermarkAngle}
                          onChange={(e) =>
                            setOpts((p) => ({ ...p, watermarkAngle: Number(e.target.value) }))
                          }
                          className="glass-input flex-1 px-2 py-1.5 rounded-xl text-xs font-bold text-slate-900 dark:text-white cursor-pointer"
                        >
                          <option value={-38} className="text-slate-900">
                            তির্যক
                          </option>
                          <option value={0} className="text-slate-900">
                            সোজা
                          </option>
                        </select>
                        <input
                          type="color"
                          value={opts.watermarkColor}
                          onChange={(e) =>
                            setOpts((p) => ({ ...p, watermarkColor: e.target.value }))
                          }
                          className="w-8 h-8 rounded-lg border border-slate-300 dark:border-white/15 cursor-pointer bg-transparent"
                          title="ওয়াটারমার্কের রং"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              disabled={files.length === 0 || isProcessing}
              onClick={() => void handleApply()}
              className="glass-btn-primary px-6 py-2.5 rounded-xl text-white text-sm font-extrabold inline-flex items-center gap-2 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
            >
              {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>PDF-এ বসান</span>
            </button>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-900/6 dark:border-white/8">
          <BulkZipNotice />
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-2.5 text-xs font-semibold text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <ProcessedResultsList
        results={results}
        zipFileName="NextStudio_Watermarked_PDFs.zip"
        onClear={() => setResults([])}
      />
    </div>
  );
};
