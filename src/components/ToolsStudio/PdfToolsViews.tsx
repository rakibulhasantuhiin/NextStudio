import React, { useEffect, useState } from 'react';
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
} from '../../utils/toolsEngine';
import {
  BulkZipNotice,
  FileDropzone,
  ProcessedResultsList,
  SelectedFileItem,
  ToolHeader,
  ToolsLang,
  createFileItems,
  fmtToolNum,
} from './SharedToolUI';

interface PdfToolProps {
  lang?: ToolsLang;
  onBack: () => void;
}

// ============================================================================
// 6A. PDF Merge
// ============================================================================

export const PdfMergeTool: React.FC<PdfToolProps> = ({ lang = 'en', onBack }) => {
  const isBn = lang === 'bn';
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
            f.id === item.id
              ? {
                  ...f,
                  metaText: isBn
                    ? `${fmtToolNum(count, lang)} পাতা`
                    : `${count} page${count === 1 ? '' : 's'}`,
                }
              : f
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
          infoText: isBn
            ? `${fmtToolNum(files.length, lang)}টি PDF একসাথে জোড়া দেওয়া হয়েছে`
            : `${files.length} PDF files merged into one`,
        },
      ]);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : isBn
          ? 'PDF জোড়া দিতে সমস্যা হয়েছে।'
          : 'Failed to merge PDFs.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <ToolHeader
        title={isBn ? 'PDF জোড়া (মার্জ)' : 'Merge PDF'}
        subtitle={
          isBn
            ? 'একাধিক PDF ফাইলকে আপনার পছন্দমতো ক্রম অনুযায়ী সাজিয়ে একটি PDF-এ রূপান্তর করুন।'
            : 'Combine multiple PDF files into a single document in your preferred order.'
        }
        categoryLabel={isBn ? 'ছবি ও PDF টুলস' : 'Image & PDF Tools'}
        onBack={onBack}
      />

      <div className="glass-panel rounded-2xl p-4 sm:p-6 space-y-5">
        <FileDropzone
          lang={lang}
          accept="application/pdf,.pdf"
          multiple
          allowReorder
          onMoveFile={handleMove}
          fileKind="pdf"
          title={isBn ? 'PDF ফাইল বেছে নিন' : 'Choose PDF Files'}
          subtitle={
            isBn
              ? 'একাধিক PDF দিন · তালিকার ↑ ↓ বাটনে চাপ দিয়ে ক্রম বদলান'
              : 'Upload multiple PDFs · use ↑ ↓ buttons to reorder'
          }
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
            <span>
              {isBn
                ? `PDF জোড়া দিন (${fmtToolNum(files.length, lang)}টি)`
                : `Merge PDFs (${files.length})`}
            </span>
          </button>

          <BulkZipNotice
            lang={lang}
            text={
              isBn
                ? '১০০% অফলাইন — আপনার PDF ফাইল ব্রাউজারের বাইরে যায় না'
                : '100% offline — your PDF files never leave your browser'
            }
          />
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-2.5 text-xs font-semibold text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <ProcessedResultsList
        lang={lang}
        results={results}
        zipFileName="NextStudio_Merged_PDF.zip"
        onClear={() => setResults([])}
      />
    </div>
  );
};

// ============================================================================
// 6B. PDF Split / Extract Pages
// ============================================================================

