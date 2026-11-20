import React, { useRef, useState } from 'react';
import {
  Camera,
  ChevronDown,
  Columns2,
  CreditCard,
  Download,
  FileDown,
  FileText,
  FolderUp,
  Globe,
  HelpCircle,
  Image as ImageIcon,
  Moon,
  MoreHorizontal,
  Printer,
  RotateCcw,
  Save,
  Sun,
} from 'lucide-react';
import { StudioMode } from '../types';
import { translations } from '../utils/translations';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  mode: StudioMode;
  setMode: (mode: StudioMode) => void;
  lang: 'bn' | 'en';
  setLang: (lang: 'bn' | 'en') => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  onOpenShortcuts: () => void;
  isSaved: boolean;
  onPrint: () => void;
  onDownloadPdf: () => void;
  onDownloadPng: () => void;
  onDownloadJpg: () => void;
  onReset: () => void;
  onExportJson: () => void;
  onImportJson: (file: File) => void;
  zoom: number;
  setZoom: (updater: (prev: number) => number) => void;
  onFitZoom: () => void;
  isProcessing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  mode,
  setMode,
  lang,
  setLang,
  theme,
  setTheme,
  onOpenShortcuts,
  onPrint,
  onDownloadPdf,
  onDownloadPng,
  onDownloadJpg,
  onReset,
  onExportJson,
  onImportJson,
  isProcessing = false,
}) => {
  const t = translations[lang];
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImportJson(e.target.files[0]);
      e.target.value = '';
    }
  };

  const navModes: {
    id: StudioMode;
    icon: React.ReactNode;
    labelEn: string;
    labelBn: string;
    shortEn: string;
    shortBn: string;
  }[] = [
    {
      id: 'passport',
      icon: <Camera className="w-4 h-4 shrink-0" />,
      labelEn: 'Passport',
      labelBn: 'পাসপোর্ট',
      shortEn: 'Passport',
      shortBn: 'পাসপোর্ট',
    },
    {
      id: 'nid',
      icon: <CreditCard className="w-4 h-4 shrink-0" />,
      labelEn: 'NID Card',
      labelBn: 'এনআইডি',
      shortEn: 'NID',
      shortBn: 'এনআইডি',
    },
    {
      id: 'lamination',
      icon: <Columns2 className="w-4 h-4 shrink-0" />,
      labelEn: 'Laminate ID',
      labelBn: 'লেমিনেটিং কার্ড',
      shortEn: 'Laminate',
      shortBn: 'লেমিনেটিং',
    },
    {
      id: 'document',
      icon: <FileText className="w-4 h-4 shrink-0" />,
      labelEn: 'Paper Print',
      labelBn: 'পেপার প্রিন্ট',
      shortEn: 'Paper',
      shortBn: 'পেপার',
    },
  ];

  return (
    <header className="no-print sticky top-0 z-40 bg-white dark:bg-[#0F172A] border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="w-full px-3 sm:px-5 h-14 flex items-center justify-between gap-3">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-slate-800 border border-slate-800 dark:border-slate-700 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 32 32" className="w-5 h-5" fill="none" aria-hidden="true">
              <path
                d="M7 24V8H11.2L20.8 19.4V8H25V24H20.8L11.2 12.6V24H7Z"
                fill="#FFFFFF"
              />
              <rect x="20.8" y="8" width="4.2" height="4.2" rx="1" fill="#3B82F6" />
            </svg>
          </div>
          <span className="hidden sm:inline-block text-[17px] font-extrabold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0">
            NextStudio
          </span>
        </div>

        {/* Zone 2: Studio Workspace Navigation Tabs */}
        <nav
          aria-label="Workspace modes"
          className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-x-auto max-w-[58vw] sm:max-w-none"
        >
          {navModes.map((item) => {
            const active = mode === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setMode(item.id)}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-2xs ring-1 ring-slate-200/80 dark:ring-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/50 dark:hover:bg-slate-800/50'
                }`}
              >
                {item.icon}
                <span className="sm:hidden">{lang === 'bn' ? item.shortBn : item.shortEn}</span>
                <span className="hidden sm:inline">{lang === 'bn' ? item.labelBn : item.labelEn}</span>
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Actions & Utilities */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Install Offline Desktop/Mobile App */}
          <PWAInstallButton lang={lang} />

          {/* Export Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDownloadMenu((v) => !v)}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-semibold text-xs transition-colors disabled:opacity-50 cursor-pointer border border-slate-200 dark:border-slate-700 whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300 shrink-0" />
              <span className="hidden md:inline">{lang === 'bn' ? 'ডাউনলোড' : 'Export'}</span>
              <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />
            </button>

            {showDownloadMenu && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowDownloadMenu(false)}
                />
                <div className="absolute right-0 mt-1.5 w-64 rounded-xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-40">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDownloadMenu(false);
                      onDownloadPdf();
                    }}
                    className="w-full text-left px-3.5 py-2.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 transition-colors cursor-pointer"
                  >
                    <FileDown className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">{t.downloadPdf}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {lang === 'en' ? 'Exact millimeter print-ready PDF' : 'সঠিক মিলিমিটার সাইজের প্রিন্ট রেডি PDF'}
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDownloadMenu(false);
                      onDownloadPng();
                    }}
                    className="w-full text-left px-3.5 py-2.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 transition-colors cursor-pointer"
                  >
                    <ImageIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">{t.downloadPng}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {lang === 'en' ? 'Lossless crisp high-resolution PNG' : 'সর্বোচ্চ শার্প হাই-রেজোলিউশন PNG'}
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDownloadMenu(false);
                      onDownloadJpg();
                    }}
                    className="w-full text-left px-3.5 py-2.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 transition-colors cursor-pointer"
                  >
                    <ImageIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">{t.downloadJpg}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {lang === 'en' ? 'Photo lab standard JPG sheet' : 'ল্যাব ও স্টুডিও প্রিন্ট JPG ফরম্যাট'}
                      </div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Primary Action: Print */}
          <button
            type="button"
            onClick={onPrint}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
            title={lang === 'bn' ? 'সরাসরি প্রিন্ট (Ctrl + P)' : 'Direct Print (Ctrl + P)'}
          >
            <Printer className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden md:inline">{lang === 'bn' ? 'প্রিন্ট করুন' : 'Print'}</span>
          </button>

          <div className="hidden sm:block h-5 w-px bg-slate-200 dark:bg-slate-800 mx-0.5" />

          {/* Theme Switcher */}
          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer shrink-0"
            title={
              theme === 'dark'
                ? lang === 'bn'
                  ? 'লাইট মোড'
                  : 'Switch to Light Mode'
                : lang === 'bn'
                ? 'ডার্ক মোড'
                : 'Switch to Dark Mode'
            }
            aria-label="Toggle Light / Dark Theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>

          {/* Language Switcher */}
          <button
            type="button"
            onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')}
            className="px-2.5 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap shrink-0"
            title={lang === 'bn' ? 'Switch to English' : 'বাংলায় পরিবর্তন করুন'}
          >
            <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>{lang === 'bn' ? 'EN' : 'বাং'}</span>
          </button>

          {/* More Utilities Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMoreMenu((v) => !v)}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer shrink-0"
              title={lang === 'bn' ? 'আরও অপশন' : 'More Options'}
              aria-label="More Options"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {showMoreMenu && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowMoreMenu(false)}
                />
                <div className="absolute right-0 mt-1.5 w-56 rounded-xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-40 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      onExportJson();
                    }}
                    className="w-full text-left px-3.5 py-2.5 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{lang === 'bn' ? 'প্রজেক্ট ব্যাকআপ সেভ (JSON)' : 'Save Project Backup (JSON)'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      fileInputRef.current?.click();
                    }}
                    className="w-full text-left px-3.5 py-2.5 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer"
                  >
                    <FolderUp className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{lang === 'bn' ? 'ব্যাকআপ লোড করুন' : 'Open Project Backup'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      onOpenShortcuts();
                    }}
                    className="w-full text-left px-3.5 py-2.5 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{lang === 'bn' ? 'কিবোর্ড শর্টকাট (?)' : 'Keyboard Shortcuts (?)'}</span>
                  </button>
                  <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      onReset();
                    }}
                    className="w-full text-left px-3.5 py-2.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2.5 cursor-pointer font-medium"
                  >
                    <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                    <span>{lang === 'bn' ? 'সবকিছু রিসেট করুন' : 'Reset Workspace'}</span>
                  </button>
                </div>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>
      </div>
    </header>
  );
};
