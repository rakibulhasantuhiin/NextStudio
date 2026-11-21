import type { BanglaFontId, HighlightColorId } from '../utils/richText';

export type ReadyDocCategory =
  | 'all'
  | 'application'
  | 'job'
  | 'certificate'
  | 'affidavit'
  | 'deed'
  | 'form'
  | 'receipt'
  | 'translation'
  | 'education';

export type ReadyDocPaperType = 'a4' | 'a4-landscape' | 'legal' | 'legal135';

export type ReadyDocPaperOverride = 'auto' | ReadyDocPaperType;

export interface ReadyDocField {
  key: string;
  label: string;
  hint?: string;
  defaultValue?: string;
  inputType?: 'text' | 'textarea' | 'date' | 'number' | 'select';
  options?: string[];
  /** Hidden from inline text — shown inside Extra Options panel */
  isOptionField?: boolean;
}

export type ReadyDocBlock =
  | {
      type: 'header';
      title: string;
      subtitle?: string;
      metaLeft?: string;
      metaRight?: string;
      align?: 'center' | 'left';
      underline?: boolean;
      optionalHeader?: boolean;
    }
  | {
      type: 'dateLine';
      text: string;
      align?: 'left' | 'right';
      refText?: string;
    }
  | {
      type: 'recipient';
      lines: string[];
    }
  | {
      type: 'subject';
      label: string;
      text: string;
    }
  | {
      type: 'salutation';
      text: string;
    }
  | {
      type: 'heading';
      text: string;
      align?: 'center' | 'left';
      boxed?: boolean;
    }
  | {
      type: 'paragraph';
      text: string;
      indent?: boolean;
      bold?: boolean;
      align?: 'left' | 'center' | 'right' | 'justify';
    }
  | {
      type: 'numberedList';
      title?: string;
      items: string[];
    }
  | {
      type: 'keyValueGrid';
      title?: string;
      columns?: 1 | 2;
      rows: { label: string; value: string }[];
      bordered?: boolean;
    }
  | {
      type: 'table';
      title?: string;
      columns: string[];
      columnWidths?: string[];
      /** If true, last column is summed automatically for totals */
      showTotalRow?: boolean;
      totalLabel?: string;
      /** Column index (0-based) to sum numerically when showTotalRow is true */
      sumColumnIndex?: number;
      compact?: boolean;
    }
  | {
      type: 'photoRow';
      title: string;
      subtitle?: string;
      infoLines: string[];
      photoLabel?: string;
    }
  | {
      type: 'signatures';
      items: {
        title: string;
        subtitle?: string;
        align?: 'left' | 'center' | 'right';
      }[];
      layout?: 'single-right' | 'two-col' | 'three-col';
    }
  | {
      type: 'witnesses';
      title?: string;
      count?: number;
    }
  | {
      type: 'note';
      text: string;
    }
  | {
      type: 'divider';
    };

export interface ReadyDocTemplate {
  id: string;
  category: Exclude<ReadyDocCategory, 'all'>;
  title: string;
  titleEn: string;
  paper: ReadyDocPaperType;
  isStampPaper?: boolean;
  defaultStampTopMm?: number;
  isPadHeader?: boolean;
  previewSnippet: string;
  lang: 'bn' | 'en';
  fields: ReadyDocField[];
  blocks: ReadyDocBlock[];
  defaultTableRows?: string[][];
  sampleValues?: Record<string, string>;
  hasPhotoBox?: boolean;
  hasOptionalHeaderToggle?: boolean;
}

export interface ReadyDocState {
  selectedDocId: string;
  valuesByDoc: Record<string, Record<string, string>>;
  tablesByDoc: Record<string, string[][]>;
  photosByDoc: Record<string, string>;
  fontFamily?: BanglaFontId;
  fontSizePx: number;
  lineHeight: number;
  textBold?: boolean;
  textItalic?: boolean;
  textUnderline?: boolean;
  textHighlight?: HighlightColorId;
  stampTopMm: number;
  paperOverride: ReadyDocPaperOverride;
  showHeader: boolean;
  showBorder: boolean;
  showPageNumber: boolean;
}
