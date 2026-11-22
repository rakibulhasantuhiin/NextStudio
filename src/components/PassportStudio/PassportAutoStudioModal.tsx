import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Brush,
  Camera,
  Check,
  Eraser,
  Eye,
  FlipHorizontal,
  Loader2,
  Move,
  Palette,
  RotateCcw,
  RotateCw,
  Sliders,
  Sparkles,
  Sun,
  Undo2,
  UserCheck,
  Users,
  Wand2,
  X,
  ZoomIn,
} from 'lucide-react';
import {
  DEFAULT_PASSPORT_STUDIO_OPTIONS,
  MaskBrushStroke,
  PassportBgMode,
  PassportStudioOptions,
  PortraitAutoAnalysis,
  STUDIO_BG_PRESETS,
  analyzePortraitForPassport,
  loadStudioImage,
  renderPassportStudioImage,
} from '../../utils/passportAutoStudio';

export interface PassportAutoStudioInputItem {
  id?: string;
  src: string;
  editIndex?: number;
  initialBgMode?: PassportBgMode;
}

export interface PassportAutoStudioOutputItem {
  originalSrc: string;
  processedSrc: string;
  editIndex?: number;
  bgMode: PassportBgMode;
  customBgColor: string;
  rotation: number;
  brightness: number;
  contrast: number;
  warmth: number;
  sharpness: number;
}

interface PassportAutoStudioModalProps {
  isOpen: boolean;
  lang: 'en' | 'bn';
  items: PassportAutoStudioInputItem[];
  targetAspectRatio?: number; // e.g., 35/45 for Bangladesh Passport
  onClose: () => void;
  onConfirm: (results: PassportAutoStudioOutputItem[]) => void;
  onOpenWebcam?: () => void;
  onConvertToCouple?: (leftSrc: string, rightSrc: string) => void;
}

interface ItemStudioState {
  options: PassportStudioOptions;
  strokes: MaskBrushStroke[];
  analysis: PortraitAutoAnalysis | null;
  previewUrl: string | null;
  analyzed: boolean;
}

type ControlSectionTab = 'bg-light' | 'straighten' | 'brush';

