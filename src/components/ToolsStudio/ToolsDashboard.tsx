import React from 'react';
import {
  ArrowDownUp,
  Combine,
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
  Scissors,
  ShieldCheck,
  UserSquare2,
  Users,
} from 'lucide-react';
import { ToolId } from './SharedToolUI';

interface ToolCardMeta {
  id: ToolId;
  title: string;
  description: string;
  badge: string;
  iconBg: string;
  icon: React.ReactNode;
}

const IMAGE_TOOLS: ToolCardMeta[] = [
  {
    id: 'govt-photo-sign',
    title: 'সরকারি আবেদনের ছবি ও স্বাক্ষর',
    description:
      'চাকরি বা ভর্তির অনলাইন আবেদনে চাওয়া মাপে ছবি (৩০০×৩০০) ও স্বাক্ষর (৩০০×৮০) — KB সীমা ও কালি পরিষ্কারসহ।',
    badge: 'বাল্ক চালু · ZIP চালু',
    iconBg: 'from-indigo-500 to-blue-600',
    icon: <UserSquare2 className="w-5 h-5 text-white" />,
  },
  {
    id: 'image-resize',
    title: 'ছবি রিসাইজ',
    description:
      'ছবির মাপ (পিক্সেল বা শতাংশ) বদলান — চাকরির আবেদনের ছবি, স্বাক্ষর, পাসপোর্ট ও ফেসবুকের রেডি সাইজসহ।',
    badge: 'বাল্ক চালু',
    iconBg: 'from-sky-500 to-blue-600',
    icon: <Maximize2 className="w-5 h-5 text-white" />,
  },
  {
    id: 'image-compress',
    title: 'ছবির সাইজ কমান (KB)',
    description:
      '২০ KB, ৫০ KB, ১০০ KB, ২০০ KB — যত KB লাগে তত KB-তে ছবি নামান, কোয়ালিটি যতটা সম্ভব ভালো রেখে।',
    badge: 'বাল্ক চালু',
    iconBg: 'from-emerald-500 to-green-600',
    icon: <ImageDown className="w-5 h-5 text-white" />,
  },
  {
    id: 'image-convert',
    title: 'ছবি কনভার্ট (JPG / PNG / WebP)',
    description: 'এক ফরম্যাট থেকে অন্য ফরম্যাটে রূপান্তর — কোয়ালিটি কন্ট্রোলসহ একসাথে অনেক ছবি।',
    badge: 'বাল্ক চালু',
    iconBg: 'from-amber-500 to-orange-500',
    icon: <RefreshCw className="w-5 h-5 text-white" />,
  },
  {
    id: 'image-to-pdf',
    title: 'ছবি থেকে PDF',
    description: 'এক বা একাধিক ছবি জুড়ে একটা PDF — A4 পাতায় বা ছবির মাপে সাজানো, ক্রম বদলানো যায়।',
    badge: 'বাল্ক চালু',
    iconBg: 'from-rose-500 to-pink-600',
    icon: <FileOutput className="w-5 h-5 text-white" />,
  },
];

const PDF_TOOLS: ToolCardMeta[] = [
  {
    id: 'pdf-merge',
    title: 'PDF জোড়া (মার্জ)',
    description: 'একাধিক PDF একটা ফাইলে জুড়ুন — পাতার ক্রম উপরে-নিচে বদলানো যায়।',
    badge: 'ZIP চালু',
    iconBg: 'from-sky-500 to-blue-600',
    icon: <Combine className="w-5 h-5 text-white" />,
  },
  {
    id: 'pdf-split',
    title: 'PDF ভাগ / পাতা বের করা',
    description: 'PDF থেকে বেছে নেওয়া পাতা আলাদা করুন অথবা প্রতিটি পাতাকে আলাদা PDF ফাইল বানান।',
    badge: 'ZIP চালু',
    iconBg: 'from-amber-500 to-orange-500',
    icon: <Scissors className="w-5 h-5 text-white" />,
  },
  {
    id: 'pdf-organize',
    title: 'PDF পাতা সাজান / ঘোরান / মুছুন',
    description: 'প্রতিটি পাতার প্রিভিউ ছবি দেখে ঘোরান, বাদ দিন বা আগে-পরে সাজিয়ে নতুন PDF বানান।',
    badge: 'ZIP চালু',
    iconBg: 'from-violet-500 to-indigo-600',
    icon: <LayoutGrid className="w-5 h-5 text-white" />,
  },
  {
    id: 'pdf-to-image',
    title: 'PDF থেকে ছবি (JPG / PNG)',
    description: 'PDF-এর প্রতিটা পাতা উচ্চমানের ছবিতে রূপান্তর করুন — DPI (মান) বেছে নিয়ে ZIP নামান।',
    badge: 'ZIP চালু',
    iconBg: 'from-rose-500 to-pink-600',
    icon: <FileImage className="w-5 h-5 text-white" />,
  },
  {
    id: 'pdf-compress',
    title: 'PDF-এর সাইজ কমান (KB)',
    description: 'PDF ছোট করুন — যত KB লাগে তত KB-তে নামান এক বা একাধিক ফাইল একসাথে।',
    badge: 'ZIP চালু',
    iconBg: 'from-emerald-500 to-green-600',
    icon: <ArrowDownUp className="w-5 h-5 text-white" />,
  },
  {
    id: 'pdf-extract-text',
    title: 'PDF থেকে লেখা বের করুন',
    description: 'PDF-এর ভেতরের সমস্ত লেখা বের করে এক ক্লিকে কপি করুন বা .txt ফাইলে নামান।',
    badge: 'ZIP চালু',
    iconBg: 'from-amber-500 to-yellow-600',
    icon: <FileType className="w-5 h-5 text-white" />,
  },
  {
    id: 'pdf-watermark-number',
    title: 'PDF-এ পেজ নম্বর ও ওয়াটারমার্ক',
    description: 'পাতায় বাংলা বা ইংরেজি পেজ নম্বর এবং কাস্টম হালকা ওয়াটারমার্ক বসান।',
    badge: 'ZIP চালু',
    iconBg: 'from-indigo-500 to-purple-600',
    icon: <Hash className="w-5 h-5 text-white" />,
  },
];

