import React, { useRef, useState } from 'react';
import {
  Archive,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  Download,
  FileText,
  Image as ImageIcon,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  ProcessedFileResult,
  downloadBlob,
  downloadFilesAsZip,
  formatBytes,
  toBnDigits,
} from '../../utils/toolsEngine';

export type ToolId =
  | 'dashboard'
  | 'govt-photo-sign'
  | 'image-resize'
  | 'image-compress'
  | 'image-convert'
  | 'image-to-pdf'
  | 'pdf-merge'
  | 'pdf-split'
  | 'pdf-organize'
  | 'pdf-to-image'
  | 'pdf-compress'
  | 'pdf-extract-text'
  | 'pdf-watermark-number';

interface ToolHeaderProps {
  title: string;
  subtitle: string;
  categoryLabel: string;
  onBack: () => void;
}

export const ToolHeader: React.FC<ToolHeaderProps> = ({
  title,
  subtitle,
  categoryLabel,
  onBack,
}) => {
  return (
    <div className="mb-5">
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{categoryLabel}</span>
        </button>
        <span aria-hidden="true">›</span>
        <span className="text-slate-700 dark:text-slate-200">{title}</span>
      </div>
      <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
        {title}
      </h1>
      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-3xl">
        {subtitle}
      </p>
    </div>
  );
};

export interface SelectedFileItem {
  id: string;
  file: File;
  previewUrl?: string;
  metaText?: string;
}

