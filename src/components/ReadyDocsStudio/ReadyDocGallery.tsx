import React, { useMemo, useState } from 'react';
import { ArrowLeft, Check, Search, X } from 'lucide-react';
import { ReadyDocCategory, ReadyDocTemplate } from '../../types/readyDocs';
import {
  READY_DOC_CATEGORIES,
  READY_DOC_PAPER_SPECS,
  READY_DOC_TEMPLATES,
} from '../../utils/readyDocs';

interface ReadyDocGalleryProps {
  selectedDocId: string;
  lang: 'bn' | 'en';
  onSelectDoc: (docId: string) => void;
  onBackToEditor?: () => void;
}

const MiniDocIcon: React.FC<{ template: ReadyDocTemplate }> = ({ template }) => {
  const isLandscape = template.paper === 'a4-landscape';
  const isStamp = Boolean(template.isStampPaper);

  if (isLandscape) {
    return (
      <div className="w-11 h-8 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 overflow-hidden flex flex-col shrink-0 shadow-xs">
        {isStamp && (
          <div
            className="h-3 w-full border-b border-dashed border-amber-400"
            style={{
              background:
                'repeating-linear-gradient(-45deg, #fef3c7, #fef3c7 3px, #fde68a 3px, #fde68a 6px)',
            }}
          />
        )}
        <div className="p-1 space-y-1 flex-1 flex flex-col justify-center">
          <div className="h-0.5 bg-slate-400/70 rounded w-3/4" />
          <div className="h-0.5 bg-slate-300 dark:bg-slate-600 rounded w-full" />
          <div className="h-0.5 bg-slate-300 dark:bg-slate-600 rounded w-5/6" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-9 h-11 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 overflow-hidden flex flex-col shrink-0 shadow-xs">
      {isStamp && (
        <div
          className="h-3.5 w-full border-b border-dashed border-amber-400"
          style={{
            background:
              'repeating-linear-gradient(-45deg, #fef3c7, #fef3c7 3px, #fde68a 3px, #fde68a 6px)',
          }}
        />
      )}
      <div className="p-1.5 space-y-1 flex-1 flex flex-col justify-center">
        <div className="h-0.5 bg-slate-400/75 rounded w-3/4" />
        <div className="h-0.5 bg-slate-300 dark:bg-slate-600 rounded w-full" />
        <div className="h-0.5 bg-slate-300 dark:bg-slate-600 rounded w-5/6" />
        {!isStamp && <div className="h-0.5 bg-slate-300 dark:bg-slate-600 rounded w-2/3" />}
      </div>
    </div>
  );
};

export const ReadyDocGallery: React.FC<ReadyDocGalleryProps> = ({
  selectedDocId,
  lang,
  onSelectDoc,
  onBackToEditor,
}) => {
  const isBn = lang === 'bn';
  const [activeCategory, setActiveCategory] = useState<ReadyDocCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: READY_DOC_TEMPLATES.length };
    for (const doc of READY_DOC_TEMPLATES) {
      counts[doc.category] = (counts[doc.category] || 0) + 1;
    }
    return counts;
  }, []);

  const filteredDocs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return READY_DOC_TEMPLATES.filter((doc) => {
      if (activeCategory !== 'all' && doc.category !== activeCategory) return false;
      if (!q) return true;
      return (
        doc.title.toLowerCase().includes(q) ||
        doc.titleEn.toLowerCase().includes(q) ||
        doc.previewSnippet.toLowerCase().includes(q) ||
        doc.category.toLowerCase().includes(q)
      );
    });
  }, [activeCategory, searchQuery]);

  const groupedDocs = useMemo(() => {
    const cats =
      activeCategory === 'all'
        ? READY_DOC_CATEGORIES.filter((c) => c.id !== 'all')
        : READY_DOC_CATEGORIES.filter((c) => c.id === activeCategory);

    return cats
      .map((cat) => ({
        cat,
        items: filteredDocs.filter((d) => d.category === cat.id),
      }))
      .filter((g) => g.items.length > 0);
  }, [activeCategory, filteredDocs]);

  const getPaperMetaLine = (doc: ReadyDocTemplate): string => {
    const spec = READY_DOC_PAPER_SPECS[doc.paper];
    const base = isBn ? spec.labelBn : spec.labelEn;
    if (doc.isStampPaper) {
      return `${base} · ${isBn ? 'স্ট্যাম্প-পেপারে ছাপা' : 'Stamp Paper Layout'}`;
    }
    return base;
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-3 sm:p-6 space-y-4">
      {/* Header & Search Card */}
      <div className="glass-strip rounded-2xl p-4 sm:p-5 space-y-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            {onBackToEditor && (
              <button
                type="button"
                onClick={onBackToEditor}
                className="glass-tile p-2 rounded-xl text-slate-700 dark:text-slate-200 cursor-pointer shrink-0 mt-0.5"
                title={isBn ? 'এডিটরে ফিরুন' : 'Back to Editor'}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                {isBn ? 'কোন কাগজ লাগবে?' : 'Select a Ready-Made Document'}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                {isBn
                  ? 'কাগজ বাছুন — পরের পেজে সেই কাগজের তথ্যের ঘরগুলোই আসবে এবং সরাসরি প্রিন্ট বা PDF করতে পারবেন।'
                  : 'Pick any of the 65 official templates — click highlighted fields directly on the sheet to edit, print, or save PDF.'}
              </p>
            </div>
          </div>
          <span className="glass-tile px-2.5 py-1 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 shrink-0 tabular-nums">
            {READY_DOC_TEMPLATES.length} {isBn ? 'টি কাগজ' : 'Docs'}
          </span>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              isBn
                ? 'নাম লিখে খুঁজুন — যেমন: দোকান, স্কুল, হলফনামা, ক্যাশ মেমো, রুটিন...'
                : 'Search by name — e.g. shop rent, admission, affidavit, invoice, routine...'
            }
            className="glass-input w-full rounded-xl pl-10 pr-9 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Stamp Paper Visual Legend */}
        <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
          <span
            className="inline-block w-5 h-3 rounded-sm border border-dashed border-amber-500 shrink-0"
            style={{
              background:
                'repeating-linear-gradient(-45deg, #fef3c7, #fef3c7 3px, #fde68a 3px, #fde68a 6px)',
            }}
          />
          <span>
            {isBn
              ? 'হলুদ দাগ কাটা অংশ = ওপরে স্ট্যাম্প-পেপার বা ছাপানো প্যাডের জন্য ফাঁকা জায়গা'
              : 'Yellow striped top icon = Blank top clearance for Non-Judicial Stamp Paper / Pre-printed Pad'}
          </span>
        </div>

        {/* 10 Category Filter Buttons */}
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {READY_DOC_CATEGORIES.map((cat) => {
            const active = activeCategory === cat.id;
            const count = categoryCounts[cat.id] || 0;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  active
                    ? 'glass-btn-primary text-white'
                    : 'glass-tile text-slate-700 dark:text-slate-200'
                }`}
              >
                {cat.emoji && <span className="text-xs leading-none">{cat.emoji}</span>}
                <span>{isBn ? cat.labelBn : cat.labelEn}</span>
                <span
                  className={`text-[11px] tabular-nums ${
                    active ? 'text-blue-100' : 'text-blue-600 dark:text-blue-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grouped Document List */}
      {groupedDocs.length === 0 ? (
        <div className="glass-strip rounded-2xl p-10 text-center space-y-2">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
            {isBn ? 'এই নামে কোনো কাগজ পাওয়া যায়নি' : 'No matching documents found'}
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setActiveCategory('all');
            }}
            className="glass-tile px-3.5 py-1.5 rounded-xl text-xs font-semibold text-blue-600 dark:text-blue-400 cursor-pointer"
          >
            {isBn ? 'সব ৬৫টি কাগজ দেখুন' : 'Show All 65 Documents'}
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {groupedDocs.map(({ cat, items }) => (
            <div key={cat.id} className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                {cat.emoji && <span className="text-sm">{cat.emoji}</span>}
                <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-700 dark:text-slate-200">
                  {isBn ? cat.labelBn : cat.labelEn}
                </h3>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                  {items.length}
                </span>
              </div>

              <div className="space-y-2">
                {items.map((doc) => {
                  const isSelected = doc.id === selectedDocId;
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => onSelectDoc(doc.id)}
                      className={`w-full text-left rounded-2xl p-3 sm:p-3.5 flex items-center gap-3.5 transition cursor-pointer ${
                        isSelected
                          ? 'glass-strip ring-2 ring-blue-500/80 dark:ring-blue-400/80'
                          : 'glass-tile'
                      }`}
                    >
                      <MiniDocIcon template={doc} />

                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                          {doc.title}
                        </div>
                        <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          {getPaperMetaLine(doc)}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-300 truncate">
                          {doc.previewSnippet}
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-slate-300 dark:border-slate-600'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