interface ToolsDashboardProps {
  onSelectTool: (id: ToolId) => void;
}

export const ToolsDashboard: React.FC<ToolsDashboardProps> = ({ onSelectTool }) => {
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
            <strong className="text-slate-900 dark:text-white">১০০% অফলাইন ও নিরাপদ:</strong> সব
            কাজ আপনার ফোন বা কম্পিউটারের ব্রাউজারেই হয় — কোনো ছবি বা PDF কোথাও আপলোড হয় না। সব টুলে
            বাল্ক প্রসেসিং ও ZIP ডাউনলোড চালু আছে।
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs font-bold shrink-0">
          <button
            type="button"
            onClick={() => scrollToSection('section-image-tools')}
            className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer whitespace-nowrap"
          >
            ছবির টুলস ↓
          </button>
          <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
            ·
          </span>
          <button
            type="button"
            onClick={() => scrollToSection('section-pdf-tools')}
            className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer whitespace-nowrap"
          >
            PDF টুলস ↓
          </button>
        </div>
      </div>

      {/* Section 1: ছবির টুলস (Image Tools) */}
      <section id="section-image-tools" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              ছবির টুলস
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-0.5">
              সরকারি আবেদনের ছবি-স্বাক্ষর, রিসাইজ, KB কমানো, ফরম্যাট কনভার্ট ও ছবি থেকে PDF — সব
              অফলাইনে।
            </p>
          </div>
          <button
            type="button"
            onClick={() => scrollToSection('section-pdf-tools')}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer self-start sm:self-auto"
          >
            PDF টুলস দেখুন →
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
                    {tool.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed line-clamp-3">
                    {tool.description}
                  </p>
                </div>
              </div>

              <div className="pt-2.5 border-t border-slate-900/6 dark:border-white/8 flex items-center justify-between text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 shrink-0" />
                  <span>{tool.badge}</span>
                </span>
                <span className="text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  খুলুন →
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Section 2: PDF টুলস (PDF Tools) */}
      <section id="section-pdf-tools" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              PDF টুলস
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-0.5">
              সব কাজ আপনার ফোন বা কম্পিউটারেই হয় — PDF কোথাও আপলোড হয় না। একসাথে অনেক ফাইল ও ZIP
              ডাউনলোড চালু।
            </p>
          </div>
          <button
            type="button"
            onClick={() => scrollToSection('section-image-tools')}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer self-start sm:self-auto"
          >
            ছবির টুলস দেখুন ↑
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
                    {tool.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed line-clamp-3">
                    {tool.description}
                  </p>
                </div>
              </div>

              <div className="pt-2.5 border-t border-slate-900/6 dark:border-white/8 flex items-center justify-between text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                <span className="inline-flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
                  <span>{tool.badge}</span>
                </span>
                <span className="text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  খুলুন →
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};

export const ALL_TOOL_QUICK_LIST: { id: ToolId; label: string; group: 'image' | 'pdf' }[] = [
  ...IMAGE_TOOLS.map((t) => ({ id: t.id, label: t.title, group: 'image' as const })),
  ...PDF_TOOLS.map((t) => ({ id: t.id, label: t.title, group: 'pdf' as const })),
];

export { FileText };
