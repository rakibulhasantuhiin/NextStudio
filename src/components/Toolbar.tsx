import React, { useRef, useState } from 'react';
import {
  Download,
  FileDown,
  FolderUp,
  Image as ImageIcon,
  Printer,
  RotateCcw,
  Save,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronDown,
} from 'lucide-react';
import { translations } from '../utils/translations';

interface ToolbarProps {
  lang: 'bn' | 'en';
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

export const Toolbar: React.FC<ToolbarProps> = ({
  lang,
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImportJson(e.target.files[0]);
    }
  };

  return (
    <div className="no-print bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 px-3 sm:px-6 py-2 flex items-center justify-between gap-2 transition-colors">
      {/* Primary Actions: Print & Export */}
      <div className="flex items-center gap-2">
        {/* Main Print Button */}
        <button
          onClick={onPrint}
          disabled={isProcessing}
          className="flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs sm:text-sm transition shadow-xs disabled:opacity-50 cursor-pointer"
          title="শর্টকাট: Ctrl + P"
        >
          <Printer className="w-4 h-4" />
          <span className="hidden xs:inline">{t.printNow}</span>
          <span className="xs:hidden">প্রিন্ট</span>
        </button>

        {/* Download Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowDownloadMenu(!showDownloadMenu)}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium text-xs sm:text-sm border border-slate-200 dark:border-slate-800 transition disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
            <span className="hidden sm:inline">ডাউনলোড</span>
            <span className="sm:hidden">সেভ</span>
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>

          {showDownloadMenu && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setShowDownloadMenu(false)}
              />
              <div className="absolute left-0 mt-1.5 w-56 rounded-xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
                <button
                  onClick={() => {
                    setShowDownloadMenu(false);
                    onDownloadPdf();
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 transition"
                >
                  <FileDown className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <div>
                    <div className="font-semibold">{t.downloadPdf}</div>
                    <div className="text-[11px] text-slate-400">৩০০ DPI ভেক্টর প্রিন্ট পেপার</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setShowDownloadMenu(false);
                    onDownloadPng();
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 transition"
                >
                  <ImageIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <div className="font-semibold">{t.downloadPng}</div>
                    <div className="text-[11px] text-slate-400">হাই-রেজোলিউশন ট্রান্সপারেন্ট</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setShowDownloadMenu(false);
                    onDownloadJpg();
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 transition"
                >
                  <ImageIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <div>
                    <div className="font-semibold">{t.downloadJpg}</div>
                    <div className="text-[11px] text-slate-400">স্টুডিও প্রিন্টিং জেপিজি</div>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Project Backup & Restore on desktop */}
        <div className="hidden md:flex items-center gap-1 border-l border-slate-200 dark:border-slate-800 pl-2">
          <button
            onClick={onExportJson}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition"
            title="প্রজেক্ট ব্যাকআপ সেভ করুন"
          >
            <Save className="w-3.5 h-3.5" />
            <span>ব্যাকআপ</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition"
            title="ব্যাকআপ ফাইল ওপেন করুন"
          >
            <FolderUp className="w-3.5 h-3.5" />
            <span>লোড</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>

      {/* Secondary Actions: Zoom & Reset */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Zoom Controls */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-900 rounded-lg p-0.5 border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setZoom((z) => Math.max(0.3, z - 0.1))}
            className="p-1 sm:p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded hover:bg-white dark:hover:bg-slate-800 transition"
            title={t.zoomOut}
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="px-2 text-xs font-mono font-medium text-slate-700 dark:text-slate-300 min-w-10 sm:min-w-12 text-center select-none">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(2.0, z + 0.1))}
            className="p-1 sm:p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded hover:bg-white dark:hover:bg-slate-800 transition"
            title={t.zoomIn}
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onFitZoom}
            className="p-1 sm:p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded hover:bg-white dark:hover:bg-slate-800 transition border-l border-slate-200 dark:border-slate-800"
            title={t.zoomFit}
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Reset */}
        <button
          onClick={onReset}
          className="p-1.5 sm:p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition"
          title={t.reset}
        >
          <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
      </div>
    </div>
  );
};