interface FileDropzoneProps {
  accept: string;
  multiple?: boolean;
  title: string;
  subtitle: string;
  buttonLabel?: string;
  files: SelectedFileItem[];
  onAddFiles: (newFiles: File[]) => void;
  onRemoveFile: (id: string) => void;
  onClearAll?: () => void;
  allowReorder?: boolean;
  onMoveFile?: (index: number, direction: -1 | 1) => void;
  fileKind?: 'image' | 'pdf';
  compact?: boolean;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  accept,
  multiple = true,
  title,
  subtitle,
  buttonLabel = 'ফাইল বাছুন',
  files,
  onAddFiles,
  onRemoveFile,
  onClearAll,
  allowReorder = false,
  onMoveFile,
  fileKind = 'image',
  compact = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const arr = Array.from(fileList);
    onAddFiles(multiple ? arr : [arr[0]]);
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`glass-dropzone rounded-2xl ${
          compact ? 'p-3.5 sm:p-4' : 'p-4 sm:p-5'
        } flex flex-col sm:flex-row items-center justify-between gap-3 cursor-pointer ${
          isDragging ? 'ring-2 ring-blue-500 scale-[1.005]' : ''
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 shadow-sm flex items-center justify-center shrink-0 text-blue-600 dark:text-blue-400">
            <Upload className="w-5 h-5" />
          </div>
          <div className="min-w-0 text-center sm:text-left">
            <div className="text-sm font-bold text-slate-900 dark:text-white">{title}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</div>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            inputRef.current?.click();
          }}
          className="glass-btn-primary px-4 py-2 rounded-xl text-white text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer"
        >
          {buttonLabel}
        </button>

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
          className="hidden"
        />
      </div>

      {/* Selected Files Queue */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs px-1">
            <span className="font-bold text-slate-700 dark:text-slate-200 tabular-nums">
              নির্বাচিত ফাইল ({toBnDigits(files.length)}টি)
            </span>
            {onClearAll && files.length > 1 && (
              <button
                type="button"
                onClick={onClearAll}
                className="text-red-600 dark:text-red-400 hover:underline font-semibold cursor-pointer"
              >
                সব মুছুন
              </button>
            )}
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1.5 pr-0.5">
            {files.map((item, idx) => (
              <div
                key={item.id}
                className="glass-tile rounded-xl px-2.5 py-2 flex items-center justify-between gap-2.5"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {allowReorder && (
                    <span className="text-[11px] font-mono font-bold text-slate-400 w-5 text-center shrink-0 tabular-nums">
                      {toBnDigits(idx + 1)}
                    </span>
                  )}
                  {fileKind === 'image' && item.previewUrl ? (
                    <img
                      src={item.previewUrl}
                      alt={item.file.name}
                      className="w-10 h-10 rounded-lg object-cover border border-slate-200/80 dark:border-white/10 shrink-0 bg-white"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-blue-500/12 dark:bg-blue-400/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      {fileKind === 'pdf' ? (
                        <FileText className="w-5 h-5" />
                      ) : (
                        <ImageIcon className="w-5 h-5" />
                      )}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                      {item.file.name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums flex items-center gap-1.5">
                      <span>{formatBytes(item.file.size, 'bn')}</span>
                      {item.metaText && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{item.metaText}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {allowReorder && onMoveFile && (
                    <>
                      <button
                        type="button"
                        onClick={() => onMoveFile(idx, -1)}
                        disabled={idx === 0}
                        className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                        title="উপরে নিন"
                        aria-label="উপরে নিন"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onMoveFile(idx, 1)}
                        disabled={idx === files.length - 1}
                        className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                        title="নিচে নিন"
                        aria-label="নিচে নিন"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => onRemoveFile(item.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
                    title="বাদ দিন"
                    aria-label="বাদ দিন"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const BulkZipNotice: React.FC<{ text?: string }> = ({
  text = 'বাল্ক চালু — একসাথে অনেক ফাইল দিতে পারবেন, সবগুলো ZIP-এ নামাতে পারবেন',
}) => {
  return (
    <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
      <Check className="w-3.5 h-3.5 shrink-0" />
      <span>{text}</span>
    </div>
  );
};

interface ProcessedResultsListProps {
  results: ProcessedFileResult[];
  zipFileName: string;
  onClear?: () => void;
  title?: string;
}

export const ProcessedResultsList: React.FC<ProcessedResultsListProps> = ({
  results,
  zipFileName,
  onClear,
  title = 'প্রসেস করা ফাইল প্রস্তুত',
}) => {
  const [isZipping, setIsZipping] = useState(false);

  if (results.length === 0) return null;

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      await downloadFilesAsZip(
        results.map((r) => ({ name: r.name, blob: r.blob })),
        zipFileName
      );
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-5 space-y-4 mt-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-900/8 dark:border-white/10">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>
              {title} ({toBnDigits(results.length)}টি)
            </span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            আলাদাভাবে প্রতিটি ফাইল নামান অথবা এক ক্লিকে সবগুলো ZIP-এ ডাউনলোড করুন।
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {results.length > 1 && (
            <button
              type="button"
              onClick={() => void handleDownloadZip()}
              disabled={isZipping}
              className="glass-btn-emerald px-4 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60 whitespace-nowrap"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>{isZipping ? 'ZIP তৈরি হচ্ছে...' : `সবগুলো ZIP-এ নামান (${toBnDigits(results.length)})`}</span>
            </button>
          )}
          {results.length === 1 && (
            <button
              type="button"
              onClick={() => downloadBlob(results[0].blob, results[0].name)}
              className="glass-btn-emerald px-4 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ডাউনলোড করুন</span>
            </button>
          )}
          {onClear && (
            <button
              type="button"
              onClick={onClear}
              className="glass-tile px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"
            >
              পরিষ্কার করুন
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {results.map((item) => {
          const savedPct =
            item.originalSize > 0
              ? Math.round(((item.originalSize - item.blob.size) / item.originalSize) * 100)
              : 0;
          return (
            <div
              key={item.id}
              className="glass-tile rounded-xl p-3 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                {item.previewUrl ? (
                  <img
                    src={item.previewUrl}
                    alt={item.name}
                    className="w-14 h-14 rounded-lg object-contain bg-white border border-slate-200/80 dark:border-white/10 shrink-0 p-0.5"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-rose-500/12 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                )}

                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {item.name}
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 font-mono tabular-nums mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                    {item.width && item.height && (
                      <>
                        <span>
                          {toBnDigits(item.width)}×{toBnDigits(item.height)} px
                        </span>
                        <span aria-hidden="true">·</span>
                      </>
                    )}
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">
                      {formatBytes(item.blob.size, 'bn')}
                    </span>
                    {savedPct > 0 && item.blob.size < item.originalSize && (
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        ({toBnDigits(savedPct)}% কমেছে)
                      </span>
                    )}
                  </div>
                  {item.infoText && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {item.infoText}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => downloadBlob(item.blob, item.name)}
                className="glass-btn-primary px-3 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">ডাউনলোড</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export function createFileItems(files: File[], kind: 'image' | 'pdf'): SelectedFileItem[] {
  return files.map((file) => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    file,
    previewUrl: kind === 'image' ? URL.createObjectURL(file) : undefined,
  }));
}
