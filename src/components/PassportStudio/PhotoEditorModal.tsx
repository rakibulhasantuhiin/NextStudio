import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  Crop as CropIcon,
  FlipHorizontal,
  FlipVertical,
  RefreshCw,
  RotateCw,
  Sliders,
  X,
} from 'lucide-react';
import { PhotoAdjustments, StudioPhotoItem } from '../../types';
import { DEFAULT_ADJUSTMENTS } from '../../utils/constants';
import { processStudioPhoto } from '../../utils/imageProcessing';
import { translations } from '../../utils/translations';

interface Props {
  photo: StudioPhotoItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedAdjustments: PhotoAdjustments) => void;
  lang: 'bn' | 'en';
}

export const PhotoEditorModal: React.FC<Props> = ({
  photo,
  isOpen,
  onClose,
  onSave,
  lang,
}) => {
  if (!isOpen || !photo) return null;

  const t = translations[lang];
  const [adjustments, setAdjustments] = useState<PhotoAdjustments>({
    ...photo.adjustments,
    backgroundMode: 'original', // Ensure background remains original
  });
  const [previewSrc, setPreviewSrc] = useState<string>(photo.processedSrc || photo.originalSrc);
  const [activeTab, setActiveTab] = useState<'adjust' | 'crop'>('adjust');
  const [isProcessing, setIsProcessing] = useState(false);
  const debounceTimer = useRef<number | null>(null);

  useEffect(() => {
    setAdjustments({
      ...photo.adjustments,
      backgroundMode: 'original',
    });
  }, [photo]);

  // Live preview update
  useEffect(() => {
    if (!photo) return;
    if (debounceTimer.current) window.clearTimeout(debounceTimer.current);

    setIsProcessing(true);
    debounceTimer.current = window.setTimeout(async () => {
      try {
        const result = await processStudioPhoto(photo.originalSrc, {
          ...adjustments,
          backgroundMode: 'original',
        });
        setPreviewSrc(result);
      } catch (err) {
        console.error('Failed to preview adjustments:', err);
      } finally {
        setIsProcessing(false);
      }
    }, 120);

    return () => {
      if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    };
  }, [adjustments, photo]);

  const updateAdj = <K extends keyof PhotoAdjustments>(key: K, value: PhotoAdjustments[K]) => {
    setAdjustments((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setAdjustments({
      ...DEFAULT_ADJUSTMENTS,
      backgroundMode: 'original',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-1.5 sm:p-4 md:p-6 overflow-y-auto">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[96vh] sm:max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3.5 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400 shrink-0" />
            <div>
              <h3 className="font-bold text-xs sm:text-base text-slate-900 dark:text-white leading-snug">
                {lang === 'bn' ? 'ছবি এডজাস্টমেন্ট ও ক্রপ এডিটর' : 'Photo Adjustments & Crop Editor'}
              </h3>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 hidden xs:block">
                {lang === 'bn' ? 'উজ্জ্বলতা, কনট্রাস্ট ও নির্দিষ্ট সাইজে ক্রপ করুন' : 'Adjust brightness, contrast, color & crop precisely'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body: Left Preview, Right Controls */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-y-auto">
          {/* Preview Panel */}
          <div className="md:col-span-7 bg-slate-950 p-3 sm:p-4 md:p-6 flex flex-col items-center justify-center min-h-[220px] sm:min-h-[320px] md:min-h-[400px] relative select-none">
            <div className="relative max-w-full max-h-[260px] sm:max-h-[340px] flex items-center justify-center rounded-lg overflow-hidden border border-slate-800 shadow-2xl bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:12px_12px]">
              <img
                src={previewSrc}
                alt="Preview"
                className="max-h-[240px] sm:max-h-[320px] max-w-full object-contain"
              />
              {isProcessing && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center text-white text-xs font-medium">
                  <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                  <span>{lang === 'bn' ? 'প্রসেসিং হচ্ছে...' : 'Processing...'}</span>
                </div>
              )}
            </div>

            {/* Quick Rotate & Flip toolbar */}
            <div className="mt-4 flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-1.5 text-white flex-wrap justify-center shadow-lg">
              <button
                type="button"
                onClick={() => updateAdj('rotation', (adjustments.rotation + 90) % 360)}
                className="p-1.5 px-2 hover:bg-slate-800 rounded-lg text-xs flex items-center gap-1.5 transition text-slate-300 hover:text-white cursor-pointer"
                title={lang === 'bn' ? '৯০° ঘোরান' : 'Rotate 90° Clockwise'}
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? '৯০° ঘোরান' : 'Rotate 90°'}</span>
              </button>
              <div className="w-px h-4 bg-slate-800" />
              <button
                type="button"
                onClick={() => updateAdj('flipH', !adjustments.flipH)}
                className={`p-1.5 px-2 hover:bg-slate-800 rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer ${
                  adjustments.flipH ? 'bg-blue-600/40 text-blue-400 font-semibold' : 'text-slate-300 hover:text-white'
                }`}
                title={lang === 'bn' ? 'আড়াআড়ি উল্টান' : 'Flip Horizontally'}
              >
                <FlipHorizontal className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'আড়াআড়ি' : 'Flip H'}</span>
              </button>
              <button
                type="button"
                onClick={() => updateAdj('flipV', !adjustments.flipV)}
                className={`p-1.5 px-2 hover:bg-slate-800 rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer ${
                  adjustments.flipV ? 'bg-blue-600/40 text-blue-400 font-semibold' : 'text-slate-300 hover:text-white'
                }`}
                title={lang === 'bn' ? 'উল্টো করুন' : 'Flip Vertically'}
              >
                <FlipVertical className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'উল্টো' : 'Flip V'}</span>
              </button>
            </div>
          </div>

          {/* Controls Panel */}
          <div className="md:col-span-5 p-4 sm:p-5 flex flex-col bg-slate-50 dark:bg-slate-900/60 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800">
            {/* Tabs: ONLY 2 Tabs (Adjustments & Crop) */}
            <div className="flex rounded-xl bg-slate-200 dark:bg-slate-800 p-1 mb-4 text-xs font-semibold border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setActiveTab('adjust')}
                className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  activeTab === 'adjust'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'উজ্জ্বলতা ও এডজাস্টমেন্ট' : 'Adjustments'}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('crop')}
                className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  activeTab === 'crop'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <CropIcon className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'ক্রপ ও অনুপাত' : 'Crop & Rotate'}</span>
              </button>
            </div>

            {/* TAB 1: Photo Adjustments (Brightness, Contrast, Saturation, Sharpness, Warmth) */}
            {activeTab === 'adjust' && (
              <div className="space-y-4">
                {/* Brightness */}
                <div>
                  <div className="flex justify-between text-xs text-slate-700 dark:text-slate-300 font-medium mb-1">
                    <span>{t.brightness}</span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{adjustments.brightness}</span>
                  </div>
                  <input
                    type="range"
                    min="-60"
                    max="60"
                    value={adjustments.brightness}
                    onChange={(e) => updateAdj('brightness', Number(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>-60 ({lang === 'bn' ? 'অন্ধকার' : 'Dark'})</span>
                    <span>0</span>
                    <span>+60 ({lang === 'bn' ? 'উজ্জ্বল' : 'Bright'})</span>
                  </div>
                </div>

                {/* Contrast */}
                <div>
                  <div className="flex justify-between text-xs text-slate-700 dark:text-slate-300 font-medium mb-1">
                    <span>{t.contrast}</span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{adjustments.contrast}</span>
                  </div>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    value={adjustments.contrast}
                    onChange={(e) => updateAdj('contrast', Number(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>-50</span>
                    <span>0</span>
                    <span>+50</span>
                  </div>
                </div>

                {/* Saturation */}
                <div>
                  <div className="flex justify-between text-xs text-slate-700 dark:text-slate-300 font-medium mb-1">
                    <span>{t.saturation}</span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{adjustments.saturation}</span>
                  </div>
                  <input
                    type="range"
                    min="-60"
                    max="60"
                    value={adjustments.saturation}
                    onChange={(e) => updateAdj('saturation', Number(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>-60 (B&W)</span>
                    <span>0</span>
                    <span>+60 (Vibrant)</span>
                  </div>
                </div>

                {/* Sharpness */}
                <div>
                  <div className="flex justify-between text-xs text-slate-700 dark:text-slate-300 font-medium mb-1">
                    <span>{t.sharpness}</span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{adjustments.sharpness}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={adjustments.sharpness}
                    onChange={(e) => updateAdj('sharpness', Number(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>0% (Soft)</span>
                    <span>50%</span>
                    <span>100% (Sharp)</span>
                  </div>
                </div>

                {/* Warmth */}
                <div>
                  <div className="flex justify-between text-xs text-slate-700 dark:text-slate-300 font-medium mb-1">
                    <span>{t.warmth}</span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{adjustments.warmth}</span>
                  </div>
                  <input
                    type="range"
                    min="-40"
                    max="40"
                    value={adjustments.warmth}
                    onChange={(e) => updateAdj('warmth', Number(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>-40 ({lang === 'bn' ? 'শীতল' : 'Cool'})</span>
                    <span>0</span>
                    <span>+40 ({lang === 'bn' ? 'উষ্ণ' : 'Warm'})</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Crop & Rotation */}
            {activeTab === 'crop' && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-2">
                    {lang === 'bn' ? 'অনুপাত ও ক্রপ প্রিসেট:' : 'Crop Ratio Preset:'}
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => updateAdj('crop', null)}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                        !adjustments.crop
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold shadow-xs'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      <span className="block font-semibold">
                        {lang === 'bn' ? 'ফ্রি ক্রপ (মূল আকার)' : 'Full / Original'}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {lang === 'bn' ? 'সম্পূর্ণ ছবি বজায় থাকবে' : 'No cropping applied'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        updateAdj('crop', { x: 10, y: 5, width: 80, height: 95 })
                      }
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                        adjustments.crop && adjustments.crop.width === 80 && adjustments.crop.height === 95
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold shadow-xs'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      <span className="block font-semibold">
                        {lang === 'bn' ? 'পাসপোর্ট (৩৫×৪৫ মিমি)' : 'Passport (35×45 mm)'}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        ৭:৯ স্ট্যান্ডার্ড অনুপাত
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        updateAdj('crop', { x: 15, y: 10, width: 70, height: 87.5 })
                      }
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                        adjustments.crop && adjustments.crop.width === 70 && adjustments.crop.height === 87.5
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold shadow-xs'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      <span className="block font-semibold">
                        {lang === 'bn' ? 'স্ট্যাম্প (২০×২৫ মিমি)' : 'Stamp (20×25 mm)'}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        ৪:৫ ছোট স্ট্যাম্প অনুপাত
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        updateAdj('crop', { x: 10, y: 10, width: 80, height: 80 })
                      }
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                        adjustments.crop && adjustments.crop.width === 80 && adjustments.crop.height === 80
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold shadow-xs'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      <span className="block font-semibold">
                        {lang === 'bn' ? 'বর্গাকার (১:১ Square)' : 'Square (1:1)'}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        ভিসা ও প্রোফাইল মাপ
                      </span>
                    </button>
                  </div>
                </div>

                {/* Fine Angle Slider */}
                <div>
                  <div className="flex justify-between text-xs text-slate-700 dark:text-slate-300 font-medium mb-1">
                    <span>{lang === 'bn' ? 'ঘোরানোর কোণ (Fine Angle):' : 'Fine Angle Rotation:'}</span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{adjustments.rotation}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="1"
                    value={adjustments.rotation}
                    onChange={(e) => updateAdj('rotation', Number(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>0°</span>
                    <span>90°</span>
                    <span>180°</span>
                    <span>270°</span>
                    <span>360°</span>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
              >
                {t.reset}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={() => onSave(adjustments)}
                  className="px-4 py-2 text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition cursor-pointer"
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