export const PdfSplitTool: React.FC<PdfToolProps> = ({ lang = 'en', onBack }) => {
  const isBn = lang === 'bn';
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
            f.id === item.id
              ? {
                  ...f,
                  metaText: isBn
                    ? `মোট ${fmtToolNum(count, lang)} পাতা`
                    : `${count} total page${count === 1 ? '' : 's'}`,
                }
              : f
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
        const res = await splitPdfFile(item.file, splitMode, rangeText, lang);
        allOut.push(...res);
      }
      setResults(allOut);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : isBn
          ? 'PDF ভাগ করতে সমস্যা হয়েছে।'
          : 'Failed to split PDF.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <ToolHeader
        title={isBn ? 'PDF ভাগ / পাতা বের করা' : 'Split / Extract PDF Pages'}
        subtitle={
          isBn
            ? 'PDF থেকে বেছে নেওয়া নির্দিষ্ট পাতা আলাদা করুন অথবা প্রতিটি পাতাকে আলাদা PDF ফাইল বানিয়ে ZIP-এ নামান।'
            : 'Extract specific page ranges or split every page into individual PDF files ready to download as a ZIP.'
        }
        categoryLabel={isBn ? 'ছবি ও PDF টুলস' : 'Image & PDF Tools'}
        onBack={onBack}
      />

      <div className="glass-panel rounded-2xl p-4 sm:p-6 space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5">
            <FileDropzone
              lang={lang}
              accept="application/pdf,.pdf"
              multiple
              fileKind="pdf"
              title={isBn ? 'PDF ফাইল বেছে নিন' : 'Choose PDF Files'}
              subtitle={
                isBn
                  ? 'এক বা একাধিক PDF ফাইল দিন · টেনে এনে ছাড়ুন'
                  : 'Upload one or multiple PDFs · drag & drop'
              }
              files={files}
              onAddFiles={(f) => void handleAddFiles(f)}
              onRemoveFile={(id) => setFiles((prev) => prev.filter((f) => f.id !== id))}
              onClearAll={() => setFiles([])}
            />
          </div>

          <div className="lg:col-span-7 space-y-4">
            <div className="space-y-1.5">
              <div className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                {isBn ? 'কীভাবে ভাগ করবেন?' : 'Split Mode'}
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
                  <span>{isBn ? 'নির্দিষ্ট পাতা বের করুন' : 'Extract Specific Pages'}</span>
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
                  <span>
                    {isBn
                      ? 'প্রতিটি পাতা আলাদা PDF করুন (ZIP)'
                      : 'Split Every Page to Separate PDFs (ZIP)'}
                  </span>
                </label>
              </div>
            </div>

            {splitMode === 'extract' && (
              <div className="space-y-1.5 max-w-md">
                <label className="text-xs font-extrabold text-slate-800 dark:text-slate-100 block">
                  {isBn ? 'কোন কোন পাতা লাগবে?' : 'Page Range'}
                </label>
                <input
                  type="text"
                  value={rangeText}
                  onChange={(e) => setRangeText(e.target.value)}
                  placeholder={isBn ? 'যেমন: 1-3, 5, 7-9 অথবা ১-৩, ৫' : 'e.g., 1-3, 5, 7-9'}
                  className="glass-input w-full px-3.5 py-2.5 rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isBn
                    ? 'কমা (,) ও হাইফেন (-) দিয়ে লিখুন — বাংলা বা ইংরেজি দুই অঙ্কেই কাজ করবে।'
                    : 'Use commas (,) and hyphens (-) — supports both English and Bengali digits.'}
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
              <span>
                {splitMode === 'each'
                  ? isBn
                    ? 'সব পাতা আলাদা করুন'
                    : 'Split All Pages'
                  : isBn
                  ? 'পাতা বের করুন'
                  : 'Extract Pages'}
              </span>
            </button>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-900/6 dark:border-white/8">
          <BulkZipNotice
            lang={lang}
            text={
              isBn
                ? 'ZIP চালু — আলাদা করা সব পাতা এক ক্লিকে ZIP-এ নামাতে পারবেন'
                : 'ZIP enabled — download all split PDFs together in one click'
            }
          />
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-2.5 text-xs font-semibold text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <ProcessedResultsList
        lang={lang}
        results={results}
        zipFileName="NextStudio_Split_PDFs.zip"
        onClear={() => setResults([])}
      />
    </div>
  );
};

// ============================================================================
// 6C. PDF Visual Organizer (Reorder / Rotate / Delete)
// ============================================================================

