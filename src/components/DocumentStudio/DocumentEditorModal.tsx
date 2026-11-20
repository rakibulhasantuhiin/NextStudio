import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  FlipHorizontal,
  FlipVertical,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Sliders,
  Sparkles,
  X,
} from 'lucide-react';
import { CropRect, DocumentPageItem } from '../../types';
import { processDocumentImage } from '../../utils/imageProcessing';
import { translations } from '../../utils/translations';

interface Props {
  isOpen: boolean;
  page: DocumentPageItem | null;
  onClose: () => void;
  onSave: (updated: {
    rotation: number;
    flipH: boolean;
    flipV: boolean;
    autoWhiteDocument: boolean;
    docThreshold: number;
    docContrast: number;
    brightness: number;
    contrast: number;
    crop: CropRect | null;
    processedSrc: string;
    naturalWidth: number;
    naturalHeight: number;
  }) => void;
  lang: 'bn' | 'en';
}

export const DocumentEditorModal: React.FC<Props> = ({
  isOpen,
  page,
  onClose,
  onSave,
  lang,
}) => {
  const t = translations[lang];

  const [rotation, setRotation] = useState(page?.rotation ?? 0);
  const [flipH, setFlipH] = useState(page?.flipH ?? false);
  const [flipV, setFlipV] = useState(page?.flipV ?? false);
  const [autoWhiteDocument, setAutoWhiteDocument] = useState(page?.autoWhiteDocument ?? false);
  const [docThreshold, setDocThreshold] = useState(page?.docThreshold ?? 45);
  const [docContrast, setDocContrast] = useState(page?.docContrast ?? 25);
  const [brightness, setBrightness] = useState(page?.brightness ?? 0);
  const [contrast, setContrast] = useState(page?.contrast ?? 0);

  // Edge trim crop percentages (0 - 40%)
  const initTop = page?.crop ? Math.round(page.crop.y) : 0;
  const initLeft = page?.crop ? Math.round(page.crop.x) : 0;
  const initRight = page?.crop ? Math.max(0, Math.round(100 - (page.crop.x + page.crop.width))) : 0;
  const initBottom = page?.crop ? Math.max(0, Math.round(100 - (page.crop.y + page.crop.height))) : 0;

  const [trimTop, setTrimTop] = useState(initTop);
  const [trimBottom, setTrimBottom] = useState(initBottom);
  const [trimLeft, setTrimLeft] = useState(initLeft);
  const [trimRight, setTrimRight] = useState(initRight);

  const [previewSrc, setPreviewSrc] = useState(page?.processedSrc || page?.originalSrc || '');
  const [previewDims, setPreviewDims] = useState({
    width: page?.naturalWidth || 1000,
    height: page?.naturalHeight || 1414,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const debounceRef = useRef<number | null>(null);

  // Re-sync local state if page prop changes
  useEffect(() => {
    if (!page) return;
    setRotation(page.rotation);
    setFlipH(page.flipH);
    setFlipV(page.flipV);
    setAutoWhiteDocument(page.autoWhiteDocument);
    setDocThreshold(page.docThreshold);
    setDocContrast(page.docContrast);
    setBrightness(page.brightness);
    setContrast(page.contrast);
    setTrimTop(page.crop ? Math.round(page.crop.y) : 0);
    setTrimLeft(page.crop ? Math.round(page.crop.x) : 0);
    setTrimRight(page.crop ? Math.max(0, Math.round(100 - (page.crop.x + page.crop.width))) : 0);
    setTrimBottom(page.crop ? Math.max(0, Math.round(100 - (page.crop.y + page.crop.height))) : 0);
    setPreviewSrc(page.processedSrc || page.originalSrc);
  }, [page?.id]);

  const computeCropRect = (): CropRect | null => {
    if (trimTop === 0 && trimBottom === 0 && trimLeft === 0 && trimRight === 0) {
      return null;
    }
    const w = Math.max(10, 100 - trimLeft - trimRight);
    const h = Math.max(10, 100 - trimTop - trimBottom);
    return {
      x: trimLeft,
      y: trimTop,
      width: w,
      height: h,
    };
  };

  useEffect(() => {
    if (!isOpen || !page) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);

    setIsProcessing(true);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const cropRect = computeCropRect();
        const res = await processDocumentImage(page.originalSrc, {
          rotation,
          flipH,
          flipV,
          crop: cropRect,
          autoWhiteDocument,
          docThreshold,
          docContrast,
          brightness,
          contrast,
        });
        setPreviewSrc(res.processedSrc);
        setPreviewDims({ width: res.width, height: res.height });
      } catch (err) {
        console.error('Document processing error:', err);
      } finally {
        setIsProcessing(false);
      }
    }, 140);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [
    isOpen,
    page?.originalSrc,
    rotation,
    flipH,
    flipV,
    trimTop,
    trimBottom,
    trimLeft,
    trimRight,
    autoWhiteDocument,
    docThreshold,
    docContrast,
    brightness,
    contrast,
  ]);

  if (!isOpen || !page) return null;

  const base90 = Math.round(rotation / 90) * 90;
  const fineAngle = Math.round((rotation - base90) * 2) / 2;

  const handleReset = () => {
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setAutoWhiteDocument(false);
    setDocThreshold(45);
    setDocContrast(25);
    setBrightness(0);
    setContrast(0);
    setTrimTop(0);
    setTrimBottom(0);
    setTrimLeft(0);
    setTrimRight(0);
  };

  const handleApply = () => {
    onSave({
      rotation,
      flipH,
      flipV,
      autoWhiteDocument,
      docThreshold,
      docContrast,
      brightness,
      contrast,
      crop: computeCropRect(),
      processedSrc: previewSrc,
      naturalWidth: previewDims.width,
      naturalHeight: previewDims.height,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-md p-2 sm:p-5 overflow-y-auto">
      <div className="w-full max-w-4xl glass-modal rounded-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-slate-200/60 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Sliders className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate">
              {lang === 'en' ? `Edit Paper: ${page.name}` : `পেপার এডিট: ${page.name}`}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-y-auto">
          {/* Preview Panel */}
          <div className="md:col-span-7 bg-slate-950 p-4 sm:p-6 flex flex-col items-center justify-center min-h-[260px] relative">
            <div className="relative max-w-full max-h-[360px] flex items-center justify-center rounded-lg overflow-hidden border border-slate-800 shadow-2xl bg-white">
              <img
                src={previewSrc}
                alt={page.name}
                className="max-h-[340px] max-w-full object-contain block"
              />
              {isProcessing && (
                <div className="absolute inset-0 bg-black/35 backdrop-blur-xs flex items-center justify-center text-white text-xs font-medium">
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  {lang === 'en' ? 'Processing...' : 'প্রসেসিং হচ্ছে...'}
                </div>
              )}
            </div>

            {/* Quick Rotation & Flip Toolbar */}
            <div className="mt-3 flex items-center gap-2 flex-wrap justify-center">
              <button
                type="button"
                onClick={() => setRotation((r) => r - 90)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs flex items-center gap-1.5 hover:bg-slate-800 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{lang === 'en' ? 'Rotate -90°' : '-৯০° ঘোরান'}</span>
              </button>
              <button
                type="button"
                onClick={() => setRotation((r) => r + 90)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs flex items-center gap-1.5 hover:bg-slate-800 transition cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>{lang === 'en' ? 'Rotate +90°' : '+৯০° ঘোরান'}</span>
              </button>
              <button
                type="button"
                onClick={() => setFlipH((f) => !f)}
                className={`px-2.5 py-1.5 rounded-lg border text-xs flex items-center gap-1 transition cursor-pointer ${
                  flipH
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-slate-900 border-slate-700 text-white hover:bg-slate-800'
                }`}
              >
                <FlipHorizontal className="w-3.5 h-3.5" />
                <span>{lang === 'en' ? 'Flip H' : 'ফ্লিপ H'}</span>
              </button>
              <button
                type="button"
                onClick={() => setFlipV((f) => !f)}
                className={`px-2.5 py-1.5 rounded-lg border text-xs flex items-center gap-1 transition cursor-pointer ${
                  flipV
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-slate-900 border-slate-700 text-white hover:bg-slate-800'
                }`}
              >
                <FlipVertical className="w-3.5 h-3.5" />
                <span>{lang === 'en' ? 'Flip V' : 'ফ্লিপ V'}</span>
              </button>
            </div>
          </div>

          {/* Controls Panel */}
          <div className="md:col-span-5 p-4 sm:p-5 flex flex-col bg-white/35 dark:bg-slate-950/35 border-t md:border-t-0 md:border-l border-slate-200/60 dark:border-white/10 space-y-4 overflow-y-auto">
            {/* Clean White Paper Scanner Toggle */}
            <div className="p-3 rounded-xl border border-emerald-500/35 bg-emerald-500/10 backdrop-blur-md">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    {t.cleanDocScanner}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={autoWhiteDocument}
                  onChange={(e) => setAutoWhiteDocument(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 cursor-pointer shrink-0"
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {lang === 'en'
                  ? 'Brightens scanned paper background to pure crisp white and sharpens text'
                  : 'মোবাইলে তোলা বা স্ক্যান করা কাগজের ছায়া সরিয়ে একদম পরিষ্কার সাদা করে'}
              </p>

              {autoWhiteDocument && (
                <div className="mt-3 pt-2 border-t border-emerald-200/70 dark:border-emerald-900/50 space-y-2.5">
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-700 dark:text-slate-300 mb-0.5">
                      <span>{t.threshold}</span>
                      <span className="font-mono font-semibold">{docThreshold}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={docThreshold}
                      onChange={(e) => setDocThreshold(Number(e.target.value))}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-700 dark:text-slate-300 mb-0.5">
                      <span>{t.textContrast}</span>
                      <span className="font-mono font-semibold">{docContrast}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={docContrast}
                      onChange={(e) => setDocContrast(Number(e.target.value))}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Fine Straighten */}
            <div>
              <div className="flex justify-between text-xs text-slate-700 dark:text-slate-300 mb-1">
                <span className="font-semibold">{t.straighten}</span>
                <span className="font-mono text-blue-600 dark:text-blue-400">{fineAngle}°</span>
              </div>
              <input
                type="range"
                min="-15"
                max="15"
                step="0.5"
                value={fineAngle}
                onChange={(e) => setRotation(base90 + Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>-15°</span>
                <button
                  type="button"
                  onClick={() => setRotation(base90)}
                  className="cursor-pointer hover:text-blue-500 font-medium"
                >
                  {lang === 'en' ? '0° Straight' : '০° সোজা'}
                </button>
                <span>+15°</span>
              </div>
            </div>

            {/* Brightness & Contrast */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex justify-between text-[11px] text-slate-700 dark:text-slate-300 mb-1">
                  <span className="font-semibold">{t.brightness}</span>
                  <span className="font-mono">{brightness}</span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-slate-700 dark:text-slate-300 mb-1">
                  <span className="font-semibold">{t.contrast}</span>
                  <span className="font-mono">{contrast}</span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  value={contrast}
                  onChange={(e) => setContrast(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>
            </div>

            {/* Edge Trim / Crop */}
            <div className="p-3 rounded-xl glass-tile space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {lang === 'en' ? 'Edge Trim / Crop Borders (%)' : 'চারপাশের অতিরিক্ত অংশ ক্রপ (%)'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setTrimTop(0);
                    setTrimBottom(0);
                    setTrimLeft(0);
                    setTrimRight(0);
                  }}
                  className="text-[11px] text-blue-600 hover:underline cursor-pointer"
                >
                  {lang === 'en' ? 'Reset' : 'রিসেট'}
                </button>
              </div>

              {/* Quick Crop Presets */}
              <div className="grid grid-cols-4 gap-1.5 text-[11px]">
                {[
                  { label: lang === 'en' ? 'Full' : 'সম্পূর্ণ', val: 0 },
                  { label: '2%', val: 2 },
                  { label: '5%', val: 5 },
                  { label: '10%', val: 10 },
                ].map((p) => {
                  const isActive =
                    trimTop === p.val &&
                    trimBottom === p.val &&
                    trimLeft === p.val &&
                    trimRight === p.val;
                  return (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => {
                        setTrimTop(p.val);
                        setTrimBottom(p.val);
                        setTrimLeft(p.val);
                        setTrimRight(p.val);
                      }}
                      className={`py-1 px-1.5 rounded-md border text-center font-semibold transition cursor-pointer ${
                        isActive
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>

              {/* Individual Edge Sliders */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[11px]">
                <div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>{lang === 'en' ? 'Top' : 'উপর'}</span>
                    <span className="font-mono">{trimTop}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    value={trimTop}
                    onChange={(e) => setTrimTop(Math.min(40, Number(e.target.value)))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>{lang === 'en' ? 'Bottom' : 'নিচ'}</span>
                    <span className="font-mono">{trimBottom}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    value={trimBottom}
                    onChange={(e) => setTrimBottom(Math.min(40, Number(e.target.value)))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>{lang === 'en' ? 'Left' : 'বাম'}</span>
                    <span className="font-mono">{trimLeft}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    value={trimLeft}
                    onChange={(e) => setTrimLeft(Math.min(40, Number(e.target.value)))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>{lang === 'en' ? 'Right' : 'ডান'}</span>
                    <span className="font-mono">{trimRight}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    value={trimRight}
                    onChange={(e) => setTrimRight(Math.min(40, Number(e.target.value)))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="mt-auto pt-3 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-white/60 dark:hover:bg-white/10 transition cursor-pointer"
              >
                {t.reset}
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-white/10 rounded-xl transition cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  className="px-4 py-2 text-xs sm:text-sm font-semibold glass-btn-primary text-white rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{t.applyChanges}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
