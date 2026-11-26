import React, { useRef, useState } from 'react';
import {
  Bold,
  Briefcase,
  Camera,
  FileDown,
  GraduationCap,
  Highlighter,
  Italic,
  LayoutGrid,
  Loader2,
  Palette,
  PenTool,
  Plus,
  Printer,
  RotateCcw,
  Sparkles,
  Trash2,
  Type,
  Underline,
  User,
  Zap,
} from 'lucide-react';
import {
  CvData,
  CvDensity,
  CvFontStyle,
  CvPaperSizeId,
  CvSectionKey,
  CvTemplateId,
} from '../../types/cv';
import {
  BLOOD_GROUP_OPTIONS,
  CV_ACCENT_COLORS,
  CV_EDUCATION_BOARD_GROUPS,
  CV_EDUCATION_EXAM_GROUPS,
  CV_EDUCATION_YEARS,
  CV_PAPER_SIZES,
  CV_QUICK_FILL_PRESETS,
  CV_TEMPLATES,
  MARITAL_STATUS_OPTIONS,
  RELIGION_OPTIONS,
  SKILL_SUGGESTIONS,
} from '../../utils/cvTemplates';
import {
  BANGLA_FONTS,
  BanglaFontId,
  DEFAULT_BANGLA_FONT,
  HIGHLIGHT_COLORS,
} from '../../utils/richText';
import { EducationSelectInput } from './EducationSelectInput';

interface CvControlsProps {
  lang: 'bn' | 'en';
  cvData: CvData;
  setCvData: React.Dispatch<React.SetStateAction<CvData>>;
  showGallery: boolean;
  setShowGallery: (show: boolean) => void;
  onPrintCv: () => void;
  onDownloadCvPdf: () => void;
  onResetCv: () => void;
  isExporting?: boolean;
}

type InspectorTab = 'design' | 'basic' | 'career' | 'personal';

