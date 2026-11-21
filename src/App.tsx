/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Edit3, FileDown, LayoutGrid, Printer } from 'lucide-react';
import { CvControls } from './components/CvStudio/CvControls';
import { CvSheetRenderer } from './components/CvStudio/CvSheetRenderer';
import { CvWorkspace } from './components/CvStudio/CvWorkspace';
import { DocumentControls } from './components/DocumentStudio/DocumentControls';
import { DocumentEditorModal } from './components/DocumentStudio/DocumentEditorModal';
import { Header } from './components/Header';
import { LaminationControls } from './components/LaminationStudio/LaminationControls';
import { NidControls } from './components/NidStudio/NidControls';
import { NidEditorModal } from './components/NidStudio/NidEditorModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PaperPreview } from './components/PaperPreview';
import { PassportControls } from './components/PassportStudio/PassportControls';
import { PhotoEditorModal } from './components/PassportStudio/PhotoEditorModal';
import { PrintSheetHidden } from './components/PrintSheetHidden';
import { ReadyDocControls } from './components/ReadyDocsStudio/ReadyDocControls';
import { ReadyDocSheetRenderer } from './components/ReadyDocsStudio/ReadyDocSheetRenderer';
import { ReadyDocWorkspace } from './components/ReadyDocsStudio/ReadyDocWorkspace';
import { ShortcutsModal } from './components/ShortcutsModal';
import {
  CropRect,
  CuttingGuideStyle,
  CvData,
  DocumentFitMode,
  DocumentPageItem,
  DocumentPrintSettings,
  LaminationCardSettings,
  LayoutMode,
  MarginSettings,
  NIDCardSettings,
  PaperOrientation,
  PaperSizeType,
  PhotoAdjustments,
  PhotoPresetType,
  PlacedSheetItem,
  ReadyDocState,
  StudioMode,
  StudioPhotoItem,
  StudioState,
} from './types';
import {
  alignLaminationTopCenter,
  DEFAULT_ADJUSTMENTS,
  DEFAULT_DOCUMENT_SETTINGS,
  DEFAULT_LAMINATION_SETTINGS,
  DEFAULT_MARGINS,
  DEFAULT_NID_MARGINS,
  NID_STANDARD_HEIGHT,
  NID_STANDARD_WIDTH,
  PAPER_SIZES,
  PHOTO_PRESETS,
} from './utils/constants';
import {
  getImageDimensions,
  prepareLaminationCardImage,
  processDocumentImage,
  processNIDImage,
  processStudioPhoto,
} from './utils/imageProcessing';
import {
  addPhotoToSheet,
  autoAlignPlacedItems,
  calculatePhotoPositions,
  generateDefaultPlacedItems,
} from './utils/layoutCalculator';
import { exportCvElementToImage, exportCvElementToPdf } from './utils/cvExport';
import { createEmptyCvData } from './utils/cvTemplates';
import { exportToImage, exportToPdf, triggerDirectPrint } from './utils/printAndPdf';
import { exportReadyDocToImage, exportReadyDocToPdf } from './utils/readyDocExport';
import {
  createDefaultReadyDocState,
  getReadyDocTemplateById,
  resolveReadyDocPaper,
} from './utils/readyDocs';
import {
  exportProjectAsJson,
  importProjectFromJson,
  loadQuickPrefs,
  loadStateFromLocal,
  loadStateOffline,
  saveStateOffline,
} from './utils/storage';

interface StudioHistorySnapshot {
  photoPreset: PhotoPresetType;
  customPhotoWidth: number;
  customPhotoHeight: number;
  paperSize: PaperSizeType;
  customPaperWidth: number;
  customPaperHeight: number;
  orientation: PaperOrientation;
  layoutMode: LayoutMode;
  manualCount: number;
  margins: MarginSettings;
  cuttingGuide: CuttingGuideStyle;
  bleedArea: number;
  colorProfile: 'srgb' | 'cmyk' | 'bw';
  printQuality: 150 | 300 | 600;
  photos: StudioPhotoItem[];
  activePhotoIndex: number;
  placedItems: PlacedSheetItem[];
  nid: NIDCardSettings;
  nidMargins: MarginSettings;
  documentSettings: DocumentPrintSettings;
  lamination: LaminationCardSettings;
  cvData: CvData;
  readyDocState: ReadyDocState;
}

const MAX_UNDO_HISTORY = 45;

function areSnapshotsEqual(
  a: StudioHistorySnapshot | null,
  b: StudioHistorySnapshot | null
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.photoPreset === b.photoPreset &&
    a.customPhotoWidth === b.customPhotoWidth &&
    a.customPhotoHeight === b.customPhotoHeight &&
    a.paperSize === b.paperSize &&
    a.customPaperWidth === b.customPaperWidth &&
    a.customPaperHeight === b.customPaperHeight &&
    a.orientation === b.orientation &&
    a.layoutMode === b.layoutMode &&
    a.manualCount === b.manualCount &&
    a.margins === b.margins &&
    a.cuttingGuide === b.cuttingGuide &&
    a.bleedArea === b.bleedArea &&
    a.colorProfile === b.colorProfile &&
    a.printQuality === b.printQuality &&
    a.photos === b.photos &&
    a.activePhotoIndex === b.activePhotoIndex &&
    a.placedItems === b.placedItems &&
    a.nid === b.nid &&
    a.nidMargins === b.nidMargins &&
    a.documentSettings === b.documentSettings &&
    a.lamination === b.lamination &&
    a.cvData === b.cvData &&
    a.readyDocState === b.readyDocState
  );
}

