import React from 'react';
import {
  Camera,
  CreditCard,
  Edit3,
  Upload,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  CuttingGuideStyle,
  MarginSettings,
  NIDCardSettings,
  PaperDimensions,
  PaperOrientation,
  StudioMode,
} from '../types';
import { CalculatedItem } from '../utils/layoutCalculator';
import { translations } from '../utils/translations';

interface Props {
  mode: StudioMode;
  lang: 'bn' | 'en';
  paper: PaperDimensions;
  orientation: PaperOrientation;
  margins: MarginSettings;
  cuttingGuide: CuttingGuideStyle;
  bleedArea: number;
  colorProfile: 'srgb' | 'cmyk' | 'bw';
  zoom: number;
  setZoom?: (updater: (prev: number) => number) => void;
  onFitZoom?: () => void;
  passportItems: CalculatedItem[];
  activePhotoIndex: number;
  onSelectPhoto: (index: number) => void;
  onEditPhoto: (index: number) => void;
  nid: NIDCardSettings;
  onEditNidSide?: (side: 'front' | 'back') => void;
  onUploadPassportTrigger?: () => void;
  onUploadNidFrontTrigger?: () => void;
  onUploadNidBackTrigger?: () => void;
}

export const PaperPreview: React.FC<Props> = ({
  mode,
  lang,
  paper,
  orientation,
  margins,
  cuttingGuide,
  bleedArea,
  colorProfile,
  zoom,
  setZoom,
  onFitZoom,
  passportItems,
  activePhotoIndex,
  onSelectPhoto,
  onEditPhoto,
  nid,
  onEditNidSide,
  onUploadPassportTrigger,
  onUploadNidFrontTrigger,
  onUploadNidBackTrigger,
}) => {
  const t = translations[lang];

  const isLandscape = orientation === 'landscape';
  const paperWidthMm = isLandscape ? paper.height : paper.width;
  const paperHeightMm = isLandscape ? paper.width : paper.height;

  // 1mm = 3.5px at 1.0 zoom factor
  const mmToPx = 3.5 * zoom;
  const sheetWidthPx = paperWidthMm * mmToPx;
  const sheetHeightPx = paperHeightMm * mmToPx;

  return (
    <div className="relative flex-1 flex flex-col items-center justify-start p-3 sm:p-6 overflow-auto select-none min-h-full">
      {/* Paper Information Banner */}
      <div className="mb-3 text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2 flex-wrap justify-center">
        <span className="font-bold text-slate-800 dark:text-slate-200">
          {paper.name} ({paperWidthMm} × {paperHeightMm} মিমি)
        </span>
        <span aria-hidden="true" className="opacity-40">·</span>
        <span className="text-blue-600 dark:text-blue-400 font-semibold">
          {mode === 'passport'
            ? passportItems.length > 0
              ? `${passportItems.length}টি পাসপোর্ট ছবি সাজানো`
              : 'খালি পেপার (কোন ছবি নেই)'
            : nid.frontImage || nid.backImage
            ? 'এনআইডি স্মার্ট কার্ড (৮৫.৬ × ৫৪ মিমি)'
            : 'এনআইডি কার্ড স্লট (খালি)'}
        </span>
        <span aria-hidden="true" className="opacity-40">·</span>
        <span className="font-mono text-slate-600 dark:text-slate-300">
          {Math.round(zoom * 100)}% ডিসপ্লে
        </span>
      </div>

      {/* Realistic Paper Sheet Canvas */}
      <div className="relative pb-16">
        <div
          className="relative bg-white shadow-xl transition-all duration-150 border border-slate-300 dark:border-slate-700 overflow-hidden rounded-xs"
          style={{
            width: `${sheetWidthPx}px`,
            height: `${sheetHeightPx}px`,
            minWidth: `${sheetWidthPx}px`,
            minHeight: `${sheetHeightPx}px`,
            filter:
              colorProfile === 'bw'
                ? 'grayscale(100%)'
                : colorProfile === 'cmyk'
                ? 'saturate(0.85) contrast(1.05)'
                : 'none',
          }}
        >
          {/* Printable Margin Guidelines (subtle dashed boundary) */}
          <div
            className="absolute border border-dashed border-blue-400/20 pointer-events-none"
            style={{
              top: `${margins.top * mmToPx}px`,
              left: `${margins.left * mmToPx}px`,
              right: `${margins.right * mmToPx}px`,
              bottom: `${margins.bottom * mmToPx}px`,
            }}
          />

          {/* ======================================================== */}
          {/* 1. PASSPORT MODE CONTENT                                 */}
          {/* ======================================================== */}
          {mode === 'passport' && (
            <>
              {passportItems.length === 0 ? (
                /* Empty Sheet State (Clean, inviting, no dummy photo) */
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                  {/* Subtle Ghost Slots at Top of Paper (Shows where photos will appear) */}
                  <div
                    className="absolute flex gap-2 pointer-events-none opacity-40"
                    style={{
                      top: `${margins.top * mmToPx}px`,
                      left: `${margins.left * mmToPx}px`,
                    }}
                  >
                    {[1, 2, 3, 4, 5].map((slot) => (
                      <div
                        key={slot}
                        className="border border-dashed border-slate-400/70 rounded-xs flex flex-col items-center justify-center text-slate-400"
                        style={{
                          width: `${35 * mmToPx}px`,
                          height: `${45 * mmToPx}px`,
                        }}
                      >
                        <span className="text-[10px] font-mono">#{slot}</span>
                      </div>
                    ))}
                  </div>

                  {/* Center Guidance Card */}
                  <div className="relative z-10 max-w-sm p-6 rounded-2xl bg-white/95 border border-slate-200 shadow-lg text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                      <Camera className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                        কোনো ছবি নির্বাচন করা হয়নি
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        বাম পাশের প্যানেল থেকে ছবি আপলোড করুন অথবা নিচের বাটনে ক্লিক করুন। আপলোড করলেই তা স্বয়ংক্রিয়ভাবে পেপারে সাজানো হবে।
                      </p>
                    </div>
                    {onUploadPassportTrigger && (
                      <button
                        type="button"
                        onClick={onUploadPassportTrigger}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>ছবি আপলোড করুন</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* Rendered Passport Photos on Sheet */
                passportItems.map((item, idx) => {
                  const isSelected = item.photo.id === passportItems[activePhotoIndex]?.photo.id;

                  return (
                    <div
                      key={`${item.photo.id}-${idx}`}
                      onClick={() => onSelectPhoto(item.index % passportItems.length)}
                      onDoubleClick={() => onEditPhoto(item.index % passportItems.length)}
                      className={`absolute cursor-pointer group transition-all ${
                        isSelected
                          ? 'ring-2 ring-blue-500 shadow-md z-10'
                          : 'hover:ring-1 hover:ring-blue-400'
                      }`}
                      style={{
                        left: `${item.x * mmToPx}px`,
                        top: `${item.y * mmToPx}px`,
                        width: `${item.width * mmToPx}px`,
                        height: `${item.height * mmToPx}px`,
                      }}
                      title="ডাবল ক্লিক করে এডিট করুন"
                    >
                      <img
                        src={item.photo.processedSrc || item.photo.originalSrc}
                        alt="Photo"
                        className="w-full h-full object-cover pointer-events-none select-none"
                      />

                      {/* Bleed outline */}
                      {bleedArea > 0 && (
                        <div
                          className="absolute border border-red-400/60 pointer-events-none"
                          style={{
                            inset: `-${bleedArea * mmToPx}px`,
                          }}
                        />
                      )}

                      {/* Cutting guide markings */}
                      {cuttingGuide === 'scissors' && (
                        <>
                          <div className="absolute inset-0 border border-dotted border-slate-400/80 pointer-events-none" />
                          <span className="absolute -top-2.5 -left-2 text-[8px] text-slate-500 font-sans pointer-events-none select-none">
                            ✂
                          </span>
                        </>
                      )}
                      {cuttingGuide === 'dashed' && (
                        <div className="absolute inset-0 border border-dashed border-slate-400/80 pointer-events-none" />
                      )}
                      {cuttingGuide === 'solid' && (
                        <div className="absolute inset-0 border border-solid border-slate-300 pointer-events-none" />
                      )}

                      {/* Hover action badge */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditPhoto(item.index % passportItems.length);
                        }}
                        className="absolute bottom-1 right-1 p-1 bg-black/75 hover:bg-blue-600 text-white rounded opacity-0 group-hover:opacity-100 transition cursor-pointer"
                        title="এডিট করুন"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })
              )}
            </>
          )}

          {/* ======================================================== */}
          {/* 2. NID MODE CONTENT                                      */}
          {/* ======================================================== */}
          {mode === 'nid' && (
            (() => {
              const cardWpx = (nid.cardWidth || 85.6) * mmToPx;
              const cardHpx = (nid.cardHeight || 53.98) * mmToPx;
              const gapPx = (nid.verticalSpacing || 15) * mmToPx;
              const totalBlockHeight = cardHpx * 2 + gapPx;

              let frontXpx = margins.left * mmToPx;
              let frontYpx = margins.top * mmToPx;

              if (nid.centerOnPage) {
                frontXpx = (sheetWidthPx - cardWpx) / 2;
                frontYpx = (sheetHeightPx - totalBlockHeight) / 2;
              }

              const backYpx = frontYpx + cardHpx + gapPx;

              return (
                <>
                  {/* Front Card Slot */}
                  <div
                    onClick={() => {
                      if (nid.frontImage && onEditNidSide) {
                        onEditNidSide('front');
                      } else if (onUploadNidFrontTrigger) {
                        onUploadNidFrontTrigger();
                      }
                    }}
                    className={`absolute rounded-xs overflow-hidden transition cursor-pointer group shadow-2xs ${
                      nid.frontImage
                        ? 'border border-slate-300 bg-slate-50 hover:ring-2 hover:ring-blue-500'
                        : 'border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/50 hover:bg-blue-50/20'
                    }`}
                    style={{
                      left: `${frontXpx}px`,
                      top: `${frontYpx}px`,
                      width: `${cardWpx}px`,
                      height: `${cardHpx}px`,
                    }}
                  >
                    {nid.frontImage ? (
                      <div className="relative w-full h-full">
                        <img
                          src={nid.processedFrontImage || nid.frontImage}
                          alt="NID Front"
                          className="w-full h-full object-fill pointer-events-none"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onEditNidSide) onEditNidSide('front');
                          }}
                          className="absolute bottom-1 right-1 p-1 bg-black/70 hover:bg-blue-600 text-white rounded opacity-0 group-hover:opacity-100 transition cursor-pointer"
                          title="সামনের অংশ এডিট"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center text-slate-400 group-hover:text-blue-600 transition">
                        <CreditCard className="w-6 h-6 mb-1 opacity-70" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                          এনআইডি সামনের অংশ (Front)
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5">
                          ক্লিক করে ছবি আপলোড করুন
                        </span>
                      </div>
                    )}

                    {/* Cutting guide markings */}
                    {cuttingGuide === 'scissors' && (
                      <>
                        <div className="absolute inset-0 border border-dotted border-slate-400 pointer-events-none" />
                        <span className="absolute -top-3 -left-3 text-[10px] text-slate-500 font-sans pointer-events-none select-none">
                          ✂
                        </span>
                      </>
                    )}
                    {cuttingGuide === 'dashed' && (
                      <div className="absolute inset-0 border border-dashed border-slate-400 pointer-events-none" />
                    )}
                  </div>

                  {/* Back Card Slot */}
                  <div
                    onClick={() => {
                      if (nid.backImage && onEditNidSide) {
                        onEditNidSide('back');
                      } else if (onUploadNidBackTrigger) {
                        onUploadNidBackTrigger();
                      }
                    }}
                    className={`absolute rounded-xs overflow-hidden transition cursor-pointer group shadow-2xs ${
                      nid.backImage
                        ? 'border border-slate-300 bg-slate-50 hover:ring-2 hover:ring-blue-500'
                        : 'border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/50 hover:bg-blue-50/20'
                    }`}
                    style={{
                      left: `${frontXpx}px`,
                      top: `${backYpx}px`,
                      width: `${cardWpx}px`,
                      height: `${cardHpx}px`,
                    }}
                  >
                    {nid.backImage ? (
                      <div className="relative w-full h-full">
                        <img
                          src={nid.processedBackImage || nid.backImage}
                          alt="NID Back"
                          className="w-full h-full object-fill pointer-events-none"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onEditNidSide) onEditNidSide('back');
                          }}
                          className="absolute bottom-1 right-1 p-1 bg-black/70 hover:bg-blue-600 text-white rounded opacity-0 group-hover:opacity-100 transition cursor-pointer"
                          title="পেছনের অংশ এডিট"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center text-slate-400 group-hover:text-blue-600 transition">
                        <CreditCard className="w-6 h-6 mb-1 opacity-70" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                          এনআইডি পেছনের অংশ (Back)
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5">
                          ক্লিক করে ছবি আপলোড করুন
                        </span>
                      </div>
                    )}

                    {/* Cutting guide markings */}
                    {cuttingGuide === 'scissors' && (
                      <>
                        <div className="absolute inset-0 border border-dotted border-slate-400 pointer-events-none" />
                        <span className="absolute -top-3 -left-3 text-[10px] text-slate-500 font-sans pointer-events-none select-none">
                          ✂
                        </span>
                      </>
                    )}
                    {cuttingGuide === 'dashed' && (
                      <div className="absolute inset-0 border border-dashed border-slate-400 pointer-events-none" />
                    )}
                  </div>
                </>
              );
            })()
          )}
        </div>
      </div>

      {/* Floating Canvas Zoom Pill (Bottom Center) */}
      {setZoom && (
        <div className="sticky bottom-3 z-30 flex items-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-full px-2 py-1 shadow-lg border border-slate-200 dark:border-slate-800 gap-1 text-xs">
          <button
            onClick={() => setZoom((z) => Math.max(0.3, z - 0.1))}
            className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="জুম ছোট"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="px-1.5 font-mono font-semibold text-slate-700 dark:text-slate-300 text-xs min-w-10 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(2.0, z + 0.1))}
            className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="জুম বড়"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          {onFitZoom && (
            <button
              onClick={onFitZoom}
              className="px-2 py-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-full transition border-l border-slate-200 dark:border-slate-800 cursor-pointer ml-0.5"
              title="স্ক্রিনে ফিট করুন"
            >
              ফিট
            </button>
          )}
        </div>
      )}
    </div>
  );
};
