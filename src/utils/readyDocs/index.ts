import {
  ReadyDocCategory,
  ReadyDocPaperOverride,
  ReadyDocPaperType,
  ReadyDocState,
  ReadyDocTemplate,
} from '../../types/readyDocs';
import { CATALOG_PART_1 } from './catalogPart1';
import { CATALOG_PART_2 } from './catalogPart2';
import { CATALOG_PART_3 } from './catalogPart3';

export const READY_DOC_TEMPLATES: ReadyDocTemplate[] = [
  ...CATALOG_PART_1,
  ...CATALOG_PART_2,
  ...CATALOG_PART_3,
];

export interface ReadyDocCategoryMeta {
  id: ReadyDocCategory;
  labelBn: string;
  labelEn: string;
  emoji: string;
}

export const READY_DOC_CATEGORIES: ReadyDocCategoryMeta[] = [
  { id: 'all', labelBn: 'সব', labelEn: 'All', emoji: '' },
  { id: 'application', labelBn: 'আবেদনপত্র', labelEn: 'Applications', emoji: '✍️' },
  { id: 'job', labelBn: 'চাকরির চিঠি', labelEn: 'Job Letters', emoji: '💼' },
  { id: 'certificate', labelBn: 'প্রত্যয়ন ও সনদ', labelEn: 'Certificates', emoji: '📄' },
  { id: 'affidavit', labelBn: 'হলফনামা', labelEn: 'Affidavits', emoji: '📝' },
  { id: 'deed', labelBn: 'দলিল ও চুক্তি', labelEn: 'Deeds & Agreements', emoji: '📜' },
  { id: 'form', labelBn: 'ফরম', labelEn: 'Forms', emoji: '🗂️' },
  { id: 'receipt', labelBn: 'রসিদ ও ক্যাশ মেমো', labelEn: 'Receipts & Memos', emoji: '🧾' },
  { id: 'translation', labelBn: 'অনুবাদ ও নিকাহ', labelEn: 'Translation & Nikah', emoji: '🌐' },
  { id: 'education', labelBn: 'শিক্ষা', labelEn: 'Education', emoji: '🎓' },
];

export interface ReadyDocPaperSpec {
  id: ReadyDocPaperType;
  labelBn: string;
  labelEn: string;
  widthMm: number;
  heightMm: number;
  /** Logical 96dpi pixel width */
  widthPx: number;
  /** Logical 96dpi pixel minimum height */
  heightPx: number;
  orientation: 'portrait' | 'landscape';
}

export const READY_DOC_PAPER_SPECS: Record<ReadyDocPaperType, ReadyDocPaperSpec> = {
  a4: {
    id: 'a4',
    labelBn: 'A4',
    labelEn: 'A4',
    widthMm: 210,
    heightMm: 297,
    widthPx: 794,
    heightPx: 1123,
    orientation: 'portrait',
  },
  'a4-landscape': {
    id: 'a4-landscape',
    labelBn: 'A4 · আড়াআড়ি',
    labelEn: 'A4 · Landscape',
    widthMm: 297,
    heightMm: 210,
    widthPx: 1123,
    heightPx: 794,
    orientation: 'landscape',
  },
  legal: {
    id: 'legal',
    labelBn: 'LEGAL',
    labelEn: 'Legal (14")',
    widthMm: 215.9,
    heightMm: 355.6,
    widthPx: 816,
    heightPx: 1344,
    orientation: 'portrait',
  },
  legal135: {
    id: 'legal135',
    labelBn: 'LEGAL135',
    labelEn: 'Legal 13.5"',
    widthMm: 215.9,
    heightMm: 343,
    widthPx: 816,
    heightPx: 1296,
    orientation: 'portrait',
  },
};

export const resolveReadyDocPaper = (
  template: ReadyDocTemplate,
  override: ReadyDocPaperOverride
): ReadyDocPaperSpec => {
  const effective: ReadyDocPaperType = override === 'auto' ? template.paper : override;
  return READY_DOC_PAPER_SPECS[effective] || READY_DOC_PAPER_SPECS.a4;
};

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

export const toBanglaDigits = (input: string | number): string =>
  String(input).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)] || d);

export const toEnglishDigits = (input: string): string =>
  input.replace(/[০-৯]/g, (d) => {
    const idx = BN_DIGITS.indexOf(d);
    return idx >= 0 ? String(idx) : d;
  });

export const getTodayFormatted = (docLang: 'bn' | 'en'): string => {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = String(now.getFullYear());
  const raw = `${dd}/${mm}/${yyyy}`;
  return docLang === 'bn' ? toBanglaDigits(raw) : raw;
};

export const getReadyDocTemplateById = (id: string): ReadyDocTemplate =>
  READY_DOC_TEMPLATES.find((t) => t.id === id) || READY_DOC_TEMPLATES[0];

export const getDefaultValuesForTemplate = (template: ReadyDocTemplate): Record<string, string> => {
  const result: Record<string, string> = {};
  for (const field of template.fields) {
    if (field.inputType === 'date') {
      result[field.key] = getTodayFormatted(template.lang);
    } else if (field.defaultValue) {
      result[field.key] = field.defaultValue;
    }
  }
  return result;
};

export const createDefaultReadyDocState = (): ReadyDocState => {
  const first = READY_DOC_TEMPLATES[0];
  return {
    selectedDocId: first.id,
    valuesByDoc: {
      [first.id]: getDefaultValuesForTemplate(first),
    },
    tablesByDoc: {},
    photosByDoc: {},
    fontSizePx: 14,
    lineHeight: 1.75,
    stampTopMm: 95,
    paperOverride: 'auto',
    showHeader: true,
    showBorder: false,
    showPageNumber: true,
  };
};
