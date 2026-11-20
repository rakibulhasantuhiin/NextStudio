import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
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
  CvTemplateId,
} from '../../types/cv';
import { StudioPhotoItem } from '../../types';
import {
  CV_ACCENT_COLORS,
  CV_QUICK_FILL_PRESETS,
  CV_TEMPLATES,
  createEmptyCvData,
} from '../../utils/cvTemplates';
import { CvFieldModal } from './CvFieldModal';
import { CvSheetRenderer } from './CvSheetRenderer';
import { CvTemplateGallery } from './CvTemplateGallery';

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
  const [sheetHeight, setSheetHeight] = useState(1123);

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
      const h = Math.max(1123, Math.ceil(node.scrollHeight));
      setSheetHeight(h);
    };
    updateHeight();
    const ro = new ResizeObserver(updateHeight);
    ro.observe(node);
    return () => ro.disconnect();
  }, [showGallery, cvData, isFinalPreview]);

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
  const estimatedPages = sheetHeight > 1145 ? 2 : 1;

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
    setCvData((prev) =>
      createEmptyCvData(prev.templateId, prev.cvLang)
    );
    setShowQuickFillMenu(false);
  };

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
      <div className="sticky top-0 z-20 px-3 sm:px-5 pt-3 pb-2">
        <div className="glass-strip rounded-2xl px-2.5 sm:px-3.5 py-2 flex flex-wrap items-center justify-between gap-2">
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
                  <div className="glass-dropdown absolute left-0 mt-2 w-72 rounded-2xl p-3.5 z-40 space-y-3.5 text-xs">
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
                      <div className="glass-dropdown absolute left-0 mt-2 w-56 rounded-2xl py-1.5 z-40">
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
                  <div className="glass-dropdown absolute left-0 mt-2 w-60 rounded-2xl py-1.5 z-40 text-xs">
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

            {/* Page Count Indicator */}
            <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/12 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
              ✓ {estimatedPages === 1 ? (isBn ? '১ পাতা' : '1 Page') : isBn ? '২ পাতা' : '2 Pages'}
            </span>
          </div>

          {/* Right Group: Zoom Controls + Final Preview + PDF + Print */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Zoom Controls & Wheel Toggle */}
            <div className="hidden sm:flex items-center gap-0.5 glass-track p-0.5 rounded-xl">
              <button
                type="button"
                onClick={() => setScrollZoomEnabled((v) => !v)}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
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
                onClick={() => setZoom((z) => Math.max(0.4, Math.round((z - 0.1) * 100) / 100))}
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-white/10 cursor-pointer"
                title={isBn ? 'জুম আউট' : 'Zoom Out'}
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-200 px-1 min-w-[40px] text-center tabular-nums">
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

            {/* Save PDF Button */}
            <button
              type="button"
              onClick={onDownloadCvPdf}
              disabled={isExporting}
              className="glass-btn-emerald px-3 py-1.5 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {isExporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileDown className="w-3.5 h-3.5" />
              )}
              <span>PDF</span>
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={onPrintCv}
              className="glass-btn-primary px-3 py-1.5 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isBn ? 'প্রিন্ট' : 'Print'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Inline Click Hint Strip */}
      {!isFinalPreview && (
        <div className="px-3 sm:px-5 pb-2">
          <div className="glass-banner rounded-xl px-3.5 py-1.5 text-[11px] font-medium text-slate-700 dark:text-slate-200 flex items-center justify-between gap-2">
            <span>
              {isBn
                ? '💡 সিভির যেকোনো হলুদ ঘরে বা লেখায় ক্লিক করে সরাসরি লিখুন, ছবি ও স্বাক্ষর বসান। পেজের উপর মাউস স্ক্রল করে জুম ইন/আউট করা যাবে।'
                : '💡 Click any highlighted field on the CV sheet to edit directly, add your photo & signature, or scroll over the page to zoom in/out.'}
            </span>
          </div>
        </div>
      )}

      {/* Main Scrollable A4 CV Sheet Stage */}
      <div className="flex-1 flex flex-col items-center px-3 sm:px-6 pb-8 pt-2 overflow-auto">
        <div
          ref={stageRef}
          className="relative glass-stage p-2.5 sm:p-3.5 rounded-2xl transition-shadow"
        >
          {/* Floating Liquid Glass Zoom HUD */}
          {zoomHudVisible && (
            <div className="glass-hud pointer-events-none fixed bottom-20 right-6 z-40 px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-white flex items-center gap-1.5">
              <span>{Math.round(zoom * 100)}%</span>
            </div>
          )}

          {/* Scaled A4 Container */}
          <div
            className="relative bg-white rounded-lg overflow-hidden shadow-sm"
            style={{
              width: `${Math.round(794 * zoom)}px`,
              minHeight: `${Math.round(sheetHeight * zoom)}px`,
            }}
          >
            <div
              ref={sheetMeasureRef}
              style={{
                width: '794px',
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
              }}
            >
              <CvSheetRenderer
                data={cvData}
                interactive={!isFinalPreview}
                onEditField={(target) => setActiveField(target)}
                onAddExperience={handleAddExperience}
                onRemoveExperience={handleRemoveExperience}
                onAddEducation={handleAddEducation}
                onRemoveEducation={handleRemoveEducation}
                onAddTraining={handleAddTraining}
                onRemoveTraining={handleRemoveTraining}
                onAddReference={handleAddReference}
                onRemoveReference={handleRemoveReference}
              />
            </div>
          </div>
        </div>

        {/* Optional Sections Bar Below CV Sheet (Matching Screenshot 2) */}
        <div className="w-full max-w-[820px] mt-4 glass-strip rounded-2xl px-4 py-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 mr-1">
            {isBn ? 'দরকার হলে যোগ করুন:' : 'Add optional sections:'}
          </span>

          {/* Languages */}
          <div className="inline-flex items-center">
            <button
              type="button"
              onClick={() => {
                setCvData((p) => ({ ...p, showLanguages: true }));
                setIsFinalPreview(false);
                setActiveField({ type: 'languages' });
              }}
              className={`px-3 py-1.5 text-xs font-semibold flex items-center gap-1 cursor-pointer transition ${
                cvData.showLanguages
                  ? 'rounded-l-xl bg-blue-600/12 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-400/40'
                  : 'rounded-xl glass-tile text-slate-700 dark:text-slate-200'
              }`}
            >
              {cvData.showLanguages ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
              <span>{isBn ? 'ভাষা' : 'Languages'}</span>
            </button>
            {cvData.showLanguages && (
              <button
                type="button"
                onClick={() => setCvData((p) => ({ ...p, showLanguages: false }))}
                className="px-1.5 py-1.5 rounded-r-xl bg-blue-600/12 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-l-0 border-blue-400/40 hover:bg-red-500/15 hover:text-red-600 cursor-pointer"
                title={isBn ? 'লুকান' : 'Hide section'}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Training & Certificates */}
          <div className="inline-flex items-center">
            <button
              type="button"
              onClick={() => {
                if (cvData.trainings.length === 0) {
                  handleAddTraining();
                } else {
                  setCvData((p) => ({ ...p, showTrainings: true }));
                  setIsFinalPreview(false);
                  setActiveField({ type: 'training', index: 0 });
                }
              }}
              className={`px-3 py-1.5 text-xs font-semibold flex items-center gap-1 cursor-pointer transition ${
                cvData.showTrainings
                  ? 'rounded-l-xl bg-blue-600/12 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-400/40'
                  : 'rounded-xl glass-tile text-slate-700 dark:text-slate-200'
              }`}
            >
              {cvData.showTrainings ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
              <span>{isBn ? 'প্রশিক্ষণ ও সনদ' : 'Training & Certificates'}</span>
            </button>
            {cvData.showTrainings && (
              <button
                type="button"
                onClick={() => setCvData((p) => ({ ...p, showTrainings: false }))}
                className="px-1.5 py-1.5 rounded-r-xl bg-blue-600/12 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-l-0 border-blue-400/40 hover:bg-red-500/15 hover:text-red-600 cursor-pointer"
                title={isBn ? 'লুকান' : 'Hide section'}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* References */}
          <div className="inline-flex items-center">
            <button
              type="button"
              onClick={() => {
                if (cvData.references.length === 0) {
                  handleAddReference();
                } else {
                  setCvData((p) => ({ ...p, showReferences: true }));
                  setIsFinalPreview(false);
                  setActiveField({ type: 'reference', index: 0 });
                }
              }}
              className={`px-3 py-1.5 text-xs font-semibold flex items-center gap-1 cursor-pointer transition ${
                cvData.showReferences
                  ? 'rounded-l-xl bg-blue-600/12 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-400/40'
                  : 'rounded-xl glass-tile text-slate-700 dark:text-slate-200'
              }`}
            >
              {cvData.showReferences ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
              <span>{isBn ? 'রেফারেন্স' : 'References'}</span>
            </button>
            {cvData.showReferences && (
              <button
                type="button"
                onClick={() => setCvData((p) => ({ ...p, showReferences: false }))}
                className="px-1.5 py-1.5 rounded-r-xl bg-blue-600/12 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-l-0 border-blue-400/40 hover:bg-red-500/15 hover:text-red-600 cursor-pointer"
                title={isBn ? 'লুকান' : 'Hide section'}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Passport Details (Abroad / Gulf) */}
          <div className="inline-flex items-center">
            <button
              type="button"
              onClick={() => {
                setCvData((p) => ({ ...p, showPassportInfo: true }));
                setIsFinalPreview(false);
                setActiveField({ type: 'passport', field: 'passportNo' });
              }}
              className={`px-3 py-1.5 text-xs font-semibold flex items-center gap-1 cursor-pointer transition ${
                cvData.showPassportInfo
                  ? 'rounded-l-xl bg-blue-600/12 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-400/40'
                  : 'rounded-xl glass-tile text-slate-700 dark:text-slate-200'
              }`}
            >
              {cvData.showPassportInfo ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
              <span>{isBn ? 'পাসপোর্ট তথ্য' : 'Passport Details'}</span>
            </button>
            {cvData.showPassportInfo && (
              <button
                type="button"
                onClick={() => setCvData((p) => ({ ...p, showPassportInfo: false }))}
                className="px-1.5 py-1.5 rounded-r-xl bg-blue-600/12 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-l-0 border-blue-400/40 hover:bg-red-500/15 hover:text-red-600 cursor-pointer"
                title={isBn ? 'লুকান' : 'Hide section'}
              >
                <X className="w-3 h-3" />
              </button>
            )}
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