export const PdfOrganizeTool: React.FC<PdfToolProps> = ({ lang = 'en', onBack }) => {
  const isBn = lang === 'bn';
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
      setSourceFile({
        ...item,
        metaText: isBn
          ? `মোট ${fmtToolNum(thumbs.length, lang)} পাতা`
          : `${thumbs.length} total page${thumbs.length === 1 ? '' : 's'}`,
      });
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : isBn
          ? 'PDF পাতাগুলো প্রিভিউ করা যায়নি।'
          : 'Failed to render PDF page previews.'
      );
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
        pages.map((p) => ({ originalIndex: p.originalIndex, rotation: p.rotation })),
        lang
      );
      setResults([
        {
          id: `org-${Date.now()}`,
          name: `${getBaseName(sourceFile.file.name)}_organized.pdf`,
          originalName: sourceFile.file.name,
          originalSize: sourceFile.file.size,
          blob,
          infoText: isBn
            ? `${fmtToolNum(pages.length, lang)}টি পাতা সাজানো হয়েছে`
            : `${pages.length} page${pages.length === 1 ? '' : 's'} organized`,
        },
      ]);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : isBn
          ? 'নতুন PDF তৈরি করা যায়নি।'
          : 'Failed to build organized PDF.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <ToolHeader
        title={isBn ? 'PDF পাতা সাজান / ঘোরান / মুছুন' : 'Organize / Rotate / Delete PDF'}
        subtitle={
          isBn
            ? 'প্রতিটি পাতার প্রিভিউ ছবি দেখে রোটেট করুন, অপ্রয়োজনীয় পাতা বাদ দিন বা আগে-পরে সাজিয়ে নতুন PDF বানান।'
            : 'Preview every page thumbnail to rotate, delete unwanted pages, or reorder pages and save a clean PDF.'
        }
        categoryLabel={isBn ? 'ছবি ও PDF টুলস' : 'Image & PDF Tools'}
        onBack={onBack}
      />

      <div className="glass-panel rounded-2xl p-4 sm:p-6 space-y-5">
        <FileDropzone
          lang={lang}
          accept="application/pdf,.pdf"
          multiple={false}
          fileKind="pdf"
          title={isBn ? 'PDF ফাইল বেছে নিন' : 'Choose a PDF File'}
          subtitle={
            isBn
              ? 'যেকোনো PDF দিলে প্রতিটি পাতার প্রিভিউ এখানে দেখা যাবে'
              : 'Upload a PDF to view and edit thumbnails of every page'
          }
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
            <span>
              {isBn ? 'সব পাতার প্রিভিউ তৈরি হচ্ছে...' : 'Rendering page previews...'}
            </span>
          </div>
        )}

        {!isLoadingThumbs && pages.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-900/8 dark:border-white/10">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-200 tabular-nums">
                {isBn
                  ? `বর্তমানে ${fmtToolNum(pages.length, lang)}টি পাতা রয়েছে (আগে ছিল ${fmtToolNum(initialPages.length, lang)}টি)`
                  : `Showing ${pages.length} page${pages.length === 1 ? '' : 's'} (originally ${initialPages.length})`}
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
                  <span>{isBn ? 'সব ৯০° ঘোরান' : 'Rotate All 90°'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPages(initialPages)}
                  className="glass-tile px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span>{isBn ? 'আগের অবস্থায় ফিরুন' : 'Reset Order'}</span>
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => void handleSavePdf()}
                  className="glass-btn-primary px-4 py-1.5 rounded-xl text-white text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isBn ? 'নতুন PDF তৈরি করুন' : 'Build New PDF'}</span>
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
                    <span>
                      {isBn ? `ক্রম ${fmtToolNum(idx + 1, lang)}` : `Pos ${idx + 1}`}
                    </span>
                    <span className="text-slate-400">
                      {isBn ? `মূল #${fmtToolNum(page.pageNumber, lang)}` : `Orig #${page.pageNumber}`}
                    </span>
                  </div>

                  <div className="aspect-[3/4] w-full rounded-lg bg-slate-100 dark:bg-slate-900/60 overflow-hidden flex items-center justify-center p-1">
                    <img
                      src={page.thumbUrl}
                      alt={isBn ? `পাতা ${page.pageNumber}` : `Page ${page.pageNumber}`}
                      style={{ transform: `rotate(${page.rotation}deg)` }}
                      className="max-w-full max-h-full object-contain transition-transform duration-150 shadow-sm bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-5 gap-1 pt-1">
                    <button
                      type="button"
                      onClick={() => movePage(idx, -1)}
                      disabled={idx === 0}
                      title={isBn ? 'বামে নিন' : 'Move left'}
                      className="p-1.5 rounded-lg bg-white/70 dark:bg-white/5 hover:bg-blue-500/15 text-slate-700 dark:text-slate-200 disabled:opacity-25 flex items-center justify-center cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => movePage(idx, 1)}
                      disabled={idx === pages.length - 1}
                      title={isBn ? 'ডানে নিন' : 'Move right'}
                      className="p-1.5 rounded-lg bg-white/70 dark:bg-white/5 hover:bg-blue-500/15 text-slate-700 dark:text-slate-200 disabled:opacity-25 flex items-center justify-center cursor-pointer"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => rotatePage(page.id, -90)}
                      title={isBn ? 'বামে ৯০° ঘোরান' : 'Rotate 90° left'}
                      className="p-1.5 rounded-lg bg-white/70 dark:bg-white/5 hover:bg-blue-500/15 text-slate-700 dark:text-slate-200 flex items-center justify-center cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => rotatePage(page.id, 90)}
                      title={isBn ? 'ডানে ৯০° ঘোরান' : 'Rotate 90° right'}
                      className="p-1.5 rounded-lg bg-white/70 dark:bg-white/5 hover:bg-blue-500/15 text-slate-700 dark:text-slate-200 flex items-center justify-center cursor-pointer"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deletePage(page.id)}
                      title={isBn ? 'পাতা মুছুন' : 'Delete page'}
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
        lang={lang}
        results={results}
        zipFileName="NextStudio_Organized_PDF.zip"
        onClear={() => setResults([])}
      />
    </div>
  );
};

