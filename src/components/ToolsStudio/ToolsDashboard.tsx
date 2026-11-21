import React from 'react';
import {
  ArrowDownUp,
  Combine,
  Eraser,
  FileImage,
  FileOutput,
  FileSpreadsheet,
  FileText,
  FileType,
  Hash,
  ImageDown,
  LayoutGrid,
  Maximize2,
  RefreshCw,
  ScanLine,
  Scissors,
  ShieldCheck,
  UserSquare2,
  Users,
} from 'lucide-react';
import { ToolId, ToolsLang } from './SharedToolUI';

interface ToolCardMeta {
  id: ToolId;
  titleEn: string;
  titleBn: string;
  descriptionEn: string;
  descriptionBn: string;
  badgeEn: string;
  badgeBn: string;
  iconBg: string;
  icon: React.ReactNode;
}

const IMAGE_TOOLS: ToolCardMeta[] = [
  {
    id: 'doc-scanner',
    titleEn: 'Document Scanner (CamScanner Pro)',
    titleBn: 'ডকুমেন্ট স্ক্যানার (CamScanner প্রো)',
    descriptionEn:
      'Auto & manual 4-corner perspective crop, Magic Pro / Magic Color filters, crisp white Full HD pages, A4 auto-fit, PDF & direct print.',
    descriptionBn:
      'যেকোনো ডকুমেন্ট, বিল বা ছবির অটো ও ম্যানুয়াল ৪-কোনা ক্রপ, ম্যাজিক প্রো / ম্যাজিক কালার ফিল্টার, সাদা Full HD পেজ, A4 ফিট, PDF ও সরাসরি প্রিন্ট।',
    badgeEn: 'Magic Pro · Auto Crop · Print',
    badgeBn: 'ম্যাজিক প্রো · অটো ক্রপ · প্রিন্ট',
    iconBg: 'from-teal-500 to-emerald-600',
    icon: <ScanLine className="w-5 h-5 text-white" />,
  },
  {
    id: 'govt-photo-sign',
    titleEn: 'Govt Job Photo & Signature',
    titleBn: 'সরকারি আবেদনের ছবি ও স্বাক্ষর',
    descriptionEn:
      'Exact online application photo (300×300) & signature (300×80) dimensions with KB limits and automatic ink cleanup.',
    descriptionBn:
      'চাকরি বা ভর্তির অনলাইন আবেদনে চাওয়া মাপে ছবি (৩০০×৩০০) ও স্বাক্ষর (৩০০×৮০) — KB সীমা ও কালি পরিষ্কারসহ।',
    badgeEn: 'Bulk · ZIP Ready',
    badgeBn: 'বাল্ক চালু · ZIP চালু',
    iconBg: 'from-indigo-500 to-blue-600',
    icon: <UserSquare2 className="w-5 h-5 text-white" />,
  },
  {
    id: 'watermark-remove',
    titleEn: 'Watermark Remover (Clean Document)',
    titleBn: 'ওয়াটারমার্ক রিমুভ (ডকুমেন্ট পরিষ্কার)',
    descriptionEn:
      'Cleanly erase logos and watermarks behind documents to pure white while keeping text sharp at full original resolution.',
    descriptionBn:
      'ডকুমেন্ট বা ছবির পেছনের লোগো ও ওয়াটারমার্ক মুছে সাদা করুন — লেখা স্পষ্ট ও হাই-কোয়ালিটি থাকবে, সরাসরি প্রিন্ট বা ডাউনলোড।',
    badgeEn: 'Bulk · Full HD · Print',
    badgeBn: 'বাল্ক · হাই-কোয়ালিটি · প্রিন্ট',
    iconBg: 'from-cyan-500 to-teal-600',
    icon: <Eraser className="w-5 h-5 text-white" />,
  },
  {
    id: 'image-resize',
    titleEn: 'Image Resize',
    titleBn: 'ছবি রিসাইজ',
    descriptionEn:
      'Change image dimensions by pixel or percentage — includes ready presets for job photos, signatures, passport & social media.',
    descriptionBn:
      'ছবির মাপ (পিক্সেল বা শতাংশ) বদলান — চাকরির আবেদনের ছবি, স্বাক্ষর, পাসপোর্ট ও ফেসবুকের রেডি সাইজসহ।',
    badgeEn: 'Bulk Ready',
    badgeBn: 'বাল্ক চালু',
    iconBg: 'from-sky-500 to-blue-600',
    icon: <Maximize2 className="w-5 h-5 text-white" />,
  },
  {
    id: 'image-compress',
    titleEn: 'Compress Image (Target KB)',
    titleBn: 'ছবির সাইজ কমান (KB)',
    descriptionEn:
      'Compress images under 20 KB, 50 KB, 100 KB, or 200 KB with the highest possible visual sharpness.',
    descriptionBn:
      '২০ KB, ৫০ KB, ১০০ KB, ২০০ KB — যত KB লাগে তত KB-তে ছবি নামান, কোয়ালিটি যতটা সম্ভব ভালো রেখে।',
    badgeEn: 'Bulk Ready',
    badgeBn: 'বাল্ক চালু',
    iconBg: 'from-emerald-500 to-green-600',
    icon: <ImageDown className="w-5 h-5 text-white" />,
  },
  {
    id: 'image-convert',
    titleEn: 'Convert Image (JPG / PNG / WebP)',
    titleBn: 'ছবি কনভার্ট (JPG / PNG / WebP)',
    descriptionEn:
      'Batch convert images between JPG, PNG, and WebP formats with customizable output quality.',
    descriptionBn: 'এক ফরম্যাট থেকে অন্য ফরম্যাটে রূপান্তর — কোয়ালিটি কন্ট্রোলসহ একসাথে অনেক ছবি।',
    badgeEn: 'Bulk Ready',
    badgeBn: 'বাল্ক চালু',
    iconBg: 'from-amber-500 to-orange-500',
    icon: <RefreshCw className="w-5 h-5 text-white" />,
  },
  {
    id: 'image-to-pdf',
    titleEn: 'Image to PDF',
    titleBn: 'ছবি থেকে PDF',
    descriptionEn:
      'Combine one or multiple images into a single print-ready PDF on A4 or original image size with page reordering.',
    descriptionBn: 'এক বা একাধিক ছবি জুড়ে একটা PDF — A4 পাতায় বা ছবির মাপে সাজানো, ক্রম বদলানো যায়।',
    badgeEn: 'Bulk Ready',
    badgeBn: 'বাল্ক চালু',
    iconBg: 'from-rose-500 to-pink-600',
    icon: <FileOutput className="w-5 h-5 text-white" />,
  },
];

