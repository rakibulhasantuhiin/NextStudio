import React, { useEffect, useRef, useState } from 'react';
import { Check, Minus, MousePointer, RotateCcw, RotateCw, Scissors, X, Plus } from 'lucide-react';
import { CropRect } from '../../types';
import { applyCropAndStraighten } from '../../utils/imageProcessing';

type CropAspectMode = 'passport' | 'stamp' | 'couple' | 'free';

interface Props {
  isOpen: boolean;
  imageSrc: string;
  initialAspect?: CropAspectMode;
  onClose: () => void;
  onConfirm: (croppedDataUrl: string, crop: CropRect | null, angle: number) => void;
  lang: 'bn' | 'en';
}

const ASPECT_RATIOS: Record<CropAspectMode, number | null> = {
  passport: 35 / 45,
  stamp: 20 / 25,
  couple: 50 / 40,
  free: null,
};

function toBnDigits(str: string): string {
  const bn = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return str.replace(/\d/g, (d) => bn[Number(d)]);
}

export const CropStraightenModal: React.FC<Props> = ({
  isOpen,
  imageSrc,
  initialAspect = 'passport',
  onClose,
  onConfirm,
  lang,
}) => {
  const [straightenDeg, setStraightenDeg] = useState<number>(0);
  const [rotate90, setRotate90] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [aspectMode, setAspectMode] = useState<CropAspectMode>(initialAspect);
  const [imgDimensions, setImgDimensions] = useState<{ w: number; h: number }>({ w: 800, h: 1000 });
  const [isApplying, setIsApplying] = useState<boolean>(false);

  // Crop box in percentages (0..100) relative to the stage
  const [cropBox, setCropBox] = useState<CropRect>({ x: 8, y: 5, width: 84, height: 90 });

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loadedImgRef = useRef<HTMLImageElement | null>(null);

  const dragStateRef = useRef<{
    type: 'pan' | 'nw' | 'ne' | 'sw' | 'se';
    startClientX: number;
    startClientY: number;
    originBox: CropRect;
    originPan: { x: number; y: number };
    stageW: number;
    stageH: number;
  } | null>(null);

  const pinchRef = useRef<{
    dist: number;
    angle: number;
    startZoom: number;
    startStraighten: number;
  } | null>(null);

  // Compute default centered crop box fitting chosen aspect ratio
  const buildDefaultCrop = (w: number, h: number, mode: CropAspectMode): CropRect => {
    const ratio = ASPECT_RATIOS[mode];
    if (!ratio || w <= 0 || h <= 0) {
      return { x: 6, y: 6, width: 88, height: 88 };
    }
    const imgRatio = w / h;
    let boxW = 84;
    let boxH = (boxW * imgRatio) / ratio;
    if (boxH > 90) {
      boxH = 90;
      boxW = (boxH * ratio) / imgRatio;
    }
    boxW = Math.max(20, Math.min(96, boxW));
    boxH = Math.max(20, Math.min(96, boxH));
    return {
      x: Math.round(((100 - boxW) / 2) * 10) / 10,
      y: Math.round(((100 - boxH) / 2) * 10) / 10,
      width: Math.round(boxW * 10) / 10,
      height: Math.round(boxH * 10) / 10,
    };
  };

  useEffect(() => {
    if (!isOpen || !imageSrc) return;
    setStraightenDeg(0);
    setRotate90(0);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setAspectMode(initialAspect);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      loadedImgRef.current = img;
      const w = img.naturalWidth || 800;
      const h = img.naturalHeight || 1000;
      setImgDimensions({ w, h });
      setCropBox(buildDefaultCrop(w, h, initialAspect));
    };
    img.src = imageSrc;
  }, [isOpen, imageSrc, initialAspect]);

  // Effective stage dimensions after 90°/270° rotation
  const isOddRot = rotate90 === 90 || rotate90 === 270;
  const effW = isOddRot ? imgDimensions.h : imgDimensions.w;
  const effH = isOddRot ? imgDimensions.w : imgDimensions.h;

  // Draw live WYSIWYG canvas frame matching applyCropAndStraighten math 100%
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const img = loadedImgRef.current;
    if (!canvas || !container || !img) return;

    const renderFrame = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const cw = Math.max(1, Math.round(rect.width * dpr));
      const ch = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw;
        canvas.height = ch;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, cw, ch);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const fitScale = cw / Math.max(1, effW);
      const rad = ((rotate90 + straightenDeg) * Math.PI) / 180;

      ctx.save();
      ctx.translate(cw / 2 + (pan.x / 100) * cw, ch / 2 + (pan.y / 100) * ch);
      ctx.scale(zoom * fitScale, zoom * fitScale);
      ctx.rotate(rad);
      ctx.drawImage(
        img,
        -imgDimensions.w / 2,
        -imgDimensions.h / 2,
        imgDimensions.w,
        imgDimensions.h
      );
      ctx.restore();
    };

    const rafId = window.requestAnimationFrame(renderFrame);
    return () => window.cancelAnimationFrame(rafId);
  }, [isOpen, imgDimensions, effW, effH, rotate90, straightenDeg, zoom, pan]);

  const handleChangeAspect = (nextMode: CropAspectMode) => {
    setAspectMode(nextMode);
    setCropBox(buildDefaultCrop(effW, effH, nextMode));
  };

  const handleResetFull = () => {
    setStraightenDeg(0);
    setRotate90(0);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setCropBox({ x: 0, y: 0, width: 100, height: 100 });
  };

  const handleConfirm = async () => {
    if (isApplying) return;
    setIsApplying(true);
    try {
      const result = await applyCropAndStraighten(imageSrc, {
        crop: cropBox,
        straightenDeg,
        rotate90Deg: rotate90,
        zoom,
        panX: pan.x,
        panY: pan.y,
      });
      onConfirm(result, cropBox, straightenDeg + rotate90);
    } finally {
      setIsApplying(false);
    }
  };

  // Pointer dragging for image pan & 4 corner handles
  const startDrag = (
    e: React.PointerEvent,
    type: 'pan' | 'nw' | 'ne' | 'sw' | 'se'
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragStateRef.current = {
      type,
      startClientX: e.clientX,
      startClientY: e.clientY,
      originBox: { ...cropBox },
      originPan: { ...pan },
      stageW: Math.max(40, rect.width),
      stageH: Math.max(40, rect.height),
    };
  };

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerMove = (e: PointerEvent) => {
      const d = dragStateRef.current;
      if (!d) return;

      const dxPct = ((e.clientX - d.startClientX) / d.stageW) * 100;
      const dyPct = ((e.clientY - d.startClientY) / d.stageH) * 100;

      if (d.type === 'pan') {
        setPan({
          x: Math.max(-85, Math.min(85, d.originPan.x + dxPct)),
          y: Math.max(-85, Math.min(85, d.originPan.y + dyPct)),
        });
        return;
      }

      const o = d.originBox;
      const minSize = 15;
      const lockedRatio = ASPECT_RATIOS[aspectMode];
      const imgRatio = effW / Math.max(1, effH);

      let x = o.x;
      let y = o.y;
      let w = o.width;
      let h = o.height;

      if (d.type === 'se') {
        w = Math.max(minSize, Math.min(100 - o.x, o.width + dxPct));
        h = lockedRatio
          ? (w * imgRatio) / lockedRatio
          : Math.max(minSize, Math.min(100 - o.y, o.height + dyPct));
        if (o.y + h > 100) {
          h = 100 - o.y;
          if (lockedRatio) w = (h * lockedRatio) / imgRatio;
        }
      } else if (d.type === 'sw') {
        const right = o.x + o.width;
        w = Math.max(minSize, Math.min(right, o.width - dxPct));
        h = lockedRatio
          ? (w * imgRatio) / lockedRatio
          : Math.max(minSize, Math.min(100 - o.y, o.height + dyPct));
        if (o.y + h > 100) {
          h = 100 - o.y;
          if (lockedRatio) w = (h * lockedRatio) / imgRatio;
        }
        x = right - w;
      } else if (d.type === 'ne') {
        const bottom = o.y + o.height;
        w = Math.max(minSize, Math.min(100 - o.x, o.width + dxPct));
        h = lockedRatio
          ? (w * imgRatio) / lockedRatio
          : Math.max(minSize, Math.min(bottom, o.height - dyPct));
        if (h > bottom) {
          h = bottom;
          if (lockedRatio) w = (h * lockedRatio) / imgRatio;
        }
        y = bottom - h;
      } else if (d.type === 'nw') {
        const right = o.x + o.width;
        const bottom = o.y + o.height;
        w = Math.max(minSize, Math.min(right, o.width - dxPct));
        h = lockedRatio
          ? (w * imgRatio) / lockedRatio
          : Math.max(minSize, Math.min(bottom, o.height - dyPct));
        if (h > bottom) {
          h = bottom;
          if (lockedRatio) w = (h * lockedRatio) / imgRatio;
        }
        x = right - w;
        y = bottom - h;
      }

      setCropBox({
        x: Math.max(0, x),
        y: Math.max(0, y),
        width: Math.max(minSize, Math.min(100, w)),
        height: Math.max(minSize, Math.min(100, h)),
      });
    };

    const handlePointerUp = () => {
      dragStateRef.current = null;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isOpen, aspectMode, effW, effH]);

  // Keyboard shortcuts: Enter = Apply, Escape = Close
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        void handleConfirm();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, cropBox, straightenDeg, rotate90, zoom, pan]);

  if (!isOpen) return null;

  const formattedDegRaw =
    straightenDeg > 0
      ? `+${straightenDeg}°`
      : straightenDeg < 0
      ? `${straightenDeg}°`
      : '0°';
  const formattedDeg = lang === 'bn' ? toBnDigits(formattedDegRaw) : formattedDegRaw;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#080d1a] text-white select-none studio-modal-backdrop">
      {/* Top Bar */}
      <div className="px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 border-b border-white/10 bg-[#0d1424]">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Scissors className="w-4 h-4 text-rose-400 shrink-0" />
            <h2 className="text-sm sm:text-base font-bold text-white truncate">
              {lang === 'bn' ? 'ছবি সোজা ও ক্রপ করুন' : 'Straighten & Crop Photo'}
            </h2>
          </div>
          <p className="text-[11px] sm:text-xs text-amber-400/95 mt-0.5 truncate">
            {lang === 'bn'
              ? 'ছবি বাঁকা — সোজা করে নিন (নিচের স্লাইডার বা দুই আঙুল মুচড়ে)'
              : 'Tilt, drag photo to position, or drag the 4 circular corners to resize'}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {(
            [
              { id: 'passport' as CropAspectMode, bn: 'পাসপোর্ট', en: 'Passport' },
              { id: 'stamp' as CropAspectMode, bn: 'স্ট্যাম্প', en: 'Stamp' },
              { id: 'free' as CropAspectMode, bn: 'ফ্রি ক্রপ', en: 'Free' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleChangeAspect(item.id)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition cursor-pointer whitespace-nowrap ${
                aspectMode === item.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/10 text-slate-300 hover:bg-white/20'
              }`}
            >
              {lang === 'bn' ? item.bn : item.en}
            </button>
          ))}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 ml-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white cursor-pointer"
            title={lang === 'bn' ? 'বন্ধ করুন' : 'Close'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Central Dark Drafting Canvas */}
      <div
        className="flex-1 relative flex items-center justify-center overflow-hidden p-3 sm:p-5 bg-black touch-none"
        onWheel={(e) => {
          e.preventDefault();
          const delta = e.deltaY < 0 ? 0.1 : -0.1;
          setZoom((z) => Math.max(0.5, Math.min(3.0, Math.round((z + delta) * 100) / 100)));
        }}
        onTouchStart={(e) => {
          if (e.touches.length === 2) {
            const dx = e.touches[1].clientX - e.touches[0].clientX;
            const dy = e.touches[1].clientY - e.touches[0].clientY;
            pinchRef.current = {
              dist: Math.hypot(dx, dy),
              angle: (Math.atan2(dy, dx) * 180) / Math.PI,
              startZoom: zoom,
              startStraighten: straightenDeg,
            };
          }
        }}
        onTouchMove={(e) => {
          if (e.touches.length === 2 && pinchRef.current) {
            const dx = e.touches[1].clientX - e.touches[0].clientX;
            const dy = e.touches[1].clientY - e.touches[0].clientY;
            const dist = Math.hypot(dx, dy);
            const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
            const ratio = dist / Math.max(10, pinchRef.current.dist);
            const deltaAngle = angle - pinchRef.current.angle;
            setZoom(
              Math.max(0.5, Math.min(3.0, Math.round(pinchRef.current.startZoom * ratio * 100) / 100))
            );
            setStraightenDeg(
              Math.max(
                -45,
                Math.min(45, Math.round((pinchRef.current.startStraighten + deltaAngle) * 2) / 2)
              )
            );
          }
        }}
        onTouchEnd={() => {
          pinchRef.current = null;
        }}
      >
        <div
          ref={containerRef}
          onPointerDown={(e) => startDrag(e, 'pan')}
          className="relative flex items-center justify-center overflow-hidden shadow-2xl cursor-grab active:cursor-grabbing"
          style={{
            aspectRatio: `${effW} / ${effH}`,
            height: effH >= effW ? 'min(68vh, 640px)' : 'auto',
            width: effW > effH ? 'min(84vw, 720px)' : 'auto',
            maxHeight: 'calc(100vh - 185px)',
            maxWidth: '92vw',
          }}
        >
          {/* Live High-Resolution Canvas Preview */}
          <canvas
            ref={canvasRef}
            className="w-full h-full block pointer-events-none"
          />

          {/* Interactive Crop Frame with Rule-of-Thirds & 4 Solid White Circular Corner Handles */}
          <div
            className="absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] pointer-events-none"
            style={{
              left: `${cropBox.x}%`,
              top: `${cropBox.y}%`,
              width: `${cropBox.width}%`,
              height: `${cropBox.height}%`,
            }}
          >
            {/* Rule of thirds grid */}
            <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3">
              <div className="border-r border-b border-white/25" />
              <div className="border-r border-b border-white/25" />
              <div className="border-b border-white/25" />
              <div className="border-r border-b border-white/25" />
              <div className="border-r border-b border-white/25" />
              <div className="border-b border-white/25" />
              <div className="border-r border-white/25" />
              <div className="border-r border-white/25" />
              <div />
            </div>

            {/* 4 Solid White Circular Corner Handles (Interactive) */}
            <button
              type="button"
              aria-label="Resize top left"
              onPointerDown={(e) => startDrag(e, 'nw')}
              className="pointer-events-auto absolute -top-2.5 -left-2.5 w-5 h-5 rounded-full bg-white shadow-lg hover:scale-110 transition-transform cursor-nwse-resize touch-none"
            />
            <button
              type="button"
              aria-label="Resize top right"
              onPointerDown={(e) => startDrag(e, 'ne')}
              className="pointer-events-auto absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-white shadow-lg hover:scale-110 transition-transform cursor-nesw-resize touch-none"
            />
            <button
              type="button"
              aria-label="Resize bottom left"
              onPointerDown={(e) => startDrag(e, 'sw')}
              className="pointer-events-auto absolute -bottom-2.5 -left-2.5 w-5 h-5 rounded-full bg-white shadow-lg hover:scale-110 transition-transform cursor-nesw-resize touch-none"
            />
            <button
              type="button"
              aria-label="Resize bottom right"
              onPointerDown={(e) => startDrag(e, 'se')}
              className="pointer-events-auto absolute -bottom-2.5 -right-2.5 w-5 h-5 rounded-full bg-white shadow-lg hover:scale-110 transition-transform cursor-nwse-resize touch-none"
            />
          </div>
        </div>
      </div>

      {/* Hint Strip */}
      <div className="bg-[#0d1424] border-t border-white/10 px-4 py-1.5 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
        <MousePointer className="w-3 h-3 shrink-0 opacity-80" />
        <span>
          {lang === 'bn'
            ? 'ছবি টেনে সরান · কোণা টেনে বক্স ছোট-বড় · চাকায় বড়-ছোট · Enter = ঠিক আছে'
            : 'Drag photo to pan · Drag corners to resize box · Scroll to zoom · Enter = Confirm'}
        </span>
      </div>

      {/* Bottom Straighten Slider & Action Bar */}
      <div className="bg-[#0b1120] px-4 sm:px-6 pb-4 pt-2.5 space-y-3 border-t border-white/5">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-300 whitespace-nowrap shrink-0">
            {lang === 'bn' ? 'বাঁকা সোজা' : 'Straighten'}
          </span>
          <input
            type="range"
            min="-45"
            max="45"
            step="0.5"
            value={straightenDeg}
            onChange={(e) => setStraightenDeg(Number(e.target.value))}
            className="flex-1 accent-emerald-500 cursor-pointer h-2"
          />
          <button
            type="button"
            onClick={() => setStraightenDeg(0)}
            title={lang === 'bn' ? '০° রিসেট' : 'Reset 0°'}
            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 font-mono text-xs font-bold tabular-nums min-w-[64px] text-center cursor-pointer"
          >
            ↺ {formattedDeg}
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.5, Math.round((z - 0.15) * 100) / 100))}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
              title={lang === 'bn' ? 'জুম আউট' : 'Zoom Out'}
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(3.0, Math.round((z + 0.15) * 100) / 100))}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
              title={lang === 'bn' ? 'জুম ইন' : 'Zoom In'}
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setRotate90((r) => (r + 90) % 360)}
              className="h-9 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? '৯০°' : '90°'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetFull}
              className="h-9 px-3.5 rounded-xl bg-[#161f33] hover:bg-white/15 border border-white/15 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'পুরো ছবি রাখুন' : 'Keep Full Image'}</span>
            </button>
            <button
              type="button"
              disabled={isApplying}
              onClick={() => void handleConfirm()}
              className="h-9 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 cursor-pointer disabled:opacity-60"
            >
              <Check className="w-4 h-4" />
              <span>{lang === 'bn' ? 'ঠিক আছে' : 'Apply'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