export const CvControls: React.FC<CvControlsProps> = ({
  lang,
  cvData,
  setCvData,
  showGallery,
  setShowGallery,
  onPrintCv,
  onDownloadCvPdf,
  onResetCv,
  isExporting = false,
}) => {
  const isBn = lang === 'bn';
  const [activeTab, setActiveTab] = useState<InspectorTab>('basic');
  const [newSkill, setNewSkill] = useState('');
  const photoInputRef = useRef<HTMLInputElement>(null);

  const activeTemplateMeta =
    CV_TEMPLATES.find((t) => t.id === cvData.templateId) || CV_TEMPLATES[0];

  const handlePhotoUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      if (src) setCvData((prev) => ({ ...prev, photo: src }));
    };
    reader.readAsDataURL(file);
  };

  const applyQuickFill = (presetId: string) => {
    const preset = CV_QUICK_FILL_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setCvData((prev) => ({
      ...prev,
      ...preset.data,
    }));
  };

  return (
    <div className="space-y-4 text-slate-900 dark:text-slate-100">
      {/* Header & Template Gallery Button */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-white">
              {isBn ? 'সিভি / বায়োডাটা স্টুডিও' : 'CV & Biodata Studio'}
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {isBn ? activeTemplateMeta.nameBn : activeTemplateMeta.nameEn}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowGallery(!showGallery)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
              showGallery
                ? 'glass-btn-primary text-white'
                : 'glass-tile text-blue-600 dark:text-blue-400'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>{showGallery ? (isBn ? 'এডিটর' : 'Editor') : isBn ? '১৭টি ডিজাইন' : '17 Templates'}</span>
          </button>
        </div>

        {/* Direct Print & PDF Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={isExporting}
            onClick={onDownloadCvPdf}
            className="py-2 px-3 rounded-xl glass-btn-emerald text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-60"
          >
            {isExporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileDown className="w-3.5 h-3.5" />
            )}
            <span>{isBn ? 'PDF ডাউনলোড' : 'Save PDF'}</span>
          </button>
          <button
            type="button"
            onClick={onPrintCv}
            className="py-2 px-3 rounded-xl glass-btn-primary text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{isBn ? 'প্রিন্ট করুন' : 'Print CV'}</span>
          </button>
        </div>
      </div>

      {/* Inspector Section Tabs */}
      <div className="grid grid-cols-4 gap-1 glass-track p-1 rounded-xl">
        {(
          [
            ['basic', User, isBn ? 'মৌলিক' : 'Basic'],
            ['career', Briefcase, isBn ? 'শিক্ষা/কাজ' : 'Career'],
            ['personal', GraduationCap, isBn ? 'ব্যক্তিগত' : 'Personal'],
            ['design', Palette, isBn ? 'ডিজাইন' : 'Style'],
          ] as const
        ).map(([key, Icon, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`py-1.5 px-1 rounded-lg text-[11px] font-semibold flex flex-col items-center gap-0.5 transition cursor-pointer ${
              activeTab === key
                ? 'glass-tab-active text-blue-600 dark:text-blue-400'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="truncate">{label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: BASIC INFO & PHOTO */}
      {activeTab === 'basic' && (
        <div className="space-y-3">
          {/* Quick Fill Sample Selector */}
          <div className="p-2.5 rounded-xl glass-tile space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>{isBn ? 'দ্রুত নমুনা তথ্য বসান (Quick Fill)' : 'Quick Fill Sample Preset'}</span>
            </div>
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) applyQuickFill(e.target.value);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg glass-input text-xs cursor-pointer"
            >
              <option value="">
                {isBn ? '— রেডিমেড নমুনা সিলেক্ট করুন —' : '— Select ready sample data —'}
              </option>
              {CV_QUICK_FILL_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {isBn ? p.labelBn : p.labelEn}
                </option>
              ))}
            </select>
          </div>

          {/* Photo Upload Card */}
          <div className="p-3 rounded-xl glass-dropzone flex items-center gap-3">
            <div className="w-14 h-16 rounded-lg bg-white/80 dark:bg-slate-800 border border-slate-300/80 dark:border-white/15 overflow-hidden flex items-center justify-center shrink-0">
              {cvData.photo ? (
                <img src={cvData.photo} alt="CV Portrait" className="w-full h-full object-cover" />
              ) : (
                <Camera className="w-5 h-5 text-slate-400" />
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                {isBn ? 'সিভির ছবি (পাসপোর্ট)' : 'Candidate Portrait'}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="px-2.5 py-1 rounded-lg glass-btn-primary text-white text-[11px] font-semibold cursor-pointer"
                >
                  {cvData.photo
                    ? isBn
                      ? 'ছবি বদলান'
                      : 'Change'
                    : isBn
                    ? 'ছবি আপলোড'
                    : 'Upload'}
                </button>
                {cvData.photo && (
                  <button
                    type="button"
                    onClick={() => setCvData((prev) => ({ ...prev, photo: '' }))}
                    className="px-2 py-1 rounded-lg glass-tile text-red-600 dark:text-red-400 text-[11px] font-semibold cursor-pointer"
                  >
                    {isBn ? 'মুছুন' : 'Remove'}
                  </button>
                )}
              </div>
            </div>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handlePhotoUpload(e.target.files[0]);
                e.target.value = '';
              }}
            />
          </div>

          {/* Core Form Inputs */}
          <div className="space-y-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {isBn ? 'পুরো নাম' : 'Full Name'}
              </label>
              <input
                type="text"
                value={cvData.fullName}
                onChange={(e) => setCvData((p) => ({ ...p, fullName: e.target.value }))}
                placeholder={isBn ? 'যেমন: মো. রহিম উদ্দিন' : 'e.g. Md. Rahim Uddin'}
                className="w-full px-3 py-1.5 rounded-xl glass-input text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {isBn ? 'কোন পদের জন্য আবেদন' : 'Position / Job Title'}
              </label>
              <input
                type="text"
                value={cvData.jobTitle}
                onChange={(e) => setCvData((p) => ({ ...p, jobTitle: e.target.value }))}
                placeholder="Sales Executive / Software Engineer"
                className="w-full px-3 py-1.5 rounded-xl glass-input text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {isBn ? 'মোবাইল নম্বর' : 'Phone'}
                </label>
                <input
                  type="text"
                  value={cvData.phone}
                  onChange={(e) => setCvData((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="017XX-XXXXXX"
                  className="w-full px-2.5 py-1.5 rounded-xl glass-input text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {isBn ? 'ইমেইল' : 'Email'}
                </label>
                <input
                  type="email"
                  value={cvData.email}
                  onChange={(e) => setCvData((p) => ({ ...p, email: e.target.value }))}
                  placeholder="name@email.com"
                  className="w-full px-2.5 py-1.5 rounded-xl glass-input text-xs"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {isBn ? 'বর্তমান ঠিকানা' : 'Address'}
              </label>
              <input
                type="text"
                value={cvData.address}
                onChange={(e) => setCvData((p) => ({ ...p, address: e.target.value }))}
                placeholder="Dhaka / Chattogram, Bangladesh"
                className="w-full px-3 py-1.5 rounded-xl glass-input text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {isBn ? 'ক্যারিয়ার উদ্দেশ্য' : 'Career Objective'}
              </label>
              <textarea
                rows={3}
                value={cvData.careerObjective}
                onChange={(e) => setCvData((p) => ({ ...p, careerObjective: e.target.value }))}
                placeholder={isBn ? '২-৩ লাইনে উদ্দেশ্য লিখুন...' : 'Write 2-3 lines career summary...'}
                className="w-full px-3 py-1.5 rounded-xl glass-input text-xs leading-relaxed"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EXPERIENCE, EDUCATION & SKILLS */}
      {activeTab === 'career' && (
        <div className="space-y-4">
          {/* Experiences */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                {isBn ? 'কর্মঅভিজ্ঞতা' : 'Work Experience'}
              </span>
              <button
                type="button"
                onClick={() =>
                  setCvData((p) => ({
                    ...p,
                    experiences: [
                      ...p.experiences,
                      {
                        id: `exp-${Date.now()}`,
                        role: '',
                        company: '',
                        startDate: '',
                        endDate: 'Present',
                        description: '',
                      },
                    ],
                  }))
                }
                className="px-2 py-1 rounded-lg glass-tile text-[11px] font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>{isBn ? 'যোগ' : 'Add'}</span>
              </button>
            </div>
            {cvData.experiences.map((exp, idx) => (
              <div key={exp.id} className="p-2.5 rounded-xl glass-tile space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-slate-500">#{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setCvData((p) => ({
                        ...p,
                        experiences: p.experiences.filter((_, i) => i !== idx),
                      }))
                    }
                    className="text-red-500 hover:bg-red-500/10 p-1 rounded cursor-pointer"
                    title={isBn ? 'মুছে ফেলুন' : 'Delete'}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="text"
                    value={exp.role}
                    onChange={(e) =>
                      setCvData((p) => ({
                        ...p,
                        experiences: p.experiences.map((x, i) =>
                          i === idx ? { ...x, role: e.target.value } : x
                        ),
                      }))
                    }
                    placeholder={isBn ? 'পদবি' : 'Role'}
                    className="px-2 py-1 rounded-lg glass-input text-xs"
                  />
                  <input
                    type="text"
                    value={exp.company}
                    onChange={(e) =>
                      setCvData((p) => ({
                        ...p,
                        experiences: p.experiences.map((x, i) =>
                          i === idx ? { ...x, company: e.target.value } : x
                        ),
                      }))
                    }
                    placeholder={isBn ? 'প্রতিষ্ঠান' : 'Company'}
                    className="px-2 py-1 rounded-lg glass-input text-xs"
                  />
                  <input
                    type="text"
                    value={exp.startDate}
                    onChange={(e) =>
                      setCvData((p) => ({
                        ...p,
                        experiences: p.experiences.map((x, i) =>
                          i === idx ? { ...x, startDate: e.target.value } : x
                        ),
                      }))
                    }
                    placeholder={isBn ? 'শুরু (২০২২)' : 'Start'}
                    className="px-2 py-1 rounded-lg glass-input text-xs"
                  />
                  <input
                    type="text"
                    value={exp.endDate}
                    onChange={(e) =>
                      setCvData((p) => ({
                        ...p,
                        experiences: p.experiences.map((x, i) =>
                          i === idx ? { ...x, endDate: e.target.value } : x
                        ),
                      }))
                    }
                    placeholder="Present"
                    className="px-2 py-1 rounded-lg glass-input text-xs"
                  />
                </div>
                <textarea
                  rows={2}
                  value={exp.description}
                  onChange={(e) =>
                    setCvData((p) => ({
                      ...p,
                      experiences: p.experiences.map((x, i) =>
                        i === idx ? { ...x, description: e.target.value } : x
                      ),
                    }))
                  }
                  placeholder={isBn ? 'কাজের বিবরণ...' : 'Key duties...'}
                  className="w-full px-2 py-1 rounded-lg glass-input text-[11px]"
                />
              </div>
            ))}
          </div>

          {/* Education */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                {isBn ? 'শিক্ষাগত যোগ্যতা' : 'Education'}
              </span>
              <button
                type="button"
                onClick={() =>
                  setCvData((p) => ({
                    ...p,
                    educations: [
                      ...p.educations,
                      {
                        id: `edu-${Date.now()}`,
                        degree: '',
                        institution: '',
                        boardOrGroup: '',
                        year: '',
                        result: '',
                      },
                    ],
                  }))
                }
                className="px-2 py-1 rounded-lg glass-tile text-[11px] font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>{isBn ? 'যোগ' : 'Add'}</span>
              </button>
            </div>
            {cvData.educations.map((edu, idx) => (
              <div key={edu.id} className="p-2.5 rounded-xl glass-tile space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-slate-500">#{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setCvData((p) => ({
                        ...p,
                        educations: p.educations.filter((_, i) => i !== idx),
                      }))
                    }
                    className="text-red-500 hover:bg-red-500/10 p-1 rounded cursor-pointer"
                    title={isBn ? 'মুছে ফেলুন' : 'Delete'}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <EducationSelectInput
                  value={edu.degree}
                  onChange={(val) =>
                    setCvData((p) => ({
                      ...p,
                      educations: p.educations.map((x, i) =>
                        i === idx ? { ...x, degree: val } : x
                      ),
                    }))
                  }
                  groups={CV_EDUCATION_EXAM_GROUPS}
                  lang={lang}
                  compact
                  placeholder={isBn ? 'পরীক্ষা / ডিগ্রি' : 'Exam / Degree'}
                  emptyOptionLabel={isBn ? '— পরীক্ষা বা ডিগ্রি বাছুন —' : '— Select Exam / Degree —'}
                />
                <input
                  type="text"
                  value={edu.institution}
                  onChange={(e) =>
                    setCvData((p) => ({
                      ...p,
                      educations: p.educations.map((x, i) =>
                        i === idx ? { ...x, institution: e.target.value } : x
                      ),
                    }))
                  }
                  placeholder={isBn ? 'প্রতিষ্ঠান / স্কুল / কলেজ' : 'Institution / College / University'}
                  className="w-full px-2 py-1 rounded-lg glass-input text-xs"
                />
                <EducationSelectInput
                  value={edu.boardOrGroup}
                  onChange={(val) =>
                    setCvData((p) => ({
                      ...p,
                      educations: p.educations.map((x, i) =>
                        i === idx ? { ...x, boardOrGroup: val } : x
                      ),
                    }))
                  }
                  groups={CV_EDUCATION_BOARD_GROUPS}
                  lang={lang}
                  compact
                  placeholder={isBn ? 'বোর্ড / বিভাগ' : 'Board / Group'}
                  emptyOptionLabel={isBn ? '— বোর্ড / বিভাগ বাছুন —' : '— Select Board / Group —'}
                />
                <div className="grid grid-cols-2 gap-1.5">
                  <EducationSelectInput
                    value={edu.year}
                    onChange={(val) =>
                      setCvData((p) => ({
                        ...p,
                        educations: p.educations.map((x, i) =>
                          i === idx ? { ...x, year: val } : x
                        ),
                      }))
                    }
                    flatOptions={CV_EDUCATION_YEARS}
                    lang={lang}
                    compact
                    placeholder={isBn ? 'সাল' : 'Year'}
                    emptyOptionLabel={isBn ? '— সাল (১৯৮০–২০৫০) —' : '— Year (1980–2050) —'}
                  />
                  <input
                    type="text"
                    value={edu.result}
                    onChange={(e) =>
                      setCvData((p) => ({
                        ...p,
                        educations: p.educations.map((x, i) =>
                          i === idx ? { ...x, result: e.target.value } : x
                        ),
                      }))
                    }
                    placeholder="GPA / Result"
                    className="px-2 py-1 rounded-lg glass-input text-[11px]"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Skills Quick Editor */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
              {isBn ? 'দক্ষতা (Skills)' : 'Skills'}
            </span>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newSkill.trim()) {
                    e.preventDefault();
                    setCvData((p) => ({
                      ...p,
                      skills: p.skills.includes(newSkill.trim())
                        ? p.skills
                        : [...p.skills, newSkill.trim()],
                    }));
                    setNewSkill('');
                  }
                }}
                placeholder={isBn ? 'দক্ষতা লিখে Enter...' : 'Add skill + Enter...'}
                className="flex-1 px-2.5 py-1.5 rounded-xl glass-input text-xs"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newSkill.trim()) return;
                  setCvData((p) => ({
                    ...p,
                    skills: p.skills.includes(newSkill.trim())
                      ? p.skills
                      : [...p.skills, newSkill.trim()],
                  }));
                  setNewSkill('');
                }}
                className="px-2.5 py-1 rounded-xl glass-btn-primary text-white text-xs font-bold cursor-pointer"
              >
                +
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {SKILL_SUGGESTIONS.slice(0, 8).map((sk) => {
                const active = cvData.skills.includes(sk);
                return (
                  <button
                    key={sk}
                    type="button"
                    onClick={() =>
                      setCvData((p) => ({
                        ...p,
                        skills: active ? p.skills.filter((s) => s !== sk) : [...p.skills, sk],
                      }))
                    }
                    className={`px-2 py-0.5 rounded-lg text-[10.5px] font-medium cursor-pointer transition ${
                      active
                        ? 'glass-btn-primary text-white'
                        : 'glass-tile text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {sk}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PERSONAL, PASSPORT & FAMILY */}
      {activeTab === 'personal' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {isBn ? 'পিতার নাম' : "Father's Name"}
              </label>
              <input
                type="text"
                value={cvData.fatherName}
                onChange={(e) => setCvData((p) => ({ ...p, fatherName: e.target.value }))}
                className="w-full px-2.5 py-1.5 rounded-xl glass-input text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {isBn ? 'মাতার নাম' : "Mother's Name"}
              </label>
              <input
                type="text"
                value={cvData.motherName}
                onChange={(e) => setCvData((p) => ({ ...p, motherName: e.target.value }))}
                className="w-full px-2.5 py-1.5 rounded-xl glass-input text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {isBn ? 'জন্ম তারিখ' : 'Date of Birth'}
              </label>
              <input
                type="text"
                value={cvData.dateOfBirth}
                onChange={(e) => setCvData((p) => ({ ...p, dateOfBirth: e.target.value }))}
                placeholder="15 March 1998"
                className="w-full px-2.5 py-1.5 rounded-xl glass-input text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {isBn ? 'জাতীয় পরিচয়পত্র' : 'National ID'}
              </label>
              <input
                type="text"
                value={cvData.nationalId}
                onChange={(e) => setCvData((p) => ({ ...p, nationalId: e.target.value }))}
                className="w-full px-2.5 py-1.5 rounded-xl glass-input text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {isBn ? 'ধর্ম' : 'Religion'}
              </label>
              <select
                value={cvData.religion}
                onChange={(e) => setCvData((p) => ({ ...p, religion: e.target.value }))}
                className="w-full px-2 py-1.5 rounded-xl glass-input text-xs cursor-pointer"
              >
                <option value="">—</option>
                {RELIGION_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {isBn ? 'বৈবাহিক অবস্থা' : 'Marital Status'}
              </label>
              <select
                value={cvData.maritalStatus}
                onChange={(e) => setCvData((p) => ({ ...p, maritalStatus: e.target.value }))}
                className="w-full px-2 py-1.5 rounded-xl glass-input text-xs cursor-pointer"
              >
                <option value="">—</option>
                {MARITAL_STATUS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {isBn ? 'রক্তের গ্রুপ' : 'Blood Group'}
              </label>
              <select
                value={cvData.bloodGroup}
                onChange={(e) => setCvData((p) => ({ ...p, bloodGroup: e.target.value }))}
                className="w-full px-2 py-1.5 rounded-xl glass-input text-xs cursor-pointer"
              >
                <option value="">—</option>
                {BLOOD_GROUP_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {isBn ? 'জাতীয়তা' : 'Nationality'}
              </label>
              <input
                type="text"
                value={cvData.nationality}
                onChange={(e) => setCvData((p) => ({ ...p, nationality: e.target.value }))}
                className="w-full px-2.5 py-1.5 rounded-xl glass-input text-xs"
              />
            </div>
          </div>

          {/* Passport / Abroad Block */}
          {(cvData.templateId === 'abroad-visa' ||
            cvData.templateId === 'abroad-gulf' ||
            cvData.showPassportInfo) && (
            <div className="p-2.5 rounded-xl glass-tile space-y-2">
              <div className="text-xs font-bold text-blue-600 dark:text-blue-400">
                {isBn ? 'পাসপোর্ট তথ্য (বিদেশ CV)' : 'Passport Info (Abroad CV)'}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="text"
                  value={cvData.passportNo}
                  onChange={(e) => setCvData((p) => ({ ...p, passportNo: e.target.value }))}
                  placeholder={isBn ? 'পাসপোর্ট নং' : 'Passport No.'}
                  className="px-2 py-1.5 rounded-lg glass-input text-xs"
                />
                <input
                  type="text"
                  value={cvData.passportIssuePlace}
                  onChange={(e) => setCvData((p) => ({ ...p, passportIssuePlace: e.target.value }))}
                  placeholder={isBn ? 'ইস্যু স্থান' : 'Issue Place'}
                  className="px-2 py-1.5 rounded-lg glass-input text-xs"
                />
                <input
                  type="text"
                  value={cvData.passportIssueDate}
                  onChange={(e) => setCvData((p) => ({ ...p, passportIssueDate: e.target.value }))}
                  placeholder={isBn ? 'ইস্যু তারিখ' : 'Issue Date'}
                  className="px-2 py-1.5 rounded-lg glass-input text-xs"
                />
                <input
                  type="text"
                  value={cvData.passportExpiryDate}
                  onChange={(e) => setCvData((p) => ({ ...p, passportExpiryDate: e.target.value }))}
                  placeholder={isBn ? 'মেয়াদ তারিখ' : 'Expiry Date'}
                  className="px-2 py-1.5 rounded-lg glass-input text-xs"
                />
              </div>
            </div>
          )}

          {/* Typed Signature Quick Box */}
          <div className="p-2.5 rounded-xl glass-tile space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
              <PenTool className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>{isBn ? 'স্বাক্ষর টেক্সট (বা পেজে ক্লিক করে আঁকুন)' : 'Typed Signature (or click sheet to draw)'}</span>
            </div>
            <input
              type="text"
              value={cvData.signatureText}
              onChange={(e) => setCvData((p) => ({ ...p, signatureText: e.target.value }))}
              placeholder={cvData.fullName || (isBn ? 'স্বাক্ষরের নাম' : 'Signature name')}
              className="w-full px-2.5 py-1.5 rounded-lg glass-input text-xs"
            />
          </div>
        </div>
      )}

      {/* TAB 4: DESIGN, TEMPLATES, COLOR & LANGUAGE */}
      {activeTab === 'design' && (
        <div className="space-y-3.5">
          {/* Quick Template Picker Dropdown */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              {isBn ? 'সিভি টেমপ্লেট (১৭টি ডিজাইন):' : 'CV Template (17 Designs):'}
            </label>
            <select
              value={cvData.templateId}
              onChange={(e) => {
                const nextId = e.target.value as CvTemplateId;
                const meta = CV_TEMPLATES.find((t) => t.id === nextId);
                setCvData((p) => ({
                  ...p,
                  templateId: nextId,
                  accentColor: meta?.defaultAccent || p.accentColor,
                }));
              }}
              className="w-full px-3 py-2 rounded-xl glass-input text-xs cursor-pointer"
            >
              {CV_TEMPLATES.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {isBn ? tpl.nameBn : tpl.nameEn}
                </option>
              ))}
            </select>
          </div>

          {/* Paper Size Selector (Matches multi-page preview, PDF & Print) */}
          <div className="glass-tile rounded-xl p-2.5 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-200">
              <span>{isBn ? 'পেইজ / কাগজের সাইজ' : 'Paper Size'}</span>
              <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400">
                {(cvData.paperSize || 'a4').toUpperCase()}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {CV_PAPER_SIZES.map((ps) => {
                const active = (cvData.paperSize || 'a4') === ps.id;
                return (
                  <button
                    key={ps.id}
                    type="button"
                    onClick={() =>
                      setCvData((p) => ({
                        ...p,
                        paperSize: ps.id as CvPaperSizeId,
                      }))
                    }
                    className={`py-1.5 px-1.5 rounded-lg text-[10.5px] font-bold cursor-pointer transition ${
                      active
                        ? 'glass-btn-primary text-white'
                        : 'glass-tile text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {ps.id === 'custom' ? (isBn ? 'কাস্টম' : 'Custom') : ps.id.toUpperCase()}
                  </button>
                );
              })}
            </div>
            {(cvData.paperSize || 'a4') === 'custom' && (
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">
                    {isBn ? 'প্রস্থ (mm)' : 'Width (mm)'}
                  </label>
                  <input
                    type="number"
                    min={100}
                    max={450}
                    value={cvData.customPaperWidthMm ?? 210}
                    onChange={(e) =>
                      setCvData((p) => ({
                        ...p,
                        customPaperWidthMm: Math.max(100, Math.min(450, Number(e.target.value) || 210)),
                      }))
                    }
                    className="w-full px-2 py-1 rounded-lg glass-input text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">
                    {isBn ? 'উচ্চতা (mm)' : 'Height (mm)'}
                  </label>
                  <input
                    type="number"
                    min={120}
                    max={600}
                    value={cvData.customPaperHeightMm ?? 297}
                    onChange={(e) =>
                      setCvData((p) => ({
                        ...p,
                        customPaperHeightMm: Math.max(120, Math.min(600, Number(e.target.value) || 297)),
                      }))
                    }
                    className="w-full px-2 py-1 rounded-lg glass-input text-xs font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* CV Heading Language */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              {isBn ? 'সিভির ভাষা:' : 'CV Document Language:'}
            </label>
            <div className="grid grid-cols-2 gap-1 glass-track p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setCvData((p) => ({ ...p, cvLang: 'en' }))}
                className={`py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
                  cvData.cvLang === 'en'
                    ? 'glass-btn-primary text-white'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setCvData((p) => ({ ...p, cvLang: 'bn' }))}
                className={`py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
                  cvData.cvLang === 'bn'
                    ? 'glass-btn-primary text-white'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                বাংলা
              </button>
            </div>
          </div>

          {/* Accent Color Swatches */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              {isBn ? 'থিম রঙ (Accent Color):' : 'Accent Color:'}
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {CV_ACCENT_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setCvData((p) => ({ ...p, accentColor: c.hex }))}
                  className={`w-7 h-7 rounded-full border-2 transition cursor-pointer ${
                    cvData.accentColor === c.hex
                      ? 'scale-110 border-slate-900 dark:border-white ring-2 ring-blue-400'
                      : 'border-white/70'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          {/* Bangla Font Family, Font Size & Rich Text Style (Default: SolaimanLipi) */}
          <div className="glass-tile rounded-xl p-3 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-100">
              <Type className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>{isBn ? 'বাংলা ফন্ট ও ফরম্যাটিং' : 'Bangla Font & Formatting'}</span>
            </div>
            <select
              value={cvData.banglaFont || DEFAULT_BANGLA_FONT}
              onChange={(e) =>
                setCvData((p) => ({ ...p, banglaFont: e.target.value as BanglaFontId }))
              }
              className="w-full px-3 py-2 rounded-xl glass-input text-xs font-semibold cursor-pointer"
            >
              {BANGLA_FONTS.map((f) => (
                <option
                  key={f.id}
                  value={f.id}
                  style={{ fontFamily: f.fontFamily }}
                  className="text-slate-900 bg-white"
                >
                  {isBn ? f.nameBn : f.nameEn}
                </option>
              ))}
            </select>

            {/* Font Size Slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-semibold">
                <span className="text-slate-600 dark:text-slate-300">
                  {isBn ? 'লেখার সাইজ (Font Size)' : 'Font Size'}
                </span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                  {cvData.fontSizePx || 13}px
                </span>
              </div>
              <input
                type="range"
                min={10}
                max={22}
                step={0.5}
                value={cvData.fontSizePx || 13}
                onChange={(e) =>
                  setCvData((p) => ({ ...p, fontSizePx: Number(e.target.value) }))
                }
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>

            {/* Manual Bold / Italic / Underline */}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setCvData((p) => ({ ...p, textBold: !p.textBold }))}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition ${
                  cvData.textBold
                    ? 'glass-btn-primary text-white'
                    : 'glass-tile text-slate-700 dark:text-slate-200'
                }`}
              >
                <Bold className="w-3.5 h-3.5" />
                <span>{isBn ? 'বোল্ড' : 'Bold'}</span>
              </button>
              <button
                type="button"
                onClick={() => setCvData((p) => ({ ...p, textItalic: !p.textItalic }))}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition ${
                  cvData.textItalic
                    ? 'glass-btn-primary text-white'
                    : 'glass-tile text-slate-700 dark:text-slate-200'
                }`}
              >
                <Italic className="w-3.5 h-3.5" />
                <span>{isBn ? 'ইটালিক' : 'Italic'}</span>
              </button>
              <button
                type="button"
                onClick={() => setCvData((p) => ({ ...p, textUnderline: !p.textUnderline }))}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition ${
                  cvData.textUnderline
                    ? 'glass-btn-primary text-white'
                    : 'glass-tile text-slate-700 dark:text-slate-200'
                }`}
              >
                <Underline className="w-3.5 h-3.5" />
                <span>{isBn ? 'আন্ডারলাইন' : 'Underline'}</span>
              </button>
            </div>

            {/* Highlighter Swatches */}
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                <Highlighter className="w-3.5 h-3.5 text-amber-500" />
                <span>{isBn ? 'হাইলাইটার:' : 'Highlighter:'}</span>
              </span>
              <div className="flex items-center gap-1.5">
                {HIGHLIGHT_COLORS.map((c) => {
                  const selected = (cvData.textHighlight || 'none') === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCvData((p) => ({ ...p, textHighlight: c.id }))}
                      className={`w-5 h-5 rounded-full border transition cursor-pointer flex items-center justify-center text-[10px] font-bold ${
                        selected
                          ? 'ring-2 ring-blue-500 scale-110 border-slate-900'
                          : 'border-slate-300 dark:border-white/25 hover:scale-110'
                      }`}
                      style={{
                        backgroundColor: c.id === 'none' ? '#ffffff' : c.hex,
                        color: '#0f172a',
                      }}
                      title={isBn ? c.labelBn : c.labelEn}
                    >
                      {c.id === 'none' ? '✕' : ''}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* English Font Style */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              {isBn ? 'ইংরেজি ফন্ট স্টাইল:' : 'English Typography Style:'}
            </label>
            <div className="grid grid-cols-3 gap-1 glass-track p-1 rounded-xl">
              {(
                [
                  ['serif', isBn ? 'ফরমাল' : 'Serif'],
                  ['sans', isBn ? 'মডার্ন' : 'Modern'],
                  ['classic', isBn ? 'ক্লাসিক' : 'Classic'],
                ] as [CvFontStyle, string][]
              ).map(([fs, label]) => (
                <button
                  key={fs}
                  type="button"
                  onClick={() => setCvData((p) => ({ ...p, fontStyle: fs }))}
                  className={`py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
                    cvData.fontStyle === fs
                      ? 'glass-btn-primary text-white'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Spacing Density */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              {isBn ? 'পাতার ঘনত্ব (Spacing):' : 'Page Spacing:'}
            </label>
            <div className="grid grid-cols-3 gap-1 glass-track p-1 rounded-xl">
              {(
                [
                  ['compact', isBn ? '১ পাতা' : 'Compact'],
                  ['normal', isBn ? 'স্বাভাবিক' : 'Normal'],
                  ['spacious', isBn ? 'খোলামেলা' : 'Spacious'],
                ] as [CvDensity, string][]
              ).map(([den, label]) => (
                <button
                  key={den}
                  type="button"
                  onClick={() => setCvData((p) => ({ ...p, density: den }))}
                  className={`py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
                    cvData.density === den
                      ? 'glass-btn-primary text-white'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Universal Section Delete / Restore Toggles */}
          <div className="glass-tile rounded-xl p-2.5 space-y-2">
            <div className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
              {isBn ? 'যেকোনো সেকশন রাখুন বা বাদ দিন' : 'Show / Delete Any Section'}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { key: 'objective', bn: 'উদ্দেশ্য', en: 'Objective' },
                  { key: 'experience', bn: 'অভিজ্ঞতা', en: 'Experience' },
                  { key: 'education', bn: 'শিক্ষা', en: 'Education' },
                  { key: 'skills', bn: 'দক্ষতা', en: 'Skills' },
                  { key: 'personal', bn: 'ব্যক্তিগত', en: 'Personal' },
                  { key: 'declaration', bn: 'ঘোষণাপত্র', en: 'Declaration' },
                ] as { key: CvSectionKey; bn: string; en: string }[]
              ).map((sec) => {
                const isHidden = (cvData.hiddenSections || []).includes(sec.key);
                return (
                  <button
                    key={sec.key}
                    type="button"
                    onClick={() =>
                      setCvData((p) => {
                        const prev = p.hiddenSections || [];
                        return {
                          ...p,
                          hiddenSections: prev.includes(sec.key)
                            ? prev.filter((k) => k !== sec.key)
                            : [...prev, sec.key],
                        };
                      })
                    }
                    className={`px-2 py-1 rounded-lg text-[10.5px] font-semibold cursor-pointer transition ${
                      isHidden
                        ? 'glass-tile text-slate-400 line-through'
                        : 'bg-blue-600/12 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-400/40'
                    }`}
                  >
                    {isHidden ? '+ ' : '✓ '}
                    {isBn ? sec.bn : sec.en}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setCvData((p) => ({ ...p, hidePhoto: !p.hidePhoto }))}
                className={`px-2 py-1 rounded-lg text-[10.5px] font-semibold cursor-pointer transition ${
                  cvData.hidePhoto
                    ? 'glass-tile text-slate-400 line-through'
                    : 'bg-blue-600/12 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-400/40'
                }`}
              >
                {cvData.hidePhoto ? '+ ' : '✓ '}
                {isBn ? 'ছবি' : 'Photo'}
              </button>
              <button
                type="button"
                onClick={() => setCvData((p) => ({ ...p, hideSignature: !p.hideSignature }))}
                className={`px-2 py-1 rounded-lg text-[10.5px] font-semibold cursor-pointer transition ${
                  cvData.hideSignature
                    ? 'glass-tile text-slate-400 line-through'
                    : 'bg-blue-600/12 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-400/40'
                }`}
              >
                {cvData.hideSignature ? '+ ' : '✓ '}
                {isBn ? 'স্বাক্ষর' : 'Signature'}
              </button>
            </div>
          </div>

          {/* Reset CV */}
          <button
            type="button"
            onClick={onResetCv}
            className="w-full py-2 px-3 rounded-xl glass-tile text-red-600 dark:text-red-400 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isBn ? 'সিভির সব তথ্য মুছে নতুন শুরু করুন' : 'Clear All CV Fields'}</span>
          </button>
        </div>
      )}

      {/* Helpful tip */}
      <div className="p-2.5 rounded-xl glass-banner text-[11px] text-slate-600 dark:text-slate-300 flex items-start gap-2">
        <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <span>
          {isBn
            ? 'ডান পাশের সিভি পেজের যেকোনো হলুদ ঘরে সরাসরি ক্লিক করেও নাম, ছবি, শিক্ষা বা অভিজ্ঞতা বসাতে পারবেন।'
            : 'Click any highlighted field directly on the A4 CV sheet on the right for instant inline editing.'}
        </span>
      </div>
    </div>
  );
};
