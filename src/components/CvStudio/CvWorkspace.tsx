import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  CornerDownRight,
  CornerUpLeft,
  Eye,
  EyeOff,
  FileDown,
  LayoutGrid,
  Loader2,
  Maximize2,
  MousePointerClick,
  Plus,
  Printer,
  RotateCcw,
  Settings2,
  Trash2,
  X,
  Zap,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  CvData,
  CvDensity,
  CvFieldTarget,
  CvFontStyle,
  CvLayoutMetrics,
  CvPaperSizeId,
  CvSectionKey,
  CvTemplateId,
} from '../../types/cv';
import { StudioPhotoItem } from '../../types';
import {
  CV_ACCENT_COLORS,
  CV_PAPER_SIZES,
  CV_QUICK_FILL_PRESETS,
  CV_TEMPLATES,
  createEmptyCvData,
  getCvPaperDimensions,
} from '../../utils/cvTemplates';
import { CvFieldModal } from './CvFieldModal';
import {
  CvSheetRenderer,
  getMergedSectionOrder,
  getTemplateMainSections,
} from './CvSheetRenderer';
import { CvTemplateGallery } from './CvTemplateGallery';
import { DocumentTypographyBar } from '../RichTextToolbar';
import { DEFAULT_BANGLA_FONT } from '../../utils/richText';

interface CvWorkspaceProps {
  lang: 'bn' | 'en';
  cvData: CvData;
  setCvData: React.Dispatch<React.SetStateAction<CvData>>;
  showGallery: boolean;
  setShowGallery: (show: boolean) => void;
  studioPhotos: StudioPhotoItem[];
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  onFitZoom: () => void;
  onPrintCv: () => void;
  onDownloadCvPdf: () => void;
  isExporting?: boolean;
}

const ORDERED_CORE_TARGETS: CvFieldTarget[] = [
  { type: 'basic', field: 'fullName' },
  { type: 'basic', field: 'jobTitle' },
  { type: 'basic', field: 'phone' },
  { type: 'basic', field: 'email' },
  { type: 'basic', field: 'address' },
  { type: 'basic', field: 'careerObjective' },
  { type: 'experience', index: 0, subField: 'role' },
  { type: 'education', index: 0, subField: 'degree' },
  { type: 'skills' },
  { type: 'personal', field: 'fatherName' },
  { type: 'personal', field: 'motherName' },
  { type: 'personal', field: 'dateOfBirth' },
  { type: 'personal', field: 'nationalId' },
  { type: 'personal', field: 'religion' },
  { type: 'personal', field: 'maritalStatus' },
  { type: 'personal', field: 'bloodGroup' },
  { type: 'signature' },
];

const targetKey = (t: CvFieldTarget): string => {
  switch (t.type) {
    case 'basic':
    case 'personal':
    case 'passport':
    case 'family':
      return `${t.type}:${t.field}`;
    case 'experience':
      return `experience:${t.index}`;
    case 'education':
      return `education:${t.index}`;
    case 'training':
      return `training:${t.index}`;
    case 'reference':
      return `reference:${t.index}`;
    default:
      return t.type;
  }
};

