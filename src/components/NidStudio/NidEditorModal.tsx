import React, { useEffect, useRef, useState } from 'react';
import { Check, RotateCw, Sliders, Sparkles, X, RefreshCw } from 'lucide-react';
import { processNIDImage } from '../../utils/imageProcessing';
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
  crop: { x: number; y: number; width: number; height: number } | null;
  onSave: (options: {
    straightenAngle: number;
    autoWhiteDocument: boolean;
    docThreshold: number;
    docContrast: number;
    brightness: number;
    crop: { x: number; y: number; width: number; height: number } | null;
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
  if (!isOpen || !imageSrc) return null;

  const t = translations[lang];
  const [angle, setAngle] = useState(initStraighten);
  const [isWhiteDoc, setIsWhiteDoc] = useState(initWhiteDoc);
  const [threshold, setThreshold] = useState(initThreshold);
  const [contrast, setContrast] = useState(initContrast);
  const [brightness, setBrightness] = useState(initBrightness);
  const [crop, setCrop] = useState(initCrop);
  const [previewSrc, setPreviewSrc] = useState(imageSrc);
  const [isProcessing, setIsProcessing] = useState(false);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
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
          crop,
        });
        setPreviewSrc(res);
      } catch (err) {
        console.error('Failed to process NID image:', err);
      } finally {
        setIsProcessing(false);
      }
    }, 150);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [imageSrc, angle, isWhiteDoc, threshold, contrast, brightness, crop]);

  const handleApply = () => {
    onSave({
      straightenAngle: angle,
      autoWhiteDocument: isWhiteDoc,
      docThreshold: threshold,
      docContrast: contrast,
      brightness,
      crop,
      processedSrc: previewSrc,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
              {side === 'front' ? t.nidFrontTitle : t.nidBackTitle} - {lang === 'en' ? 'Clean Document & Straighten' : 'ডকুমেন্ট ক্লিন ও সোজা করা'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-y-auto">
          {/* Preview Panel */}
          <div className="md:col-span-7 bg-slate-950 p-4 sm:p-6 flex flex-col items-center justify-center min-h-[280px] relative">
            <div className="relative max-w-full max-h-[350px] flex items-center justify-center rounded-lg overflow-hidden border border-slate-800 shadow-2xl bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:12px_12px]">
              <img
                src={previewSrc}
                alt="NID Preview"
                className="max-h-[320px] max-w-full object-contain"
              />
              {isProcessing && (
                <div className="absolute inset-0 bg-black/30 backdrop-blur-xs flex items-center justify-center text-white text-xs font-medium">
                  <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                  {lang === 'en' ? 'Processing...' : 'প্রসেসিং হচ্ছে...'}
                </div>
              )}
            </div>

            {/* Quick 90 deg button */}
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => setAngle((a) => (a + 90) % 360)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs flex items-center gap-1.5 hover:bg-slate-800 transition"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>{lang === 'en' ? 'Rotate 90°' : '৯০° ঘোরান'}</span>
              </button>
            </div>
          </div>

          {/* Controls Panel */}
          <div className="md:col-span-5 p-4 sm:p-5 flex flex-col bg-slate-50/50 dark:bg-slate-900/50 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 space-y-4">
            {/* White Document Scanner Feature */}
            <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    {t.cleanDocScanner}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={isWhiteDoc}
                  onChange={(e) => setIsWhiteDoc(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {t.cleanDocDesc}
              </p>
            </div>

            {/* Straighten Angle */}
            <div>
              <div className="flex justify-between text-xs text-slate-700 dark:text-slate-300 mb-1">
                <span className="font-semibold">{t.straighten} (Deskew)</span>
                <span className="font-mono text-blue-600 dark:text-blue-400">{angle}°</span>
              </div>
              <input
                type="range"
                min="-45"
                max="45"
                step="0.5"
                value={angle}
                onChange={(e) => setAngle(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>-45°</span>
                <span onClick={() => setAngle(0)} className="cursor-pointer hover:text-blue-500">
                  {lang === 'en' ? '0° Reset' : '০° সোজা'}
                </span>
                <span>+45°</span>
              </div>
            </div>

            {/* Document Whitening Threshold */}
            {isWhiteDoc && (
              <>
                <div>
                  <div className="flex justify-between text-xs text-slate-700 dark:text-slate-300 mb-1">
                    <span className="font-semibold">{t.threshold}</span>
                    <span className="font-mono">{threshold}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-700 dark:text-slate-300 mb-1">
                    <span className="font-semibold">{t.textContrast}</span>
                    <span className="font-mono">{contrast}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={contrast}
                    onChange={(e) => setContrast(Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                </div>
              </>
            )}

            {/* Brightness */}
            <div>
              <div className="flex justify-between text-xs text-slate-700 dark:text-slate-300 mb-1">
                <span className="font-semibold">{t.brightness}</span>
                <span className="font-mono">{brightness}</span>
              </div>
              <input
                type="range"
                min="-50"
                max="50"
                value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>

            {/* Extra Border Crop Presets */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                {lang === 'en' ? 'Crop Outside Boundaries:' : 'বাইরের অংশ বা ব্যাকগ্রাউন্ড বাদ দিন (Crop):'}
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => setCrop(null)}
                  className={`p-2 rounded-xl border text-left transition ${
                    !crop
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-600 font-semibold'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {lang === 'en' ? 'Full Image' : 'পুরো ছবি রাখুন'}
                </button>
                <button
                  onClick={() => setCrop({ x: 5, y: 5, width: 90, height: 90 })}
                  className={`p-2 rounded-xl border text-left transition ${
                    crop?.width === 90
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-600 font-semibold'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {lang === 'en' ? 'Border Trim (5%)' : 'বর্ডার ট্রিম (৫% কাট)'}
                </button>
                <button
                  onClick={() => setCrop({ x: 10, y: 10, width: 80, height: 80 })}
                  className={`p-2 rounded-xl border text-left transition ${
                    crop?.width === 80
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-600 font-semibold'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {lang === 'en' ? 'Tight Trim (10%)' : 'টাইট ট্রিম (১০% কাট)'}
                </button>
              </div>
            </div>

            {/* Buttons */}
            <div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleApply}
                className="px-4 py-2 text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition"
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
