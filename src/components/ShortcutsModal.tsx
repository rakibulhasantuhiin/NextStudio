import React from 'react';
import { Keyboard, X } from 'lucide-react';
import { translations } from '../utils/translations';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lang: 'bn' | 'en';
}

export const ShortcutsModal: React.FC<Props> = ({ isOpen, onClose, lang }) => {
  if (!isOpen) return null;
  const t = translations[lang];

  const shortcutsList = [
    { key: 'Ctrl + P / ⌘ + P', descBn: 'সরাসরি প্রিন্ট প্রিভিউ খোলা', descEn: 'Open Direct Print Dialog' },
    { key: 'Ctrl + S / ⌘ + S', descBn: 'প্রজেক্ট ব্যাকআপ সেভ করা (JSON)', descEn: 'Export Project Backup (JSON)' },
    { key: '+', descBn: 'ছবির সংখ্যা ১টি বাড়ানো (+1)', descEn: 'Add 1 Photo Copy' },
    { key: '-', descBn: 'ছবির সংখ্যা ১টি কমানো (-1)', descEn: 'Remove 1 Photo Copy' },
    { key: 'Delete / Backspace', descBn: 'নির্বাচিত ছবি মুছে ফেলা', descEn: 'Delete Selected Photo' },
    { key: 'Esc', descBn: 'মডাল বা পপআপ বন্ধ করা', descEn: 'Close Modal / Dialog' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-bold text-slate-900 dark:text-white">
              {t.shortcuts}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {shortcutsList.map((sc, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-4 py-2 border-b border-slate-100 dark:border-slate-800/60 last:border-0"
            >
              <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                {lang === 'bn' ? sc.descBn : sc.descEn}
              </span>
              <kbd className="px-2.5 py-1 text-xs font-mono font-semibold rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-xs">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition"
          >
            {t.cancel}
          </button>
        </div>
      </div>
    </div>
  );
};