export const PassportAutoStudioModal: React.FC<PassportAutoStudioModalProps> = ({
  isOpen,
  lang,
  items,
  targetAspectRatio = 35 / 45,
  onClose,
  onConfirm,
  onOpenWebcam,
  onConvertToCouple,
}) => {
  const isBn = lang === 'bn';

  const [activeIdx, setActiveIdx] = useState<number>(0);
  const [itemStates, setItemStates] = useState<ItemStudioState[]>([]);
  const [activeTab, setActiveTab] = useState<ControlSectionTab>('bg-light');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [showBefore, setShowBefore] = useState<boolean>(false);
  const [showPassportGuide, setShowPassportGuide] = useState<boolean>(true);

  // Brush touch-up tool state
  const [toolMode, setToolMode] = useState<'pan' | 'keep' | 'erase'>('pan');
  const [brushSize, setBrushSize] = useState<number>(28); // px on preview
  const isPointerDownRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const activeStrokeRef = useRef<MaskBrushStroke | null>(null);
  const previewWrapRef = useRef<HTMLDivElement | null>(null);

  // Cache loaded HTMLImageElements by src so switching/adjusting is instant
  const imgCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const renderTimerRef = useRef<number | null>(null);

  // Initialize queue state when modal opens with new items
  useEffect(() => {
    if (!isOpen || items.length === 0) return;

    setActiveIdx(0);
    setShowBefore(false);
    setToolMode('pan');
    setActiveTab('bg-light');

    const initial: ItemStudioState[] = items.map((item) => ({
      options: {
        ...DEFAULT_PASSPORT_STUDIO_OPTIONS,
        bgMode: item.initialBgMode ?? 'studio-blue',
        aspectRatio: targetAspectRatio || 35 / 45,
      },
      strokes: [],
      analysis: null,
      previewUrl: null,
      analyzed: false,
    }));
    setItemStates(initial);

    let cancelled = false;

    const runInitialAutoAnalysis = async () => {
      setIsAnalyzing(true);
      try {
        for (let i = 0; i < items.length; i++) {
          if (cancelled) return;
          const src = items[i].src;
          let img = imgCacheRef.current.get(src);
          if (!img) {
            img = await loadStudioImage(src);
            imgCacheRef.current.set(src, img);
          }

          const analysis = await analyzePortraitForPassport(img, targetAspectRatio || 35 / 45);
          if (cancelled) return;

          const autoOpts: PassportStudioOptions = {
            ...DEFAULT_PASSPORT_STUDIO_OPTIONS,
            bgMode: items[i].initialBgMode ?? 'studio-blue',
            aspectRatio: targetAspectRatio || 35 / 45,
            rotation: analysis.autoRotation,
            zoom: analysis.autoZoom,
            panX: analysis.autoPanX,
            panY: analysis.autoPanY,
            brightness: analysis.autoBrightness,
          };

          const rendered = renderPassportStudioImage(img, autoOpts, [], 440);
          if (cancelled) return;

          setItemStates((prev) =>
            prev.map((st, idx) =>
              idx === i
                ? {
                    ...st,
                    options: autoOpts,
                    analysis,
                    previewUrl: rendered.dataUrl,
                    analyzed: true,
                  }
                : st
            )
          );
        }
      } catch (err) {
        console.error('Passport auto analysis error:', err);
      } finally {
        if (!cancelled) setIsAnalyzing(false);
      }
    };

    void runInitialAutoAnalysis();
    return () => {
      cancelled = true;
    };
  }, [isOpen, items, targetAspectRatio]);

  const currentItem = items[activeIdx];
  const currentState = itemStates[activeIdx];

  // Re-render live preview smoothly whenever options or brush strokes change
  const schedulePreviewRender = useCallback(
    (idx: number, opts: PassportStudioOptions, strokes: MaskBrushStroke[]) => {
      const targetSrc = items[idx]?.src;
      if (!targetSrc) return;
      if (renderTimerRef.current) window.clearTimeout(renderTimerRef.current);

      setIsRendering(true);
      renderTimerRef.current = window.setTimeout(async () => {
        try {
          let img = imgCacheRef.current.get(targetSrc);
          if (!img) {
            img = await loadStudioImage(targetSrc);
            imgCacheRef.current.set(targetSrc, img);
          }
          const rendered = renderPassportStudioImage(img, opts, strokes, 440);
          setItemStates((prev) =>
            prev.map((st, i) => (i === idx ? { ...st, previewUrl: rendered.dataUrl } : st))
          );
        } catch (err) {
          console.error('Preview render failed:', err);
        } finally {
          setIsRendering(false);
        }
      }, 65);
    },
    [items]
  );

  const updateCurrentOptions = useCallback(
    (patch: Partial<PassportStudioOptions>) => {
      setItemStates((prev) => {
        const cur = prev[activeIdx];
        if (!cur) return prev;
        const nextOpts = { ...cur.options, ...patch };
        schedulePreviewRender(activeIdx, nextOpts, cur.strokes);
        return prev.map((st, i) => (i === activeIdx ? { ...st, options: nextOpts } : st));
      });
    },
    [activeIdx, schedulePreviewRender]
  );

  const handleAutoFitAndStraighten = () => {
    if (!currentState?.analysis) return;
    const a = currentState.analysis;
    updateCurrentOptions({
      baseRotation: 0,
      rotation: a.autoRotation,
      zoom: a.autoZoom,
      panX: a.autoPanX,
      panY: a.autoPanY,
      flipH: false,
      brightness: a.autoBrightness,
      contrast: 8,
      warmth: 4,
      autoStudioLight: true,
    });
  };

  const handleUndoStroke = () => {
    setItemStates((prev) => {
      const cur = prev[activeIdx];
      if (!cur || cur.strokes.length === 0) return prev;
      const nextStrokes = cur.strokes.slice(0, -1);
      schedulePreviewRender(activeIdx, cur.options, nextStrokes);
      return prev.map((st, i) => (i === activeIdx ? { ...st, strokes: nextStrokes } : st));
    });
  };

  const handleClearStrokes = () => {
    setItemStates((prev) => {
      const cur = prev[activeIdx];
      if (!cur || cur.strokes.length === 0) return prev;
      schedulePreviewRender(activeIdx, cur.options, []);
      return prev.map((st, i) => (i === activeIdx ? { ...st, strokes: [] } : st));
    });
  };

  // Interactive Pointer Handlers on Preview Canvas (Pan OR Brush Touch-up)
  const getNormalizedPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = previewWrapRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return null;
    return {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
      rectW: rect.width,
      rectH: rect.height,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!currentState || showBefore) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    isPointerDownRef.current = true;

    if (toolMode === 'pan') {
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        panX: currentState.options.panX,
        panY: currentState.options.panY,
      };
    } else {
      const pt = getNormalizedPointer(e);
      if (!pt) return;
      activeStrokeRef.current = {
        mode: toolMode,
        radius: Math.max(0.015, brushSize / (pt.rectW * 2)),
        points: [{ x: pt.x, y: pt.y }],
      };
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current || !currentState) return;

    if (toolMode === 'pan' && dragStartRef.current) {
      const rect = previewWrapRef.current?.getBoundingClientRect();
      if (!rect) return;
      const dx = (e.clientX - dragStartRef.current.x) / rect.width;
      const dy = (e.clientY - dragStartRef.current.y) / rect.height;
      const nextPanX = Math.max(-0.7, Math.min(0.7, dragStartRef.current.panX + dx));
      const nextPanY = Math.max(-0.7, Math.min(0.7, dragStartRef.current.panY + dy));
      updateCurrentOptions({ panX: nextPanX, panY: nextPanY });
    } else if (activeStrokeRef.current) {
      const pt = getNormalizedPointer(e);
      if (!pt) return;
      const pts = activeStrokeRef.current.points;
      const last = pts[pts.length - 1];
      if (!last || Math.hypot(pt.x - last.x, pt.y - last.y) > 0.01) {
        pts.push({ x: pt.x, y: pt.y });
      }
    }
  };

  const handlePointerUp = () => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;
    dragStartRef.current = null;

    if (activeStrokeRef.current) {
      const finished = activeStrokeRef.current;
      activeStrokeRef.current = null;
      setItemStates((prev) => {
        const cur = prev[activeIdx];
        if (!cur) return prev;
        const nextStrokes = [...cur.strokes, finished];
        schedulePreviewRender(activeIdx, cur.options, nextStrokes);
        return prev.map((st, i) => (i === activeIdx ? { ...st, strokes: nextStrokes } : st));
      });
    }
  };

  // Final High-Resolution 600 DPI Print Export -> Load straight onto Print Sheet!
  const handleConfirmAndLoadToPrint = async (useOriginalUntouched = false) => {
    if (items.length === 0 || isExporting) return;
    setIsExporting(true);
    try {
      const outputs: PassportAutoStudioOutputItem[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const st = itemStates[i];
        const opts: PassportStudioOptions = st?.options ?? {
          ...DEFAULT_PASSPORT_STUDIO_OPTIONS,
          aspectRatio: targetAspectRatio || 35 / 45,
        };

        if (useOriginalUntouched) {
          outputs.push({
            originalSrc: item.src,
            processedSrc: item.src,
            editIndex: item.editIndex,
            bgMode: 'original',
            customBgColor: opts.customBgColor,
            rotation: 0,
            brightness: 0,
            contrast: 0,
            warmth: 0,
            sharpness: 0,
          });
          continue;
        }

        let img = imgCacheRef.current.get(item.src);
        if (!img) {
          img = await loadStudioImage(item.src);
          imgCacheRef.current.set(item.src, img);
        }

        // Export crisp 840px wide (~600 DPI for 35x45 mm!) print-grade studio image
        const hiRes = renderPassportStudioImage(img, opts, st?.strokes ?? [], 840);

        outputs.push({
          originalSrc: item.src,
          processedSrc: hiRes.dataUrl,
          editIndex: item.editIndex,
          bgMode: opts.bgMode,
          customBgColor: opts.customBgColor,
          rotation: opts.baseRotation + opts.rotation,
          brightness: opts.brightness,
          contrast: opts.contrast,
          warmth: opts.warmth,
          sharpness: opts.sharpness,
        });
      }

      onConfirm(outputs);
    } catch (err) {
      console.error('Failed to export studio passport photo:', err);
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen || items.length === 0 || !currentItem || !currentState) return null;

  const opts = currentState.options;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-1.5 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-5xl glass-modal rounded-2xl flex flex-col max-h-[96vh] sm:max-h-[93vh] overflow-hidden shadow-2xl">
        {/* Top Header */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-slate-200/60 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-sky-500 text-white flex items-center justify-center shadow-sm shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-tight truncate">
                  {isBn
                    ? 'স্মার্ট অটো পাসপোর্ট স্টুডিও (১০০% অফলাইন)'
                    : 'Smart Auto Passport Studio (100% Offline)'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/25">
                  {isBn ? 'প্রিন্ট কোয়ালিটি HD' : 'Print HD 600 DPI'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {isBn
                  ? 'অটো সোজা, উজ্জ্বল মুখ, পরিপাটি চুল ও নীল/সাদা ব্যাকগ্রাউন্ড — ওকে চাপলেই প্রিন্ট পেজে লোড হবে'
                  : 'Auto-straightened posture, bright natural face, crisp hair & Studio Blue / White backdrop — press OK to load onto Print Sheet'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onOpenWebcam && (
              <button
                type="button"
                onClick={onOpenWebcam}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-tile text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                title={isBn ? 'ওয়েবক্যাম থেকে নতুন ছবি তুলুন' : 'Capture new photo from webcam'}
              >
                <Camera className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>{isBn ? 'ওয়েবক্যাম' : 'Webcam'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/10 transition cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Multi-photo queue bar (if more than 1 uploaded) */}
        {items.length > 1 && (
          <div className="px-4 py-2 border-b border-slate-200/50 dark:border-white/10 bg-slate-100/60 dark:bg-slate-900/50 flex items-center gap-2 overflow-x-auto shrink-0">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0">
              {isBn ? `ছবি (${items.length}টি):` : `Photos (${items.length}):`}
            </span>
            {items.map((it, i) => {
              const st = itemStates[i];
              const isSel = i === activeIdx;
              return (
                <button
                  key={it.id ?? i}
                  type="button"
                  onClick={() => setActiveIdx(i)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-xl border text-xs font-bold shrink-0 cursor-pointer transition ${
                    isSel
                      ? 'border-blue-600 bg-blue-500/15 text-blue-700 dark:text-blue-300'
                      : 'border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <img
                    src={st?.previewUrl || it.src}
                    alt=""
                    className="w-6 h-7 object-cover rounded"
                  />
                  <span>#{i + 1}</span>
                </button>
              );
            })}
            {onConvertToCouple && items.length >= 2 && (
              <button
                type="button"
                onClick={() => onConvertToCouple(items[0].src, items[1].src)}
                className="ml-auto px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shrink-0 cursor-pointer transition"
              >
                <Users className="w-3.5 h-3.5" />
                <span>
                  {isBn
                    ? 'একসাথে কাপল পাসপোর্ট বানান (ছেলে বামে + মেয়ে ডানে • ৯০°)'
                    : 'Join as Couple Passport (Boy Left + Girl Right • 90°)'}
                </span>
              </button>
            )}
          </div>
        )}

        {/* Main Workspace: Left Interactive Passport Preview, Right Smart Studio Controls */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-y-auto min-h-0">
          {/* LEFT: Live Ready-to-Print Passport Preview */}
          <div className="lg:col-span-6 bg-slate-950 p-3 sm:p-5 flex flex-col items-center justify-center relative select-none min-h-[300px]">
            {/* Top floating preview toolbar */}
            <div className="w-full flex items-center justify-between gap-2 mb-3 z-10">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onMouseDown={() => setShowBefore(true)}
                  onMouseUp={() => setShowBefore(false)}
                  onMouseLeave={() => setShowBefore(false)}
                  onTouchStart={() => setShowBefore(true)}
                  onTouchEnd={() => setShowBefore(false)}
                  onClick={() => setShowBefore((b) => !b)}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer transition ${
                    showBefore
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-900/90 text-slate-200 border border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>
                    {showBefore
                      ? isBn
                        ? 'আসল ছবি দেখছেন'
                        : 'Viewing Original'
                      : isBn
                      ? 'আগের / পরের তুলনা'
                      : 'Before / After'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPassportGuide((g) => !g)}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer transition ${
                    showPassportGuide
                      ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50'
                      : 'bg-slate-900/90 text-slate-400 border border-slate-700'
                  }`}
                >
                  {isBn ? 'সোজা গাইড' : 'Straight Guide'}
                </button>
              </div>

              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[10px] font-bold">
                {opts.bgMode === 'studio-blue'
                  ? isBn
                    ? 'নীল ব্যাকগ্রাউন্ড (ডিফল্ট)'
                    : 'Studio Blue (Default)'
                  : opts.bgMode === 'white'
                  ? isBn
                    ? 'সাদা ব্যাকগ্রাউন্ড'
                    : 'Pure White BG'
                  : opts.bgMode === 'original'
                  ? isBn
                    ? 'আসল ব্যাকগ্রাউন্ড'
                    : 'Original BG'
                  : isBn
                  ? 'কাস্টম ব্যাকগ্রাউন্ড'
                  : 'Studio Backdrop'}
              </span>
            </div>

            {/* Interactive Passport Aspect Frame */}
            <div
              ref={previewWrapRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{ aspectRatio: `${opts.aspectRatio || 35 / 45}` }}
              className={`relative w-full max-w-[265px] sm:max-w-[300px] rounded-xl overflow-hidden border-2 border-white/25 shadow-[0_18px_50px_rgba(0,0,0,0.65)] bg-slate-900 touch-none ${
                toolMode === 'pan'
                  ? 'cursor-grab active:cursor-grabbing'
                  : 'cursor-crosshair'
              }`}
            >
              <img
                src={showBefore ? currentItem.src : currentState.previewUrl || currentItem.src}
                alt="Passport Preview"
                draggable={false}
                className="w-full h-full object-cover pointer-events-none"
              />

              {/* Subtle Passport Head & Eye Alignment Guide */}
              {showPassportGuide && !showBefore && (
                <svg
                  viewBox="0 0 350 450"
                  className="pointer-events-none absolute inset-0 w-full h-full opacity-55"
                  fill="none"
                >
                  {/* Top headroom line (~11%) */}
                  <line
                    x1="20"
                    y1="48"
                    x2="330"
                    y2="48"
                    stroke="rgba(255,255,255,0.65)"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  {/* Eye level guide (~42% from top) */}
                  <line
                    x1="35"
                    y1="186"
                    x2="315"
                    y2="186"
                    stroke="rgba(255,255,255,0.75)"
                    strokeWidth="1.2"
                    strokeDasharray="5 5"
                  />
                  {/* Vertical face center symmetry line */}
                  <line
                    x1="175"
                    y1="20"
                    x2="175"
                    y2="430"
                    stroke="rgba(255,255,255,0.45)"
                    strokeWidth="1"
                    strokeDasharray="4 5"
                  />
                </svg>
              )}

              {/* Scanning / Processing Overlay */}
              {(isAnalyzing || isRendering) && (
                <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2 text-white">
                  <Loader2 className="w-7 h-7 animate-spin text-blue-400" />
                  <span className="text-xs font-bold px-3 text-center">
                    {isAnalyzing
                      ? isBn
                        ? 'অটো সোজা, মুখ উজ্জ্বল ও নীল ব্যাকগ্রাউন্ড তৈরি হচ্ছে...'
                        : 'Auto-straightening, lighting face & applying Studio Blue...'
                      : isBn
                      ? 'আপডেট হচ্ছে...'
                      : 'Updating preview...'}
                  </span>
                </div>
              )}
            </div>

            {/* Bottom Interactive Mode Hint & Quick Rotate */}
            <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setToolMode('pan')}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer transition ${
                  toolMode === 'pan'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-900 text-slate-300 border border-slate-700 hover:bg-slate-800'
                }`}
              >
                <Move className="w-3.5 h-3.5" />
                <span>{isBn ? 'টেনে সরান' : 'Drag to Position'}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  updateCurrentOptions({ baseRotation: (opts.baseRotation + 90) % 360 })
                }
                className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-200 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>90°</span>
              </button>

              <button
                type="button"
                onClick={() => updateCurrentOptions({ flipH: !opts.flipH })}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer ${
                  opts.flipH
                    ? 'bg-blue-600/40 text-blue-300 border border-blue-500/50'
                    : 'bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800'
                }`}
              >
                <FlipHorizontal className="w-3.5 h-3.5" />
                <span>{isBn ? 'ফ্লিপ' : 'Flip'}</span>
              </button>

              <button
                type="button"
                onClick={handleAutoFitAndStraighten}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-600/25 border border-emerald-500/45 hover:bg-emerald-600/35 text-emerald-300 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>{isBn ? 'অটো সোজা ও ফিট' : 'Auto Straighten'}</span>
              </button>
            </div>
          </div>

          {/* RIGHT: Smart Studio Controls */}
          <div className="lg:col-span-6 p-4 sm:p-5 flex flex-col bg-white/55 dark:bg-slate-950/45 border-t lg:border-t-0 lg:border-l border-slate-200/60 dark:border-white/10">
            {/* Control Tabs */}
            <div className="grid grid-cols-3 rounded-xl glass-track p-1 mb-4 text-xs font-bold gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('bg-light')}
                className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition ${
                  activeTab === 'bg-light'
                    ? 'glass-tab-active'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Palette className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{isBn ? 'ব্যাকগ্রাউন্ড ও আলো' : 'BG & Lighting'}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('straighten')}
                className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition ${
                  activeTab === 'straighten'
                    ? 'glass-tab-active'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Sliders className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{isBn ? 'সোজা ও জুম' : 'Straight & Zoom'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('brush');
                  setToolMode('keep');
                }}
                className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition ${
                  activeTab === 'brush'
                    ? 'glass-tab-active'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Brush className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{isBn ? 'টাচ-আপ ব্রাশ' : 'Touch-Up'}</span>
              </button>
            </div>

            {/* TAB 1: BACKGROUND & STUDIO LIGHTING */}
            {activeTab === 'bg-light' && (
              <div className="space-y-4">
                {/* Background Color Selector (Blue Default + White Manual + More) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                      {isBn ? 'ব্যাকগ্রাউন্ড কালার (ডিফল্ট নীল)' : 'Studio Background (Blue Default)'}
                    </span>
                    <label className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={opts.studioBackdropGlow}
                        onChange={(e) =>
                          updateCurrentOptions({ studioBackdropGlow: e.target.checked })
                        }
                        className="accent-blue-600"
                      />
                      <span>{isBn ? 'স্টুডিও গ্লো' : 'Studio Glow'}</span>
                    </label>
                  </div>

                  {/* Primary Big 2 Buttons: Studio Blue & Pure White */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => updateCurrentOptions({ bgMode: 'studio-blue' })}
                      className={`p-2.5 rounded-xl border flex items-center gap-2.5 text-left transition cursor-pointer ${
                        opts.bgMode === 'studio-blue'
                          ? 'border-blue-600 bg-blue-600/12 dark:bg-blue-500/20 ring-2 ring-blue-500/30'
                          : 'glass-tile'
                      }`}
                    >
                      <span className="w-7 h-7 rounded-lg bg-[#1273F2] border border-white/60 shadow-inner shrink-0 flex items-center justify-center text-white">
                        {opts.bgMode === 'studio-blue' && <Check className="w-4 h-4" />}
                      </span>
                      <div className="min-w-0">
                        <span className="block text-xs font-extrabold text-slate-900 dark:text-white truncate">
                          {isBn ? 'পাসপোর্ট নীল' : 'Passport Blue'}
                        </span>
                        <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                          {isBn ? 'ডিফল্ট (বিডি স্টুডিও)' : 'Default Studio Blue'}
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => updateCurrentOptions({ bgMode: 'white' })}
                      className={`p-2.5 rounded-xl border flex items-center gap-2.5 text-left transition cursor-pointer ${
                        opts.bgMode === 'white'
                          ? 'border-blue-600 bg-blue-600/12 dark:bg-blue-500/20 ring-2 ring-blue-500/30'
                          : 'glass-tile'
                      }`}
                    >
                      <span className="w-7 h-7 rounded-lg bg-white border border-slate-300 shadow-inner shrink-0 flex items-center justify-center text-blue-600">
                        {opts.bgMode === 'white' && <Check className="w-4 h-4" />}
                      </span>
                      <div className="min-w-0">
                        <span className="block text-xs font-extrabold text-slate-900 dark:text-white truncate">
                          {isBn ? 'সাদা (White)' : 'Pure White'}
                        </span>
                        <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                          {isBn ? 'ই-পাসপোর্ট ও ভিসা' : 'e-Passport & Visa'}
                        </span>
                      </div>
                    </button>
                  </div>

                  {/* Additional Quick Swatches + Custom Picker */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {STUDIO_BG_PRESETS.filter(
                      (p) => p.id !== 'studio-blue' && p.id !== 'white'
                    ).map((p) => {
                      const active = opts.bgMode === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => updateCurrentOptions({ bgMode: p.id })}
                          className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer transition ${
                            active
                              ? 'bg-blue-600/15 border border-blue-500/60 text-blue-700 dark:text-blue-300'
                              : 'glass-tile text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          <span
                            className={`w-3.5 h-3.5 rounded-full border border-black/15 shrink-0 ${p.swatchClass}`}
                          />
                          <span>{isBn ? p.labelBn : p.labelEn}</span>
                        </button>
                      );
                    })}

                    <label
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer transition ${
                        opts.bgMode === 'custom'
                          ? 'bg-blue-600/15 border border-blue-500/60 text-blue-700 dark:text-blue-300'
                          : 'glass-tile text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <input
                        type="color"
                        value={opts.customBgColor}
                        onChange={(e) =>
                          updateCurrentOptions({
                            bgMode: 'custom',
                            customBgColor: e.target.value,
                          })
                        }
                        className="w-4 h-4 rounded border-0 bg-transparent cursor-pointer p-0"
                      />
                      <span>{isBn ? 'কাস্টম' : 'Custom'}</span>
                    </label>
                  </div>
                </div>

                {/* Smart Studio Softbox Face Relighting */}
                <div className="p-3 rounded-xl glass-track space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <label className="inline-flex items-center gap-2 text-xs font-extrabold text-slate-900 dark:text-white cursor-pointer">
                      <input
                        type="checkbox"
                        checked={opts.autoStudioLight}
                        onChange={(e) =>
                          updateCurrentOptions({ autoStudioLight: e.target.checked })
                        }
                        className="accent-blue-600 w-4 h-4"
                      />
                      <Sun className="w-3.5 h-3.5 text-amber-500" />
                      <span>
                        {isBn
                          ? 'স্মার্ট স্টুডিও লাইটিং (মুখ উজ্জ্বল, চেহারা অক্ষত)'
                          : 'Smart Studio Face Lighting (Natural Skin)'}
                      </span>
                    </label>
                  </div>

                  {/* Brightness */}
                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                      <span>{isBn ? 'মুখের উজ্জ্বলতা (Brightness)' : 'Face Brightness'}</span>
                      <span className="font-mono text-blue-600 dark:text-blue-400">
                        {opts.brightness > 0 ? `+${opts.brightness}` : opts.brightness}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-35}
                      max={55}
                      value={opts.brightness}
                      onChange={(e) =>
                        updateCurrentOptions({ brightness: Number(e.target.value) })
                      }
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>

                  {/* Contrast & Clarity Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                        <span>{isBn ? 'কনট্রাস্ট' : 'Contrast'}</span>
                        <span className="font-mono text-blue-600 dark:text-blue-400">
                          {opts.contrast > 0 ? `+${opts.contrast}` : opts.contrast}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={-25}
                        max={35}
                        value={opts.contrast}
                        onChange={(e) =>
                          updateCurrentOptions({ contrast: Number(e.target.value) })
                        }
                        className="w-full accent-blue-600 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                        <span>{isBn ? 'শার্পনেস (চুল/চোখ)' : 'Crispness'}</span>
                        <span className="font-mono text-blue-600 dark:text-blue-400">
                          {opts.sharpness}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={85}
                        value={opts.sharpness}
                        onChange={(e) =>
                          updateCurrentOptions({ sharpness: Number(e.target.value) })
                        }
                        className="w-full accent-blue-600 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Background Cutout Precision (only when BG replaced) */}
                  {opts.bgMode !== 'original' && (
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/60 dark:border-white/10">
                      <div>
                        <div className="flex justify-between text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                          <span>{isBn ? 'ব্যাকগ্রাউন্ড কাটআউট' : 'BG Sensitivity'}</span>
                          <span className="font-mono text-blue-600 dark:text-blue-400">
                            {opts.bgSensitivity}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={18}
                          max={85}
                          value={opts.bgSensitivity}
                          onChange={(e) =>
                            updateCurrentOptions({ bgSensitivity: Number(e.target.value) })
                          }
                          className="w-full accent-blue-600 cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                          <span>{isBn ? 'চুল ও এজ ক্লিন' : 'Hair Edge Clean'}</span>
                          <span className="font-mono text-blue-600 dark:text-blue-400">
                            {opts.hairEdgeClean}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={opts.hairEdgeClean}
                          onChange={(e) =>
                            updateCurrentOptions({ hairEdgeClean: Number(e.target.value) })
                          }
                          className="w-full accent-blue-600 cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: STRAIGHTEN, ZOOM & FRAMING */}
            {activeTab === 'straighten' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl glass-track space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>
                        {isBn ? 'মাথা ও বডি সোজা করুন' : 'Straighten Head & Posture'}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={handleAutoFitAndStraighten}
                      className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      {isBn ? 'অটো ফিট রিসেট' : 'Re-run Auto Fit'}
                    </button>
                  </div>

                  {/* Fine Tilt Straighten */}
                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                      <span>{isBn ? 'বাঁকা সোজা (Tilt Angle)' : 'Fine Straighten Angle'}</span>
                      <span className="font-mono text-blue-600 dark:text-blue-400">
                        {opts.rotation > 0 ? `+${opts.rotation.toFixed(1)}°` : `${opts.rotation.toFixed(1)}°`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-25}
                      max={25}
                      step={0.5}
                      value={opts.rotation}
                      onChange={(e) =>
                        updateCurrentOptions({ rotation: Number(e.target.value) })
                      }
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>-25°</span>
                      <button
                        type="button"
                        onClick={() => updateCurrentOptions({ rotation: 0 })}
                        className="hover:text-blue-500 cursor-pointer"
                      >
                        0°
                      </button>
                      <span>+25°</span>
                    </div>
                  </div>

                  {/* Zoom */}
                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                      <span className="inline-flex items-center gap-1">
                        <ZoomIn className="w-3.5 h-3.5" />
                        <span>{isBn ? 'জুম / কাছে-দূরে' : 'Portrait Zoom'}</span>
                      </span>
                      <span className="font-mono text-blue-600 dark:text-blue-400">
                        {Math.round(opts.zoom * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={70}
                      max={210}
                      step={1}
                      value={Math.round(opts.zoom * 100)}
                      onChange={(e) =>
                        updateCurrentOptions({ zoom: Number(e.target.value) / 100 })
                      }
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>

                  {/* Skin Warmth */}
                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                      <span>{isBn ? 'ত্বকের উষ্ণতা (Warmth)' : 'Skin Warmth'}</span>
                      <span className="font-mono text-blue-600 dark:text-blue-400">
                        {opts.warmth > 0 ? `+${opts.warmth}` : opts.warmth}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-25}
                      max={25}
                      value={opts.warmth}
                      onChange={(e) => updateCurrentOptions({ warmth: Number(e.target.value) })}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    {isBn
                      ? 'টিপস: বাম পাশের ছবির ওপর মাউস বা আঙুল দিয়ে টেনে মাথা ও কাঁধকে মাঝখানের গাইড লাইনের সাথে একদম সোজা মিলিয়ে নিতে পারবেন।'
                      : 'Tip: Drag directly on the left preview image to center your head & shoulders cleanly along the straight guide lines.'}
                  </p>
                </div>
              </div>
            )}

            {/* TAB 3: TOUCH-UP BRUSH (Keep Person / Erase BG) */}
            {activeTab === 'brush' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl glass-track space-y-3">
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {isBn
                      ? 'পোশাক বা চুলের কোনো অংশ বাদ পড়লে "মানুষ রাখুন" ব্রাশ দিয়ে ঘষুন, আর ব্যাকগ্রাউন্ডের কোনো দাগ থাকলে "ব্যাকগ্রাউন্ড মুছুন" দিয়ে পরিষ্কার করুন।'
                      : 'Swipe with "Keep Person" to restore any shirt/hair detail, or use "Erase BG" to clean up any leftover background spots.'}
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setToolMode('keep')}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                        toolMode === 'keep'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'glass-tile text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <Brush className="w-3.5 h-3.5" />
                      <span>{isBn ? 'মানুষ / পোশাক রাখুন' : 'Keep Person / Shirt'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setToolMode('erase')}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                        toolMode === 'erase'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'glass-tile text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <Eraser className="w-3.5 h-3.5" />
                      <span>{isBn ? 'ব্যাকগ্রাউন্ড মুছুন' : 'Erase Background'}</span>
                    </button>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                      <span>{isBn ? 'ব্রাশ সাইজ' : 'Brush Size'}</span>
                      <span className="font-mono text-blue-600 dark:text-blue-400">
                        {brushSize} px
                      </span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={64}
                      value={brushSize}
                      onChange={(e) => setBrushSize(Number(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={currentState.strokes.length === 0}
                      onClick={handleUndoStroke}
                      className="glass-tile px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                      <span>{isBn ? 'আন্ডু' : 'Undo Brush'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={currentState.strokes.length === 0}
                      onClick={handleClearStrokes}
                      className="glass-tile px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{isBn ? 'ব্রাশ রিসেট' : 'Reset Brush'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Primary Action Footer */}
            <div className="mt-auto pt-4 mt-4 border-t border-slate-200/60 dark:border-white/10 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={() => void handleConfirmAndLoadToPrint(true)}
                  className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white underline cursor-pointer"
                >
                  {isBn ? 'আসল ছবিটাই ব্যবহার করুন' : 'Use original photo as-is'}
                </button>

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3.5 py-2 rounded-xl glass-tile text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    {isBn ? 'বাতিল' : 'Cancel'}
                  </button>

                  <button
                    type="button"
                    disabled={isExporting || isAnalyzing}
                    onClick={() => void handleConfirmAndLoadToPrint(false)}
                    className="px-5 py-2.5 rounded-xl glass-btn-emerald text-white text-xs sm:text-sm font-extrabold inline-flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-lg"
                  >
                    {isExporting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    <span>
                      {isExporting
                        ? isBn
                          ? 'প্রিন্ট পেজে লোড হচ্ছে...'
                          : 'Loading to Print Page...'
                        : items.length > 1
                        ? isBn
                          ? `ওকে — সব (${items.length}টি) প্রিন্ট পেজে লোড করুন`
                          : `OK — Load All (${items.length}) to Print Page`
                        : isBn
                        ? 'ওকে — প্রিন্ট পেজে লোড করুন'
                        : 'OK — Load to Print Page'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
