import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  Maximize2,
  RefreshCw,
  RotateCw,
  Sliders,
  Sparkles,
  X,
} from 'lucide-react';
import { CropRect } from '../../types';
import { detectCardContentBounds, processNIDImage } from '../../utils/imageProcessing';
import { translations } from '../../utils/translations';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string | null;
  side: 'front' | 'back';
  straightenAngle: number;
  autoWhiteDocument: boolean;
  docThreshold: number;
  docContrast: number;
  brightness: number;
  crop: CropRect | null;
  onSave: (options: {
    straightenAngle: number;
    autoWhiteDocument: boolean;
    docThreshold: number;
    docContrast: number;
    brightness: number;
    crop: CropRect | null;
    processedSrc: string;
  }) => void;
  lang: 'bn' | 'en';
}

export const NidEditorModal: React.FC<Props> = ({
  isOpen,
  onClose,
  imageSrc,
  side,
  straightenAngle: initStraighten,
  autoWhiteDocument: initWhiteDoc,
  docThreshold: initThreshold,
  docContrast: initContrast,
  brightness: initBrightness,
  crop: initCrop,
  onSave,
  lang,
}) => {
  const t = translations[lang];
  const [angle, setAngle] = useState(initStraighten);
  const [isWhiteDoc, setIsWhiteDoc] = useState(initWhiteDoc);
  const [threshold, setThreshold] = useState(initThreshold);
  const [contrast, setContrast] = useState(initContrast);
  const [brightness, setBrightness] = useState(initBrightness);

  const [trimTop, setTrimTop] = useState(initCrop ? Math.round(initCrop.y) : 0);
  const [trimLeft, setTrimLeft] = useState(initCrop ? Math.round(initCrop.x) : 0);
  const [trimRight, setTrimRight] = useState(
    initCrop ? Math.max(0, Math.round(100 - (initCrop.x + initCrop.width))) : 0
  );
  const [trimBottom, setTrimBottom] = useState(
    initCrop ? Math.max(0, Math.round(100 - (initCrop.y + initCrop.height))) : 0
  );

  const [previewSrc, setPreviewSrc] = useState(imageSrc || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const debounceRef = useRef<number | null>(null);

  const computeCrop = (): CropRect | null => {
    if (trimTop === 0 && trimBottom === 0 && trimLeft === 0 && trimRight === 0) return null;
    return {
      x: trimLeft,
      y: trimTop,
      width: Math.max(15, 100 - trimLeft - trimRight),
      height: Math.max(15, 100 - trimTop - trimBottom),
    };
  };

  useEffect(() => {
    if (!isOpen || !imageSrc) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);

    setIsProcessing(true);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const res = await processNIDImage(imageSrc, {
          straightenAngle: angle,
          autoWhiteDocument: isWhiteDoc,
          docThreshold: threshold,
          docContrast: contrast,
          brightness,
          crop: computeCrop(),
        });
        setPreviewSrc(res);
      } catch (err) {
        console.error('Failed to process NID image:', err);
      } finally {
        setIsProcessing(false);
      }
    }, 120);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [isOpen, imageSrc, angle, isWhiteDoc, threshold, contrast, brightness, trimTop, trimBottom, trimLeft, trimRight]);

  if (!isOpen || !imageSrc) return null;

  const base90 = Math.round(angle / 90) * 90;
  const fineAngle = Math.round((angle - base90) * 2) / 2;

  const handleAutoTrim = async () => {
    setIsProcessing(true);
    try {
      const detected = await detectCardContentBounds(imageSrc);
      if (detected) {
        setTrimLeft(Math.min(40, Math.round(detected.x)));
        setTrimTop(Math.min(40, Math.round(detected.y)));
        setTrimRight(Math.min(40, Math.max(0, Math.round(100 - (detected.x + detected.width)))));
        setTrimBottom(Math.min(40, Math.max(0, Math.round(100 - (detected.y + detected.height)))));
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = () => {
    onSave({
      straightenAngle: angle,
      autoWhiteDocument: isWhiteDoc,
      docThreshold: threshold,
      docContrast: contrast,
      brightness,
      crop: computeCrop(),
      processedSrc: previewSrc,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-3 sm:p-6 overflow-y-auto studio-modal-backdrop">
      <div className="w-full max-w-4xl glass-modal rounded-2xl flex flex-col max-h-[92vh] overflow-hidden studio-modal-enter">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-900/8 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
              {side === 'front' ? t.nidFrontTitle : t.nidBackTitle} ·{' '}
              {lang === 'en' ? 'Fit, Trim & Clean Card' : 'কার্ড ফিট, ট্রিম ও ক্লিন'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-y-auto">
          {/* Preview Panel */}
          <div className="md:col-span-7 bg-slate-950/90 p-4 sm:p-6 flex flex-col items-center justify-center min-h-[260px] relative">
            <div className="relative max-w-full max-h-[350px] flex items-center justify-center rounded-xl overflow-hidden border border-white/15 shadow-2xl bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:12px_12px]">
              <img
                src={previewSrc}
                alt="Card Preview"
                className="max-h-[320px] max-w-full object-contain block"
              />
              {isProcessing && (
                <div className="absolute inset-0 bg-black/35 backdrop-blur-xs flex items-center justify-center text-white text-xs font-medium">
                  <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                  {lang === 'en' ? 'Processing...' : 'প্রসেসিং হচ্ছে...'}
                </div>
              )}
            </div>

            <div className="mt-3 flex items-center gap-2 flex-wrap justify-center">
              <button
                type="button"
                onClick={() => setAngle((a) => (a + 90) % 360)}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>{lang === 'en' ? 'Rotate 90°' : '৯০° ঘোরান'}</span>
              </button>
              <button
                type="button"
                onClick={() => void handleAutoTrim()}
                className="px-3 py-1.5 rounded-xl bg-blue-600/90 hover:bg-blue-500 border border-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>{lang === 'en' ? 'Auto-Trim White Edges' : 'সাদা বর্ডার অটো-ট্রিম'}</span>
              </button>
            </div>
          </div>

          {/* Controls Panel */}
          <div className="md:col-span-5 p-4 sm:p-5 flex flex-col border-t md:border-t-0 md:border-l border-slate-900/8 dark:border-white/10 space-y-4 overflow-y-auto">
            {/* White Document Scanner Feature */}
            <label className="p-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 flex flex-col gap-1 cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {t.cleanDocScanner}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={isWhiteDoc}
                  onChange={(e) => setIsWhiteDoc(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                />
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                {t.cleanDocDesc}
              </p>
            </label>

            {/* Fine Straighten Angle */}
            <div>
              <div className="flex justify-between text-xs text-slate-700 dark:text-slate-300 mb-1">
                <span className="font-semibold">{t.straighten} (Deskew)</span>
                <span className="font-mono text-blue-600 dark:text-blue-400 tabular-nums">{fineAngle}°</span>
              </div>
              <input
                type="range"
                min="-25"
                max="25"
                step="0.5"
                value={fineAngle}
                onChange={(e) => setAngle(base90 + Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                <span>-25°</span>
                <button
                  type="button"
                  onClick={() => setAngle(base90)}
                  className="cursor-pointer hover:text-blue-500 font-semibold"
                >
                  {lang === 'en' ? '0° Straight' : '০° সোজা'}
                </button>
                <span>+25°</span>
              </div>
            </div>

            {isWhiteDoc && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between text-[11px] text-slate-700 dark:text-slate-300 mb-1">
                    <span className="font-semibold">{t.threshold}</span>
                    <span className="font-mono tabular-nums">{threshold}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[11px] text-slate-700 dark:text-slate-300 mb-1">
                    <span className="font-semibold">{t.textContrast}</span>
                    <span className="font-mono tabular-nums">{contrast}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={contrast}
                    onChange={(e) => setContrast(Number(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Brightness */}
            <div>
              <div className="flex justify-between text-xs text-slate-700 dark:text-slate-300 mb-1">
                <span className="font-semibold">{t.brightness}</span>
                <span className="font-mono tabular-nums">{brightness}</span>
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

            {/* Precision 4-Side Card Edge Trim */}
            <div className="p-3 rounded-xl glass-track space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  {lang === 'en' ? 'Trim Card Edges (%)' : 'কার্ডের চারপাশ ক্রপ (%)'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setTrimTop(0);
                    setTrimBottom(0);
                    setTrimLeft(0);
                    setTrimRight(0);
                  }}
                  className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  {lang === 'en' ? 'Reset' : 'রিসেট'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[11px]">
                <div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>{lang === 'en' ? 'Top' : 'উপর'}</span>
                    <span className="font-mono tabular-nums">{trimTop}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    value={trimTop}
                    onChange={(e) => setTrimTop(Number(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>{lang === 'en' ? 'Bottom' : 'নিচ'}</span>
                    <span className="font-mono tabular-nums">{trimBottom}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    value={trimBottom}
                    onChange={(e) => setTrimBottom(Number(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>{lang === 'en' ? 'Left' : 'বাম'}</span>
                    <span className="font-mono tabular-nums">{trimLeft}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    value={trimLeft}
                    onChange={(e) => setTrimLeft(Number(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>{lang === 'en' ? 'Right' : 'ডান'}</span>
                    <span className="font-mono tabular-nums">{trimRight}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    value={trimRight}
                    onChange={(e) => setTrimRight(Number(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="mt-auto pt-3 border-t border-slate-900/8 dark:border-white/10 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-white/10 rounded-xl transition cursor-pointer"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="px-4 py-2 text-xs sm:text-sm font-semibold glass-btn-primary text-white rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{t.applyChanges}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
