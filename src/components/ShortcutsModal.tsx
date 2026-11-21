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
    { key: 'Ctrl + Z / ⌘ + Z', descBn: 'পূর্বের অবস্থায় ফিরে যাওয়া (Undo)', descEn: 'Undo Last Edit' },
    { key: 'Ctrl + Y / ⇧ + ⌘ + Z', descBn: 'বাতিল করা এডিট ফিরিয়ে আনা (Redo)', descEn: 'Redo Edit' },
    { key: 'Ctrl + P / ⌘ + P', descBn: 'সরাসরি প্রিন্ট প্রিভিউ খোলা', descEn: 'Open Direct Print Dialog' },
    { key: 'Ctrl + S / ⌘ + S', descBn: 'প্রজেক্ট ব্যাকআপ সেভ করা (JSON)', descEn: 'Export Project Backup (JSON)' },
    { key: '+', descBn: 'ছবির সংখ্যা ১টি বাড়ানো (+1)', descEn: 'Add 1 Photo Copy' },
    { key: '-', descBn: 'ছবির সংখ্যা ১টি কমানো (-1)', descEn: 'Remove 1 Photo Copy' },
    { key: 'Delete / Backspace', descBn: 'নির্বাচিত ছবি মুছে ফেলা', descEn: 'Delete Selected Photo' },
    { key: 'Esc', descBn: 'মডাল বা পপআপ বন্ধ করা', descEn: 'Close Modal / Dialog' },
  ];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 backdrop-blur-md p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl glass-modal overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/60 dark:border-white/10">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-bold text-slate-900 dark:text-white">
              {t.shortcuts}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-2.5">
          {shortcutsList.map((sc, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-4 py-2 border-b border-slate-200/50 dark:border-white/10 last:border-0"
            >
              <span className="text-xs sm:text-sm text-slate-700 dark:text-slate-200">
                {lang === 'bn' ? sc.descBn : sc.descEn}
              </span>
              <kbd className="px-2.5 py-1 text-xs font-mono font-semibold rounded-lg glass-tile text-slate-800 dark:text-slate-100 shrink-0">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 bg-white/30 dark:bg-white/5 border-t border-slate-200/60 dark:border-white/10 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-xl glass-btn-primary text-white transition cursor-pointer"
          >
            {t.cancel}
          </button>
        </div>
      </div>
    </div>
  );
};
