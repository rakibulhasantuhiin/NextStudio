/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Edit3, FileDown, Printer } from 'lucide-react';
import { Header } from './components/Header';
import { NidControls } from './components/NidStudio/NidControls';
import { NidEditorModal } from './components/NidStudio/NidEditorModal';
import { PaperPreview } from './components/PaperPreview';
import { PassportControls } from './components/PassportStudio/PassportControls';
import { PhotoEditorModal } from './components/PassportStudio/PhotoEditorModal';
import { PrintSheetHidden } from './components/PrintSheetHidden';
import { ShortcutsModal } from './components/ShortcutsModal';
import {
  CuttingGuideStyle,
  LayoutMode,
  MarginSettings,
  NIDCardSettings,
  PaperOrientation,
  PaperSizeType,
  PhotoAdjustments,
  PhotoPresetType,
  PlacedSheetItem,
  StudioMode,
  StudioPhotoItem,
  StudioState,
} from './types';
import {
  DEFAULT_ADJUSTMENTS,
  DEFAULT_MARGINS,
  DEFAULT_NID_MARGINS,
  NID_STANDARD_HEIGHT,
  NID_STANDARD_WIDTH,
  PAPER_SIZES,
  PHOTO_PRESETS,
} from './utils/constants';
import {
  autoProcessUploadedPhoto,
  detectPassportFramingAndStraighten,
  loadImage,
  processStudioPhoto,
} from './utils/imageProcessing';
import {
  addPhotoToSheet,
  autoAlignPlacedItems,
  calculatePhotoPositions,
  generateDefaultPlacedItems,
} from './utils/layoutCalculator';
import { exportToImage, exportToPdf, triggerDirectPrint } from './utils/printAndPdf';
import { getSampleNidBack, getSampleNidFront, getSamplePassportPhoto } from './utils/sampleImages';
import { exportProjectAsJson, importProjectFromJson, loadStateFromLocal, saveStateToLocal } from './utils/storage';

