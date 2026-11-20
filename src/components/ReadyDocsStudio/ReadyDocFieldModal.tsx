import React, { useEffect, useRef } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { ReadyDocField } from '../../types/readyDocs';
import { getTodayFormatted } from '../../utils/readyDocs';

interface ReadyDocFieldModalProps {
  field: ReadyDocField | null;
  value: string;
  docLang: 'bn' | 'en';
  uiLang: 'bn' | 'en';
  currentIndex: number;
  totalFields: number;
  onChange: (value: string) => void;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}

export const ReadyDocFieldModal: React.FC<ReadyDocFieldModalProps> = ({
  field,
  value,
  docLang,
  uiLang,
  currentIndex,
  totalFields,
  onChange,
  onPrev,
  onNext,
  onClose,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isBn = uiLang === 'bn';

  useEffect(() => {
    if (!field) return;
    const timer = window.setTimeout(() => {
      if (field.inputType === 'textarea') {
        textareaRef.current?.focus();
      } else {
        inputRef.current?.focus();
      }
    }, 30);
    return () => window.clearTimeout(timer);
  }, [field?.key]);

  if (!field) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/30 backdrop-blur-[3px]"
      onClick={onClose}
    >
      <div
        className="glass-modal w-full max-w-md rounded-2xl p-4 sm:p-5 space-y-3.5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Row: Label + Hint + Close */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-1.5">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                {field.label}
              </h3>
              {field.hint && (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  · {field.hint}
                </span>
              )}
            </div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
              {isBn
                ? `ঘর ${currentIndex + 1} / ${totalFields}`
                : `Field ${currentIndex + 1} of ${totalFields}`}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="glass-tile p-1.5 rounded-xl text-slate-600 dark:text-slate-300 cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Input / Textarea */}
        <div className="space-y-2">
          {field.inputType === 'textarea' ? (
            <textarea
              ref={textareaRef}
              rows={4}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={field.hint || field.label}
              className="glass-input w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            />
          ) : (
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onNext();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  onClose();
                }
              }}
              placeholder={field.hint || field.label}
              className="glass-input w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}

          {field.inputType === 'date' && (
            <button
              type="button"
              onClick={() => onChange(getTodayFormatted(docLang))}
              className="glass-tile px-2.5 py-1 rounded-lg text-[11px] font-semibold text-blue-600 dark:text-blue-400 inline-flex items-center gap-1 cursor-pointer"
            >
              <Calendar className="w-3 h-3" />
              <span>{isBn ? 'আজকের তারিখ বসান' : "Insert Today's Date"}</span>
            </button>
          )}
        </div>

        {/* Bottom Prev / Next Buttons matching Screenshot 12 */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={onPrev}
            className="glass-tile py-2.5 px-3 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>{isBn ? 'আগের' : 'Previous'}</span>
          </button>
          <button
            type="button"
            onClick={onNext}
            className="glass-btn-primary py-2.5 px-3 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1 cursor-pointer"
          >
            <span>
              {currentIndex >= totalFields - 1
                ? isBn
                  ? 'সম্পন্ন ✓'
                  : 'Done ✓'
                : isBn
                ? 'পরের'
                : 'Next'}
            </span>
            {currentIndex < totalFields - 1 && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
