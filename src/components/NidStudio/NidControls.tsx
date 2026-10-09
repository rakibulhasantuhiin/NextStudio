import React, { useRef, useState } from 'react';
import {
  AlignCenter,
  CreditCard,
  Edit3,
  RotateCw,
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
import { translations } from '../../utils/translations';
import { NidEditorModal } from './NidEditorModal';

interface Props {
  lang: 'bn' | 'en';
  nid: NIDCardSettings;
  setNid: (updater: (prev: NIDCardSettings) => NIDCardSettings) => void;
  margins: MarginSettings;
  setMargins: (updater: (prev: MarginSettings) => MarginSettings) => void;
  paperSize: PaperSizeType;
  setPaperSize: (size: PaperSizeType) => void;
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

export const NidControls: React.FC<Props> = ({
  lang,
  nid,
  setNid,
  paperSize,
  setPaperSize,
  orientation,
  setOrientation,
  cuttingGuide,
  setCuttingGuide,
}) => {
  const t = translations[lang];
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
    }
  };

  const handleRemoveFront = () => {
    setNid((prev) => ({
      ...prev,
      frontImage: '',
      processedFrontImage: '',
    }));
  };

  const handleRemoveBack = () => {
    setNid((prev) => ({
      ...prev,
      backImage: '',
      processedBackImage: '',
    }));
  };

  return (
    <div className="space-y-4 text-slate-800 dark:text-slate-100">
      {/* ======================================================== */}
      {/* 1. NID CARD IMAGES (কার্ডের সামনের ও পেছনের ছবি)          */}
      {/* ======================================================== */}
      <section className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
              ১
            </div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-normal">
              এনআইডি কার্ড আপলোড (সামনে ও পেছনে)
            </h2>
          </div>
        </div>

        {/* Front & Back Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Front Side Card */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-normal">
                সামনের অংশ (Front)
              </span>
              {nid.frontImage && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditorSide('front')}
                    className="text-[11px] font-semibold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>এডিট</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveFront}
                    className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                    title="ছবি মুছুন"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            <div
              onClick={() => frontInputRef.current?.click()}
              className="relative aspect-[85.6/54] rounded-md border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 overflow-hidden flex items-center justify-center bg-white dark:bg-slate-900 cursor-pointer group"
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
                <div className="flex flex-col items-center gap-1 text-slate-400 group-hover:text-blue-600 transition p-2 text-center">
                  <Upload className="w-5 h-5 mb-0.5" />
                  <span className="text-xs font-semibold leading-normal">সামনের ছবি আপলোড</span>
                  <span className="text-[10px] text-slate-400 leading-normal">ক্লিক বা ড্রপ করুন</span>
                </div>
              )}
            </div>
          </div>

          {/* Back Side Card */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-normal">
                পেছনের অংশ (Back)
              </span>
              {nid.backImage && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditorSide('back')}
                    className="text-[11px] font-semibold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>এডিট</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveBack}
                    className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                    title="ছবি মুছুন"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            <div
              onClick={() => backInputRef.current?.click()}
              className="relative aspect-[85.6/54] rounded-md border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 overflow-hidden flex items-center justify-center bg-white dark:bg-slate-900 cursor-pointer group"
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
                <div className="flex flex-col items-center gap-1 text-slate-400 group-hover:text-blue-600 transition p-2 text-center">
                  <Upload className="w-5 h-5 mb-0.5" />
                  <span className="text-xs font-semibold leading-normal">পেছনের ছবি আপলোড</span>
                  <span className="text-[10px] text-slate-400 leading-normal">ক্লিক বা ড্রপ করুন</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Clean Document Scanner Filter Toggle */}
        <div className="p-3 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-normal block">
                সাদা কাগজ ও ক্লিয়ার ডকুমেন্ট ফিল্টার
              </span>
              <span className="text-[11px] text-slate-500 leading-normal block">
                টেবিল, আঙ্গুল বা ছায়া পরিষ্কার করে ডকুমেন্ট একদম সাদা ও স্পষ্ট রাখবে
              </span>
            </div>
          </div>
          <input
            type="checkbox"
            checked={nid.autoWhiteDocument}
            onChange={(e) =>
              setNid((prev) => ({ ...prev, autoWhiteDocument: e.target.checked }))
            }
            className="w-4 h-4 accent-blue-600 cursor-pointer shrink-0"
          />
        </div>
      </section>

      {/* ======================================================== */}
      {/* 2. CARD DIMENSIONS & SPACING (কার্ডের সাইজ ও দূরত্ব)        */}
      {/* ======================================================== */}
      <section className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
              ২
            </div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-normal">
              স্মার্ট এনআইডি সাইজ ও অ্যালাইনমেন্ট
            </h2>
          </div>
          <span className="text-xs font-mono font-semibold text-blue-600">
            {nid.cardWidth} × {nid.cardHeight} মিমি
          </span>
        </div>

        {/* Card Standard Presets */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() =>
              setNid((prev) => ({
                ...prev,
                cardWidth: NID_STANDARD_WIDTH,
                cardHeight: NID_STANDARD_HEIGHT,
              }))
            }
            className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
              Math.abs(nid.cardWidth - NID_STANDARD_WIDTH) < 0.5
                ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-semibold'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 text-slate-700 dark:text-slate-300'
            }`}
          >
            <span className="font-bold block leading-normal">স্মার্ট এনআইডি (ID-1)</span>
            <span className="text-[10px] text-slate-400 font-mono block leading-normal mt-0.5">
              ৮৫.৬ × ৫৪ মিমি (আসল মাপ)
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
            className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
              Math.abs(nid.cardWidth - 92) < 0.5
                ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-semibold'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 text-slate-700 dark:text-slate-300'
            }`}
          >
            <span className="font-bold block leading-normal">পুরাতন লেমিনেটিং কার্ড</span>
            <span className="text-[10px] text-slate-400 font-mono block leading-normal mt-0.5">
              ৯২ × ৬০ মিমি (বড় সাইজ)
            </span>
          </button>
        </div>

        {/* Centered on page toggle */}
        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlignCenter className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-normal">
              এ৪ পেপারের মাঝখানে রাখা (Centered)
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
        </div>

        {/* Vertical Spacing Slider */}
        <div className="space-y-1 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-600 dark:text-slate-400 leading-normal">
              দুই অংশের মাঝের ফাঁকা দূরত্ব:
            </span>
            <span className="font-mono font-semibold text-blue-600">{nid.verticalSpacing} মিমি</span>
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
      </section>

      {/* ======================================================== */}
      {/* 3. PAPER & CUTTING GUIDE (পেপার ও কাটিং লাইন)               */}
      {/* ======================================================== */}
      <section className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
              ৩
            </div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-normal">
              পেপার ও কাটিং লাইন
            </h2>
          </div>
        </div>

        {/* Paper & Orientation */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1 leading-normal">
              কাগজের সাইজ:
            </label>
            <div className="grid grid-cols-2 gap-1">
              {(['a4', '4r'] as PaperSizeType[]).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setPaperSize(size)}
                  className={`py-1.5 px-2 rounded-md text-xs font-semibold text-center uppercase transition cursor-pointer ${
                    paperSize === size
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1 leading-normal">
              কাগজের দিক:
            </label>
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => setOrientation('portrait')}
                className={`py-1.5 px-1 rounded-md text-xs font-semibold text-center transition cursor-pointer ${
                  orientation === 'portrait'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                লম্বালম্বি
              </button>
              <button
                type="button"
                onClick={() => setOrientation('landscape')}
                className={`py-1.5 px-1 rounded-md text-xs font-semibold text-center transition cursor-pointer ${
                  orientation === 'landscape'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                আড়াআড়ি
              </button>
            </div>
          </div>
        </div>

        {/* Cutting Guides */}
        <div>
          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1 leading-normal">
            কাটার সুবিধার জন্য গাইড দাগ:
          </label>
          <div className="grid grid-cols-3 gap-1.5 text-xs">
            {[
              { id: 'none', label: '❌ কোনো দাগ নেই' },
              { id: 'scissors', label: '✂️ কাঁচি দাগ' },
              { id: 'dashed', label: '╌ ড্যাশ রেখা' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setCuttingGuide(item.id as CuttingGuideStyle)}
                className={`py-1.5 px-1 rounded-md text-xs font-medium text-center transition cursor-pointer ${
                  cuttingGuide === item.id
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold shadow-2xs ring-1 ring-blue-500'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* NID Modal Editor */}
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
          onSave={({ processedSrc, straightenAngle, crop, autoWhiteDocument, docThreshold, docContrast, brightness }) => {
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
