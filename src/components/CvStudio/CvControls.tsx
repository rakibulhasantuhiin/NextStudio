import React, { useRef, useState } from 'react';
import {
  Briefcase,
  Camera,
  FileDown,
  GraduationCap,
  LayoutGrid,
  Loader2,
  Palette,
  PenTool,
  Plus,
  Printer,
  RotateCcw,
  Sparkles,
  Trash2,
  User,
  Zap,
} from 'lucide-react';
import { CvData, CvDensity, CvFontStyle, CvTemplateId } from '../../types/cv';
import {
  BLOOD_GROUP_OPTIONS,
  CV_ACCENT_COLORS,
  CV_QUICK_FILL_PRESETS,
  CV_TEMPLATES,
  MARITAL_STATUS_OPTIONS,
  RELIGION_OPTIONS,
  SKILL_SUGGESTIONS,
} from '../../utils/cvTemplates';

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
                  {cvData.experiences.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setCvData((p) => ({
                          ...p,
                          experiences: p.experiences.filter((_, i) => i !== idx),
                        }))
                      }
                      className="text-red-500 hover:bg-red-500/10 p-1 rounded cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
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
                  {cvData.educations.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setCvData((p) => ({
                          ...p,
                          educations: p.educations.filter((_, i) => i !== idx),
                        }))
                      }
                      className="text-red-500 hover:bg-red-500/10 p-1 rounded cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={edu.degree}
                  onChange={(e) =>
                    setCvData((p) => ({
                      ...p,
                      educations: p.educations.map((x, i) =>
                        i === idx ? { ...x, degree: e.target.value } : x
                      ),
                    }))
                  }
                  placeholder={isBn ? 'ডিগ্রি (যেমন: BBA / HSC)' : 'Degree (e.g. BBA / HSC)'}
                  className="w-full px-2 py-1 rounded-lg glass-input text-xs"
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
                  placeholder={isBn ? 'প্রতিষ্ঠান' : 'Institution'}
                  className="w-full px-2 py-1 rounded-lg glass-input text-xs"
                />
                <div className="grid grid-cols-3 gap-1.5">
                  <input
                    type="text"
                    value={edu.boardOrGroup}
                    onChange={(e) =>
                      setCvData((p) => ({
                        ...p,
                        educations: p.educations.map((x, i) =>
                          i === idx ? { ...x, boardOrGroup: e.target.value } : x
                        ),
                      }))
                    }
                    placeholder={isBn ? 'বোর্ড' : 'Board'}
                    className="px-2 py-1 rounded-lg glass-input text-[11px]"
                  />
                  <input
                    type="text"
                    value={edu.year}
                    onChange={(e) =>
                      setCvData((p) => ({
                        ...p,
                        educations: p.educations.map((x, i) =>
                          i === idx ? { ...x, year: e.target.value } : x
                        ),
                      }))
                    }
                    placeholder={isBn ? 'সাল' : 'Year'}
                    className="px-2 py-1 rounded-lg glass-input text-[11px]"
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
                    placeholder="GPA"
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

          {/* Font Family */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              {isBn ? 'ফন্ট স্টাইল:' : 'Typography Style:'}
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
