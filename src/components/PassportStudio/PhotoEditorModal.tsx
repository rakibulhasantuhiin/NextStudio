import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  Crop as CropIcon,
  Palette,
  RefreshCw,
  RotateCw,
  Sliders,
  Sun,
  X,
  Sparkles,
  FlipHorizontal,
  FlipVertical,
} from 'lucide-react';
import { PhotoAdjustments, StudioPhotoItem } from '../../types';
import { DEFAULT_ADJUSTMENTS } from '../../utils/constants';
import {
  detectPassportFramingAndStraighten,
  loadImage,
  processStudioPhoto,
} from '../../utils/imageProcessing';
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
  });
  const [previewSrc, setPreviewSrc] = useState<string>(photo.processedSrc || photo.originalSrc);
  const [activeTab, setActiveTab] = useState<'bg' | 'adjust' | 'crop'>('bg');
  const [isProcessing, setIsProcessing] = useState(false);
  const debounceTimer = useRef<number | null>(null);

  useEffect(() => {
    setAdjustments({ ...photo.adjustments });
  }, [photo]);

  // Live preview update
  useEffect(() => {
    if (!photo) return;
    if (debounceTimer.current) window.clearTimeout(debounceTimer.current);

    setIsProcessing(true);
    debounceTimer.current = window.setTimeout(async () => {
      try {
        const result = await processStudioPhoto(photo.originalSrc, adjustments);
        setPreviewSrc(result);
      } catch (err) {
        console.error('Failed to preview adjustments:', err);
      } finally {
        setIsProcessing(false);
      }
    }, 150);

    return () => {
      if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    };
  }, [adjustments, photo]);

  const updateAdj = <K extends keyof PhotoAdjustments>(key: K, value: PhotoAdjustments[K]) => {
    setAdjustments((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setAdjustments({ ...DEFAULT_ADJUSTMENTS });
  };

  const handleAutoDetectFraming = async () => {
    if (!photo) return;
    try {
      setIsProcessing(true);
      const img = await loadImage(photo.originalSrc);
      const framing = await detectPassportFramingAndStraighten(img, 35 / 45);
      setAdjustments((prev) => ({
        ...prev,
        crop: framing.crop,
        rotation: framing.rotation,
      }));
    } catch (err) {
      console.error('Failed auto detect in modal:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
              {t.photoEditorTitle}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body: Left Preview, Right Controls */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-y-auto">
          {/* Preview Panel */}
          <div className="md:col-span-7 bg-slate-950 p-4 sm:p-6 flex flex-col items-center justify-center min-h-[280px] sm:min-h-[380px] relative">
            <div className="relative max-w-full max-h-[360px] flex items-center justify-center rounded-lg overflow-hidden border border-slate-800 shadow-2xl bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:12px_12px]">
              <img
                src={previewSrc}
                alt="Preview"
                className="max-h-[340px] max-w-full object-contain"
              />
              {isProcessing && (
                <div className="absolute inset-0 bg-black/30 backdrop-blur-xs flex items-center justify-center text-white text-xs font-medium">
                  <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                  প্রসেসিং হচ্ছে...
                </div>
              )}
            </div>

            {/* Quick Rotate & Flip toolbar */}
            <div className="mt-4 flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1 text-white flex-wrap justify-center">
              <button
                onClick={handleAutoDetectFraming}
                className="p-1.5 px-2.5 hover:bg-blue-600 bg-blue-600/90 rounded-lg text-xs flex items-center gap-1 transition text-white font-medium shadow-xs"
                title="অটো ফেস ফ্রেম ও সোজা"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>অটো ফেস ফিট</span>
              </button>
              <div className="w-px h-4 bg-slate-800" />
              <button
                onClick={() => updateAdj('rotation', (adjustments.rotation + 90) % 360)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-xs flex items-center gap-1 transition text-slate-300 hover:text-white"
                title="Rotate 90 deg"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>৯০°</span>
              </button>
              <div className="w-px h-4 bg-slate-800" />
              <button
                onClick={() => updateAdj('flipH', !adjustments.flipH)}
                className={`p-1.5 hover:bg-slate-800 rounded-lg text-xs flex items-center gap-1 transition ${adjustments.flipH ? 'bg-blue-600/40 text-blue-400' : 'text-slate-300 hover:text-white'}`}
                title="Flip Horizontal"
              >
                <FlipHorizontal className="w-3.5 h-3.5" />
                <span>আড়াআড়ি</span>
              </button>
              <button
                onClick={() => updateAdj('flipV', !adjustments.flipV)}
                className={`p-1.5 hover:bg-slate-800 rounded-lg text-xs flex items-center gap-1 transition ${adjustments.flipV ? 'bg-blue-600/40 text-blue-400' : 'text-slate-300 hover:text-white'}`}
                title="Flip Vertical"
              >
                <FlipVertical className="w-3.5 h-3.5" />
                <span>উল্টো</span>
              </button>
            </div>
          </div>

          {/* Controls Panel */}
          <div className="md:col-span-5 p-4 sm:p-5 flex flex-col bg-slate-50/50 dark:bg-slate-900/50 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800">
            {/* Tabs */}
            <div className="flex rounded-xl bg-slate-200/80 dark:bg-slate-900 p-1 mb-4 text-xs font-semibold border border-slate-200/60 dark:border-slate-800">
              <button
                onClick={() => setActiveTab('bg')}
                className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition ${
                  activeTab === 'bg'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>ব্যাকগ্রাউন্ড</span>
              </button>
              <button
                onClick={() => setActiveTab('adjust')}
                className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition ${
                  activeTab === 'adjust'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>উজ্জ্বলতা ও রঙ</span>
              </button>
              <button
                onClick={() => setActiveTab('crop')}
                className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition ${
                  activeTab === 'crop'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>ক্রপ ও সোজা</span>
              </button>
            </div>

            {/* Tab 1: Background Removal & Replace */}
            {activeTab === 'bg' && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                    {t.bgRemoval}
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      onClick={() => updateAdj('backgroundMode', 'original')}
                      className={`p-2 rounded-xl border text-left flex items-center gap-2 transition ${
                        adjustments.backgroundMode === 'original'
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                      }`}
                    >
                      <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600 bg-slate-300 dark:bg-slate-700" />
                      <span>{t.bgOriginal}</span>
                    </button>

                    <button
                      onClick={() => updateAdj('backgroundMode', 'studio-blue')}
                      className={`p-2 rounded-xl border text-left flex items-center gap-2 transition ${
                        adjustments.backgroundMode === 'studio-blue'
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                      }`}
                    >
                      <div className="w-4 h-4 rounded-full bg-blue-600 shadow-xs" />
                      <span>{t.bgStudioBlue}</span>
                    </button>

                    <button
                      onClick={() => updateAdj('backgroundMode', 'white')}
                      className={`p-2 rounded-xl border text-left flex items-center gap-2 transition ${
                        adjustments.backgroundMode === 'white'
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                      }`}
                    >
                      <div className="w-4 h-4 rounded-full border border-slate-300 bg-white" />
                      <span>{t.bgWhite}</span>
                    </button>

                    <button
                      onClick={() => updateAdj('backgroundMode', 'sky-blue')}
                      className={`p-2 rounded-xl border text-left flex items-center gap-2 transition ${
                        adjustments.backgroundMode === 'sky-blue'
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                      }`}
                    >
                      <div className="w-4 h-4 rounded-full bg-sky-200 border border-sky-300" />
                      <span>{t.bgSkyBlue}</span>
                    </button>

                    <button
                      onClick={() => updateAdj('backgroundMode', 'off-white')}
                      className={`p-2 rounded-xl border text-left flex items-center gap-2 transition ${
                        adjustments.backgroundMode === 'off-white'
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                      }`}
                    >
                      <div className="w-4 h-4 rounded-full bg-slate-100 border border-slate-200" />
                      <span>{t.bgOffWhite}</span>
                    </button>

                    <div
                      className={`p-2 rounded-xl border flex items-center gap-2 transition ${
                        adjustments.backgroundMode === 'custom'
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                      }`}
                    >
                      <input
                        type="color"
                        value={adjustments.customBgColor}
                        onChange={(e) => {
                          updateAdj('customBgColor', e.target.value);
                          updateAdj('backgroundMode', 'custom');
                        }}
                        className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
                      />
                      <span
                        onClick={() => updateAdj('backgroundMode', 'custom')}
                        className="cursor-pointer text-xs"
                      >
                        {t.bgCustom}
                      </span>
                    </div>
                  </div>
                </div>

                {adjustments.backgroundMode !== 'original' && (
                  <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <div>
                      <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300 mb-1">
                        <span>{t.bgSensitivity}</span>
                        <span className="font-mono">{adjustments.bgSensitivity}%</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="80"
                        value={adjustments.bgSensitivity}
                        onChange={(e) => updateAdj('bgSensitivity', Number(e.target.value))}
                        className="w-full accent-blue-600"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300 mb-1">
                        <span>{t.bgFeather}</span>
                        <span className="font-mono">{adjustments.bgFeather}px</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={adjustments.bgFeather}
                        onChange={(e) => updateAdj('bgFeather', Number(e.target.value))}
                        className="w-full accent-blue-600"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Adjustments (Brightness, Contrast, Saturation, Sharpness) */}
            {activeTab === 'adjust' && (
              <div className="space-y-3.5">
                <div>
                  <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300 mb-1">
                    <span>{t.brightness}</span>
                    <span className="font-mono">{adjustments.brightness}</span>
                  </div>
                  <input
                    type="range"
                    min="-60"
                    max="60"
                    value={adjustments.brightness}
                    onChange={(e) => updateAdj('brightness', Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300 mb-1">
                    <span>{t.contrast}</span>
                    <span className="font-mono">{adjustments.contrast}</span>
                  </div>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    value={adjustments.contrast}
                    onChange={(e) => updateAdj('contrast', Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300 mb-1">
                    <span>{t.saturation}</span>
                    <span className="font-mono">{adjustments.saturation}</span>
                  </div>
                  <input
                    type="range"
                    min="-60"
                    max="60"
                    value={adjustments.saturation}
                    onChange={(e) => updateAdj('saturation', Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300 mb-1">
                    <span>{t.sharpness}</span>
                    <span className="font-mono">{adjustments.sharpness}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={adjustments.sharpness}
                    onChange={(e) => updateAdj('sharpness', Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300 mb-1">
                    <span>{t.warmth}</span>
                    <span className="font-mono">{adjustments.warmth}</span>
                  </div>
                  <input
                    type="range"
                    min="-40"
                    max="40"
                    value={adjustments.warmth}
                    onChange={(e) => updateAdj('warmth', Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                </div>
              </div>
            )}

            {/* Tab 3: Crop and Rotation */}
            {activeTab === 'crop' && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                    {t.cropPreset}
                  </label>
                  <button
                    onClick={handleAutoDetectFraming}
                    className="w-full mb-2.5 p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-emerald-100 transition shadow-xs"
                  >
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>✨ অটো ফেস ডিটেক্ট ও পাসপোর্ট ফ্রেম (Smart Fit)</span>
                  </button>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      onClick={() => updateAdj('crop', null)}
                      className={`p-2 rounded-xl border text-left transition ${
                        !adjustments.crop
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                      }`}
                    >
                      {t.cropFree} (মূল আকার)
                    </button>
                    <button
                      onClick={() =>
                        updateAdj('crop', { x: 12, y: 5, width: 76, height: 97.7 })
                      }
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-left hover:border-blue-400"
                    >
                      বিডি পাসপোর্ট (৩৫:৪৫ মিমি)
                    </button>
                    <button
                      onClick={() =>
                        updateAdj('crop', { x: 15, y: 10, width: 70, height: 87.5 })
                      }
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-left hover:border-blue-400"
                    >
                      স্ট্যাম্প সাইজ (২০:২৫ মিমি)
                    </button>
                    <button
                      onClick={() =>
                        updateAdj('crop', { x: 10, y: 10, width: 80, height: 80 })
                      }
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-left hover:border-blue-400"
                    >
                      বর্গাকার (১:১)
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300 mb-1">
                    <span>ঘোরানোর কোণ (Fine Angle)</span>
                    <span className="font-mono">{adjustments.rotation}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="1"
                    value={adjustments.rotation}
                    onChange={(e) => updateAdj('rotation', Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
              <button
                onClick={handleReset}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition"
              >
                {t.reset}
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition"
                >
                  {t.cancel}
                </button>
                <button
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
