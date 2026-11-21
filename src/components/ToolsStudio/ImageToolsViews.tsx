import React, { useState } from 'react';
import {
  Archive,
  Image as ImageIcon,
  Loader2,
  PenTool,
  Sparkles,
  Star,
} from 'lucide-react';
import {
  ProcessedFileResult,
  downloadFilesAsZip,
  getBaseName,
  processGovtPhotoOrSign,
  processImageCompress,
  processImageConvert,
  processImageResize,
  processImagesToPdf,
} from '../../utils/toolsEngine';
import {
  BulkZipNotice,
  FileDropzone,
  ProcessedResultsList,
  SelectedFileItem,
  ToolHeader,
  ToolId,
  ToolsLang,
  createFileItems,
  fmtToolNum,
} from './SharedToolUI';

interface CommonToolProps {
  lang?: ToolsLang;
  onBack: () => void;
  onNavigateTool?: (id: ToolId) => void;
}

// ============================================================================
// 1. Govt Job Photo & Signature Maker
// ============================================================================

interface GovtPreset {
  id: string;
  labelEn: string;
  labelBn: string;
  photoW: number;
  photoH: number;
  photoMaxKb: number;
  signW: number;
  signH: number;
  signMaxKb: number;
}

const GOVT_PRESETS: GovtPreset[] = [
  {
    id: 'teletalk',
    labelEn: 'BCS / Primary Teacher / Teletalk Application',
    labelBn: 'বিসিএস / প্রাথমিক শিক্ষক / টেলিটক-ভিত্তিক আবেদন',
    photoW: 300,
    photoH: 300,
    photoMaxKb: 100,
    signW: 300,
    signH: 80,
    signMaxKb: 60,
  },
  {
    id: 'nbr',
    labelEn: 'NBR Career Portal',
    labelBn: 'এনবিআর ক্যারিয়ার পোর্টাল',
    photoW: 300,
    photoH: 300,
    photoMaxKb: 100,
    signW: 300,
    signH: 80,
    signMaxKb: 60,
  },
  {
    id: 'cuet',
    labelEn: 'CUET Admission',
    labelBn: 'CUET ভর্তি',
    photoW: 300,
    photoH: 300,
    photoMaxKb: 100,
    signW: 300,
    signH: 80,
    signMaxKb: 50,
  },
];

