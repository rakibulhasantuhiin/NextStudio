import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowUp,
  Check,
  FlipHorizontal,
  Layers,
  Loader2,
  Move,
  Palette,
  RotateCcw,
  RotateCw,
  Sparkles,
  Upload,
  User,
  Users,
  X,
} from 'lucide-react';
import { PhotoPresetType, StudioPhotoItem } from '../../types';
import {
  CoupleOutputAngle,
  CouplePersonSettings,
  CoupleSizeVariant,
  CoupleStudioSettings,
  DEFAULT_COUPLE_PERSON,
  DEFAULT_COUPLE_STUDIO,
  autoPrepareCouplePerson,
  renderCouplePassportComposite,
  resolveCoupleOutputDimensions,
} from '../../utils/couplePhotoEngine';
import {
  PassportBgMode,
  STUDIO_BG_PRESETS,
  loadStudioImage,
} from '../../utils/passportAutoStudio';

export interface CouplePassportResult {
  originalSrc: string; // upright couple preview (0°)
  processedSrc: string; // print-ready (default 90° rotated)
  bgMode: PassportBgMode;
  customBgColor: string;
  physicalWidthMm: number;
  physicalHeightMm: number;
  recommendedPreset: PhotoPresetType;
  outputAngle: CoupleOutputAngle;
}

interface CouplePassportModalProps {
  isOpen: boolean;
  lang: 'en' | 'bn';
  initialLeftSrc?: string | null;
  initialRightSrc?: string | null;
  existingPhotos?: StudioPhotoItem[];
  onClose: () => void;
  onConfirm: (result: CouplePassportResult) => void;
}

type CoupleTab = 'studio' | 'left' | 'right';