export default function App() {
  // 1. Initial State Setup
  const [mode, setMode] = useState<StudioMode>('passport');
  const [lang, setLang] = useState<'bn' | 'en'>('bn');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isSaved, setIsSaved] = useState(true);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [zoom, setZoom] = useState<number>(0.85);

  // Passport Studio State
  const [photoPreset, setPhotoPreset] = useState<PhotoPresetType>('bd-passport');
  const [customPhotoWidth, setCustomPhotoWidth] = useState(35);
  const [customPhotoHeight, setCustomPhotoHeight] = useState(45);
  const [paperSize, setPaperSize] = useState<PaperSizeType>('a4');
  const [orientation, setOrientation] = useState<PaperOrientation>('portrait');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('top-5');
  const [manualCount, setManualCount] = useState<number>(5);
  const [margins, setMargins] = useState<MarginSettings>(DEFAULT_MARGINS);
  const [cuttingGuide, setCuttingGuide] = useState<CuttingGuideStyle>('none');
  const [bleedArea, setBleedArea] = useState<number>(0);
  const [colorProfile, setColorProfile] = useState<'srgb' | 'cmyk' | 'bw'>('srgb');
  const [printQuality, setPrintQuality] = useState<150 | 300 | 600>(300);

  // Auto Processing on Upload State (starts with original background preserved)
  const [autoRemoveBg, setAutoRemoveBg] = useState<boolean>(false);
  const [uploadBgMode, setUploadBgMode] = useState<'studio-blue' | 'white' | 'sky-blue' | 'off-white'>('studio-blue');
  const [autoStraighten, setAutoStraighten] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);

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

  // File upload trigger refs for paper preview click-to-upload
  const passportUploadInputRef = useRef<HTMLInputElement>(null);
  const nidFrontInputRef = useRef<HTMLInputElement>(null);
  const nidBackInputRef = useRef<HTMLInputElement>(null);

  // 2. Restore State from Local Storage if present (filters out any old dummy demo photos)
  useEffect(() => {
    const saved = loadStateFromLocal();
    if (saved) {
      setMode(saved.mode || 'passport');
      setLang(saved.lang || 'bn');
      setTheme(saved.theme || 'light');
      if (saved.photoPreset) setPhotoPreset(saved.photoPreset);
      if (saved.paperSize) setPaperSize(saved.paperSize);
      if (saved.orientation) setOrientation(saved.orientation);
      if (saved.layoutMode) setLayoutMode(saved.layoutMode);
      if (saved.manualCount) setManualCount(saved.manualCount);
      if (saved.margins) setMargins(saved.margins);
      if (saved.cuttingGuide) setCuttingGuide(saved.cuttingGuide);
      if (saved.bleedArea !== undefined) setBleedArea(saved.bleedArea);
      if (saved.colorProfile) setColorProfile(saved.colorProfile);
      if (saved.printQuality) setPrintQuality(saved.printQuality);
      if (saved.autoRemoveBgOnUpload !== undefined) setAutoRemoveBg(saved.autoRemoveBgOnUpload);
      if (saved.uploadBgMode) setUploadBgMode(saved.uploadBgMode);
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
    }
  }, []);

  // 3. Theme Toggle Effect
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // 4. Autosave Debounced
  const saveTimeoutRef = useRef<number | null>(null);
  useEffect(() => {
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
        customPaperWidth: 210,
        customPaperHeight: 297,
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
        autoRemoveBgOnUpload: autoRemoveBg,
        uploadBgMode,
        placedItems,
        selectedItemId,
        nid,
        nidMargins,
      };
      saveStateToLocal(currentState);
      setIsSaved(true);
    }, 800);

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
    orientation,
    layoutMode,
    manualCount,
    margins,
    cuttingGuide,
    bleedArea,
    colorProfile,
    printQuality,
    autoRemoveBg,
    uploadBgMode,
    photos,
    activePhotoIndex,
    placedItems,
    selectedItemId,
    nid,
    nidMargins,
  ]);

  // 5. Dimension Resolutions
  const effectivePhotoWidth =
    photoPreset === 'custom' ? customPhotoWidth : PHOTO_PRESETS[photoPreset].width;
  const effectivePhotoHeight =
    photoPreset === 'custom' ? customPhotoHeight : PHOTO_PRESETS[photoPreset].height;
  const currentPaper = PAPER_SIZES[paperSize];

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

  // 7. Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Print: Ctrl+P or Cmd+P
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        triggerDirectPrint();
        return;
      }
      // Save: Ctrl+S or Cmd+S
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
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
  }, [photos, mode, nid]);

  // 8. Photo Upload Handler: Supports Multiple Pictures at once
  const handleUploadPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const targetAspect = effectivePhotoWidth / effectivePhotoHeight;
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

        try {
          // 100% offline auto-straighten, passport framing & background preservation/removal
          const result = await autoProcessUploadedPhoto(dataUrl, {
            targetAspect,
            autoStraighten,
            autoRemoveBg,
            bgMode: uploadBgMode,
          });

          newlyProcessedPhotos.push({
            id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            originalSrc: result.originalSrc,
            processedSrc: result.processedSrc,
            adjustments: result.adjustments,
          });
        } catch (err) {
          console.error('Failed to auto-process uploaded photo:', err);
          newlyProcessedPhotos.push({
            id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            originalSrc: dataUrl,
            processedSrc: dataUrl,
            adjustments: { ...DEFAULT_ADJUSTMENTS },
          });
        }
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

  // Re-run Auto Face Detect & Straighten for a photo (preserves current background)
  const handleAutoFitPhoto = async (index: number) => {
    const target = photos[index];
    if (!target) return;
    try {
      const targetAspect = effectivePhotoWidth / effectivePhotoHeight;
      const currentBgMode = target.adjustments.backgroundMode;
      const result = await autoProcessUploadedPhoto(target.originalSrc, {
        targetAspect,
        autoStraighten: true,
        autoRemoveBg: currentBgMode !== 'original',
        bgMode: currentBgMode === 'original' ? 'studio-blue' : currentBgMode,
      });

      const updatedAdj: PhotoAdjustments = {
        ...result.adjustments,
        backgroundMode: currentBgMode,
      };
      const processedSrc = await processStudioPhoto(target.originalSrc, updatedAdj);

      setPhotos((prev) =>
        prev.map((p, idx) =>
          idx === index
            ? {
                ...p,
                adjustments: updatedAdj,
                processedSrc,
              }
            : p
        )
      );
    } catch (err) {
      console.error('Failed to auto-fit photo:', err);
    }
  };

  // Quick apply background to a single photo
  const handleQuickApplyBg = async (index: number, mode: 'studio-blue' | 'white' | 'original') => {
    const target = photos[index];
    if (!target) return;
    try {
      const updatedAdj: PhotoAdjustments = {
        ...target.adjustments,
        backgroundMode: mode,
      };
      const processedSrc = await processStudioPhoto(target.originalSrc, updatedAdj);
      setPhotos((prev) =>
        prev.map((p, idx) => (idx === index ? { ...p, adjustments: updatedAdj, processedSrc } : p))
      );
    } catch (err) {
      console.error('Quick apply background error:', err);
    }
  };

  // Batch apply background to all photos in the sheet
  const handleApplyBgToAll = async (mode: 'studio-blue' | 'white' | 'sky-blue' | 'off-white') => {
    try {
      const updated = await Promise.all(
        photos.map(async (p) => {
          const updatedAdj: PhotoAdjustments = {
            ...p.adjustments,
            backgroundMode: mode,
          };
          const processedSrc = await processStudioPhoto(p.originalSrc, updatedAdj);
          return {
            ...p,
            adjustments: updatedAdj,
            processedSrc,
          };
        })
      );
      setPhotos(updated);
    } catch (err) {
      console.error('Batch apply background error:', err);
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

  // 10. Print & Export Handlers
  const handleDirectPrint = () => {
    triggerDirectPrint();
  };

  const handleDownloadPdf = async () => {
    const filename =
      mode === 'passport'
        ? `Passport_Photo_Sheet_${currentPaper.name.split(' ')[0]}_300DPI.pdf`
        : `NID_Smart_Card_Print_${currentPaper.name.split(' ')[0]}.pdf`;

    await exportToPdf(
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
      },
      filename
    );
  };

  const handleDownloadImage = async (format: 'png' | 'jpeg') => {
    const ext = format === 'png' ? 'png' : 'jpg';
    const filename =
      mode === 'passport'
        ? `Passport_Photo_Sheet_${paperSize}.${ext}`
        : `NID_Print_Sheet_${paperSize}.${ext}`;

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
      },
      format,
      filename
    );
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
      customPaperWidth: 210,
      customPaperHeight: 297,
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
      autoRemoveBgOnUpload: autoRemoveBg,
      uploadBgMode,
      nid,
      nidMargins,
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
      if (imported.photoPreset) setPhotoPreset(imported.photoPreset);
      if (imported.layoutMode) setLayoutMode(imported.layoutMode);
      if (imported.manualCount) setManualCount(imported.manualCount);
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
    setOrientation('portrait');
    setPrintQuality(300);
    setColorProfile('srgb');
    setBleedArea(0);
    setPhotos([]);
    setActivePhotoIndex(0);
    setPlacedItems([]);
    setSelectedItemId(null);
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
    if (w < 640) setZoom(0.45);
    else if (w < 1024) setZoom(0.65);
    else setZoom(0.85);
  };

  const [mobileTab, setMobileTab] = useState<'preview' | 'controls'>('preview');

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col font-sans transition-colors">
      {/* 1. Global Navigation Header (Unified Single Bar) */}
      <Header
        mode={mode}
        setMode={setMode}
        lang={lang}
        setLang={setLang}
        theme={theme}
        setTheme={setTheme}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        isSaved={isSaved}
        onPrint={handleDirectPrint}
        onDownloadPdf={handleDownloadPdf}
        onDownloadPng={() => handleDownloadImage('png')}
        onDownloadJpg={() => handleDownloadImage('jpeg')}
        onReset={handleReset}
        onExportJson={handleExportBackup}
        onImportJson={handleImportBackup}
        zoom={zoom}
        setZoom={setZoom}
        onFitZoom={handleFitZoom}
      />

      {/* Mobile Tab Switcher Bar (Visible only on < lg screens) */}
      <div className="lg:hidden no-print bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-3 py-2 flex items-center justify-center gap-2">
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl w-full max-w-sm border border-slate-200/80 dark:border-slate-800">
          <button
            onClick={() => setMobileTab('preview')}
            className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${
              mobileTab === 'preview'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>পেপার প্রিভিউ</span>
          </button>
          <button
            onClick={() => setMobileTab('controls')}
            className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${
              mobileTab === 'controls'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>কন্ট্রোল ও ছবি</span>
          </button>
        </div>
      </div>

      {/* 2. Main Workspace: Wide Desktop Workstation & Mobile Clean View */}
      <main className="no-print flex-1 flex flex-col lg:flex-row overflow-hidden w-full max-w-[1920px] mx-auto pb-16 lg:pb-0">
        {/* Left Sidebar: Controls & Settings */}
        <aside
          className={`w-full lg:w-[410px] xl:w-[450px] shrink-0 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-3 sm:p-4 overflow-y-auto max-h-[calc(100vh-3.5rem)] transition-colors ${
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
              onAutoFitPhoto={handleAutoFitPhoto}
              autoRemoveBg={autoRemoveBg}
              setAutoRemoveBg={setAutoRemoveBg}
              uploadBgMode={uploadBgMode}
              setUploadBgMode={setUploadBgMode}
              onQuickApplyBg={handleQuickApplyBg}
              autoStraighten={autoStraighten}
              setAutoStraighten={setAutoStraighten}
              onApplyBgToAll={handleApplyBgToAll}
              isUploading={isUploading}
              preset={photoPreset}
              setPreset={setPhotoPreset}
              customWidth={customPhotoWidth}
              setCustomWidth={setCustomPhotoWidth}
              customHeight={customPhotoHeight}
              setCustomHeight={setCustomPhotoHeight}
              paperSize={paperSize}
              setPaperSize={setPaperSize}
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
          ) : (
            <NidControls
              lang={lang}
              nid={nid}
              setNid={setNid}
              margins={nidMargins}
              setMargins={setNidMargins}
              paperSize={paperSize}
              setPaperSize={setPaperSize}
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
          )}
        </aside>

        {/* Right Area: Realistic Scaled Paper Preview Canvas */}
        <section
          className={`flex-1 bg-slate-100/90 dark:bg-slate-950 flex flex-col overflow-auto max-h-[calc(100vh-3.5rem)] ${
            mobileTab === 'controls' ? 'hidden lg:flex' : 'flex'
          }`}
        >
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
            onNudgeItem={handleNudgeItem}
            onToggleItemSize={handleToggleItemSize}
            onDuplicateItem={handleDuplicateItem}
            onDeleteItem={handleDeleteItem}
            onAddStampCopy={() => handleAddStampCopy()}
            onAddPassportCopy={() => handleAddPassportCopy()}
            onAutoAlignGrid={handleAutoAlignGrid}
            onCycleItemPhoto={handleCycleItemPhoto}
          />
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
            reader.onload = (ev) => {
              const src = ev.target?.result as string;
              setNid((prev) => ({ ...prev, frontImage: src, processedFrontImage: src }));
            };
            reader.readAsDataURL(file);
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
            reader.onload = (ev) => {
              const src = ev.target?.result as string;
              setNid((prev) => ({ ...prev, backImage: src, processedBackImage: src }));
            };
            reader.readAsDataURL(file);
          }
        }}
        className="hidden"
      />

      {/* Mobile Sticky Bottom Action Bar (Mobile Only) */}
      <div className="lg:hidden no-print fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 p-2.5 px-4 flex items-center justify-between gap-2 shadow-xl">
        {mode === 'passport' && photos.length > 0 && (
          <button
            onClick={() => setEditingPhotoIndex(activePhotoIndex)}
            className="flex-1 py-2 px-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>ছবি এডিট</span>
          </button>
        )}
        <button
          onClick={handleDownloadPdf}
          className="flex-1 py-2 px-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-xs"
        >
          <FileDown className="w-3.5 h-3.5" />
          <span>PDF সেভ</span>
        </button>
        <button
          onClick={handleDirectPrint}
          className="flex-1 py-2 px-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-md shadow-blue-500/20"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>প্রিন্ট</span>
        </button>
      </div>

      {/* 4. Dedicated 1:1 Scale Print DOM (Only rendered in @media print) */}
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
      />

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

      {/* 7. Keyboard Shortcuts Cheat Sheet Modal */}
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
        lang={lang}
      />
    </div>
  );
}
