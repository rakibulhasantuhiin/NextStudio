import React from 'react';
import { Camera, PenTool, Plus, Trash2 } from 'lucide-react';
import { CvData, CvFieldTarget } from '../../types/cv';

interface CvSheetRendererProps {
  data: CvData;
  interactive?: boolean;
  isThumbnail?: boolean;
  onEditField?: (target: CvFieldTarget) => void;
  onAddExperience?: () => void;
  onRemoveExperience?: (index: number) => void;
  onAddEducation?: () => void;
  onRemoveEducation?: (index: number) => void;
  onAddTraining?: () => void;
  onRemoveTraining?: (index: number) => void;
  onAddReference?: () => void;
  onRemoveReference?: (index: number) => void;
}

const LABELS = {
  en: {
    cvTitle: 'CURRICULUM VITAE',
    cvOf: 'Curriculum Vitae of',
    marriageTitle: 'MARRIAGE BIODATA',
    careerObjective: 'CAREER OBJECTIVE',
    workExperience: 'WORK EXPERIENCE',
    education: 'EDUCATION',
    academicQual: 'EDUCATIONAL QUALIFICATION',
    skills: 'SKILLS',
    languages: 'LANGUAGES',
    training: 'TRAINING & CERTIFICATES',
    references: 'REFERENCES',
    personalDetails: 'PERSONAL DETAILS',
    passportDetails: 'PASSPORT DETAILS',
    contact: 'CONTACT',
    contactBd: 'CONTACT IN BANGLADESH',
    declaration: 'DECLARATION',
    address: 'ADDRESS',
    occupation: 'OCCUPATION',
    familyInfo: 'FAMILY INFORMATION',
    partnerExpectation: 'EXPECTATION FROM LIFE PARTNER',
    guardianContact: 'GUARDIAN CONTACT',
    signature: 'Signature',
    fatherName: "Father's Name",
    motherName: "Mother's Name",
    dob: 'Date of Birth',
    age: 'Age',
    nid: 'National ID',
    religion: 'Religion',
    maritalStatus: 'Marital Status',
    nationality: 'Nationality',
    bloodGroup: 'Blood Group',
    gender: 'Gender',
    height: 'Height',
    weight: 'Weight',
    complexion: 'Complexion',
    presentAddress: 'Present Address',
    permanentAddress: 'Permanent Address',
    passportNo: 'Passport No.',
    issueDate: 'Date of Issue',
    expiryDate: 'Date of Expiry',
    issuePlace: 'Place of Issue',
    fatherOcc: "Father's Occupation",
    motherOcc: "Mother's Occupation",
    brothers: 'Brothers',
    sisters: 'Sisters',
    exam: 'Examination',
    institute: 'Institution',
    boardGroup: 'Board / Group',
    year: 'Year',
    result: 'Result',
    phName: 'Full Name',
    phJob: 'Position Applied For',
    phPhone: 'Phone Number',
    phEmail: 'Email',
    phAddress: 'Address',
    phObjective: 'Career Objective — click to write or pick a ready template',
    phRole: '+ Role / Title',
    phCompany: '+ Company',
    phStart: '+ Start',
    phEnd: 'Present',
    phJobDesc: 'Job responsibilities — click to write or pick ready lines',
    phDegree: '+ Degree / Exam',
    phInst: '+ Institution / Board',
    phYear: '+ Passing Year',
    phResult: '+ Result',
    phSkills: 'Skills — click to pick or type',
    phLanguages: 'Languages — click to add',
    phWrite: '+ Write',
    phPhoto: 'Add Photo',
    phSign: 'Add Signature',
    addExp: '+ Add another experience',
    addEdu: '+ Add another education',
    addTrn: '+ Add training / certificate',
    addRef: '+ Add reference',
  },
  bn: {
    cvTitle: 'জীবন বৃত্তান্ত',
    cvOf: 'জীবন বৃত্তান্ত —',
    marriageTitle: 'বিয়ের বায়োডাটা',
    careerObjective: 'ক্যারিয়ার উদ্দেশ্য',
    workExperience: 'কর্মঅভিজ্ঞতা',
    education: 'শিক্ষাগত যোগ্যতা',
    academicQual: 'শিক্ষাগত যোগ্যতা',
    skills: 'দক্ষতা',
    languages: 'ভাষাগত দক্ষতা',
    training: 'প্রশিক্ষণ ও সনদ',
    references: 'রেফারেন্স',
    personalDetails: 'ব্যক্তিগত তথ্য',
    passportDetails: 'পাসপোর্ট তথ্য',
    contact: 'যোগাযোগ',
    contactBd: 'বাংলাদেশে যোগাযোগ',
    declaration: 'ঘোষণাপত্র',
    address: 'ঠিকানা',
    occupation: 'পেশা',
    familyInfo: 'পারিবারিক তথ্য',
    partnerExpectation: 'জীবনসঙ্গীর প্রত্যাশা',
    guardianContact: 'অভিভাবকের যোগাযোগ',
    signature: 'স্বাক্ষর',
    fatherName: 'পিতার নাম',
    motherName: 'মাতার নাম',
    dob: 'জন্ম তারিখ',
    age: 'বয়স',
    nid: 'জাতীয় পরিচয়পত্র',
    religion: 'ধর্ম',
    maritalStatus: 'বৈবাহিক অবস্থা',
    nationality: 'জাতীয়তা',
    bloodGroup: 'রক্তের গ্রুপ',
    gender: 'লিঙ্গ',
    height: 'উচ্চতা',
    weight: 'ওজন',
    complexion: 'গাত্রবর্ণ',
    presentAddress: 'বর্তমান ঠিকানা',
    permanentAddress: 'স্থায়ী ঠিকানা',
    passportNo: 'পাসপোর্ট নম্বর',
    issueDate: 'ইস্যু তারিখ',
    expiryDate: 'মেয়াদ উত্তীর্ণ',
    issuePlace: 'ইস্যু স্থান',
    fatherOcc: 'পিতার পেশা',
    motherOcc: 'মাতার পেশা',
    brothers: 'ভাই',
    sisters: 'বোন',
    exam: 'পরীক্ষা / ডিগ্রি',
    institute: 'প্রতিষ্ঠান',
    boardGroup: 'বোর্ড / বিভাগ',
    year: 'সাল',
    result: 'ফলাফল',
    phName: 'পুরো নাম',
    phJob: 'কোন পদের জন্য আবেদন',
    phPhone: 'মোবাইল নম্বর',
    phEmail: 'ইমেইল',
    phAddress: 'ঠিকানা',
    phObjective: 'ক্যারিয়ার উদ্দেশ্য — ট্যাপ করে লিখুন বা তৈরি লেখা বাছুন',
    phRole: '+ পদবি',
    phCompany: '+ প্রতিষ্ঠান',
    phStart: '+ শুরু',
    phEnd: 'Present',
    phJobDesc: 'কাজের বিবরণ — ট্যাপ করে লিখুন বা তৈরি লাইন বাছুন',
    phDegree: '+ ডিগ্রি / পরীক্ষা',
    phInst: '+ প্রতিষ্ঠান / বোর্ড',
    phYear: '+ পাসের সাল',
    phResult: '+ ফলাফল',
    phSkills: 'দক্ষতা — ট্যাপ করে বাছুন',
    phLanguages: 'ভাষা — ট্যাপ করে যোগ করুন',
    phWrite: '+ লিখুন',
    phPhoto: 'ছবি যোগ করুন',
    phSign: 'স্বাক্ষর যোগ করুন',
    addExp: '+ আরেকটা অভিজ্ঞতা যোগ করুন',
    addEdu: '+ আরেকটা শিক্ষা যোগ করুন',
    addTrn: '+ প্রশিক্ষণ যোগ করুন',
    addRef: '+ রেফারেন্স যোগ করুন',
  },
};

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return `rgba(29, 78, 216, ${alpha})`;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const CvSheetRenderer: React.FC<CvSheetRendererProps> = ({
  data,
  interactive = false,
  isThumbnail = false,
  onEditField,
  onAddExperience,
  onRemoveExperience,
  onAddEducation,
  onRemoveEducation,
  onAddTraining,
  onRemoveTraining,
  onAddReference,
  onRemoveReference,
}) => {
  const L = LABELS[data.cvLang];
  const tpl = data.templateId;
  const accent = tpl === 'minimal-ats' ? '#111827' : data.accentColor || '#1d4ed8';
  const accentTint = hexToRgba(accent, 0.11);
  const accentBorder = hexToRgba(accent, 0.35);

  const fontFamily =
    data.fontStyle === 'sans'
      ? "'Plus Jakarta Sans', 'Hind Siliguri', 'Noto Sans Bengali', system-ui, sans-serif"
      : data.fontStyle === 'classic'
      ? "Georgia, 'Times New Roman', 'Hind Siliguri', serif"
      : "'Source Serif 4', Georgia, 'Times New Roman', 'Hind Siliguri', serif";

  const padClass =
    data.density === 'compact'
      ? 'px-8 py-6'
      : data.density === 'spacious'
      ? 'px-12 py-10'
      : 'px-10 py-8';

  const sectionGap =
    data.density === 'compact'
      ? 'space-y-3'
      : data.density === 'spacious'
      ? 'space-y-5'
      : 'space-y-4';

  const baseTextSize =
    data.density === 'compact' ? '12px' : data.density === 'spacious' ? '13.5px' : '12.5px';

  // Helper: Clickable inline editable span (matches screenshots 1-6 amber dashed style when empty in edit mode)
  const renderEditable = (
    value: string,
    placeholder: string,
    target: CvFieldTarget,
    options?: {
      block?: boolean;
      className?: string;
      style?: React.CSSProperties;
      darkSurface?: boolean;
      hideIfEmpty?: boolean;
    }
  ) => {
    const trimmed = value?.trim() || '';
    if (!trimmed && !interactive) {
      if (options?.hideIfEmpty) return null;
      return null;
    }

    const isEmpty = !trimmed;
    const handleClick = (e: React.MouseEvent) => {
      if (!interactive || !onEditField) return;
      e.stopPropagation();
      onEditField(target);
    };

    const emptyStyle: React.CSSProperties = options?.darkSurface
      ? {
          backgroundColor: 'rgba(254, 243, 199, 0.22)',
          border: '1px dashed rgba(251, 191, 36, 0.85)',
          color: '#fef3c7',
          borderRadius: '4px',
          padding: '1px 6px',
        }
      : {
          backgroundColor: '#fef3c7',
          border: '1px dashed #d97706',
          color: '#92400e',
          borderRadius: '4px',
          padding: '1px 6px',
        };

    const filledInteractiveClass = interactive
      ? options?.darkSurface
        ? 'cursor-pointer hover:bg-white/15 rounded px-0.5 -mx-0.5 transition-colors'
        : 'cursor-pointer hover:bg-amber-100/70 rounded px-0.5 -mx-0.5 transition-colors'
      : '';

    const Tag = options?.block ? 'div' : 'span';

    return (
      <Tag
        onClick={handleClick}
        className={`${isEmpty && interactive ? 'cursor-pointer inline-block' : filledInteractiveClass} ${
          options?.block && isEmpty ? 'block w-full' : ''
        } ${options?.className || ''}`}
        style={{
          ...(isEmpty && interactive ? emptyStyle : {}),
          ...options?.style,
        }}
        title={interactive ? (data.cvLang === 'bn' ? 'ক্লিক করে লিখুন' : 'Click to edit') : undefined}
      >
        {trimmed || placeholder}
      </Tag>
    );
  };

  // Photo box renderer (supports rect, rounded, circle & clean silhouette placeholder in gallery thumbnails)
  const renderPhotoBox = (opts?: { width?: number; height?: number; darkBorder?: boolean }) => {
    if (tpl === 'minimal-ats') return null;
    const w = opts?.width ?? 102;
    const h = opts?.height ?? 124;
    const radius =
      data.photoShape === 'circle' ? '9999px' : data.photoShape === 'rounded' ? '10px' : '3px';

    if (!data.photo && !interactive && !isThumbnail) {
      return null;
    }

    return (
      <div
        onClick={(e) => {
          if (!interactive || !onEditField) return;
          e.stopPropagation();
          onEditField({ type: 'photo' });
        }}
        style={{
          width: `${w}px`,
          height: `${h}px`,
          borderRadius: radius,
          border: data.photo
            ? opts?.darkBorder
              ? '2px solid rgba(255,255,255,0.85)'
              : '1px solid #cbd5e1'
            : interactive
            ? '1.5px dashed #d97706'
            : '1px solid #cbd5e1',
          backgroundColor: data.photo ? '#ffffff' : isThumbnail ? '#e2e8f0' : '#f8fafc',
          overflow: 'hidden',
          flexShrink: 0,
        }}
        className={`flex flex-col items-center justify-center text-center select-none ${
          interactive ? 'cursor-pointer hover:ring-2 hover:ring-blue-500 transition' : ''
        }`}
      >
        {data.photo ? (
          <img
            src={data.photo}
            alt={data.fullName || 'Candidate Photo'}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : isThumbnail ? (
          <svg viewBox="0 0 64 76" className="w-full h-full" fill="none">
            <rect width="64" height="76" fill="#e2e8f0" />
            <circle cx="32" cy="27" r="12" fill="#94a3b8" />
            <path d="M12 66c0-11 9-19 20-19s20 8 20 19v10H12V66z" fill="#94a3b8" />
          </svg>
        ) : (
          <div className="px-2 flex flex-col items-center gap-1 text-[#92400e]">
            <Camera className="w-5 h-5 text-slate-700" />
            <span className="text-[11px] font-semibold leading-tight">{L.phPhoto}</span>
          </div>
        )}
      </div>
    );
  };

  // Signature block renderer
  const renderSignature = (align: 'left' | 'right' = 'left', darkSurface = false) => {
    const hasSign = Boolean(data.signatureImage || data.signatureText?.trim());
    if (!hasSign && !interactive) {
      return (
        <div className={`mt-5 flex ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
          <div className="w-44">
            <div className="h-8 border-b border-slate-700" />
            <div className="text-[11px] text-slate-700 mt-1">
              {L.signature}
              {data.fullName ? ` — ${data.fullName}` : ''}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={`mt-4 flex ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
        <div
          onClick={(e) => {
            if (!interactive || !onEditField) return;
            e.stopPropagation();
            onEditField({ type: 'signature' });
          }}
          className={`w-48 ${interactive ? 'cursor-pointer group' : ''}`}
        >
          {data.signatureImage ? (
            <div className="h-12 flex items-end pb-1 border-b border-slate-800">
              <img
                src={data.signatureImage}
                alt="Signature"
                style={{ maxHeight: '44px', maxWidth: '170px', objectFit: 'contain' }}
              />
            </div>
          ) : data.signatureText?.trim() ? (
            <div
              className="h-10 flex items-end pb-1 border-b border-slate-800 text-[18px] italic"
              style={{ fontFamily: "Georgia, 'Brush Script MT', cursive", color: darkSurface ? '#ffffff' : '#0f172a' }}
            >
              {data.signatureText}
            </div>
          ) : (
            <div
              className="h-11 rounded border border-dashed border-amber-600 bg-amber-50/90 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-amber-800 hover:bg-amber-100 transition"
              style={{ borderBottom: '1.5px solid #334155' }}
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>{L.phSign}</span>
            </div>
          )}
          <div
            className="text-[11px] mt-1"
            style={{ color: darkSurface ? 'rgba(255,255,255,0.85)' : '#334155' }}
          >
            {L.signature}
            {data.fullName ? ` — ${data.fullName}` : ' —'}
          </div>
        </div>
      </div>
    );
  };

  // Section Heading styled according to template style
  const renderSectionHeading = (title: string, numberPrefix?: number) => {
    const label = numberPrefix !== undefined ? `${numberPrefix}. ${title}` : title;

    if (tpl === 'classic-with-photo') {
      return (
        <div
          style={{
            backgroundColor: accent,
            color: '#ffffff',
            padding: '4px 10px',
            fontWeight: 700,
            fontSize: '11.5px',
            letterSpacing: '0.05em',
            borderRadius: '2px',
          }}
        >
          {label}
        </div>
      );
    }

    if (tpl === 'colored-bar') {
      return (
        <div
          style={{
            backgroundColor: accentTint,
            color: accent,
            borderBottom: `1.5px solid ${accentBorder}`,
            padding: '4px 10px',
            fontWeight: 700,
            fontSize: '12px',
            letterSpacing: '0.03em',
          }}
        >
          {label}
        </div>
      );
    }

    if (tpl === 'abroad-visa' || tpl === 'marriage-biodata') {
      return (
        <div
          style={{
            display: 'inline-block',
            backgroundColor: accent,
            color: '#ffffff',
            padding: '2.5px 10px',
            fontWeight: 700,
            fontSize: '11px',
            letterSpacing: '0.04em',
            borderRadius: '2px',
            marginBottom: '6px',
          }}
        >
          {label}
        </div>
      );
    }

    if (tpl === 'minimal-line') {
      return (
        <div
          style={{
            borderLeft: `3px solid ${accent}`,
            paddingLeft: '8px',
            color: '#0f172a',
            fontWeight: 700,
            fontSize: '11.5px',
            letterSpacing: '0.06em',
            marginBottom: '6px',
          }}
        >
          {label}
        </div>
      );
    }

    if (tpl === 'minimal-ats' || tpl === 'bangla-biodata') {
      return (
        <div
          style={{
            color: '#0f172a',
            fontWeight: 700,
            fontSize: '11.5px',
            letterSpacing: '0.05em',
            borderBottom: '1px solid #334155',
            paddingBottom: '2px',
            marginBottom: '6px',
          }}
        >
          {label}
        </div>
      );
    }

    return (
      <div
        style={{
          color: accent,
          fontWeight: 700,
          fontSize: '12px',
          letterSpacing: '0.05em',
          borderBottom: `1px solid ${hexToRgba(accent, 0.35)}`,
          paddingBottom: '3px',
          marginBottom: '6px',
        }}
      >
        {label}
      </div>
    );
  };

  // Reusable Section Blocks
  const renderObjectiveBlock = (num?: number) => {
    if (!data.careerObjective?.trim() && !interactive) return null;
    return (
      <div>
        {renderSectionHeading(L.careerObjective, num)}
        <div style={{ fontSize: baseTextSize, lineHeight: 1.55, color: '#1e293b' }}>
          {renderEditable(data.careerObjective, L.phObjective, { type: 'basic', field: 'careerObjective' }, { block: true })}
        </div>
      </div>
    );
  };

  const renderExperienceBlock = (num?: number) => {
    const visibleExps = interactive
      ? data.experiences
      : data.experiences.filter((e) => e.role.trim() || e.company.trim() || e.description.trim());
    if (visibleExps.length === 0 && !interactive) return null;

    return (
      <div>
        {renderSectionHeading(L.workExperience, num)}
        <div className="space-y-2.5">
          {visibleExps.map((exp, idx) => (
            <div key={exp.id} className="relative group">
              <div className="flex items-baseline justify-between gap-2 flex-wrap">
                <div className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap" style={{ fontSize: baseTextSize }}>
                  {renderEditable(exp.role, L.phRole, { type: 'experience', index: idx, subField: 'role' })}
                  <span className="text-slate-400 font-normal">—</span>
                  <span className="font-semibold text-slate-700">
                    {renderEditable(exp.company, L.phCompany, { type: 'experience', index: idx, subField: 'company' })}
                  </span>
                </div>
                <div className="text-[11.5px] text-slate-600 flex items-center gap-1 shrink-0 font-mono">
                  {renderEditable(exp.startDate, L.phStart, { type: 'experience', index: idx, subField: 'startDate' })}
                  {(exp.startDate || exp.endDate || interactive) && <span>–</span>}
                  {renderEditable(exp.endDate, L.phEnd, { type: 'experience', index: idx, subField: 'endDate' })}
                  {interactive && onRemoveExperience && data.experiences.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveExperience(idx);
                      }}
                      className="ml-1 p-0.5 text-red-500 hover:bg-red-50 rounded cursor-pointer"
                      title="Remove"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
              <div
                className="mt-1 whitespace-pre-line text-slate-700"
                style={{ fontSize: '12px', lineHeight: 1.5 }}
              >
                {renderEditable(exp.description, L.phJobDesc, { type: 'experience', index: idx, subField: 'description' }, { block: true })}
              </div>
            </div>
          ))}

          {interactive && onAddExperience && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAddExperience();
              }}
              className="mt-1 inline-flex items-center gap-1 px-3 py-1 rounded-full border border-dashed border-slate-400 text-[11px] font-medium text-slate-600 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50/50 transition cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>{L.addExp.replace(/^\+\s*/, '')}</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderEducationBlock = (num?: number, asTable = false) => {
    const visibleEdus = interactive
      ? data.educations
      : data.educations.filter((e) => e.degree.trim() || e.institution.trim() || e.result.trim());
    if (visibleEdus.length === 0 && !interactive) return null;

    if (asTable) {
      return (
        <div>
          {renderSectionHeading(L.academicQual, num)}
          <table className="w-full border-collapse text-[11.5px]" style={{ border: '1px solid #94a3b8' }}>
            <thead>
              <tr style={{ backgroundColor: accentTint }}>
                <th className="text-left px-2 py-1.5 border border-slate-300 font-bold text-slate-800">{L.exam}</th>
                <th className="text-left px-2 py-1.5 border border-slate-300 font-bold text-slate-800">{L.institute}</th>
                <th className="text-left px-2 py-1.5 border border-slate-300 font-bold text-slate-800">{L.boardGroup}</th>
                <th className="text-center px-2 py-1.5 border border-slate-300 font-bold text-slate-800">{L.year}</th>
                <th className="text-center px-2 py-1.5 border border-slate-300 font-bold text-slate-800">{L.result}</th>
              </tr>
            </thead>
            <tbody>
              {visibleEdus.map((edu, idx) => (
                <tr key={edu.id}>
                  <td className="px-2 py-1.5 border border-slate-300 font-semibold text-slate-900">
                    {renderEditable(edu.degree, L.phDegree, { type: 'education', index: idx, subField: 'degree' })}
                  </td>
                  <td className="px-2 py-1.5 border border-slate-300 text-slate-700">
                    {renderEditable(edu.institution, L.phInst, { type: 'education', index: idx, subField: 'institution' })}
                  </td>
                  <td className="px-2 py-1.5 border border-slate-300 text-slate-700">
                    {renderEditable(edu.boardOrGroup, L.phWrite, { type: 'education', index: idx, subField: 'boardOrGroup' })}
                  </td>
                  <td className="px-2 py-1.5 border border-slate-300 text-center font-mono text-slate-700">
                    {renderEditable(edu.year, L.phYear, { type: 'education', index: idx, subField: 'year' })}
                  </td>
                  <td className="px-2 py-1.5 border border-slate-300 text-center font-semibold text-slate-800">
                    {renderEditable(edu.result, L.phResult, { type: 'education', index: idx, subField: 'result' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {interactive && onAddEducation && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAddEducation();
              }}
              className="mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-full border border-dashed border-slate-400 text-[11px] font-medium text-slate-600 hover:border-blue-500 hover:text-blue-600 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>{L.addEdu.replace(/^\+\s*/, '')}</span>
            </button>
          )}
        </div>
      );
    }

    return (
      <div>
        {renderSectionHeading(tpl === 'colored-bar' ? L.academicQual : L.education, num)}
        <div className="space-y-2">
          {visibleEdus.map((edu, idx) => (
            <div key={edu.id} className="relative">
              <div className="flex items-baseline justify-between gap-2 flex-wrap">
                <div className="font-bold text-slate-900" style={{ fontSize: baseTextSize }}>
                  {renderEditable(edu.degree, L.phDegree, { type: 'education', index: idx, subField: 'degree' })}
                </div>
                <div className="text-[11.5px] font-mono text-slate-600 flex items-center gap-1">
                  {renderEditable(edu.year, L.phYear, { type: 'education', index: idx, subField: 'year' })}
                  {interactive && onRemoveEducation && data.educations.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveEducation(idx);
                      }}
                      className="ml-1 p-0.5 text-red-500 hover:bg-red-50 rounded cursor-pointer"
                      title="Remove"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
              {tpl === 'colored-bar' ? (
                <ul className="pl-4 mt-0.5 text-[11.5px] text-slate-700 list-disc space-y-0.5">
                  <li>
                    {L.institute}: {renderEditable(edu.institution, L.phInst, { type: 'education', index: idx, subField: 'institution' })}
                  </li>
                  {(edu.boardOrGroup || interactive) && (
                    <li>
                      {L.boardGroup}: {renderEditable(edu.boardOrGroup, L.phWrite, { type: 'education', index: idx, subField: 'boardOrGroup' })}
                    </li>
                  )}
                  <li>
                    {L.result}: {renderEditable(edu.result, L.phResult, { type: 'education', index: idx, subField: 'result' })}
                  </li>
                </ul>
              ) : (
                <div className="pl-3 mt-0.5 text-[12px] text-slate-700 flex items-center gap-1.5 flex-wrap">
                  {renderEditable(edu.institution, L.phInst, { type: 'education', index: idx, subField: 'institution' })}
                  {edu.boardOrGroup && (
                    <>
                      <span className="text-slate-400">·</span>
                      <span>{edu.boardOrGroup}</span>
                    </>
                  )}
                  <span className="text-slate-400">·</span>
                  <span>
                    {L.result}:{' '}
                    {renderEditable(edu.result, L.phResult, { type: 'education', index: idx, subField: 'result' })}
                  </span>
                </div>
              )}
            </div>
          ))}

          {interactive && onAddEducation && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAddEducation();
              }}
              className="mt-1 inline-flex items-center gap-1 px-3 py-1 rounded-full border border-dashed border-slate-400 text-[11px] font-medium text-slate-600 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50/50 transition cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>{L.addEdu.replace(/^\+\s*/, '')}</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderSkillsBlock = (num?: number, styleMode: 'inline' | 'tags' | 'sidebar-dark' = 'inline') => {
    const hasSkills = data.skills.length > 0;
    if (!hasSkills && !interactive) return null;

    if (styleMode === 'sidebar-dark') {
      return (
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-white/95 border-b border-white/25 pb-1 mb-2">
            {L.skills}
          </div>
          <div
            onClick={(e) => {
              if (!interactive || !onEditField) return;
              e.stopPropagation();
              onEditField({ type: 'skills' });
            }}
            className={interactive ? 'cursor-pointer' : ''}
          >
            {hasSkills ? (
              <div className="flex flex-wrap gap-1.5">
                {data.skills.map((s, i) => (
                  <span
                    key={i}
                    className="text-[10.5px] px-2 py-0.5 rounded bg-white/15 text-white border border-white/25"
                  >
                    {s}
                  </span>
                ))}
              </div>
            ) : (
              <div
                className="text-[11px] px-2 py-1 rounded"
                style={{
                  backgroundColor: 'rgba(254, 243, 199, 0.2)',
                  border: '1px dashed rgba(251, 191, 36, 0.85)',
                  color: '#fef3c7',
                }}
              >
                {L.phSkills}
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div>
        {renderSectionHeading(L.skills, num)}
        <div
          onClick={(e) => {
            if (!interactive || !onEditField) return;
            e.stopPropagation();
            onEditField({ type: 'skills' });
          }}
          className={interactive ? 'cursor-pointer' : ''}
        >
          {hasSkills ? (
            styleMode === 'tags' || tpl === 'minimal-line' ? (
              <div className="flex flex-wrap gap-1.5">
                {data.skills.map((s, i) => (
                  <span
                    key={i}
                    style={{
                      border: `1px solid ${hexToRgba(accent, 0.35)}`,
                      backgroundColor: hexToRgba(accent, 0.06),
                      color: '#1e293b',
                    }}
                    className="text-[11px] px-2 py-0.5 rounded"
                  >
                    {s}
                  </span>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: baseTextSize, color: '#1e293b', lineHeight: 1.5 }}>
                {data.skills.join('  •  ')}
              </div>
            )
          ) : (
            <span
              className="inline-block text-[12px]"
              style={{
                backgroundColor: '#fef3c7',
                border: '1px dashed #d97706',
                color: '#92400e',
                borderRadius: '4px',
                padding: '2px 8px',
              }}
            >
              {L.phSkills}
            </span>
          )}
        </div>
      </div>
    );
  };

  const renderLanguagesBlock = (num?: number, darkSidebar = false) => {
    const show = data.showLanguages || data.languages.length > 0;
    if (!show) return null;

    if (darkSidebar) {
      return (
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-white/95 border-b border-white/25 pb-1 mb-1.5">
            {L.languages}
          </div>
          <div
            onClick={(e) => {
              if (!interactive || !onEditField) return;
              e.stopPropagation();
              onEditField({ type: 'languages' });
            }}
            className={`text-[11px] text-white/90 space-y-0.5 ${interactive ? 'cursor-pointer' : ''}`}
          >
            {data.languages.length > 0 ? (
              data.languages.map((langItem, i) => <div key={i}>• {langItem}</div>)
            ) : (
              <span className="text-amber-200 underline">{L.phLanguages}</span>
            )}
          </div>
        </div>
      );
    }

    return (
      <div>
        {renderSectionHeading(L.languages, num)}
        <div
          onClick={(e) => {
            if (!interactive || !onEditField) return;
            e.stopPropagation();
            onEditField({ type: 'languages' });
          }}
          className={interactive ? 'cursor-pointer' : ''}
          style={{ fontSize: baseTextSize, color: '#1e293b' }}
        >
          {data.languages.length > 0 ? (
            data.languages.join('  •  ')
          ) : (
            <span
              className="inline-block text-[12px]"
              style={{
                backgroundColor: '#fef3c7',
                border: '1px dashed #d97706',
                color: '#92400e',
                borderRadius: '4px',
                padding: '1px 8px',
              }}
            >
              {L.phLanguages}
            </span>
          )}
        </div>
      </div>
    );
  };

  const renderTrainingsBlock = (num?: number) => {
    const show = data.showTrainings || data.trainings.length > 0;
    if (!show) return null;

    return (
      <div>
        {renderSectionHeading(L.training, num)}
        <div className="space-y-1.5">
          {data.trainings.map((trn, idx) => (
            <div
              key={trn.id}
              onClick={(e) => {
                if (!interactive || !onEditField) return;
                e.stopPropagation();
                onEditField({ type: 'training', index: idx });
              }}
              className={`flex items-baseline justify-between gap-2 text-[12px] ${
                interactive ? 'cursor-pointer hover:bg-amber-50 rounded px-1 -mx-1' : ''
              }`}
            >
              <div>
                <span className="font-semibold text-slate-900">{trn.title || L.phWrite}</span>
                {trn.institute && <span className="text-slate-600"> — {trn.institute}</span>}
              </div>
              <div className="flex items-center gap-1 font-mono text-[11px] text-slate-600 shrink-0">
                <span>{trn.year}</span>
                {interactive && onRemoveTraining && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveTraining(idx);
                    }}
                    className="p-0.5 text-red-500 hover:bg-red-50 rounded cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
          {interactive && onAddTraining && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAddTraining();
              }}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-dashed border-slate-400 text-[11px] text-slate-600 hover:border-blue-500 hover:text-blue-600 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>{L.addTrn.replace(/^\+\s*/, '')}</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderReferencesBlock = (num?: number) => {
    const show = data.showReferences || data.references.length > 0;
    if (!show) return null;

    return (
      <div>
        {renderSectionHeading(L.references, num)}
        <div className="grid grid-cols-2 gap-3">
          {data.references.map((ref, idx) => (
            <div
              key={ref.id}
              onClick={(e) => {
                if (!interactive || !onEditField) return;
                e.stopPropagation();
                onEditField({ type: 'reference', index: idx });
              }}
              className={`text-[11.5px] leading-snug ${
                interactive ? 'cursor-pointer hover:bg-amber-50 rounded p-1 -m-1' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">{ref.name || L.phWrite}</span>
                {interactive && onRemoveReference && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveReference(idx);
                    }}
                    className="p-0.5 text-red-500 hover:bg-red-50 rounded cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
              {ref.designation && <div className="text-slate-700">{ref.designation}</div>}
              {ref.organization && <div className="text-slate-600">{ref.organization}</div>}
              {ref.phone && <div className="font-mono text-slate-600">{ref.phone}</div>}
            </div>
          ))}
        </div>
        {interactive && onAddReference && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddReference();
            }}
            className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-dashed border-slate-400 text-[11px] text-slate-600 hover:border-blue-500 hover:text-blue-600 cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>{L.addRef.replace(/^\+\s*/, '')}</span>
          </button>
        )}
      </div>
    );
  };

  const personalRows: {
    label: string;
    field: 'fatherName' | 'motherName' | 'dateOfBirth' | 'nationalId' | 'religion' | 'maritalStatus' | 'nationality' | 'bloodGroup' | 'height' | 'weight';
    value: string;
    includePhysical?: boolean;
  }[] = [
    { label: L.fatherName, field: 'fatherName', value: data.fatherName },
    { label: L.motherName, field: 'motherName', value: data.motherName },
    { label: L.dob, field: 'dateOfBirth', value: data.dateOfBirth },
    { label: L.nid, field: 'nationalId', value: data.nationalId },
    { label: L.religion, field: 'religion', value: data.religion },
    { label: L.maritalStatus, field: 'maritalStatus', value: data.maritalStatus },
    { label: L.nationality, field: 'nationality', value: data.nationality },
    { label: L.bloodGroup, field: 'bloodGroup', value: data.bloodGroup },
  ];

  const renderPersonalDetailsBlock = (
    num?: number,
    columns: 1 | 2 = 2,
    includePhysical = false,
    darkSidebar = false
  ) => {
    const rows = includePhysical
      ? [
          ...personalRows,
          { label: L.height, field: 'height' as const, value: data.height },
          { label: L.weight, field: 'weight' as const, value: data.weight },
        ]
      : personalRows;

    const visibleRows = interactive ? rows : rows.filter((r) => r.value?.trim());
    if (visibleRows.length === 0 && !interactive) return null;

    if (darkSidebar) {
      return (
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-white/95 border-b border-white/25 pb-1 mb-1.5">
            {L.personalDetails}
          </div>
          <div className="space-y-1 text-[10.5px] text-white/90">
            {visibleRows.map((row) => (
              <div key={row.field} className="leading-tight">
                <span className="text-white/65">{row.label}: </span>
                {renderEditable(row.value, L.phWrite, { type: 'personal', field: row.field }, { darkSurface: true })}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div>
        {renderSectionHeading(L.personalDetails, num)}
        <div
          className={columns === 2 ? 'grid grid-cols-2 gap-x-6 gap-y-1.5' : 'space-y-1'}
          style={{ fontSize: '12px' }}
        >
          {visibleRows.map((row) => (
            <div key={row.field} className="flex items-baseline gap-2">
              <span className="text-slate-600 w-28 shrink-0">{row.label}</span>
              <span className="text-slate-400">:</span>
              <span className="text-slate-900 font-medium">
                {renderEditable(row.value, L.phWrite, { type: 'personal', field: row.field })}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDeclarationBlock = (num?: number, signAlign: 'left' | 'right' = 'left') => (
    <div>
      {renderSectionHeading(L.declaration, num)}
      <div style={{ fontSize: '12px', color: '#1e293b', lineHeight: 1.5 }}>
        {renderEditable(data.declarationText, 'I hereby declare that the above information is true and correct.', {
          type: 'basic',
          field: 'declarationText',
        })}
      </div>
      {renderSignature(signAlign)}
    </div>
  );

  // =========================================================================
  // SPECIALIZED LAYOUT 1: MARRIAGE BIODATA (Framed Traditional Layout)
  // =========================================================================
  if (tpl === 'marriage-biodata') {
    const marriagePersonal: { label: string; target: CvFieldTarget; value: string }[] = [
      { label: L.phName, target: { type: 'basic', field: 'fullName' }, value: data.fullName },
      { label: L.dob, target: { type: 'personal', field: 'dateOfBirth' }, value: data.dateOfBirth },
      { label: L.age, target: { type: 'personal', field: 'age' }, value: data.age },
      { label: L.height, target: { type: 'personal', field: 'height' }, value: data.height },
      { label: L.weight, target: { type: 'personal', field: 'weight' }, value: data.weight },
      { label: L.complexion, target: { type: 'personal', field: 'complexion' }, value: data.complexion },
      { label: L.bloodGroup, target: { type: 'personal', field: 'bloodGroup' }, value: data.bloodGroup },
      { label: L.maritalStatus, target: { type: 'personal', field: 'maritalStatus' }, value: data.maritalStatus },
      { label: L.religion, target: { type: 'personal', field: 'religion' }, value: data.religion },
      { label: L.nationality, target: { type: 'personal', field: 'nationality' }, value: data.nationality },
    ];

    const familyRows: { label: string; target: CvFieldTarget; value: string }[] = [
      { label: L.fatherName, target: { type: 'personal', field: 'fatherName' }, value: data.fatherName },
      { label: L.fatherOcc, target: { type: 'family', field: 'fatherOccupation' }, value: data.fatherOccupation },
      { label: L.motherName, target: { type: 'personal', field: 'motherName' }, value: data.motherName },
      { label: L.motherOcc, target: { type: 'family', field: 'motherOccupation' }, value: data.motherOccupation },
      { label: L.brothers, target: { type: 'family', field: 'brothers' }, value: data.brothers },
      { label: L.sisters, target: { type: 'family', field: 'sisters' }, value: data.sisters },
    ];

    return (
      <div
        className="bg-white text-slate-900 box-border"
        style={{
          width: '794px',
          minHeight: '1123px',
          fontFamily,
          padding: '26px',
        }}
      >
        <div
          className="h-full min-h-[1070px] px-8 py-6 flex flex-col justify-between"
          style={{ border: `2.5px solid ${accent}`, borderRadius: '4px' }}
        >
          <div className="space-y-4">
            {/* Title + Right Photo */}
            <div className="flex items-start justify-between gap-4 border-b pb-3" style={{ borderColor: accentBorder }}>
              <div className="flex-1 pt-4 text-center">
                <h1 className="text-xl font-bold tracking-wider uppercase" style={{ color: accent }}>
                  {L.marriageTitle}
                </h1>
              </div>
              {renderPhotoBox({ width: 98, height: 118 })}
            </div>

            {/* Personal Details */}
            <div>
              {renderSectionHeading(L.personalDetails)}
              <div className="space-y-1 text-[12px]">
                {marriagePersonal
                  .filter((r) => interactive || r.value?.trim())
                  .map((row) => (
                    <div key={row.label} className="flex items-baseline gap-2">
                      <span className="w-40 text-slate-600 shrink-0">{row.label}</span>
                      <span className="text-slate-400">:</span>
                      <span className="font-medium text-slate-900">
                        {renderEditable(row.value, L.phWrite, row.target)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Address */}
            <div>
              {renderSectionHeading(L.address)}
              <div className="space-y-1 text-[12px]">
                <div className="flex items-baseline gap-2">
                  <span className="w-40 text-slate-600 shrink-0">{L.presentAddress}</span>
                  <span className="text-slate-400">:</span>
                  <span className="font-medium text-slate-900">
                    {renderEditable(data.address, L.phWrite, { type: 'basic', field: 'address' })}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="w-40 text-slate-600 shrink-0">{L.permanentAddress}</span>
                  <span className="text-slate-400">:</span>
                  <span className="font-medium text-slate-900">
                    {renderEditable(data.permanentAddress, L.phWrite, { type: 'basic', field: 'permanentAddress' })}
                  </span>
                </div>
              </div>
            </div>

            {/* Education Table */}
            {renderEducationBlock(undefined, true)}

            {/* Occupation */}
            {(interactive || data.occupation?.trim() || data.jobTitle?.trim()) && (
              <div>
                {renderSectionHeading(L.occupation)}
                <div className="text-[12px] text-slate-900 font-medium">
                  {renderEditable(data.occupation || data.jobTitle, L.phWrite, {
                    type: 'family',
                    field: 'occupation',
                  })}
                </div>
              </div>
            )}

            {/* Family Information */}
            <div>
              {renderSectionHeading(L.familyInfo)}
              <div className="space-y-1 text-[12px]">
                {familyRows
                  .filter((r) => interactive || r.value?.trim())
                  .map((row) => (
                    <div key={row.label} className="flex items-baseline gap-2">
                      <span className="w-40 text-slate-600 shrink-0">{row.label}</span>
                      <span className="text-slate-400">:</span>
                      <span className="font-medium text-slate-900">
                        {renderEditable(row.value, L.phWrite, row.target)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Partner Expectation */}
            {(interactive || data.partnerExpectation?.trim()) && (
              <div>
                {renderSectionHeading(L.partnerExpectation)}
                <div className="text-[12px] text-slate-800">
                  {renderEditable(data.partnerExpectation, L.phWrite, {
                    type: 'family',
                    field: 'partnerExpectation',
                  }, { block: true })}
                </div>
              </div>
            )}

            {/* Guardian Contact */}
            <div>
              {renderSectionHeading(L.guardianContact)}
              <div className="space-y-1 text-[12px]">
                <div className="flex items-baseline gap-2">
                  <span className="w-40 text-slate-600 shrink-0">{L.guardianContact}</span>
                  <span className="text-slate-400">:</span>
                  <span className="font-semibold text-slate-900">
                    {renderEditable(data.guardianContact || data.phone, L.phWrite, {
                      type: 'family',
                      field: 'guardianContact',
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // SPECIALIZED LAYOUT 2: SIDEBAR TEMPLATES (Modern, Colored 1P/2P, Navy Tech)
  // =========================================================================
  if (
    tpl === 'modern-sidebar' ||
    tpl === 'colored-sidebar-1p' ||
    tpl === 'colored-sidebar-2p' ||
    tpl === 'navy-tech-sidebar'
  ) {
    const isLightSidebar = tpl === 'modern-sidebar';
    const sidebarBg = isLightSidebar ? '#f1f5f9' : tpl === 'navy-tech-sidebar' ? (data.accentColor || '#1e3a5f') : accent;

    return (
      <div
        className="bg-white text-slate-900 box-border flex"
        style={{ width: '794px', minHeight: '1123px', fontFamily }}
      >
        {/* LEFT SIDEBAR COLUMN */}
        <div
          className="w-[244px] shrink-0 px-5 py-7 flex flex-col justify-between gap-5"
          style={{
            backgroundColor: sidebarBg,
            color: isLightSidebar ? '#1e293b' : '#ffffff',
          }}
        >
          <div className="space-y-5">
            {isLightSidebar && (
              <div>
                <h1 className="text-lg font-bold leading-tight" style={{ color: accent }}>
                  {renderEditable(data.fullName, L.phName, { type: 'basic', field: 'fullName' })}
                </h1>
                <div className="text-xs text-slate-600 mt-0.5 font-medium">
                  {renderEditable(data.jobTitle, L.phJob, { type: 'basic', field: 'jobTitle' })}
                </div>
              </div>
            )}

            <div className="flex justify-center">
              {renderPhotoBox({ width: 122, height: 146, darkBorder: !isLightSidebar })}
            </div>

            {/* Contact Info */}
            <div>
              <div
                className="text-[11px] font-bold uppercase tracking-wider pb-1 mb-2"
                style={{
                  color: isLightSidebar ? accent : '#ffffff',
                  borderBottom: isLightSidebar ? `1px solid ${accentBorder}` : '1px solid rgba(255,255,255,0.28)',
                }}
              >
                {L.contact}
              </div>
              <div className="space-y-1.5 text-[11px] break-words">
                <div>
                  <div className={isLightSidebar ? 'text-slate-500 text-[10px]' : 'text-white/65 text-[10px]'}>
                    {L.phPhone}
                  </div>
                  <div className="font-medium">
                    {renderEditable(data.phone, L.phPhone, { type: 'basic', field: 'phone' }, { darkSurface: !isLightSidebar })}
                  </div>
                </div>
                <div>
                  <div className={isLightSidebar ? 'text-slate-500 text-[10px]' : 'text-white/65 text-[10px]'}>
                    {L.phEmail}
                  </div>
                  <div className="font-medium">
                    {renderEditable(data.email, L.phEmail, { type: 'basic', field: 'email' }, { darkSurface: !isLightSidebar })}
                  </div>
                </div>
                <div>
                  <div className={isLightSidebar ? 'text-slate-500 text-[10px]' : 'text-white/65 text-[10px]'}>
                    {L.phAddress}
                  </div>
                  <div className="font-medium">
                    {renderEditable(data.address, L.phAddress, { type: 'basic', field: 'address' }, { darkSurface: !isLightSidebar })}
                  </div>
                </div>
              </div>
            </div>

            {/* Skills in Sidebar */}
            {isLightSidebar ? renderSkillsBlock(undefined, 'tags') : renderSkillsBlock(undefined, 'sidebar-dark')}

            {/* Languages in Sidebar */}
            {isLightSidebar ? renderLanguagesBlock() : renderLanguagesBlock(undefined, true)}

            {/* Personal Details inside Colored Sidebars */}
            {!isLightSidebar && renderPersonalDetailsBlock(undefined, 1, false, true)}

            {/* Declaration inside Light Modern Sidebar */}
            {isLightSidebar && (
              <div>
                <div
                  className="text-[11px] font-bold uppercase tracking-wider pb-1 mb-1.5"
                  style={{ color: accent, borderBottom: `1px solid ${accentBorder}` }}
                >
                  {L.declaration}
                </div>
                <div className="text-[10.5px] text-slate-600 leading-relaxed">
                  {data.declarationText}
                </div>
                {renderSignature('left')}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT MAIN CONTENT COLUMN */}
        <div className={`flex-1 px-7 py-7 ${sectionGap}`}>
          {!isLightSidebar && (
            <div
              className="pb-3"
              style={{
                borderBottom:
                  tpl === 'navy-tech-sidebar' ? '3px solid #0f172a' : `2px solid ${accent}`,
              }}
            >
              <h1 className="text-2xl font-bold leading-tight" style={{ color: accent }}>
                {renderEditable(data.fullName, L.phName, { type: 'basic', field: 'fullName' })}
              </h1>
              <div className="text-sm font-semibold text-slate-600 mt-1">
                {renderEditable(data.jobTitle, L.phJob, { type: 'basic', field: 'jobTitle' })}
              </div>
            </div>
          )}

          {renderObjectiveBlock()}
          {renderExperienceBlock()}
          {renderEducationBlock()}
          {renderTrainingsBlock()}
          {renderReferencesBlock()}
          {isLightSidebar && renderPersonalDetailsBlock(undefined, 2)}
          {!isLightSidebar && renderDeclarationBlock()}
        </div>
      </div>
    );
  }

  // =========================================================================
  // SPECIALIZED LAYOUT 3: COLORED HEADER BAND (Top Colored Banner + 2 Columns)
  // =========================================================================
  if (tpl === 'colored-header-band') {
    return (
      <div
        className="bg-white text-slate-900 box-border flex flex-col"
        style={{ width: '794px', minHeight: '1123px', fontFamily }}
      >
        {/* Top Full-Width Colored Band */}
        <div
          className="px-9 py-6 flex items-center justify-between gap-6 text-white"
          style={{ backgroundColor: accent }}
        >
          <div className="space-y-1.5 flex-1">
            <h1 className="text-2xl font-bold tracking-wide uppercase">
              {renderEditable(data.fullName, L.phName, { type: 'basic', field: 'fullName' }, { darkSurface: true })}
            </h1>
            <div className="text-sm font-medium text-white/90">
              {renderEditable(data.jobTitle, L.phJob, { type: 'basic', field: 'jobTitle' }, { darkSurface: true })}
            </div>
            <div className="text-[11.5px] text-white/85 flex items-center gap-2 flex-wrap pt-1">
              {renderEditable(data.phone, L.phPhone, { type: 'basic', field: 'phone' }, { darkSurface: true })}
              <span>·</span>
              {renderEditable(data.email, L.phEmail, { type: 'basic', field: 'email' }, { darkSurface: true })}
              <span>·</span>
              {renderEditable(data.address, L.phAddress, { type: 'basic', field: 'address' }, { darkSurface: true })}
            </div>
          </div>
          {renderPhotoBox({ width: 92, height: 112, darkBorder: true })}
        </div>

        {/* 2-Column Body */}
        <div className="flex flex-1 px-9 py-6 gap-7">
          {/* Left Meta Column */}
          <div className="w-[235px] shrink-0 space-y-5 pr-5 border-r border-slate-200">
            {renderPersonalDetailsBlock(undefined, 1)}
            {renderSkillsBlock(undefined, 'tags')}
            {renderLanguagesBlock()}
          </div>
          {/* Right Primary Column */}
          <div className={`flex-1 ${sectionGap}`}>
            {renderObjectiveBlock()}
            {renderExperienceBlock()}
            {renderEducationBlock()}
            {renderTrainingsBlock()}
            {renderReferencesBlock()}
            {renderDeclarationBlock()}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // SPECIALIZED LAYOUT 4: ABROAD / VISA & ABROAD / GULF STANDARD
  // =========================================================================
  if (tpl === 'abroad-visa' || tpl === 'abroad-gulf') {
    const isGulf = tpl === 'abroad-gulf';
    return (
      <div
        className={`bg-white text-slate-900 box-border ${padClass} ${sectionGap}`}
        style={{ width: '794px', minHeight: '1123px', fontFamily }}
      >
        {isGulf && (
          <div className="text-center text-sm font-bold tracking-widest uppercase text-slate-800 pb-1 border-b border-slate-300">
            {L.cvTitle}
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-3" style={{ borderBottom: `2px solid ${accent}` }}>
          <div className="space-y-1 flex-1">
            {!isGulf && (
              <div className="text-[10px] font-bold tracking-widest uppercase text-slate-500">
                {L.cvTitle}
              </div>
            )}
            <h1 className="text-2xl font-bold uppercase" style={{ color: accent }}>
              {renderEditable(data.fullName, L.phName, { type: 'basic', field: 'fullName' })}
            </h1>
            <div className="text-sm font-semibold text-slate-700">
              {renderEditable(data.jobTitle, L.phJob, { type: 'basic', field: 'jobTitle' })}
            </div>
            <div className="text-[11.5px] text-slate-600 flex items-center gap-2 flex-wrap pt-0.5">
              {renderEditable(data.phone, L.phPhone, { type: 'basic', field: 'phone' })}
              <span>•</span>
              {renderEditable(data.email, L.phEmail, { type: 'basic', field: 'email' })}
              <span>•</span>
              {renderEditable(data.address, L.phAddress, { type: 'basic', field: 'address' })}
            </div>
          </div>
          {renderPhotoBox({ width: 98, height: 118 })}
        </div>

        {/* Passport Details (Side-by-side boxes in Abroad Visa, 4-col Table in Gulf) */}
        {isGulf ? (
          <div>
            <table className="w-full border-collapse text-[11.5px]" style={{ border: `1px solid ${accentBorder}` }}>
              <thead>
                <tr style={{ backgroundColor: accentTint }}>
                  <th className="px-2 py-1.5 border border-slate-300 text-left font-bold" style={{ color: accent }}>{L.passportNo}</th>
                  <th className="px-2 py-1.5 border border-slate-300 text-left font-bold" style={{ color: accent }}>{L.issueDate}</th>
                  <th className="px-2 py-1.5 border border-slate-300 text-left font-bold" style={{ color: accent }}>{L.expiryDate}</th>
                  <th className="px-2 py-1.5 border border-slate-300 text-left font-bold" style={{ color: accent }}>{L.issuePlace}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-2 py-1.5 border border-slate-300 font-mono font-bold">
                    {renderEditable(data.passportNo, L.phWrite, { type: 'passport', field: 'passportNo' })}
                  </td>
                  <td className="px-2 py-1.5 border border-slate-300">
                    {renderEditable(data.passportIssueDate, L.phWrite, { type: 'passport', field: 'passportIssueDate' })}
                  </td>
                  <td className="px-2 py-1.5 border border-slate-300">
                    {renderEditable(data.passportExpiryDate, L.phWrite, { type: 'passport', field: 'passportExpiryDate' })}
                  </td>
                  <td className="px-2 py-1.5 border border-slate-300">
                    {renderEditable(data.passportIssuePlace, L.phWrite, { type: 'passport', field: 'passportIssuePlace' })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-slate-300 rounded p-3">
              {renderSectionHeading(L.passportDetails)}
              <div className="space-y-1 text-[11.5px]">
                <div className="flex gap-2">
                  <span className="w-28 text-slate-600 shrink-0">{L.passportNo}:</span>
                  <span className="font-mono font-bold">
                    {renderEditable(data.passportNo, L.phWrite, { type: 'passport', field: 'passportNo' })}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="w-28 text-slate-600 shrink-0">{L.issueDate}:</span>
                  <span>{renderEditable(data.passportIssueDate, L.phWrite, { type: 'passport', field: 'passportIssueDate' })}</span>
                </div>
                <div className="flex gap-2">
                  <span className="w-28 text-slate-600 shrink-0">{L.expiryDate}:</span>
                  <span>{renderEditable(data.passportExpiryDate, L.phWrite, { type: 'passport', field: 'passportExpiryDate' })}</span>
                </div>
                <div className="flex gap-2">
                  <span className="w-28 text-slate-600 shrink-0">{L.issuePlace}:</span>
                  <span>{renderEditable(data.passportIssuePlace, L.phWrite, { type: 'passport', field: 'passportIssuePlace' })}</span>
                </div>
              </div>
            </div>

            <div className="border border-slate-300 rounded p-3">
              {renderSectionHeading(L.personalDetails)}
              <div className="space-y-1 text-[11.5px]">
                <div className="flex gap-2">
                  <span className="w-28 text-slate-600 shrink-0">{L.fatherName}:</span>
                  <span>{renderEditable(data.fatherName, L.phWrite, { type: 'personal', field: 'fatherName' })}</span>
                </div>
                <div className="flex gap-2">
                  <span className="w-28 text-slate-600 shrink-0">{L.dob}:</span>
                  <span>{renderEditable(data.dateOfBirth, L.phWrite, { type: 'personal', field: 'dateOfBirth' })}</span>
                </div>
                <div className="flex gap-2">
                  <span className="w-28 text-slate-600 shrink-0">{L.nationality}:</span>
                  <span>{renderEditable(data.nationality, L.phWrite, { type: 'personal', field: 'nationality' })}</span>
                </div>
                <div className="flex gap-2">
                  <span className="w-28 text-slate-600 shrink-0">{L.height} / {L.weight}:</span>
                  <span>
                    {renderEditable(data.height, L.phWrite, { type: 'personal', field: 'height' })} ·{' '}
                    {renderEditable(data.weight, L.phWrite, { type: 'personal', field: 'weight' })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {renderObjectiveBlock()}
        {isGulf && renderPersonalDetailsBlock(undefined, 2, true)}
        {renderExperienceBlock()}
        {renderSkillsBlock()}
        {renderEducationBlock()}
        {renderTrainingsBlock()}
        {renderLanguagesBlock()}
        {(interactive || data.bangladeshContact?.trim()) && (
          <div>
            {renderSectionHeading(L.contactBd)}
            <div className="text-[12px] text-slate-800">
              {renderEditable(data.bangladeshContact || data.permanentAddress, L.phWrite, {
                type: 'passport',
                field: 'bangladeshContact',
              })}
            </div>
          </div>
        )}
        {renderDeclarationBlock()}
      </div>
    );
  }

  // =========================================================================
  // SPECIALIZED LAYOUT 5: BANGLA BIODATA & GOVT / NGO FORMAL
  // =========================================================================
  if (tpl === 'bangla-biodata' || tpl === 'govt-ngo-formal') {
    const isGovt = tpl === 'govt-ngo-formal';
    let secNum = 1;
    const nextNum = () => (isGovt ? secNum++ : undefined);

    return (
      <div
        className={`bg-white text-slate-900 box-border ${padClass} ${sectionGap}`}
        style={{ width: '794px', minHeight: '1123px', fontFamily }}
      >
        {/* Centered Formal Header + Right Photo */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="text-center mb-3">
              <h1
                className="text-lg font-bold uppercase tracking-widest inline-block pb-0.5"
                style={{ borderBottom: `2px solid ${accent}`, color: accent }}
              >
                {L.cvTitle}
              </h1>
            </div>
            <div className="space-y-1 text-[12px]">
              <div className="text-base font-bold text-slate-900">
                {renderEditable(data.fullName, L.phName, { type: 'basic', field: 'fullName' })}
              </div>
              <div className="text-slate-700 font-semibold">
                {renderEditable(data.jobTitle, L.phJob, { type: 'basic', field: 'jobTitle' })}
              </div>
              <div className="text-slate-600 flex items-center gap-2 flex-wrap">
                {renderEditable(data.phone, L.phPhone, { type: 'basic', field: 'phone' })}
                <span>·</span>
                {renderEditable(data.email, L.phEmail, { type: 'basic', field: 'email' })}
                <span>·</span>
                {renderEditable(data.address, L.phAddress, { type: 'basic', field: 'address' })}
              </div>
            </div>
          </div>
          {renderPhotoBox({ width: 98, height: 118 })}
        </div>

        {renderObjectiveBlock(nextNum())}
        {renderPersonalDetailsBlock(nextNum(), isGovt ? 2 : 1)}
        {renderEducationBlock(nextNum(), true)}
        {renderExperienceBlock(nextNum())}
        {renderSkillsBlock(nextNum())}
        {renderTrainingsBlock(nextNum())}
        {renderLanguagesBlock(nextNum())}
        {renderReferencesBlock(nextNum())}
        {renderDeclarationBlock(nextNum(), 'right')}
      </div>
    );
  }

  // =========================================================================
  // SPECIALIZED LAYOUT 6: FRESHER 1-PAGE (Photo Left + Education & Skills First)
  // =========================================================================
  if (tpl === 'fresher-1p') {
    return (
      <div
        className={`bg-white text-slate-900 box-border ${padClass} ${sectionGap}`}
        style={{ width: '794px', minHeight: '1123px', fontFamily }}
      >
        <div
          className="flex items-center gap-5 pb-3.5"
          style={{ borderBottom: `2px solid ${accent}` }}
        >
          {renderPhotoBox({ width: 96, height: 114 })}
          <div className="flex-1 space-y-1">
            <h1 className="text-2xl font-bold uppercase" style={{ color: accent }}>
              {renderEditable(data.fullName, L.phName, { type: 'basic', field: 'fullName' })}
            </h1>
            <div className="text-sm font-semibold text-slate-700">
              {renderEditable(data.jobTitle, L.phJob, { type: 'basic', field: 'jobTitle' })}
            </div>
            <div className="text-[11.5px] text-slate-600 flex items-center gap-2 flex-wrap">
              {renderEditable(data.phone, L.phPhone, { type: 'basic', field: 'phone' })}
              <span>•</span>
              {renderEditable(data.email, L.phEmail, { type: 'basic', field: 'email' })}
              <span>•</span>
              {renderEditable(data.address, L.phAddress, { type: 'basic', field: 'address' })}
            </div>
          </div>
        </div>

        {renderObjectiveBlock()}
        {/* Fresher emphasizes Education & Skills FIRST */}
        {renderEducationBlock()}
        {renderSkillsBlock(undefined, 'tags')}
        {renderTrainingsBlock()}
        {renderExperienceBlock()}
        <div className="grid grid-cols-1 gap-3">
          {renderPersonalDetailsBlock(undefined, 2)}
          {renderLanguagesBlock()}
        </div>
        {renderReferencesBlock()}
        {renderDeclarationBlock()}
      </div>
    );
  }

  // =========================================================================
  // DEFAULT SINGLE-COLUMN FAMILY:
  // classic-plain, colored-bar, minimal-line, executive-one-col, minimal-ats, classic-with-photo
  // =========================================================================
  const isCenteredHeader = tpl === 'minimal-ats' || tpl === 'colored-bar';

  return (
    <div
      className={`bg-white text-slate-900 box-border ${padClass} ${sectionGap}`}
      style={{ width: '794px', minHeight: '1123px', fontFamily }}
    >
      {/* Top Header */}
      <div
        className={`flex items-start ${isCenteredHeader && tpl === 'minimal-ats' ? 'justify-center text-center' : 'justify-between'} gap-5 pb-3.5`}
        style={{
          borderBottom:
            tpl === 'minimal-ats'
              ? '1.5px solid #111827'
              : tpl === 'minimal-line'
              ? `1px solid ${accentBorder}`
              : `2.5px solid ${accent}`,
        }}
      >
        <div className={`flex-1 space-y-1.5 ${tpl === 'minimal-ats' ? 'text-center' : ''}`}>
          {tpl === 'colored-bar' && (
            <div className="text-center text-xs font-bold tracking-wider uppercase text-slate-600">
              {L.cvOf}
            </div>
          )}
          <h1
            className={`font-bold leading-tight ${
              tpl === 'minimal-ats' ? 'text-2xl uppercase tracking-wider text-slate-950' : 'text-[26px]'
            } ${tpl === 'colored-bar' ? 'text-center' : ''}`}
            style={{ color: tpl === 'minimal-ats' ? '#0f172a' : tpl === 'classic-plain' ? '#1e293b' : accent }}
          >
            {renderEditable(data.fullName, L.phName, { type: 'basic', field: 'fullName' })}
          </h1>
          <div className={`text-[14px] font-semibold text-slate-700 ${tpl === 'colored-bar' ? 'text-center' : ''}`}>
            {renderEditable(data.jobTitle, L.phJob, { type: 'basic', field: 'jobTitle' })}
          </div>
          <div
            className={`text-[12px] text-slate-600 flex items-center gap-2 flex-wrap pt-0.5 ${
              tpl === 'minimal-ats' || tpl === 'colored-bar' ? 'justify-center' : ''
            }`}
          >
            {renderEditable(data.phone, L.phPhone, { type: 'basic', field: 'phone' })}
            <span className="text-slate-400">•</span>
            {renderEditable(data.email, L.phEmail, { type: 'basic', field: 'email' })}
            <span className="text-slate-400">•</span>
            {renderEditable(data.address, L.phAddress, { type: 'basic', field: 'address' })}
          </div>
        </div>
        {tpl !== 'minimal-ats' && renderPhotoBox({ width: 100, height: 122 })}
      </div>

      {renderObjectiveBlock()}
      {renderExperienceBlock()}
      {renderEducationBlock()}
      {renderSkillsBlock(undefined, tpl === 'minimal-line' ? 'tags' : 'inline')}
      {renderTrainingsBlock()}
      {renderLanguagesBlock()}
      {renderPersonalDetailsBlock(undefined, tpl === 'colored-bar' ? 1 : 2)}
      {renderReferencesBlock()}
      {renderDeclarationBlock()}
    </div>
  );
};