export const CouplePassportModal: React.FC<CouplePassportModalProps> = ({
  isOpen,
  lang,
  initialLeftSrc = null,
  initialRightSrc = null,
  existingPhotos = [],
  onClose,
  onConfirm,
}) => {
  const isBn = lang === 'bn';

  const [leftSrc, setLeftSrc] = useState<string | null>(initialLeftSrc);
  const [rightSrc, setRightSrc] = useState<string | null>(initialRightSrc);
  const [leftPerson, setLeftPerson] = useState<CouplePersonSettings>({ ...DEFAULT_COUPLE_PERSON });
  const [rightPerson, setRightPerson] = useState<CouplePersonSettings>({ ...DEFAULT_COUPLE_PERSON });
  const [studio, setStudio] = useState<CoupleStudioSettings>({ ...DEFAULT_COUPLE_STUDIO });

  const [activeTab, setActiveTab] = useState<CoupleTab>('studio');
  const [previewMode, setPreviewMode] = useState<'upright' | 'print'>('upright');
  const [uprightPreviewUrl, setUprightPreviewUrl] = useState<string | null>(null);
  const [printPreviewUrl, setPrintPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [activeDragSide, setActiveDragSide] = useState<'left' | 'right' | null>(null);

  const leftImgRef = useRef<HTMLImageElement | null>(null);
  const rightImgRef = useRef<HTMLImageElement | null>(null);
  const bothUploadInputRef = useRef<HTMLInputElement | null>(null);
  const leftUploadInputRef = useRef<HTMLInputElement | null>(null);
  const rightUploadInputRef = useRef<HTMLInputElement | null>(null);
  const dragStartRef = useRef<{
    side: 'left' | 'right';
    startX: number;
    startY: number;
    origPanX: number;
    origPanY: number;
  } | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  // Initialize from props when opened
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const init = async () => {
      setIsAnalyzing(true);
      setStudio({ ...DEFAULT_COUPLE_STUDIO });
      setPreviewMode('upright');
      setActiveTab('studio');

      const lSrc = initialLeftSrc || null;
      const rSrc = initialRightSrc || null;
      setLeftSrc(lSrc);
      setRightSrc(rSrc);

      leftImgRef.current = lSrc ? await loadStudioImage(lSrc).catch(() => null) : null;
      rightImgRef.current = rSrc ? await loadStudioImage(rSrc).catch(() => null) : null;

      const [lSettings, rSettings] = await Promise.all([
        lSrc ? autoPrepareCouplePerson(lSrc) : Promise.resolve({ ...DEFAULT_COUPLE_PERSON }),
        rSrc ? autoPrepareCouplePerson(rSrc) : Promise.resolve({ ...DEFAULT_COUPLE_PERSON }),
      ]);

      if (!cancelled) {
        setLeftPerson(lSettings);
        setRightPerson(rSettings);
        setIsAnalyzing(false);
      }
    };

    void init();
    return () => {
      cancelled = true;
    };
  }, [isOpen, initialLeftSrc, initialRightSrc]);

  // Live debounced composite render
  useEffect(() => {
    if (!isOpen || isAnalyzing) return;

    let cancelled = false;
    setIsRendering(true);

    const timer = window.setTimeout(async () => {
      try {
        if (leftSrc && (!leftImgRef.current || leftImgRef.current.src !== leftSrc)) {
          leftImgRef.current = await loadStudioImage(leftSrc);
        } else if (!leftSrc) {
          leftImgRef.current = null;
        }

        if (rightSrc && (!rightImgRef.current || rightImgRef.current.src !== rightSrc)) {
          rightImgRef.current = await loadStudioImage(rightSrc);
        } else if (!rightSrc) {
          rightImgRef.current = null;
        }

        const res = renderCouplePassportComposite({
          leftImg: leftImgRef.current,
          rightImg: rightImgRef.current,
          leftPerson,
          rightPerson,
          studio,
          targetUprightWidth: 540,
          showEmptyPlaceholders: true,
        });

        if (!cancelled) {
          setUprightPreviewUrl(res.uprightDataUrl);
          setPrintPreviewUrl(res.printReadyDataUrl);
        }
      } catch (err) {
        console.error('Couple composite render error:', err);
      } finally {
        if (!cancelled) setIsRendering(false);
      }
    }, 65);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isOpen, isAnalyzing, leftSrc, rightSrc, leftPerson, rightPerson, studio]);

  if (!isOpen) return null;

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleAssignSide = async (side: 'left' | 'right', dataUrl: string) => {
    setIsAnalyzing(true);
    try {
      const img = await loadStudioImage(dataUrl);
      const settings = await autoPrepareCouplePerson(dataUrl);
      if (side === 'left') {
        leftImgRef.current = img;
        setLeftSrc(dataUrl);
        setLeftPerson(settings);
      } else {
        rightImgRef.current = img;
        setRightSrc(dataUrl);
        setRightPerson(settings);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Upload 2 photos together -> #1 goes to Boy (Left), #2 goes to Girl (Right)!
  const handleUploadBothFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsAnalyzing(true);
    try {
      const arr = Array.from(files);
      if (arr.length >= 2) {
        const [d1, d2] = await Promise.all([readFileAsDataUrl(arr[0]), readFileAsDataUrl(arr[1])]);
        const [img1, img2, s1, s2] = await Promise.all([
          loadStudioImage(d1),
          loadStudioImage(d2),
          autoPrepareCouplePerson(d1),
          autoPrepareCouplePerson(d2),
        ]);
        leftImgRef.current = img1;
        rightImgRef.current = img2;
        setLeftSrc(d1);
        setRightSrc(d2);
        setLeftPerson(s1);
        setRightPerson(s2);
      } else if (arr.length === 1) {
        const d1 = await readFileAsDataUrl(arr[0]);
        if (!leftSrc) {
          await handleAssignSide('left', d1);
        } else {
          await handleAssignSide('right', d1);
        }
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSwapLeftRight = () => {
    const tmpSrc = leftSrc;
    const tmpImg = leftImgRef.current;
    const tmpSettings = leftPerson;
    setLeftSrc(rightSrc);
    setRightSrc(tmpSrc);
    leftImgRef.current = rightImgRef.current;
    rightImgRef.current = tmpImg;
    setLeftPerson(rightPerson);
    setRightPerson(tmpSettings);
  };

  const handleAutoAlignBoth = async () => {
    setIsAnalyzing(true);
    try {
      const [s1, s2] = await Promise.all([
        leftSrc ? autoPrepareCouplePerson(leftSrc) : Promise.resolve({ ...DEFAULT_COUPLE_PERSON }),
        rightSrc ? autoPrepareCouplePerson(rightSrc) : Promise.resolve({ ...DEFAULT_COUPLE_PERSON }),
      ]);
      setLeftPerson(s1);
      setRightPerson(s2);
      setStudio((prev) => ({ ...prev, joinOverlap: 8 }));
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Direct drag positioning on the upright couple stage (Left half drags Boy, Right half drags Girl!)
  const handleStagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (previewMode !== 'upright' || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / Math.max(1, rect.width);
    const side: 'left' | 'right' =
      activeTab === 'left'
        ? 'left'
        : activeTab === 'right'
        ? 'right'
        : relX < 0.5
        ? 'left'
        : 'right';

    if ((side === 'left' && !leftSrc) || (side === 'right' && !rightSrc)) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    const targetPerson = side === 'left' ? leftPerson : rightPerson;
    setActiveDragSide(side);
    dragStartRef.current = {
      side,
      startX: e.clientX,
      startY: e.clientY,
      origPanX: targetPerson.panX,
      origPanY: targetPerson.panY,
    };
  };

  const handleStagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const dx = (e.clientX - dragStartRef.current.startX) / Math.max(1, rect.width * 0.6);
    const dy = (e.clientY - dragStartRef.current.startY) / Math.max(1, rect.height);
    const nextPanX = Math.max(-0.45, Math.min(0.45, Math.round((dragStartRef.current.origPanX + dx) * 1000) / 1000));
    const nextPanY = Math.max(-0.45, Math.min(0.45, Math.round((dragStartRef.current.origPanY + dy) * 1000) / 1000));

    if (dragStartRef.current.side === 'left') {
      setLeftPerson((prev) => ({ ...prev, panX: nextPanX, panY: nextPanY }));
    } else {
      setRightPerson((prev) => ({ ...prev, panX: nextPanX, panY: nextPanY }));
    }
  };

  const handleStagePointerUp = () => {
    dragStartRef.current = null;
    setActiveDragSide(null);
  };

  const handleConfirmExport = async () => {
    if (!leftSrc && !rightSrc) return;
    setIsExporting(true);
    try {
      const lImg = leftSrc ? await loadStudioImage(leftSrc) : null;
      const rImg = rightSrc ? await loadStudioImage(rightSrc) : null;

      // Render 600 DPI Print-Ready Couple Composite (1050px wide upright -> 840x1050 rotated 90°)
      const finalRes = renderCouplePassportComposite({
        leftImg: lImg,
        rightImg: rImg,
        leftPerson,
        rightPerson,
        studio,
        targetUprightWidth: 1050,
        showEmptyPlaceholders: false,
      });

      onConfirm({
        originalSrc: finalRes.uprightDataUrl,
        processedSrc: finalRes.printReadyDataUrl,
        bgMode: studio.bgMode,
        customBgColor: studio.customBgColor,
        physicalWidthMm: finalRes.physicalWidthMm,
        physicalHeightMm: finalRes.physicalHeightMm,
        recommendedPreset: finalRes.recommendedPreset,
        outputAngle: studio.outputAngle,
      });
    } catch (err) {
      console.error('Couple HD export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const dims = resolveCoupleOutputDimensions(studio.sizeVariant, studio.outputAngle);
  const canConfirm = Boolean(leftSrc || rightSrc) && !isAnalyzing && !isExporting;
  const activePerson = activeTab === 'right' ? rightPerson : leftPerson;
  const updateActivePerson = (patch: Partial<CouplePersonSettings>) => {
    if (activeTab === 'right') {
      setRightPerson((prev) => ({ ...prev, ...patch }));
    } else {
      setLeftPerson((prev) => ({ ...prev, ...patch }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-6xl glass-modal rounded-3xl overflow-hidden shadow-2xl border border-white/25 dark:border-white/10 flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-3 bg-white/60 dark:bg-slate-900/70">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/25 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                {isBn
                  ? 'কাপল পাসপোর্ট স্টুডিও — ছেলে বামে + মেয়ে ডানে (৯০° প্রিন্ট রেডি)'
                  : 'Couple Passport Studio — Boy Left + Girl Right (90° Print Ready)'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {isBn
                  ? 'একসাথে ২টি ছবি আপলোড করুন বা ম্যানুয়ালি বাম-ডান সাজিয়ে ৯০° পাসপোর্ট অ্যাঙ্গেলে প্রিন্ট পেজে নিন'
                  : 'Upload 2 photos together or position manually side-by-side — exports at 90° passport angle'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-300 cursor-pointer shrink-0"
            title={isBn ? 'বন্ধ করুন' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hidden file inputs */}
        <input
          ref={bothUploadInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => {
            void handleUploadBothFiles(e.target.files);
            e.target.value = '';
          }}
          className="hidden"
        />
        <input
          ref={leftUploadInputRef}
          type="file"
          accept="image/*"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) await handleAssignSide('left', await readFileAsDataUrl(f));
            e.target.value = '';
          }}
          className="hidden"
        />
        <input
          ref={rightUploadInputRef}
          type="file"
          accept="image/*"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) await handleAssignSide('right', await readFileAsDataUrl(f));
            e.target.value = '';
          }}
          className="hidden"
        />

        {/* Body */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 min-h-0">
          {/* LEFT STAGE: Interactive Couple Preview + Quick Upload Bar */}
          <div className="lg:col-span-7 p-4 sm:p-6 bg-slate-100/70 dark:bg-slate-950/60 flex flex-col items-center justify-between gap-4 border-b lg:border-b-0 lg:border-r border-slate-200/70 dark:border-slate-800">
            {/* Quick Upload Row: Both at Once / Left (Boy) / Swap / Right (Girl) */}
            <div className="w-full flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => bothUploadInputRef.current?.click()}
                className="px-3 py-2 rounded-xl glass-btn-primary text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{isBn ? 'একসাথে ২টি ছবি দিন' : 'Upload 2 Photos Together'}</span>
              </button>

              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => leftUploadInputRef.current?.click()}
                  className="px-2.5 py-1.5 rounded-xl glass-tile text-xs font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 cursor-pointer"
                >
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  <span>{isBn ? 'ছেলে (বামে)' : 'Boy (Left)'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleSwapLeftRight}
                  className="p-1.5 rounded-xl glass-tile text-slate-700 dark:text-slate-200 hover:text-blue-600 cursor-pointer"
                  title={isBn ? 'বাম ↔ ডান অদল-বদল করুন' : 'Swap Left ↔ Right'}
                >
                  <ArrowLeftRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => rightUploadInputRef.current?.click()}
                  className="px-2.5 py-1.5 rounded-xl glass-tile text-xs font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 cursor-pointer"
                >
                  <User className="w-3.5 h-3.5 text-pink-600" />
                  <span>{isBn ? 'মেয়ে (ডানে)' : 'Girl (Right)'}</span>
                </button>
              </div>
            </div>

            {/* Center Interactive Stage */}
            <div className="relative flex-1 w-full flex flex-col items-center justify-center min-h-[280px] sm:min-h-[340px]">
              {/* View mode toggle: Upright Edit vs 90° Print Sheet View */}
              <div className="mb-3 flex items-center gap-1.5 bg-white/80 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
                <button
                  type="button"
                  onClick={() => setPreviewMode('upright')}
                  className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                    previewMode === 'upright'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {isBn ? 'সোজা এডিট ভিউ (ড্র্যাগ করুন)' : 'Upright Edit View (Drag)'}
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('print')}
                  className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                    previewMode === 'print'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {isBn
                    ? `প্রিন্ট ভিউ (${studio.outputAngle}° • ${dims.physicalWidthMm}×${dims.physicalHeightMm}মিমি)`
                    : `Print View (${studio.outputAngle}° • ${dims.physicalWidthMm}×${dims.physicalHeightMm}mm)`}
                </button>
              </div>

              <div className="relative flex items-center justify-center gap-4 w-full">
                {/* Main Preview Frame */}
                <div
                  ref={stageRef}
                  onPointerDown={handleStagePointerDown}
                  onPointerMove={handleStagePointerMove}
                  onPointerUp={handleStagePointerUp}
                  onPointerCancel={handleStagePointerUp}
                  className={`relative rounded-xl overflow-hidden shadow-2xl border-2 transition-colors select-none touch-none ${
                    activeDragSide
                      ? 'border-blue-500 cursor-grabbing'
                      : previewMode === 'upright'
                      ? 'border-white dark:border-slate-700 cursor-grab'
                      : 'border-emerald-500/80'
                  }`}
                  style={{
                    width:
                      previewMode === 'upright'
                        ? 'min(100%, 420px)'
                        : studio.outputAngle === 0
                        ? 'min(100%, 420px)'
                        : 'min(76%, 275px)',
                    aspectRatio:
                      previewMode === 'upright'
                        ? `${dims.uprightWmm} / ${dims.uprightHmm}`
                        : `${dims.physicalWidthMm} / ${dims.physicalHeightMm}`,
                  }}
                >
                  {(previewMode === 'upright' ? uprightPreviewUrl : printPreviewUrl) ? (
                    <img
                      src={
                        (previewMode === 'upright' ? uprightPreviewUrl : printPreviewUrl) || ''
                      }
                      alt="Couple Passport Preview"
                      className="w-full h-full object-cover block pointer-events-none"
                    />
                  ) : (
                    <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white text-xs">
                      {isBn ? '২টি ছবি সিলেক্ট করুন' : 'Select 2 photos'}
                    </div>
                  )}

                  {/* Subtle Left (Boy) & Right (Girl) guide badges in Upright Edit mode */}
                  {previewMode === 'upright' && (
                    <>
                      <div className="pointer-events-none absolute top-2 left-2 px-2 py-0.5 rounded-md bg-slate-950/65 text-white text-[10px] font-semibold backdrop-blur-xs">
                        {isBn ? 'ছেলে (বাম পাশে)' : 'Boy (Left)'}
                      </div>
                      <div className="pointer-events-none absolute top-2 right-2 px-2 py-0.5 rounded-md bg-slate-950/65 text-white text-[10px] font-semibold backdrop-blur-xs">
                        {isBn ? 'মেয়ে (ডান পাশে)' : 'Girl (Right)'}
                      </div>
                      {/* Subtle eye-level guide line */}
                      <div className="pointer-events-none absolute inset-x-0 top-[36%] border-t border-dashed border-white/35" />
                      <div className="pointer-events-none absolute inset-y-0 left-1/2 border-l border-dashed border-white/25" />
                    </>
                  )}

                  {(isAnalyzing || isRendering) && (
                    <div className="absolute inset-0 bg-slate-950/25 backdrop-blur-[1px] flex items-center justify-center">
                      <div className="px-3 py-1.5 rounded-xl bg-slate-900/85 text-white text-xs font-semibold flex items-center gap-2 shadow-lg">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                        <span>
                          {isAnalyzing
                            ? isBn
                              ? 'অটো এলাইন হচ্ছে...'
                              : 'Auto-aligning...'
                            : isBn
                            ? 'রেন্ডার হচ্ছে...'
                            : 'Rendering...'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Live Mini 90° Print Angle Preview Card (shown alongside Upright Edit View) */}
                {previewMode === 'upright' && printPreviewUrl && (
                  <div className="hidden sm:flex flex-col items-center gap-1.5 shrink-0">
                    <div
                      className="w-24 rounded-lg overflow-hidden border-2 border-white dark:border-slate-700 shadow-lg bg-white"
                      style={{
                        aspectRatio: `${dims.physicalWidthMm} / ${dims.physicalHeightMm}`,
                      }}
                    >
                      <img
                        src={printPreviewUrl}
                        alt="90 deg print preview"
                        className="w-full h-full object-cover block"
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 text-center leading-tight">
                      {isBn
                        ? `প্রিন্ট আউটপুট (${studio.outputAngle}°)`
                        : `Print Output (${studio.outputAngle}°)`}
                      <br />
                      <span className="font-mono font-normal text-slate-500">
                        {dims.physicalWidthMm} × {dims.physicalHeightMm} mm
                      </span>
                    </span>
                  </div>
                )}
              </div>

              <p className="mt-2.5 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 text-center">
                <Move className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>
                  {isBn
                    ? 'ছবির বাম পাশে ড্র্যাগ করে ছেলেকে এবং ডান পাশে ড্র্যাগ করে মেয়েকে ম্যানুয়ালি বসান'
                    : 'Drag directly on the left half to move Boy, or right half to move Girl manually'}
                </span>
              </p>
            </div>

            {/* Pick from already-uploaded Studio Photos if available */}
            {existingPhotos.length > 0 && (
              <div className="w-full p-2.5 rounded-2xl bg-white/75 dark:bg-slate-900/75 border border-slate-200/70 dark:border-slate-800 space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block">
                  {isBn
                    ? 'স্টুডিওর আপলোডকৃত ছবি থেকে বাম/ডানে বসান:'
                    : 'Assign from existing studio photos:'}
                </span>
                <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
                  {existingPhotos.map((p, idx) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100/90 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shrink-0"
                    >
                      <img
                        src={p.processedSrc || p.originalSrc}
                        alt={`#${idx + 1}`}
                        className="w-8 h-10 object-cover rounded-md"
                      />
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() => void handleAssignSide('left', p.originalSrc)}
                          className="px-1.5 py-0.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-semibold cursor-pointer"
                        >
                          {isBn ? 'বামে' : 'Left'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleAssignSide('right', p.originalSrc)}
                          className="px-1.5 py-0.5 rounded bg-pink-600 hover:bg-pink-700 text-white text-[10px] font-semibold cursor-pointer"
                        >
                          {isBn ? 'ডানে' : 'Right'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT PANEL: Controls (Background & 90° Angle | Boy Left | Girl Right) */}
          <div className="lg:col-span-5 p-4 sm:p-5 flex flex-col justify-between gap-4 bg-white/75 dark:bg-slate-900/75 overflow-y-auto">
            <div className="space-y-4">
              {/* Tabs */}
              <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/90">
                <button
                  type="button"
                  onClick={() => setActiveTab('studio')}
                  className={`py-2 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition cursor-pointer ${
                    activeTab === 'studio'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span>{isBn ? 'BG ও ৯০°' : 'BG & 90°'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('left')}
                  className={`py-2 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition cursor-pointer ${
                    activeTab === 'left'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>{isBn ? 'ছেলে (বামে)' : 'Boy (Left)'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('right')}
                  className={`py-2 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition cursor-pointer ${
                    activeTab === 'right'
                      ? 'bg-white dark:bg-slate-900 text-pink-600 dark:text-pink-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>{isBn ? 'মেয়ে (ডানে)' : 'Girl (Right)'}</span>
                </button>
              </div>

              {/* TAB 1: SHARED BACKGROUND, 90° ANGLE & JOIN */}
              {activeTab === 'studio' && (
                <div className="space-y-4">
                  {/* Primary Blue / White BG Selector */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        {isBn ? 'ব্যাকগ্রাউন্ড কালার' : 'Studio Background'}
                      </span>
                      <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={studio.removeBg}
                          onChange={(e) =>
                            setStudio((prev) => ({ ...prev, removeBg: e.target.checked }))
                          }
                          className="accent-blue-600 rounded"
                        />
                        <span>{isBn ? 'অটো BG রিমুভ ও জয়েন' : 'Auto BG Remove & Join'}</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setStudio((prev) => ({
                            ...prev,
                            bgMode: 'studio-blue',
                            removeBg: true,
                          }))
                        }
                        className={`p-2.5 rounded-xl border-2 text-left flex items-center gap-2.5 transition cursor-pointer ${
                          studio.bgMode === 'studio-blue'
                            ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60'
                        }`}
                      >
                        <span className="w-7 h-7 rounded-lg bg-[#1273F2] border border-blue-700/30 shrink-0 shadow-inner" />
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                            {isBn ? 'পাসপোর্ট নীল' : 'Passport Blue'}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">
                            {isBn ? 'ডিফল্ট' : 'Default'}
                          </span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setStudio((prev) => ({
                            ...prev,
                            bgMode: 'white',
                            removeBg: true,
                          }))
                        }
                        className={`p-2.5 rounded-xl border-2 text-left flex items-center gap-2.5 transition cursor-pointer ${
                          studio.bgMode === 'white'
                            ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60'
                        }`}
                      >
                        <span className="w-7 h-7 rounded-lg bg-white border border-slate-300 shrink-0 shadow-inner" />
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                            {isBn ? 'সাদা (White)' : 'Pure White'}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">
                            {isBn ? 'ভিসা / অফিসিয়াল' : 'Visa / Official'}
                          </span>
                        </div>
                      </button>
                    </div>

                    {/* More BG swatches + Custom color */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      {STUDIO_BG_PRESETS.filter(
                        (p) => p.id !== 'studio-blue' && p.id !== 'white' && p.id !== 'original'
                      ).map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() =>
                            setStudio((prev) => ({
                              ...prev,
                              bgMode: preset.id,
                              removeBg: true,
                            }))
                          }
                          className={`px-2 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer ${
                            studio.bgMode === preset.id
                              ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-sm border border-black/15"
                            style={{ backgroundColor: preset.hex }}
                          />
                          <span>{isBn ? preset.labelBn : preset.labelEn}</span>
                        </button>
                      ))}
                      <label className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="color"
                          value={studio.customBgColor}
                          onChange={(e) =>
                            setStudio((prev) => ({
                              ...prev,
                              bgMode: 'custom',
                              customBgColor: e.target.value,
                              removeBg: true,
                            }))
                          }
                          className="w-4 h-4 rounded border-0 cursor-pointer bg-transparent"
                        />
                        <span>{isBn ? 'কাস্টম' : 'Custom'}</span>
                      </label>
                    </div>
                  </div>

                  {/* Print Orientation: 90° Passport Angle (DEFAULT) vs -90° vs 0° */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                        <RotateCw className="w-3.5 h-3.5 text-blue-600" />
                        <span>
                          {isBn ? 'পাসপোর্ট প্রিন্ট অ্যাঙ্গেল' : 'Passport Print Angle'}
                        </span>
                      </span>
                      <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400">
                        {dims.physicalWidthMm} × {dims.physicalHeightMm} mm
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                      {(
                        [
                          { angle: 90 as CoupleOutputAngle, en: '90° Angle (Default)', bn: '৯০° অ্যাঙ্গেল (ডিফল্ট)' },
                          { angle: -90 as CoupleOutputAngle, en: '-90° Angle', bn: '-৯০° অ্যাঙ্গেল' },
                          { angle: 0 as CoupleOutputAngle, en: '0° Horizontal', bn: '০° আড়াআড়ি' },
                        ]
                      ).map((opt) => (
                        <button
                          key={opt.angle}
                          type="button"
                          onClick={() =>
                            setStudio((prev) => ({ ...prev, outputAngle: opt.angle }))
                          }
                          className={`py-2 px-1.5 rounded-xl text-[11px] font-semibold border transition cursor-pointer ${
                            studio.outputAngle === opt.angle
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          {isBn ? opt.bn : opt.en}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      {(
                        [
                          {
                            id: '40x50' as CoupleSizeVariant,
                            en: 'Couple Standard (40×50 mm)',
                            bn: 'কাপল স্ট্যান্ডার্ড (৪০×৫০ মিমি)',
                          },
                          {
                            id: '35x45' as CoupleSizeVariant,
                            en: 'BD Passport (35×45 mm)',
                            bn: 'বিডি পাসপোর্ট (৩৫×৪৫ মিমি)',
                          },
                        ]
                      ).map((sz) => (
                        <button
                          key={sz.id}
                          type="button"
                          onClick={() =>
                            setStudio((prev) => ({ ...prev, sizeVariant: sz.id }))
                          }
                          className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition cursor-pointer ${
                            studio.sizeVariant === sz.id
                              ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900'
                          }`}
                        >
                          {isBn ? sz.bn : sz.en}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Shoulder Spacing & Layer Order */}
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          {isBn ? 'দুইজনের কাছাকাছি দূরত্ব (কাঁধের জয়েন)' : 'Couple Proximity (Shoulder Join)'}
                        </span>
                        <span className="font-mono text-slate-600 dark:text-slate-300">
                          {studio.joinOverlap}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="-15"
                        max="30"
                        value={studio.joinOverlap}
                        onChange={(e) =>
                          setStudio((prev) => ({ ...prev, joinOverlap: Number(e.target.value) }))
                        }
                        className="w-full accent-blue-600 cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-slate-500" />
                        <span>{isBn ? 'সামনে কে থাকবে:' : 'Front Layer:'}</span>
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setStudio((prev) => ({ ...prev, frontPerson: 'left' }))
                          }
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                            studio.frontPerson === 'left'
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {isBn ? 'ছেলে (বামে)' : 'Boy (Left)'}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setStudio((prev) => ({ ...prev, frontPerson: 'right' }))
                          }
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                            studio.frontPerson === 'right'
                              ? 'bg-pink-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {isBn ? 'মেয়ে (ডানে)' : 'Girl (Right)'}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={studio.autoStudioLight}
                          onChange={(e) =>
                            setStudio((prev) => ({ ...prev, autoStudioLight: e.target.checked }))
                          }
                          className="accent-blue-600"
                        />
                        <span>{isBn ? 'স্মার্ট স্টুডিও লাইটিং' : 'Smart Studio Lighting'}</span>
                      </label>

                      <button
                        type="button"
                        onClick={() => void handleAutoAlignBoth()}
                        className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[11px] font-semibold flex items-center gap-1 hover:bg-blue-100 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>{isBn ? 'অটো এলাইন' : 'Auto-Align'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2 & 3: MANUAL PER-PERSON CONTROLS (Boy Left / Girl Right) */}
              {(activeTab === 'left' || activeTab === 'right') && (
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      {activeTab === 'left'
                        ? isBn
                          ? 'ছেলের ছবি (বাম পাশে)'
                          : 'Boy Photo (Left Side)'
                        : isBn
                        ? 'মেয়ের ছবি (ডান পাশে)'
                        : 'Girl Photo (Right Side)'}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          activeTab === 'left'
                            ? leftUploadInputRef.current?.click()
                            : rightUploadInputRef.current?.click()
                        }
                        className="px-2 py-1 rounded-lg bg-blue-600 text-white text-[11px] font-semibold cursor-pointer"
                      >
                        {isBn ? 'ছবি বদলান' : 'Replace'}
                      </button>
                      <button
                        type="button"
                        onClick={() => updateActivePerson({ flipH: !activePerson.flipH })}
                        className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                        title={isBn ? 'ফ্লিপ' : 'Flip Horizontal'}
                      >
                        <FlipHorizontal className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => updateActivePerson({ ...DEFAULT_COUPLE_PERSON })}
                        className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                        title={isBn ? 'রিসেট' : 'Reset'}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Arrow Nudge + Zoom */}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {isBn ? 'ম্যানুয়াল পজিশন (নাজ)' : 'Manual Position Nudge'}
                    </span>
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() =>
                          updateActivePerson({ panX: Math.max(-0.45, activePerson.panX - 0.025) })
                        }
                        className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateActivePerson({ panX: Math.min(0.45, activePerson.panX + 0.025) })
                        }
                        className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 cursor-pointer"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateActivePerson({ panY: Math.max(-0.45, activePerson.panY - 0.025) })
                        }
                        className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 cursor-pointer"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateActivePerson({ panY: Math.min(0.45, activePerson.panY + 0.025) })
                        }
                        className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 cursor-pointer"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Zoom */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600 dark:text-slate-300">
                        {isBn ? 'জুম / মাথার সাইজ' : 'Zoom / Head Scale'}
                      </span>
                      <span className="font-mono font-semibold">
                        {Math.round(activePerson.zoom * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="65"
                      max="190"
                      value={Math.round(activePerson.zoom * 100)}
                      onChange={(e) =>
                        updateActivePerson({ zoom: Number(e.target.value) / 100 })
                      }
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>

                  {/* Straighten Tilt */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600 dark:text-slate-300">
                        {isBn ? 'মাথা সোজা করা (Tilt)' : 'Straighten Tilt'}
                      </span>
                      <span className="font-mono font-semibold">{activePerson.rotation}°</span>
                    </div>
                    <input
                      type="range"
                      min="-20"
                      max="20"
                      step="0.5"
                      value={activePerson.rotation}
                      onChange={(e) =>
                        updateActivePerson({ rotation: Number(e.target.value) })
                      }
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>

                  {/* Face Brightness */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600 dark:text-slate-300">
                        {isBn ? 'মুখের উজ্জ্বলতা' : 'Face Brightness'}
                      </span>
                      <span className="font-mono font-semibold">
                        {activePerson.brightness > 0
                          ? `+${activePerson.brightness}`
                          : activePerson.brightness}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-25"
                      max="45"
                      value={activePerson.brightness}
                      onChange={(e) =>
                        updateActivePerson({ brightness: Number(e.target.value) })
                      }
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>

                  {/* BG Sensitivity */}
                  {studio.removeBg && (
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-600 dark:text-slate-300">
                          {isBn ? 'ব্যাকগ্রাউন্ড রিমুভ সেন্সিটিভিটি' : 'BG Remove Sensitivity'}
                        </span>
                        <span className="font-mono font-semibold">
                          {activePerson.bgSensitivity}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="15"
                        max="85"
                        value={activePerson.bgSensitivity}
                        onChange={(e) =>
                          updateActivePerson({ bgSensitivity: Number(e.target.value) })
                        }
                        className="w-full accent-blue-600 cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer Action Buttons */}
            <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 space-y-2">
              <button
                type="button"
                disabled={!canConfirm}
                onClick={() => void handleConfirmExport()}
                className="w-full py-3 px-4 rounded-2xl glass-btn-primary text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 cursor-pointer disabled:opacity-50"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{isBn ? 'HD কাপল ছবি তৈরি হচ্ছে...' : 'Rendering HD Couple Photo...'}</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>
                      {isBn
                        ? `ওকে — প্রিন্ট পেজে লোড করুন (${studio.outputAngle}° • ${dims.physicalWidthMm}×${dims.physicalHeightMm}মিমি)`
                        : `OK — Load to Print Sheet (${studio.outputAngle}° • ${dims.physicalWidthMm}×${dims.physicalHeightMm}mm)`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
