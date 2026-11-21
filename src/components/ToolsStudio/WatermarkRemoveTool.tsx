import React, { useEffect, useRef, useState } from 'react';
import {
  Download,
  Eraser,
  Eye,
  FileDown,
  Loader2,
  Paintbrush,
  Pipette,
  Printer,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Undo2,
  X,
} from 'lucide-react';
import {
  ProcessedFileResult,
  downloadBlob,
  getBaseName,
  loadImageFromFile,
  processImagesToPdf,
  toBnDigits,
} from '../../utils/toolsEngine';
import {
  BrushStroke,
  DEFAULT_WATERMARK_OPTIONS,
  RgbColor,
  WatermarkRemoveMode,
  WatermarkRemoveOptions,
  printCleanedDocumentsDirectly,
  processWatermarkRemovalFile,
  renderWatermarkRemovedCanvas,
} from '../../utils/watermarkRemover';
import {
  BulkZipNotice,
  FileDropzone,
  ProcessedResultsList,
  SelectedFileItem,
  ToolHeader,
  createFileItems,
} from './SharedToolUI';

interface WatermarkRemoveToolProps {
  onBack: () => void;
}

type CanvasToolMode = 'compare' | 'erase' | 'restore' | 'pick-color';

const REMOVAL_MODES: { id: WatermarkRemoveMode; label: string; hint: string }[] = [
  {
    id: 'smart-doc',
    label: 'স্মার্ট ডকুমেন্ট (সব ওয়াটারমার্ক)',
    hint: 'হালকা লোগো, জলছাপ ও ধূসর ব্যাকগ্রাউন্ড সাদা করবে — লেখা একদম স্পষ্ট থাকবে।',
  },
  {
    id: 'colored-watermark',
    label: 'রঙিন লোগো / ওয়াটারমার্ক মুছুন',
    hint: 'ডকুমেন্টের পেছনের লাল, নীল, সবুজ বা রঙিন লোগো মুছে কালো লেখা অক্ষত রাখবে।',
  },
  {
    id: 'color-pick',
    label: 'রং বাছাই করে মুছুন (আইড্রপার)',
    hint: 'প্রিভিউ ছবির ওয়াটারমার্কের ওপর ক্লিক করে নির্দিষ্ট রং বাছুন — শুধু ঐ রঙের লোগো মুছবে।',
  },
  {
    id: 'deep-scan',
    label: 'ডিপ স্ক্যান (ঝকঝকে কালো-সাদা)',
    hint: 'ভারী ওয়াটারমার্ক বা ছায়াযুক্ত স্ক্যান কাগজকে একদম ঝকঝকে সাদা কাগজে কালো লেখা বানাবে।',
  },
];

