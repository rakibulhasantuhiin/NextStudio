import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Copy,
  CreditCard,
  Edit3,
  Move,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
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
  // Multi-size and interactive draggable placement props
  selectedItemId?: string | null;
  onSelectItem?: (id: string | null) => void;
  onMoveItem?: (id: string, newX: number, newY: number) => void;
  onNudgeItem?: (id: string, deltaX: number, deltaY: number) => void;
  onToggleItemSize?: (id: string, targetPreset: 'bd-passport' | 'bd-stamp') => void;
  onDuplicateItem?: (id: string) => void;
  onDeleteItem?: (id: string) => void;
  onAddStampCopy?: () => void;
  onAddPassportCopy?: () => void;
  onAutoAlignGrid?: () => void;
  onAutoSpreadWidth?: () => void;
  onCycleItemPhoto?: (id: string) => void;
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
  selectedItemId,
  onSelectItem,
  onMoveItem,
  onNudgeItem,
  onToggleItemSize,
  onDuplicateItem,
  onDeleteItem,
  onAddStampCopy,
  onAddPassportCopy,
  onAutoAlignGrid,
  onAutoSpreadWidth,
  onCycleItemPhoto,
}) => {
  const t = translations[lang];

  const isLandscape = orientation === 'landscape';
  const paperWidthMm = isLandscape ? paper.height : paper.width;
  const paperHeightMm = isLandscape ? paper.width : paper.height;

  // 1mm = 3.5px at 1.0 zoom factor
  const mmToPx = 3.5 * zoom;
  const sheetWidthPx = paperWidthMm * mmToPx;
  const sheetHeightPx = paperHeightMm * mmToPx;

  // Mouse / Touch Dragging State
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const dragRef = useRef<{
    itemId: string;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  // Start mouse drag
  const handleMouseDownItem = (e: React.MouseEvent, item: CalculatedItem) => {
    // If clicked on an action button, don't initiate drag
    if ((e.target as HTMLElement).closest('button')) return;

    e.preventDefault();
    e.stopPropagation();

    onSelectItem?.(item.id);
    onSelectPhoto(item.index % Math.max(1, passportItems.length));

    dragRef.current = {
      itemId: item.id,
      startX: e.clientX,
      startY: e.clientY,
      originX: item.x,
      originY: item.y,
    };
    setDraggingItemId(item.id);
  };

  // Start touch drag
  const handleTouchStartItem = (e: React.TouchEvent, item: CalculatedItem) => {
    if ((e.target as HTMLElement).closest('button')) return;
    if (e.touches.length !== 1) return;

    const touch = e.touches[0];
    onSelectItem?.(item.id);
    onSelectPhoto(item.index % Math.max(1, passportItems.length));

    dragRef.current = {
      itemId: item.id,
      startX: touch.clientX,
      startY: touch.clientY,
      originX: item.x,
      originY: item.y,
    };
    setDraggingItemId(item.id);
  };

  // Window drag events for mouse & touch
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current || !onMoveItem) return;
      const { itemId, startX, startY, originX, originY } = dragRef.current;
      const targetItem = passportItems.find((i) => i.id === itemId);
      if (!targetItem) return;

      const deltaX_px = e.clientX - startX;
      const deltaY_px = e.clientY - startY;
      const deltaX_mm = deltaX_px / mmToPx;
      const deltaY_mm = deltaY_px / mmToPx;

      const newX = Math.max(0, Math.min(paperWidthMm - targetItem.width, originX + deltaX_mm));
      const newY = Math.max(0, Math.min(paperHeightMm - targetItem.height, originY + deltaY_mm));

      // Snap to 0.5 mm
      const snappedX = Math.round(newX * 2) / 2;
      const snappedY = Math.round(newY * 2) / 2;

      onMoveItem(itemId, snappedX, snappedY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!dragRef.current || !onMoveItem || e.touches.length !== 1) return;
      const touch = e.touches[0];
      const { itemId, startX, startY, originX, originY } = dragRef.current;
      const targetItem = passportItems.find((i) => i.id === itemId);
      if (!targetItem) return;

      const deltaX_px = touch.clientX - startX;
      const deltaY_px = touch.clientY - startY;
      const deltaX_mm = deltaX_px / mmToPx;
      const deltaY_mm = deltaY_px / mmToPx;

      const newX = Math.max(0, Math.min(paperWidthMm - targetItem.width, originX + deltaX_mm));
      const newY = Math.max(0, Math.min(paperHeightMm - targetItem.height, originY + deltaY_mm));

      const snappedX = Math.round(newX * 2) / 2;
      const snappedY = Math.round(newY * 2) / 2;

      onMoveItem(itemId, snappedX, snappedY);
    };

    const handleDragEnd = () => {
      if (dragRef.current) {
        dragRef.current = null;
        setDraggingItemId(null);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleDragEnd);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleDragEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [passportItems, mmToPx, paperWidthMm, paperHeightMm, onMoveItem]);

  // Keyboard navigation for selected photo: Arrow keys to move, Delete to remove, Ctrl+D to duplicate
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedItemId || !onNudgeItem) return;

      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return;
      }

      const step = e.shiftKey ? 5 : 1; // 1 mm step, 5 mm with Shift

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onNudgeItem(selectedItemId, -step, 0);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onNudgeItem(selectedItemId, step, 0);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        onNudgeItem(selectedItemId, 0, -step);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        onNudgeItem(selectedItemId, 0, step);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        onDeleteItem?.(selectedItemId);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        onDuplicateItem?.(selectedItemId);
      } else if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        onToggleItemSize?.(selectedItemId, 'bd-stamp');
      } else if (e.key.toLowerCase() === 'p') {
        e.preventDefault();
        onToggleItemSize?.(selectedItemId, 'bd-passport');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItemId, onNudgeItem, onDeleteItem, onDuplicateItem, onToggleItemSize]);

  // Breakdown of photos currently on sheet (e.g. 5 Passport, 8 Stamp)
  const passportCount = passportItems.filter(
    (i) => i.preset === 'bd-passport' || i.preset === 'intl-passport' || (i.width === 35 && i.height === 45)
  ).length;
  const stampCount = passportItems.filter(
    (i) => i.preset === 'bd-stamp' || (i.width === 20 && i.height === 25)
  ).length;
  const otherCount = passportItems.length - passportCount - stampCount;

  const countSummary = () => {
    if (passportItems.length === 0) return 'খালি পেপার (কোন ছবি নেই)';
    const parts: string[] = [];
    if (passportCount > 0) parts.push(`${passportCount}টি পাসপোর্ট`);
    if (stampCount > 0) parts.push(`${stampCount}টি স্ট্যাম্প`);
    if (otherCount > 0) parts.push(`${otherCount}টি কাস্টম`);
    return parts.join(' + ') + ' ছবি সাজানো';
  };

  return (
    <div
      onClick={() => onSelectItem?.(null)}
      className="relative flex-1 flex flex-col items-center justify-start p-2 sm:p-4 md:p-6 overflow-auto select-none min-h-full"
    >
      {/* Paper Information Banner & Quick Sheet Action Bar */}
      <div className="mb-2 w-full max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-2 px-1">
        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 flex-wrap text-center sm:text-left">
          <span className="font-bold text-slate-800 dark:text-slate-200">
            {paper.name} ({paperWidthMm} × {paperHeightMm} {lang === 'en' ? 'mm' : 'মিমি'})
          </span>
          <span aria-hidden="true" className="opacity-40">·</span>
          <span className="text-blue-600 dark:text-blue-400 font-semibold">
            {mode === 'passport' ? countSummary() : nid.frontImage || nid.backImage ? (lang === 'en' ? 'Smart NID Card' : 'এনআইডি স্মার্ট কার্ড') : (lang === 'en' ? 'Empty NID Card' : 'এনআইডি কার্ড (খালি)')}
          </span>
          <span aria-hidden="true" className="opacity-40">·</span>
          <span className="font-mono text-slate-600 dark:text-slate-300">
            {Math.round(zoom * 100)}% {lang === 'en' ? 'Zoom' : 'ডিসপ্লে'}
          </span>
        </div>

        {/* Quick Toolbar for Adding Copies & Auto-Aligning */}
        {mode === 'passport' && passportItems.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap justify-center sm:justify-end">
            {onAddPassportCopy && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddPassportCopy();
                }}
                className="py-1 px-2.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-blue-50 text-blue-600 dark:text-blue-400 border border-slate-300 dark:border-slate-700 text-xs font-semibold flex items-center gap-1 transition shadow-2xs cursor-pointer"
                title={lang === 'en' ? 'Add 1 Passport photo (35x45mm) to sheet' : 'পেপারে ১টি পাসপোর্ট সাইজ ছবি (৩৫ × ৪৫ মিমি) যোগ করুন'}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{lang === 'en' ? '+ Passport' : '+ পাসপোর্ট'}</span>
              </button>
            )}
            {onAddStampCopy && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddStampCopy();
                }}
                className="py-1 px-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-semibold flex items-center gap-1 transition shadow-2xs cursor-pointer"
                title={lang === 'en' ? 'Add 1 Stamp photo (20x25mm) to sheet' : 'পেপারে ১টি স্ট্যাম্প সাইজ ছবি (২০ × ২৫ মিমি) যোগ করুন'}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{lang === 'en' ? '+ Stamp' : '+ স্ট্যাম্প'}</span>
              </button>
            )}
            {onAutoAlignGrid && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAutoAlignGrid();
                }}
                className="py-1 px-2.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-semibold flex items-center gap-1 transition shadow-2xs cursor-pointer"
                title={lang === 'bn' ? 'সব ছবি গ্রিড লাইনে সোজা করে সারিবদ্ধ করুন' : 'Align all photos into neat rows'}
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>{lang === 'bn' ? 'গ্রিডে সাজান' : 'Align Grid'}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Movement instruction tip */}
      {mode === 'passport' && passportItems.length > 0 && (
        <div className="mb-3 text-[11px] text-slate-500 dark:text-slate-400 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/60 rounded-lg px-2.5 sm:px-3 py-1 flex items-center gap-1.5 sm:gap-2 max-w-4xl w-full justify-between flex-wrap">
          <div className="flex items-center gap-1.5">
            <Move className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>
              <strong>{lang === 'bn' ? 'ছবি সরানো:' : 'Move photos:'}</strong>{' '}
              {lang === 'bn'
                ? 'ছবিতে ট্যাপ বা ড্র্যাগ করে ইচ্ছামতো সরান।'
                : 'Drag or tap photos to place anywhere on paper.'}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
            {selectedItemId
              ? (lang === 'bn' ? 'সিলেক্টেড ছবি কীবোর্ড দিয়ে মুভ হচ্ছে' : 'Moving selected photo via keyboard')
              : (lang === 'bn' ? 'ছবিতে ক্লিক করে সিলেক্ট করুন' : 'Click any photo to select')}
          </span>
        </div>
      )}

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
              left: `${(passportItems.length > 0 ? Math.min(margins.left, Math.min(...passportItems.map((p) => p.x))) : margins.left) * mmToPx}px`,
              right: `${(passportItems.length > 0 ? Math.min(margins.right, Math.max(0, paperWidthMm - Math.max(...passportItems.map((p) => p.x + p.width)))) : margins.right) * mmToPx}px`,
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
                  {/* Ghost slots */}
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

                  <div className="relative z-10 max-w-sm p-6 rounded-2xl bg-white/95 border border-slate-200 shadow-lg text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                      <Camera className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                        {lang === 'en' ? 'No photos selected yet' : 'কোনো ছবি নির্বাচন করা হয়নি'}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        {lang === 'en'
                          ? 'Upload photos from the left panel or click below. Uploaded photos will be automatically placed on this paper sheet.'
                          : 'বাম পাশের প্যানেল থেকে ছবি আপলোড করুন অথবা নিচের বাটনে ক্লিক করুন। আপলোড করলেই তা পেপারে সাজানো হবে।'}
                      </p>
                    </div>
                    {onUploadPassportTrigger && (
                      <button
                        type="button"
                        onClick={onUploadPassportTrigger}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{lang === 'en' ? 'Upload Photos' : 'ছবি আপলোড করুন'}</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* Rendered Draggable & Movable Photos on Sheet */
                passportItems.map((item, idx) => {
                  const isSelected = selectedItemId === item.id;
                  const isDragging = draggingItemId === item.id;
                  const isStamp = item.width <= 25 || item.preset === 'bd-stamp';

                  return (
                    <div
                      key={item.id || `${item.photo.id}-${idx}`}
                      onMouseDown={(e) => handleMouseDownItem(e, item)}
                      onTouchStart={(e) => handleTouchStartItem(e, item)}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectItem?.(item.id);
                        onSelectPhoto(item.index % passportItems.length);
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        onEditPhoto(item.index % passportItems.length);
                      }}
                      className={`absolute group select-none transition-shadow ${
                        isDragging
                          ? 'cursor-grabbing shadow-2xl z-40 ring-2 ring-blue-600 opacity-95'
                          : isSelected
                          ? 'cursor-grab ring-2 ring-blue-500 shadow-lg z-30'
                          : 'cursor-grab hover:ring-1 hover:ring-blue-400/80 hover:shadow-xs z-10'
                      }`}
                      style={{
                        left: `${item.x * mmToPx}px`,
                        top: `${item.y * mmToPx}px`,
                        width: `${item.width * mmToPx}px`,
                        height: `${item.height * mmToPx}px`,
                      }}
                      title="মাউস দিয়ে টেনে সরান, অ্যারো কী দিয়ে মুভ করুন, ডাবল ক্লিক করে এডিট করুন"
                    >
                      <img
                        src={item.photo.processedSrc || item.photo.originalSrc}
                        alt="Photo"
                        className="w-full h-full object-cover pointer-events-none select-none block"
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

                      {/* Size Type Badge in Corner */}
                      <span className="absolute top-0.5 left-0.5 bg-black/70 text-white text-[8px] font-mono px-1 rounded pointer-events-none opacity-80 group-hover:opacity-100">
                        {isStamp ? (lang === 'en' ? 'Stamp' : 'স্ট্যাম্প') : (lang === 'en' ? 'Passport' : 'পাসপোর্ট')}
                      </span>

                      {/* Floating Interactive Toolbar for Selected Photo */}
                      {isSelected && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute -top-9 left-1/2 -translate-x-1/2 bg-slate-900/95 text-white rounded-lg px-1.5 py-1 flex items-center gap-1 shadow-xl z-50 text-[10px] whitespace-nowrap border border-slate-700 animate-in fade-in zoom-in-95 duration-100"
                        >
                          {/* Size toggle */}
                          {onToggleItemSize && (
                            <button
                              type="button"
                              onClick={() => onToggleItemSize(item.id, isStamp ? 'bd-passport' : 'bd-stamp')}
                              className="px-1.5 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium transition cursor-pointer"
                              title={
                                isStamp
                                  ? (lang === 'en' ? 'Change to Passport size (35 × 45 mm)' : 'পাসপোর্ট সাইজে পরিবর্তন (৩৫ × ৪৫ মিমি)')
                                  : (lang === 'en' ? 'Change to Stamp size (20 × 25 mm)' : 'স্ট্যাম্প সাইজে পরিবর্তন (২০ × ২৫ মিমি)')
                              }
                            >
                              {isStamp ? (lang === 'en' ? '➡️ Passport' : '➡️ পাসপোর্ট') : (lang === 'en' ? '➡️ Stamp' : '➡️ স্ট্যাম্প')}
                            </button>
                          )}

                          {/* Quick Nudge Buttons */}
                          {onNudgeItem && (
                            <div className="flex items-center gap-0.5 border-l border-slate-700 pl-1">
                              <button
                                type="button"
                                onClick={() => onNudgeItem(item.id, -1, 0)}
                                className="p-0.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white"
                                title={lang === 'en' ? 'Nudge Left (←)' : 'বামে সরান (←)'}
                              >
                                ◀
                              </button>
                              <button
                                type="button"
                                onClick={() => onNudgeItem(item.id, 1, 0)}
                                className="p-0.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white"
                                title={lang === 'en' ? 'Nudge Right (→)' : 'ডানে সরান (→)'}
                              >
                                ▶
                              </button>
                              <button
                                type="button"
                                onClick={() => onNudgeItem(item.id, 0, -1)}
                                className="p-0.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white"
                                title={lang === 'en' ? 'Nudge Up (↑)' : 'উপরে সরান (↑)'}
                              >
                                ▲
                              </button>
                              <button
                                type="button"
                                onClick={() => onNudgeItem(item.id, 0, 1)}
                                className="p-0.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white"
                                title={lang === 'en' ? 'Nudge Down (↓)' : 'নিচে সরান (↓)'}
                              >
                                ▼
                              </button>
                            </div>
                          )}

                          {/* Cycle Photo (if multiple photos available) */}
                          {onCycleItemPhoto && (
                            <button
                              type="button"
                              onClick={() => onCycleItemPhoto(item.id)}
                              className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white"
                              title={lang === 'en' ? 'Switch photo (next person)' : 'ছবি পরিবর্তন করুন (পরবর্তী ব্যক্তি)'}
                            >
                              <RefreshCw className="w-3 h-3" />
                            </button>
                          )}

                          {/* Duplicate */}
                          {onDuplicateItem && (
                            <button
                              type="button"
                              onClick={() => onDuplicateItem(item.id)}
                              className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white"
                              title={lang === 'en' ? 'Duplicate (Ctrl+D)' : 'কপি করুন (Ctrl+D)'}
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          )}

                          {/* Delete */}
                          {onDeleteItem && (
                            <button
                              type="button"
                              onClick={() => onDeleteItem(item.id)}
                              className="p-1 hover:bg-red-600 rounded text-red-400 hover:text-white"
                              title={lang === 'en' ? 'Delete (Delete)' : 'মুছুন (Delete)'}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}

                      {/* Live Coordinates Pill while dragging */}
                      {isDragging && (
                        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[9px] font-mono px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-50">
                          {item.x} × {item.y} {lang === 'en' ? 'mm' : 'মিমি'}
                        </div>
                      )}

                      {/* Edit Badge in Bottom-Right */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditPhoto(item.index % passportItems.length);
                        }}
                        className="absolute bottom-1 right-1 p-1 bg-black/75 hover:bg-blue-600 text-white rounded opacity-0 group-hover:opacity-100 transition cursor-pointer"
                        title={lang === 'en' ? 'Edit Adjustments / Crop' : 'ছবি এডিট করুন'}
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
                          {lang === 'en' ? 'NID Front Side' : 'এনআইডি সামনের অংশ (Front)'}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5">
                          {lang === 'en' ? 'Click to upload image' : 'ক্লিক করে ছবি আপলোড করুন'}
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
                          title={lang === 'en' ? 'Edit Back Side' : 'পেছনের অংশ এডিট'}
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center text-slate-400 group-hover:text-blue-600 transition">
                        <CreditCard className="w-6 h-6 mb-1 opacity-70" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                          {lang === 'en' ? 'NID Back Side' : 'এনআইডি পেছনের অংশ (Back)'}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5">
                          {lang === 'en' ? 'Click to upload image' : 'ক্লিক করে ছবি আপলোড করুন'}
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
            title={lang === 'en' ? 'Zoom Out' : 'জুম ছোট'}
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="px-1.5 font-mono font-semibold text-slate-700 dark:text-slate-300 text-xs min-w-10 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(2.0, z + 0.1))}
            className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title={lang === 'en' ? 'Zoom In' : 'জুম বড়'}
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          {onFitZoom && (
            <button
              onClick={onFitZoom}
              className="px-2 py-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-full transition border-l border-slate-200 dark:border-slate-800 cursor-pointer ml-0.5"
              title={lang === 'en' ? 'Fit Screen' : 'স্ক্রিনে ফিট করুন'}
            >
              {lang === 'en' ? 'Fit' : 'ফিট'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