export default function App() {
  // 1. Initial State Setup - Default Language English ('en')
  const [mode, setMode] = useState<StudioMode>('passport');
  const [lang, setLang] = useState<'bn' | 'en'>(() => {
    try {
      const explicitLang =
        localStorage.getItem('nextstudio_selected_lang') ||
        localStorage.getItem('photostudio_selected_lang');
      if (explicitLang === 'bn' || explicitLang === 'en') return explicitLang;
    } catch {
      // ignore
    }
    return 'en';
  });
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const quick = loadQuickPrefs();
      if (quick?.theme === 'dark' || quick?.theme === 'light') return quick.theme;
      const saved = loadStateFromLocal();
      if (saved?.theme === 'dark' || saved?.theme === 'light') return saved.theme;
      if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    } catch {
      // ignore
    }
    return 'light';
  });
  const [isSaved, setIsSaved] = useState(true);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [zoom, setZoom] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const w = window.innerWidth;
      if (w < 480) return 0.42;
      if (w < 640) return 0.50;
      if (w < 1024) return 0.65;
    }
    return 0.85;
  });

  // Language setter wrapper with storage persistence
  const handleSetLang = (newLang: 'bn' | 'en') => {
    setLang(newLang);
    try {
      localStorage.setItem('nextstudio_selected_lang', newLang);
    } catch {
      // ignore
    }
  };

  // Passport Studio State
  const [photoPreset, setPhotoPreset] = useState<PhotoPresetType>('bd-passport');
  const [customPhotoWidth, setCustomPhotoWidth] = useState(35);
  const [customPhotoHeight, setCustomPhotoHeight] = useState(45);
  const [paperSize, setPaperSize] = useState<PaperSizeType>('a4');
  const [customPaperWidth, setCustomPaperWidth] = useState<number>(210);
  const [customPaperHeight, setCustomPaperHeight] = useState<number>(297);
  const [orientation, setOrientation] = useState<PaperOrientation>('portrait');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('top-5');
  const [manualCount, setManualCount] = useState<number>(5);
  const [margins, setMargins] = useState<MarginSettings>(DEFAULT_MARGINS);
  const [cuttingGuide, setCuttingGuide] = useState<CuttingGuideStyle>('none');
  const [bleedArea, setBleedArea] = useState<number>(0);
  const [colorProfile, setColorProfile] = useState<'srgb' | 'cmyk' | 'bw'>('srgb');
  const [printQuality, setPrintQuality] = useState<150 | 300 | 600>(300);

  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Photos State - Starts completely empty (no dummy photos)
  const [photos, setPhotos] = useState<StudioPhotoItem[]>([]);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number>(0);
  const [editingPhotoIndex, setEditingPhotoIndex] = useState<number | null>(null);

  // Placed items on the paper sheet (enables drag-and-drop, nudging, mixed passport & stamp sizes)
  const [placedItems, setPlacedItems] = useState<PlacedSheetItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // NID State - Starts completely empty (no dummy cards)
  const [nid, setNid] = useState<NIDCardSettings>({
    frontImage: '',
    backImage: '',
    processedFrontImage: '',
    processedBackImage: '',
    cardWidth: NID_STANDARD_WIDTH,
    cardHeight: NID_STANDARD_HEIGHT,
    verticalSpacing: 15,
    centerOnPage: true,
    autoWhiteDocument: true,
    docThreshold: 45,
    docContrast: 25,
    frontStraighten: 0,
    backStraighten: 0,
    frontCrop: null,
    backCrop: null,
    frontBrightness: 0,
    backBrightness: 0,
  });
  const [nidMargins, setNidMargins] = useState<MarginSettings>(DEFAULT_NID_MARGINS);
  const [nidEditingSide, setNidEditingSide] = useState<'front' | 'back' | null>(null);

  // Document / Fit-to-Paper Print State
  const [documentSettings, setDocumentSettings] = useState<DocumentPrintSettings>(
    DEFAULT_DOCUMENT_SETTINGS
  );
  const [editingDocumentPageIndex, setEditingDocumentPageIndex] = useState<number | null>(null);
  const [autoPdfOnUpload, setAutoPdfOnUpload] = useState<boolean>(() => {
    try {
      return localStorage.getItem('nextstudio_auto_pdf_upload') === '1';
    } catch {
      return false;
    }
  });

  const handleSetAutoPdfOnUpload = (enabled: boolean) => {
    setAutoPdfOnUpload(enabled);
    try {
      localStorage.setItem('nextstudio_auto_pdf_upload', enabled ? '1' : '0');
    } catch {
      // ignore storage errors
    }
  };

  // Lamination Fold Side-by-Side ID Card State
  const [lamination, setLamination] = useState<LaminationCardSettings>(DEFAULT_LAMINATION_SETTINGS);
  const [laminationEditingSide, setLaminationEditingSide] = useState<'front' | 'back' | null>(null);

  // CV Maker Studio State
  const [cvData, setCvData] = useState<CvData>(() => createEmptyCvData('classic-plain', 'en'));
  const [cvShowGallery, setCvShowGallery] = useState<boolean>(true);

  // Ready-Made Documents Studio State
  const [readyDocState, setReadyDocState] = useState<ReadyDocState>(() =>
    createDefaultReadyDocState()
  );
  const [readyDocShowGallery, setReadyDocShowGallery] = useState<boolean>(true);

  // File upload trigger refs for paper preview click-to-upload
  const passportUploadInputRef = useRef<HTMLInputElement>(null);
  const nidFrontInputRef = useRef<HTMLInputElement>(null);
  const nidBackInputRef = useRef<HTMLInputElement>(null);
  const lamFrontInputRef = useRef<HTMLInputElement>(null);
  const lamBackInputRef = useRef<HTMLInputElement>(null);
  const documentUploadInputRef = useRef<HTMLInputElement>(null);

  // 2. Restore State from IndexedDB Offline Store (with localStorage fallback)
  const hasHydratedRef = useRef(false);
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => {
    let active = true;
    (async () => {
      const saved = await loadStateOffline();
      if (!active) return;
      if (saved) {
        setMode(saved.mode || 'passport');
        try {
          const explicitLang =
            localStorage.getItem('nextstudio_selected_lang') ||
            localStorage.getItem('photostudio_selected_lang');
          if (explicitLang === 'bn' || explicitLang === 'en') {
            setLang(explicitLang);
          } else {
            setLang('en');
          }
        } catch {
          setLang('en');
        }
        if (saved.theme) setTheme(saved.theme);
        if (saved.photoPreset) setPhotoPreset(saved.photoPreset);
        if (saved.paperSize) setPaperSize(saved.paperSize);
        if (saved.customPaperWidth) setCustomPaperWidth(saved.customPaperWidth);
        if (saved.customPaperHeight) setCustomPaperHeight(saved.customPaperHeight);
        if (saved.orientation) setOrientation(saved.orientation);
        if (saved.layoutMode) setLayoutMode(saved.layoutMode);
        if (saved.manualCount) setManualCount(saved.manualCount);
        if (saved.margins) setMargins(saved.margins);
        if (saved.cuttingGuide) setCuttingGuide(saved.cuttingGuide);
        if (saved.bleedArea !== undefined) setBleedArea(saved.bleedArea);
        if (saved.colorProfile) setColorProfile(saved.colorProfile);
        if (saved.printQuality) setPrintQuality(saved.printQuality);
        if (saved.photos && saved.photos.length > 0) {
          const realPhotos = saved.photos.filter(
            (p) => !p.id.startsWith('demo-') && !p.originalSrc.startsWith('data:image/svg+xml')
          );
          setPhotos(realPhotos);
        }
        if (saved.placedItems && saved.placedItems.length > 0) {
          setPlacedItems(saved.placedItems);
        }
        if (saved.selectedItemId) {
          setSelectedItemId(saved.selectedItemId);
        }
        if (saved.nid) {
          const cleanFront = saved.nid.frontImage?.startsWith('data:image/svg+xml') ? '' : (saved.nid.frontImage || '');
          const cleanBack = saved.nid.backImage?.startsWith('data:image/svg+xml') ? '' : (saved.nid.backImage || '');
          setNid({
            ...saved.nid,
            frontImage: cleanFront,
            processedFrontImage: saved.nid.processedFrontImage?.startsWith('data:image/svg+xml') ? '' : (saved.nid.processedFrontImage || cleanFront),
            backImage: cleanBack,
            processedBackImage: saved.nid.processedBackImage?.startsWith('data:image/svg+xml') ? '' : (saved.nid.processedBackImage || cleanBack),
          });
        }
        if (saved.nidMargins) setNidMargins(saved.nidMargins);
        if (saved.documentSettings) {
          setDocumentSettings({
            ...DEFAULT_DOCUMENT_SETTINGS,
            ...saved.documentSettings,
          });
        }
        if (saved.lamination) {
          let migratedCutGuide = saved.lamination.outerCutGuide;
          try {
            const migratedFlag = localStorage.getItem('nextstudio_lam_cut_none_v1');
            if (!migratedFlag) {
              if (!migratedCutGuide || migratedCutGuide === 'dashed') {
                migratedCutGuide = 'none';
              }
              localStorage.setItem('nextstudio_lam_cut_none_v1', '1');
            }
          } catch {
            // ignore storage errors
          }
          setLamination({
            ...DEFAULT_LAMINATION_SETTINGS,
            ...saved.lamination,
            outerCutGuide: migratedCutGuide ?? 'none',
          });
        }
        if (saved.cvData) {
          setCvData({
            ...createEmptyCvData(
              saved.cvData.templateId || 'classic-plain',
              saved.cvData.cvLang || 'en'
            ),
            ...saved.cvData,
          });
        }
        if (saved.readyDocState) {
          setReadyDocState({
            ...createDefaultReadyDocState(),
            ...saved.readyDocState,
          });
        }
      }
      hasHydratedRef.current = true;
      setIsHydrated(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  // 3. Theme Toggle Effect: Controls HTML and Body dark class
  useEffect(() => {
    const isDark = theme === 'dark';
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [theme]);

  // 4. Autosave Debounced into IndexedDB (100% Offline, Large Photo Safe)
  const saveTimeoutRef = useRef<number | null>(null);
  useEffect(() => {
    if (!hasHydratedRef.current) return;
    setIsSaved(false);
    if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = window.setTimeout(() => {
      const currentState: StudioState = {
        mode,
        lang,
        theme,
        photoPreset,
        customPhotoWidth,
        customPhotoHeight,
        paperSize,
        customPaperWidth,
        customPaperHeight,
        orientation,
        layoutMode,
        manualCount,
        margins,
        cuttingGuide,
        bleedArea,
        colorProfile,
        printQuality,
        photos,
        activePhotoIndex,
        autoRemoveBgOnUpload: false,
        uploadBgMode: 'studio-blue',
        placedItems,
        selectedItemId,
        nid,
        nidMargins,
        documentSettings,
        lamination,
        cvData,
        readyDocState,
      };
      void saveStateOffline(currentState).then(() => setIsSaved(true));
    }, 650);

    return () => {
      if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
    };
  }, [
    mode,
    lang,
    theme,
    photoPreset,
    customPhotoWidth,
    customPhotoHeight,
    paperSize,
    customPaperWidth,
    customPaperHeight,
    orientation,
    layoutMode,
    manualCount,
    margins,
    cuttingGuide,
    bleedArea,
    colorProfile,
    printQuality,
    photos,
    activePhotoIndex,
    placedItems,
    selectedItemId,
    nid,
    nidMargins,
    documentSettings,
    lamination,
    cvData,
    readyDocState,
  ]);

  // 4B. Global Undo / Redo History Engine across all 6 Studio Modes
  const currentHistorySnapshot = useMemo<StudioHistorySnapshot>(
    () => ({
      photoPreset,
      customPhotoWidth,
      customPhotoHeight,
      paperSize,
      customPaperWidth,
      customPaperHeight,
      orientation,
      layoutMode,
      manualCount,
      margins,
      cuttingGuide,
      bleedArea,
      colorProfile,
      printQuality,
      photos,
      activePhotoIndex,
      placedItems,
      nid,
      nidMargins,
      documentSettings,
      lamination,
      cvData,
      readyDocState,
    }),
    [
      photoPreset,
      customPhotoWidth,
      customPhotoHeight,
      paperSize,
      customPaperWidth,
      customPaperHeight,
      orientation,
      layoutMode,
      manualCount,
      margins,
      cuttingGuide,
      bleedArea,
      colorProfile,
      printQuality,
      photos,
      activePhotoIndex,
      placedItems,
      nid,
      nidMargins,
      documentSettings,
      lamination,
      cvData,
      readyDocState,
    ]
  );

  const historyRef = useRef<{
    past: StudioHistorySnapshot[];
    present: StudioHistorySnapshot | null;
    future: StudioHistorySnapshot[];
  }>({
    past: [],
    present: null,
    future: [],
  });
  const latestSnapshotRef = useRef<StudioHistorySnapshot>(currentHistorySnapshot);
  const isRestoringHistoryRef = useRef<boolean>(false);
  const historyCommitTimerRef = useRef<number | null>(null);
  const [historyMeta, setHistoryMeta] = useState<{ canUndo: boolean; canRedo: boolean }>({
    canUndo: false,
    canRedo: false,
  });

  useEffect(() => {
    latestSnapshotRef.current = currentHistorySnapshot;
    if (!isHydrated) return;

    const h = historyRef.current;
    if (!h.present) {
      h.present = currentHistorySnapshot;
      return;
    }

    if (isRestoringHistoryRef.current) {
      isRestoringHistoryRef.current = false;
      return;
    }

    if (areSnapshotsEqual(h.present, currentHistorySnapshot)) {
      return;
    }

    if (historyCommitTimerRef.current !== null) {
      window.clearTimeout(historyCommitTimerRef.current);
    }

    // Light up Undo button immediately while debouncing rapid typing/dragging into clean steps
    setHistoryMeta({ canUndo: true, canRedo: false });

    historyCommitTimerRef.current = window.setTimeout(() => {
      historyCommitTimerRef.current = null;
      const latest = latestSnapshotRef.current;
      if (!h.present || areSnapshotsEqual(h.present, latest)) return;
      const nextPast = [...h.past, h.present];
      if (nextPast.length > MAX_UNDO_HISTORY) {
        nextPast.shift();
      }
      h.past = nextPast;
      h.present = latest;
      h.future = [];
      setHistoryMeta({ canUndo: h.past.length > 0, canRedo: false });
    }, 260);
  }, [currentHistorySnapshot, isHydrated]);

  useEffect(() => {
    return () => {
      if (historyCommitTimerRef.current !== null) {
        window.clearTimeout(historyCommitTimerRef.current);
      }
    };
  }, []);

  const applyHistorySnapshot = (snap: StudioHistorySnapshot) => {
    if (historyCommitTimerRef.current !== null) {
      window.clearTimeout(historyCommitTimerRef.current);
      historyCommitTimerRef.current = null;
    }
    const alreadyEqual = areSnapshotsEqual(snap, latestSnapshotRef.current);
    isRestoringHistoryRef.current = !alreadyEqual;
    setPhotoPreset(snap.photoPreset);
    setCustomPhotoWidth(snap.customPhotoWidth);
    setCustomPhotoHeight(snap.customPhotoHeight);
    setPaperSize(snap.paperSize);
    setCustomPaperWidth(snap.customPaperWidth);
    setCustomPaperHeight(snap.customPaperHeight);
    setOrientation(snap.orientation);
    setLayoutMode(snap.layoutMode);
    setManualCount(snap.manualCount);
    setMargins(snap.margins);
    setCuttingGuide(snap.cuttingGuide);
    setBleedArea(snap.bleedArea);
    setColorProfile(snap.colorProfile);
    setPrintQuality(snap.printQuality);
    setPhotos(snap.photos);
    setActivePhotoIndex(snap.activePhotoIndex);
    setPlacedItems(snap.placedItems);
    setNid(snap.nid);
    setNidMargins(snap.nidMargins);
    setDocumentSettings(snap.documentSettings);
    setLamination(snap.lamination);
    setCvData(snap.cvData);
    setReadyDocState(snap.readyDocState);
  };

  const handleUndo = () => {
    const h = historyRef.current;
    // Commit any pending debounced edit first so immediate Ctrl+Z undoes the edit just performed
    if (historyCommitTimerRef.current !== null) {
      window.clearTimeout(historyCommitTimerRef.current);
      historyCommitTimerRef.current = null;
      const latest = latestSnapshotRef.current;
      if (h.present && !areSnapshotsEqual(h.present, latest)) {
        const nextPast = [...h.past, h.present];
        if (nextPast.length > MAX_UNDO_HISTORY) {
          nextPast.shift();
        }
        h.past = nextPast;
        h.present = latest;
        h.future = [];
      }
    }

    if (h.past.length === 0 || !h.present) {
      setHistoryMeta({ canUndo: false, canRedo: h.future.length > 0 });
      return;
    }

    const previous = h.past[h.past.length - 1];
    h.past = h.past.slice(0, -1);
    h.future = [h.present, ...h.future].slice(0, MAX_UNDO_HISTORY);
    h.present = previous;
    setHistoryMeta({ canUndo: h.past.length > 0, canRedo: h.future.length > 0 });
    applyHistorySnapshot(previous);
  };

  const handleRedo = () => {
    const h = historyRef.current;
    if (historyCommitTimerRef.current !== null) {
      window.clearTimeout(historyCommitTimerRef.current);
      historyCommitTimerRef.current = null;
    }

    if (h.future.length === 0 || !h.present) {
      setHistoryMeta({ canUndo: h.past.length > 0, canRedo: false });
      return;
    }

    const next = h.future[0];
    h.future = h.future.slice(1);
    h.past = [...h.past, h.present].slice(-MAX_UNDO_HISTORY);
    h.present = next;
    setHistoryMeta({ canUndo: h.past.length > 0, canRedo: h.future.length > 0 });
    applyHistorySnapshot(next);
  };

  const handleUndoRef = useRef(handleUndo);
  handleUndoRef.current = handleUndo;
  const handleRedoRef = useRef(handleRedo);
  handleRedoRef.current = handleRedo;

  // 5. Dimension Resolutions
  const activeReadyDocTemplate = useMemo(
    () => getReadyDocTemplateById(readyDocState.selectedDocId),
    [readyDocState.selectedDocId]
  );
  const activeReadyDocPaper = useMemo(
    () => resolveReadyDocPaper(activeReadyDocTemplate, readyDocState.paperOverride),
    [activeReadyDocTemplate, readyDocState.paperOverride]
  );

  const effectivePhotoWidth =
    photoPreset === 'custom' ? customPhotoWidth : PHOTO_PRESETS[photoPreset].width;
  const effectivePhotoHeight =
    photoPreset === 'custom' ? customPhotoHeight : PHOTO_PRESETS[photoPreset].height;
  const currentPaper =
    paperSize === 'custom'
      ? {
          name: `${lang === 'en' ? 'Custom' : 'কাস্টম'} (${customPaperWidth} × ${customPaperHeight} mm)`,
          width: customPaperWidth,
          height: customPaperHeight,
        }
      : PAPER_SIZES[paperSize];

  // Dynamically sync CSS @page size & orientation to selected paper sheet (A4 for CV, exact Legal/A4 for Ready Docs)
  useEffect(() => {
    const isLand = orientation === 'landscape';
    const wMm =
      mode === 'cv'
        ? 210
        : mode === 'readydocs'
        ? activeReadyDocPaper.widthMm
        : isLand
        ? currentPaper.height
        : currentPaper.width;
    const hMm =
      mode === 'cv'
        ? 297
        : mode === 'readydocs'
        ? activeReadyDocPaper.heightMm
        : isLand
        ? currentPaper.width
        : currentPaper.height;
    let styleEl = document.getElementById('dynamic-print-page-size') as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'dynamic-print-page-size';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `@media print { @page { size: ${wMm}mm ${hMm}mm; margin: 0mm; } }`;
  }, [
    mode,
    currentPaper.width,
    currentPaper.height,
    orientation,
    activeReadyDocPaper.widthMm,
    activeReadyDocPaper.heightMm,
  ]);

  // Keep Lamination cards inside sheet bounds whenever paper size or orientation changes
  useEffect(() => {
    const isLand = orientation === 'landscape';
    const wMm = isLand ? currentPaper.height : currentPaper.width;
    const hMm = isLand ? currentPaper.width : currentPaper.height;
    setLamination((prev) => {
      const maxX = Math.max(0, wMm - prev.cardWidth);
      const maxY = Math.max(0, hMm - prev.cardHeight);
      const outOfBounds =
        prev.frontX > maxX ||
        prev.backX > maxX ||
        prev.frontY > maxY ||
        prev.backY > maxY;
      if (!outOfBounds) return prev;
      const aligned = alignLaminationTopCenter({
        paperWidthMm: wMm,
        cardWidth: prev.cardWidth,
        foldGap: prev.foldGap,
        topY: Math.min(10, maxY),
      });
      return {
        ...prev,
        ...aligned,
      };
    });
  }, [currentPaper.width, currentPaper.height, orientation]);

  // 6. Calculate items for passport grid (syncs placedItems with calculated coordinates)
  const passportItems = useMemo(() => {
    if (photos.length === 0) return [];

    const itemsToUse = placedItems.length > 0
      ? placedItems
      : generateDefaultPlacedItems({
          paper: currentPaper,
          orientation,
          margins,
          photoPreset,
          customPhotoWidth: effectivePhotoWidth,
          customPhotoHeight: effectivePhotoHeight,
          layoutMode,
          manualCount,
          photos,
          activePhotoIndex,
        });

    return calculatePhotoPositions({
      paper: currentPaper,
      orientation,
      margins,
      photoWidth: effectivePhotoWidth,
      photoHeight: effectivePhotoHeight,
      layoutMode,
      manualCount,
      photos,
      placedItems: itemsToUse,
      activePhotoIndex,
    });
  }, [
    currentPaper,
    orientation,
    margins,
    effectivePhotoWidth,
    effectivePhotoHeight,
    layoutMode,
    manualCount,
    photos,
    placedItems,
    activePhotoIndex,
    photoPreset,
  ]);

  // 7. Keyboard Shortcuts (Undo, Redo, Instant Print, Save, Copy Count, Escape, Help)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const hasPrimaryMod = (e.ctrlKey || e.metaKey) && !e.altKey;
      const modalOpen =
        editingPhotoIndex !== null ||
        nidEditingSide !== null ||
        laminationEditingSide !== null ||
        editingDocumentPageIndex !== null;

      // Undo: Ctrl+Z or Cmd+Z (when no image editor modal is blocking)
      if (hasPrimaryMod && key === 'z' && !e.shiftKey && !modalOpen) {
        e.preventDefault();
        handleUndoRef.current();
        return;
      }

      // Redo: Ctrl+Y, Cmd+Y, Ctrl+Shift+Z, or Cmd+Shift+Z
      if (
        hasPrimaryMod &&
        ((key === 'z' && e.shiftKey) || (key === 'y' && !e.shiftKey)) &&
        !modalOpen
      ) {
        e.preventDefault();
        handleRedoRef.current();
        return;
      }

      // Print: Ctrl+P or Cmd+P
      if (hasPrimaryMod && key === 'p') {
        e.preventDefault();
        handleDirectPrintRef.current();
        return;
      }
      // Save: Ctrl+S or Cmd+S
      if (hasPrimaryMod && key === 's') {
        e.preventDefault();
        handleExportBackup();
        return;
      }
      // Add copy: '+'
      if (e.key === '+' || e.key === '=') {
        if (!['input', 'textarea'].includes((e.target as HTMLElement).tagName.toLowerCase())) {
          e.preventDefault();
          setManualCount((c) => c + 1);
        }
      }
      // Remove copy: '-'
      if (e.key === '-') {
        if (!['input', 'textarea'].includes((e.target as HTMLElement).tagName.toLowerCase())) {
          e.preventDefault();
          setManualCount((c) => Math.max(1, c - 1));
        }
      }
      // Close any open modal: 'Escape'
      if (e.key === 'Escape') {
        if (
          isShortcutsOpen ||
          editingPhotoIndex !== null ||
          nidEditingSide !== null ||
          laminationEditingSide !== null ||
          editingDocumentPageIndex !== null
        ) {
          e.preventDefault();
          setIsShortcutsOpen(false);
          setEditingPhotoIndex(null);
          setNidEditingSide(null);
          setLaminationEditingSide(null);
          setEditingDocumentPageIndex(null);
          return;
        }
      }
      // Help: '?'
      if (e.key === '?') {
        if (!['input', 'textarea'].includes((e.target as HTMLElement).tagName.toLowerCase())) {
          e.preventDefault();
          setIsShortcutsOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    photos,
    mode,
    nid,
    isShortcutsOpen,
    editingPhotoIndex,
    nidEditingSide,
    laminationEditingSide,
    editingDocumentPageIndex,
  ]);

  // 8. Photo Upload Handler: Supports Multiple Pictures at once (Clean, Original Quality, No unwanted AI/Bg edits)
  const handleUploadPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const filesArray = Array.from(files);
    const newlyProcessedPhotos: StudioPhotoItem[] = [];

    try {
      for (const file of filesArray) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        newlyProcessedPhotos.push({
          id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          originalSrc: dataUrl,
          processedSrc: dataUrl,
          adjustments: { ...DEFAULT_ADJUSTMENTS, backgroundMode: 'original' },
        });
      }

      setPhotos((prev) => {
        const combined = [...prev, ...newlyProcessedPhotos];

        // If sheet is empty or was unplaced, generate layout with all uploaded photos
        if (prev.length === 0 || placedItems.length === 0) {
          const newPlaced = generateDefaultPlacedItems({
            paper: currentPaper,
            orientation,
            margins,
            photoPreset,
            customPhotoWidth: effectivePhotoWidth,
            customPhotoHeight: effectivePhotoHeight,
            layoutMode,
            manualCount,
            photos: combined,
            activePhotoIndex: 0,
          });
          setPlacedItems(newPlaced);
        } else {
          // Append new uploaded photos as items to the sheet
          let updatedPlaced = [...placedItems];
          for (const newPhoto of newlyProcessedPhotos) {
            updatedPlaced = addPhotoToSheet({
              existingItems: updatedPlaced,
              photoId: newPhoto.id,
              preset: photoPreset,
              paper: currentPaper,
              orientation,
              margins,
              customWidth: effectivePhotoWidth,
              customHeight: effectivePhotoHeight,
            });
          }
          setPlacedItems(updatedPlaced);
        }

        return combined;
      });

      setActivePhotoIndex((prev) => prev);
    } finally {
      setIsUploading(false);
    }
  };

  // Remove photo from studio & sheet
  const handleRemovePhoto = (index: number) => {
    const target = photos[index];
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    if (target) {
      setPlacedItems((prev) => prev.filter((i) => i.photoId !== target.id));
    }
    if (activePhotoIndex >= photos.length - 1) {
      setActivePhotoIndex(Math.max(0, photos.length - 2));
    }
  };

  const handleDuplicatePhoto = (index: number) => {
    const target = photos[index];
    if (!target) return;
    const duplicated: StudioPhotoItem = {
      ...target,
      id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    };
    setPhotos((prev) => [...prev, duplicated]);
  };

  // Layout mode switcher - updates layout and rebuilds placedItems accordingly
  const handleLayoutModeChange = (newMode: LayoutMode) => {
    setLayoutMode(newMode);
    if (photos.length > 0) {
      const newPlaced = generateDefaultPlacedItems({
        paper: currentPaper,
        orientation,
        margins,
        photoPreset,
        customPhotoWidth: effectivePhotoWidth,
        customPhotoHeight: effectivePhotoHeight,
        layoutMode: newMode,
        manualCount,
        photos,
        activePhotoIndex,
      });
      setPlacedItems(newPlaced);
    }
  };

  const handleManualCountChange = (updater: number | ((prev: number) => number)) => {
    const newCount = typeof updater === 'function' ? updater(manualCount) : updater;
    setManualCount(newCount);
    if (layoutMode === 'manual' && photos.length > 0) {
      const newPlaced = generateDefaultPlacedItems({
        paper: currentPaper,
        orientation,
        margins,
        photoPreset,
        customPhotoWidth: effectivePhotoWidth,
        customPhotoHeight: effectivePhotoHeight,
        layoutMode: 'manual',
        manualCount: newCount,
        photos,
        activePhotoIndex,
      });
      setPlacedItems(newPlaced);
    }
  };

  // Placed item movement (Mouse Drag & Drop)
  const handleMoveItem = (id: string, newX: number, newY: number) => {
    setPlacedItems((prev) => {
      const base = prev.length > 0 ? prev : passportItems.map((p) => ({
        id: p.id,
        photoId: p.photoId,
        x: p.x,
        y: p.y,
        width: p.width,
        height: p.height,
        preset: p.preset || photoPreset,
        customPositioned: p.customPositioned,
      }));
      return base.map((item) =>
        item.id === id ? { ...item, x: newX, y: newY, customPositioned: true } : item
      );
    });
  };

  // Placed items multi-movement (Mouse Drag & Drop for all or multiple photos)
  const handleMoveItems = (updates: { id: string; x: number; y: number }[]) => {
    const updateMap = new Map(updates.map((u) => [u.id, u]));
    setPlacedItems((prev) => {
      const base = prev.length > 0 ? prev : passportItems.map((p) => ({
        id: p.id,
        photoId: p.photoId,
        x: p.x,
        y: p.y,
        width: p.width,
        height: p.height,
        preset: p.preset || photoPreset,
        customPositioned: p.customPositioned,
      }));
      return base.map((item) => {
        const u = updateMap.get(item.id);
        return u ? { ...item, x: u.x, y: u.y, customPositioned: true } : item;
      });
    });
  };

  // Placed item nudging (Keyboard Arrow Keys: Left, Right, Up, Down)
  const handleNudgeItem = (id: string, deltaX: number, deltaY: number) => {
    setPlacedItems((prev) => {
      const base = prev.length > 0 ? prev : passportItems.map((p) => ({
        id: p.id,
        photoId: p.photoId,
        x: p.x,
        y: p.y,
        width: p.width,
        height: p.height,
        preset: p.preset || photoPreset,
        customPositioned: p.customPositioned,
      }));
      const isLandscape = orientation === 'landscape';
      const paperWidthMm = isLandscape ? currentPaper.height : currentPaper.width;
      const paperHeightMm = isLandscape ? currentPaper.width : currentPaper.height;

      return base.map((item) => {
        if (item.id !== id) return item;
        const clampedX = Math.max(0, Math.min(paperWidthMm - item.width, Math.round((item.x + deltaX) * 2) / 2));
        const clampedY = Math.max(0, Math.min(paperHeightMm - item.height, Math.round((item.y + deltaY) * 2) / 2));
        return { ...item, x: clampedX, y: clampedY, customPositioned: true };
      });
    });
  };

  // Placed items group nudging (all or multiple photos)
  const handleNudgeItems = (deltaX: number, deltaY: number, itemIds?: string[]) => {
    setPlacedItems((prev) => {
      const base = prev.length > 0 ? prev : passportItems.map((p) => ({
        id: p.id,
        photoId: p.photoId,
        x: p.x,
        y: p.y,
        width: p.width,
        height: p.height,
        preset: p.preset || photoPreset,
        customPositioned: p.customPositioned,
      }));
      const isLandscape = orientation === 'landscape';
      const paperWidthMm = isLandscape ? currentPaper.height : currentPaper.width;
      const paperHeightMm = isLandscape ? currentPaper.width : currentPaper.height;

      const idsSet = itemIds && itemIds.length > 0 ? new Set(itemIds) : null;
      const targetItems = idsSet ? base.filter((i) => idsSet.has(i.id)) : base;
      if (targetItems.length === 0) return base;

      const minX = Math.min(...targetItems.map((i) => i.x));
      const maxRight = Math.max(...targetItems.map((i) => i.x + i.width));
      const minY = Math.min(...targetItems.map((i) => i.y));
      const maxBottom = Math.max(...targetItems.map((i) => i.y + i.height));

      const effectiveDeltaX = Math.max(-minX, Math.min(paperWidthMm - maxRight, deltaX));
      const effectiveDeltaY = Math.max(-minY, Math.min(paperHeightMm - maxBottom, deltaY));

      return base.map((item) => {
        if (idsSet && !idsSet.has(item.id)) return item;
        const newX = Math.round((item.x + effectiveDeltaX) * 2) / 2;
        const newY = Math.round((item.y + effectiveDeltaY) * 2) / 2;
        return { ...item, x: newX, y: newY, customPositioned: true };
      });
    });
  };

  // Toggle item size between Passport (35x45 mm) and Stamp (20x25 mm)
  const handleToggleItemSize = (id: string, targetPreset: 'bd-passport' | 'bd-stamp') => {
    setPlacedItems((prev) => {
      const base = prev.length > 0 ? prev : passportItems.map((p) => ({
        id: p.id,
        photoId: p.photoId,
        x: p.x,
        y: p.y,
        width: p.width,
        height: p.height,
        preset: p.preset || photoPreset,
        customPositioned: p.customPositioned,
      }));
      const newWidth = targetPreset === 'bd-stamp' ? 20 : 35;
      const newHeight = targetPreset === 'bd-stamp' ? 25 : 45;

      return base.map((item) => {
        if (item.id !== id) return item;
        return {
          ...item,
          width: newWidth,
          height: newHeight,
          preset: targetPreset,
          customPositioned: true,
        };
      });
    });
  };

  // Duplicate an item on the sheet
  const handleDuplicateItem = (id: string) => {
    setPlacedItems((prev) => {
      const base = prev.length > 0 ? prev : passportItems.map((p) => ({
        id: p.id,
        photoId: p.photoId,
        x: p.x,
        y: p.y,
        width: p.width,
        height: p.height,
        preset: p.preset || photoPreset,
        customPositioned: p.customPositioned,
      }));
      const target = base.find((i) => i.id === id);
      if (!target) return base;
      const newItem: PlacedSheetItem = {
        ...target,
        id: `placed-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        x: Math.round((target.x + 5) * 10) / 10,
        y: Math.round((target.y + 5) * 10) / 10,
        customPositioned: true,
      };
      setSelectedItemId(newItem.id);
      return [...base, newItem];
    });
  };

  // Delete an item from the sheet
  const handleDeleteItem = (id: string) => {
    setPlacedItems((prev) => prev.filter((i) => i.id !== id));
    if (selectedItemId === id) setSelectedItemId(null);
  };

  // Add 1 Stamp copy (20x25 mm) to the sheet
  const handleAddStampCopy = (photoId?: string) => {
    if (photos.length === 0) return;
    const targetPhotoId = photoId || photos[activePhotoIndex]?.id || photos[0]?.id;
    setPlacedItems((prev) => {
      const base = prev.length > 0 ? prev : passportItems.map((p) => ({
        id: p.id,
        photoId: p.photoId,
        x: p.x,
        y: p.y,
        width: p.width,
        height: p.height,
        preset: p.preset || photoPreset,
        customPositioned: p.customPositioned,
      }));
      const updated = addPhotoToSheet({
        existingItems: base,
        photoId: targetPhotoId,
        preset: 'bd-stamp',
        paper: currentPaper,
        orientation,
        margins,
        customWidth: 20,
        customHeight: 25,
      });
      const last = updated[updated.length - 1];
      if (last) setSelectedItemId(last.id);
      return updated;
    });
  };

  // Add 1 Passport copy (35x45 mm) to the sheet
  const handleAddPassportCopy = (photoId?: string) => {
    if (photos.length === 0) return;
    const targetPhotoId = photoId || photos[activePhotoIndex]?.id || photos[0]?.id;
    setPlacedItems((prev) => {
      const base = prev.length > 0 ? prev : passportItems.map((p) => ({
        id: p.id,
        photoId: p.photoId,
        x: p.x,
        y: p.y,
        width: p.width,
        height: p.height,
        preset: p.preset || photoPreset,
        customPositioned: p.customPositioned,
      }));
      const updated = addPhotoToSheet({
        existingItems: base,
        photoId: targetPhotoId,
        preset: 'bd-passport',
        paper: currentPaper,
        orientation,
        margins,
        customWidth: effectivePhotoWidth,
        customHeight: effectivePhotoHeight,
      });
      const last = updated[updated.length - 1];
      if (last) setSelectedItemId(last.id);
      return updated;
    });
  };

  // Auto-align all placed items into clean grid rows
  const handleAutoAlignGrid = () => {
    setPlacedItems((prev) => {
      const base = prev.length > 0 ? prev : passportItems.map((p) => ({
        id: p.id,
        photoId: p.photoId,
        x: p.x,
        y: p.y,
        width: p.width,
        height: p.height,
        preset: p.preset || photoPreset,
        customPositioned: p.customPositioned,
      }));
      return autoAlignPlacedItems(base, currentPaper, orientation, margins);
    });
  };

  // Reset placed items to template default
  const handleResetPlacedItems = () => {
    if (photos.length > 0) {
      const newItems = generateDefaultPlacedItems({
        paper: currentPaper,
        orientation,
        margins,
        photoPreset,
        customPhotoWidth: effectivePhotoWidth,
        customPhotoHeight: effectivePhotoHeight,
        layoutMode,
        manualCount,
        photos,
        activePhotoIndex,
      });
      setPlacedItems(newItems);
    } else {
      setPlacedItems([]);
    }
    setSelectedItemId(null);
  };

  // Distribute all uploaded photos across the sheet
  const handleDistributeAllPhotos = () => {
    if (photos.length === 0) return;
    const newItems = generateDefaultPlacedItems({
      paper: currentPaper,
      orientation,
      margins,
      photoPreset,
      customPhotoWidth: effectivePhotoWidth,
      customPhotoHeight: effectivePhotoHeight,
      layoutMode,
      manualCount: Math.max(photos.length, manualCount),
      photos,
      activePhotoIndex: 0,
    });
    setPlacedItems(newItems);
  };

  // Switch photo assigned to a slot
  const handleSwitchItemPhoto = (itemId: string, photoId: string) => {
    setPlacedItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, photoId } : i))
    );
  };

  // Cycle photo in a slot to the next uploaded photo
  const handleCycleItemPhoto = (itemId: string) => {
    if (photos.length <= 1) return;
    setPlacedItems((prev) => {
      const base = prev.length > 0 ? prev : passportItems.map((p) => ({
        id: p.id,
        photoId: p.photoId,
        x: p.x,
        y: p.y,
        width: p.width,
        height: p.height,
        preset: p.preset || photoPreset,
        customPositioned: p.customPositioned,
      }));
      return base.map((item) => {
        if (item.id !== itemId) return item;
        const currentPhotoIdx = photos.findIndex((p) => p.id === item.photoId);
        const nextPhotoIdx = (currentPhotoIdx + 1) % photos.length;
        const nextPhoto = photos[nextPhotoIdx];
        return nextPhoto ? { ...item, photoId: nextPhoto.id } : item;
      });
    });
  };

  // 9. Photo Editor Modal Save
  const handleSavePhotoAdjustments = async (updatedAdj: PhotoAdjustments) => {
    if (editingPhotoIndex === null || !photos[editingPhotoIndex]) return;

    const targetPhoto = photos[editingPhotoIndex];
    const processedSrc = await processStudioPhoto(targetPhoto.originalSrc, updatedAdj);

    setPhotos((prev) =>
      prev.map((p, idx) =>
        idx === editingPhotoIndex
          ? {
              ...p,
              adjustments: updatedAdj,
              processedSrc,
            }
          : p
      )
    );
    setEditingPhotoIndex(null);
  };

  // 9B. Document / Fit-to-Paper Handlers
  const handleUploadDocuments = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const filesArray = Array.from(files);
    const newPages: DocumentPageItem[] = [];

    try {
      for (const file of filesArray) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const dims = await getImageDimensions(dataUrl);
        newPages.push({
          id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          name: file.name || `Paper ${newPages.length + 1}`,
          originalSrc: dataUrl,
          processedSrc: dataUrl,
          rotation: 0,
          flipH: false,
          flipV: false,
          autoWhiteDocument: false,
          docThreshold: 45,
          docContrast: 25,
          brightness: 0,
          contrast: 0,
          crop: null,
          naturalWidth: dims.width,
          naturalHeight: dims.height,
        });
      }

      const firstNewIdx = documentSettings.pages.length;
      const nextPages = [...documentSettings.pages, ...newPages];
      setDocumentSettings((prev) => ({
        ...prev,
        pages: [...prev.pages, ...newPages],
        activePageIndex: prev.pages.length === 0 ? 0 : firstNewIdx,
      }));

      // Instant PDF download right after upload when enabled
      if (autoPdfOnUpload && nextPages.length > 0) {
        void handleDownloadPdf(nextPages);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const reprocessDocumentPage = async (page: DocumentPageItem): Promise<DocumentPageItem> => {
    const res = await processDocumentImage(page.originalSrc, {
      rotation: page.rotation,
      flipH: page.flipH,
      flipV: page.flipV,
      crop: page.crop,
      autoWhiteDocument: page.autoWhiteDocument,
      docThreshold: page.docThreshold,
      docContrast: page.docContrast,
      brightness: page.brightness,
      contrast: page.contrast,
    });
    return {
      ...page,
      processedSrc: res.processedSrc,
      naturalWidth: res.width,
      naturalHeight: res.height,
    };
  };

  const handleRotateDocumentPage = async (index: number) => {
    const target = documentSettings.pages[index];
    if (!target) return;
    const updatedTarget: DocumentPageItem = {
      ...target,
      rotation: (target.rotation + 90) % 360,
    };
    const processed = await reprocessDocumentPage(updatedTarget);
    setDocumentSettings((prev) => ({
      ...prev,
      pages: prev.pages.map((p, idx) => (idx === index ? processed : p)),
    }));
  };

  const handleToggleDocumentWhiteFilter = async (index: number) => {
    const target = documentSettings.pages[index];
    if (!target) return;
    const updatedTarget: DocumentPageItem = {
      ...target,
      autoWhiteDocument: !target.autoWhiteDocument,
    };
    const processed = await reprocessDocumentPage(updatedTarget);
    setDocumentSettings((prev) => ({
      ...prev,
      pages: prev.pages.map((p, idx) => (idx === index ? processed : p)),
    }));
  };

  const handleToggleAllDocumentWhiteFilter = async () => {
    if (documentSettings.pages.length === 0) return;
    const allEnabled = documentSettings.pages.every((p) => p.autoWhiteDocument);
    const targetValue = !allEnabled;
    setIsUploading(true);
    try {
      const processedPages = await Promise.all(
        documentSettings.pages.map((p) =>
          reprocessDocumentPage({
            ...p,
            autoWhiteDocument: targetValue,
          })
        )
      );
      setDocumentSettings((prev) => ({
        ...prev,
        pages: processedPages,
      }));
    } finally {
      setIsUploading(false);
    }
  };

  const handleReorderDocumentPage = (index: number, direction: 'up' | 'down') => {
    setDocumentSettings((prev) => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.pages.length) return prev;
      const nextPages = [...prev.pages];
      const [moved] = nextPages.splice(index, 1);
      nextPages.splice(targetIndex, 0, moved);
      return {
        ...prev,
        pages: nextPages,
        activePageIndex: targetIndex,
      };
    });
  };

  const handleClearAllDocumentPages = () => {
    setDocumentSettings((prev) => ({
      ...prev,
      pages: [],
      activePageIndex: 0,
    }));
  };

  const handleRemoveDocumentPage = (index: number) => {
    setDocumentSettings((prev) => {
      const nextPages = prev.pages.filter((_, idx) => idx !== index);
      const nextActive = Math.max(0, Math.min(prev.activePageIndex, nextPages.length - 1));
      return {
        ...prev,
        pages: nextPages,
        activePageIndex: nextActive,
      };
    });
  };

  const handleSaveDocumentEdits = (updated: {
    rotation: number;
    flipH: boolean;
    flipV: boolean;
    autoWhiteDocument: boolean;
    docThreshold: number;
    docContrast: number;
    brightness: number;
    contrast: number;
    crop: CropRect | null;
    processedSrc: string;
    naturalWidth: number;
    naturalHeight: number;
  }) => {
    if (editingDocumentPageIndex === null) return;
    const targetIdx = editingDocumentPageIndex;
    setDocumentSettings((prev) => ({
      ...prev,
      pages: prev.pages.map((p, idx) => (idx === targetIdx ? { ...p, ...updated } : p)),
    }));
    setEditingDocumentPageIndex(null);
  };

  // 9C. Lamination Side-by-Side ID Card Handlers
  const getCurrentPaperMm = () => {
    const isLand = orientation === 'landscape';
    return {
      paperWidthMm: isLand ? currentPaper.height : currentPaper.width,
      paperHeightMm: isLand ? currentPaper.width : currentPaper.height,
    };
  };

  const handleMoveLamination = (coords: {
    frontX: number;
    frontY: number;
    backX: number;
    backY: number;
  }) => {
    setLamination((prev) => ({
      ...prev,
      frontX: coords.frontX,
      frontY: coords.frontY,
      backX: coords.backX,
      backY: coords.backY,
    }));
  };

  const handleAlignLaminationTopCenter = () => {
    const { paperWidthMm, paperHeightMm } = getCurrentPaperMm();
    setLamination((prev) => {
      const topY = Math.min(10, Math.max(2, paperHeightMm - prev.cardHeight));
      const aligned = alignLaminationTopCenter({
        paperWidthMm,
        cardWidth: prev.cardWidth,
        foldGap: prev.foldGap,
        topY,
      });
      return {
        ...prev,
        ...aligned,
      };
    });
  };

  const handleCenterLaminationPage = () => {
    const { paperWidthMm, paperHeightMm } = getCurrentPaperMm();
    setLamination((prev) => {
      const topY = Math.max(4, Math.round(((paperHeightMm - prev.cardHeight) / 2) * 10) / 10);
      const aligned = alignLaminationTopCenter({
        paperWidthMm,
        cardWidth: prev.cardWidth,
        foldGap: prev.foldGap,
        topY,
      });
      return {
        ...prev,
        ...aligned,
      };
    });
  };

  const handleSnapLaminationLevel = () => {
    const { paperWidthMm, paperHeightMm } = getCurrentPaperMm();
    setLamination((prev) => {
      const totalWidth = prev.cardWidth * 2 + prev.foldGap;
      const clampedY = Math.max(0, Math.min(paperHeightMm - prev.cardHeight, prev.frontY));
      let nextFrontX = Math.max(0, Math.min(paperWidthMm - totalWidth, prev.frontX));
      if (totalWidth > paperWidthMm) {
        nextFrontX = 0;
      }
      const nextBackX = Math.min(
        Math.max(0, paperWidthMm - prev.cardWidth),
        Math.round((nextFrontX + prev.cardWidth + prev.foldGap) * 10) / 10
      );
      return {
        ...prev,
        frontX: Math.round(nextFrontX * 10) / 10,
        frontY: Math.round(clampedY * 10) / 10,
        backX: nextBackX,
        backY: Math.round(clampedY * 10) / 10,
      };
    });
  };

  const handleSwapLaminationSides = () => {
    setLamination((prev) => ({
      ...prev,
      frontImage: prev.backImage,
      backImage: prev.frontImage,
      processedFrontImage: prev.processedBackImage,
      processedBackImage: prev.processedFrontImage,
      frontStraighten: prev.backStraighten,
      backStraighten: prev.frontStraighten,
      frontCrop: prev.backCrop,
      backCrop: prev.frontCrop,
      frontBrightness: prev.backBrightness,
      backBrightness: prev.frontBrightness,
    }));
  };

  const handleToggleLaminationWhiteFilter = async (enabled: boolean) => {
    setLamination((prev) => ({ ...prev, autoWhiteDocument: enabled }));
    const nextProcessedFront = lamination.frontImage
      ? await processNIDImage(lamination.frontImage, {
          straightenAngle: lamination.frontStraighten,
          crop: lamination.frontCrop,
          autoWhiteDocument: enabled,
          docThreshold: lamination.docThreshold,
          docContrast: lamination.docContrast,
          brightness: lamination.frontBrightness,
        })
      : '';
    const nextProcessedBack = lamination.backImage
      ? await processNIDImage(lamination.backImage, {
          straightenAngle: lamination.backStraighten,
          crop: lamination.backCrop,
          autoWhiteDocument: enabled,
          docThreshold: lamination.docThreshold,
          docContrast: lamination.docContrast,
          brightness: lamination.backBrightness,
        })
      : '';

    setLamination((prev) => ({
      ...prev,
      autoWhiteDocument: enabled,
      processedFrontImage: prev.frontImage ? nextProcessedFront : '',
      processedBackImage: prev.backImage ? nextProcessedBack : '',
    }));
  };

  const handleUploadLaminationSide = (side: 'front' | 'back', file: File) => {
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const src = ev.target?.result as string;
      const prepared = await prepareLaminationCardImage(src, {
        targetWidthMm: lamination.cardWidth,
        targetHeightMm: lamination.cardHeight,
        autoWhiteDocument: lamination.autoWhiteDocument,
        docThreshold: lamination.docThreshold,
        docContrast: lamination.docContrast,
        brightness: 0,
      });
      setLamination((prev) =>
        side === 'front'
          ? {
              ...prev,
              frontImage: src,
              processedFrontImage: prepared.processedSrc,
              frontStraighten: prepared.straightenAngle,
              frontCrop: prepared.crop,
              frontBrightness: 0,
            }
          : {
              ...prev,
              backImage: src,
              processedBackImage: prepared.processedSrc,
              backStraighten: prepared.straightenAngle,
              backCrop: prepared.crop,
              backBrightness: 0,
            }
      );
    };
    reader.readAsDataURL(file);
  };

  const handleRotateLaminationSide = async (side: 'front' | 'back') => {
    const src = side === 'front' ? lamination.frontImage : lamination.backImage;
    if (!src) return;
    const currentAngle = side === 'front' ? lamination.frontStraighten : lamination.backStraighten;
    const nextAngle = (currentAngle + 90) % 360;
    const crop = side === 'front' ? lamination.frontCrop : lamination.backCrop;
    const brightness = side === 'front' ? lamination.frontBrightness : lamination.backBrightness;
    const processed = await processNIDImage(src, {
      straightenAngle: nextAngle,
      crop,
      autoWhiteDocument: lamination.autoWhiteDocument,
      docThreshold: lamination.docThreshold,
      docContrast: lamination.docContrast,
      brightness,
    });
    setLamination((prev) =>
      side === 'front'
        ? { ...prev, frontStraighten: nextAngle, processedFrontImage: processed }
        : { ...prev, backStraighten: nextAngle, processedBackImage: processed }
    );
  };

  const handleAutoFitLaminationCards = async () => {
    const [frontPrepared, backPrepared] = await Promise.all([
      lamination.frontImage
        ? prepareLaminationCardImage(lamination.frontImage, {
            targetWidthMm: lamination.cardWidth,
            targetHeightMm: lamination.cardHeight,
            autoWhiteDocument: lamination.autoWhiteDocument,
            docThreshold: lamination.docThreshold,
            docContrast: lamination.docContrast,
            brightness: lamination.frontBrightness,
          })
        : Promise.resolve(null),
      lamination.backImage
        ? prepareLaminationCardImage(lamination.backImage, {
            targetWidthMm: lamination.cardWidth,
            targetHeightMm: lamination.cardHeight,
            autoWhiteDocument: lamination.autoWhiteDocument,
            docThreshold: lamination.docThreshold,
            docContrast: lamination.docContrast,
            brightness: lamination.backBrightness,
          })
        : Promise.resolve(null),
    ]);

    setLamination((prev) => ({
      ...prev,
      ...(frontPrepared
        ? {
            processedFrontImage: frontPrepared.processedSrc,
            frontCrop: frontPrepared.crop,
            frontStraighten: frontPrepared.straightenAngle,
          }
        : {}),
      ...(backPrepared
        ? {
            processedBackImage: backPrepared.processedSrc,
            backCrop: backPrepared.crop,
            backStraighten: backPrepared.straightenAngle,
          }
        : {}),
    }));
  };

  // 10. Print & Export Handlers
  const handleDirectPrint = () => {
    setSelectedItemId(null);
    const isLand = orientation === 'landscape';
    const widthMm =
      mode === 'cv'
        ? 210
        : mode === 'readydocs'
        ? activeReadyDocPaper.widthMm
        : isLand
        ? currentPaper.height
        : currentPaper.width;
    const heightMm =
      mode === 'cv'
        ? 297
        : mode === 'readydocs'
        ? activeReadyDocPaper.heightMm
        : isLand
        ? currentPaper.width
        : currentPaper.height;
    const title =
      mode === 'cv'
        ? `NextStudio CV - ${cvData.fullName || 'Resume'}`
        : mode === 'readydocs'
        ? `NextStudio - ${activeReadyDocTemplate.titleEn}`
        : `NextStudio - ${mode.toUpperCase()}`;

    window.setTimeout(() => {
      triggerDirectPrint({ widthMm, heightMm, title });
    }, 20);
  };

  const handleDirectPrintRef = useRef(handleDirectPrint);
  handleDirectPrintRef.current = handleDirectPrint;

  const handleDownloadPdf = async (overrideDocPages?: DocumentPageItem[]) => {
    const effectiveMode: StudioMode = overrideDocPages ? 'document' : mode;
    if (effectiveMode === 'cv') {
      const exportNode = document.getElementById('cv-clean-export-node');
      if (!exportNode) return;
      const safeName = (cvData.fullName || 'Resume')
        .trim()
        .replace(/[^a-zA-Z0-9\u0980-\u09FF_-]+/g, '_')
        .slice(0, 40);
      setIsExporting(true);
      try {
        await exportCvElementToPdf(exportNode, `NextStudio_CV_${safeName || 'Resume'}.pdf`);
      } finally {
        setIsExporting(false);
      }
      return;
    }

    if (effectiveMode === 'readydocs') {
      const exportNode = document.getElementById('readydoc-clean-export-node');
      if (!exportNode) return;
      const safeName = activeReadyDocTemplate.titleEn
        .replace(/[^a-zA-Z0-9_-]+/g, '_')
        .slice(0, 40);
      setIsExporting(true);
      try {
        await exportReadyDocToPdf(
          exportNode,
          activeReadyDocPaper,
          `NextStudio_${safeName || 'Document'}.pdf`
        );
      } finally {
        setIsExporting(false);
      }
      return;
    }

    const effectiveDocSettings: DocumentPrintSettings = overrideDocPages
      ? { ...documentSettings, pages: overrideDocPages, activePageIndex: 0 }
      : documentSettings;
    const paperTag = paperSize === 'custom' ? `${customPaperWidth}x${customPaperHeight}mm` : paperSize.toUpperCase();
    const pageSuffix =
      effectiveMode === 'document' && effectiveDocSettings.pages.length > 1
        ? `_${effectiveDocSettings.pages.length}Pages`
        : '';
    const filename =
      effectiveMode === 'passport'
        ? `NextStudio_Passport_${paperTag}_${printQuality}DPI.pdf`
        : effectiveMode === 'nid'
        ? `NextStudio_NID_${paperTag}.pdf`
        : effectiveMode === 'lamination'
        ? `NextStudio_LaminateID_${paperTag}.pdf`
        : `NextStudio_PaperPrint_${paperTag}${pageSuffix}.pdf`;

    setIsExporting(true);
    try {
      await exportToPdf(
        {
          mode: effectiveMode,
          paper: currentPaper,
          orientation,
          margins: effectiveMode === 'passport' ? margins : nidMargins,
          cuttingGuide,
          bleedArea,
          colorProfile,
          dpi: printQuality,
          photos,
          itemPositions: passportItems,
          nid,
          lamination,
          documentSettings: effectiveDocSettings,
        },
        filename
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadImage = async (format: 'png' | 'jpeg') => {
    const ext = format === 'png' ? 'png' : 'jpg';
    if (mode === 'cv') {
      const exportNode = document.getElementById('cv-clean-export-node');
      if (!exportNode) return;
      const safeName = (cvData.fullName || 'Resume')
        .trim()
        .replace(/[^a-zA-Z0-9\u0980-\u09FF_-]+/g, '_')
        .slice(0, 40);
      setIsExporting(true);
      try {
        await exportCvElementToImage(
          exportNode,
          format,
          `NextStudio_CV_${safeName || 'Resume'}.${ext}`
        );
      } finally {
        setIsExporting(false);
      }
      return;
    }

    if (mode === 'readydocs') {
      const exportNode = document.getElementById('readydoc-clean-export-node');
      if (!exportNode) return;
      const safeName = activeReadyDocTemplate.titleEn
        .replace(/[^a-zA-Z0-9_-]+/g, '_')
        .slice(0, 40);
      setIsExporting(true);
      try {
        await exportReadyDocToImage(
          exportNode,
          format,
          `NextStudio_${safeName || 'Document'}.${ext}`
        );
      } finally {
        setIsExporting(false);
      }
      return;
    }

    const filename =
      mode === 'passport'
        ? `NextStudio_Passport_${paperSize}.${ext}`
        : mode === 'nid'
        ? `NextStudio_NID_${paperSize}.${ext}`
        : mode === 'lamination'
        ? `NextStudio_LaminateID_${paperSize}.${ext}`
        : `NextStudio_PaperPrint_${paperSize}.${ext}`;

    setIsExporting(true);
    try {
      await exportToImage(
        {
          mode,
          paper: currentPaper,
          orientation,
          margins: mode === 'passport' ? margins : nidMargins,
          cuttingGuide,
          bleedArea,
          colorProfile,
          dpi: printQuality,
          photos,
          itemPositions: passportItems,
          nid,
          lamination,
          documentSettings,
        },
        format,
        filename
      );
    } finally {
      setIsExporting(false);
    }
  };

  // 11. Project Backup & Restore
  const handleExportBackup = () => {
    const currentState: StudioState = {
      mode,
      lang,
      theme,
      photoPreset,
      customPhotoWidth,
      customPhotoHeight,
      paperSize,
      customPaperWidth,
      customPaperHeight,
      orientation,
      layoutMode,
      manualCount,
      margins,
      cuttingGuide,
      bleedArea,
      colorProfile,
      printQuality,
      photos,
      activePhotoIndex,
      placedItems,
      selectedItemId,
      nid,
      nidMargins,
      documentSettings,
      lamination,
      cvData,
      readyDocState,
    };
    exportProjectAsJson(currentState);
  };

  const handleImportBackup = async (file: File) => {
    try {
      const imported = await importProjectFromJson(file);
      if (imported.mode) setMode(imported.mode);
      if (imported.photos) setPhotos(imported.photos);
      if (imported.nid) setNid(imported.nid);
      if (imported.margins) setMargins(imported.margins);
      if (imported.paperSize) setPaperSize(imported.paperSize);
      if (imported.customPaperWidth) setCustomPaperWidth(imported.customPaperWidth);
      if (imported.customPaperHeight) setCustomPaperHeight(imported.customPaperHeight);
      if (imported.photoPreset) setPhotoPreset(imported.photoPreset);
      if (imported.layoutMode) setLayoutMode(imported.layoutMode);
      if (imported.manualCount) setManualCount(imported.manualCount);
      if (imported.documentSettings) {
        setDocumentSettings({
          ...DEFAULT_DOCUMENT_SETTINGS,
          ...imported.documentSettings,
        });
      }
      if (imported.lamination) {
        setLamination({
          ...DEFAULT_LAMINATION_SETTINGS,
          ...imported.lamination,
        });
      }
      if (imported.cvData) {
        setCvData({
          ...createEmptyCvData(
            imported.cvData.templateId || 'classic-plain',
            imported.cvData.cvLang || 'en'
          ),
          ...imported.cvData,
        });
      }
      if (imported.readyDocState) {
        setReadyDocState({
          ...createDefaultReadyDocState(),
          ...imported.readyDocState,
        });
      }
    } catch (err) {
      console.error('Failed to restore project from file:', err);
    }
  };

  const handleReset = () => {
    setMargins({ ...DEFAULT_MARGINS });
    setLayoutMode('top-5');
    setPhotoPreset('bd-passport');
    setCuttingGuide('none');
    setPaperSize('a4');
    setCustomPaperWidth(210);
    setCustomPaperHeight(297);
    setOrientation('portrait');
    setPrintQuality(300);
    setColorProfile('srgb');
    setBleedArea(0);
    setPhotos([]);
    setActivePhotoIndex(0);
    setPlacedItems([]);
    setSelectedItemId(null);
    setDocumentSettings(DEFAULT_DOCUMENT_SETTINGS);
    setLamination(DEFAULT_LAMINATION_SETTINGS);
    setCvData(createEmptyCvData('classic-plain', 'en'));
    setReadyDocState(createDefaultReadyDocState());
    setNid((prev) => ({
      ...prev,
      frontImage: '',
      backImage: '',
      processedFrontImage: '',
      processedBackImage: '',
      cardWidth: NID_STANDARD_WIDTH,
      cardHeight: NID_STANDARD_HEIGHT,
      verticalSpacing: 15,
      centerOnPage: true,
      autoWhiteDocument: true,
      docThreshold: 45,
      docContrast: 25,
      frontStraighten: 0,
      backStraighten: 0,
      frontCrop: null,
      backCrop: null,
      frontBrightness: 0,
      backBrightness: 0,
    }));
  };

  const handleFitZoom = () => {
    // Computes ideal zoom for typical viewport
    const w = window.innerWidth;
    if (w < 400) setZoom(0.38);
    else if (w < 480) setZoom(0.44);
    else if (w < 640) setZoom(0.52);
    else if (w < 1024) setZoom(0.68);
    else setZoom(0.85);
  };

  const [mobileTab, setMobileTab] = useState<'preview' | 'controls'>('preview');

  return (
    <div className="min-h-screen studio-ambient-bg text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Complete On-Screen Interface: 100% hidden when printing so zero UI/shadows bleed onto paper */}
      <div id="screen-ui-root" className="no-print print:hidden flex-1 flex flex-col min-h-screen">
        {/* 1. Global Navigation Header */}
        <Header
          mode={mode}
          setMode={setMode}
          lang={lang}
          setLang={handleSetLang}
          theme={theme}
          setTheme={setTheme}
          onOpenShortcuts={() => setIsShortcutsOpen(true)}
          isSaved={isSaved}
          isProcessing={isExporting}
          onPrint={handleDirectPrint}
          onDownloadPdf={() => void handleDownloadPdf()}
          onDownloadPng={() => handleDownloadImage('png')}
          onDownloadJpg={() => handleDownloadImage('jpeg')}
          onReset={handleReset}
          onExportJson={handleExportBackup}
          onImportJson={handleImportBackup}
          zoom={zoom}
          setZoom={setZoom}
          onFitZoom={handleFitZoom}
          canUndo={historyMeta.canUndo}
          canRedo={historyMeta.canRedo}
          onUndo={handleUndo}
          onRedo={handleRedo}
        />

        {/* Mobile Tab Switcher Bar (Visible only on < lg screens) */}
        <div className="lg:hidden no-print sticky top-14 z-30 glass-bar px-3 py-2 flex items-center justify-center">
          <div className="grid grid-cols-2 gap-1 glass-track p-1 rounded-xl w-full max-w-md">
            <button
              type="button"
              onClick={() => setMobileTab('preview')}
              className={`py-1.5 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                mobileTab === 'preview'
                  ? 'glass-btn-primary text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>
                {mode === 'cv'
                  ? lang === 'bn'
                    ? 'সিভি প্রিভিউ'
                    : 'CV Preview'
                  : mode === 'readydocs'
                  ? lang === 'bn'
                    ? 'কাগজ প্রিভিউ'
                    : 'Doc Preview'
                  : lang === 'bn'
                  ? 'পেপার প্রিভিউ'
                  : 'Paper Preview'}
              </span>
              {mode === 'passport' && placedItems.length > 0 && (
                <span className="text-[11px] font-mono tabular-nums opacity-80">
                  ({placedItems.length})
                </span>
              )}
              {mode === 'document' && documentSettings.pages.length > 0 && (
                <span className="text-[11px] font-mono tabular-nums opacity-80">
                  ({documentSettings.pages.length})
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('controls')}
              className={`py-1.5 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                mobileTab === 'controls'
                  ? 'glass-btn-primary text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>{lang === 'bn' ? 'কন্ট্রোল ও সেটিংস' : 'Controls & Settings'}</span>
            </button>
          </div>
        </div>

        {/* 2. Main Desktop Workstation Shell */}
        <main className="no-print flex-1 flex flex-col lg:flex-row overflow-hidden w-full pb-16 lg:pb-0">
          {/* Left Floating Liquid Glass Studio Inspector Panel */}
          <aside
            className={`w-full lg:w-[392px] xl:w-[424px] shrink-0 glass-panel lg:my-3 lg:ml-3 lg:rounded-2xl p-4 sm:p-5 overflow-y-auto lg:h-[calc(100vh-5rem)] transition-colors ${
              mobileTab === 'preview' ? 'hidden lg:block' : 'block'
            }`}
          >
          {mode === 'passport' ? (
            <PassportControls
              lang={lang}
              photos={photos}
              activePhotoIndex={activePhotoIndex}
              setActivePhotoIndex={setActivePhotoIndex}
              onUploadPhotos={handleUploadPhotos}
              onRemovePhoto={handleRemovePhoto}
              onDuplicatePhoto={handleDuplicatePhoto}
              onOpenEditor={(idx) => setEditingPhotoIndex(idx)}
              isUploading={isUploading}
              preset={photoPreset}
              setPreset={setPhotoPreset}
              customWidth={customPhotoWidth}
              setCustomWidth={setCustomPhotoWidth}
              customHeight={customPhotoHeight}
              setCustomHeight={setCustomPhotoHeight}
              paperSize={paperSize}
              setPaperSize={setPaperSize}
              customPaperWidth={customPaperWidth}
              setCustomPaperWidth={setCustomPaperWidth}
              customPaperHeight={customPaperHeight}
              setCustomPaperHeight={setCustomPaperHeight}
              orientation={orientation}
              setOrientation={setOrientation}
              layoutMode={layoutMode}
              setLayoutMode={handleLayoutModeChange}
              manualCount={manualCount}
              setManualCount={handleManualCountChange}
              margins={margins}
              setMargins={setMargins}
              cuttingGuide={cuttingGuide}
              setCuttingGuide={setCuttingGuide}
              bleedArea={bleedArea}
              setBleedArea={setBleedArea}
              colorProfile={colorProfile}
              setColorProfile={setColorProfile}
              dpi={printQuality}
              setDpi={setPrintQuality}
              placedItems={placedItems}
              selectedItemId={selectedItemId}
              onSelectItem={setSelectedItemId}
              onAddStampCopy={handleAddStampCopy}
              onAddPassportCopy={handleAddPassportCopy}
              onAutoAlignGrid={handleAutoAlignGrid}
              onResetPlacedItems={handleResetPlacedItems}
              onDistributeAllPhotos={handleDistributeAllPhotos}
              onSwitchItemPhoto={handleSwitchItemPhoto}
              onCycleItemPhoto={handleCycleItemPhoto}
              onToggleItemSize={handleToggleItemSize}
              onNudgeItem={handleNudgeItem}
              onDuplicateItem={handleDuplicateItem}
              onDeleteItem={handleDeleteItem}
            />
          ) : mode === 'nid' ? (
            <NidControls
              lang={lang}
              nid={nid}
              setNid={setNid}
              margins={nidMargins}
              setMargins={setNidMargins}
              paperSize={paperSize}
              setPaperSize={setPaperSize}
              customPaperWidth={customPaperWidth}
              setCustomPaperWidth={setCustomPaperWidth}
              customPaperHeight={customPaperHeight}
              setCustomPaperHeight={setCustomPaperHeight}
              orientation={orientation}
              setOrientation={setOrientation}
              cuttingGuide={cuttingGuide}
              setCuttingGuide={setCuttingGuide}
              bleedArea={bleedArea}
              setBleedArea={setBleedArea}
              colorProfile={colorProfile}
              setColorProfile={setColorProfile}
              dpi={printQuality}
              setDpi={setPrintQuality}
            />
          ) : mode === 'lamination' ? (
            <LaminationControls
              lang={lang}
              lamination={lamination}
              setLamination={setLamination}
              onUploadSide={handleUploadLaminationSide}
              onEditSide={(side) => setLaminationEditingSide(side)}
              onRotateSide={handleRotateLaminationSide}
              onAutoFitBoth={handleAutoFitLaminationCards}
              onSwapSides={handleSwapLaminationSides}
              onToggleWhiteFilter={handleToggleLaminationWhiteFilter}
              onAlignTopCenter={handleAlignLaminationTopCenter}
              onCenterPage={handleCenterLaminationPage}
              onSnapLevel={handleSnapLaminationLevel}
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
              dpi={printQuality}
              setDpi={setPrintQuality}
            />
          ) : mode === 'cv' ? (
            <CvControls
              lang={lang}
              cvData={cvData}
              setCvData={setCvData}
              showGallery={cvShowGallery}
              setShowGallery={setCvShowGallery}
              onPrintCv={handleDirectPrint}
              onDownloadCvPdf={() => void handleDownloadPdf()}
              onResetCv={() => setCvData(createEmptyCvData(cvData.templateId, cvData.cvLang))}
              isExporting={isExporting}
            />
          ) : mode === 'readydocs' ? (
            <ReadyDocControls
              lang={lang}
              template={activeReadyDocTemplate}
              readyDocState={readyDocState}
              setReadyDocState={setReadyDocState}
              showGallery={readyDocShowGallery}
              setShowGallery={setReadyDocShowGallery}
              onPrintDoc={handleDirectPrint}
              onDownloadDocPdf={() => void handleDownloadPdf()}
              isExporting={isExporting}
            />
          ) : (
            <DocumentControls
              lang={lang}
              documentSettings={documentSettings}
              setDocumentSettings={setDocumentSettings}
              onUploadDocuments={handleUploadDocuments}
              onRotatePage={handleRotateDocumentPage}
              onToggleWhiteFilter={handleToggleDocumentWhiteFilter}
              onToggleAllWhiteFilter={handleToggleAllDocumentWhiteFilter}
              onOpenEditor={(idx) => setEditingDocumentPageIndex(idx)}
              onRemovePage={handleRemoveDocumentPage}
              onReorderPage={handleReorderDocumentPage}
              onClearAllPages={handleClearAllDocumentPages}
              onPrintAll={handleDirectPrint}
              onDownloadAllPdf={() => void handleDownloadPdf()}
              autoPdfOnUpload={autoPdfOnUpload}
              setAutoPdfOnUpload={handleSetAutoPdfOnUpload}
              isUploading={isUploading}
              isExporting={isExporting}
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
              dpi={printQuality}
              setDpi={setPrintQuality}
            />
          )}
        </aside>

        {/* Right Area: Architectural Studio Drafting Stage */}
        <section
          className={`flex-1 studio-desk-grid flex flex-col overflow-auto lg:h-[calc(100vh-3.5rem)] ${
            mobileTab === 'controls' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {mode === 'cv' ? (
            <CvWorkspace
              lang={lang}
              cvData={cvData}
              setCvData={setCvData}
              showGallery={cvShowGallery}
              setShowGallery={setCvShowGallery}
              studioPhotos={photos}
              zoom={zoom}
              setZoom={setZoom}
              onFitZoom={handleFitZoom}
              onPrintCv={handleDirectPrint}
              onDownloadCvPdf={() => void handleDownloadPdf()}
              isExporting={isExporting}
            />
          ) : mode === 'readydocs' ? (
            <ReadyDocWorkspace
              lang={lang}
              template={activeReadyDocTemplate}
              readyDocState={readyDocState}
              setReadyDocState={setReadyDocState}
              showGallery={readyDocShowGallery}
              setShowGallery={setReadyDocShowGallery}
              zoom={zoom}
              setZoom={setZoom}
              onFitZoom={handleFitZoom}
              onPrintDoc={handleDirectPrint}
              onDownloadDocPdf={() => void handleDownloadPdf()}
              isExporting={isExporting}
            />
          ) : (
            <PaperPreview
            mode={mode}
            lang={lang}
            paper={currentPaper}
            orientation={orientation}
            margins={mode === 'passport' ? margins : nidMargins}
            cuttingGuide={cuttingGuide}
            bleedArea={bleedArea}
            colorProfile={colorProfile}
            zoom={zoom}
            setZoom={setZoom}
            onFitZoom={handleFitZoom}
            passportItems={passportItems}
            activePhotoIndex={activePhotoIndex}
            onSelectPhoto={(idx) => setActivePhotoIndex(idx)}
            onEditPhoto={(idx) => setEditingPhotoIndex(idx)}
            nid={nid}
            onEditNidSide={(side) => setNidEditingSide(side)}
            onUploadPassportTrigger={() => passportUploadInputRef.current?.click()}
            onUploadNidFrontTrigger={() => nidFrontInputRef.current?.click()}
            onUploadNidBackTrigger={() => nidBackInputRef.current?.click()}
            selectedItemId={selectedItemId}
            onSelectItem={setSelectedItemId}
            onMoveItem={handleMoveItem}
            onMoveItems={handleMoveItems}
            onNudgeItem={handleNudgeItem}
            onNudgeItems={handleNudgeItems}
            onToggleItemSize={handleToggleItemSize}
            onDuplicateItem={handleDuplicateItem}
            onDeleteItem={handleDeleteItem}
            onAddStampCopy={() => handleAddStampCopy()}
            onAddPassportCopy={() => handleAddPassportCopy()}
            onAutoAlignGrid={handleAutoAlignGrid}
            onCycleItemPhoto={handleCycleItemPhoto}
            documentSettings={documentSettings}
            onUploadDocumentTrigger={() => documentUploadInputRef.current?.click()}
            onRotateDocumentPage={handleRotateDocumentPage}
            onEditDocumentPage={(idx) => setEditingDocumentPageIndex(idx)}
            onSelectDocumentPage={(idx) =>
              setDocumentSettings((prev) => ({ ...prev, activePageIndex: idx }))
            }
            onChangeDocumentFitMode={(fitMode: DocumentFitMode) =>
              setDocumentSettings((prev) => ({ ...prev, fitMode }))
            }
            onToggleDocumentWhiteFilter={handleToggleDocumentWhiteFilter}
            onRemoveDocumentPage={handleRemoveDocumentPage}
            onPrintAll={handleDirectPrint}
            onDownloadAllPdf={() => void handleDownloadPdf()}
            isExporting={isExporting}
            lamination={lamination}
            onMoveLamination={handleMoveLamination}
            onEditLaminationSide={(side) => setLaminationEditingSide(side)}
            onUploadLaminationFrontTrigger={() => lamFrontInputRef.current?.click()}
            onUploadLaminationBackTrigger={() => lamBackInputRef.current?.click()}
            onAlignLaminationTopCenter={handleAlignLaminationTopCenter}
            onCenterLaminationPage={handleCenterLaminationPage}
            onSnapLaminationLevel={handleSnapLaminationLevel}
            onSwapLaminationSides={handleSwapLaminationSides}
            onToggleLaminationFoldLine={() =>
              setLamination((prev) => ({ ...prev, showFoldLine: !prev.showFoldLine }))
            }
            onRotateLaminationSide={handleRotateLaminationSide}
          />
          )}
        </section>
      </main>

      {/* Hidden File Inputs for Canvas Direct Click-to-Upload */}
      <input
        ref={passportUploadInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={(e) => handleUploadPhotos(e.target.files)}
        className="hidden"
      />
      <input
        ref={nidFrontInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = async (ev) => {
              const src = ev.target?.result as string;
              const processed = nid.autoWhiteDocument
                ? await processNIDImage(src, {
                    straightenAngle: 0,
                    crop: null,
                    autoWhiteDocument: true,
                    docThreshold: nid.docThreshold,
                    docContrast: nid.docContrast,
                    brightness: 0,
                  })
                : src;
              setNid((prev) => ({
                ...prev,
                frontImage: src,
                processedFrontImage: processed,
                frontStraighten: 0,
                frontCrop: null,
                frontBrightness: 0,
              }));
            };
            reader.readAsDataURL(file);
            e.target.value = '';
          }
        }}
        className="hidden"
      />
      <input
        ref={nidBackInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = async (ev) => {
              const src = ev.target?.result as string;
              const processed = nid.autoWhiteDocument
                ? await processNIDImage(src, {
                    straightenAngle: 0,
                    crop: null,
                    autoWhiteDocument: true,
                    docThreshold: nid.docThreshold,
                    docContrast: nid.docContrast,
                    brightness: 0,
                  })
                : src;
              setNid((prev) => ({
                ...prev,
                backImage: src,
                processedBackImage: processed,
                backStraighten: 0,
                backCrop: null,
                backBrightness: 0,
              }));
            };
            reader.readAsDataURL(file);
            e.target.value = '';
          }
        }}
        className="hidden"
      />
      <input
        ref={lamFrontInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          if (e.target.files?.[0]) handleUploadLaminationSide('front', e.target.files[0]);
          e.target.value = '';
        }}
        className="hidden"
      />
      <input
        ref={lamBackInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          if (e.target.files?.[0]) handleUploadLaminationSide('back', e.target.files[0]);
          e.target.value = '';
        }}
        className="hidden"
      />
      <input
        ref={documentUploadInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={(e) => {
          handleUploadDocuments(e.target.files);
          e.target.value = '';
        }}
        className="hidden"
      />

      {/* Mobile Sticky Bottom Action Bar (Mobile Only) */}
      <div className="lg:hidden no-print fixed bottom-0 inset-x-0 z-40 glass-bar border-t border-b-0 p-2 px-3 flex items-center justify-between gap-2 shadow-2xl">
        {mode === 'passport' && photos.length > 0 && (
          <button
            onClick={() => setEditingPhotoIndex(activePhotoIndex)}
            className="flex-1 py-2 px-2 rounded-xl glass-tile text-slate-800 dark:text-slate-100 font-semibold text-xs flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="truncate">{lang === 'bn' ? 'ছবি এডিট' : 'Edit Photo'}</span>
          </button>
        )}
        {mode === 'lamination' && (lamination.frontImage || lamination.backImage) && (
          <button
            onClick={() =>
              setLaminationEditingSide(lamination.frontImage ? 'front' : 'back')
            }
            className="flex-1 py-2 px-2 rounded-xl glass-tile text-slate-800 dark:text-slate-100 font-semibold text-xs flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="truncate">{lang === 'bn' ? 'কার্ড এডিট' : 'Edit Card'}</span>
          </button>
        )}
        {mode === 'document' && documentSettings.pages.length > 0 && (
          <button
            onClick={() => setEditingDocumentPageIndex(documentSettings.activePageIndex)}
            className="flex-1 py-2 px-2 rounded-xl glass-tile text-slate-800 dark:text-slate-100 font-semibold text-xs flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="truncate">{lang === 'bn' ? 'এডিট ও ক্রপ' : 'Edit Paper'}</span>
          </button>
        )}
        {mode === 'cv' && (
          <button
            onClick={() => {
              setMobileTab('preview');
              setCvShowGallery((v) => !v);
            }}
            className="flex-1 py-2 px-2 rounded-xl glass-tile text-slate-800 dark:text-slate-100 font-semibold text-xs flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="truncate">
              {cvShowGallery
                ? lang === 'bn'
                  ? 'এডিটর'
                  : 'Editor'
                : lang === 'bn'
                ? '১৭ ডিজাইন'
                : '17 Designs'}
            </span>
          </button>
        )}
        {mode === 'readydocs' && (
          <button
            onClick={() => {
              setMobileTab('preview');
              setReadyDocShowGallery((v) => !v);
            }}
            className="flex-1 py-2 px-2 rounded-xl glass-tile text-slate-800 dark:text-slate-100 font-semibold text-xs flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="truncate">
              {readyDocShowGallery
                ? lang === 'bn'
                  ? 'এডিটর'
                  : 'Editor'
                : lang === 'bn'
                ? '৬৫টি কাগজ'
                : '65 Docs'}
            </span>
          </button>
        )}
        <button
          onClick={() => void handleDownloadPdf()}
          disabled={isExporting}
          className="flex-1 py-2 px-2 rounded-xl glass-tile text-slate-900 dark:text-white font-semibold text-xs flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer disabled:opacity-60"
        >
          <FileDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span className="truncate">{lang === 'bn' ? 'PDF সেভ' : 'Save PDF'}</span>
        </button>
        <button
          onClick={handleDirectPrint}
          className="flex-1 py-2 px-2 rounded-xl glass-btn-primary text-white font-semibold text-xs flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5" />
          <span className="truncate">{lang === 'bn' ? 'প্রিন্ট' : 'Print'}</span>
        </button>
      </div>

      {/* 5. Photo Enhancement & Background Removal Modal */}
      {editingPhotoIndex !== null && photos[editingPhotoIndex] && (
        <PhotoEditorModal
          photo={photos[editingPhotoIndex]}
          isOpen={true}
          onClose={() => setEditingPhotoIndex(null)}
          onSave={handleSavePhotoAdjustments}
          lang={lang}
        />
      )}

      {/* 6. NID Card Modal Editor */}
      {nidEditingSide && (
        <NidEditorModal
          isOpen={true}
          side={nidEditingSide}
          imageSrc={nidEditingSide === 'front' ? nid.frontImage : nid.backImage}
          straightenAngle={nidEditingSide === 'front' ? nid.frontStraighten : nid.backStraighten}
          autoWhiteDocument={nid.autoWhiteDocument}
          docThreshold={nid.docThreshold}
          docContrast={nid.docContrast}
          crop={nidEditingSide === 'front' ? nid.frontCrop : nid.backCrop}
          brightness={nidEditingSide === 'front' ? nid.frontBrightness : nid.backBrightness}
          onClose={() => setNidEditingSide(null)}
          onSave={({ processedSrc, straightenAngle, crop, autoWhiteDocument, docThreshold, docContrast, brightness }) => {
            setNid((prev) => ({
              ...prev,
              ...(nidEditingSide === 'front'
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
            setNidEditingSide(null);
          }}
          lang={lang}
        />
      )}

      {/* 6A. Lamination ID Card Side Editor Modal (Reuses NidEditorModal) */}
      {laminationEditingSide && (
        <NidEditorModal
          isOpen={true}
          side={laminationEditingSide}
          imageSrc={laminationEditingSide === 'front' ? lamination.frontImage : lamination.backImage}
          straightenAngle={
            laminationEditingSide === 'front'
              ? lamination.frontStraighten
              : lamination.backStraighten
          }
          autoWhiteDocument={lamination.autoWhiteDocument}
          docThreshold={lamination.docThreshold}
          docContrast={lamination.docContrast}
          crop={laminationEditingSide === 'front' ? lamination.frontCrop : lamination.backCrop}
          brightness={
            laminationEditingSide === 'front'
              ? lamination.frontBrightness
              : lamination.backBrightness
          }
          onClose={() => setLaminationEditingSide(null)}
          onSave={({
            processedSrc,
            straightenAngle,
            crop,
            autoWhiteDocument,
            docThreshold,
            docContrast,
            brightness,
          }) => {
            setLamination((prev) => ({
              ...prev,
              ...(laminationEditingSide === 'front'
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
            setLaminationEditingSide(null);
          }}
          lang={lang}
        />
      )}

      {/* 6B. Document / Fit-to-Paper Editor Modal */}
      {editingDocumentPageIndex !== null && documentSettings.pages[editingDocumentPageIndex] && (
        <DocumentEditorModal
          isOpen={true}
          page={documentSettings.pages[editingDocumentPageIndex]}
          onClose={() => setEditingDocumentPageIndex(null)}
          onSave={handleSaveDocumentEdits}
          lang={lang}
        />
      )}

      {/* 7. Keyboard Shortcuts Cheat Sheet Modal */}
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
        lang={lang}
      />

      {/* Offscreen Spotless A4 CV Export Node (Guaranteed clean 1:1 PDF/PNG/JPG regardless of zoom or gallery state) */}
      {mode === 'cv' && (
        <div
          id="cv-clean-export-node"
          aria-hidden="true"
          style={{
            position: 'fixed',
            left: '-9999px',
            top: 0,
            width: '794px',
            backgroundColor: '#ffffff',
            pointerEvents: 'none',
            zIndex: -1,
          }}
        >
          <CvSheetRenderer data={cvData} interactive={false} />
        </div>
      )}

      {/* Offscreen Spotless Ready-Made Document Export Node */}
      {mode === 'readydocs' && (
        <div
          id="readydoc-clean-export-node"
          aria-hidden="true"
          style={{
            position: 'fixed',
            left: '-9999px',
            top: 0,
            width: `${activeReadyDocPaper.widthPx}px`,
            backgroundColor: '#ffffff',
            pointerEvents: 'none',
            zIndex: -1,
          }}
        >
          <ReadyDocSheetRenderer
            template={activeReadyDocTemplate}
            paper={activeReadyDocPaper}
            values={readyDocState.valuesByDoc[activeReadyDocTemplate.id] || {}}
            tableRows={
              readyDocState.tablesByDoc[activeReadyDocTemplate.id]?.length
                ? readyDocState.tablesByDoc[activeReadyDocTemplate.id]
                : activeReadyDocTemplate.defaultTableRows || []
            }
            photoSrc={readyDocState.photosByDoc[activeReadyDocTemplate.id] || ''}
            fontSizePx={readyDocState.fontSizePx}
            lineHeight={readyDocState.lineHeight}
            stampTopMm={readyDocState.stampTopMm}
            showHeader={readyDocState.showHeader}
            showBorder={readyDocState.showBorder}
            showPageNumber={readyDocState.showPageNumber}
            interactive={false}
          />
        </div>
      )}

      {/* Offline Connectivity Banner (Only shown when internet is disconnected) */}
      <OfflineIndicator lang={lang} />
      </div>

      {/* 4. Dedicated 1:1 Scale Print DOM (Only rendered in @media print, pure white, no shadows) */}
      <PrintSheetHidden
        mode={mode}
        paper={currentPaper}
        orientation={orientation}
        margins={mode === 'passport' ? margins : nidMargins}
        cuttingGuide={cuttingGuide}
        bleedArea={bleedArea}
        colorProfile={colorProfile}
        passportItems={passportItems}
        nid={nid}
        lamination={lamination}
        documentSettings={documentSettings}
        cvData={cvData}
        readyDocState={readyDocState}
      />
    </div>
  );
}