// ============================================================================
// 6D. PDF to Images (JPG / PNG)
// ============================================================================

export const PdfToImageTool: React.FC<PdfToolProps> = ({ lang = 'en', onBack }) => {
  const isBn = lang === 'bn';
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
        const imgs = await renderPdfToImages(
          item.file,
          format,
          dpi,
          quality / 100,
          (cur, tot) => {
            setProgressText(
              isBn
                ? `ফাইল ${fmtToolNum(fIdx + 1, lang)}/${fmtToolNum(files.length, lang)} · পাতা ${fmtToolNum(cur, lang)}/${fmtToolNum(tot, lang)}`
                : `File ${fIdx + 1}/${files.length} · Page ${cur}/${tot}`
            );
          },
          lang
        );
        out.push(...imgs);
      }
      setResults(out);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : isBn
          ? 'PDF থেকে ছবি তৈরি করা যায়নি।'
          : 'Failed to convert PDF to images.'
      );
    } finally {
      setIsProcessing(false);
      setProgressText('');
    }
  };

  return (
    <div>
      <ToolHeader
        title={isBn ? 'PDF থেকে ছবি (JPG / PNG)' : 'PDF to Image (JPG / PNG)'}
        subtitle={
          isBn
            ? 'PDF-এর প্রতিটি পাতাকে উচ্চমানের (DPI নির্ধারণসহ) ছবিতে রূপান্তর করে একসাথে ZIP আকারে ডাউনলোড করুন।'
            : 'Render every PDF page to crisp JPG or PNG images with selectable DPI and bulk ZIP download.'
        }
        categoryLabel={isBn ? 'ছবি ও PDF টুলস' : 'Image & PDF Tools'}
        onBack={onBack}
      />

      <div className="glass-panel rounded-2xl p-4 sm:p-6 space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5">
            <FileDropzone
              lang={lang}
              accept="application/pdf,.pdf"
              multiple
              fileKind="pdf"
              title={isBn ? 'PDF ফাইল বেছে নিন' : 'Choose PDF Files'}
              subtitle={
                isBn
                  ? 'একসাথে অনেকগুলো PDF দিতে পারবেন · টেনে এনে ছাড়ুন'
                  : 'Upload multiple PDFs at once · drag & drop'
              }
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
                  {isBn ? 'ছবির ফরম্যাট' : 'Image Format'}
                </label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as typeof format)}
                  className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="image/jpeg" className="text-slate-900">
                    {isBn ? 'JPG (দ্রুত ও ছোট সাইজ)' : 'JPG (Fast & Smaller)'}
                  </option>
                  <option value="image/png" className="text-slate-900">
                    {isBn ? 'PNG (সর্বোচ্চ শার্প)' : 'PNG (Lossless Sharp)'}
                  </option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-800 dark:text-slate-100 block">
                  {isBn ? 'ছবির মান (DPI)' : 'Resolution (DPI)'}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { v: 72, labelEn: '72 (Light)', labelBn: '৭২ (হালকা)' },
                    { v: 150, labelEn: '150 (Good)', labelBn: '১৫০ (ভালো)' },
                    { v: 200, labelEn: '200 (HD)', labelBn: '২০০ (HD)' },
                    { v: 300, labelEn: '300 (Print)', labelBn: '৩০০ (প্রিন্ট)' },
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
                      {isBn ? opt.labelBn : opt.labelEn}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {format === 'image/jpeg' && (
              <div className="flex items-center gap-3 max-w-xs">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 shrink-0">
                  {isBn ? 'কোয়ালিটি' : 'Quality'}
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
                  {fmtToolNum(quality, lang)}%
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
              <span>
                {progressText || (isBn ? 'ছবিতে রূপান্তর করুন' : 'Convert to Images')}
              </span>
            </button>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-900/6 dark:border-white/8">
          <BulkZipNotice
            lang={lang}
            text={
              isBn
                ? 'বাল্ক ও ZIP চালু — সব পাতার ছবি এক ক্লিকে ZIP-এ নামাতে পারবেন'
                : 'Bulk & ZIP enabled — download all rendered page images as a single ZIP'
            }
          />
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-2.5 text-xs font-semibold text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <ProcessedResultsList
        lang={lang}
        results={results}
        zipFileName={`NextStudio_PDF_Images_${dpi}DPI.zip`}
        onClear={() => setResults([])}
      />
    </div>
  );
};