export const GovtPhotoSignTool: React.FC<CommonToolProps> = ({ lang = 'en', onBack }) => {
  const isBn = lang === 'bn';
  const [presetId, setPresetId] = useState<string>('teletalk');

  // Photo state
  const [photoFiles, setPhotoFiles] = useState<SelectedFileItem[]>([]);
  const [photoW, setPhotoW] = useState<number>(300);
  const [photoH, setPhotoH] = useState<number>(300);
  const [photoMaxKb, setPhotoMaxKb] = useState<number>(100);
  const [photoFit, setPhotoFit] = useState<'crop' | 'contain'>('crop');

  // Signature state
  const [signFiles, setSignFiles] = useState<SelectedFileItem[]>([]);
  const [signW, setSignW] = useState<number>(300);
  const [signH, setSignH] = useState<number>(80);
  const [signMaxKb, setSignMaxKb] = useState<number>(60);
  const [signFit, setSignFit] = useState<'crop' | 'contain'>('contain');
  const [cleanSign, setCleanSign] = useState<boolean>(true);

  const [isProcessing, setIsProcessing] = useState<'none' | 'photo' | 'sign' | 'both'>('none');
  const [results, setResults] = useState<ProcessedFileResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const applyPreset = (p: GovtPreset) => {
    setPresetId(p.id);
    setPhotoW(p.photoW);
    setPhotoH(p.photoH);
    setPhotoMaxKb(p.photoMaxKb);
    setSignW(p.signW);
    setSignH(p.signH);
    setSignMaxKb(p.signMaxKb);
  };

  const runPhotoProcess = async () => {
    if (photoFiles.length === 0) return;
    setError(null);
    setIsProcessing('photo');
    try {
      const out: ProcessedFileResult[] = [];
      for (const item of photoFiles) {
        out.push(
          await processGovtPhotoOrSign(item.file, {
            width: photoW || 300,
            height: photoH || 300,
            maxKb: photoMaxKb || 100,
            fitMode: photoFit,
            cleanSignature: false,
            suffix: 'photo',
          })
        );
      }
      setResults(out);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : isBn
          ? 'ছবি প্রসেস করা যায়নি।'
          : 'Failed to process photo.'
      );
    } finally {
      setIsProcessing('none');
    }
  };

  const runSignProcess = async () => {
    if (signFiles.length === 0) return;
    setError(null);
    setIsProcessing('sign');
    try {
      const out: ProcessedFileResult[] = [];
      for (const item of signFiles) {
        out.push(
          await processGovtPhotoOrSign(item.file, {
            width: signW || 300,
            height: signH || 80,
            maxKb: signMaxKb || 60,
            fitMode: signFit,
            cleanSignature: cleanSign,
            suffix: 'signature',
          })
        );
      }
      setResults(out);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : isBn
          ? 'স্বাক্ষর প্রসেস করা যায়নি।'
          : 'Failed to process signature.'
      );
    } finally {
      setIsProcessing('none');
    }
  };

  const runBothProcess = async () => {
    if (photoFiles.length === 0 && signFiles.length === 0) return;
    setError(null);
    setIsProcessing('both');
    try {
      const out: ProcessedFileResult[] = [];
      for (const item of photoFiles) {
        out.push(
          await processGovtPhotoOrSign(item.file, {
            width: photoW || 300,
            height: photoH || 300,
            maxKb: photoMaxKb || 100,
            fitMode: photoFit,
            cleanSignature: false,
            suffix: 'photo',
          })
        );
      }
      for (const item of signFiles) {
        out.push(
          await processGovtPhotoOrSign(item.file, {
            width: signW || 300,
            height: signH || 80,
            maxKb: signMaxKb || 60,
            fitMode: signFit,
            cleanSignature: cleanSign,
            suffix: 'signature',
          })
        );
      }
      setResults(out);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : isBn
          ? 'ফাইল প্রসেস করা যায়নি।'
          : 'Failed to process files.'
      );
    } finally {
      setIsProcessing('none');
    }
  };

  return (
    <div>
      <ToolHeader
        title={isBn ? 'সরকারি আবেদনের ছবি ও স্বাক্ষর' : 'Govt Job Photo & Signature'}
        subtitle={
          isBn
            ? 'চাকরি বা ভর্তির অনলাইন আবেদনে চাওয়া মাপে ছবি (৩০০×৩০০) ও স্বাক্ষর (৩০০×৮০) — KB সীমাসহ, একটা বা অনেকগুলো একসাথে।'
            : 'Prepare exact-size photos (300×300 px) and signatures (300×80 px) with strict KB limits for online job & admission portals — single or bulk.'
        }
        categoryLabel={isBn ? 'ছবি ও PDF টুলস' : 'Image & PDF Tools'}
        onBack={onBack}
      />

      {/* Step 1: Presets */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 space-y-3 mb-4">
        <div className="text-sm font-extrabold text-slate-900 dark:text-white">
          {isBn ? '১. কোন আবেদন?' : '1. Choose Portal Preset'}
        </div>
        <div className="flex flex-wrap gap-2">
          {GOVT_PRESETS.map((p) => {
            const active = presetId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  active
                    ? 'bg-blue-600/12 dark:bg-blue-500/25 text-blue-700 dark:text-blue-300 border border-blue-500/60 shadow-sm'
                    : 'glass-tile text-slate-700 dark:text-slate-200'
                }`}
              >
                {isBn ? p.labelBn : p.labelEn}
              </button>
            );
          })}
        </div>

        <div className="rounded-xl px-3.5 py-2.5 bg-amber-50/90 dark:bg-amber-500/10 border border-amber-300/70 dark:border-amber-400/30 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
          <Star className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <span>
            {isBn
              ? 'আবেদনের সার্কুলারে যে মাপ ও KB লেখা আছে সেটাই চূড়ান্ত। নিচের মাপ আগে থেকে বসানো আছে, ঘরে নিজে বদলে নিতে পারবেন।'
              : 'Always follow the exact dimensions and KB limit stated in your official circular. Default values are prefilled below and can be customized anytime.'}
          </span>
        </div>
      </div>

      {/* Step 2 & 3: Separate Photo & Signature Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Card 2: Photo */}
        <div className="glass-panel rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white flex items-center justify-center shadow-sm">
              <ImageIcon className="w-4 h-4" />
            </div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
              {isBn ? '২. ছবি' : '2. Photo'}
            </h2>
          </div>

          <FileDropzone
            lang={lang}
            accept="image/*"
            multiple
            compact
            title={isBn ? 'ছবি বেছে নিন' : 'Select Photo(s)'}
            subtitle={
              isBn
                ? 'টেনে ছাড়ুন · একসাথে অনেকগুলোও চলে'
                : 'Drag & drop · multiple files supported'
            }
            files={photoFiles}
            onAddFiles={(newFiles) =>
              setPhotoFiles((prev) => [...prev, ...createFileItems(newFiles, 'image')])
            }
            onRemoveFile={(id) => setPhotoFiles((prev) => prev.filter((f) => f.id !== id))}
            onClearAll={() => setPhotoFiles([])}
          />

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
              {isBn ? 'মাপ ও সর্বোচ্চ সাইজ' : 'Dimensions & Max File Size'}
            </label>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <input
                type="number"
                min={20}
                max={4000}
                value={photoW}
                onChange={(e) => setPhotoW(Math.max(20, Number(e.target.value) || 0))}
                className="glass-input w-20 px-2.5 py-2 rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="font-bold text-slate-500">×</span>
              <input
                type="number"
                min={20}
                max={4000}
                value={photoH}
                onChange={(e) => setPhotoH(Math.max(20, Number(e.target.value) || 0))}
                className="glass-input w-20 px-2.5 py-2 rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="font-semibold text-slate-600 dark:text-slate-300">
                {isBn ? 'px, সর্বোচ্চ' : 'px, max'}
              </span>
              <input
                type="number"
                min={5}
                max={5000}
                value={photoMaxKb}
                onChange={(e) => setPhotoMaxKb(Math.max(5, Number(e.target.value) || 0))}
                className="glass-input w-20 px-2.5 py-2 rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="font-semibold text-slate-600 dark:text-slate-300">KB</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
              {isBn ? 'ছবি কীভাবে বসবে' : 'Image Fit Mode'}
            </div>
            <div className="flex flex-wrap gap-2">
              <label
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition ${
                  photoFit === 'crop'
                    ? 'bg-blue-600/12 dark:bg-blue-500/25 text-blue-700 dark:text-blue-300 border border-blue-500/60'
                    : 'glass-tile text-slate-700 dark:text-slate-200'
                }`}
              >
                <input
                  type="radio"
                  name="govt-photo-fit"
                  checked={photoFit === 'crop'}
                  onChange={() => setPhotoFit('crop')}
                  className="accent-blue-600"
                />
                <span>{isBn ? 'ঠিক মাপে ক্রপ' : 'Exact Center Crop'}</span>
              </label>
              <label
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition ${
                  photoFit === 'contain'
                    ? 'bg-blue-600/12 dark:bg-blue-500/25 text-blue-700 dark:text-blue-300 border border-blue-500/60'
                    : 'glass-tile text-slate-700 dark:text-slate-200'
                }`}
              >
                <input
                  type="radio"
                  name="govt-photo-fit"
                  checked={photoFit === 'contain'}
                  onChange={() => setPhotoFit('contain')}
                  className="accent-blue-600"
                />
                <span>{isBn ? 'পুরোটা আঁটান (সাদা ফাঁকা)' : 'Fit Full Image (White Pad)'}</span>
              </label>
            </div>
          </div>

          <button
            type="button"
            disabled={photoFiles.length === 0 || isProcessing !== 'none'}
            onClick={() => void runPhotoProcess()}
            className="glass-btn-primary px-5 py-2.5 rounded-xl text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
          >
            {isProcessing === 'photo' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{isBn ? 'ছবি তৈরি করুন' : 'Generate Photo'}</span>
          </button>
        </div>

        {/* Card 3: Signature */}
        <div className="glass-panel rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-sm">
              <PenTool className="w-4 h-4" />
            </div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
              {isBn ? '৩. স্বাক্ষর' : '3. Signature'}
            </h2>
          </div>

          <FileDropzone
            lang={lang}
            accept="image/*"
            multiple
            compact
            title={isBn ? 'স্বাক্ষর বেছে নিন' : 'Select Signature(s)'}
            subtitle={
              isBn
                ? 'টেনে ছাড়ুন · একসাথে অনেকগুলোও চলে'
                : 'Drag & drop · multiple files supported'
            }
            files={signFiles}
            onAddFiles={(newFiles) =>
              setSignFiles((prev) => [...prev, ...createFileItems(newFiles, 'image')])
            }
            onRemoveFile={(id) => setSignFiles((prev) => prev.filter((f) => f.id !== id))}
            onClearAll={() => setSignFiles([])}
          />

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
              {isBn ? 'মাপ ও সর্বোচ্চ সাইজ' : 'Dimensions & Max File Size'}
            </label>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <input
                type="number"
                min={20}
                max={4000}
                value={signW}
                onChange={(e) => setSignW(Math.max(20, Number(e.target.value) || 0))}
                className="glass-input w-20 px-2.5 py-2 rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="font-bold text-slate-500">×</span>
              <input
                type="number"
                min={20}
                max={4000}
                value={signH}
                onChange={(e) => setSignH(Math.max(20, Number(e.target.value) || 0))}
                className="glass-input w-20 px-2.5 py-2 rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="font-semibold text-slate-600 dark:text-slate-300">
                {isBn ? 'px, সর্বোচ্চ' : 'px, max'}
              </span>
              <input
                type="number"
                min={5}
                max={5000}
                value={signMaxKb}
                onChange={(e) => setSignMaxKb(Math.max(5, Number(e.target.value) || 0))}
                className="glass-input w-20 px-2.5 py-2 rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="font-semibold text-slate-600 dark:text-slate-300">KB</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
              {isBn ? 'ছবি কীভাবে বসবে' : 'Signature Fit Mode'}
            </div>
            <div className="flex flex-wrap gap-2">
              <label
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition ${
                  signFit === 'crop'
                    ? 'bg-blue-600/12 dark:bg-blue-500/25 text-blue-700 dark:text-blue-300 border border-blue-500/60'
                    : 'glass-tile text-slate-700 dark:text-slate-200'
                }`}
              >
                <input
                  type="radio"
                  name="govt-sign-fit"
                  checked={signFit === 'crop'}
                  onChange={() => setSignFit('crop')}
                  className="accent-blue-600"
                />
                <span>{isBn ? 'ঠিক মাপে ক্রপ' : 'Exact Center Crop'}</span>
              </label>
              <label
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition ${
                  signFit === 'contain'
                    ? 'bg-blue-600/12 dark:bg-blue-500/25 text-blue-700 dark:text-blue-300 border border-blue-500/60'
                    : 'glass-tile text-slate-700 dark:text-slate-200'
                }`}
              >
                <input
                  type="radio"
                  name="govt-sign-fit"
                  checked={signFit === 'contain'}
                  onChange={() => setSignFit('contain')}
                  className="accent-blue-600"
                />
                <span>{isBn ? 'পুরোটা আঁটান (সাদা ফাঁকা)' : 'Fit Full Image (White Pad)'}</span>
              </label>
            </div>
          </div>

          <div className="space-y-1">
            <label
              className={`px-3 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer transition ${
                cleanSign
                  ? 'bg-blue-600/12 dark:bg-blue-500/25 text-blue-700 dark:text-blue-300 border border-blue-500/60'
                  : 'glass-tile text-slate-700 dark:text-slate-200'
              }`}
            >
              <input
                type="checkbox"
                checked={cleanSign}
                onChange={(e) => setCleanSign(e.target.checked)}
                className="accent-blue-600 w-3.5 h-3.5"
              />
              <span>
                {isBn
                  ? 'স্বাক্ষর পরিষ্কার করুন (কাগজ সাদা, কালি গাঢ়)'
                  : 'Clean Signature (Pure White Paper & Crisp Ink)'}
              </span>
            </label>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {isBn
                ? 'সাদা কাগজে কলমে স্বাক্ষর করে ফোনে ছবি তুললে এটা চালু রাখুন।'
                : 'Keep enabled if you photographed a pen signature on white paper with a phone camera.'}
            </p>
          </div>

          <button
            type="button"
            disabled={signFiles.length === 0 || isProcessing !== 'none'}
            onClick={() => void runSignProcess()}
            className="glass-btn-primary px-5 py-2.5 rounded-xl text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
          >
            {isProcessing === 'sign' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{isBn ? 'স্বাক্ষর তৈরি করুন' : 'Generate Signature'}</span>
          </button>
        </div>
      </div>

      {/* Process Both CTA + Bulk Notice */}
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <button
          type="button"
          disabled={(photoFiles.length === 0 && signFiles.length === 0) || isProcessing !== 'none'}
          onClick={() => void runBothProcess()}
          className="glass-btn-primary px-6 py-3 rounded-xl text-white text-sm font-extrabold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
        >
          {isProcessing === 'both' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          <span>{isBn ? 'দুটোই প্রসেস করুন' : 'Process Both'}</span>
        </button>

        <BulkZipNotice lang={lang} />
      </div>

      {error && (
        <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-2.5 text-xs font-semibold text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <ProcessedResultsList
        lang={lang}
        results={results}
        zipFileName="NextStudio_Govt_Photo_Signature.zip"
        onClear={() => setResults([])}
      />
    </div>
  );
};

// ============================================================================
// 2. Image Resizer
// ============================================================================

const RESIZE_PRESETS: { labelEn: string; labelBn: string; w: number; h: number }[] = [
  { labelEn: 'Photo 300×300', labelBn: 'ছবি ৩০০×৩০০', w: 300, h: 300 },
  { labelEn: 'Signature 300×80', labelBn: 'স্বাক্ষর ৩০০×৮০', w: 300, h: 80 },
  { labelEn: 'Passport 35×45 mm', labelBn: 'পাসপোর্ট ৩৫×৪৫ মিমি', w: 413, h: 531 },
  { labelEn: 'Facebook 1080×1080', labelBn: 'ফেসবুক ১০৮০×১০৮০', w: 1080, h: 1080 },
  { labelEn: 'Facebook Share 1200×630', labelBn: 'ফেসবুক শেয়ার ১২০০×৬৩০', w: 1200, h: 630 },
];

export const ImageResizeTool: React.FC<CommonToolProps> = ({
  lang = 'en',
  onBack,
  onNavigateTool,
}) => {
  const isBn = lang === 'bn';
  const [files, setFiles] = useState<SelectedFileItem[]>([]);
  const [unit, setUnit] = useState<'px' | 'percent'>('px');
  const [widthStr, setWidthStr] = useState<string>('');
  const [heightStr, setHeightStr] = useState<string>('');
  const [percent, setPercent] = useState<number>(50);
  const [fitMode, setFitMode] = useState<'fit' | 'crop' | 'stretch'>('fit');
  const [maxKbStr, setMaxKbStr] = useState<string>('');
  const [format, setFormat] = useState<'original' | 'image/jpeg' | 'image/png' | 'image/webp'>(
    'original'
  );
  const [quality, setQuality] = useState<number>(90);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ProcessedFileResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleResize = async () => {
    if (files.length === 0) return;
    setError(null);
    setIsProcessing(true);
    try {
      const w = widthStr.trim() ? Number(widthStr) : null;
      const h = heightStr.trim() ? Number(heightStr) : null;
      const maxKb = maxKbStr.trim() ? Number(maxKbStr) : null;

      const out: ProcessedFileResult[] = [];
      for (const item of files) {
        out.push(
          await processImageResize(item.file, {
            unit,
            width: w && w > 0 ? w : null,
            height: h && h > 0 ? h : null,
            percent,
            fitMode,
            maxKb: maxKb && maxKb > 0 ? maxKb : null,
            format,
            quality: quality / 100,
          })
        );
      }
      setResults(out);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : isBn
          ? 'রিসাইজ করতে সমস্যা হয়েছে।'
          : 'Failed to resize images.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <ToolHeader
        title={isBn ? 'ছবি রিসাইজ' : 'Resize Image'}
        subtitle={
          isBn
            ? 'ছবির মাপ (পিক্সেল বা শতাংশ) বদলান — চাকরির আবেদনের ছবি ও স্বাক্ষরের মাপসহ রেডি সাইজ।'
            : 'Change image dimensions by pixels or percentage, with ready presets for job applications, passports, and social posts.'
        }
        categoryLabel={isBn ? 'ছবি ও PDF টুলস' : 'Image & PDF Tools'}
        onBack={onBack}
      />

      <div className="glass-panel rounded-2xl p-4 sm:p-6 space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Dropzone */}
          <div className="lg:col-span-5">
            <FileDropzone
              lang={lang}
              accept="image/*"
              multiple
              title={isBn ? 'ছবি বেছে নিন' : 'Choose Images'}
              subtitle={
                isBn
                  ? 'একসাথে অনেকগুলোও দিতে পারবেন · টেনে এনে ছাড়ুন'
                  : 'Upload multiple images at once · drag & drop'
              }
              files={files}
              onAddFiles={(newFiles) =>
                setFiles((prev) => [...prev, ...createFileItems(newFiles, 'image')])
              }
              onRemoveFile={(id) => setFiles((prev) => prev.filter((f) => f.id !== id))}
              onClearAll={() => setFiles([])}
            />
          </div>

          {/* Right: Settings */}
          <div className="lg:col-span-7 space-y-4">
            {/* Presets */}
            <div className="space-y-2">
              <div className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                {isBn ? 'রেডি মাপ' : 'Quick Presets'}
              </div>
              <div className="flex flex-wrap gap-2">
                {RESIZE_PRESETS.map((p) => {
                  const isActive =
                    unit === 'px' && widthStr === String(p.w) && heightStr === String(p.h);
                  return (
                    <button
                      key={p.labelEn}
                      type="button"
                      onClick={() => {
                        setUnit('px');
                        setWidthStr(String(p.w));
                        setHeightStr(String(p.h));
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        isActive
                          ? 'bg-blue-600/12 dark:bg-blue-500/25 text-blue-700 dark:text-blue-300 border border-blue-500/60'
                          : 'glass-tile text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {isBn ? p.labelBn : p.labelEn}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                {isBn ? 'সরকারি চাকরি/ভর্তির আবেদনের জন্য সরাসরি ' : 'For government job/admission portals, use the dedicated '}
                {onNavigateTool ? (
                  <button
                    type="button"
                    onClick={() => onNavigateTool('govt-photo-sign')}
                    className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
                  >
                    {isBn ? 'সরকারি আবেদনের ছবি ও স্বাক্ষর' : 'Govt Job Photo & Signature'}
                  </button>
                ) : (
                  <span className="font-bold">
                    {isBn ? 'সরকারি আবেদনের ছবি ও স্বাক্ষর' : 'Govt Job Photo & Signature'}
                  </span>
                )}
                {isBn
                  ? ' টুল ব্যবহার করুন। আবেদনের বিজ্ঞপ্তিতে যে মাপ ও KB লেখা আছে, সেটাই নিজে লিখে দিন — ওপরেরগুলো শুধু উদাহরণ।'
                  : ' tool. Always verify exact dimensions and KB limits from your official circular.'}
              </p>
            </div>

            {/* Unit Radio */}
            <div className="space-y-1.5">
              <div className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                {isBn ? 'মাপের ধরন' : 'Resize Unit'}
              </div>
              <div className="flex flex-wrap gap-2">
                <label
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer ${
                    unit === 'px'
                      ? 'bg-blue-600/12 dark:bg-blue-500/25 text-blue-700 dark:text-blue-300 border border-blue-500/60'
                      : 'glass-tile text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="resize-unit"
                    checked={unit === 'px'}
                    onChange={() => setUnit('px')}
                    className="accent-blue-600"
                  />
                  <span>{isBn ? 'পিক্সেল (px)' : 'Pixels (px)'}</span>
                </label>
                <label
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer ${
                    unit === 'percent'
                      ? 'bg-blue-600/12 dark:bg-blue-500/25 text-blue-700 dark:text-blue-300 border border-blue-500/60'
                      : 'glass-tile text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="resize-unit"
                    checked={unit === 'percent'}
                    onChange={() => setUnit('percent')}
                    className="accent-blue-600"
                  />
                  <span>{isBn ? 'শতাংশ (%)' : 'Percentage (%)'}</span>
                </label>
              </div>
            </div>

            {/* Dimensions Input */}
            {unit === 'px' ? (
              <div className="space-y-1.5">
                <div className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                  {isBn ? 'নতুন মাপ (px)' : 'New Dimensions (px)'}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    placeholder={isBn ? 'চওড়া' : 'Width'}
                    value={widthStr}
                    onChange={(e) => setWidthStr(e.target.value)}
                    className="glass-input w-28 px-3 py-2 rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="font-bold text-slate-500">×</span>
                  <input
                    type="number"
                    min={1}
                    placeholder={isBn ? 'উচ্চতা' : 'Height'}
                    value={heightStr}
                    onChange={(e) => setHeightStr(e.target.value)}
                    className="glass-input w-28 px-3 py-2 rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isBn
                    ? 'একটা ঘর ফাঁকা রাখলে অনুপাত ঠিক রেখে অন্যটা নিজে হিসাব হবে।'
                    : 'Leave one field blank to auto-calculate while preserving aspect ratio.'}
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-extrabold text-slate-800 dark:text-slate-100">
                  <span>{isBn ? 'শতাংশ (%)' : 'Scale Percentage (%)'}</span>
                  <span className="font-mono text-blue-600 dark:text-blue-400">
                    {fmtToolNum(percent, lang)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={200}
                  step={5}
                  value={percent}
                  onChange={(e) => setPercent(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>
            )}

            {/* Fit Mode */}
            {unit === 'px' && (
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    {
                      id: 'fit',
                      labelEn: 'Fit (Keep Aspect)',
                      labelBn: 'ছোট করা (অনুপাত ঠিক)',
                    },
                    { id: 'crop', labelEn: 'Exact Crop', labelBn: 'ঠিক মাপে ক্রপ' },
                    { id: 'stretch', labelEn: 'Stretch to Exact', labelBn: 'টেনে ঠিক মাপে' },
                  ] as const
                ).map((m) => (
                  <label
                    key={m.id}
                    className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer ${
                      fitMode === m.id
                        ? 'bg-blue-600/12 dark:bg-blue-500/25 text-blue-700 dark:text-blue-300 border border-blue-500/60'
                        : 'glass-tile text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="resize-fit"
                      checked={fitMode === m.id}
                      onChange={() => setFitMode(m.id)}
                      className="accent-blue-600"
                    />
                    <span>{isBn ? m.labelBn : m.labelEn}</span>
                  </label>
                ))}
              </div>
            )}

            {/* Max KB + Format + Quality */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-800 dark:text-slate-100 block">
                  {isBn
                    ? 'সর্বোচ্চ ফাইল সাইজ (KB) — ইচ্ছা হলে'
                    : 'Max File Size (KB) — Optional'}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={5}
                    placeholder={isBn ? 'যেমন ১০০' : 'e.g. 100'}
                    value={maxKbStr}
                    onChange={(e) => setMaxKbStr(e.target.value)}
                    className="glass-input w-32 px-3 py-2 rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">KB</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-800 dark:text-slate-100 block">
                  {isBn ? 'ফরম্যাট' : 'Format'}
                </label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as typeof format)}
                  className="glass-input w-full px-3 py-2 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="original" className="text-slate-900">
                    {isBn ? 'যেমন আছে' : 'Keep Original'}
                  </option>
                  <option value="image/jpeg" className="text-slate-900">
                    JPG
                  </option>
                  <option value="image/png" className="text-slate-900">
                    PNG
                  </option>
                  <option value="image/webp" className="text-slate-900">
                    WebP
                  </option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 max-w-sm">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 shrink-0">
                {isBn ? 'কোয়ালিটি' : 'Quality'}
              </span>
              <input
                type="range"
                min={20}
                max={100}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="flex-1 accent-blue-600 cursor-pointer"
              />
              <span className="text-xs font-mono font-extrabold text-slate-900 dark:text-white w-10 text-right tabular-nums">
                {fmtToolNum(quality, lang)}%
              </span>
            </div>

            <button
              type="button"
              disabled={files.length === 0 || isProcessing}
              onClick={() => void handleResize()}
              className="glass-btn-primary px-6 py-2.5 rounded-xl text-white text-sm font-extrabold inline-flex items-center gap-2 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
            >
              {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isBn ? 'রিসাইজ করুন' : 'Resize Images'}</span>
            </button>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-900/6 dark:border-white/8">
          <BulkZipNotice lang={lang} />
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-2.5 text-xs font-semibold text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <ProcessedResultsList
        lang={lang}
        results={results}
        zipFileName="NextStudio_Resized_Images.zip"
        onClear={() => setResults([])}
      />
    </div>
  );
};

// ============================================================================
// 3. Image Compressor (Target KB)
// ============================================================================

const QUICK_KB_TARGETS = [20, 50, 100, 200, 500];

export const ImageCompressTool: React.FC<CommonToolProps> = ({ lang = 'en', onBack }) => {
  const isBn = lang === 'bn';
  const [files, setFiles] = useState<SelectedFileItem[]>([]);
  const [targetKb, setTargetKb] = useState<number>(100);
  const [format, setFormat] = useState<'image/jpeg' | 'image/webp' | 'image/png'>('image/jpeg');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ProcessedFileResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleCompress = async () => {
    if (files.length === 0) return;
    setError(null);
    setIsProcessing(true);
    try {
      const out: ProcessedFileResult[] = [];
      for (const item of files) {
        out.push(await processImageCompress(item.file, targetKb || 100, format));
      }
      setResults(out);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : isBn
          ? 'কমপ্রেস করতে সমস্যা হয়েছে।'
          : 'Failed to compress images.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <ToolHeader
        title={isBn ? 'ছবির সাইজ কমান (KB)' : 'Compress Image (KB)'}
        subtitle={
          isBn
            ? '৫০ KB, ১০০ KB, ২০০ KB — যত KB লাগে তত KB-তে ছবি নামান, কোয়ালিটি যতটা সম্ভব ভালো রেখে।'
            : 'Shrink images under 50 KB, 100 KB, 200 KB or any custom target size while preserving maximum visual clarity.'
        }
        categoryLabel={isBn ? 'ছবি ও PDF টুলস' : 'Image & PDF Tools'}
        onBack={onBack}
      />

      <div className="glass-panel rounded-2xl p-4 sm:p-6 space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5">
            <FileDropzone
              lang={lang}
              accept="image/*"
              multiple
              title={isBn ? 'ছবি বেছে নিন' : 'Choose Images'}
              subtitle={
                isBn
                  ? 'একসাথে অনেকগুলোও দিতে পারবেন · টেনে এনে ছাড়ুন'
                  : 'Upload multiple images at once · drag & drop'
              }
              files={files}
              onAddFiles={(newFiles) =>
                setFiles((prev) => [...prev, ...createFileItems(newFiles, 'image')])
              }
              onRemoveFile={(id) => setFiles((prev) => prev.filter((f) => f.id !== id))}
              onClearAll={() => setFiles([])}
            />
          </div>

          <div className="lg:col-span-7 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-extrabold text-slate-800 dark:text-slate-100 block">
                {isBn ? 'ছবি কত KB-র নিচে চান?' : 'Target File Size Under (KB)'}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={5}
                  max={10000}
                  value={targetKb}
                  onChange={(e) => setTargetKb(Math.max(5, Number(e.target.value) || 0))}
                  className="glass-input w-28 px-3 py-2 rounded-xl text-sm font-mono font-extrabold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">KB</span>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {QUICK_KB_TARGETS.map((kb) => (
                  <button
                    key={kb}
                    type="button"
                    onClick={() => setTargetKb(kb)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      targetKb === kb
                        ? 'bg-blue-600/12 dark:bg-blue-500/25 text-blue-700 dark:text-blue-300 border border-blue-500/60'
                        : 'glass-tile text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {fmtToolNum(kb, lang)} KB
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 max-w-xs">
              <label className="text-xs font-extrabold text-slate-800 dark:text-slate-100 block">
                {isBn ? 'ফরম্যাট' : 'Output Format'}
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as typeof format)}
                className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="image/jpeg" className="text-slate-900">
                  {isBn ? 'JPG (সবখানে চলে)' : 'JPG (Universal Compatibility)'}
                </option>
                <option value="image/webp" className="text-slate-900">
                  {isBn ? 'WebP (সবচেয়ে ছোট সাইজ)' : 'WebP (Smallest File Size)'}
                </option>
                <option value="image/png" className="text-slate-900">
                  PNG
                </option>
              </select>
            </div>

            <button
              type="button"
              disabled={files.length === 0 || isProcessing}
              onClick={() => void handleCompress()}
              className="glass-btn-primary px-6 py-2.5 rounded-xl text-white text-sm font-extrabold inline-flex items-center gap-2 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
            >
              {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isBn ? 'সাইজ কমান' : 'Compress Images'}</span>
            </button>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-900/6 dark:border-white/8">
          <BulkZipNotice lang={lang} />
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-2.5 text-xs font-semibold text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <ProcessedResultsList
        lang={lang}
        results={results}
        zipFileName={`NextStudio_Compressed_${targetKb}KB.zip`}
        onClear={() => setResults([])}
      />
    </div>
  );
};

// ============================================================================
// 4. Image Format Converter (JPG / PNG / WebP)
// ============================================================================

export const ImageConvertTool: React.FC<CommonToolProps> = ({ lang = 'en', onBack }) => {
  const isBn = lang === 'bn';
  const [files, setFiles] = useState<SelectedFileItem[]>([]);
  const [format, setFormat] = useState<'image/jpeg' | 'image/png' | 'image/webp'>('image/jpeg');
  const [quality, setQuality] = useState<number>(92);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ProcessedFileResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleConvert = async () => {
    if (files.length === 0) return;
    setError(null);
    setIsProcessing(true);
    try {
      const out: ProcessedFileResult[] = [];
      for (const item of files) {
        out.push(await processImageConvert(item.file, format, quality / 100));
      }
      setResults(out);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : isBn
          ? 'কনভার্ট করতে সমস্যা হয়েছে।'
          : 'Failed to convert images.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <ToolHeader
        title={isBn ? 'ছবি কনভার্ট (JPG / PNG / WebP)' : 'Convert Image (JPG / PNG / WebP)'}
        subtitle={
          isBn
            ? 'এক ফরম্যাট থেকে অন্য ফরম্যাটে — একসাথে অনেক ছবি।'
            : 'Convert images between JPG, PNG, and WebP formats in bulk.'
        }
        categoryLabel={isBn ? 'ছবি ও PDF টুলস' : 'Image & PDF Tools'}
        onBack={onBack}
      />

      <div className="glass-panel rounded-2xl p-4 sm:p-6 space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5">
            <FileDropzone
              lang={lang}
              accept="image/*"
              multiple
              title={isBn ? 'ছবি বেছে নিন' : 'Choose Images'}
              subtitle={
                isBn
                  ? 'একসাথে অনেকগুলোও দিতে পারবেন · টেনে এনে ছাড়ুন'
                  : 'Upload multiple images at once · drag & drop'
              }
              files={files}
              onAddFiles={(newFiles) =>
                setFiles((prev) => [...prev, ...createFileItems(newFiles, 'image')])
              }
              onRemoveFile={(id) => setFiles((prev) => prev.filter((f) => f.id !== id))}
              onClearAll={() => setFiles([])}
            />
          </div>

          <div className="lg:col-span-7 space-y-4">
            <div className="space-y-1.5 max-w-xs">
              <label className="text-xs font-extrabold text-slate-800 dark:text-slate-100 block">
                {isBn ? 'কোন ফরম্যাটে চান?' : 'Convert To Format'}
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as typeof format)}
                className="glass-input w-full px-3 py-2.5 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="image/jpeg" className="text-slate-900">
                  JPG
                </option>
                <option value="image/png" className="text-slate-900">
                  PNG
                </option>
                <option value="image/webp" className="text-slate-900">
                  WebP
                </option>
              </select>
            </div>

            <div className="space-y-1 max-w-xs">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 shrink-0">
                  {isBn ? 'কোয়ালিটি' : 'Quality'}
                </span>
                <input
                  type="range"
                  min={20}
                  max={100}
                  disabled={format === 'image/png'}
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className="flex-1 accent-blue-600 cursor-pointer disabled:opacity-40"
                />
                <span className="text-xs font-mono font-extrabold text-slate-900 dark:text-white w-10 text-right tabular-nums">
                  {fmtToolNum(quality, lang)}%
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {isBn
                  ? 'কোয়ালিটি শুধু JPG ও WebP-তে কাজ করে।'
                  : 'Quality setting applies only to JPG and WebP formats.'}
              </p>
            </div>

            <button
              type="button"
              disabled={files.length === 0 || isProcessing}
              onClick={() => void handleConvert()}
              className="glass-btn-primary px-6 py-2.5 rounded-xl text-white text-sm font-extrabold inline-flex items-center gap-2 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
            >
              {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isBn ? 'কনভার্ট করুন' : 'Convert Images'}</span>
            </button>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-900/6 dark:border-white/8">
          <BulkZipNotice lang={lang} />
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-2.5 text-xs font-semibold text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <ProcessedResultsList
        lang={lang}
        results={results}
        zipFileName="NextStudio_Converted_Images.zip"
        onClear={() => setResults([])}
      />
    </div>
  );
};

// ============================================================================
// 5. Image to PDF
// ============================================================================

export const ImageToPdfTool: React.FC<CommonToolProps> = ({ lang = 'en', onBack }) => {
  const isBn = lang === 'bn';
  const [files, setFiles] = useState<SelectedFileItem[]>([]);
  const [pageMode, setPageMode] = useState<'a4' | 'image'>('a4');
  const [marginMm, setMarginMm] = useState<number>(10);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ProcessedFileResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleMove = (index: number, dir: -1 | 1) => {
    setFiles((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleBuildCombinedPdf = async () => {
    if (files.length === 0) return;
    setError(null);
    setIsProcessing(true);
    try {
      const blob = await processImagesToPdf(
        files.map((f) => f.file),
        pageMode,
        marginMm
      );
      const totalOrig = files.reduce((acc, f) => acc + f.file.size, 0);
      setResults([
        {
          id: `imgpdf-${Date.now()}`,
          name:
            files.length === 1
              ? `${getBaseName(files[0].file.name)}.pdf`
              : `NextStudio_Images_${files.length}pages.pdf`,
          originalName: files[0].file.name,
          originalSize: totalOrig,
          blob,
          infoText: isBn
            ? `${fmtToolNum(files.length, lang)}টি ছবি · ${
                pageMode === 'a4' ? 'A4 পাতা' : 'ছবির মাপে পাতা'
              }`
            : `${files.length} image${files.length === 1 ? '' : 's'} · ${
                pageMode === 'a4' ? 'A4 Page' : 'Image Size Page'
              }`,
        },
      ]);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : isBn
          ? 'PDF তৈরি করা যায়নি।'
          : 'Failed to create PDF.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBuildSeparateZip = async () => {
    if (files.length === 0) return;
    setError(null);
    setIsProcessing(true);
    try {
      const out: ProcessedFileResult[] = [];
      for (const item of files) {
        const blob = await processImagesToPdf([item.file], pageMode, marginMm);
        out.push({
          id: `imgpdf-${item.id}`,
          name: `${getBaseName(item.file.name)}.pdf`,
          originalName: item.file.name,
          originalSize: item.file.size,
          blob,
          infoText: isBn
            ? pageMode === 'a4'
              ? 'A4 পাতা'
              : 'ছবির মাপে পাতা'
            : pageMode === 'a4'
            ? 'A4 Page'
            : 'Image Size Page',
        });
      }
      setResults(out);
      if (out.length > 1) {
        await downloadFilesAsZip(
          out.map((r) => ({ name: r.name, blob: r.blob })),
          'NextStudio_Images_To_PDFs.zip'
        );
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : isBn
          ? 'আলাদা PDF তৈরি করা যায়নি।'
          : 'Failed to create separate PDFs.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <ToolHeader
        title={isBn ? 'ছবি থেকে PDF' : 'Image to PDF'}
        subtitle={
          isBn
            ? 'এক বা একাধিক ছবি জুড়ে একটা PDF — A4 পাতায় সাজানো, ক্রম বদলানো যায়।'
            : 'Combine one or multiple images into a single A4 or native-sized PDF with custom page ordering.'
        }
        categoryLabel={isBn ? 'ছবি ও PDF টুলস' : 'Image & PDF Tools'}
        onBack={onBack}
      />

      <div className="glass-panel rounded-2xl p-4 sm:p-6 space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5">
            <FileDropzone
              lang={lang}
              accept="image/*"
              multiple
              allowReorder
              onMoveFile={handleMove}
              title={isBn ? 'ছবি বেছে নিন' : 'Choose Images'}
              subtitle={
                isBn
                  ? 'একসাথে অনেকগুলোও দিতে পারবেন · টেনে এনে ছাড়ুন'
                  : 'Upload multiple images at once · drag & drop'
              }
              files={files}
              onAddFiles={(newFiles) =>
                setFiles((prev) => [...prev, ...createFileItems(newFiles, 'image')])
              }
              onRemoveFile={(id) => setFiles((prev) => prev.filter((f) => f.id !== id))}
              onClearAll={() => setFiles([])}
            />
          </div>

          <div className="lg:col-span-7 space-y-4">
            <div className="space-y-1.5">
              <div className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                {isBn ? 'পাতার মাপ' : 'Page Size'}
              </div>
              <div className="flex flex-wrap gap-2">
                <label
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer ${
                    pageMode === 'a4'
                      ? 'bg-blue-600/12 dark:bg-blue-500/25 text-blue-700 dark:text-blue-300 border border-blue-500/60'
                      : 'glass-tile text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="img-pdf-page"
                    checked={pageMode === 'a4'}
                    onChange={() => setPageMode('a4')}
                    className="accent-blue-600"
                  />
                  <span>{isBn ? 'A4 (ছবি মাঝখানে বসবে)' : 'A4 (Centered)'}</span>
                </label>
                <label
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer ${
                    pageMode === 'image'
                      ? 'bg-blue-600/12 dark:bg-blue-500/25 text-blue-700 dark:text-blue-300 border border-blue-500/60'
                      : 'glass-tile text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="img-pdf-page"
                    checked={pageMode === 'image'}
                    onChange={() => setPageMode('image')}
                    className="accent-blue-600"
                  />
                  <span>{isBn ? 'ছবির মাপেই পাতা' : 'Match Image Size'}</span>
                </label>
              </div>
            </div>

            <div className="space-y-1.5 max-w-xs">
              <label className="text-xs font-extrabold text-slate-800 dark:text-slate-100 block">
                {isBn ? 'চারপাশে ফাঁকা (মার্জিন)' : 'Page Margin'}
              </label>
              <select
                value={marginMm}
                onChange={(e) => setMarginMm(Number(e.target.value))}
                className="glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value={0} className="text-slate-900">
                  {isBn ? '০ মিমি (কোনো ফাঁকা নয়)' : '0 mm (No Margin)'}
                </option>
                <option value={5} className="text-slate-900">
                  {isBn ? '৫ মিমি' : '5 mm'}
                </option>
                <option value={10} className="text-slate-900">
                  {isBn ? '১০ মিমি' : '10 mm'}
                </option>
                <option value={15} className="text-slate-900">
                  {isBn ? '১৫ মিমি' : '15 mm'}
                </option>
                <option value={20} className="text-slate-900">
                  {isBn ? '২০ মিমি' : '20 mm'}
                </option>
              </select>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                {isBn
                  ? 'ছবির ক্রম বদলাতে তালিকার ↑ ↓ বোতাম চাপুন। প্রতিটা ছবি আলাদা পাতায় যাবে।'
                  : 'Use the ↑ ↓ arrows in the list to reorder images. Each image becomes a separate page.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                disabled={files.length === 0 || isProcessing}
                onClick={() => void handleBuildCombinedPdf()}
                className="glass-btn-primary px-6 py-2.5 rounded-xl text-white text-sm font-extrabold inline-flex items-center gap-2 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
              >
                {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{isBn ? 'PDF বানান' : 'Create PDF'}</span>
              </button>

              {files.length > 1 && (
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => void handleBuildSeparateZip()}
                  className="glass-tile px-4 py-2.5 rounded-xl text-slate-800 dark:text-slate-100 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-45"
                >
                  <Archive className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>{isBn ? 'প্রতিটি ছবি আলাদা PDF (ZIP)' : 'Separate PDF per Image (ZIP)'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-900/6 dark:border-white/8">
          <BulkZipNotice lang={lang} />
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-2.5 text-xs font-semibold text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <ProcessedResultsList
        lang={lang}
        results={results}
        zipFileName="NextStudio_Images_To_PDFs.zip"
        onClear={() => setResults([])}
      />
    </div>
  );
};
