import React, { useRef, useState } from 'react';
import {
  AlignCenter,
  Edit3,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  CuttingGuideStyle,
  MarginSettings,
  NIDCardSettings,
  PaperOrientation,
  PaperSizeType,
} from '../../types';
import { NID_STANDARD_HEIGHT, NID_STANDARD_WIDTH } from '../../utils/constants';
import {
  InspectorHeader,
  InspectorSection,
  InspectorTabs,
  PaperOutputSection,
} from '../ui/InspectorPrimitives';
import { NidEditorModal } from './NidEditorModal';

interface Props {
  lang: 'bn' | 'en';
  nid: NIDCardSettings;
  setNid: (updater: (prev: NIDCardSettings) => NIDCardSettings) => void;
  margins: MarginSettings;
  setMargins: (updater: (prev: MarginSettings) => MarginSettings) => void;
  paperSize: PaperSizeType;
  setPaperSize: (size: PaperSizeType) => void;
  customPaperWidth?: number;
  setCustomPaperWidth?: (w: number) => void;
  customPaperHeight?: number;
  setCustomPaperHeight?: (h: number) => void;
  orientation: PaperOrientation;
  setOrientation: (o: PaperOrientation) => void;
  cuttingGuide: CuttingGuideStyle;
  setCuttingGuide: (g: CuttingGuideStyle) => void;
  bleedArea: number;
  setBleedArea: (b: number) => void;
  colorProfile: 'srgb' | 'cmyk' | 'bw';
  setColorProfile: (p: 'srgb' | 'cmyk' | 'bw') => void;
  dpi: 150 | 300 | 600;
  setDpi: (dpi: 150 | 300 | 600) => void;
}

type NidTab = 'upload' | 'size' | 'paper';