// ============================================================================
// 6E. PDF Compressor (KB)
// ============================================================================

const QUICK_PDF_KB = [100, 200, 300, 500, 1000, 2000];

export const PdfCompressTool: React.FC<PdfToolProps> = ({ lang = 'en', onBack }) => {
  const isBn = lang === 'bn';
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
        const res = await compressPdfToTargetKb(
          files[i].file,
          targetKb || 300,
          (msg) => {
            setProgressText(
              isBn
                ? `ফাইল ${fmtToolNum(i + 1, lang)}/${fmtToolNum(files.length, lang)} · ${msg}`
                : `File ${i + 1}/${files.length} · ${msg}`
            );
          },
          lang
        );
        out.push(res);
      }
      setResults(out);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : isBn
          ? 'PDF কমপ্রেস করতে সমস্যা হয়েছে।'
          : 'Failed to compress PDF.'
      );
    } finally {
      setIsProcessing(false);
      setProgressText('');
    }
  };

  return (
    <div>
      <ToolHeader
        title={isBn ? 'PDF-এর সাইজ কমান (KB)' : 'Compress PDF (KB)'}
        subtitle={
          isBn
            ? 'PDF ছোট করুন — যত KB লাগে তত KB-তে নামান, একসাথে অনেকগুলো ফাইল কমপ্রেস করে ZIP-এ নামান।'
            : 'Shrink PDF file size under any custom KB target — process multiple PDFs and save as ZIP.'
        }
        categoryLabel={isBn ? 'ছবি ও PDF টুলস' : 'Image & PDF Tools'}
        onBack={onBack}
      />

      <div className="glass-panel rounded-2xl p-4 sm:p-6 space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5">
            <FileDropzone
              lang={lang}
              accept="application/pdf,.pdf"
              multiple
              fileKind="pdf"
              title={isBn ? 'PDF ফাইল বেছে নিন' : 'Choose PDF Files'}
              subtitle={
                isBn
                  ? 'একসাথে অনেকগুলো PDF দিতে পারবেন · টেনে এনে ছাড়ুন'
                  : 'Upload multiple PDFs at once · drag & drop'
              }
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
                {isBn ? 'PDF কত KB-র নিচে চান?' : 'Target PDF Size Under (KB)'}
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
                    {kb >= 1000
                      ? `${fmtToolNum(kb / 1000, lang)} MB`
                      : `${fmtToolNum(kb, lang)} KB`}
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
              <span>{progressText || (isBn ? 'PDF সাইজ কমান' : 'Compress PDF')}</span>
            </button>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-900/6 dark:border-white/8">
          <BulkZipNotice lang={lang} />
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-2.5 text-xs font-semibold text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <ProcessedResultsList
        lang={lang}
        results={results}
        zipFileName={`NextStudio_Compressed_PDFs_${targetKb}KB.zip`}
        onClear={() => setResults([])}
      />
    </div>
  );
};

