import React, { useRef, useState } from 'react';
import {
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Printer,
  RefreshCw,
  Scissors,
  Sliders,
  Sparkles,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { StudioPhotoItem } from '../../types';

interface Props {
  lang: 'bn' | 'en';
  photo: StudioPhotoItem | null;
  isProcessing: boolean;
  progress: number;
  statusText: string;
  onRunAutoBgRemove: () => void;
  onOpenCropStraighten: () => void;
  onOpenManualTools: () => void;
  onToggleUseEnhanced: (useEnhanced: boolean) => void;
  onViewPrintSheet?: () => void;
}

export const BeforeAfterInspector: React.FC<Props> = ({
  lang,
  photo,
  isProcessing,
  progress,
  statusText,
  onRunAutoBgRemove,
  onOpenCropStraighten,
  onOpenManualTools,
  onToggleUseEnhanced,
  onViewPrintSheet,
}) => {
  const [splitPercent, setSplitPercent] = useState<number>(50);
  const [isZoomed, setIsZoomed] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<boolean>(false);

  const updateSplitFromClientX = (clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setSplitPercent(Math.max(4, Math.min(96, Math.round(pct * 10) / 10)));
  };

  if (!photo && !isProcessing) {
    return null;
  }

  const beforeSrc = photo?.rawOriginalSrc || photo?.originalSrc || '';
  const afterSrc = photo?.processedSrc || photo?.enhancedSrc || photo?.originalSrc || '';
  const useEnhanced = photo?.useEnhanced ?? true;
  const isCouple = photo?.type === 'couple';

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col items-center">
      {/* Main Auto Studio Inspection Card */}
      <div className="w-full rounded-2xl bg-white/90 dark:bg-slate-900/80 border border-slate-200/90 dark:border-white/15 shadow-sm p-4 sm:p-5 space-y-3.5">
        {isProcessing ? (
          <div className="flex flex-col items-center gap-4 py-3">
            {beforeSrc && (
              <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-950 max-h-[420px] flex items-center justify-center">
                <img
                  src={beforeSrc}
                  alt="Processing preview"
                  className="max-h-[400px] w-auto object-contain"
                />
              </div>
            )}
            <div className="w-full max-w-md space-y-2 text-center">
              <div className="flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
                <span>
                  {statusText ||
                    (lang === 'bn'
                      ? 'অটো স্টুডিও পাসপোর্ট প্রস্তুত হচ্ছে...'
                      : 'Preparing Auto Studio portrait...')}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${Math.max(8, Math.min(100, progress))}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          photo && (
            <>
              {/* Status / Auto Background Remove Strip */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  <CheckSquare className="w-4 h-4 shrink-0" />
                  <span>
                    {photo.cutoutSrc
                      ? lang === 'bn'
                        ? 'প্রসেস শেষ — ছবির মাঝের হাতল টেনে আগে/পরে মিলিয়ে দেখুন'
                        : 'Ready — drag the center handle to compare Before / After'
                      : lang === 'bn'
                      ? 'প্রিভিউ প্রস্তুত — ব্যাকগ্রাউন্ড সরাতে বাটনে ক্লিক করুন বা ক্রপ করুন'
                      : 'Preview ready — click Remove BG or Crop & Straighten below'}
                  </span>
                </div>

                {!photo.cutoutSrc && (
                  <button
                    type="button"
                    onClick={onRunAutoBgRemove}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer shrink-0"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>
                      {lang === 'bn' ? 'অটো ব্যাকগ্রাউন্ড রিমুভ' : 'Auto Remove BG'}
                    </span>
                  </button>
                )}
              </div>

              {/* Before / After Split Slider Frame */}
              <div className="flex justify-center">
                <div
                  ref={containerRef}
                  onPointerDown={(e) => {
                    if ((e.target as HTMLElement).closest('button')) return;
                    draggingRef.current = true;
                    e.currentTarget.setPointerCapture(e.pointerId);
                    updateSplitFromClientX(e.clientX);
                  }}
                  onPointerMove={(e) => {
                    if (!draggingRef.current) return;
                    updateSplitFromClientX(e.clientX);
                  }}
                  onPointerUp={() => {
                    draggingRef.current = false;
                  }}
                  className={`relative w-full ${
                    isCouple ? 'max-w-[390px] aspect-[50/40]' : 'max-w-[330px] aspect-[35/45]'
                  } rounded-xl overflow-hidden border-2 border-slate-900 dark:border-slate-500 bg-white shadow-md select-none cursor-ew-resize touch-none`}
                >
                  {/* AFTER (Full layer beneath) */}
                  <img
                    src={afterSrc}
                    alt={lang === 'bn' ? 'পরে' : 'After'}
                    draggable={false}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-200 pointer-events-none"
                    style={{
                      transform: isZoomed ? 'scale(1.65)' : 'scale(1)',
                      transformOrigin: 'center 32%',
                    }}
                  />

                  {/* BEFORE (Clipped left side) */}
                  <div
                    className="absolute inset-0 overflow-hidden pointer-events-none"
                    style={{
                      clipPath: `inset(0 ${100 - splitPercent}% 0 0)`,
                    }}
                  >
                    <img
                      src={beforeSrc}
                      alt={lang === 'bn' ? 'আগে' : 'Before'}
                      draggable={false}
                      className="w-full h-full object-cover transition-transform duration-200"
                      style={{
                        transform: isZoomed ? 'scale(1.65)' : 'scale(1)',
                        transformOrigin: 'center 32%',
                      }}
                    />
                  </div>

                  {/* Labels */}
                  <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-slate-900/75 text-white text-[11px] font-bold pointer-events-none">
                    {lang === 'bn' ? 'আগে' : 'Before'}
                  </span>
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-900/75 text-white text-[11px] font-bold pointer-events-none">
                      {lang === 'bn' ? 'পরে' : 'After'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsZoomed((z) => !z);
                      }}
                      className="w-7 h-7 rounded-lg bg-white/90 hover:bg-white text-slate-800 border border-slate-300 shadow flex items-center justify-center cursor-pointer"
                      title={lang === 'bn' ? 'জুম করে দেখুন' : 'Toggle Zoom'}
                    >
                      {isZoomed ? (
                        <ZoomOut className="w-3.5 h-3.5" />
                      ) : (
                        <ZoomIn className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Vertical Split Line & Draggable Handle */}
                  <div
                    className="absolute inset-y-0 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.65)] pointer-events-none"
                    style={{ left: `${splitPercent}%` }}
                  >
                    <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white border-2 border-slate-900 shadow-lg flex items-center justify-center text-blue-600">
                      <ChevronLeft className="w-3.5 h-3.5 -mr-1" />
                      <ChevronRight className="w-3.5 h-3.5 -ml-1" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Two Primary Edit Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={onOpenCropStraighten}
                  className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-400 hover:bg-blue-50/40 dark:hover:bg-slate-700/70 text-slate-800 dark:text-slate-100 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Scissors className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{lang === 'bn' ? 'ক্রপ ও সোজা করুন' : 'Crop & Straighten'}</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenManualTools}
                  className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-400 hover:bg-blue-50/40 dark:hover:bg-slate-700/70 text-slate-800 dark:text-slate-100 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Sliders className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>{lang === 'bn' ? 'রঙ/আলো নিজে ঠিক করুন' : 'Manual Color & Light'}</span>
                </button>
              </div>

              {/* Job Output Toggle & Print Sheet Jump */}
              <div className="flex items-center justify-between gap-2.5 pt-1 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    {lang === 'bn' ? 'জবে কোন ছবি যাবে?' : 'Use for Print Job:'}
                  </span>
                  <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100/80 dark:bg-slate-800">
                    <button
                      type="button"
                      onClick={() => onToggleUseEnhanced(true)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        useEnhanced
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                    >
                      {lang === 'bn' ? 'এনহ্যান্স করা' : 'Enhanced'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleUseEnhanced(false)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        !useEnhanced
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                    >
                      {lang === 'bn' ? 'এনহ্যান্স ছাড়া' : 'Original'}
                    </button>
                  </div>
                </div>

                {onViewPrintSheet && (
                  <button
                    type="button"
                    onClick={onViewPrintSheet}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>{lang === 'bn' ? 'প্রিন্ট শীটে দেখুন' : 'Go to Print Sheet'}</span>
                  </button>
                )}
              </div>

              {/* Contextual Re-process Banner when BG/Enhance Settings Change */}
              {photo.needsReprocess && (
                <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300/80 dark:border-amber-700/60 px-3 py-2 flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-medium text-amber-800 dark:text-amber-200">
                    {lang === 'bn'
                      ? 'ব্যাকগ্রাউন্ডের সেটিং বদলেছে — নতুন সেটিংয়ে দেখতে আবার প্রসেস করুন।'
                      : 'Studio settings changed — re-process to preview updated output.'}
                  </span>
                  <button
                    type="button"
                    onClick={onRunAutoBgRemove}
                    className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-amber-400/70 hover:border-blue-500 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{lang === 'bn' ? 'আবার প্রসেস' : 'Re-process'}</span>
                  </button>
                </div>
              )}
            </>
          )
        )}
      </div>
    </div>
  );
};