const PDF_TOOLS: ToolCardMeta[] = [
  {
    id: 'pdf-merge',
    titleEn: 'Merge PDF',
    titleBn: 'PDF জোড়া (মার্জ)',
    descriptionEn:
      'Combine multiple PDF documents into one file and reorder files up or down before merging.',
    descriptionBn: 'একাধিক PDF একটা ফাইলে জুড়ুন — পাতার ক্রম উপরে-নিচে বদলানো যায়।',
    badgeEn: 'Offline · Fast',
    badgeBn: 'ZIP চালু',
    iconBg: 'from-sky-500 to-blue-600',
    icon: <Combine className="w-5 h-5 text-white" />,
  },
  {
    id: 'pdf-split',
    titleEn: 'Split / Extract PDF Pages',
    titleBn: 'PDF ভাগ / পাতা বের করা',
    descriptionEn:
      'Extract specific page ranges or split every page into separate PDF files packaged in a ZIP.',
    descriptionBn: 'PDF থেকে বেছে নেওয়া পাতা আলাদা করুন অথবা প্রতিটি পাতাকে আলাদা PDF ফাইল বানান।',
    badgeEn: 'ZIP Ready',
    badgeBn: 'ZIP চালু',
    iconBg: 'from-amber-500 to-orange-500',
    icon: <Scissors className="w-5 h-5 text-white" />,
  },
  {
    id: 'pdf-organize',
    titleEn: 'Organize / Rotate / Delete Pages',
    titleBn: 'PDF পাতা সাজান / ঘোরান / মুছুন',
    descriptionEn:
      'Preview every PDF page visually to rotate, delete, or reorder pages and save a clean new PDF.',
    descriptionBn: 'প্রতিটি পাতার প্রিভিউ ছবি দেখে ঘোরান, বাদ দিন বা আগে-পরে সাজিয়ে নতুন PDF বানান।',
    badgeEn: 'Visual Preview',
    badgeBn: 'ZIP চালু',
    iconBg: 'from-violet-500 to-indigo-600',
    icon: <LayoutGrid className="w-5 h-5 text-white" />,
  },
  {
    id: 'pdf-to-image',
    titleEn: 'PDF to Image (JPG / PNG)',
    titleBn: 'PDF থেকে ছবি (JPG / PNG)',
    descriptionEn:
      'Render every PDF page into high-resolution JPG or PNG images with selectable DPI and ZIP download.',
    descriptionBn: 'PDF-এর প্রতিটা পাতা উচ্চমানের ছবিতে রূপান্তর করুন — DPI (মান) বেছে নিয়ে ZIP নামান।',
    badgeEn: 'ZIP Ready',
    badgeBn: 'ZIP চালু',
    iconBg: 'from-rose-500 to-pink-600',
    icon: <FileImage className="w-5 h-5 text-white" />,
  },
  {
    id: 'pdf-compress',
    titleEn: 'Compress PDF (Target KB)',
    titleBn: 'PDF-এর সাইজ কমান (KB)',
    descriptionEn:
      'Shrink PDF file size under your target KB limit — works with single or multiple PDF files at once.',
    descriptionBn: 'PDF ছোট করুন — যত KB লাগে তত KB-তে নামান এক বা একাধিক ফাইল একসাথে।',
    badgeEn: 'ZIP Ready',
    badgeBn: 'ZIP চালু',
    iconBg: 'from-emerald-500 to-green-600',
    icon: <ArrowDownUp className="w-5 h-5 text-white" />,
  },
  {
    id: 'pdf-extract-text',
    titleEn: 'Extract Text from PDF',
    titleBn: 'PDF থেকে লেখা বের করুন',
    descriptionEn:
      'Extract all selectable text from PDF documents to copy in one click or save as .txt files.',
    descriptionBn: 'PDF-এর ভেতরের সমস্ত লেখা বের করে এক ক্লিকে কপি করুন বা .txt ফাইলে নামান।',
    badgeEn: 'TXT · ZIP',
    badgeBn: 'ZIP চালু',
    iconBg: 'from-amber-500 to-yellow-600',
    icon: <FileType className="w-5 h-5 text-white" />,
  },
  {
    id: 'pdf-watermark-number',
    titleEn: 'PDF Page Numbers & Watermark',
    titleBn: 'PDF-এ পেজ নম্বর ও ওয়াটারমার্ক',
    descriptionEn:
      'Stamp English or Bengali page numbers and custom translucent diagonal/straight watermarks onto PDFs.',
    descriptionBn: 'পাতায় বাংলা বা ইংরেজি পেজ নম্বর এবং কাস্টম হালকা ওয়াটারমার্ক বসান।',
    badgeEn: 'Bulk · ZIP',
    badgeBn: 'ZIP চালু',
    iconBg: 'from-indigo-500 to-purple-600',
    icon: <Hash className="w-5 h-5 text-white" />,
  },
];