// ============================================================================
// 6F. PDF Text Extractor
// ============================================================================

export const PdfExtractTextTool: React.FC<PdfToolProps> = ({ lang = 'en', onBack }) => {
  const isBn = lang === 'bn';
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
        out.push(await extractTextFromPdf(item.file, lang));
      }
      setExtracted(out);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : isBn
          ? 'PDF থেকে লেখা বের করা যায়নি।'
          : 'Failed to extract text from PDF.'
      );
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
        title={isBn ? 'PDF থেকে লেখা বের করুন' : 'Extract Text from PDF'}
        subtitle={
          isBn
            ? 'PDF-এর ভেতরের সব লেখা বের করে এক ক্লিকে কপি করুন অথবা .txt ফাইলে ডাউনলোড করুন।'
            : 'Extract all selectable text from PDF documents to copy in one click or save as .txt files.'
        }
        categoryLabel={isBn ? 'ছবি ও PDF টুলস' : 'Image & PDF Tools'}
        onBack={onBack}
      />

      <div className="glass-panel rounded-2xl p-4 sm:p-6 space-y-5">
        <FileDropzone
          lang={lang}
          accept="application/pdf,.pdf"
          multiple
          fileKind="pdf"
          title={isBn ? 'PDF ফাইল বেছে নিন' : 'Choose PDF Files'}
          subtitle={
            isBn
              ? 'এক বা একাধিক PDF ফাইল দিন · টেনে এনে ছাড়ুন'
              : 'Upload one or multiple PDFs · drag & drop'
          }
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
            <span>{isBn ? 'লেখা বের করুন' : 'Extract Text'}</span>
          </button>

          <BulkZipNotice
            lang={lang}
            text={
              isBn
                ? 'বাল্ক চালু — একাধিক PDF দিলে সবগুলো .txt একসাথে ZIP-এ নামাতে পারবেন'
                : 'Bulk enabled — download all extracted .txt files together as a ZIP'
            }
          />
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
                <span>
                  {isBn
                    ? `সবগুলো .txt ZIP-এ নামান (${fmtToolNum(extracted.length, lang)})`
                    : `Download All .txt as ZIP (${extracted.length})`}
                </span>
              </button>
            </div>
          )}

          {extracted.map((res, idx) => (
            <div
              key={`${res.fileName}-${idx}`}
              className="glass-panel rounded-2xl p-4 sm:p-5 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {res.fileName}
                  </h3>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {isBn
                      ? `মোট ${fmtToolNum(res.pageCount, lang)} পাতা · ${fmtToolNum(res.fullText.length, lang)} অক্ষর`
                      : `${res.pageCount} page${res.pageCount === 1 ? '' : 's'} · ${res.fullText.length} characters`}
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
                        <span>{isBn ? 'কপি হয়েছে' : 'Copied'}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>{isBn ? 'কপি করুন' : 'Copy'}</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadTxt(res)}
                    className="glass-btn-primary px-3.5 py-1.5 rounded-xl text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isBn ? '.txt ডাউনলোড' : 'Download .txt'}</span>
                  </button>
                </div>
              </div>

              <textarea
                readOnly
                rows={10}
                value={
                  res.fullText.trim() ||
                  (isBn
                    ? 'এই PDF-এ কোনো সিলেক্টেবল টেক্সট পাওয়া যায়নি (সম্ভবত এটি স্ক্যান করা ছবি-ভিত্তিক PDF)।'
                    : 'No selectable text was found in this PDF (it may be a scanned image-based PDF).')
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
// 6G. PDF Page Numbers & Watermark (English & Bengali Unicode)
// ============================================================================

export const PdfWatermarkNumberTool: React.FC<PdfToolProps> = ({ lang = 'en', onBack }) => {
  const isBn = lang === 'bn';
  const [files, setFiles] = useState<SelectedFileItem[]>([]);
  const [opts, setOpts] = useState<PdfStampOptions>({
    enablePageNumber: true,
    pageNumberScript: lang === 'bn' ? 'bn' : 'en',
    pageNumberFormat: 'ofTotal',
    pageNumberPosition: 'bottom-center',
    pageNumberFontSize: 11,
    enableWatermark: true,
    watermarkText: lang === 'bn' ? 'গোপনীয় কপি' : 'CONFIDENTIAL',
    watermarkOpacity: 0.16,
    watermarkFontSize: 44,
    watermarkAngle: -38,
    watermarkColor: '#1e3a8a',
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ProcessedFileResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Sync default watermark placeholder & script if user hasn't customized it
  useEffect(() => {
    setOpts((prev) => {
      const next = { ...prev };
      if (lang === 'bn' && prev.watermarkText === 'CONFIDENTIAL') {
        next.watermarkText = 'গোপনীয় কপি';
        next.pageNumberScript = 'bn';
      } else if (lang === 'en' && prev.watermarkText === 'গোপনীয় কপি') {
        next.watermarkText = 'CONFIDENTIAL';
        next.pageNumberScript = 'en';
      }
      return next;
    });
  }, [lang]);

  const handleApply = async () => {
    if (files.length === 0) return;
    if (!opts.enablePageNumber && !opts.enableWatermark) {
      setError(
        isBn
          ? 'পেজ নম্বর অথবা ওয়াটারমার্কের অন্তত একটি চালু রাখুন।'
          : 'Enable at least Page Numbers or Watermark.'
      );
      return;
    }
    setError(null);
    setIsProcessing(true);
    try {
      const out: ProcessedFileResult[] = [];
      for (const item of files) {
        out.push(await addPageNumbersAndWatermark(item.file, opts, lang));
      }
      setResults(out);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : isBn
          ? 'পেজ নম্বর/ওয়াটারমার্ক বসানো যায়নি।'
          : 'Failed to apply page numbers/watermark.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <ToolHeader
        title={isBn ? 'PDF-এ পেজ নম্বর ও ওয়াটারমার্ক' : 'PDF Page Numbers & Watermark'}
        subtitle={
          isBn
            ? 'পাতায় বাংলা বা ইংরেজি পেজ নম্বর এবং কাস্টম হালকা ওয়াটারমার্ক বসান — একসাথে অনেকগুলো PDF-এ।'
            : 'Stamp English or Bengali page numbers and subtle custom text watermarks across multiple PDFs.'
        }
        categoryLabel={isBn ? 'ছবি ও PDF টুলস' : 'Image & PDF Tools'}
        onBack={onBack}
      />

      <div className="glass-panel rounded-2xl p-4 sm:p-6 space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5">
            <FileDropzone
              lang={lang}
              accept="application/pdf,.pdf"
              multiple
              fileKind="pdf"
              title={isBn ? 'PDF ফাইল বেছে নিন' : 'Choose PDF Files'}
              subtitle={
                isBn
                  ? 'একসাথে অনেকগুলো PDF দিতে পারবেন · টেনে এনে ছাড়ুন'
                  : 'Upload multiple PDFs at once · drag & drop'
              }
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
                <span>{isBn ? 'পেজ নম্বর বসান' : 'Add Page Numbers'}</span>
              </label>

              {opts.enablePageNumber && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      {isBn ? 'নম্বরের ভাষা' : 'Number Script'}
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
                      <option value="en" className="text-slate-900">
                        {isBn ? 'ইংরেজি (1, 2, 3)' : 'English (1, 2, 3)'}
                      </option>
                      <option value="bn" className="text-slate-900">
                        {isBn ? 'বাংলা (১, ২, ৩)' : 'Bengali (১, ২, ৩)'}
                      </option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      {isBn ? 'নম্বরের ধরন' : 'Format'}
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
                        {opts.pageNumberScript === 'bn'
                          ? isBn
                            ? 'শুধু নম্বর (১)'
                            : 'Number only (১)'
                          : isBn
                          ? 'শুধু নম্বর (1)'
                          : 'Number only (1)'}
                      </option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      {isBn ? 'অবস্থান' : 'Position'}
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
                        {isBn ? 'নিচে মাঝখানে' : 'Bottom Center'}
                      </option>
                      <option value="bottom-right" className="text-slate-900">
                        {isBn ? 'নিচে ডানে' : 'Bottom Right'}
                      </option>
                      <option value="top-right" className="text-slate-900">
                        {isBn ? 'উপরে ডানে' : 'Top Right'}
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
                <span>
                  {isBn
                    ? 'হালকা ওয়াটারমার্ক বসান (বাংলা / ইংরেজি)'
                    : 'Add Subtle Watermark (English / Bengali)'}
                </span>
              </label>

              {opts.enableWatermark && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                      {isBn ? 'ওয়াটারমার্কের লেখা' : 'Watermark Text'}
                    </label>
                    <input
                      type="text"
                      value={opts.watermarkText}
                      onChange={(e) => setOpts((p) => ({ ...p, watermarkText: e.target.value }))}
                      placeholder={
                        isBn
                          ? 'যেমন: গোপনীয় কপি / NextStudio / নমুনা'
                          : 'e.g., CONFIDENTIAL / NextStudio / DRAFT'
                      }
                      className="glass-input w-full px-3 py-2 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        <span>{isBn ? 'স্বচ্ছতা (Opacity)' : 'Opacity'}</span>
                        <span className="font-mono">
                          {fmtToolNum(Math.round(opts.watermarkOpacity * 100), lang)}%
                        </span>
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
                        <span>{isBn ? 'ফন্ট সাইজ' : 'Font Size'}</span>
                        <span className="font-mono">
                          {fmtToolNum(opts.watermarkFontSize, lang)}
                        </span>
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
                        {isBn ? 'কোণ ও রং' : 'Angle & Color'}
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
                            {isBn ? 'তির্যক' : 'Diagonal'}
                          </option>
                          <option value={0} className="text-slate-900">
                            {isBn ? 'সোজা' : 'Horizontal'}
                          </option>
                        </select>
                        <input
                          type="color"
                          value={opts.watermarkColor}
                          onChange={(e) =>
                            setOpts((p) => ({ ...p, watermarkColor: e.target.value }))
                          }
                          className="w-8 h-8 rounded-lg border border-slate-300 dark:border-white/15 cursor-pointer bg-transparent"
                          title={isBn ? 'ওয়াটারমার্কের রং' : 'Watermark Color'}
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
              <span>{isBn ? 'PDF-এ বসান' : 'Apply to PDF'}</span>
            </button>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-900/6 dark:border-white/8">
          <BulkZipNotice lang={lang} />
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-2.5 text-xs font-semibold text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <ProcessedResultsList
        lang={lang}
        results={results}
        zipFileName="NextStudio_Watermarked_PDFs.zip"
        onClear={() => setResults([])}
      />
    </div>
  );
};
