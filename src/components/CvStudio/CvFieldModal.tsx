import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Check,
  ChevronRight,
  Eraser,
  Image as ImageIcon,
  PenTool,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { CvData, CvFieldTarget } from '../../types/cv';
import { StudioPhotoItem } from '../../types';
import {
  BLOOD_GROUP_OPTIONS,
  EXPERIENCE_DESC_SUGGESTIONS,
  GENDER_OPTIONS,
  LANGUAGE_SUGGESTIONS,
  MARITAL_STATUS_OPTIONS,
  OBJECTIVE_SUGGESTIONS,
  RELIGION_OPTIONS,
  SKILL_SUGGESTIONS,
} from '../../utils/cvTemplates';

interface CvFieldModalProps {
  target: CvFieldTarget | null;
  data: CvData;
  lang: 'bn' | 'en';
  studioPhotos?: StudioPhotoItem[];
  onChange: (updater: (prev: CvData) => CvData) => void;
  onClose: () => void;
  onNextField: () => void;
}

export const CvFieldModal: React.FC<CvFieldModalProps> = ({
  target,
  data,
  lang,
  studioPhotos = [],
  onChange,
  onClose,
  onNextField,
}) => {
  const [skillInput, setSkillInput] = useState('');
  const [langInput, setLangInput] = useState('');
  const [showStudioPicker, setShowStudioPicker] = useState(false);
  const [signTab, setSignTab] = useState<'draw' | 'upload' | 'type'>('draw');
  const photoFileRef = useRef<HTMLInputElement>(null);
  const signFileRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    setShowStudioPicker(false);
    setSkillInput('');
    setLangInput('');
  }, [target]);

  useEffect(() => {
    if (!target) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [target, onClose]);

  if (!target) return null;

  const isBn = lang === 'bn';

  const handlePhotoFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      if (src) {
        onChange((prev) => ({ ...prev, photo: src }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSignFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      if (src) {
        onChange((prev) => ({ ...prev, signatureImage: src }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Signature Drawing Pad Handlers
  const getCanvasPoint = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    isDrawingRef.current = true;
    const pt = getCanvasPoint(e);
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const moveDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const pt = getCanvasPoint(e);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
  };

  const endDraw = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas) {
      onChange((prev) => ({ ...prev, signatureImage: canvas.toDataURL('image/png') }));
    }
  };

  const clearSignatureCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    onChange((prev) => ({ ...prev, signatureImage: '' }));
  };

  const getModalTitle = (): string => {
    if (target.type === 'photo') return isBn ? 'ছবি যোগ করুন' : 'Candidate Photo';
    if (target.type === 'signature') return isBn ? 'স্বাক্ষর যোগ করুন' : 'Signature';
    if (target.type === 'skills') return isBn ? 'দক্ষতা (Skills)' : 'Skills';
    if (target.type === 'languages') return isBn ? 'ভাষাগত দক্ষতা' : 'Languages';
    if (target.type === 'experience') return isBn ? 'কর্মঅভিজ্ঞতা' : 'Work Experience';
    if (target.type === 'education') return isBn ? 'শিক্ষাগত যোগ্যতা' : 'Education';
    if (target.type === 'training') return isBn ? 'প্রশিক্ষণ ও সনদ' : 'Training & Certificate';
    if (target.type === 'reference') return isBn ? 'রেফারেন্স' : 'Reference';

    const map: Record<string, [string, string]> = {
      fullName: ['পুরো নাম', 'Full Name'],
      jobTitle: ['কোন পদের জন্য আবেদন', 'Position Applied For'],
      phone: ['মোবাইল নম্বর', 'Phone Number'],
      email: ['ইমেইল ঠিকানা', 'Email Address'],
      address: ['বর্তমান ঠিকানা', 'Present Address'],
      permanentAddress: ['স্থায়ী ঠিকানা', 'Permanent Address'],
      careerObjective: ['ক্যারিয়ার উদ্দেশ্য (২-৩ লাইন)', 'Career Objective (2-3 Lines)'],
      declarationText: ['ঘোষণাপত্র', 'Declaration'],
      fatherName: ['পিতার নাম', "Father's Name"],
      motherName: ['মাতার নাম', "Mother's Name"],
      dateOfBirth: ['জন্ম তারিখ', 'Date of Birth'],
      age: ['বয়স', 'Age'],
      nationalId: ['জাতীয় পরিচয়পত্র নম্বর', 'National ID (NID)'],
      religion: ['ধর্ম', 'Religion'],
      maritalStatus: ['বৈবাহিক অবস্থা', 'Marital Status'],
      nationality: ['জাতীয়তা', 'Nationality'],
      bloodGroup: ['রক্তের গ্রুপ', 'Blood Group'],
      gender: ['লিঙ্গ', 'Gender'],
      height: ['উচ্চতা', 'Height'],
      weight: ['ওজন', 'Weight'],
      complexion: ['গাত্রবর্ণ', 'Complexion'],
      passportNo: ['পাসপোর্ট নম্বর', 'Passport Number'],
      passportIssueDate: ['ইস্যু তারিখ', 'Date of Issue'],
      passportExpiryDate: ['মেয়াদ উত্তীর্ণের তারিখ', 'Date of Expiry'],
      passportIssuePlace: ['ইস্যু স্থান', 'Place of Issue'],
      bangladeshContact: ['বাংলাদেশে যোগাযোগ', 'Contact in Bangladesh'],
      occupation: ['পেশা', 'Occupation'],
      fatherOccupation: ['পিতার পেশা', "Father's Occupation"],
      motherOccupation: ['মাতার পেশা', "Mother's Occupation"],
      brothers: ['ভাইয়ের তথ্য', 'Brothers'],
      sisters: ['বোনের তথ্য', 'Sisters'],
      partnerExpectation: ['জীবনসঙ্গীর প্রত্যাশা', 'Expectation from Life Partner'],
      guardianContact: ['অভিভাবকের যোগাযোগ', 'Guardian Contact'],
    };

    const fieldName = 'field' in target ? target.field : '';
    const pair = map[fieldName];
    return pair ? (isBn ? pair[0] : pair[1]) : isBn ? 'তথ্য লিখুন' : 'Edit Field';
  };

  const renderBody = () => {
    // 1. PHOTO POPOVER (Matches Screenshot 6 + Library Picker from Passport Studio)
    if (target.type === 'photo') {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-3 rounded-xl glass-tile">
            <div className="w-20 h-24 rounded-lg border border-slate-300 dark:border-white/15 bg-slate-100 dark:bg-slate-800/80 overflow-hidden flex items-center justify-center shrink-0">
              {data.photo ? (
                <img src={data.photo} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[11px] text-slate-500 text-center px-1">
                  {isBn ? 'ছবি নেই' : 'No photo'}
                </span>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => photoFileRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl glass-btn-primary text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{isBn ? 'ছবি আপলোড' : 'Upload Photo'}</span>
                </button>
                {studioPhotos.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowStudioPicker((v) => !v)}
                    className="px-3 py-1.5 rounded-xl glass-tile text-slate-800 dark:text-slate-100 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>{isBn ? 'স্টুডিও লাইব্রেরি' : 'From Passport Studio'}</span>
                  </button>
                )}
                {data.photo && (
                  <button
                    type="button"
                    onClick={() => onChange((prev) => ({ ...prev, photo: '' }))}
                    className="px-2.5 py-1.5 rounded-xl glass-tile text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isBn ? 'মুছুন' : 'Remove'}</span>
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                {isBn
                  ? 'সরাসরি পাসপোর্ট ছবি আপলোড করুন। অফলাইনেই ব্রাউজারে সেভ থাকবে।'
                  : 'Upload any portrait or passport photo directly. Saved locally offline.'}
              </p>
            </div>
          </div>

          {showStudioPicker && studioPhotos.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                {isBn ? 'পাসপোর্ট স্টুডিও থেকে ছবি বাছুন:' : 'Pick from Passport Studio photos:'}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {studioPhotos.map((sp) => (
                  <button
                    key={sp.id}
                    type="button"
                    onClick={() => {
                      onChange((prev) => ({ ...prev, photo: sp.processedSrc || sp.originalSrc }));
                      setShowStudioPicker(false);
                    }}
                    className="aspect-[3/4] rounded-lg overflow-hidden border-2 border-transparent hover:border-blue-500 cursor-pointer"
                  >
                    <img
                      src={sp.processedSrc || sp.originalSrc}
                      alt="Studio"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {isBn ? 'ছবির ফ্রেম:' : 'Photo Frame:'}
            </span>
            <div className="flex items-center gap-1 glass-track p-0.5 rounded-xl">
              {(['rect', 'rounded', 'circle'] as const).map((shape) => (
                <button
                  key={shape}
                  type="button"
                  onClick={() => onChange((prev) => ({ ...prev, photoShape: shape }))}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition ${
                    data.photoShape === shape
                      ? 'glass-btn-primary text-white'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {shape === 'rect'
                    ? isBn
                      ? 'পাসপোর্ট'
                      : 'Square'
                    : shape === 'rounded'
                    ? isBn
                      ? 'রাউন্ডেড'
                      : 'Rounded'
                    : isBn
                    ? 'গোল'
                    : 'Circle'}
                </button>
              ))}
            </div>
          </div>

          <input
            ref={photoFileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) handlePhotoFile(e.target.files[0]);
              e.target.value = '';
            }}
          />
        </div>
      );
    }

    // 2. SIGNATURE POPOVER (Draw / Upload / Type)
    if (target.type === 'signature') {
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-1 glass-track p-1 rounded-xl">
            {(
              [
                ['draw', isBn ? 'আঁকুন' : 'Draw'],
                ['upload', isBn ? 'আপলোড' : 'Upload'],
                ['type', isBn ? 'লিখুন' : 'Type Name'],
              ] as const
            ).map(([tabKey, label]) => (
              <button
                key={tabKey}
                type="button"
                onClick={() => setSignTab(tabKey)}
                className={`py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
                  signTab === tabKey
                    ? 'glass-btn-primary text-white'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {signTab === 'draw' && (
            <div className="space-y-2">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {isBn ? 'নিচের সাদা বক্সে মাউস বা আঙুল দিয়ে স্বাক্ষর আঁকুন:' : 'Draw your signature inside the box below:'}
              </div>
              <canvas
                ref={canvasRef}
                width={380}
                height={120}
                onMouseDown={startDraw}
                onMouseMove={moveDraw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={moveDraw}
                onTouchEnd={endDraw}
                className="w-full h-28 bg-white rounded-xl border border-slate-300 cursor-crosshair touch-none"
              />
              <button
                type="button"
                onClick={clearSignatureCanvas}
                className="px-2.5 py-1 rounded-lg glass-tile text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer"
              >
                <Eraser className="w-3.5 h-3.5" />
                <span>{isBn ? 'মুছে আবার আঁকুন' : 'Clear Pad'}</span>
              </button>
            </div>
          )}

          {signTab === 'upload' && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => signFileRef.current?.click()}
                className="w-full py-5 rounded-xl glass-dropzone flex flex-col items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <Upload className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span>{isBn ? 'স্বাক্ষরের ছবি আপলোড করুন' : 'Upload Signature Image'}</span>
              </button>
              {data.signatureImage && (
                <div className="p-2 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                  <img src={data.signatureImage} alt="Sign" className="h-10 object-contain" />
                  <button
                    type="button"
                    onClick={() => onChange((prev) => ({ ...prev, signatureImage: '' }))}
                    className="p-1 text-red-500 hover:bg-red-50 rounded cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
              <input
                ref={signFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleSignFile(e.target.files[0]);
                  e.target.value = '';
                }}
              />
            </div>
          )}

          {signTab === 'type' && (
            <div className="space-y-2">
              <input
                type="text"
                autoFocus
                value={data.signatureText}
                onChange={(e) =>
                  onChange((prev) => ({
                    ...prev,
                    signatureImage: '',
                    signatureText: e.target.value,
                  }))
                }
                placeholder={data.fullName || (isBn ? 'আপনার নাম লিখুন' : 'Type your name')}
                className="w-full px-3 py-2 rounded-xl glass-input text-sm"
              />
              {data.signatureText && (
                <div
                  className="p-3 rounded-xl bg-white text-slate-900 text-xl italic text-center border border-slate-200"
                  style={{ fontFamily: "Georgia, 'Brush Script MT', cursive" }}
                >
                  {data.signatureText}
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    // 3. SKILLS POPOVER
    if (target.type === 'skills') {
      const addSkill = (val: string) => {
        const clean = val.trim();
        if (!clean) return;
        onChange((prev) => ({
          ...prev,
          skills: prev.skills.includes(clean) ? prev.skills : [...prev.skills, clean],
        }));
      };

      return (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              autoFocus
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addSkill(skillInput);
                  setSkillInput('');
                }
              }}
              placeholder={isBn ? 'নতুন দক্ষতা লিখে Enter চাপুন...' : 'Type a skill and press Enter...'}
              className="flex-1 px-3 py-2 rounded-xl glass-input text-sm"
            />
            <button
              type="button"
              onClick={() => {
                addSkill(skillInput);
                setSkillInput('');
              }}
              className="px-3 py-2 rounded-xl glass-btn-primary text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{isBn ? 'যোগ' : 'Add'}</span>
            </button>
          </div>

          {data.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {data.skills.map((sk) => (
                <button
                  key={sk}
                  type="button"
                  onClick={() =>
                    onChange((prev) => ({
                      ...prev,
                      skills: prev.skills.filter((s) => s !== sk),
                    }))
                  }
                  className="px-2.5 py-1 rounded-lg glass-btn-primary text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                  title={isBn ? 'সরাতে ক্লিক করুন' : 'Click to remove'}
                >
                  <span>{sk}</span>
                  <X className="w-3 h-3" />
                </button>
              ))}
            </div>
          )}

          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {isBn ? 'তৈরি দক্ষতা — ট্যাপ করে বাছুন:' : 'Popular skills — click to add:'}
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
              {SKILL_SUGGESTIONS.filter((s) => !data.skills.includes(s)).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => addSkill(s)}
                  className="px-2.5 py-1 rounded-lg glass-tile text-xs text-slate-700 dark:text-slate-200 hover:text-blue-600 cursor-pointer"
                >
                  + {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // 4. LANGUAGES POPOVER
    if (target.type === 'languages') {
      const addLang = (val: string) => {
        const clean = val.trim();
        if (!clean) return;
        onChange((prev) => ({
          ...prev,
          showLanguages: true,
          languages: prev.languages.includes(clean) ? prev.languages : [...prev.languages, clean],
        }));
      };

      return (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              autoFocus
              value={langInput}
              onChange={(e) => setLangInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addLang(langInput);
                  setLangInput('');
                }
              }}
              placeholder={isBn ? 'যেমন: বাংলা (মাতৃভাষা), English (Fluent)' : 'e.g. Bangla (Native), English (Fluent)'}
              className="flex-1 px-3 py-2 rounded-xl glass-input text-sm"
            />
            <button
              type="button"
              onClick={() => {
                addLang(langInput);
                setLangInput('');
              }}
              className="px-3 py-2 rounded-xl glass-btn-primary text-white text-xs font-bold cursor-pointer"
            >
              {isBn ? 'যোগ' : 'Add'}
            </button>
          </div>

          {data.languages.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {data.languages.map((lg) => (
                <button
                  key={lg}
                  type="button"
                  onClick={() =>
                    onChange((prev) => ({
                      ...prev,
                      languages: prev.languages.filter((x) => x !== lg),
                    }))
                  }
                  className="px-2.5 py-1 rounded-lg glass-btn-primary text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <span>{lg}</span>
                  <X className="w-3 h-3" />
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            {LANGUAGE_SUGGESTIONS.filter((s) => !data.languages.includes(s)).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => addLang(s)}
                className="px-2.5 py-1 rounded-lg glass-tile text-xs text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                + {s}
              </button>
            ))}
          </div>
        </div>
      );
    }

    // 5. EXPERIENCE POPOVER
    if (target.type === 'experience') {
      const exp = data.experiences[target.index];
      if (!exp) return null;
      const updateExp = (patch: Partial<typeof exp>) =>
        onChange((prev) => ({
          ...prev,
          experiences: prev.experiences.map((item, i) => (i === target.index ? { ...item, ...patch } : item)),
        }));
      const suggestions = EXPERIENCE_DESC_SUGGESTIONS[data.cvLang];

      return (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {isBn ? 'পদবি (Role)' : 'Job Title / Role'}
              </label>
              <input
                type="text"
                autoFocus={target.subField === 'role' || !target.subField}
                value={exp.role}
                onChange={(e) => updateExp({ role: e.target.value })}
                placeholder="Sales Executive"
                className="w-full px-3 py-2 rounded-xl glass-input text-sm"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {isBn ? 'প্রতিষ্ঠান (Company)' : 'Company / Organization'}
              </label>
              <input
                type="text"
                autoFocus={target.subField === 'company'}
                value={exp.company}
                onChange={(e) => updateExp({ company: e.target.value })}
                placeholder="ABC Trading Ltd."
                className="w-full px-3 py-2 rounded-xl glass-input text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {isBn ? 'শুরু (Start)' : 'Start Date'}
              </label>
              <input
                type="text"
                autoFocus={target.subField === 'startDate'}
                value={exp.startDate}
                onChange={(e) => updateExp({ startDate: e.target.value })}
                placeholder="Jan 2022"
                className="w-full px-3 py-2 rounded-xl glass-input text-sm"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {isBn ? 'শেষ (End)' : 'End Date'}
              </label>
              <input
                type="text"
                autoFocus={target.subField === 'endDate'}
                value={exp.endDate}
                onChange={(e) => updateExp({ endDate: e.target.value })}
                placeholder="Present"
                className="w-full px-3 py-2 rounded-xl glass-input text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              {isBn ? 'কাজের বিবরণ' : 'Responsibilities & Achievements'}
            </label>
            <textarea
              rows={3}
              autoFocus={target.subField === 'description'}
              value={exp.description}
              onChange={(e) => updateExp({ description: e.target.value })}
              placeholder={isBn ? 'আপনার দায়িত্বগুলো লিখুন...' : 'Describe your responsibilities...'}
              className="w-full px-3 py-2 rounded-xl glass-input text-xs leading-relaxed"
            />
          </div>

          <div className="space-y-1.5">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              {isBn ? 'তৈরি লাইন — একটা ট্যাপ করুন:' : 'Ready lines — click to insert:'}
            </div>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {suggestions.map((line, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => updateExp({ description: line })}
                  className="w-full text-left p-2 rounded-xl glass-tile text-[11px] text-slate-700 dark:text-slate-200 whitespace-pre-line cursor-pointer"
                >
                  {line}
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // 6. EDUCATION POPOVER
    if (target.type === 'education') {
      const edu = data.educations[target.index];
      if (!edu) return null;
      const updateEdu = (patch: Partial<typeof edu>) =>
        onChange((prev) => ({
          ...prev,
          educations: prev.educations.map((item, i) => (i === target.index ? { ...item, ...patch } : item)),
        }));

      return (
        <div className="space-y-2.5">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              {isBn ? 'ডিগ্রি / পরীক্ষা' : 'Degree / Examination'}
            </label>
            <input
              type="text"
              autoFocus={target.subField === 'degree' || !target.subField}
              value={edu.degree}
              onChange={(e) => updateEdu({ degree: e.target.value })}
              placeholder="BBA / HSC / SSC / B.Sc"
              className="w-full px-3 py-2 rounded-xl glass-input text-sm"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              {isBn ? 'প্রতিষ্ঠান (Institution)' : 'Institution / University'}
            </label>
            <input
              type="text"
              autoFocus={target.subField === 'institution'}
              value={edu.institution}
              onChange={(e) => updateEdu({ institution: e.target.value })}
              placeholder="National University / Govt. College"
              className="w-full px-3 py-2 rounded-xl glass-input text-sm"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {isBn ? 'বোর্ড / বিভাগ' : 'Board / Group'}
              </label>
              <input
                type="text"
                autoFocus={target.subField === 'boardOrGroup'}
                value={edu.boardOrGroup}
                onChange={(e) => updateEdu({ boardOrGroup: e.target.value })}
                placeholder="Dhaka / Science"
                className="w-full px-2.5 py-2 rounded-xl glass-input text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {isBn ? 'পাসের সাল' : 'Year'}
              </label>
              <input
                type="text"
                autoFocus={target.subField === 'year'}
                value={edu.year}
                onChange={(e) => updateEdu({ year: e.target.value })}
                placeholder="2022"
                className="w-full px-2.5 py-2 rounded-xl glass-input text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {isBn ? 'ফলাফল' : 'Result'}
              </label>
              <input
                type="text"
                autoFocus={target.subField === 'result'}
                value={edu.result}
                onChange={(e) => updateEdu({ result: e.target.value })}
                placeholder="GPA 4.50"
                className="w-full px-2.5 py-2 rounded-xl glass-input text-xs"
              />
            </div>
          </div>
        </div>
      );
    }

    // 7. TRAINING POPOVER
    if (target.type === 'training') {
      const trn = data.trainings[target.index];
      if (!trn) return null;
      const updateTrn = (patch: Partial<typeof trn>) =>
        onChange((prev) => ({
          ...prev,
          trainings: prev.trainings.map((item, i) => (i === target.index ? { ...item, ...patch } : item)),
        }));

      return (
        <div className="space-y-2.5">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              {isBn ? 'প্রশিক্ষণ / কোর্সের নাম' : 'Course / Training Title'}
            </label>
            <input
              type="text"
              autoFocus
              value={trn.title}
              onChange={(e) => updateTrn({ title: e.target.value })}
              placeholder="Computer Office Application"
              className="w-full px-3 py-2 rounded-xl glass-input text-sm"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {isBn ? 'প্রতিষ্ঠান' : 'Institute'}
              </label>
              <input
                type="text"
                value={trn.institute}
                onChange={(e) => updateTrn({ institute: e.target.value })}
                placeholder="Youth Development Center"
                className="w-full px-3 py-2 rounded-xl glass-input text-sm"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {isBn ? 'সাল' : 'Year'}
              </label>
              <input
                type="text"
                value={trn.year}
                onChange={(e) => updateTrn({ year: e.target.value })}
                placeholder="2021"
                className="w-full px-3 py-2 rounded-xl glass-input text-sm"
              />
            </div>
          </div>
        </div>
      );
    }

    // 8. REFERENCE POPOVER
    if (target.type === 'reference') {
      const refItem = data.references[target.index];
      if (!refItem) return null;
      const updateRef = (patch: Partial<typeof refItem>) =>
        onChange((prev) => ({
          ...prev,
          references: prev.references.map((item, i) => (i === target.index ? { ...item, ...patch } : item)),
        }));

      return (
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {isBn ? 'নাম' : 'Full Name'}
              </label>
              <input
                type="text"
                autoFocus
                value={refItem.name}
                onChange={(e) => updateRef({ name: e.target.value })}
                placeholder="Mr. Anwar Hossain"
                className="w-full px-3 py-2 rounded-xl glass-input text-sm"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {isBn ? 'পদবি' : 'Designation'}
              </label>
              <input
                type="text"
                value={refItem.designation}
                onChange={(e) => updateRef({ designation: e.target.value })}
                placeholder="Manager"
                className="w-full px-3 py-2 rounded-xl glass-input text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {isBn ? 'প্রতিষ্ঠান' : 'Organization'}
              </label>
              <input
                type="text"
                value={refItem.organization}
                onChange={(e) => updateRef({ organization: e.target.value })}
                placeholder="ABC Ltd."
                className="w-full px-3 py-2 rounded-xl glass-input text-sm"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {isBn ? 'মোবাইল' : 'Phone'}
              </label>
              <input
                type="text"
                value={refItem.phone}
                onChange={(e) => updateRef({ phone: e.target.value })}
                placeholder="01811-000000"
                className="w-full px-3 py-2 rounded-xl glass-input text-sm"
              />
            </div>
          </div>
        </div>
      );
    }

    // 9. CAREER OBJECTIVE WITH READY TEMPLATES (Matches Screenshot 4!)
    if (target.type === 'basic' && target.field === 'careerObjective') {
      const roleWord = data.jobTitle?.trim() || (data.cvLang === 'bn' ? 'দায়িত্বশীল কর্মী' : 'suitable');
      const readyList = OBJECTIVE_SUGGESTIONS[data.cvLang].map((tpl) =>
        tpl.replace('{role}', roleWord)
      );

      return (
        <div className="space-y-3">
          <textarea
            rows={3}
            autoFocus
            value={data.careerObjective}
            onChange={(e) => onChange((prev) => ({ ...prev, careerObjective: e.target.value }))}
            placeholder={isBn ? 'আপনার ক্যারিয়ার উদ্দেশ্য লিখুন...' : 'Write 2-3 lines about your career goal...'}
            className="w-full px-3 py-2 rounded-xl glass-input text-sm leading-relaxed"
          />
          <div className="space-y-1.5">
            <div className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
              {isBn
                ? 'তৈরি লেখা — একটা ট্যাপ করুন, পরে বদলাতে পারবেন (আগে পদ লিখলে পদের নাম অটো বসে যাবে):'
                : 'Ready templates — click one to fill (automatically uses your entered position):'}
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {readyList.map((text, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onChange((prev) => ({ ...prev, careerObjective: text }))}
                  className="w-full text-left p-2.5 rounded-xl glass-tile text-xs text-slate-800 dark:text-slate-100 leading-relaxed cursor-pointer"
                >
                  {text}
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // 10. DROPDOWN PERSONAL FIELDS (Religion, Marital Status, Blood Group, Gender — Matches Screenshot 5!)
    if (
      target.type === 'personal' &&
      (target.field === 'religion' ||
        target.field === 'maritalStatus' ||
        target.field === 'bloodGroup' ||
        target.field === 'gender')
    ) {
      const options =
        target.field === 'religion'
          ? RELIGION_OPTIONS
          : target.field === 'maritalStatus'
          ? MARITAL_STATUS_OPTIONS
          : target.field === 'bloodGroup'
          ? BLOOD_GROUP_OPTIONS
          : GENDER_OPTIONS;
      const currentVal = data[target.field];

      return (
        <div className="space-y-2">
          <select
            autoFocus
            value={currentVal}
            onChange={(e) => onChange((prev) => ({ ...prev, [target.field]: e.target.value }))}
            className="w-full px-3 py-2.5 rounded-xl glass-input text-sm cursor-pointer"
          >
            <option value="">— {isBn ? 'নির্বাচন করুন' : 'Select'} —</option>
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      );
    }

    // 11. STANDARD TEXT / TEXTAREA FIELDS (Matches Screenshot 3!)
    const fieldKey = 'field' in target ? target.field : 'fullName';
    const currentValue = String((data as unknown as Record<string, unknown>)[fieldKey] || '');
    const isLongField = fieldKey === 'declarationText' || fieldKey === 'partnerExpectation';

    return isLongField ? (
      <textarea
        rows={3}
        autoFocus
        value={currentValue}
        onChange={(e) => onChange((prev) => ({ ...prev, [fieldKey]: e.target.value }))}
        className="w-full px-3 py-2 rounded-xl glass-input text-sm leading-relaxed"
      />
    ) : (
      <input
        type="text"
        autoFocus
        value={currentValue}
        onChange={(e) => onChange((prev) => ({ ...prev, [fieldKey]: e.target.value }))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onNextField();
          }
        }}
        className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm"
      />
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md glass-modal rounded-2xl p-5 space-y-4 text-slate-900 dark:text-slate-100"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {target.type === 'signature' && <PenTool className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
            {target.type === 'photo' && <Camera className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">{getModalTitle()}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl glass-tile text-slate-600 dark:text-slate-300 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>{renderBody()}</div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-200/70 dark:border-white/10">
          <button
            type="button"
            onClick={onNextField}
            className="px-3 py-1.5 rounded-xl glass-tile text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1 cursor-pointer"
          >
            <span>{isBn ? 'পরের ঘর' : 'Next Field'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl glass-btn-primary text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{isBn ? 'হয়েছে' : 'Done'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