export const WatermarkRemoveTool: React.FC<WatermarkRemoveToolProps> = ({ onBack }) => {
  const [files, setFiles] = useState<SelectedFileItem[]>([]);
  const [activeFileIndex, setActiveFileIndex] = useState<number>(0);
  const [opts, setOpts] = useState<WatermarkRemoveOptions>(DEFAULT_WATERMARK_OPTIONS);

  // Interactive preview state
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  const [beforeUrl, setBeforeUrl] = useState<string>('');
  const [afterUrl, setAfterUrl] = useState<string>('');
  const [canvasTool, setCanvasTool] = useState<CanvasToolMode>('compare');
  const [splitPercent, setSplitPercent] = useState<number>(52);
  const [brushSize, setBrushSize] = useState<number>(28); // visual px-equivalent mapped to norm
  const [isDrawing, setIsDrawing] = useState<boolean>(false);

  const previewStageRef = useRef<HTMLDivElement>(null);
  const hiddenOrigCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeStrokeRef = useRef<BrushStroke | null>(null);

  // Processing / export states
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [isMakingPdf, setIsMakingPdf] = useState<boolean>(false);
  const [results, setResults] = useState<ProcessedFileResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const activeFileItem = files[activeFileIndex] || files[0] || null;

  // Load currently selected file into HTMLImageElement for instant live preview
  useEffect(() => {
    let cancelled = false;
    if (!activeFileItem) {
      setLoadedImage(null);
      setBeforeUrl('');
      setAfterUrl('');
      hiddenOrigCanvasRef.current = null;
      return;
    }

    (async () => {
      try {
        const img = await loadImageFromFile(activeFileItem.file);
        if (cancelled) return;
        setLoadedImage(img);

        // Prepare crisp preview-sized original canvas for before preview & eyedropper color sampling
        const maxDim = 1100;
        const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
        const pw = Math.max(1, Math.round(img.naturalWidth * scale));
        const ph = Math.max(1, Math.round(img.naturalHeight * scale));
        const c = document.createElement('canvas');
        c.width = pw;
        c.height = ph;
        const ctx = c.getContext('2d', { willReadFrequently: true })!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, pw, ph);
        ctx.drawImage(img, 0, 0, pw, ph);
        hiddenOrigCanvasRef.current = c;
        setBeforeUrl(c.toDataURL('image/jpeg', 0.92));
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'ছবি প্রিভিউ লোড করা যায়নি।');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeFileItem]);

  // Re-render live cleaned preview smoothly whenever options change
  useEffect(() => {
    if (!loadedImage) {
      setAfterUrl('');
      return;
    }
    const timer = window.setTimeout(() => {
      const cleaned = renderWatermarkRemovedCanvas(loadedImage, opts, 1100);
      setAfterUrl(cleaned.toDataURL('image/png'));
    }, 35);
    return () => window.clearTimeout(timer);
  }, [loadedImage, opts]);

  // Helper to get normalized (0..1) coordinates inside the image stage
  const getNormalizedPoint = (clientX: number, clientY: number) => {
    const rect = previewStageRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return null;
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    return { x, y };
  };

  // Sample exact RGB color from original image when clicking in 'pick-color' mode
  const handlePickColorAt = (nx: number, ny: number) => {
    const c = hiddenOrigCanvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const px = Math.max(0, Math.min(c.width - 1, Math.round(nx * (c.width - 1))));
    const py = Math.max(0, Math.min(c.height - 1, Math.round(ny * (c.height - 1))));
    const d = ctx.getImageData(px, py, 1, 1).data;
    const picked: RgbColor = { r: d[0], g: d[1], b: d[2] };

    setOpts((prev) => ({
      ...prev,
      mode: 'color-pick',
      targetColors: [...prev.targetColors.slice(-4), picked],
    }));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (canvasTool === 'compare') return;
    const pt = getNormalizedPoint(e.clientX, e.clientY);
    if (!pt) return;

    if (canvasTool === 'pick-color') {
      handlePickColorAt(pt.x, pt.y);
      return;
    }

    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = previewStageRef.current?.getBoundingClientRect();
    const radiusNorm = Math.max(0.008, Math.min(0.14, brushSize / Math.max(200, rect?.width || 600)));

    const stroke: BrushStroke = {
      type: canvasTool === 'erase' ? 'erase' : 'restore',
      points: [pt],
      radiusNorm,
    };
    activeStrokeRef.current = stroke;
    setIsDrawing(true);
    setOpts((prev) => ({ ...prev, strokes: [...prev.strokes, stroke] }));
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDrawing || !activeStrokeRef.current) return;
    const pt = getNormalizedPoint(e.clientX, e.clientY);
    if (!pt) return;

    const current = activeStrokeRef.current;
    const last = current.points[current.points.length - 1];
    const dist = Math.hypot(pt.x - last.x, pt.y - last.y);
    if (dist < 0.004) return;

    const updated: BrushStroke = {
      ...current,
      points: [...current.points, pt],
    };
    activeStrokeRef.current = updated;
    setOpts((prev) => ({
      ...prev,
      strokes: [...prev.strokes.slice(0, -1), updated],
    }));
  };

  const handlePointerUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    activeStrokeRef.current = null;
  };

  const handleUndoStroke = () => {
    setOpts((prev) => ({ ...prev, strokes: prev.strokes.slice(0, -1) }));
  };

  const handleResetAll = () => {
    setOpts(DEFAULT_WATERMARK_OPTIONS);
    setCanvasTool('compare');
  };

  // Process all uploaded files at 100% FULL native resolution (zero quality loss)
  const runFullResolutionProcess = async (): Promise<ProcessedFileResult[]> => {
    if (files.length === 0) return [];
    setError(null);
    setIsProcessing(true);
    try {
      const out: ProcessedFileResult[] = [];
      for (let i = 0; i < files.length; i++) {
        // Apply manual brush strokes only to the active previewed document so other bulk pages stay clean
        const fileOpts: WatermarkRemoveOptions =
          i === activeFileIndex ? opts : { ...opts, strokes: [] };
        out.push(await processWatermarkRemovalFile(files[i].file, fileOpts));
      }
      setResults(out);
      return out;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ওয়াটারমার্ক রিমুভ করতে সমস্যা হয়েছে।');
      return [];
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcessAndDownloadSingle = async () => {
    const out = await runFullResolutionProcess();
    if (out.length === 1) {
      downloadBlob(out[0].blob, out[0].name);
    }
  };

  const handleDirectPrint = async () => {
    if (files.length === 0) return;
    setIsPrinting(true);
    setError(null);
    try {
      const out = results.length === files.length && results.length > 0
        ? results
        : await runFullResolutionProcess();
      const urls = out.map((r) => r.previewUrl).filter((u): u is string => Boolean(u));
      if (urls.length > 0) {
        printCleanedDocumentsDirectly(urls);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'প্রিন্ট করতে সমস্যা হয়েছে।');
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (files.length === 0) return;
    setIsMakingPdf(true);
    setError(null);
    try {
      const out = await runFullResolutionProcess();
      if (out.length === 0) return;
      const cleanFiles = out.map(
        (r) => new File([r.blob], r.name, { type: r.blob.type || 'image/png' })
      );
      const pdfBlob = await processImagesToPdf(cleanFiles, 'a4', 6);
      const pdfName =
        files.length === 1
          ? `${getBaseName(files[0].file.name)}_clean.pdf`
          : `NextStudio_Clean_Documents_${files.length}pages.pdf`;
      downloadBlob(pdfBlob, pdfName);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'PDF তৈরি করা যায়নি।');
    } finally {
      setIsMakingPdf(false);
    }
  };

  const activeModeInfo = REMOVAL_MODES.find((m) => m.id === opts.mode);

  return (
    <div>
      <ToolHeader
        title="ওয়াটারমার্ক রিমুভ (ডকুমেন্ট পরিষ্কার)"
        subtitle="ডকুমেন্ট বা ছবির পেছনের লোগো ও ওয়াটারমার্ক মুছে সাদা করুন — মূল লেখা ১০০% স্পষ্ট ও হাই-কোয়ালিটি থাকবে, সরাসরি ডাউনলোড বা প্রিন্ট করুন।"
        categoryLabel="ছবি ও PDF টুলস"
        onBack={onBack}
      />

      <div className="glass-panel rounded-2xl p-4 sm:p-6 space-y-5">
        {/* Upload Zone */}
        <FileDropzone
          accept="image/*"
          multiple
          title="ডকুমেন্ট বা ছবি বেছে নিন"
          subtitle="একসাথে অনেকগুলো ডকুমেন্ট দিতে পারবেন · ১০০% অফলাইন · মূল রেজোলিউশন অক্ষত থাকে"
          files={files}
          onAddFiles={(newFiles) => {
            const added = createFileItems(newFiles, 'image');
            setFiles((prev) => {
              const next = [...prev, ...added];
              if (prev.length === 0) setActiveFileIndex(0);
              return next;
            });
            setResults([]);
          }}
          onRemoveFile={(id) => {
            setFiles((prev) => {
              const next = prev.filter((f) => f.id !== id);
              setActiveFileIndex((cur) => Math.max(0, Math.min(cur, next.length - 1)));
              return next;
            });
            setResults([]);
          }}
          onClearAll={() => {
            setFiles([]);
            setResults([]);
            setActiveFileIndex(0);
          }}
        />

        {/* Multi-file Preview Selector Tabs (when 2+ files uploaded) */}
        {files.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0 mr-1">
              প্রিভিউ ফাইল:
            </span>
            {files.map((f, idx) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setActiveFileIndex(idx);
                  setOpts((p) => ({ ...p, strokes: [] }));
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer transition ${
                  idx === activeFileIndex
                    ? 'glass-btn-primary text-white'
                    : 'glass-tile text-slate-700 dark:text-slate-200'
                }`}
              >
                {toBnDigits(idx + 1)}. {f.file.name.slice(0, 22)}
              </button>
            ))}
          </div>
        )}

        {/* Interactive Workspace: Controls + Live Before/After Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Controls (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Mode Selector */}
            <div className="space-y-2">
              <div className="text-xs font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>ওয়াটারমার্ক রিমুভ মোড</span>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {REMOVAL_MODES.map((m) => {
                  const active = opts.mode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setOpts((prev) => ({ ...prev, mode: m.id }));
                        if (m.id === 'color-pick') setCanvasTool('pick-color');
                        else if (canvasTool === 'pick-color') setCanvasTool('compare');
                      }}
                      className={`text-left px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                        active
                          ? 'bg-blue-600/12 dark:bg-blue-500/25 text-blue-700 dark:text-blue-300 border border-blue-500/60 shadow-sm'
                          : 'glass-tile text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
              {activeModeInfo && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  {activeModeInfo.hint}
                </p>
              )}
            </div>

            {/* Sampled Watermark Colors (in color-pick mode) */}
            {opts.mode === 'color-pick' && (
              <div className="rounded-xl glass-track p-3 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200">
                  <span>বাছাই করা ওয়াটারমার্কের রং</span>
                  <button
                    type="button"
                    onClick={() => setCanvasTool('pick-color')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer ${
                      canvasTool === 'pick-color'
                        ? 'glass-btn-primary text-white'
                        : 'glass-tile text-blue-600 dark:text-blue-400'
                    }`}
                  >
                    <Pipette className="w-3 h-3" />
                    <span>ছবি থেকে রং নিন</span>
                  </button>
                </div>

                {opts.targetColors.length === 0 ? (
                  <p className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">
                    ডান পাশের প্রিভিউ ছবির ওয়াটারমার্ক বা লোগোর ওপর ক্লিক করুন — সাথে সাথে সেই রং
                    সাদা হয়ে যাবে।
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {opts.targetColors.map((c, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/80 dark:bg-slate-800/80 border border-slate-300/70 dark:border-white/15 text-[11px] font-mono"
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-slate-400/50"
                          style={{ backgroundColor: `rgb(${c.r},${c.g},${c.b})` }}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setOpts((p) => ({
                              ...p,
                              targetColors: p.targetColors.filter((_, i) => i !== idx),
                            }))
                          }
                          className="text-slate-500 hover:text-red-500 cursor-pointer"
                          aria-label="রং বাদ দিন"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    <span>রং ম্যাচিং রেঞ্জ (Tolerance)</span>
                    <span className="font-mono">{toBnDigits(opts.colorTolerance)}%</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={95}
                    value={opts.colorTolerance}
                    onChange={(e) =>
                      setOpts((p) => ({ ...p, colorTolerance: Number(e.target.value) }))
                    }
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Sliders: Strength + Text Crispness */}
            <div className="space-y-3 pt-1">
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-extrabold text-slate-800 dark:text-slate-100">
                  <span>ওয়াটারমার্ক মোছার শক্তি</span>
                  <span className="font-mono text-blue-600 dark:text-blue-400 tabular-nums">
                    {toBnDigits(opts.strength)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={100}
                  value={opts.strength}
                  onChange={(e) => setOpts((p) => ({ ...p, strength: Number(e.target.value) }))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400">
                  <span>হালকা জলছাপ</span>
                  <span>মাঝারি লোগো</span>
                  <span>গাঢ় ওয়াটারমার্ক</span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-extrabold text-slate-800 dark:text-slate-100">
                  <span>লেখা স্পষ্ট ও গাঢ় করুন (Text Clarity)</span>
                  <span className="font-mono text-blue-600 dark:text-blue-400 tabular-nums">
                    {toBnDigits(opts.textCrispness)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={opts.textCrispness}
                  onChange={(e) =>
                    setOpts((p) => ({ ...p, textCrispness: Number(e.target.value) }))
                  }
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              {opts.mode === 'smart-doc' && (
                <label className="glass-tile px-3 py-2 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={opts.preserveColorInk}
                    onChange={(e) =>
                      setOpts((p) => ({ ...p, preserveColorInk: e.target.checked }))
                    }
                    className="accent-blue-600 w-3.5 h-3.5"
                  />
                  <span>গাঢ় রঙিন সিল ও নীল/লাল স্বাক্ষর অক্ষত রাখুন</span>
                </label>
              )}
            </div>

            {/* Output Quality Format */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-800 dark:text-slate-100 block">
                আউটপুট ফরম্যাট ও কোয়ালিটি
              </label>
              <select
                value={opts.outputFormat}
                onChange={(e) =>
                  setOpts((p) => ({
                    ...p,
                    outputFormat: e.target.value as 'image/png' | 'image/jpeg',
                  }))
                }
                className="glass-input w-full px-3 py-2 rounded-xl text-xs font-bold text-slate-900 dark:text-white cursor-pointer"
              >
                <option value="image/png" className="text-slate-900">
                  PNG — সর্বোচ্চ লসলেস কোয়ালিটি (সুপারিশকৃত)
                </option>
                <option value="image/jpeg" className="text-slate-900">
                  JPG — হাই-কোয়ালিটি (৯৮% শার্প)
                </option>
              </select>
            </div>

            {/* Primary Actions: Download, Print, PDF */}
            <div className="space-y-2 pt-2 border-t border-slate-900/8 dark:border-white/10">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={files.length === 0 || isProcessing}
                  onClick={() => void handleProcessAndDownloadSingle()}
                  className="glass-btn-primary px-4 py-2.5 rounded-xl text-white text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : files.length > 1 ? (
                    <Sparkles className="w-4 h-4" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>
                    {files.length > 1
                      ? `সবগুলো প্রসেস (${toBnDigits(files.length)})`
                      : 'হাই-কোয়ালিটি ডাউনলোড'}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={files.length === 0 || isPrinting || isProcessing}
                  onClick={() => void handleDirectPrint()}
                  className="glass-btn-emerald px-4 py-2.5 rounded-xl text-white text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                >
                  {isPrinting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Printer className="w-4 h-4" />
                  )}
                  <span>সরাসরি প্রিন্ট করুন</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={files.length === 0 || isMakingPdf || isProcessing}
                  onClick={() => void handleDownloadPdf()}
                  className="glass-tile px-3 py-2 rounded-xl text-slate-800 dark:text-slate-100 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-45"
                >
                  {isMakingPdf ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FileDown className="w-3.5 h-3.5 text-rose-500" />
                  )}
                  <span>A4 PDF ডাউনলোড</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetAll}
                  className="glass-tile px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>রিসেট করুন</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Live Preview + Brush & Compare Stage (7 cols) */}
          <div className="lg:col-span-7 space-y-3">
            {/* Preview Tool Bar */}
            <div className="glass-track rounded-2xl p-1.5 flex flex-wrap items-center justify-between gap-1.5">
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCanvasTool('compare')}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition ${
                    canvasTool === 'compare'
                      ? 'glass-tab-active text-blue-600 dark:text-blue-400'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>আগে / পরে তুলনা</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCanvasTool('erase')}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition ${
                    canvasTool === 'erase'
                      ? 'glass-tab-active text-blue-600 dark:text-blue-400'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                  title="কোনো গাঢ় লোগো থেকে গেলে হাত দিয়ে মুছে সাদা করুন"
                >
                  <Eraser className="w-3.5 h-3.5" />
                  <span>সাদা ব্রাশ (মুছুন)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCanvasTool('restore')}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition ${
                    canvasTool === 'restore'
                      ? 'glass-tab-active text-blue-600 dark:text-blue-400'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                  title="ডকুমেন্টের ছবি বা সিল আগের মতো ফিরিয়ে আনুন"
                >
                  <Paintbrush className="w-3.5 h-3.5" />
                  <span>আগের অংশ ফেরান</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOpts((p) => ({ ...p, mode: 'color-pick' }));
                    setCanvasTool('pick-color');
                  }}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition ${
                    canvasTool === 'pick-color'
                      ? 'glass-tab-active text-blue-600 dark:text-blue-400'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Pipette className="w-3.5 h-3.5" />
                  <span>রং বাছুন</span>
                </button>
              </div>

              {opts.strokes.length > 0 && (
                <button
                  type="button"
                  onClick={handleUndoStroke}
                  className="glass-tile px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1 cursor-pointer"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span>আনডু ({toBnDigits(opts.strokes.length)})</span>
                </button>
              )}
            </div>

            {/* Brush Size Control when Erase/Restore active */}
            {(canvasTool === 'erase' || canvasTool === 'restore') && (
              <div className="glass-banner rounded-xl px-3.5 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  {canvasTool === 'erase'
                    ? 'সাদা ব্রাশ চালু — ছবির যে অংশে ঘষবেন সেটি সাদা হয়ে যাবে'
                    : 'পুনরুদ্ধার ব্রাশ চালু — ছবির যে অংশে ঘষবেন সেটি মূল ছবির মতো ফিরে আসবে'}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    ব্রাশ সাইজ
                  </span>
                  <input
                    type="range"
                    min={8}
                    max={72}
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    className="w-24 accent-blue-600 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Live Stage Container */}
            <div className="glass-stage rounded-2xl p-3 sm:p-4 min-h-[340px] flex flex-col items-center justify-center">
              {!loadedImage ? (
                <div className="text-center py-12 px-4 space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/12 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
                    লাইভ প্রিভিউ এখানে দেখা যাবে
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                    ওপরে যেকোনো ওয়াটারমার্কযুক্ত ডকুমেন্ট বা ছবি আপলোড করলেই সাথে সাথে আগে ও পরের
                    তুলনা দেখতে পারবেন।
                  </p>
                </div>
              ) : (
                <div className="w-full space-y-3">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300 px-1">
                    <span>
                      মূল রেজোলিউশন: {toBnDigits(loadedImage.naturalWidth)}×
                      {toBnDigits(loadedImage.naturalHeight)} px (কোয়ালিটি অক্ষত)
                    </span>
                    {canvasTool === 'compare' && (
                      <span>বামে: মূল ছবি · ডানে: পরিষ্কার ডকুমেন্ট</span>
                    )}
                  </div>

                  {/* Interactive Image Frame */}
                  <div className="w-full flex justify-center">
                    <div
                      ref={previewStageRef}
                      onPointerDown={handlePointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerCancel={handlePointerUp}
                      className={`relative inline-block max-w-full rounded-xl overflow-hidden shadow-lg border border-slate-300/70 dark:border-white/15 bg-white select-none ${
                        canvasTool === 'pick-color'
                          ? 'cursor-crosshair'
                          : canvasTool === 'erase' || canvasTool === 'restore'
                          ? 'cursor-cell touch-none'
                          : 'cursor-default'
                      }`}
                    >
                      {/* Base Cleaned Image (After) */}
                      <img
                        src={afterUrl || beforeUrl}
                        alt="পরিষ্কার ডকুমেন্ট প্রিভিউ"
                        draggable={false}
                        className="block max-h-[540px] w-auto max-w-full object-contain pointer-events-none"
                      />

                      {/* Before Overlay (Only in Compare Mode) */}
                      {canvasTool === 'compare' && beforeUrl && (
                        <>
                          <img
                            src={beforeUrl}
                            alt="মূল ডকুমেন্ট"
                            draggable={false}
                            style={{ clipPath: `inset(0 ${100 - splitPercent}% 0 0)` }}
                            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                          />
                          <div
                            style={{ left: `${splitPercent}%` }}
                            className="absolute top-0 bottom-0 w-0.5 bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.8)] pointer-events-none"
                          />
                          <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-slate-900/75 text-white text-[10px] font-bold pointer-events-none">
                            আগে (মূল)
                          </span>
                          <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-emerald-600/85 text-white text-[10px] font-bold pointer-events-none">
                            পরে (পরিষ্কার)
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Compare Slider */}
                  {canvasTool === 'compare' && (
                    <div className="flex items-center gap-3 max-w-md mx-auto pt-1">
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 shrink-0">
                        আগে
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={splitPercent}
                        onChange={(e) => setSplitPercent(Number(e.target.value))}
                        className="flex-1 accent-blue-600 cursor-pointer"
                        aria-label="আগে এবং পরের তুলনা স্লাইডার"
                      />
                      <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 shrink-0">
                        পরে
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-900/6 dark:border-white/8">
          <BulkZipNotice text="বাল্ক ও হাই-কোয়ালিটি চালু — মূল রেজোলিউশন অক্ষত রেখে ডাউনলোড, PDF বা সরাসরি প্রিন্ট করুন" />
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-2.5 text-xs font-semibold text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <ProcessedResultsList
        results={results}
        zipFileName="NextStudio_Watermark_Removed_Docs.zip"
        onClear={() => setResults([])}
        title="ওয়াটারমার্ক মুক্ত হাই-কোয়ালিটি ডকুমেন্ট"
      />
    </div>
  );
};
