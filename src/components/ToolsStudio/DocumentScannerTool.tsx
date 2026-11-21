import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  Columns2,
  Crop,
  Download,
  FileDown,
  Loader2,
  Maximize,
  Plus,
  Printer,
  RotateCcw,
  RotateCw,
  ScanLine,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  DEFAULT_SCANNER_OPTIONS,
  DocumentQuad,
  FULL_IMAGE_QUAD,
  NormPoint,
  SCANNER_FILTERS,
  ScannerEnhanceOptions,
  ScannerFilterId,
  ScannerPaperSize,
  applyScannerFilter,
  buildScannedPdf,
  composeScannedPageToPaper,
  detectDocumentQuad,
  getRotatedSourceCanvas,
  getScannerPaperSpec,
  isValidConvexQuad,
  printScannedPagesDirectly,
  renderFullHdScannedPage,
  warpPerspectiveCanvas,
} from '../../utils/documentScanner';
import {
  ProcessedFileResult,
  downloadBlob,
  downloadFilesAsZip,
  getBaseName,
  loadImageFromFile,
  toBnDigits,
} from '../../utils/toolsEngine';
import { BulkZipNotice, ProcessedResultsList, ToolHeader } from './SharedToolUI';

interface ScannerPageDoc {
  id: string;
  file: File;
  rotation: number;
  autoQuad: DocumentQuad;
  quad: DocumentQuad;
  options: ScannerEnhanceOptions;
  thumbUrl: string;
}

type DragTarget =
  | { kind: 'corner'; index: 0 | 1 | 2 | 3 }
  | { kind: 'edge'; edge: 0 | 1 | 2 | 3; startClientX: number; startClientY: number; startQuad: DocumentQuad }
  | null;

const PAPER_SIZE_OPTIONS: { id: ScannerPaperSize; label: string; hint: string }[] = [
  { id: 'a4-fit', label: 'A4 ফিট (প্রিন্ট রেডি)', hint: 'সাদা A4 কাগজে নিখুঁত ফিট' },
  { id: 'auto', label: 'ডকুমেন্টের নিজস্ব মাপ (অটো)', hint: 'ছবির আসল অনুপাতে অটো সাইজ' },
  { id: 'a4-fill', label: 'A4 সম্পূর্ণ ভরাট', hint: 'পুরো A4 পাতা জুড়ে ফিট' },
  { id: 'legal-fit', label: 'লিগ্যাল (Legal)', hint: 'দলিল ও লম্বা কাগজের মাপ' },
  { id: 'a5-fit', label: 'A5 (রসিদ / মেমো)', hint: 'বিল ও ছোট রসিদের মাপ' },
];

const MARGIN_OPTIONS = [0, 4, 8, 12];