interface ToolsDashboardProps {
  lang?: ToolsLang;
  onSelectTool: (id: ToolId) => void;
}

export const ToolsDashboard: React.FC<ToolsDashboardProps> = ({
  lang = 'en',
  onSelectTool,
}) => {
  const isBn = lang === 'bn';

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="space-y-9">
      {/* Top Privacy & Offline Assurance Strip */}
      <div className="glass-banner rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-start sm:items-center gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-200">
          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
          <span>
            {isBn ? (
              <>
                <strong className="text-slate-900 dark:text-white">১০০% অফলাইন ও নিরাপদ:</strong>{' '}
                সব কাজ আপনার ফোন বা কম্পিউটারের ব্রাউজারেই হয় — কোনো ছবি বা PDF কোথাও আপলোড হয় না।
                সব টুলে বাল্ক প্রসেসিং ও ZIP ডাউনলোড চালু আছে।
              </>
            ) : (
              <>
                <strong className="text-slate-900 dark:text-white">100% Offline & Private:</strong>{' '}
                All processing happens right inside your browser — no images or PDFs are ever
                uploaded to any server. Bulk processing and ZIP download are built in.
              </>
            )}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs font-bold shrink-0">
          <button
            type="button"
            onClick={() => scrollToSection('section-image-tools')}
            className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer whitespace-nowrap"
          >
            {isBn ? 'ছবির টুলস ↓' : 'Image Tools ↓'}
          </button>
          <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
            ·
          </span>
          <button
            type="button"
            onClick={() => scrollToSection('section-pdf-tools')}
            className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer whitespace-nowrap"
          >
            {isBn ? 'PDF টুলস ↓' : 'PDF Tools ↓'}
          </button>
        </div>
      </div>

      {/* Section 1: Image Tools */}
      <section id="section-image-tools" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {isBn ? 'ছবির টুলস' : 'Image Tools'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-0.5">
              {isBn
                ? 'ডকুমেন্ট স্ক্যানার (CamScanner), ওয়াটারমার্ক রিমুভ, সরকারি আবেদনের ছবি-স্বাক্ষর, রিসাইজ, KB কমানো, কনভার্ট ও ছবি থেকে PDF — সব অফলাইনে।'
                : 'Document Scanner (CamScanner), Watermark Remover, Govt Job Photo & Signature, Resize, KB Compression, Format Convert & Image to PDF — 100% offline.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => scrollToSection('section-pdf-tools')}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer self-start sm:self-auto whitespace-nowrap"
          >
            {isBn ? 'PDF টুলস দেখুন →' : 'View PDF Tools →'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {IMAGE_TOOLS.map((tool) => (
            <button
              key={tool.id}
              type="button"
              onClick={() => onSelectTool(tool.id)}
              className="group glass-panel rounded-2xl p-5 text-left flex flex-col justify-between gap-4 hover:-translate-y-0.5 hover:border-blue-400/60 dark:hover:border-blue-400/50 transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <div className="space-y-3.5">
                <div
                  className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${tool.iconBg} shadow-md flex items-center justify-center group-hover:scale-105 transition-transform`}
                >
                  {tool.icon}
                </div>
                <div>
                  <h3 className="text-[15px] font-extrabold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug">
                    {isBn ? tool.titleBn : tool.titleEn}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed line-clamp-3">
                    {isBn ? tool.descriptionBn : tool.descriptionEn}
                  </p>
                </div>
              </div>

              <div className="pt-2.5 border-t border-slate-900/6 dark:border-white/8 flex items-center justify-between text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 shrink-0" />
                  <span>{isBn ? tool.badgeBn : tool.badgeEn}</span>
                </span>
                <span className="text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {isBn ? 'খুলুন →' : 'Open →'}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Section 2: PDF Tools */}
      <section id="section-pdf-tools" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {isBn ? 'PDF টুলস' : 'PDF Tools'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-0.5">
              {isBn
                ? 'সব কাজ আপনার ফোন বা কম্পিউটারেই হয় — PDF কোথাও আপলোড হয় না। একসাথে অনেক ফাইল ও ZIP ডাউনলোড চালু।'
                : 'Merge, split, organize, compress, extract text, convert to images, and stamp watermarks — completely local in your browser.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => scrollToSection('section-image-tools')}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer self-start sm:self-auto whitespace-nowrap"
          >
            {isBn ? 'ছবির টুলস দেখুন ↑' : 'View Image Tools ↑'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {PDF_TOOLS.map((tool) => (
            <button
              key={tool.id}
              type="button"
              onClick={() => onSelectTool(tool.id)}
              className="group glass-panel rounded-2xl p-5 text-left flex flex-col justify-between gap-4 hover:-translate-y-0.5 hover:border-blue-400/60 dark:hover:border-blue-400/50 transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <div className="space-y-3.5">
                <div
                  className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${tool.iconBg} shadow-md flex items-center justify-center group-hover:scale-105 transition-transform`}
                >
                  {tool.icon}
                </div>
                <div>
                  <h3 className="text-[15px] font-extrabold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug">
                    {isBn ? tool.titleBn : tool.titleEn}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed line-clamp-3">
                    {isBn ? tool.descriptionBn : tool.descriptionEn}
                  </p>
                </div>
              </div>

              <div className="pt-2.5 border-t border-slate-900/6 dark:border-white/8 flex items-center justify-between text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                <span className="inline-flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
                  <span>{isBn ? tool.badgeBn : tool.badgeEn}</span>
                </span>
                <span className="text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {isBn ? 'খুলুন →' : 'Open →'}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};

export function getToolQuickList(
  lang: ToolsLang = 'en'
): { id: ToolId; label: string; group: 'image' | 'pdf' }[] {
  const isBn = lang === 'bn';
  return [
    ...IMAGE_TOOLS.map((t) => ({
      id: t.id,
      label: isBn ? t.titleBn : t.titleEn,
      group: 'image' as const,
    })),
    ...PDF_TOOLS.map((t) => ({
      id: t.id,
      label: isBn ? t.titleBn : t.titleEn,
      group: 'pdf' as const,
    })),
  ];
}

export { FileText };
