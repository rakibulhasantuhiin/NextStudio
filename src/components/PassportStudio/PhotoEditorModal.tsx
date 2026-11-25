import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  FlipHorizontal,
  FlipVertical,
  RefreshCw,
  RotateCw,
  Scissors,
  Sliders,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import { PhotoAdjustments, StudioBackdropPreset, StudioPhotoItem } from '../../types';
import { DEFAULT_ADJUSTMENTS } from '../../utils/constants';
import { generateFreeAiSinglePassport } from '../../utils/freeAiPassportStudio';
import { blendTwoImages, processStudioPhoto } from '../../utils/imageProcessing';
import { translations } from '../../utils/translations';

interface Props {
  photo: StudioPhotoItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    updatedAdjustments: PhotoAdjustments,
    newProcessedSrc?: string,
    newCutoutSrc?: string
  ) => void;
  onOpenCropModal?: () => void;
  defaultBgPreset?: StudioBackdropPreset;
  defaultCustomBgColor?: string;
  lang: 'bn' | 'en';
}

export const PhotoEditorModal: React.FC<Props> = ({
  photo,
  isOpen,
  onClose,
  onSave,
  onOpenCropModal,
  defaultBgPreset = 'classic-blue',
  defaultCustomBgColor = '#1B8CF2',
  lang,
}) => {
  const [adjustments, setAdjustments] = useState<PhotoAdjustments>(() => ({
    ...DEFAULT_ADJUSTMENTS,
    ...(photo?.adjustments || {}),
    sharpness:
      photo?.adjustments?.sharpness ?? photo?.clarityBaseline?.sharpness ?? 0,
    smoothness:
      photo?.adjustments?.smoothness ?? photo?.clarityBaseline?.smoothness ?? 0,
    skinLight: photo?.adjustments?.skinLight ?? 0,
    backgroundMode: photo?.adjustments?.backgroundMode || 'original',
  }));
  const [baseSrc, setBaseSrc] = useState<string>(
    photo?.enhancedSrc || photo?.processedSrc || photo?.originalSrc || ''
  );
  const [unenhancedBaseSrc, setUnenhancedBaseSrc] = useState<string>(
    photo?.unenhancedSrc || photo?.originalSrc || ''
  );
  const [clarityBaseline, setClarityBaseline] = useState<
    { sharpness: number; smoothness: number } | undefined
  >(photo?.clarityBaseline);
  const [previewSrc, setPreviewSrc] = useState<string>(
    photo?.enhancedSrc || photo?.processedSrc || photo?.originalSrc || ''
  );
  const [cutoutOverride, setCutoutOverride] = useState<string | undefined>(photo?.cutoutSrc);
  const [isBgRemoving, setIsBgRemoving] = useState<boolean>(false);
  const debounceTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!photo || !isOpen) return;
    const initialBase = photo.enhancedSrc || photo.processedSrc || photo.originalSrc;
    setBaseSrc(initialBase);
    setUnenhancedBaseSrc(photo.unenhancedSrc || photo.originalSrc);
    setClarityBaseline(photo.clarityBaseline);
    setPreviewSrc(initialBase);
    setCutoutOverride(photo.cutoutSrc);
    setAdjustments({
      ...DEFAULT_ADJUSTMENTS,
      ...photo.adjustments,
      sharpness:
        photo.adjustments.sharpness ?? photo.clarityBaseline?.sharpness ?? 0,
      smoothness:
        photo.adjustments.smoothness ?? photo.clarityBaseline?.smoothness ?? 0,
      skinLight: photo.adjustments.skinLight ?? 0,
      backgroundMode: photo.adjustments.backgroundMode || 'original',
    });
  }, [photo, isOpen]);

  // Instant zero-latency preview update (zero loading overlay, zero double-sharpen!)
  useEffect(() => {
    if (!isOpen || !baseSrc) return;
    if (debounceTimer.current) window.clearTimeout(debounceTimer.current);

    debounceTimer.current = window.setTimeout(async () => {
      try {
        let workingSrc = baseSrc;
        let residualSharpness = adjustments.sharpness;
        let residualSmoothness = adjustments.smoothness ?? 0;

        if (clarityBaseline) {
          const baseTotal = Math.max(
            1,
            (clarityBaseline.sharpness || 100) + (clarityBaseline.smoothness || 100)
          );
          const currTotal =
            (adjustments.sharpness ?? 0) + (adjustments.smoothness ?? 0);
          const ratio = Math.min(1, Math.max(0, currTotal / baseTotal));

          if (unenhancedBaseSrc && ratio < 0.995) {
            workingSrc = await blendTwoImages(unenhancedBaseSrc, baseSrc, ratio);
          }
          residualSharpness = Math.max(
            0,
            adjustments.sharpness - clarityBaseline.sharpness
          );
          residualSmoothness = Math.max(
            0,
            (adjustments.smoothness ?? 0) - clarityBaseline.smoothness
          );
        }

        const result = await processStudioPhoto(workingSrc, {
          ...adjustments,
          crop: null, // crop already baked or handled in CropStraightenModal
          backgroundMode: 'original',
          sharpness: residualSharpness,
          smoothness: residualSmoothness,
        });
        setPreviewSrc(result);
      } catch (err) {
        console.error('Failed to preview adjustments:', err);
      }
    }, 28);

    return () => {
      if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    };
  }, [adjustments, baseSrc, unenhancedBaseSrc, clarityBaseline, isOpen]);

  if (!isOpen || !photo) return null;

  const t = translations[lang];

  const handleRemoveBgOffline = async () => {
    if (isBgRemoving) return;
    setIsBgRemoving(true);
    try {
      const sourceForCutout = photo.originalSrc || photo.rawOriginalSrc || '';
      const res = await fetch(sourceForCutout);
      const blob = await res.blob();
      const file = new File([blob], 'photo.jpg', { type: blob.type || 'image/jpeg' });
      const result = await generateFreeAiSinglePassport(
        file,
        photo.aiBgPreset || defaultBgPreset,
        undefined,
        {
          customBgColor: photo.customBgColor || defaultCustomBgColor,
          enableStudioEnhance: true,
          enhanceIntensity: photo.enhanceIntensity || 'normal',
          preserveExactCrop: Boolean(photo.isUserCropped || photo.adjustments.crop),
        }
      );
      const nextBaseline = { sharpness: 100, smoothness: 100 };
      setBaseSrc(result.studioDataUrl);
      setUnenhancedBaseSrc(result.unenhancedDataUrl || result.studioDataUrl);
      setClarityBaseline(nextBaseline);
      setPreviewSrc(result.studioDataUrl);
      setCutoutOverride(result.cutoutDataUrl);
      setAdjustments((prev) => ({
        ...prev,
        rotation: 0,
        crop: null,
        sharpness: 100,
        smoothness: 100,
        backgroundMode:
          (photo.aiBgPreset || defaultBgPreset) === 'white' ? 'white' : 'sky-blue',
      }));
    } catch (err) {
      console.error('Offline background removal failed:', err);
    } finally {
      setIsBgRemoving(false);
    }
  };

  const updateAdj = <K extends keyof PhotoAdjustments>(key: K, value: PhotoAdjustments[K]) => {
    setAdjustments((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setAdjustments({
      ...DEFAULT_ADJUSTMENTS,
      sharpness: clarityBaseline?.sharpness ?? 0,
      smoothness: clarityBaseline?.smoothness ?? 0,
      skinLight: 0,
      backgroundMode: adjustments.backgroundMode,
    });
  };

  const smoothnessVal = adjustments.smoothness ?? 0;
  const skinLightVal = adjustments.skinLight ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-2 sm:p-4">
      <div className="w-full max-w-md glass-modal rounded-2xl flex flex-col max-h-[92vh] overflow-hidden shadow-2xl border border-slate-200/80 dark:border-white/15">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/70 dark:border-white/10 shrink-0 bg-white/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              {lang === 'bn' ? 'ম্যানুয়াল টুলস' : 'Manual Studio Tools'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sticky Live Portrait Preview */}
        <div className="px-4 py-3 bg-slate-100/90 dark:bg-slate-950/80 border-b border-slate-200/70 dark:border-white/10 flex flex-col items-center shrink-0">
          <div className="w-full rounded-xl bg-slate-200/65 dark:bg-slate-900 py-2.5 px-3 flex flex-col items-center gap-2">
            <div className="relative rounded-md overflow-hidden border-2 border-slate-900 dark:border-slate-500 bg-white shadow-sm">
              <img
                src={previewSrc}
                alt="Live manual preview"
                className="h-[145px] sm:h-[165px] w-auto object-contain"
              />
            </div>

            {/* Quick action row inside Manual Tools */}
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              <button
                type="button"
                disabled={isBgRemoving}
                onClick={() => void handleRemoveBgOffline()}
                className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isBgRemoving ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3" />
                )}
                <span>
                  {lang === 'bn' ? 'অফলাইন BG রিমুভ' : 'Remove BG'}
                </span>
              </button>

              {onOpenCropModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCropModal();
                  }}
                  className="px-2.5 py-1 rounded-lg glass-tile text-slate-800 dark:text-slate-100 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Scissors className="w-3 h-3 text-rose-500" />
                  <span>{lang === 'bn' ? 'ক্রপ ও সোজা' : 'Crop & Tilt'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => updateAdj('rotation', (adjustments.rotation + 90) % 360)}
                className="px-2 py-1 rounded-lg glass-tile text-slate-700 dark:text-slate-200 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                title={lang === 'bn' ? '৯০° ঘোরান' : 'Rotate 90°'}
              >
                <RotateCw className="w-3 h-3" />
                <span>90°</span>
              </button>

              <button
                type="button"
                onClick={() => updateAdj('flipH', !adjustments.flipH)}
                className={`px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer ${
                  adjustments.flipH
                    ? 'bg-blue-600 text-white'
                    : 'glass-tile text-slate-700 dark:text-slate-200'
                }`}
                title={lang === 'bn' ? 'আড়াআড়ি উল্টান' : 'Flip Horizontal'}
              >
                <FlipHorizontal className="w-3 h-3" />
              </button>

              <button
                type="button"
                onClick={() => updateAdj('flipV', !adjustments.flipV)}
                className={`px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer ${
                  adjustments.flipV
                    ? 'bg-blue-600 text-white'
                    : 'glass-tile text-slate-700 dark:text-slate-200'
                }`}
                title={lang === 'bn' ? 'উলম্ব উল্টান' : 'Flip Vertical'}
              >
                <FlipVertical className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Manual Sliders (Matches reference layout & zero-latency feedback) */}
        <div className="flex-1 overflow-y-auto px-4 py-3.5 space-y-4 bg-white/95 dark:bg-slate-900/95">
          {/* 1. Brightness (উজ্জ্বলতা) */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
              <span>{lang === 'bn' ? 'উজ্জ্বলতা' : t.brightness}</span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                {adjustments.brightness}
              </span>
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
              <span>{lang === 'bn' ? 'চাপা' : 'Dark'}</span>
              <span>{lang === 'bn' ? 'উজ্জ্বল' : 'Bright'}</span>
            </div>
          </div>

          {/* 2. Contrast (কনট্রাস্ট) */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
              <span>{lang === 'bn' ? 'কনট্রাস্ট' : t.contrast}</span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                {adjustments.contrast}
              </span>
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
              <span>{lang === 'bn' ? 'নরম' : 'Soft'}</span>
              <span>{lang === 'bn' ? 'জোরালো' : 'Strong'}</span>
            </div>
          </div>

          {/* 3. Warmth (উষ্ণতা) */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
              <span>{lang === 'bn' ? 'উষ্ণতা' : t.warmth}</span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                {adjustments.warmth}
              </span>
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
              <span>{lang === 'bn' ? 'ঠাণ্ডা (নীলচে)' : 'Cool'}</span>
              <span>{lang === 'bn' ? 'গরম (হলদেটে)' : 'Warm'}</span>
            </div>
          </div>

          {/* 4. Saturation (রঙের তীব্রতা) */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
              <span>{lang === 'bn' ? 'রঙের তীব্রতা' : t.saturation}</span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                {adjustments.saturation}
              </span>
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
              <span>{lang === 'bn' ? 'ফ্যাকাশে' : 'Muted'}</span>
              <span>{lang === 'bn' ? 'গাঢ় রঙ' : 'Vibrant'}</span>
            </div>
          </div>

          {/* 5. Sharpness (শার্পনেস) */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
              <span>{lang === 'bn' ? 'শার্পনেস' : t.sharpness}</span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                {adjustments.sharpness}
              </span>
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
              <span>{lang === 'bn' ? 'বাড়তি নেই' : 'None'}</span>
              <span>{lang === 'bn' ? 'ধারালো' : 'Sharp'}</span>
            </div>
          </div>

          {/* 6. Smoothness / Grain Reduction (মসৃণতা) */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
              <span>
                {lang === 'bn' ? 'মসৃণতা (দানা/দাগ কমানো)' : 'Smoothness (Denoise)'}
              </span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                {smoothnessVal}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={smoothnessVal}
              onChange={(e) => updateAdj('smoothness', Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>{lang === 'bn' ? 'বন্ধ' : 'Off'}</span>
              <span>{lang === 'bn' ? 'বেশি' : 'High'}</span>
            </div>
          </div>

          {/* 7. Skin Light Auto +/- Balance (স্ক্রিন আলো) */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
              <span className="flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>
                  {lang === 'bn' ? 'স্ক্রিন আলো (অটো ± সমন্বয়)' : 'Skin Light (Auto ± Balance)'}
                </span>
              </span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                {skinLightVal}
              </span>
            </div>
            <input
              type="range"
              min="-50"
              max="50"
              value={skinLightVal}
              onChange={(e) => updateAdj('skinLight', Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>{lang === 'bn' ? 'কম' : 'Low'}</span>
              <span>{lang === 'bn' ? 'বেশি' : 'Bright'}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-4 py-3 border-t border-slate-200/70 dark:border-white/10 flex items-center justify-between gap-2 shrink-0 bg-white/90 dark:bg-slate-900/90">
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition cursor-pointer"
          >
            {t.reset}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="button"
              onClick={() => onSave(adjustments, previewSrc, cutoutOverride)}
              className="px-4 py-2 text-xs font-bold glass-btn-primary text-white rounded-xl flex items-center gap-1.5 transition cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'ঠিক আছে' : t.applyChanges}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