export const DocumentScannerTool: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [pages, setPages] = useState<ScannerPageDoc[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [step, setStep] = useState<'crop' | 'enhance'>('crop');
  const [isScanningAnim, setIsScanningAnim] = useState(false);

  // Loaded rotated source canvas for the active page (preview resolution up to 1400px for silky interaction)
  const [sourceCanvas, setSourceCanvas] = useState<HTMLCanvasElement | null>(null);
  const [sourcePreviewUrl, setSourcePreviewUrl] = useState<string>('');

  // Rectified (post-perspective warp) canvas for enhance step + filter thumbs
  const [rectifiedPreviewCanvas, setRectifiedPreviewCanvas] = useState<HTMLCanvasElement | null>(
    null
  );
  const [enhancedPreviewUrl, setEnhancedPreviewUrl] = useState<string>('');
  const [originalRectifiedUrl, setOriginalRectifiedUrl] = useState<string>('');
  const [filterThumbs, setFilterThumbs] = useState<Partial<Record<ScannerFilterId, string>>>({});
  const [previewDimensions, setPreviewDimensions] = useState<{ w: number; h: number }>({
    w: 0,
    h: 0,
  });

  // Interactive Compare split state (in enhance step)
  const [compareActive, setCompareActive] = useState(false);
  const [compareSplit, setCompareSplit] = useState(50);
  const compareContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingCompareRef = useRef(false);

  // Cropper drag & precision magnifier state
  const cropStageRef = useRef<HTMLDivElement>(null);
  const [dragTarget, setDragTarget] = useState<DragTarget>(null);
  const [loupePoint, setLoupePoint] = useState<NormPoint | null>(null);
  const loupeCanvasRef = useRef<HTMLCanvasElement>(null);

  // Fine-tune panel toggle on mobile/desktop
  const [showFineTune, setShowFineTune] = useState(false);

  // Upload & Export busy states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingUpload, setIsDraggingUpload] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [results, setResults] = useState<ProcessedFileResult[]>([]);

  const activePage = pages[activeIndex] ?? null;

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      pages.forEach((p) => URL.revokeObjectURL(p.thumbUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load files & automatically detect document 4-corner quad for each uploaded photo
  const handleAddFiles = async (incoming: File[]) => {
    const imageFiles = incoming.filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    setErrorMsg(null);
    setIsLoadingFiles(true);
    setResults([]);

    try {
      const created: ScannerPageDoc[] = [];
      for (const file of imageFiles) {
        const img = await loadImageFromFile(file);
        const analysisCanvas = getRotatedSourceCanvas(img, 0, 900);
        const detectedQuad = detectDocumentQuad(analysisCanvas);
        const thumbUrl = URL.createObjectURL(file);

        created.push({
          id: `docscan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          file,
          rotation: 0,
          autoQuad: detectedQuad,
          quad: detectedQuad.map((p) => ({ ...p })) as DocumentQuad,
          options: { ...DEFAULT_SCANNER_OPTIONS },
          thumbUrl,
        });
      }

      setPages((prev) => {
        const next = [...prev, ...created];
        const targetIdx = prev.length === 0 ? 0 : prev.length;
        setActiveIndex(targetIdx);
        return next;
      });
      setStep('crop');
      setCompareActive(false);
    } catch {
      setErrorMsg('ছবি লোড করতে সমস্যা হয়েছে। অনুগ্রহ করে JPG, PNG বা WebP ফাইল দিন।');
    } finally {
      setIsLoadingFiles(false);
    }
  };

  // Update active page helper
  const updateActivePage = useCallback(
    (updater: (prev: ScannerPageDoc) => ScannerPageDoc) => {
      setPages((prev) => prev.map((p, i) => (i === activeIndex ? updater(p) : p)));
    },
    [activeIndex]
  );

  // Build rotated source canvas whenever active page file or rotation changes
  useEffect(() => {
    let cancelled = false;
    if (!activePage) {
      setSourceCanvas(null);
      setSourcePreviewUrl('');
      setRectifiedPreviewCanvas(null);
      setEnhancedPreviewUrl('');
      setOriginalRectifiedUrl('');
      setFilterThumbs({});
      return;
    }

    (async () => {
      try {
        const img = await loadImageFromFile(activePage.file);
        if (cancelled) return;
        const rotCanvas = getRotatedSourceCanvas(img, activePage.rotation, 1450);
        setSourceCanvas(rotCanvas);
        setSourcePreviewUrl(rotCanvas.toDataURL('image/jpeg', 0.9));
      } catch {
        if (!cancelled) setErrorMsg('ছবি প্রিভিউ তৈরি করতে ব্যর্থ হয়েছে।');
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage?.id, activePage?.rotation]);

  // Draw live 2.5x Magnifier Loupe whenever dragging a corner
  useEffect(() => {
    const loupe = loupeCanvasRef.current;
    if (!loupe || !loupePoint || !sourceCanvas) return;

    const ctx = loupe.getContext('2d');
    if (!ctx) return;

    const size = loupe.width;
    const zoom = 2.6;
    const sampleSize = Math.max(40, Math.round(Math.min(sourceCanvas.width, sourceCanvas.height) / (zoom * 2.2)));
    const cx = loupePoint.x * sourceCanvas.width;
    const cy = loupePoint.y * sourceCanvas.height;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, size, size);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      sourceCanvas,
      cx - sampleSize / 2,
      cy - sampleSize / 2,
      sampleSize,
      sampleSize,
      0,
      0,
      size,
      size
    );

    // Precision crosshair
    ctx.strokeStyle = '#14b8a6';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(size / 2, 10);
    ctx.lineTo(size / 2, size - 10);
    ctx.moveTo(10, size / 2);
    ctx.lineTo(size - 10, size / 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#0d9488';
    ctx.stroke();
  }, [loupePoint, sourceCanvas]);

  // Trigger perspective warp + scan beam animation when moving from Crop -> Enhance
  const handleProceedToScan = () => {
    if (!sourceCanvas || !activePage) return;

    setIsScanningAnim(true);
    setCompareActive(false);

    // Compute warped rectified preview canvas immediately
    window.setTimeout(() => {
      const warped = warpPerspectiveCanvas(sourceCanvas, activePage.quad, 1180);
      setRectifiedPreviewCanvas(warped);
      setOriginalRectifiedUrl(warped.toDataURL('image/jpeg', 0.92));

      // Generate live filter thumbnails (fast 150px thumbnails so every filter shows the user's real document!)
      const thumbScale = Math.min(1, 150 / Math.max(warped.width, warped.height));
      const tw = Math.max(40, Math.round(warped.width * thumbScale));
      const th = Math.max(40, Math.round(warped.height * thumbScale));
      const small = document.createElement('canvas');
      small.width = tw;
      small.height = th;
      const sCtx = small.getContext('2d')!;
      sCtx.imageSmoothingEnabled = true;
      sCtx.imageSmoothingQuality = 'high';
      sCtx.drawImage(warped, 0, 0, tw, th);

      const thumbs: Partial<Record<ScannerFilterId, string>> = {};
      for (const f of SCANNER_FILTERS) {
        const filteredThumb = applyScannerFilter(small, f.id, 0, 0, 20);
        thumbs[f.id] = filteredThumb.toDataURL('image/jpeg', 0.8);
      }
      setFilterThumbs(thumbs);

      setStep('enhance');
      window.setTimeout(() => {
        setIsScanningAnim(false);
      }, 420);
    }, 180);
  };

  // If user switches active page while already on 'enhance', automatically rectify the newly selected page
  useEffect(() => {
    if (step !== 'enhance' || !sourceCanvas || !activePage) return;

    const warped = warpPerspectiveCanvas(sourceCanvas, activePage.quad, 1180);
    setRectifiedPreviewCanvas(warped);
    setOriginalRectifiedUrl(warped.toDataURL('image/jpeg', 0.92));

    const thumbScale = Math.min(1, 150 / Math.max(warped.width, warped.height));
    const tw = Math.max(40, Math.round(warped.width * thumbScale));
    const th = Math.max(40, Math.round(warped.height * thumbScale));
    const small = document.createElement('canvas');
    small.width = tw;
    small.height = th;
    const sCtx = small.getContext('2d')!;
    sCtx.drawImage(warped, 0, 0, tw, th);

    const thumbs: Partial<Record<ScannerFilterId, string>> = {};
    for (const f of SCANNER_FILTERS) {
      thumbs[f.id] = applyScannerFilter(small, f.id, 0, 0, 20).toDataURL('image/jpeg', 0.8);
    }
    setFilterThumbs(thumbs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage?.id, activePage?.rotation, sourceCanvas]);

  // Live filter + paper composition update in Enhance mode
  useEffect(() => {
    if (step !== 'enhance' || !rectifiedPreviewCanvas || !activePage) return;

    const timer = window.setTimeout(() => {
      const enhanced = applyScannerFilter(
        rectifiedPreviewCanvas,
        activePage.options.filter,
        activePage.options.brightness,
        activePage.options.contrast,
        activePage.options.sharpness
      );

      // For fast live preview, compose paper at preview scale (not full 3000px) so slider feel is instant
      const previewPaper = composePreviewPaper(
        enhanced,
        activePage.options.paperSize,
        activePage.options.marginMm
      );

      setEnhancedPreviewUrl(previewPaper.toDataURL('image/jpeg', 0.93));

      // Compute exact Full HD output dimensions for display readout
      const spec = getScannerPaperSpec(
        activePage.options.paperSize,
        rectifiedPreviewCanvas.width,
        rectifiedPreviewCanvas.height
      );
      setPreviewDimensions({ w: spec.pxW, h: spec.pxH });
    }, 30);

    return () => window.clearTimeout(timer);
  }, [
    step,
    rectifiedPreviewCanvas,
    activePage?.options.filter,
    activePage?.options.brightness,
    activePage?.options.contrast,
    activePage?.options.sharpness,
    activePage?.options.paperSize,
    activePage?.options.marginMm,
  ]);

  // Preview paper composer (keeps live preview snappy around ~1100px while preserving exact A4/Legal/A5/Auto proportions)
  const composePreviewPaper = (
    docCanvas: HTMLCanvasElement,
    paperSize: ScannerPaperSize,
    marginMm: number
  ): HTMLCanvasElement => {
    if (paperSize === 'auto') {
      return composeScannedPageToPaper(docCanvas, 'auto', marginMm).canvas;
    }
    const spec = getScannerPaperSpec(paperSize, docCanvas.width, docCanvas.height);
    const scaleDown = Math.min(1, 1180 / Math.max(spec.pxW, spec.pxH));
    const pw = Math.max(100, Math.round(spec.pxW * scaleDown));
    const ph = Math.max(100, Math.round(spec.pxH * scaleDown));

    const out = document.createElement('canvas');
    out.width = pw;
    out.height = ph;
    const ctx = out.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, pw, ph);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const pxPerMm = pw / spec.widthMm;
    const mPx = Math.round(Math.max(0, marginMm) * pxPerMm);
    const availW = Math.max(10, pw - mPx * 2);
    const availH = Math.max(10, ph - mPx * 2);

    if (paperSize === 'a4-fill') {
      ctx.drawImage(docCanvas, mPx, mPx, availW, availH);
    } else {
      const s = Math.min(availW / docCanvas.width, availH / docCanvas.height);
      const dw = Math.round(docCanvas.width * s);
      const dh = Math.round(docCanvas.height * s);
      ctx.drawImage(docCanvas, Math.round((pw - dw) / 2), Math.round((ph - dh) / 2), dw, dh);
    }
    return out;
  };

  // Rotate active page 90 deg left or right & re-detect auto quad
  const handleRotate = async (delta: -90 | 90) => {
    if (!activePage) return;
    const nextRot = ((activePage.rotation + delta) % 360 + 360) % 360;
    try {
      const img = await loadImageFromFile(activePage.file);
      const rotCanvas = getRotatedSourceCanvas(img, nextRot, 900);
      const autoQ = detectDocumentQuad(rotCanvas);
      updateActivePage((p) => ({
        ...p,
        rotation: nextRot,
        autoQuad: autoQ,
        quad: autoQ.map((pt) => ({ ...pt })) as DocumentQuad,
      }));
    } catch {
      // ignore
    }
  };

  // Toggle between Auto Detected Quad and Full Image ("All")
  const isFullQuad = useMemo(() => {
    if (!activePage) return false;
    return activePage.quad.every(
      (pt, idx) =>
        Math.abs(pt.x - FULL_IMAGE_QUAD[idx].x) < 0.015 &&
        Math.abs(pt.y - FULL_IMAGE_QUAD[idx].y) < 0.015
    );
  }, [activePage]);

  const handleToggleAutoOrAll = () => {
    if (!activePage) return;
    updateActivePage((p) => ({
      ...p,
      quad: isFullQuad
        ? (p.autoQuad.map((pt) => ({ ...pt })) as DocumentQuad)
        : (FULL_IMAGE_QUAD.map((pt) => ({ ...pt })) as DocumentQuad),
    }));
  };

  // Pointer handlers for 4 corners and 4 edge midpoints
  const handleCropPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragTarget || !cropStageRef.current || !activePage) return;
    const rect = cropStageRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const clamp = (v: number) => Math.max(0.004, Math.min(0.996, v));

    if (dragTarget.kind === 'corner') {
      const nx = clamp((e.clientX - rect.left) / rect.width);
      const ny = clamp((e.clientY - rect.top) / rect.height);
      const nextQuad = activePage.quad.map((pt, idx) =>
        idx === dragTarget.index ? { x: nx, y: ny } : { ...pt }
      ) as DocumentQuad;

      if (isValidConvexQuad(nextQuad)) {
        updateActivePage((p) => ({ ...p, quad: nextQuad }));
        setLoupePoint({ x: nx, y: ny });
      }
    } else if (dragTarget.kind === 'edge') {
      const dx = (e.clientX - dragTarget.startClientX) / rect.width;
      const dy = (e.clientY - dragTarget.startClientY) / rect.height;
      const edgeIdx = dragTarget.edge;
      const iA = edgeIdx;
      const iB = ((edgeIdx + 1) % 4) as 0 | 1 | 2 | 3;

      const nextQuad = dragTarget.startQuad.map((pt, idx) => {
        if (idx === iA || idx === iB) {
          return { x: clamp(pt.x + dx), y: clamp(pt.y + dy) };
        }
        return { ...pt };
      }) as DocumentQuad;

      if (isValidConvexQuad(nextQuad)) {
        updateActivePage((p) => ({ ...p, quad: nextQuad }));
      }
    }
  };

  const handleCropPointerUp = () => {
    setDragTarget(null);
    setLoupePoint(null);
  };

  // Compare split bar pointer drag
  const updateCompareFromEvent = (clientX: number) => {
    const el = compareContainerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = Math.max(4, Math.min(96, ((clientX - rect.left) / rect.width) * 100));
    setCompareSplit(pct);
  };

  // Apply active page's filter & paper size to ALL pages in the batch
  const handleApplyOptionsToAll = () => {
    if (!activePage || pages.length <= 1) return;
    const shared = { ...activePage.options };
    setPages((prev) => prev.map((p) => ({ ...p, options: { ...shared } })));
  };

  // Remove a page
  const handleRemovePage = (idx: number) => {
    const target = pages[idx];
    if (target) URL.revokeObjectURL(target.thumbUrl);
    setPages((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      setActiveIndex((cur) => Math.max(0, Math.min(cur, next.length - 1)));
      if (next.length === 0) setStep('crop');
      return next;
    });
  };

  // Export 1: Full HD Image Download (single or bulk ZIP)
  const handleDownloadFullHdImages = async (allPages: boolean) => {
    const targets = allPages ? pages : activePage ? [activePage] : [];
    if (targets.length === 0) return;

    setIsExporting(true);
    setErrorMsg(null);
    setResults([]);
    try {
      const produced: ProcessedFileResult[] = [];
      for (let i = 0; i < targets.length; i++) {
        setExportStatus(
          `Full HD প্রস্তুত হচ্ছে (${toBnDigits(i + 1)} / ${toBnDigits(targets.length)})...`
        );
        const { result } = await renderFullHdScannedPage(targets[i]);
        produced.push(result);
      }
      setResults(produced);

      if (produced.length === 1) {
        downloadBlob(produced[0].blob, produced[0].name);
      } else {
        await downloadFilesAsZip(
          produced.map((r) => ({ name: r.name, blob: r.blob })),
          'NextStudio_Scanned_Pages.zip'
        );
      }
    } catch {
      setErrorMsg('হাই-কোয়ালিটি ছবি তৈরি করতে সমস্যা হয়েছে।');
    } finally {
      setIsExporting(false);
      setExportStatus('');
    }
  };

  // Export 2: Print-Ready Multi-Page Full HD PDF
  const handleDownloadPdf = async () => {
    if (pages.length === 0) return;
    setIsExporting(true);
    setErrorMsg(null);
    try {
      setExportStatus('Full HD প্রিন্ট-রেডি PDF তৈরি হচ্ছে...');
      const pdfName =
        pages.length === 1
          ? `${getBaseName(pages[0].file.name)}_scanned.pdf`
          : `NextStudio_Scanned_${pages.length}_Pages.pdf`;
      const pdfRes = await buildScannedPdf(pages, pdfName);
      downloadBlob(pdfRes.blob, pdfRes.name);
      setResults([pdfRes]);
    } catch {
      setErrorMsg('PDF তৈরি করতে সমস্যা হয়েছে।');
    } finally {
      setIsExporting(false);
      setExportStatus('');
    }
  };

  // Export 3: Instant Direct Print (1 or all pages on pure white Full HD paper)
  const handleDirectPrint = async (allPages: boolean) => {
    const targets = allPages ? pages : activePage ? [activePage] : [];
    if (targets.length === 0) return;

    setIsExporting(true);
    setErrorMsg(null);
    try {
      const rendered: { url: string; widthMm: number; heightMm: number }[] = [];
      for (let i = 0; i < targets.length; i++) {
        setExportStatus(
          `প্রিন্টের জন্য প্রস্তুত হচ্ছে (${toBnDigits(i + 1)} / ${toBnDigits(targets.length)})...`
        );
        const { result, widthMm, heightMm } = await renderFullHdScannedPage(targets[i]);
        if (result.previewUrl) {
          rendered.push({ url: result.previewUrl, widthMm, heightMm });
        }
      }
      printScannedPagesDirectly(rendered);
    } catch {
      setErrorMsg('প্রিন্ট প্রিভিউ প্রস্তুত করতে সমস্যা হয়েছে।');
    } finally {
      setIsExporting(false);
      setExportStatus('');
    }
  };

  // Compute SVG overlay geometry for Crop step
  const quadSvgPoints = useMemo(() => {
    if (!activePage) return '';
    return activePage.quad.map((p) => `${(p.x * 100).toFixed(3)},${(p.y * 100).toFixed(3)}`).join(' ');
  }, [activePage]);

  const edgeMidpoints = useMemo(() => {
    if (!activePage) return [];
    const q = activePage.quad;
    return [0, 1, 2, 3].map((i) => {
      const a = q[i];
      const b = q[(i + 1) % 4];
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const angleDeg = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
      return { edge: i as 0 | 1 | 2 | 3, x: mx, y: my, angleDeg };
    });
  }, [activePage]);

  const activePaperSpec = useMemo(() => {
    if (!activePage) return null;
    const refW = rectifiedPreviewCanvas?.width || sourceCanvas?.width || 2100;
    const refH = rectifiedPreviewCanvas?.height || sourceCanvas?.height || 2970;
    return getScannerPaperSpec(activePage.options.paperSize, refW, refH);
  }, [activePage, rectifiedPreviewCanvas, sourceCanvas]);

  return (
    <div className="space-y-5">
      <ToolHeader
        title="ডকুমেন্ট স্ক্যানার (CamScanner প্রো)"
        subtitle="যেকোনো ডকুমেন্ট, বিল, রসিদ বা বইয়ের ছবি তুলুন বা আপলোড করুন — অটো বা ম্যানুয়াল ৪-কোনা ক্রপ করে ম্যাজিক প্রো ফিল্টারে সাদা Full HD কাগজে প্রিন্ট ও PDF তৈরি করুন।"
        categoryLabel="ছবির টুলস"
        onBack={onBack}
      />

      {/* Hidden shared upload input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          if (e.target.files) void handleAddFiles(Array.from(e.target.files));
          e.target.value = '';
        }}
        className="hidden"
      />

      {/* Empty State: Prominent Upload Dropzone */}
      {pages.length === 0 ? (
        <div className="glass-panel rounded-3xl p-5 sm:p-8 space-y-5">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingUpload(true);
            }}
            onDragLeave={() => setIsDraggingUpload(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingUpload(false);
              void handleAddFiles(Array.from(e.dataTransfer.files));
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`glass-dropzone rounded-2xl p-8 sm:p-12 flex flex-col items-center justify-center text-center gap-4 cursor-pointer transition-all ${
              isDraggingUpload ? 'ring-2 ring-teal-500 scale-[1.005]' : ''
            }`}
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-lg flex items-center justify-center">
              {isLoadingFiles ? (
                <Loader2 className="w-8 h-8 animate-spin" />
              ) : (
                <ScanLine className="w-8 h-8" />
              )}
            </div>

            <div className="space-y-1.5 max-w-lg">
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                ডকুমেন্ট বা ছবির ফাইল আপলোড করুন
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                মোবাইলে তোলা বাঁকা বা ছায়াযুক্ত ডকুমেন্ট, রসিদ, মেমো, সার্টিফিকেট বা ফর্মের ছবি দিন —
                অটোমেটিক ৪-কোনা শনাক্ত করে সাদা ফুল-এইচডি প্রিন্ট পেজে রূপান্তর হবে।
              </p>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="glass-btn-emerald px-6 py-3 rounded-xl text-white text-sm font-bold inline-flex items-center gap-2 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>ছবি বাছুন (এক বা একাধিক পাতা)</span>
            </button>

            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 pt-1">
              <span>অটো ও ম্যানুয়াল ৪-কোনা ক্রপ</span>
              <span aria-hidden="true">·</span>
              <span>ম্যাজিক প্রো ও ম্যাজিক কালার</span>
              <span aria-hidden="true">·</span>
              <span>A4 / অটো পেপার ফিট</span>
              <span aria-hidden="true">·</span>
              <span>১০০% অফলাইন</span>
            </div>
          </div>

          <BulkZipNotice text="একসাথে অনেক পাতা আপলোড করে প্রতিটা পাতা স্ক্যান করে একত্রে Multi-Page PDF, ZIP বা সরাসরি প্রিন্ট করা যাবে।" />
        </div>
      ) : (
        /* Active CamScanner Studio Workbench */
        <div className="space-y-4">
          {/* Top Multi-Page & Step Navigation Bar */}
          <div className="glass-panel rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3">
            {/* Step Segmented Switcher */}
            <div className="flex items-center gap-1 glass-track p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setStep('crop')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                  step === 'crop'
                    ? 'glass-tab-active text-teal-700 dark:text-teal-300'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Crop className="w-3.5 h-3.5" />
                <span>১. ক্রপ ও কোনা ঠিক করুন</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (step === 'crop') handleProceedToScan();
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                  step === 'enhance'
                    ? 'glass-tab-active text-teal-700 dark:text-teal-300'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>২. ম্যাজিক ফিল্টার ও প্রিন্ট</span>
              </button>
            </div>

            {/* Page Strip + Add Page */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-full">
              {pages.map((p, idx) => {
                const isSel = idx === activeIndex;
                return (
                  <div
                    key={p.id}
                    className={`group relative flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-xl border transition shrink-0 ${
                      isSel
                        ? 'bg-teal-500/12 border-teal-500/60 text-teal-800 dark:text-teal-200'
                        : 'glass-tile text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveIndex(idx)}
                      className="flex items-center gap-1.5 cursor-pointer"
                    >
                      <img
                        src={p.thumbUrl}
                        alt={`পাতা ${idx + 1}`}
                        className="w-7 h-7 rounded-lg object-cover border border-slate-200/80 dark:border-white/15 bg-white"
                      />
                      <span className="text-xs font-bold tabular-nums whitespace-nowrap">
                        পাতা {toBnDigits(idx + 1)}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemovePage(idx)}
                      className="p-0.5 rounded-md text-slate-400 hover:text-red-500 cursor-pointer"
                      title="পাতা বাদ দিন"
                      aria-label="পাতা বাদ দিন"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="glass-tile px-3 py-1.5 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 inline-flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>আরও পাতা যোগ করুন</span>
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="rounded-xl px-4 py-2.5 bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {/* =================================================================
              STEP 1: CAMSCANNER 4-CORNER & 4-EDGE INTERACTIVE PERSPECTIVE CROP
             ================================================================= */}
          {step === 'crop' && activePage && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left / Center: Dark CamScanner Crop Stage */}
              <div className="lg:col-span-8 glass-panel rounded-3xl overflow-hidden flex flex-col">
                <div className="bg-slate-950 relative flex items-center justify-center p-4 sm:p-7 min-h-[420px] sm:min-h-[540px] select-none overflow-hidden">
                  {sourcePreviewUrl && sourceCanvas ? (
                    <div
                      ref={cropStageRef}
                      onPointerMove={handleCropPointerMove}
                      onPointerUp={handleCropPointerUp}
                      onPointerCancel={handleCropPointerUp}
                      className="relative inline-block max-w-full touch-none"
                      style={{
                        aspectRatio: `${sourceCanvas.width} / ${sourceCanvas.height}`,
                        maxHeight: '62vh',
                      }}
                    >
                      <img
                        src={sourcePreviewUrl}
                        alt="ডকুমেন্ট ক্রপ প্রিভিউ"
                        draggable={false}
                        className="block w-full h-full object-contain pointer-events-none select-none rounded-sm"
                        style={{ maxHeight: '62vh' }}
                      />

                      {/* Dimmed Outside Mask + Crisp Teal Perspective Border */}
                      <svg
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        className="absolute inset-0 w-full h-full pointer-events-none"
                      >
                        <defs>
                          <mask id="doc-crop-cutout">
                            <rect x="0" y="0" width="100" height="100" fill="white" />
                            <polygon points={quadSvgPoints} fill="black" />
                          </mask>
                        </defs>
                        <rect
                          x="0"
                          y="0"
                          width="100"
                          height="100"
                          fill="rgba(2, 6, 23, 0.56)"
                          mask="url(#doc-crop-cutout)"
                        />
                        <polygon
                          points={quadSvgPoints}
                          fill="none"
                          stroke="#14b8a6"
                          strokeWidth="0.65"
                          vectorEffect="non-scaling-stroke"
                        />
                      </svg>

                      {/* 4 Edge Midpoint Draggable Capsule Bars (Just like CamScanner!) */}
                      {edgeMidpoints.map((m) => (
                        <div
                          key={`edge-${m.edge}`}
                          role="slider"
                          aria-label={`ধার ${m.edge + 1} সরান`}
                          aria-valuenow={Math.round(m.x * 100)}
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            e.currentTarget.setPointerCapture(e.pointerId);
                            setDragTarget({
                              kind: 'edge',
                              edge: m.edge,
                              startClientX: e.clientX,
                              startClientY: e.clientY,
                              startQuad: activePage.quad.map((pt) => ({ ...pt })) as DocumentQuad,
                            });
                          }}
                          className="absolute z-20 -translate-x-1/2 -translate-y-1/2 w-11 h-7 flex items-center justify-center cursor-move touch-none"
                          style={{
                            left: `${m.x * 100}%`,
                            top: `${m.y * 100}%`,
                            transform: `translate(-50%, -50%) rotate(${m.angleDeg}deg)`,
                          }}
                        >
                          <div className="w-8 h-2.5 rounded-full bg-white border-2 border-teal-500 shadow-md" />
                        </div>
                      ))}

                      {/* 4 Corner Draggable Circular Handles */}
                      {activePage.quad.map((pt, idx) => (
                        <div
                          key={`corner-${idx}`}
                          role="slider"
                          aria-label={`কোনা ${idx + 1} সরান`}
                          aria-valuenow={Math.round(pt.x * 100)}
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            e.currentTarget.setPointerCapture(e.pointerId);
                            setDragTarget({ kind: 'corner', index: idx as 0 | 1 | 2 | 3 });
                            setLoupePoint(pt);
                          }}
                          className="absolute z-30 -translate-x-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none"
                          style={{
                            left: `${pt.x * 100}%`,
                            top: `${pt.y * 100}%`,
                          }}
                        >
                          <div
                            className={`w-5 h-5 rounded-full bg-white border-[2.5px] border-teal-500 shadow-lg transition-transform ${
                              dragTarget?.kind === 'corner' && dragTarget.index === idx
                                ? 'scale-125 ring-4 ring-teal-400/40'
                                : 'hover:scale-110'
                            }`}
                          />
                        </div>
                      ))}

                      {/* Glowing Scan Sweep Overlay during Transition */}
                      {isScanningAnim && (
                        <div className="absolute inset-0 z-40 pointer-events-none overflow-hidden bg-slate-950/20">
                          <div className="animate-scan-beam w-full h-24 bg-gradient-to-b from-transparent via-teal-400/45 to-white border-b-2 border-white shadow-[0_6px_28px_rgba(20,184,166,0.9)]" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-400 text-xs">
                      <Loader2 className="w-6 h-6 animate-spin text-teal-400" />
                      <span>ডকুমেন্ট প্রান্ত শনাক্ত হচ্ছে...</span>
                    </div>
                  )}

                  {/* Precision 2.5x Circular Magnifier Loupe (Appears while dragging a corner) */}
                  {loupePoint && (
                    <div
                      className={`absolute top-4 z-50 w-28 h-28 rounded-full border-2 border-teal-400 shadow-2xl overflow-hidden bg-slate-900 pointer-events-none ${
                        loupePoint.x < 0.45 && loupePoint.y < 0.45 ? 'right-4' : 'left-4'
                      }`}
                    >
                      <canvas ref={loupeCanvasRef} width={112} height={112} className="w-full h-full" />
                    </div>
                  )}
                </div>

                {/* CamScanner-Style Dark Bottom Action Bar */}
                <div className="bg-slate-900 border-t border-white/10 px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-white">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <button
                      type="button"
                      onClick={() => void handleRotate(-90)}
                      className="px-3 py-2 rounded-xl hover:bg-white/10 active:bg-white/15 flex flex-col sm:flex-row items-center gap-1.5 text-xs font-semibold cursor-pointer transition"
                    >
                      <RotateCcw className="w-4 h-4 text-slate-200" />
                      <span>বামে ঘোরান</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleRotate(90)}
                      className="px-3 py-2 rounded-xl hover:bg-white/10 active:bg-white/15 flex flex-col sm:flex-row items-center gap-1.5 text-xs font-semibold cursor-pointer transition"
                    >
                      <RotateCw className="w-4 h-4 text-slate-200" />
                      <span>ডানে ঘোরান</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleToggleAutoOrAll}
                      className="px-3 py-2 rounded-xl hover:bg-white/10 active:bg-white/15 flex flex-col sm:flex-row items-center gap-1.5 text-xs font-semibold cursor-pointer transition"
                    >
                      <Maximize className="w-4 h-4 text-teal-400" />
                      <span>{isFullQuad ? 'অটো বর্ডার' : 'সম্পূর্ণ ছবি'}</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleProceedToScan}
                    disabled={isScanningAnim || !sourceCanvas}
                    className="glass-btn-emerald px-5 py-2.5 rounded-xl text-white text-xs sm:text-sm font-extrabold inline-flex items-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {isScanningAnim ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>স্ক্যান হচ্ছে...</span>
                      </>
                    ) : (
                      <>
                        <span>পরবর্তী (স্ক্যান করুন)</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Right Column: Clear Guidance & Paper Mode Quick Pre-Select */}
              <div className="lg:col-span-4 space-y-4">
                <div className="glass-panel rounded-2xl p-4 sm:p-5 space-y-4">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      স্মার্ট ৪-কোনা পার্সপেক্টিভ ক্রপ
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      ছবি আপলোডের সাথে সাথেই কাগজের ৪ কোনা অটোমেটিক ধরে নেওয়া হয়েছে। প্রয়োজনে যেকোনো
                      সাদা গোল কোনা বা লম্বা ধারের বার টেনে কাগজের একদম কিনারায় মিলিয়ে নিন।
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-900/8 dark:border-white/10 space-y-2.5">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-100 block">
                      আউটপুট পেপার সাইজ বাছুন
                    </label>
                    <div className="grid grid-cols-1 gap-1.5">
                      {PAPER_SIZE_OPTIONS.map((opt) => {
                        const selected = activePage.options.paperSize === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() =>
                              updateActivePage((p) => ({
                                ...p,
                                options: { ...p.options, paperSize: opt.id },
                              }))
                            }
                            className={`text-left px-3 py-2 rounded-xl border transition cursor-pointer flex items-center justify-between gap-2 ${
                              selected
                                ? 'bg-teal-500/12 border-teal-500/60 text-teal-800 dark:text-teal-200'
                                : 'glass-tile text-slate-700 dark:text-slate-200'
                            }`}
                          >
                            <div>
                              <div className="text-xs font-bold">{opt.label}</div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                {opt.hint}
                              </div>
                            </div>
                            {selected && <Check className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleProceedToScan}
                    disabled={isScanningAnim || !sourceCanvas}
                    className="w-full glass-btn-emerald py-3 rounded-xl text-white text-sm font-extrabold inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ScanLine className="w-4 h-4" />
                    <span>স্ক্যান করে সাদা Full HD পেজ বানান</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              STEP 2: CAMSCANNER MAGIC PRO / MAGIC COLOR ENHANCE, PAPER FIT & PRINT
             ================================================================= */}
          {step === 'enhance' && activePage && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left / Center: Full HD Scanned White Page + Live Thumbnail Filter Strip */}
              <div className="lg:col-span-8 glass-panel rounded-3xl overflow-hidden flex flex-col">
                {/* Dark Studio Viewport with Top-Right Compare Toggle */}
                <div className="bg-slate-950 relative flex flex-col items-center justify-center p-4 sm:p-7 min-h-[420px] sm:min-h-[520px] select-none">
                  {/* Top Bar inside Dark Viewport */}
                  <div className="w-full flex items-center justify-between gap-2 mb-3">
                    <div className="text-[11px] text-slate-300 font-mono tabular-nums flex items-center gap-2">
                      <span>{activePaperSpec?.labelBn}</span>
                      {previewDimensions.w > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>
                            {toBnDigits(previewDimensions.w)}×{toBnDigits(previewDimensions.h)} px
                          </span>
                        </>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setCompareActive((v) => !v)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer ${
                        compareActive
                          ? 'bg-teal-500 text-white shadow-md'
                          : 'bg-white/12 text-white hover:bg-white/20'
                      }`}
                    >
                      <Columns2 className="w-3.5 h-3.5" />
                      <span>{compareActive ? 'তুলনা বন্ধ করুন' : 'আগে / পরে তুলনা'}</span>
                    </button>
                  </div>

                  {/* Document Paper Sheet Preview */}
                  {enhancedPreviewUrl ? (
                    compareActive && originalRectifiedUrl ? (
                      <div
                        ref={compareContainerRef}
                        onPointerDown={(e) => {
                          isDraggingCompareRef.current = true;
                          e.currentTarget.setPointerCapture(e.pointerId);
                          updateCompareFromEvent(e.clientX);
                        }}
                        onPointerMove={(e) => {
                          if (!isDraggingCompareRef.current) return;
                          updateCompareFromEvent(e.clientX);
                        }}
                        onPointerUp={() => {
                          isDraggingCompareRef.current = false;
                        }}
                        className="relative inline-block max-w-full cursor-ew-resize touch-none shadow-2xl rounded-sm overflow-hidden bg-white"
                      >
                        {/* After (Full HD Enhanced) Base */}
                        <img
                          src={enhancedPreviewUrl}
                          alt="স্ক্যান করা ডকুমেন্ট"
                          draggable={false}
                          className="block max-w-full max-h-[56vh] object-contain pointer-events-none"
                        />
                        {/* Before (Raw Cropped Original) Clipped Left */}
                        <div
                          className="absolute inset-0 overflow-hidden pointer-events-none"
                          style={{ clipPath: `inset(0 ${100 - compareSplit}% 0 0)` }}
                        >
                          <img
                            src={originalRectifiedUrl}
                            alt="মূল ডকুমেন্ট"
                            draggable={false}
                            className="w-full h-full object-contain bg-white"
                          />
                        </div>
                        {/* Split Handle */}
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-teal-400 shadow-[0_0_12px_rgba(20,184,166,0.9)] pointer-events-none"
                          style={{ left: `${compareSplit}%` }}
                        >
                          <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-teal-500 border-2 border-white shadow-lg flex items-center justify-center text-white">
                            <Columns2 className="w-3.5 h-3.5" />
                          </div>
                        </div>
                        <span className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded bg-black/70 text-[11px] font-bold text-white pointer-events-none">
                          আগে (মূল ছবি)
                        </span>
                        <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded bg-teal-600/90 text-[11px] font-bold text-white pointer-events-none">
                          পরে ({SCANNER_FILTERS.find((f) => f.id === activePage.options.filter)?.labelBn})
                        </span>
                      </div>
                    ) : (
                      <div className="relative shadow-[0_22px_55px_-12px_rgba(0,0,0,0.85)] rounded-sm overflow-hidden bg-white">
                        <img
                          src={enhancedPreviewUrl}
                          alt="স্ক্যান করা Full HD ডকুমেন্ট"
                          className="block max-w-full max-h-[56vh] object-contain"
                        />
                        {isScanningAnim && (
                          <div className="absolute inset-0 pointer-events-none overflow-hidden">
                            <div className="animate-scan-beam w-full h-24 bg-gradient-to-b from-transparent via-teal-400/45 to-white border-b-2 border-white" />
                          </div>
                        )}
                      </div>
                    )
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-400 text-xs">
                      <Loader2 className="w-6 h-6 animate-spin text-teal-400" />
                      <span>ফিল্টার প্রয়োগ হচ্ছে...</span>
                    </div>
                  )}
                </div>

                {/* CamScanner Live Filter Thumbnail Carousel */}
                <div className="bg-slate-900 border-t border-white/10 px-3 sm:px-4 py-3 space-y-3">
                  <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-0.5">
                    {SCANNER_FILTERS.map((f) => {
                      const isActive = activePage.options.filter === f.id;
                      const thumb = filterThumbs[f.id];
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() =>
                            updateActivePage((p) => ({
                              ...p,
                              options: { ...p.options, filter: f.id },
                            }))
                          }
                          className={`group relative flex flex-col w-20 sm:w-22 shrink-0 rounded-xl overflow-hidden border-2 transition cursor-pointer ${
                            isActive
                              ? 'border-sky-400 shadow-[0_0_16px_rgba(56,189,248,0.45)] scale-[1.03]'
                              : 'border-white/10 hover:border-white/35'
                          }`}
                        >
                          <div className="w-full h-16 sm:h-18 bg-slate-800 relative overflow-hidden">
                            {thumb ? (
                              <img
                                src={thumb}
                                alt={f.labelBn}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-slate-700" />
                            )}
                            {f.featured && (
                              <span
                                className="absolute top-1 right-1 w-4 h-4 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow"
                                title="সেরা ডকুমেন্ট ফিল্টার"
                              >
                                <Star className="w-2.5 h-2.5 fill-current" />
                              </span>
                            )}
                          </div>
                          <div
                            className={`w-full py-1 px-1 text-[10px] font-bold text-center truncate ${
                              isActive
                                ? 'bg-sky-500 text-white'
                                : 'bg-slate-800/95 text-slate-200 group-hover:text-white'
                            }`}
                          >
                            {f.labelBn}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Quick Secondary Tools Row under Filter Strip */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10 text-white">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setStep('crop')}
                        className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Crop className="w-3.5 h-3.5 text-teal-400" />
                        <span>পুনরায় ক্রপ</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleRotate(-90)}
                        className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                        title="বামে ঘোরান"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">ঘোরান</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowFineTune((v) => !v)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
                          showFineTune
                            ? 'bg-sky-500 text-white'
                            : 'bg-white/10 hover:bg-white/15 text-slate-200'
                        }`}
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        <span>আলো / শার্পনেস</span>
                      </button>
                    </div>

                    {pages.length > 1 && (
                      <button
                        type="button"
                        onClick={handleApplyOptionsToAll}
                        className="px-3 py-1.5 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 border border-teal-400/40 text-teal-200 text-xs font-bold cursor-pointer"
                      >
                        সব পাতায় এই ফিল্টার ও পেপার দিন
                      </button>
                    )}
                  </div>

                  {/* Collapsible Fine-Tune Sliders */}
                  {showFineTune && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/10 text-xs text-slate-200">
                      <label className="space-y-1">
                        <div className="flex justify-between">
                          <span>উজ্বলতা (Brightness)</span>
                          <span className="font-mono tabular-nums text-teal-300">
                            {activePage.options.brightness > 0 ? '+' : ''}
                            {toBnDigits(activePage.options.brightness)}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={-40}
                          max={40}
                          value={activePage.options.brightness}
                          onChange={(e) =>
                            updateActivePage((p) => ({
                              ...p,
                              options: { ...p.options, brightness: Number(e.target.value) },
                            }))
                          }
                          className="w-full accent-teal-400 cursor-pointer"
                        />
                      </label>

                      <label className="space-y-1">
                        <div className="flex justify-between">
                          <span>কনট্রাস্ট (Contrast)</span>
                          <span className="font-mono tabular-nums text-teal-300">
                            {activePage.options.contrast > 0 ? '+' : ''}
                            {toBnDigits(activePage.options.contrast)}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={-40}
                          max={40}
                          value={activePage.options.contrast}
                          onChange={(e) =>
                            updateActivePage((p) => ({
                              ...p,
                              options: { ...p.options, contrast: Number(e.target.value) },
                            }))
                          }
                          className="w-full accent-teal-400 cursor-pointer"
                        />
                      </label>

                      <label className="space-y-1">
                        <div className="flex justify-between">
                          <span>লেখার শার্পনেস</span>
                          <span className="font-mono tabular-nums text-teal-300">
                            {toBnDigits(activePage.options.sharpness)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={activePage.options.sharpness}
                          onChange={(e) =>
                            updateActivePage((p) => ({
                              ...p,
                              options: { ...p.options, sharpness: Number(e.target.value) },
                            }))
                          }
                          className="w-full accent-teal-400 cursor-pointer"
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Paper Size Auto-Fit, Quality, Direct Print & Download */}
              <div className="lg:col-span-4 space-y-4">
                <div className="glass-panel rounded-2xl p-4 sm:p-5 space-y-4">
                  {/* Paper Size Selector */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-extrabold text-slate-900 dark:text-white">
                        পেপার সাইজ ও ফিট
                      </h3>
                      <span className="text-[11px] font-semibold text-teal-600 dark:text-teal-400">
                        সাদা পেজে Full HD
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-1.5">
                      {PAPER_SIZE_OPTIONS.map((opt) => {
                        const selected = activePage.options.paperSize === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() =>
                              updateActivePage((p) => ({
                                ...p,
                                options: { ...p.options, paperSize: opt.id },
                              }))
                            }
                            className={`text-left px-3 py-2 rounded-xl border transition cursor-pointer flex items-center justify-between gap-2 ${
                              selected
                                ? 'bg-teal-500/12 border-teal-500/60 text-teal-800 dark:text-teal-200'
                                : 'glass-tile text-slate-700 dark:text-slate-200'
                            }`}
                          >
                            <div>
                              <div className="text-xs font-bold">{opt.label}</div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                {opt.hint}
                              </div>
                            </div>
                            {selected && (
                              <Check className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Page Margin */}
                  <div className="pt-3 border-t border-slate-900/8 dark:border-white/10 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 dark:text-slate-100">
                        কাগজের চারপাশে মার্জিন
                      </span>
                      <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                        {toBnDigits(activePage.options.marginMm)} mm
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {MARGIN_OPTIONS.map((mm) => (
                        <button
                          key={mm}
                          type="button"
                          onClick={() =>
                            updateActivePage((p) => ({
                              ...p,
                              options: { ...p.options, marginMm: mm },
                            }))
                          }
                          className={`py-1.5 rounded-lg text-xs font-bold tabular-nums transition cursor-pointer ${
                            activePage.options.marginMm === mm
                              ? 'glass-btn-primary text-white'
                              : 'glass-tile text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          {toBnDigits(mm)} mm
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Output Format (Lossless PNG vs Sharp JPG) */}
                  <div className="pt-3 border-t border-slate-900/8 dark:border-white/10 space-y-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block">
                      ছবির কোয়ালিটি ফরম্যাট
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          updateActivePage((p) => ({
                            ...p,
                            options: { ...p.options, outputFormat: 'image/png' },
                          }))
                        }
                        className={`py-2 px-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                          activePage.options.outputFormat === 'image/png'
                            ? 'glass-btn-primary text-white'
                            : 'glass-tile text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        PNG (সর্বোচ্চ HD)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateActivePage((p) => ({
                            ...p,
                            options: { ...p.options, outputFormat: 'image/jpeg' },
                          }))
                        }
                        className={`py-2 px-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                          activePage.options.outputFormat === 'image/jpeg'
                            ? 'glass-btn-primary text-white'
                            : 'glass-tile text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        JPG (৯৬% শার্প)
                      </button>
                    </div>
                  </div>

                  {/* Primary Action Buttons: Direct Print, PDF, Full HD Image */}
                  <div className="pt-3 border-t border-slate-900/8 dark:border-white/10 space-y-2.5">
                    <button
                      type="button"
                      onClick={() => void handleDirectPrint(pages.length > 1)}
                      disabled={isExporting}
                      className="w-full glass-btn-primary py-3 rounded-xl text-white text-sm font-extrabold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {isExporting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>{exportStatus || 'প্রস্তুত হচ্ছে...'}</span>
                        </>
                      ) : (
                        <>
                          <Printer className="w-4 h-4" />
                          <span>
                            {pages.length > 1
                              ? `সব পাতা সরাসরি প্রিন্ট করুন (${toBnDigits(pages.length)})`
                              : 'সরাসরি প্রিন্ট করুন'}
                          </span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleDownloadPdf()}
                      disabled={isExporting}
                      className="w-full glass-btn-emerald py-2.5 rounded-xl text-white text-xs sm:text-sm font-extrabold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      <FileDown className="w-4 h-4" />
                      <span>
                        {pages.length > 1
                          ? `সব পাতা একত্রে PDF ডাউনলোড (${toBnDigits(pages.length)})`
                          : 'প্রিন্ট-রেডি Full HD PDF ডাউনলোড'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleDownloadFullHdImages(pages.length > 1)}
                      disabled={isExporting}
                      className="w-full glass-tile py-2.5 rounded-xl text-slate-900 dark:text-white text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>
                        {pages.length > 1
                          ? `সব পাতা Full HD ছবি (ZIP) ডাউনলোড`
                          : 'Full HD ছবি ডাউনলোড করুন'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Exported Files History Panel */}
          <ProcessedResultsList
            results={results}
            zipFileName="NextStudio_Scanned_Documents.zip"
            onClear={() => setResults([])}
            title="স্ক্যান করা Full HD ডকুমেন্ট প্রস্তুত"
          />
        </div>
      )}
    </div>
  );
};
