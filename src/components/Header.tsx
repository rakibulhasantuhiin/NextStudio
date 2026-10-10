import React, { useRef, useState } from 'react';
import {
  Camera,
  ChevronDown,
  CreditCard,
  Download,
  FileDown,
  FolderUp,
  Globe,
  HelpCircle,
  Image as ImageIcon,
  Moon,
  Printer,
  RotateCcw,
  Save,
  Sun,
  ZoomIn,
  ZoomOut,
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
  zoom,
  setZoom,
  onFitZoom,
  isProcessing = false,
}) => {
  const t = translations[lang];
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImportJson(e.target.files[0]);
    }
  };

  return (
    <header className="no-print sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors shadow-xs">
      <div className="w-full px-2 sm:px-4 md:px-6 h-13 sm:h-15 flex items-center justify-between gap-1.5 sm:gap-3">
        {/* Left Zone: Brand + Studio Mode Selector */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs shrink-0">
              <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="hidden md:block">
              <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug block">
                {t.appTitle}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-none block">
                {lang === 'bn' ? 'পাসপোর্ট ও এনআইডি প্রিন্ট স্টুডিও' : 'Print & Paper Studio'}
              </span>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 sm:p-1 rounded-xl border border-slate-200/80 dark:border-slate-700">
            <button
              onClick={() => setMode('passport')}
              className={`flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                mode === 'passport'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{lang === 'bn' ? 'পাসপোর্ট' : 'Passport'}</span>
            </button>
            <button
              onClick={() => setMode('nid')}
              className={`flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                mode === 'nid'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{lang === 'bn' ? 'এনআইডি' : 'NID Card'}</span>
            </button>
          </div>
        </div>

        {/* Center Zone: Quick Zoom Bar (Visible on Desktop) */}
        <div className="hidden xl:flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setZoom((z) => Math.max(0.3, z - 0.1))}
            className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded hover:bg-white dark:hover:bg-slate-700 transition cursor-pointer"
            title={t.zoomOut}
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="px-2 text-xs font-mono font-medium text-slate-700 dark:text-slate-300 min-w-12 text-center select-none">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(2.0, z + 0.1))}
            className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded hover:bg-white dark:hover:bg-slate-700 transition cursor-pointer"
            title={t.zoomIn}
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onFitZoom}
            className="px-2 py-1 text-[11px] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded hover:bg-white dark:hover:bg-slate-700 transition border-l border-slate-200 dark:border-slate-700 cursor-pointer font-medium"
            title={t.zoomFit}
          >
            {t.zoomFit}
          </button>
        </div>

        {/* Right Zone: Primary Actions (Download, Print, Settings) */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Download Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDownloadMenu(!showDownloadMenu)}
              disabled={isProcessing}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs transition disabled:opacity-50 cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              <Download className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
              <span className="hidden sm:inline">{lang === 'bn' ? 'ডাউনলোড' : 'Download'}</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {showDownloadMenu && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowDownloadMenu(false)}
                />
                <div className="absolute right-0 mt-1.5 w-60 rounded-xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-40">
                  <button
                    onClick={() => {
                      setShowDownloadMenu(false);
                      onDownloadPdf();
                    }}
                    className="w-full text-left px-3.5 py-2.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 transition cursor-pointer"
                  >
                    <FileDown className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">{t.downloadPdf}</div>
                      <div className="text-[11px] text-slate-500">
                        {lang === 'en' ? '300 DPI Vector print-ready file' : '৩০০ DPI ভেক্টর প্রিন্ট রেডি ফাইল'}
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setShowDownloadMenu(false);
                      onDownloadPng();
                    }}
                    className="w-full text-left px-3.5 py-2.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 transition cursor-pointer"
                  >
                    <ImageIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">{t.downloadPng}</div>
                      <div className="text-[11px] text-slate-500">
                        {lang === 'en' ? 'Crisp high-resolution transparent image' : 'স্বচ্ছ ও নিখুঁত হাই-রেজোলিউশন ছবি'}
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setShowDownloadMenu(false);
                      onDownloadJpg();
                    }}
                    className="w-full text-left px-3.5 py-2.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 transition cursor-pointer"
                  >
                    <ImageIcon className="w-4 h-4 text-indigo-600 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">{t.downloadJpg}</div>
                      <div className="text-[11px] text-slate-500">
                        {lang === 'en' ? 'Photo lab and studio print format' : 'ল্যাব ও স্টুডিও প্রিন্ট ফরম্যাট'}
                      </div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Primary Print Button */}
          <button
            onClick={onPrint}
            disabled={isProcessing}
            className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs sm:text-sm transition shadow-xs disabled:opacity-50 cursor-pointer"
            title={lang === 'bn' ? 'শর্টকাট: Ctrl + P' : 'Shortcut: Ctrl + P'}
          >
            <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>{t.printNow}</span>
          </button>

          {/* Quick Theme Toggle (Light / Dark) */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-1.5 sm:p-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
            title={theme === 'dark' ? (lang === 'bn' ? 'লাইট মোড অন করুন' : 'Switch to Light Mode') : (lang === 'bn' ? 'ডার্ক মোড অন করুন' : 'Switch to Dark Mode')}
            aria-label="Toggle Dark / Light Mode"
          >
            {theme === 'dark' ? (
              <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
            ) : (
              <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600 dark:text-slate-300" />
            )}
          </button>

          {/* Quick Language Toggle */}
          <button
            onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')}
            className="px-2 sm:px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold transition cursor-pointer flex items-center gap-1"
            title={lang === 'bn' ? 'Switch to English' : 'বাংলায় পরিবর্তন করুন'}
          >
            <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>{lang === 'bn' ? 'EN' : 'বাং'}</span>
          </button>

          {/* More options menu */}
          <div className="relative">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="p-1.5 sm:p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
              title={lang === 'bn' ? 'আরও অপশন' : 'More Options'}
            >
              <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {showMoreMenu && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowMoreMenu(false)}
                />
                <div className="absolute right-0 mt-1.5 w-52 rounded-xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-40 text-xs">
                  <button
                    onClick={() => {
                      setShowMoreMenu(false);
                      onReset();
                    }}
                    className="w-full text-left px-3.5 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                    <span>{lang === 'bn' ? 'সব রিসেট করুন' : 'Reset All'}</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowMoreMenu(false);
                      onExportJson();
                    }}
                    className="w-full text-left px-3.5 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5 text-slate-400" />
                    <span>{lang === 'bn' ? 'প্রজেক্ট ব্যাকআপ সেভ' : 'Export Project JSON'}</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowMoreMenu(false);
                      fileInputRef.current?.click();
                    }}
                    className="w-full text-left px-3.5 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                  >
                    <FolderUp className="w-3.5 h-3.5 text-slate-400" />
                    <span>{lang === 'bn' ? 'ব্যাকআপ লোড' : 'Load Project JSON'}</span>
                  </button>
                  <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
                  <button
                    onClick={() => {
                      setShowMoreMenu(false);
                      setLang(lang === 'bn' ? 'en' : 'bn');
                    }}
                    className="w-full text-left px-3.5 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                  >
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    <span>{lang === 'bn' ? 'Language: English' : 'ভাষা: বাংলা'}</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowMoreMenu(false);
                      setTheme(theme === 'dark' ? 'light' : 'dark');
                    }}
                    className="w-full text-left px-3.5 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                  >
                    {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-400" />}
                    <span>{theme === 'dark' ? (lang === 'bn' ? 'থিম: লাইট মোড' : 'Theme: Light Mode') : (lang === 'bn' ? 'থিম: ডার্ক মোড' : 'Theme: Dark Mode')}</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowMoreMenu(false);
                      onOpenShortcuts();
                    }}
                    className="w-full text-left px-3.5 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                    <span>{lang === 'bn' ? 'কিবোর্ড শর্টকাট (?)' : 'Keyboard Shortcuts (?)'}</span>
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

          {/* PWA Install */}
          <PWAInstallButton lang={lang} />
        </div>
      </div>
    </header>
  );
};
