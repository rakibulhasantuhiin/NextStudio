import React from 'react';
import {
  ArrowDownUp,
  ArrowLeftRight,
  Combine,
  Eraser,
  FileImage,
  FileOutput,
  FileSpreadsheet,
  FileText,
  FileType,
  Hash,
  ImageDown,
  Languages,
  LayoutGrid,
  Maximize2,
  RefreshCw,
  ScanLine,
  Scissors,
  UserSquare2,
  Users,
} from 'lucide-react';
import { ToolId, ToolsLang } from './SharedToolUI';

interface ToolCardMeta {
  serial: string;
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

// Group 1 (01–07): Image Capture, Cleanup, Resize & Packaging
const IMAGE_TOOLS: ToolCardMeta[] = [
  {
    serial: '01',
    id: 'doc-scanner',
    titleEn: 'Document Scanner (CamScanner Pro)',
    titleBn: 'ডকুমেন্ট স্ক্যানার (CamScanner প্রো)',
    descriptionEn:
      'Auto & manual 4-corner perspective crop, Magic Pro / Magic Color filters, crisp white Full HD pages, A4 auto-fit, PDF & direct print.',
    descriptionBn:
      'যেকোনো ডকুমেন্ট, বিল বা ছবির অটো ও ম্যানুয়াল ৪-কোনা ক্রপ, ম্যাজিক প্রো ফিল্টার, সাদা Full HD পেজ, A4 ফিট ও সরাসরি প্রিন্ট।',
    badgeEn: 'Magic Pro · Auto Crop · Print',
    badgeBn: 'ম্যাজিক প্রো · অটো ক্রপ · প্রিন্ট',
    iconBg: 'from-teal-500 to-emerald-600',
    icon: <ScanLine className="w-5 h-5 text-white" />,
  },
  {
    serial: '02',
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
    serial: '03',
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
    serial: '04',
    id: 'image-resize',
    titleEn: 'Image Resize',
    titleBn: 'ছবি রিসাইজ',
    descriptionEn:
      'Change image dimensions by pixel or percentage — includes ready presets for job photos, signatures, passport & social media.',
    descriptionBn:
      'ছবির মাপ (পিক্সেল বা শতাংশ) বদলান — চাকরির আবেদনের ছবি, স্বাক্ষর, পাসপোর্ট ও ফেসবুকের রেডি সাইজসহ।',
    badgeEn: 'Bulk · Presets',
    badgeBn: 'বাল্ক · রেডি সাইজ',
    iconBg: 'from-sky-500 to-blue-600',
    icon: <Maximize2 className="w-5 h-5 text-white" />,
  },
  {
    serial: '05',
    id: 'image-compress',
    titleEn: 'Compress Image (Target KB)',
    titleBn: 'ছবির সাইজ কমান (KB)',
    descriptionEn:
      'Compress images under 20 KB, 50 KB, 100 KB, or 200 KB with the highest possible visual sharpness.',
    descriptionBn:
      '২০ KB, ৫০ KB, ১০০ KB, ২০০ KB — যত KB লাগে তত KB-তে ছবি নামান, কোয়ালিটি যতটা সম্ভব ভালো রেখে।',
    badgeEn: 'Bulk · Target KB',
    badgeBn: 'বাল্ক · টার্গেট KB',
    iconBg: 'from-emerald-500 to-green-600',
    icon: <ImageDown className="w-5 h-5 text-white" />,
  },
  {
    serial: '06',
    id: 'image-convert',
    titleEn: 'Convert Image (JPG / PNG / WebP)',
    titleBn: 'ছবি কনভার্ট (JPG / PNG / WebP)',
    descriptionEn:
      'Batch convert images between JPG, PNG, and WebP formats with customizable output quality.',
    descriptionBn: 'এক ফরম্যাট থেকে অন্য ফরম্যাটে রূপান্তর — কোয়ালিটি কন্ট্রোলসহ একসাথে অনেক ছবি।',
    badgeEn: 'Bulk · ZIP Ready',
    badgeBn: 'বাল্ক · ZIP চালু',
    iconBg: 'from-amber-500 to-orange-500',
    icon: <RefreshCw className="w-5 h-5 text-white" />,
  },
  {
    serial: '07',
    id: 'image-to-pdf',
    titleEn: 'Image to PDF',
    titleBn: 'ছবি থেকে PDF',
    descriptionEn:
      'Combine one or multiple images into a single print-ready PDF on A4 or original image size with page reordering.',
    descriptionBn: 'এক বা একাধিক ছবি জুড়ে একটা PDF — A4 পাতায় বা ছবির মাপে সাজানো, ক্রম বদলানো যায়।',
    badgeEn: 'A4 · Reorder',
    badgeBn: 'A4 · ক্রম সাজান',
    iconBg: 'from-rose-500 to-pink-600',
    icon: <FileOutput className="w-5 h-5 text-white" />,
  },
];

// Group 2 (08–13): PDF Page Organization, Pagination & Sizing
const PDF_TOOLS: ToolCardMeta[] = [
  {
    serial: '08',
    id: 'pdf-merge',
    titleEn: 'Merge PDF',
    titleBn: 'PDF জোড়া (মার্জ)',
    descriptionEn:
      'Combine multiple PDF documents into one file and reorder files up or down before merging.',
    descriptionBn: 'একাধিক PDF একটা ফাইলে জুড়ুন — পাতার ক্রম উপরে-নিচে বদলানো যায়।',
    badgeEn: 'Offline · Fast',
    badgeBn: 'অফলাইন · দ্রুত',
    iconBg: 'from-sky-500 to-blue-600',
    icon: <Combine className="w-5 h-5 text-white" />,
  },
  {
    serial: '09',
    id: 'pdf-split',
    titleEn: 'Split / Extract PDF Pages',
    titleBn: 'PDF ভাগ / পাতা বের করা',
    descriptionEn:
      'Extract specific page ranges or split every page into separate PDF files packaged in a ZIP.',
    descriptionBn: 'PDF থেকে বেছে নেওয়া পাতা আলাদা করুন অথবা প্রতিটি পাতাকে আলাদা PDF ফাইল বানান।',
    badgeEn: 'Range · ZIP',
    badgeBn: 'রেঞ্জ · ZIP চালু',
    iconBg: 'from-amber-500 to-orange-500',
    icon: <Scissors className="w-5 h-5 text-white" />,
  },
  {
    serial: '10',
    id: 'pdf-organize',
    titleEn: 'Organize / Rotate / Delete Pages',
    titleBn: 'PDF পাতা সাজান / ঘোরান / মুছুন',
    descriptionEn:
      'Preview every PDF page visually to rotate, delete, or reorder pages and save a clean new PDF.',
    descriptionBn: 'প্রতিটি পাতার প্রিভিউ ছবি দেখে ঘোরান, বাদ দিন বা আগে-পরে সাজিয়ে নতুন PDF বানান।',
    badgeEn: 'Visual Preview',
    badgeBn: 'ভিজ্যুয়াল প্রিভিউ',
    iconBg: 'from-violet-500 to-indigo-600',
    icon: <LayoutGrid className="w-5 h-5 text-white" />,
  },
  {
    serial: '11',
    id: 'pdf-watermark-number',
    titleEn: 'PDF Page Numbers & Watermark',
    titleBn: 'PDF-এ পেজ নম্বর ও ওয়াটারমার্ক',
    descriptionEn:
      'Stamp English or Bengali page numbers and custom translucent diagonal/straight watermarks onto PDFs.',
    descriptionBn: 'পাতায় বাংলা বা ইংরেজি পেজ নম্বর এবং কাস্টম হালকা ওয়াটারমার্ক বসান।',
    badgeEn: 'Bulk · ZIP',
    badgeBn: 'বাল্ক · ZIP চালু',
    iconBg: 'from-indigo-500 to-purple-600',
    icon: <Hash className="w-5 h-5 text-white" />,
  },
  {
    serial: '12',
    id: 'pdf-compress',
    titleEn: 'Compress PDF (Target KB)',
    titleBn: 'PDF-এর সাইজ কমান (KB)',
    descriptionEn:
      'Shrink PDF file size under your target KB limit — works with single or multiple PDF files at once.',
    descriptionBn: 'PDF ছোট করুন — যত KB লাগে তত KB-তে নামান এক বা একাধিক ফাইল একসাথে।',
    badgeEn: 'Target KB · ZIP',
    badgeBn: 'টার্গেট KB · ZIP',
    iconBg: 'from-emerald-500 to-green-600',
    icon: <ArrowDownUp className="w-5 h-5 text-white" />,
  },
  {
    serial: '13',
    id: 'pdf-to-image',
    titleEn: 'PDF to Image (JPG / PNG)',
    titleBn: 'PDF থেকে ছবি (JPG / PNG)',
    descriptionEn:
      'Render every PDF page into high-resolution JPG or PNG images with selectable DPI and ZIP download.',
    descriptionBn: 'PDF-এর প্রতিটা পাতা উচ্চমানের ছবিতে রূপান্তর করুন — DPI বেছে নিয়ে ZIP নামান।',
    badgeEn: 'HD DPI · ZIP',
    badgeBn: 'HD DPI · ZIP চালু',
    iconBg: 'from-rose-500 to-pink-600',
    icon: <FileImage className="w-5 h-5 text-white" />,
  },
];

// Group 3 (14–16): Bangla OCR, Text Extraction & Office Document Conversion
const OCR_AND_OFFICE_TOOLS: ToolCardMeta[] = [
  {
    serial: '14',
    id: 'bangla-ocr',
    titleEn: 'Free Bangla & Bengali OCR Studio',
    titleBn: 'বাংলা ও বেঙ্গলি OCR (ছবি, হাতের লেখা ও PDF)',
    descriptionEn:
      'Online AI & Offline OCR: printed pages, phone/WhatsApp photos, Bangla handwriting (০১২৩), Bangla PDF to Text/Word, mixed Bangla-English, Form OCR & Word/PDF/JSON export.',
    descriptionBn:
      'অনলাইন ও অফলাইন — ছাপা ছবি, ফোন/WhatsApp ছবি, বাংলা হাতের লেখা (০১২৩), বাংলা PDF থেকে টেক্সট ও Word, মিশ্র বাংলা-ইংরেজি, ফরম OCR এবং Word/PDF/JSON এক্সপোর্ট।',
    badgeEn: 'Online AI · Offline · 9 Modes',
    badgeBn: 'অনলাইন · অফলাইন · ৯টি মোড',
    iconBg: 'from-emerald-600 to-teal-700',
    icon: <Languages className="w-5 h-5 text-white" />,
  },
  {
    serial: '15',
    id: 'pdf-extract-text',
    titleEn: 'Extract Text from PDF',
    titleBn: 'PDF থেকে লেখা বের করুন',
    descriptionEn:
      'Extract all selectable text from PDF documents to copy in one click or save as .txt files.',
    descriptionBn: 'PDF-এর ভেতরের সমস্ত লেখা বের করে এক ক্লিকে কপি করুন বা .txt ফাইলে নামান।',
    badgeEn: 'TXT · ZIP',
    badgeBn: 'TXT · ZIP চালু',
    iconBg: 'from-amber-500 to-yellow-600',
    icon: <FileType className="w-5 h-5 text-white" />,
  },
  {
    serial: '16',
    id: 'doc-converter',
    titleEn: 'PDF ↔ Word / Excel / PPTX Converter',
    titleBn: 'PDF ↔ Word / Excel / PPTX কনভার্টার',
    descriptionEn:
      'Convert PDF to Word (.docx/.doc), PowerPoint, or Excel, and convert Office files to crisp Bengali/English PDF without broken fonts.',
    descriptionBn:
      'PDF থেকে Word, PowerPoint, Excel এবং Word/Doc/Excel/PPTX থেকে ফন্ট ও যুক্তাক্ষর না ভেঙে PDF — সাথে ছবি থেকে Word (অফলাইন)।',
    badgeEn: 'Office Suite · Offline',
    badgeBn: 'অফিস ফরম্যাট · অফলাইন',
    iconBg: 'from-blue-600 to-indigo-600',
    icon: <ArrowLeftRight className="w-5 h-5 text-white" />,
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

  const renderToolGrid = (
    tools: ToolCardMeta[],
    footerIcon: React.ReactNode
  ) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {tools.map((tool) => (
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
            <span className="inline-flex items-center gap-1.5 min-w-0 truncate">
              {footerIcon}
              <span className="truncate">{isBn ? tool.badgeBn : tool.badgeEn}</span>
            </span>
            <span className="text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors shrink-0">
              {isBn ? 'খুলুন →' : 'Open →'}
            </span>
          </div>
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-9">
      {/* Section 1: Image Tools */}
      <section id="section-image-tools" className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {isBn ? 'ছবির টুলস' : 'Image Tools'}
          </h2>
          <button
            type="button"
            onClick={() => scrollToSection('section-pdf-tools')}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer whitespace-nowrap"
          >
            {isBn ? 'PDF টুলস →' : 'PDF Tools →'}
          </button>
        </div>

        {renderToolGrid(IMAGE_TOOLS, <Users className="w-3.5 h-3.5 shrink-0" />)}
      </section>

      {/* Section 2: PDF Tools */}
      <section id="section-pdf-tools" className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {isBn ? 'PDF টুলস' : 'PDF Tools'}
          </h2>
          <button
            type="button"
            onClick={() => scrollToSection('section-ocr-office-tools')}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer whitespace-nowrap"
          >
            {isBn ? 'বাংলা OCR ও অফিস →' : 'Bangla OCR & Office →'}
          </button>
        </div>

        {renderToolGrid(PDF_TOOLS, <FileText className="w-3.5 h-3.5 shrink-0" />)}
      </section>

      {/* Section 3: Bangla OCR & Office Tools */}
      <section id="section-ocr-office-tools" className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {isBn ? 'বাংলা OCR ও অফিস টুলস' : 'Bangla OCR & Office Tools'}
          </h2>
          <button
            type="button"
            onClick={() => scrollToSection('section-image-tools')}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer whitespace-nowrap"
          >
            {isBn ? 'উপরে ফিরুন ↑' : 'Back to Top ↑'}
          </button>
        </div>

        {renderToolGrid(
          OCR_AND_OFFICE_TOOLS,
          <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
        )}
      </section>
    </div>
  );
};

export function getToolQuickList(
  lang: ToolsLang = 'en'
): { id: ToolId; label: string; group: 'image' | 'pdf' | 'ocr-office' }[] {
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
    ...OCR_AND_OFFICE_TOOLS.map((t) => ({
      id: t.id,
      label: isBn ? t.titleBn : t.titleEn,
      group: 'ocr-office' as const,
    })),
  ];
}

export { FileText };