export const NidControls: React.FC<Props> = ({
  lang,
  nid,
  setNid,
  paperSize,
  setPaperSize,
  customPaperWidth = 210,
  setCustomPaperWidth,
  customPaperHeight = 297,
  setCustomPaperHeight,
  orientation,
  setOrientation,
  cuttingGuide,
  setCuttingGuide,
  colorProfile,
  setColorProfile,
  dpi,
  setDpi,
}) => {
  const [activeTab, setActiveTab] = useState<NidTab>('upload');
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const [editorSide, setEditorSide] = useState<'front' | 'back' | null>(null);

  const handleUploadFront = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        const src = ev.target?.result as string;
        setNid((prev) => ({
          ...prev,
          frontImage: src,
          processedFrontImage: src,
        }));
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  const handleUploadBack = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        const src = ev.target?.result as string;
        setNid((prev) => ({
          ...prev,
          backImage: src,
          processedBackImage: src,
        }));
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-4 text-slate-800 dark:text-slate-100">
      <InspectorHeader
        title={lang === 'bn' ? 'স্মার্ট এনআইডি কার্ড প্রিন্ট' : 'Smart NID Card Studio'}
        description={
          lang === 'bn'
            ? 'উপর-নিচ ফরম্যাটে এনআইডি সামনের ও পেছনের অংশ আসল মাপে প্রিন্ট'
            : 'Print Front and Back sides stacked cleanly at official millimeter scale.'
        }
        meta={`${nid.cardWidth} × ${nid.cardHeight} mm`}
      />

      <InspectorTabs<NidTab>
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'upload', label: lang === 'bn' ? 'কার্ড আপলোড' : 'Card Upload' },
          { id: 'size', label: lang === 'bn' ? 'সাইজ ও অবস্থান' : 'Size & Layout' },
          { id: 'paper', label: lang === 'bn' ? 'পেপার ও প্রিন্ট' : 'Paper & Print' },
        ]}
      />

      {activeTab === 'upload' && (
        <div className="space-y-4">
          <InspectorSection
            first
            title={lang === 'en' ? 'Front & Back Sides' : 'সামনের ও পেছনের অংশ'}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Front */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {lang === 'en' ? 'Front Side' : 'সামনের অংশ'}
                  </span>
                  {nid.frontImage && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditorSide('front')}
                        className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 rounded cursor-pointer"
                        title={lang === 'en' ? 'Edit Front' : 'এডিট'}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setNid((prev) => ({
                            ...prev,
                            frontImage: '',
                            processedFrontImage: '',
                          }))
                        }
                        className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                        title={lang === 'en' ? 'Delete' : 'মুছুন'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                <div
                  onClick={() => frontInputRef.current?.click()}
                  className="relative aspect-[85.6/54] rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 overflow-hidden flex items-center justify-center bg-slate-50/70 dark:bg-slate-900 cursor-pointer transition-colors group"
                >
                  <input
                    ref={frontInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleUploadFront}
                    className="hidden"
                  />
                  {nid.processedFrontImage || nid.frontImage ? (
                    <img
                      src={(nid.processedFrontImage || nid.frontImage) || undefined}
                      alt="Front Side"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-slate-400 group-hover:text-blue-600 p-2 text-center">
                      <Upload className="w-4 h-4" />
                      <span className="text-xs font-semibold">
                        {lang === 'en' ? 'Upload Front' : 'সামনের ছবি'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Back */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {lang === 'en' ? 'Back Side' : 'পেছনের অংশ'}
                  </span>
                  {nid.backImage && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditorSide('back')}
                        className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 rounded cursor-pointer"
                        title={lang === 'en' ? 'Edit Back' : 'এডিট'}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setNid((prev) => ({
                            ...prev,
                            backImage: '',
                            processedBackImage: '',
                          }))
                        }
                        className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                        title={lang === 'en' ? 'Delete' : 'মুছুন'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                <div
                  onClick={() => backInputRef.current?.click()}
                  className="relative aspect-[85.6/54] rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 overflow-hidden flex items-center justify-center bg-slate-50/70 dark:bg-slate-900 cursor-pointer transition-colors group"
                >
                  <input
                    ref={backInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleUploadBack}
                    className="hidden"
                  />
                  {nid.processedBackImage || nid.backImage ? (
                    <img
                      src={(nid.processedBackImage || nid.backImage) || undefined}
                      alt="Back Side"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-slate-400 group-hover:text-blue-600 p-2 text-center">
                      <Upload className="w-4 h-4" />
                      <span className="text-xs font-semibold">
                        {lang === 'en' ? 'Upload Back' : 'পেছনের ছবি'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <label className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/60 flex items-center justify-between gap-3 cursor-pointer">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                    {lang === 'en' ? 'Clean White Document Filter' : 'সাদা ডকুমেন্ট স্ক্যানার ফিল্টার'}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                    {lang === 'en'
                      ? 'Removes table shadows & brightens paper background'
                      : 'টেবিলের ছায়া দূর করে পরিষ্কার সাদা প্রিন্ট তৈরি করে'}
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={nid.autoWhiteDocument}
                onChange={(e) =>
                  setNid((prev) => ({ ...prev, autoWhiteDocument: e.target.checked }))
                }
                className="w-4 h-4 accent-emerald-600 cursor-pointer shrink-0"
              />
            </label>
          </InspectorSection>
        </div>
      )}

      {activeTab === 'size' && (
        <div className="space-y-4">
          <InspectorSection
            first
            title={lang === 'en' ? 'Card Dimensions' : 'কার্ডের সাইজ'}
            meta={`${nid.cardWidth} × ${nid.cardHeight} mm`}
          >
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  setNid((prev) => ({
                    ...prev,
                    cardWidth: NID_STANDARD_WIDTH,
                    cardHeight: NID_STANDARD_HEIGHT,
                  }))
                }
                className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                  Math.abs(nid.cardWidth - NID_STANDARD_WIDTH) < 0.5
                    ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-blue-400'
                }`}
              >
                <span className="text-xs font-bold block">
                  {lang === 'en' ? 'Smart NID (ID-1)' : 'স্মার্ট এনআইডি (ID-1)'}
                </span>
                <span className="text-[11px] text-slate-400 font-mono block mt-0.5 tabular-nums">
                  85.6 × 54 mm
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setNid((prev) => ({
                    ...prev,
                    cardWidth: 92,
                    cardHeight: 60,
                  }))
                }
                className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                  Math.abs(nid.cardWidth - 92) < 0.5
                    ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-blue-400'
                }`}
              >
                <span className="text-xs font-bold block">
                  {lang === 'en' ? 'Old Voter ID' : 'পুরাতন ভোটার আইডি'}
                </span>
                <span className="text-[11px] text-slate-400 font-mono block mt-0.5 tabular-nums">
                  92 × 60 mm
                </span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  {lang === 'en' ? 'Width (mm)' : 'প্রস্থ (মিমি)'}
                </label>
                <input
                  type="number"
                  min="40"
                  max="180"
                  step="0.5"
                  value={nid.cardWidth}
                  onChange={(e) =>
                    setNid((prev) => ({
                      ...prev,
                      cardWidth: Math.max(40, Math.min(180, Number(e.target.value) || 85.6)),
                    }))
                  }
                  className="w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono tabular-nums"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  {lang === 'en' ? 'Height (mm)' : 'উচ্চতা (মিমি)'}
                </label>
                <input
                  type="number"
                  min="30"
                  max="180"
                  step="0.5"
                  value={nid.cardHeight}
                  onChange={(e) =>
                    setNid((prev) => ({
                      ...prev,
                      cardHeight: Math.max(30, Math.min(180, Number(e.target.value) || 54)),
                    }))
                  }
                  className="w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono tabular-nums"
                />
              </div>
            </div>
          </InspectorSection>

          <InspectorSection title={lang === 'en' ? 'Placement & Spacing' : 'অবস্থান ও গ্যাপ'}>
            <label className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <AlignCenter className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {lang === 'en' ? 'Center Vertically on Page' : 'পেজের মাঝখানে বসান'}
                </span>
              </div>
              <input
                type="checkbox"
                checked={nid.centerOnPage}
                onChange={(e) =>
                  setNid((prev) => ({ ...prev, centerOnPage: e.target.checked }))
                }
                className="w-4 h-4 accent-blue-600 cursor-pointer"
              />
            </label>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">
                  {lang === 'en' ? 'Gap between Front & Back' : 'উপর-নিচ মধ্যবর্তী গ্যাপ'}
                </span>
                <span className="font-mono font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
                  {nid.verticalSpacing} mm
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="40"
                value={nid.verticalSpacing}
                onChange={(e) =>
                  setNid((prev) => ({ ...prev, verticalSpacing: Number(e.target.value) }))
                }
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>
          </InspectorSection>
        </div>
      )}

      {activeTab === 'paper' && (
        <PaperOutputSection
          lang={lang}
          paperSize={paperSize}
          setPaperSize={setPaperSize}
          customPaperWidth={customPaperWidth}
          setCustomPaperWidth={setCustomPaperWidth}
          customPaperHeight={customPaperHeight}
          setCustomPaperHeight={setCustomPaperHeight}
          orientation={orientation}
          setOrientation={setOrientation}
          colorProfile={colorProfile}
          setColorProfile={setColorProfile}
          dpi={dpi}
          setDpi={setDpi}
          cuttingGuide={cuttingGuide}
          setCuttingGuide={setCuttingGuide}
          cuttingGuideOptions={[
            { id: 'none', labelEn: 'None', labelBn: 'নেই' },
            { id: 'scissors', labelEn: 'Scissors', labelBn: 'কাঁচি' },
            { id: 'dashed', labelEn: 'Dashed', labelBn: 'ড্যাশ' },
          ]}
        />
      )}

      {editorSide && (
        <NidEditorModal
          isOpen={true}
          side={editorSide}
          imageSrc={editorSide === 'front' ? nid.frontImage : nid.backImage}
          straightenAngle={editorSide === 'front' ? nid.frontStraighten : nid.backStraighten}
          autoWhiteDocument={nid.autoWhiteDocument}
          docThreshold={nid.docThreshold}
          docContrast={nid.docContrast}
          crop={editorSide === 'front' ? nid.frontCrop : nid.backCrop}
          brightness={editorSide === 'front' ? nid.frontBrightness : nid.backBrightness}
          onClose={() => setEditorSide(null)}
          onSave={({
            processedSrc,
            straightenAngle,
            crop,
            autoWhiteDocument,
            docThreshold,
            docContrast,
            brightness,
          }) => {
            setNid((prev) => ({
              ...prev,
              ...(editorSide === 'front'
                ? {
                    processedFrontImage: processedSrc,
                    frontStraighten: straightenAngle,
                    frontCrop: crop,
                    frontBrightness: brightness,
                  }
                : {
                    processedBackImage: processedSrc,
                    backStraighten: straightenAngle,
                    backCrop: crop,
                    backBrightness: brightness,
                  }),
              autoWhiteDocument,
              docThreshold,
              docContrast,
            }));
            setEditorSide(null);
          }}
          lang={lang}
        />
      )}
    </div>
  );
};