export const CvWorkspace: React.FC<CvWorkspaceProps> = ({
  lang,
  cvData,
  setCvData,
  showGallery,
  setShowGallery,
  studioPhotos,
  zoom,
  setZoom,
  onFitZoom,
  onPrintCv,
  onDownloadCvPdf,
  isExporting = false,
}) => {
  const isBn = lang === 'bn';
  const [activeField, setActiveField] = useState<CvFieldTarget | null>(null);
  const [isFinalPreview, setIsFinalPreview] = useState(false);
  const [showExtraMenu, setShowExtraMenu] = useState(false);
  const [showQuickFillMenu, setShowQuickFillMenu] = useState(false);
  const [showRemainingMenu, setShowRemainingMenu] = useState(false);
  const [scrollZoomEnabled, setScrollZoomEnabled] = useState(true);
  const [zoomHudVisible, setZoomHudVisible] = useState(false);
  const [markedSections, setMarkedSections] = useState<CvSectionKey[]>([]);
  const [layoutMetrics, setLayoutMetrics] = useState<CvLayoutMetrics | null>(null);

  const paperDims = useMemo(
    () => getCvPaperDimensions(cvData),
    [cvData.paperSize, cvData.customPaperWidthMm, cvData.customPaperHeightMm]
  );

  const [sheetHeight, setSheetHeight] = useState(paperDims.heightPx);

  const stageRef = useRef<HTMLDivElement>(null);
  const sheetMeasureRef = useRef<HTMLDivElement>(null);
  const zoomHudTimerRef = useRef<number | null>(null);

  const activeTemplate = useMemo(
    () => CV_TEMPLATES.find((t) => t.id === cvData.templateId) || CV_TEMPLATES[0],
    [cvData.templateId]
  );

  // Measure rendered CV sheet height so scaled wrapper & page-count pill stay accurate
  useEffect(() => {
    if (showGallery) return;
    const node = sheetMeasureRef.current;
    if (!node) return;
    const updateHeight = () => {
      const h = Math.max(paperDims.heightPx, Math.ceil(node.scrollHeight));
      setSheetHeight(h);
    };
    updateHeight();
    const ro = new ResizeObserver(updateHeight);
    ro.observe(node);
    return () => ro.disconnect();
  }, [showGallery, cvData, isFinalPreview, paperDims.heightPx, layoutMetrics?.pages.length]);

  // Smooth mouse-wheel hover zoom directly over the CV sheet
  useEffect(() => {
    if (showGallery) return;
    const el = stageRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (!scrollZoomEnabled && !e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      e.stopPropagation();

      const direction = e.deltaY < 0 ? 1 : -1;
      const magnitude = Math.abs(e.deltaY);
      const step = magnitude < 25 ? 0.04 : 0.08;

      setZoom((prev) => {
        const next = Math.round((prev + direction * step) * 100) / 100;
        return Math.min(1.8, Math.max(0.4, next));
      });

      setZoomHudVisible(true);
      if (zoomHudTimerRef.current) window.clearTimeout(zoomHudTimerRef.current);
      zoomHudTimerRef.current = window.setTimeout(() => {
        setZoomHudVisible(false);
      }, 950);
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
      if (zoomHudTimerRef.current) window.clearTimeout(zoomHudTimerRef.current);
    };
  }, [scrollZoomEnabled, setZoom, showGallery]);

  // Compute completion checklist (9 essential fields)
  const completionItems = useMemo(() => {
    const items: { labelBn: string; labelEn: string; filled: boolean; target: CvFieldTarget }[] = [
      {
        labelBn: 'পুরো নাম',
        labelEn: 'Full Name',
        filled: Boolean(cvData.fullName.trim()),
        target: { type: 'basic', field: 'fullName' },
      },
      {
        labelBn: 'পদের নাম',
        labelEn: 'Job Title',
        filled: Boolean(cvData.jobTitle.trim()),
        target: { type: 'basic', field: 'jobTitle' },
      },
      {
        labelBn: 'মোবাইল নম্বর',
        labelEn: 'Phone Number',
        filled: Boolean(cvData.phone.trim()),
        target: { type: 'basic', field: 'phone' },
      },
      {
        labelBn: 'ইমেইল',
        labelEn: 'Email',
        filled: Boolean(cvData.email.trim()),
        target: { type: 'basic', field: 'email' },
      },
      {
        labelBn: 'ঠিকানা',
        labelEn: 'Address',
        filled: Boolean(cvData.address.trim()),
        target: { type: 'basic', field: 'address' },
      },
      {
        labelBn: 'ক্যারিয়ার উদ্দেশ্য',
        labelEn: 'Career Objective',
        filled: Boolean(cvData.careerObjective.trim()),
        target: { type: 'basic', field: 'careerObjective' },
      },
      {
        labelBn: 'শিক্ষাগত যোগ্যতা',
        labelEn: 'Education',
        filled: cvData.educations.some((ed) => ed.degree.trim() || ed.institution.trim()),
        target: { type: 'education', index: 0, subField: 'degree' },
      },
      {
        labelBn: 'দক্ষতা (Skills)',
        labelEn: 'Skills',
        filled: cvData.skills.length > 0,
        target: { type: 'skills' },
      },
      {
        labelBn: 'ব্যক্তিগত তথ্য',
        labelEn: 'Personal Details',
        filled: Boolean(cvData.fatherName.trim() || cvData.dateOfBirth.trim() || cvData.nationalId.trim()),
        target: { type: 'personal', field: 'fatherName' },
      },
    ];
    return items;
  }, [cvData]);

  const missingItems = completionItems.filter((item) => !item.filled);
  const completedPercent = Math.round(
    ((completionItems.length - missingItems.length) / completionItems.length) * 100
  );
  const estimatedPages = layoutMetrics?.pages.length || (sheetHeight > paperDims.heightPx + 30 ? 2 : 1);

  // Template switch handler
  const handleSelectTemplate = (templateId: CvTemplateId) => {
    const meta = CV_TEMPLATES.find((t) => t.id === templateId);
    setCvData((prev) => ({
      ...prev,
      templateId,
      accentColor: meta?.defaultAccent || prev.accentColor,
      cvLang: templateId === 'bangla-biodata' ? 'bn' : prev.cvLang,
      showPassportInfo:
        templateId === 'abroad-visa' || templateId === 'abroad-gulf' ? true : prev.showPassportInfo,
      showFamilyInfo: templateId === 'marriage-biodata' ? true : prev.showFamilyInfo,
    }));
    setShowGallery(false);
  };

  // Repeatable section handlers
  const handleAddExperience = () => {
    const nextIdx = cvData.experiences.length;
    setCvData((prev) => ({
      ...prev,
      experiences: [
        ...prev.experiences,
        {
          id: `exp-${Date.now()}`,
          role: '',
          company: '',
          startDate: '',
          endDate: 'Present',
          description: '',
        },
      ],
    }));
    setActiveField({ type: 'experience', index: nextIdx, subField: 'role' });
  };

  const handleRemoveExperience = (index: number) => {
    setCvData((prev) => ({
      ...prev,
      experiences: prev.experiences.filter((_, i) => i !== index),
    }));
  };

  const handleAddEducation = () => {
    const nextIdx = cvData.educations.length;
    setCvData((prev) => ({
      ...prev,
      educations: [
        ...prev.educations,
        {
          id: `edu-${Date.now()}`,
          degree: '',
          institution: '',
          boardOrGroup: '',
          year: '',
          result: '',
        },
      ],
    }));
    setActiveField({ type: 'education', index: nextIdx, subField: 'degree' });
  };

  const handleRemoveEducation = (index: number) => {
    setCvData((prev) => ({
      ...prev,
      educations: prev.educations.filter((_, i) => i !== index),
    }));
  };

  const handleAddTraining = () => {
    const nextIdx = cvData.trainings.length;
    setCvData((prev) => ({
      ...prev,
      showTrainings: true,
      trainings: [
        ...prev.trainings,
        { id: `tr-${Date.now()}`, title: '', institute: '', year: '' },
      ],
    }));
    setActiveField({ type: 'training', index: nextIdx });
  };

  const handleRemoveTraining = (index: number) => {
    setCvData((prev) => ({
      ...prev,
      trainings: prev.trainings.filter((_, i) => i !== index),
    }));
  };

  const handleAddReference = () => {
    const nextIdx = cvData.references.length;
    setCvData((prev) => ({
      ...prev,
      showReferences: true,
      references: [
        ...prev.references,
        { id: `ref-${Date.now()}`, name: '', designation: '', organization: '', phone: '' },
      ],
    }));
    setActiveField({ type: 'reference', index: nextIdx });
  };

  const handleRemoveReference = (index: number) => {
    setCvData((prev) => ({
      ...prev,
      references: prev.references.filter((_, i) => i !== index),
    }));
  };

  // Next field navigation inside CvFieldModal
  const handleNextField = () => {
    if (!activeField) return;
    const currentKey = targetKey(activeField);
    const idx = ORDERED_CORE_TARGETS.findIndex((t) => targetKey(t) === currentKey);
    if (idx >= 0 && idx < ORDERED_CORE_TARGETS.length - 1) {
      const nextTarget = ORDERED_CORE_TARGETS[idx + 1];
      if (nextTarget.type === 'experience' && cvData.experiences.length === 0) {
        handleAddExperience();
        return;
      }
      if (nextTarget.type === 'education' && cvData.educations.length === 0) {
        handleAddEducation();
        return;
      }
      setActiveField(nextTarget);
    } else if (missingItems.length > 0) {
      const nextMissing = missingItems.find((m) => targetKey(m.target) !== currentKey);
      setActiveField(nextMissing ? nextMissing.target : null);
    } else {
      setActiveField(null);
    }
  };

  const applyQuickFillPreset = (presetId: string) => {
    const preset = CV_QUICK_FILL_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setCvData((prev) => ({
      ...prev,
      ...preset.data,
      templateId: prev.templateId,
      accentColor: prev.accentColor,
      cvLang: prev.cvLang,
      fontStyle: prev.fontStyle,
      density: prev.density,
      photo: prev.photo,
      signatureImage: prev.signatureImage,
    }));
    setShowQuickFillMenu(false);
  };

  const handleClearCvData = () => {
    setCvData((prev) => createEmptyCvData(prev.templateId, prev.cvLang));
    setMarkedSections([]);
    setShowQuickFillMenu(false);
  };

  // Multi-page section flow, mark, drag, spacing & universal delete/restore handlers
  const templateDefaultSections = useMemo(
    () => getTemplateMainSections(cvData.templateId),
    [cvData.templateId]
  );

  const activeSectionOrder = useMemo(
    () => getMergedSectionOrder(templateDefaultSections, cvData.sectionOrder),
    [templateDefaultSections, cvData.sectionOrder]
  );

  const handleToggleMarkSection = useCallback((key: CvSectionKey) => {
    setMarkedSections((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }, []);

  const handleReorderSections = useCallback(
    (fromKey: CvSectionKey, toKey: CvSectionKey) => {
      if (fromKey === toKey) return;
      setCvData((prev) => {
        const currentOrder = getMergedSectionOrder(
          getTemplateMainSections(prev.templateId),
          prev.sectionOrder
        );
        const fromIdx = currentOrder.indexOf(fromKey);
        const toIdx = currentOrder.indexOf(toKey);
        if (fromIdx < 0 || toIdx < 0) return prev;
        const nextOrder = [...currentOrder];
        const [moved] = nextOrder.splice(fromIdx, 1);
        nextOrder.splice(toIdx, 0, moved);
        return { ...prev, sectionOrder: nextOrder };
      });
    },
    []
  );

  const handleMoveSectionDirection = useCallback((key: CvSectionKey, dir: 'up' | 'down') => {
    setCvData((prev) => {
      const currentOrder = getMergedSectionOrder(
        getTemplateMainSections(prev.templateId),
        prev.sectionOrder
      );
      const hidden = new Set(prev.hiddenSections || []);
      const visibleOrder = currentOrder.filter((k) => !hidden.has(k));
      const visIdx = visibleOrder.indexOf(key);
      if (visIdx < 0) return prev;
      const swapVisIdx = dir === 'up' ? visIdx - 1 : visIdx + 1;
      if (swapVisIdx < 0 || swapVisIdx >= visibleOrder.length) return prev;
      const targetKeySwap = visibleOrder[swapVisIdx];
      const idxA = currentOrder.indexOf(key);
      const idxB = currentOrder.indexOf(targetKeySwap);
      if (idxA < 0 || idxB < 0) return prev;
      const nextOrder = [...currentOrder];
      nextOrder[idxA] = targetKeySwap;
      nextOrder[idxB] = key;
      return { ...prev, sectionOrder: nextOrder };
    });
  }, []);

  const handleTogglePageBreak = useCallback((key: CvSectionKey) => {
    setCvData((prev) => {
      const breaks = new Set(prev.pageBreakBefore || []);
      if (breaks.has(key)) {
        breaks.delete(key);
        const nextSpace = { ...(prev.sectionSpacingTop || {}) };
        delete nextSpace[key];
        return { ...prev, pageBreakBefore: Array.from(breaks), sectionSpacingTop: nextSpace };
      }
      breaks.add(key);
      return { ...prev, pageBreakBefore: Array.from(breaks) };
    });
  }, []);

  const handleAdjustSectionSpace = useCallback((key: CvSectionKey, deltaPx: number) => {
    setCvData((prev) => {
      const current = prev.sectionSpacingTop?.[key] || 0;
      const next = Math.max(0, Math.min(420, current + deltaPx));
      const nextMap = { ...(prev.sectionSpacingTop || {}) };
      if (next === 0) {
        delete nextMap[key];
      } else {
        nextMap[key] = next;
      }
      return { ...prev, sectionSpacingTop: nextMap };
    });
  }, []);

  const handleDeleteSection = useCallback((key: CvSectionKey) => {
    setMarkedSections((prev) => prev.filter((k) => k !== key));
    setCvData((prev) => {
      const hidden = new Set(prev.hiddenSections || []);
      hidden.add(key);
      return {
        ...prev,
        hiddenSections: Array.from(hidden),
        ...(key === 'languages' ? { showLanguages: false } : {}),
        ...(key === 'trainings' ? { showTrainings: false } : {}),
        ...(key === 'references' ? { showReferences: false } : {}),
        ...(key === 'passport' ? { showPassportInfo: false } : {}),
        ...(key === 'declaration' ? { hideDeclaration: true } : {}),
      };
    });
  }, []);

  const handleRestoreSection = useCallback((key: CvSectionKey) => {
    setCvData((prev) => {
      const hidden = (prev.hiddenSections || []).filter((k) => k !== key);
      return {
        ...prev,
        hiddenSections: hidden,
        ...(key === 'languages' ? { showLanguages: true } : {}),
        ...(key === 'trainings' ? { showTrainings: true } : {}),
        ...(key === 'references' ? { showReferences: true } : {}),
        ...(key === 'passport' ? { showPassportInfo: true } : {}),
        ...(key === 'declaration' ? { hideDeclaration: false } : {}),
      };
    });
  }, []);

  const handleDropOnPage = useCallback(
    (targetPageIndex: number, draggedKey: CvSectionKey) => {
      setCvData((prev) => {
        const order = getMergedSectionOrder(
          getTemplateMainSections(prev.templateId),
          prev.sectionOrder
        );
        const breaks = new Set(prev.pageBreakBefore || []);
        const nextSpace = { ...(prev.sectionSpacingTop || {}) };
        delete nextSpace[draggedKey];

        const pages = layoutMetrics?.pages || [];
        if (targetPageIndex === 0) {
          breaks.delete(draggedKey);
          const page2First = pages[1]?.sectionKeys[0];
          let nextOrder = [...order];
          if (page2First && page2First !== draggedKey) {
            const dIdx = nextOrder.indexOf(draggedKey);
            const p2Idx = nextOrder.indexOf(page2First);
            if (dIdx > p2Idx && p2Idx >= 0) {
              nextOrder.splice(dIdx, 1);
              nextOrder.splice(p2Idx, 0, draggedKey);
            }
          }
          return {
            ...prev,
            sectionOrder: nextOrder,
            pageBreakBefore: Array.from(breaks),
            sectionSpacingTop: nextSpace,
          };
        }

        // Moving onto Page 2+
        const targetPage = pages[targetPageIndex];
        const nextOrder = order.filter((k) => k !== draggedKey);
        if (targetPage && targetPage.sectionKeys.length > 0) {
          const anchorKey = targetPage.sectionKeys[targetPage.sectionKeys.length - 1];
          const anchorIdx = nextOrder.indexOf(anchorKey);
          if (anchorIdx >= 0) {
            nextOrder.splice(anchorIdx + 1, 0, draggedKey);
          } else {
            nextOrder.push(draggedKey);
          }
          breaks.delete(draggedKey);
        } else {
          nextOrder.push(draggedKey);
          breaks.add(draggedKey);
        }

        return {
          ...prev,
          sectionOrder: nextOrder,
          pageBreakBefore: Array.from(breaks),
          sectionSpacingTop: nextSpace,
        };
      });
    },
    [layoutMetrics]
  );

  const handleMoveMarkedToPage2 = useCallback(() => {
    if (markedSections.length === 0) return;
    setCvData((prev) => {
      const order = getMergedSectionOrder(
        getTemplateMainSections(prev.templateId),
        prev.sectionOrder
      );
      const markedSet = new Set(markedSections);
      const unmarked = order.filter((k) => !markedSet.has(k));
      const markedOrdered = order.filter((k) => markedSet.has(k));
      const nextOrder = [...unmarked, ...markedOrdered];
      const breaks = new Set(prev.pageBreakBefore || []);
      markedOrdered.forEach((k, idx) => {
        if (idx === 0) breaks.add(k);
        else breaks.delete(k);
      });
      return {
        ...prev,
        sectionOrder: nextOrder,
        pageBreakBefore: Array.from(breaks),
      };
    });
  }, [markedSections]);

  const handlePullMarkedToPage1 = useCallback(() => {
    if (markedSections.length === 0) return;
    setCvData((prev) => {
      const order = getMergedSectionOrder(
        getTemplateMainSections(prev.templateId),
        prev.sectionOrder
      );
      const markedSet = new Set(markedSections);
      const breaks = new Set(prev.pageBreakBefore || []);
      const nextSpace = { ...(prev.sectionSpacingTop || {}) };
      markedSections.forEach((k) => {
        breaks.delete(k);
        delete nextSpace[k];
      });
      const unmarked = order.filter((k) => !markedSet.has(k));
      const markedOrdered = order.filter((k) => markedSet.has(k));
      const page2First = layoutMetrics?.pages[1]?.sectionKeys.find((k) => !markedSet.has(k));
      let nextOrder = [...unmarked, ...markedOrdered];
      if (page2First) {
        const anchorIdx = unmarked.indexOf(page2First);
        if (anchorIdx >= 0) {
          nextOrder = [
            ...unmarked.slice(0, anchorIdx),
            ...markedOrdered,
            ...unmarked.slice(anchorIdx),
          ];
        }
      }
      return {
        ...prev,
        sectionOrder: nextOrder,
        pageBreakBefore: Array.from(breaks),
        sectionSpacingTop: nextSpace,
      };
    });
  }, [markedSections, layoutMetrics]);

  const handleSpaceMarked = useCallback(
    (deltaPx: number) => {
      if (markedSections.length === 0) return;
      handleAdjustSectionSpace(markedSections[0], deltaPx);
    },
    [markedSections, handleAdjustSectionSpace]
  );

  const handleDeleteMarked = useCallback(() => {
    if (markedSections.length === 0) return;
    markedSections.forEach((k) => handleDeleteSection(k));
    setMarkedSections([]);
  }, [markedSections, handleDeleteSection]);

  const handleResetPageFlow = useCallback(() => {
    setMarkedSections([]);
    setCvData((prev) => ({
      ...prev,
      sectionOrder: [],
      pageBreakBefore: [],
      sectionSpacingTop: {},
    }));
  }, []);

  const hasCustomPageFlow = Boolean(
    (cvData.pageBreakBefore && cvData.pageBreakBefore.length > 0) ||
      (cvData.sectionOrder && cvData.sectionOrder.length > 0) ||
      (cvData.sectionSpacingTop && Object.keys(cvData.sectionSpacingTop).length > 0)
  );

  // Gallery View
  if (showGallery) {
    return (
      <div className="flex-1 w-full overflow-y-auto">
        <CvTemplateGallery
          selectedTemplateId={cvData.templateId}
          cvLang={cvData.cvLang}
          lang={lang}
          onSelectTemplate={handleSelectTemplate}
          onChangeCvLang={(nextLang) => setCvData((prev) => ({ ...prev, cvLang: nextLang }))}
          onBackToEditor={() => setShowGallery(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-full relative">
      {/* Top Floating Liquid Glass CV Editor Bar */}
      <div className="sticky top-0 z-20 px-2 pt-2 pb-1.5 lg:px-5 lg:pt-3 lg:pb-2">
        <div className="glass-strip rounded-2xl px-2 lg:px-3.5 py-1.5 lg:py-2 flex flex-wrap items-center justify-between gap-1.5 lg:gap-2">
          {/* Left Group: Templates + Extra Settings + Completion + Quick Fill */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Switch Template Gallery */}
            <button
              type="button"
              onClick={() => setShowGallery(true)}
              className="glass-tile px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 cursor-pointer"
              title={isBn ? '১৭টি সিভি ডিজাইন দেখুন' : 'Browse 17 CV Templates'}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>{isBn ? 'ডিজাইন' : 'Templates'}</span>
              <span className="hidden xl:inline text-[11px] font-medium text-slate-500 dark:text-slate-400 max-w-[110px] truncate">
                · {isBn ? activeTemplate.nameBn : activeTemplate.nameEn}
              </span>
            </button>

            {/* Extra Settings Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowExtraMenu((v) => !v);
                  setShowQuickFillMenu(false);
                  setShowRemainingMenu(false);
                }}
                className="glass-tile px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer"
              >
                <Settings2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-300" />
                <span>{isBn ? 'এক্সট্রা সেটিংস' : 'Extra Settings'}</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>

              {showExtraMenu && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setShowExtraMenu(false)}
                  />
                  <div className="glass-dropdown absolute left-0 mt-2 w-72 max-w-[calc(100vw-1.5rem)] rounded-2xl p-3.5 z-40 space-y-3.5 text-xs">
                    {/* CV Language */}
                    <div className="space-y-1.5">
                      <div className="font-bold text-slate-700 dark:text-slate-200">
                        {isBn ? 'সিভির ভাষা' : 'CV Document Language'}
                      </div>
                      <div className="grid grid-cols-2 gap-1 glass-track p-1 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setCvData((p) => ({ ...p, cvLang: 'en' }))}
                          className={`py-1.5 rounded-lg font-semibold cursor-pointer ${
                            cvData.cvLang === 'en'
                              ? 'glass-tab-active text-blue-600 dark:text-blue-400'
                              : 'text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          English
                        </button>
                        <button
                          type="button"
                          onClick={() => setCvData((p) => ({ ...p, cvLang: 'bn' }))}
                          className={`py-1.5 rounded-lg font-semibold cursor-pointer ${
                            cvData.cvLang === 'bn'
                              ? 'glass-tab-active text-blue-600 dark:text-blue-400'
                              : 'text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          বাংলা
                        </button>
                      </div>
                    </div>

                    {/* Accent Color Swatches */}
                    <div className="space-y-1.5">
                      <div className="font-bold text-slate-700 dark:text-slate-200">
                        {isBn ? 'থিম কালার' : 'Accent Color'}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {CV_ACCENT_COLORS.map((color) => {
                          const selected = cvData.accentColor.toLowerCase() === color.hex.toLowerCase();
                          return (
                            <button
                              key={color.hex}
                              type="button"
                              onClick={() => setCvData((p) => ({ ...p, accentColor: color.hex }))}
                              className={`w-6 h-6 rounded-full cursor-pointer transition-transform flex items-center justify-center ${
                                selected ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : 'hover:scale-110'
                              }`}
                              style={{ backgroundColor: color.hex }}
                              title={color.name}
                            >
                              {selected && <Check className="w-3.5 h-3.5 text-white" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Font Style */}
                    <div className="space-y-1.5">
                      <div className="font-bold text-slate-700 dark:text-slate-200">
                        {isBn ? 'ফন্ট স্টাইল' : 'Font Style'}
                      </div>
                      <div className="grid grid-cols-3 gap-1 glass-track p-1 rounded-xl">
                        {(
                          [
                            { id: 'classic', en: 'Classic', bn: 'ক্লাসিক' },
                            { id: 'sans', en: 'Modern', bn: 'মডার্ন' },
                            { id: 'serif', en: 'Serif', bn: 'সেরিফ' },
                          ] as { id: CvFontStyle; en: string; bn: string }[]
                        ).map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => setCvData((p) => ({ ...p, fontStyle: f.id }))}
                            className={`py-1.5 rounded-lg font-semibold cursor-pointer ${
                              cvData.fontStyle === f.id
                                ? 'glass-tab-active text-blue-600 dark:text-blue-400'
                                : 'text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {isBn ? f.bn : f.en}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Spacing Density */}
                    <div className="space-y-1.5">
                      <div className="font-bold text-slate-700 dark:text-slate-200">
                        {isBn ? 'লাইনের ফাঁকা (স্পেসিং)' : 'Spacing Density'}
                      </div>
                      <div className="grid grid-cols-3 gap-1 glass-track p-1 rounded-xl">
                        {(
                          [
                            { id: 'compact', en: 'Compact', bn: 'ঘন' },
                            { id: 'normal', en: 'Normal', bn: 'স্বাভাবিক' },
                            { id: 'spacious', en: 'Relaxed', bn: 'খোলামেলা' },
                          ] as { id: CvDensity; en: string; bn: string }[]
                        ).map((d) => (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => setCvData((p) => ({ ...p, density: d.id }))}
                            className={`py-1.5 rounded-lg font-semibold cursor-pointer ${
                              cvData.density === d.id
                                ? 'glass-tab-active text-blue-600 dark:text-blue-400'
                                : 'text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {isBn ? d.bn : d.en}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Completion Progress + Clickable Remaining Fields Popover */}
            <div className="flex items-center gap-2 px-2 py-1 rounded-xl glass-track">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 tabular-nums">
                  {completedPercent}% {isBn ? 'সম্পন্ন' : 'Done'}
                </span>
                <div className="w-14 h-1.5 rounded-full bg-slate-900/10 dark:bg-white/15 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-600 dark:bg-blue-400 transition-all duration-300"
                    style={{ width: `${completedPercent}%` }}
                  />
                </div>
              </div>

              {missingItems.length > 0 ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRemainingMenu((v) => !v);
                      setShowExtraMenu(false);
                      setShowQuickFillMenu(false);
                    }}
                    className="px-2 py-0.5 rounded-lg bg-amber-100/90 dark:bg-amber-500/25 border border-amber-300/80 dark:border-amber-400/40 text-amber-800 dark:text-amber-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer hover:brightness-95 transition"
                  >
                    <span>
                      {isBn ? `বাকি ${missingItems.length}টি` : `${missingItems.length} left`}
                    </span>
                    <ChevronDown className="w-3 h-3" />
                  </button>

                  {showRemainingMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-30"
                        onClick={() => setShowRemainingMenu(false)}
                      />
                      <div className="glass-dropdown absolute left-0 mt-2 w-56 max-w-[calc(100vw-1.5rem)] rounded-2xl py-1.5 z-40">
                        <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          {isBn ? 'যে ঘরগুলো ফাঁকা আছে' : 'Remaining Fields'}
                        </div>
                        {missingItems.map((item, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              setShowRemainingMenu(false);
                              setIsFinalPreview(false);
                              if (
                                item.target.type === 'education' &&
                                cvData.educations.length === 0
                              ) {
                                handleAddEducation();
                              } else {
                                setActiveField(item.target);
                              }
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-white/60 dark:hover:bg-white/10 flex items-center justify-between cursor-pointer"
                          >
                            <span>{isBn ? item.labelBn : item.labelEn}</span>
                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                              + {isBn ? 'লিখুন' : 'Fill'}
                            </span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <span className="px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
                  ✓ {isBn ? 'প্রস্তুত' : 'Ready'}
                </span>
              )}
            </div>

            {/* Quick Fill Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowQuickFillMenu((v) => !v);
                  setShowExtraMenu(false);
                  setShowRemainingMenu(false);
                }}
                className="glass-tile px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>{isBn ? 'দ্রুত ভরুন' : 'Quick Fill'}</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>

              {showQuickFillMenu && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setShowQuickFillMenu(false)}
                  />
                  <div className="glass-dropdown absolute left-0 mt-2 w-60 max-w-[calc(100vw-1.5rem)] rounded-2xl py-1.5 z-40 text-xs">
                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {isBn ? 'এক ক্লিকে স্যাম্পল তথ্য ভরুন' : 'One-Click Sample Profiles'}
                    </div>
                    {CV_QUICK_FILL_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyQuickFillPreset(preset.id)}
                        className="w-full text-left px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-white/60 dark:hover:bg-white/10 font-medium cursor-pointer"
                      >
                        {isBn ? preset.labelBn : preset.labelEn}
                      </button>
                    ))}
                    <div className="h-px bg-slate-900/10 dark:bg-white/10 my-1" />
                    <button
                      type="button"
                      onClick={handleClearCvData}
                      className="w-full text-left px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-500/10 flex items-center gap-2 font-semibold cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{isBn ? 'সব লেখা খালি করুন' : 'Clear All Fields'}</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Paper Size Selector */}
            <select
              value={cvData.paperSize || 'a4'}
              onChange={(e) =>
                setCvData((p) => ({ ...p, paperSize: e.target.value as CvPaperSizeId }))
              }
              className="glass-tile px-2 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer outline-none"
              title={isBn ? 'সিভির পেপার সাইজ' : 'CV Paper Size'}
            >
              {CV_PAPER_SIZES.map((p) => (
                <option key={p.id} value={p.id}>
                  {isBn ? p.labelBn : p.labelEn}
                </option>
              ))}
            </select>

            {/* Page Count Indicator */}
            <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/12 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
              ✓ {paperDims.id.toUpperCase()} ·{' '}
              {isBn ? `${estimatedPages} পাতা` : `${estimatedPages} ${estimatedPages === 1 ? 'Page' : 'Pages'}`}
            </span>
          </div>

          {/* Right Group: Bangla Font + Size + Bold/Italic/Underline/Highlighter + Zoom + Final Preview + PDF + Print */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <DocumentTypographyBar
              lang={lang}
              fontFamily={cvData.banglaFont || DEFAULT_BANGLA_FONT}
              onChangeFontFamily={(banglaFont) =>
                setCvData((p) => ({ ...p, banglaFont }))
              }
              fontSizePx={cvData.fontSizePx || 13}
              onChangeFontSizePx={(fontSizePx) =>
                setCvData((p) => ({ ...p, fontSizePx }))
              }
              minFontSize={10}
              maxFontSize={22}
              bold={Boolean(cvData.textBold)}
              onToggleBold={() =>
                setCvData((p) => ({ ...p, textBold: !p.textBold }))
              }
              italic={Boolean(cvData.textItalic)}
              onToggleItalic={() =>
                setCvData((p) => ({ ...p, textItalic: !p.textItalic }))
              }
              underline={Boolean(cvData.textUnderline)}
              onToggleUnderline={() =>
                setCvData((p) => ({ ...p, textUnderline: !p.textUnderline }))
              }
              highlight={cvData.textHighlight || 'none'}
              onChangeHighlight={(textHighlight) =>
                setCvData((p) => ({ ...p, textHighlight }))
              }
              compact
            />

            {/* Zoom Controls & Wheel Toggle (Available on both Desktop & Mobile!) */}
            <div className="flex items-center gap-0.5 glass-track p-0.5 rounded-xl">
              <button
                type="button"
                onClick={() => setScrollZoomEnabled((v) => !v)}
                className={`hidden md:inline-flex p-1.5 rounded-lg transition cursor-pointer ${
                  scrollZoomEnabled
                    ? 'glass-tab-active text-blue-600 dark:text-blue-400'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
                title={
                  isBn
                    ? scrollZoomEnabled
                      ? 'মাউস স্ক্রল জুম চালু আছে'
                      : 'মাউস স্ক্রল জুম বন্ধ আছে'
                    : scrollZoomEnabled
                    ? 'Mouse-Wheel Hover Zoom ON'
                    : 'Mouse-Wheel Hover Zoom OFF'
                }
              >
                <MousePointerClick className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.32, Math.round((z - 0.1) * 100) / 100))}
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-white/10 cursor-pointer"
                title={isBn ? 'জুম আউট' : 'Zoom Out'}
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-200 px-1 min-w-[38px] text-center tabular-nums">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(1.8, Math.round((z + 0.1) * 100) / 100))}
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-white/10 cursor-pointer"
                title={isBn ? 'জুম ইন' : 'Zoom In'}
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onFitZoom}
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-white/10 cursor-pointer"
                title={isBn ? 'স্ক্রিনে ফিট করুন' : 'Fit to Screen'}
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Final Preview Toggle */}
            <button
              type="button"
              onClick={() => setIsFinalPreview((v) => !v)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition ${
                isFinalPreview
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                  : 'glass-tile text-slate-800 dark:text-slate-100'
              }`}
              title={
                isBn
                  ? 'হলুদ বক্স ছাড়া প্রিন্টের চূড়ান্ত চেহারা দেখুন'
                  : 'Toggle Clean Final Print Preview'
              }
            >
              {isFinalPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>
                {isFinalPreview
                  ? isBn
                    ? 'এডিট মোড'
                    : 'Edit Mode'
                  : isBn
                  ? 'শেষ চেহারা'
                  : 'Final Preview'}
              </span>
            </button>

            {/* Save PDF Button (Desktop; mobile uses sticky bottom bar) */}
            <button
              type="button"
              onClick={onDownloadCvPdf}
              disabled={isExporting}
              className="hidden lg:flex glass-btn-emerald px-3 py-1.5 rounded-xl text-white text-xs font-bold items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {isExporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileDown className="w-3.5 h-3.5" />
              )}
              <span>PDF</span>
            </button>

            {/* Print Button (Desktop; mobile uses sticky bottom bar) */}
            <button
              type="button"
              onClick={onPrintCv}
              className="hidden lg:flex glass-btn-primary px-3 py-1.5 rounded-xl text-white text-xs font-bold items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isBn ? 'প্রিন্ট' : 'Print'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Page Fill Status + Marked Group Flow Controls */}
      {!isFinalPreview && (
        <div className="px-2 pb-1.5 lg:px-5 lg:pb-2 space-y-1.5">
          <div className="glass-banner rounded-xl px-3 lg:px-3.5 py-1.5 text-[11px] font-medium text-slate-700 dark:text-slate-200 flex flex-wrap items-center justify-between gap-2">
            <span>
              {isBn
                ? '💡 লেখায় ক্লিক করে এডিট করুন। যেকোনো সেকশনে মাউস নিলে ড্র্যাগ, মার্ক, স্পেস, পেইজ ১⇄২ এবং ডিলিট বাটন পাবেন।'
                : '💡 Click text to edit. Hover any section to drag, mark, add space, move Page 1⇄2, or delete.'}
            </span>

            <div className="flex flex-wrap items-center gap-1.5">
              {layoutMetrics?.pages.map((pg) => {
                const isOver = pg.overflowPx > 12;
                return (
                  <span
                    key={pg.pageNumber}
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10.5px] font-bold border tabular-nums ${
                      isOver
                        ? 'bg-red-500/15 border-red-400/50 text-red-700 dark:text-red-300'
                        : pg.fillPercent >= 90
                        ? 'bg-amber-500/15 border-amber-400/50 text-amber-800 dark:text-amber-200'
                        : 'bg-white/75 dark:bg-slate-800/75 border-slate-300/70 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <span>{isBn ? `পেইজ ${pg.pageNumber}` : `P${pg.pageNumber}`}:</span>
                    <span>{pg.fillPercent}%</span>
                    <span className="text-[10px] font-normal opacity-80">
                      ({isOver
                        ? isBn
                          ? `+${Math.round(pg.overflowPx / 3.78)}মিমি`
                          : `+${Math.round(pg.overflowPx / 3.78)}mm over`
                        : isBn
                        ? `${pg.remainingMm}মিমি বাকি`
                        : `${pg.remainingMm}mm left`}
                      )
                    </span>
                  </span>
                );
              })}

              {hasCustomPageFlow && (
                <button
                  type="button"
                  onClick={handleResetPageFlow}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10.5px] font-semibold hover:bg-slate-300 dark:hover:bg-slate-600 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{isBn ? 'ফ্লো রিসেট' : 'Reset Flow'}</span>
                </button>
              )}
            </div>
          </div>

          {markedSections.length > 0 && (
            <div className="glass-strip rounded-xl px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 border border-emerald-400/50 bg-emerald-50/70 dark:bg-emerald-950/35">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-200">
                <Check className="w-3.5 h-3.5" />
                <span>
                  {isBn
                    ? `${markedSections.length}টি অংশ মার্ক করা হয়েছে`
                    : `${markedSections.length} section${markedSections.length > 1 ? 's' : ''} marked`}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={handleMoveMarkedToPage2}
                  className="px-2.5 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1 cursor-pointer"
                >
                  <CornerDownRight className="w-3 h-3" />
                  <span>{isBn ? 'পেইজ ২-এ নিন' : 'Move to Page 2'}</span>
                </button>
                <button
                  type="button"
                  onClick={handlePullMarkedToPage1}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 dark:bg-slate-700 text-white hover:bg-slate-900 flex items-center gap-1 cursor-pointer"
                >
                  <CornerUpLeft className="w-3 h-3" />
                  <span>{isBn ? 'পেইজ ১-এ আনুন' : 'Pull to Page 1'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSpaceMarked(16)}
                  className="px-2 py-1 rounded-lg bg-white/80 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-white cursor-pointer"
                >
                  + {isBn ? 'স্পেস' : 'Space'}
                </button>
                <button
                  type="button"
                  onClick={() => handleSpaceMarked(-16)}
                  className="px-2 py-1 rounded-lg bg-white/80 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-white cursor-pointer"
                >
                  − {isBn ? 'স্পেস' : 'Space'}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteMarked}
                  className="px-2 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>{isBn ? 'ডিলিট' : 'Delete'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMarkedSections([])}
                  className="px-2 py-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                >
                  {isBn ? 'বাতিল' : 'Clear'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Scrollable Multi-Page CV Sheet Stage */}
      <div className="flex-1 flex flex-col items-center px-3 sm:px-6 pb-8 pt-2 overflow-auto">
        <div
          ref={stageRef}
          className="relative glass-stage p-2.5 sm:p-4 rounded-2xl transition-shadow"
        >
          {/* Floating Liquid Glass Zoom HUD */}
          {zoomHudVisible && (
            <div className="glass-hud pointer-events-none fixed bottom-20 right-6 z-40 px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-white flex items-center gap-1.5">
              <span>{Math.round(zoom * 100)}%</span>
            </div>
          )}

          {/* Scaled Multi-Page Container (Transparent outer wrapper so Page 1 & Page 2 show clearly) */}
          <div
            className="relative"
            style={{
              width: `${Math.round(paperDims.widthPx * zoom)}px`,
              minHeight: `${Math.round(sheetHeight * zoom)}px`,
            }}
          >
            <div
              ref={sheetMeasureRef}
              style={{
                width: `${paperDims.widthPx}px`,
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
              }}
            >
              <CvSheetRenderer
                data={cvData}
                interactive={!isFinalPreview}
                paginated={true}
                markedSections={markedSections}
                onEditField={(target) => setActiveField(target)}
                onAddExperience={handleAddExperience}
                onRemoveExperience={handleRemoveExperience}
                onAddEducation={handleAddEducation}
                onRemoveEducation={handleRemoveEducation}
                onAddTraining={handleAddTraining}
                onRemoveTraining={handleRemoveTraining}
                onAddReference={handleAddReference}
                onRemoveReference={handleRemoveReference}
                onToggleMarkSection={handleToggleMarkSection}
                onReorderSections={handleReorderSections}
                onMoveSectionDirection={handleMoveSectionDirection}
                onTogglePageBreak={handleTogglePageBreak}
                onAdjustSectionSpace={handleAdjustSectionSpace}
                onDeleteSection={handleDeleteSection}
                onHidePhoto={() => setCvData((p) => ({ ...p, hidePhoto: true }))}
                onHideSignature={() => setCvData((p) => ({ ...p, hideSignature: true }))}
                onDropOnPage={handleDropOnPage}
                onLayoutMetricsChange={setLayoutMetrics}
              />
            </div>
          </div>
        </div>

        {/* Universal Section Manager Bar (Show, Delete, or Restore Any CV Option) */}
        <div className="w-full max-w-[840px] mt-4 glass-strip rounded-2xl px-4 py-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              {isBn
                ? 'সিভির যেকোনো অপশন যোগ বা ডিলিট করুন:'
                : 'Show, delete, or restore any CV section:'}
            </span>
            {hasCustomPageFlow && (
              <button
                type="button"
                onClick={handleResetPageFlow}
                className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>{isBn ? 'অর্ডার রিসেট' : 'Reset Page Order'}</span>
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {activeSectionOrder.map((secKey) => {
              const hidden = (cvData.hiddenSections || []).includes(secKey);
              const isActive =
                !hidden &&
                !(secKey === 'languages' && !cvData.showLanguages) &&
                !(secKey === 'trainings' && !cvData.showTrainings) &&
                !(secKey === 'references' && !cvData.showReferences) &&
                !(secKey === 'passport' && !cvData.showPassportInfo) &&
                !(secKey === 'declaration' && cvData.hideDeclaration);
              const labelMap: Record<CvSectionKey, { bn: string; en: string }> = {
                objective: { bn: 'ক্যারিয়ার উদ্দেশ্য', en: 'Objective' },
                experience: { bn: 'অভিজ্ঞতা', en: 'Experience' },
                education: { bn: 'শিক্ষাগত যোগ্যতা', en: 'Education' },
                skills: { bn: 'দক্ষতা', en: 'Skills' },
                trainings: { bn: 'প্রশিক্ষণ', en: 'Training' },
                languages: { bn: 'ভাষা', en: 'Languages' },
                personal: { bn: 'ব্যক্তিগত তথ্য', en: 'Personal' },
                passport: { bn: 'পাসপোর্ট', en: 'Passport' },
                references: { bn: 'রেফারেন্স', en: 'References' },
                declaration: { bn: 'ঘোষণাপত্র', en: 'Declaration' },
                bangladeshContact: { bn: 'দেশে যোগাযোগ', en: 'BD Contact' },
                marriagePersonal: { bn: 'ব্যক্তিগত তথ্য', en: 'Personal' },
                marriageAddress: { bn: 'ঠিকানা', en: 'Address' },
                occupation: { bn: 'পেশা', en: 'Occupation' },
                familyInfo: { bn: 'পারিবারিক তথ্য', en: 'Family' },
                partnerExpectation: { bn: 'সঙ্গীর প্রত্যাশা', en: 'Partner' },
                guardianContact: { bn: 'অভিভাবক', en: 'Guardian' },
              };
              const lbl = labelMap[secKey];
              return (
                <div key={secKey} className="inline-flex items-center">
                  <button
                    type="button"
                    onClick={() => {
                      if (!isActive) {
                        handleRestoreSection(secKey);
                        setIsFinalPreview(false);
                      } else {
                        handleDeleteSection(secKey);
                      }
                    }}
                    className={`px-2.5 py-1 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition rounded-xl ${
                      isActive
                        ? 'bg-blue-600/12 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-400/40 hover:bg-red-500/12 hover:text-red-600 hover:border-red-300'
                        : 'glass-tile text-slate-600 dark:text-slate-300 opacity-80 hover:opacity-100'
                    }`}
                    title={
                      isActive
                        ? isBn
                          ? 'ডিলিট / বাদ দিন'
                          : 'Click to delete section'
                        : isBn
                        ? 'ফিরিয়ে আনুন'
                        : 'Click to add/restore'
                    }
                  >
                    {isActive ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                    <span>{isBn ? lbl.bn : lbl.en}</span>
                  </button>
                </div>
              );
            })}

            {/* Photo & Signature quick delete/restore pills */}
            <button
              type="button"
              onClick={() => setCvData((p) => ({ ...p, hidePhoto: !p.hidePhoto }))}
              className={`px-2.5 py-1 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition rounded-xl ${
                !cvData.hidePhoto
                  ? 'bg-blue-600/12 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-400/40 hover:bg-red-500/12 hover:text-red-600'
                  : 'glass-tile text-slate-600 dark:text-slate-300 opacity-80'
              }`}
            >
              {!cvData.hidePhoto ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
              <span>{isBn ? 'ছবি' : 'Photo'}</span>
            </button>
            <button
              type="button"
              onClick={() => setCvData((p) => ({ ...p, hideSignature: !p.hideSignature }))}
              className={`px-2.5 py-1 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition rounded-xl ${
                !cvData.hideSignature
                  ? 'bg-blue-600/12 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-400/40 hover:bg-red-500/12 hover:text-red-600'
                  : 'glass-tile text-slate-600 dark:text-slate-300 opacity-80'
              }`}
            >
              {!cvData.hideSignature ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
              <span>{isBn ? 'স্বাক্ষর' : 'Signature'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Floating Inline Field Editor Modal */}
      <CvFieldModal
        target={activeField}
        data={cvData}
        lang={lang}
        studioPhotos={studioPhotos}
        onChange={setCvData}
        onClose={() => setActiveField(null)}
        onNextField={handleNextField}
      />
    </div>
  );
};
