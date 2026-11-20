import React, { useState } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { CvCategory, CvData, CvTemplateId } from '../../types/cv';
import { CV_TEMPLATES, SAMPLE_PREVIEW_CV_DATA } from '../../utils/cvTemplates';
import { CvSheetRenderer } from './CvSheetRenderer';

interface CvTemplateGalleryProps {
  selectedTemplateId: CvTemplateId;
  cvLang: 'en' | 'bn';
  lang: 'bn' | 'en';
  onSelectTemplate: (templateId: CvTemplateId) => void;
  onChangeCvLang: (cvLang: 'en' | 'bn') => void;
  onBackToEditor?: () => void;
}

export const CvTemplateGallery: React.FC<CvTemplateGalleryProps> = ({
  selectedTemplateId,
  cvLang,
  lang,
  onSelectTemplate,
  onChangeCvLang,
  onBackToEditor,
}) => {
  const [category, setCategory] = useState<CvCategory>('all');
  const isBn = lang === 'bn';

  const counts = {
    all: CV_TEMPLATES.length,
    job: CV_TEMPLATES.filter((t) => t.category === 'job').length,
    abroad: CV_TEMPLATES.filter((t) => t.category === 'abroad').length,
    marriage: CV_TEMPLATES.filter((t) => t.category === 'marriage').length,
    fresher: CV_TEMPLATES.filter((t) => t.category === 'fresher').length,
  };

  const categories: { id: CvCategory; labelBn: string; labelEn: string }[] = [
    { id: 'all', labelBn: `সব (${counts.all})`, labelEn: `All (${counts.all})` },
    { id: 'job', labelBn: `চাকরি (${counts.job})`, labelEn: `Job (${counts.job})` },
    { id: 'abroad', labelBn: `বিদেশ (${counts.abroad})`, labelEn: `Abroad (${counts.abroad})` },
    { id: 'marriage', labelBn: `বিয়ের বায়োডাটা (${counts.marriage})`, labelEn: `Marriage Biodata (${counts.marriage})` },
    { id: 'fresher', labelBn: `ফ্রেশার (${counts.fresher})`, labelEn: `Fresher (${counts.fresher})` },
  ];

  const filtered =
    category === 'all' ? CV_TEMPLATES : CV_TEMPLATES.filter((t) => t.category === category);

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
      {/* Header Row */}
      <div className="glass-strip rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            {onBackToEditor && (
              <button
                type="button"
                onClick={onBackToEditor}
                className="p-1.5 rounded-xl glass-tile text-slate-700 dark:text-slate-200 cursor-pointer"
                title={isBn ? 'এডিটরে ফিরুন' : 'Back to Editor'}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {isBn ? 'CV-র ডিজাইন বাছুন' : 'Choose CV Design'}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
            {isBn
              ? 'নমুনা দেখে একটায় চাপুন — সরাসরি লেখার পেজ খুলবে। পরে ডিজাইন বদলানো যাবে, তথ্য হারাবে না।'
              : 'Click any template preview to open the live editor. You can switch templates anytime without losing your entered data.'}
          </p>
        </div>

        {/* CV Document Language Switcher */}
        <div className="flex items-center gap-1 glass-track p-1 rounded-xl shrink-0 self-start sm:self-center">
          <button
            type="button"
            onClick={() => onChangeCvLang('en')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              cvLang === 'en'
                ? 'glass-btn-primary text-white'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => onChangeCvLang('bn')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              cvLang === 'bn'
                ? 'glass-btn-primary text-white'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            বাংলা
          </button>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {categories.map((cat) => {
          const active = category === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                active
                  ? 'glass-btn-primary text-white'
                  : 'glass-tile text-slate-700 dark:text-slate-200'
              }`}
            >
              {isBn ? cat.labelBn : cat.labelEn}
            </button>
          );
        })}
      </div>

      {/* 17-Template Responsive Visual Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-12">
        {filtered.map((tpl) => {
          const isSelected = tpl.id === selectedTemplateId;
          const previewData: CvData = {
            ...SAMPLE_PREVIEW_CV_DATA,
            templateId: tpl.id,
            cvLang,
            accentColor: tpl.defaultAccent,
          };

          return (
            <button
              key={tpl.id}
              type="button"
              onClick={() => onSelectTemplate(tpl.id)}
              className={`group text-left rounded-2xl glass-panel p-3 flex flex-col transition-all duration-200 hover:-translate-y-1 cursor-pointer ${
                isSelected ? 'ring-2 ring-blue-500 shadow-lg' : ''
              }`}
            >
              {/* Scaled Miniature A4 Preview */}
              <div className="relative w-full aspect-[210/285] bg-white rounded-xl overflow-hidden border border-slate-200/80 dark:border-white/10 shadow-xs mb-3">
                <div
                  className="origin-top-left pointer-events-none select-none"
                  style={{
                    width: '794px',
                    transform: 'scale(0.305)',
                    transformOrigin: 'top left',
                  }}
                >
                  <CvSheetRenderer data={previewData} interactive={false} isThumbnail={true} />
                </div>

                {isSelected && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full glass-btn-primary text-white flex items-center justify-center shadow">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>

              {/* Clean Typography Card Body */}
              <div className="space-y-1 px-0.5 flex-1 flex flex-col">
                <div className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug">
                  {isBn ? tpl.nameBn : tpl.nameEn}
                </div>
                <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                  {isBn ? tpl.metaBn : tpl.metaEn}
                </div>
                <p className="text-[11.5px] text-slate-600 dark:text-slate-300 leading-relaxed pt-0.5 line-clamp-3">
                  {isBn ? tpl.descBn : tpl.descEn}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
