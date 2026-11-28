import JSZip from 'jszip';
import * as mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import PptxGenJS from 'pptxgenjs';
import { createWorker, OEM } from 'tesseract.js';
import { toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  PageBreak,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import {
  BanglaFontId,
  DEFAULT_BANGLA_FONT,
  getBanglaFontStack,
} from './richText';
import { getBaseName, loadImageFromFile } from './toolsEngine';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

// ============================================================================
// TYPES & FORMAT DEFINITIONS
// ============================================================================

export type ConverterMode =
  | 'pdf-to-office'
  | 'office-to-pdf'
  | 'image-to-word'
  | 'cross-format';

export type OutputFormat =
  | 'docx'
  | 'doc'
  | 'pptx'
  | 'xlsx'
  | 'csv'
  | 'rtf'
  | 'html'
  | 'txt'
  | 'pdf';

export type SourceFormatKind =
  | 'pdf'
  | 'docx'
  | 'doc'
  | 'xlsx'
  | 'xls'
  | 'csv'
  | 'ods'
  | 'pptx'
  | 'rtf'
  | 'html'
  | 'txt'
  | 'md'
  | 'image';

export type PdfPageSizeId = 'a4' | 'letter' | 'legal';
export type PdfOrientationId = 'portrait' | 'landscape';
export type OcrLangMode = 'ben+eng' | 'eng' | 'ben';
export type PptxMode = 'editable' | 'hybrid';

export interface StructuredBlock {
  kind: 'heading' | 'paragraph' | 'list-item' | 'table' | 'image';
  text: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  rows?: string[][];
  imageDataUrl?: string;
}

export interface StructuredPage {
  pageNumber: number;
  widthPt: number;
  heightPt: number;
  blocks: StructuredBlock[];
  tableRows: string[][];
  rawText: string;
  snapshotDataUrl?: string;
  usedOcr?: boolean;
}

export interface ExtractedSlide {
  index: number;
  title: string;
  texts: string[];
  tables: string[][][];
  imageUrls: string[];
}

export interface ExtractedSheet {
  name: string;
  rows: string[][];
}

export interface ExtractedDocumentPayload {
  sourceName: string;
  sourceKind: SourceFormatKind;
  title: string;
  htmlContent: string;
  plainText: string;
  sheets?: ExtractedSheet[];
  slides?: ExtractedSlide[];
  pages?: StructuredPage[];
  detectedOcrConfidence?: number;
  enhancedPreviewUrl?: string;
  originalPreviewUrl?: string;
}

export interface PdfRenderOptions {
  pageSize: PdfPageSizeId;
  orientation: PdfOrientationId;
  banglaFont: BanglaFontId;
  fontSizePx: number;
  marginMm: number;
}

export interface OcrOptions {
  lang: OcrLangMode;
  enhanceSharpness: boolean;
  upscale2x: boolean;
  adaptiveThreshold: boolean;
}

const OCR_WORKER_PATH = '/ocr/worker.min.js';
const OCR_CORE_PATH = '/ocr';
const OCR_LANG_CACHE_KEY = 'nextstudio_ocr_cached_langs_v1';

// ============================================================================
// FORMAT DETECTION & HELPERS
// ============================================================================

export function detectSourceKind(file: File): SourceFormatKind {
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.pdf') || file.type === 'application/pdf') return 'pdf';
  if (lower.endsWith('.docx')) return 'docx';
  if (lower.endsWith('.doc')) return 'doc';
  if (lower.endsWith('.xlsx')) return 'xlsx';
  if (lower.endsWith('.xls')) return 'xls';
  if (lower.endsWith('.csv')) return 'csv';
  if (lower.endsWith('.ods')) return 'ods';
  if (lower.endsWith('.pptx')) return 'pptx';
  if (lower.endsWith('.rtf')) return 'rtf';
  if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'html';
  if (lower.endsWith('.md') || lower.endsWith('.markdown')) return 'md';
  if (lower.endsWith('.txt')) return 'txt';
  if (
    file.type.startsWith('image/') ||
    /\.(png|jpe?g|webp|bmp|gif)$/i.test(lower)
  ) {
    return 'image';
  }
  return 'txt';
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function dataUrlToUint8Array(dataUrl: string): { bytes: Uint8Array; ext: 'png' | 'jpg' } {
  const isPng = dataUrl.startsWith('data:image/png');
  const base64 = dataUrl.split(',')[1] || '';
  const binStr = atob(base64);
  const bytes = new Uint8Array(binStr.length);
  for (let i = 0; i < binStr.length; i++) {
    bytes[i] = binStr.charCodeAt(i);
  }
  return { bytes, ext: isPng ? 'png' : 'jpg' };
}

function getPaperDimensionsMm(
  pageSize: PdfPageSizeId,
  orientation: PdfOrientationId
): { widthMm: number; heightMm: number } {
  let w = 210;
  let h = 297;
  if (pageSize === 'letter') {
    w = 215.9;
    h = 279.4;
  } else if (pageSize === 'legal') {
    w = 215.9;
    h = 355.6;
  }
  return orientation === 'landscape'
    ? { widthMm: h, heightMm: w }
    : { widthMm: w, heightMm: h };
}

// ============================================================================
// SHARP IMAGE PRE-PROCESSING FOR OCR (Contrast, Unsharp, 2x Upscale, Binarize)
// ============================================================================

export async function preprocessImageForOcr(
  source: File | HTMLCanvasElement,
  options: { enhanceSharpness: boolean; upscale2x: boolean; adaptiveThreshold: boolean }
): Promise<{
  canvas: HTMLCanvasElement;
  enhancedDataUrl: string;
  originalDataUrl?: string;
}> {
  let srcCanvas: HTMLCanvasElement;
  let originalDataUrl: string | undefined;

  if (source instanceof HTMLCanvasElement) {
    srcCanvas = source;
  } else {
    const img = await loadImageFromFile(source);
    srcCanvas = document.createElement('canvas');
    srcCanvas.width = img.naturalWidth || img.width;
    srcCanvas.height = img.naturalHeight || img.height;
    const sctx = srcCanvas.getContext('2d');
    if (!sctx) throw new Error('Could not initialize image canvas.');
    sctx.drawImage(img, 0, 0);
    originalDataUrl = srcCanvas.toDataURL('image/jpeg', 0.9);
  }

  let scale = 1;
  if (options.upscale2x) {
    if (srcCanvas.width < 1200) scale = 2.2;
    else if (srcCanvas.width < 1900) scale = 1.6;
  }
  const targetW = Math.min(3400, Math.round(srcCanvas.width * scale));
  const targetH = Math.min(4400, Math.round(srcCanvas.height * scale));

  const outCanvas = document.createElement('canvas');
  outCanvas.width = targetW;
  outCanvas.height = targetH;
  const ctx = outCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not initialize OCR canvas.');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, targetW, targetH);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(srcCanvas, 0, 0, targetW, targetH);

  if (options.enhanceSharpness || options.adaptiveThreshold) {
    const imgData = ctx.getImageData(0, 0, targetW, targetH);
    const data = imgData.data;
    const totalPixels = targetW * targetH;
    const gray = new Uint8ClampedArray(totalPixels);

    // 1. Convert to luminance grayscale + build histogram
    const hist = new Uint32Array(256);
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      const lum = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      gray[p] = lum;
      hist[lum]++;
    }

    // 2. Contrast normalization (2nd to 98th percentile stretch)
    let low = 0;
    let high = 255;
    let acc = 0;
    const lowCut = totalPixels * 0.02;
    const highCut = totalPixels * 0.98;
    for (let v = 0; v < 256; v++) {
      acc += hist[v];
      if (acc < lowCut) low = v;
      if (acc <= highCut) high = v;
    }
    const span = Math.max(24, high - low);

    const normalized = new Uint8ClampedArray(totalPixels);
    for (let p = 0; p < totalPixels; p++) {
      const stretched = Math.round(((gray[p] - low) / span) * 255);
      normalized[p] = stretched < 0 ? 0 : stretched > 255 ? 255 : stretched;
    }

    // 3. Fast 3x3 unsharp mask to crisp blurred text edges
    const sharpened = new Uint8ClampedArray(totalPixels);
    for (let y = 0; y < targetH; y++) {
      const rowOffset = y * targetW;
      for (let x = 0; x < targetW; x++) {
        const idx = rowOffset + x;
        if (x === 0 || y === 0 || x === targetW - 1 || y === targetH - 1) {
          sharpened[idx] = normalized[idx];
          continue;
        }
        const center = normalized[idx] * 5;
        const neighbors =
          normalized[idx - 1] +
          normalized[idx + 1] +
          normalized[idx - targetW] +
          normalized[idx + targetW];
        const sharpVal = center - neighbors;
        sharpened[idx] = sharpVal < 0 ? 0 : sharpVal > 255 ? 255 : sharpVal;
      }
    }

    // 4. Optional local adaptive binarization (clean black text on white paper)
    if (options.adaptiveThreshold) {
      // Compute integral image for fast local window mean
      const integral = new Float64Array((targetW + 1) * (targetH + 1));
      const iw = targetW + 1;
      for (let y = 1; y <= targetH; y++) {
        let rowSum = 0;
        const srcRow = (y - 1) * targetW;
        const dstRow = y * iw;
        const prevRow = (y - 1) * iw;
        for (let x = 1; x <= targetW; x++) {
          rowSum += sharpened[srcRow + x - 1];
          integral[dstRow + x] = integral[prevRow + x] + rowSum;
        }
      }

      const radius = Math.max(12, Math.round(Math.min(targetW, targetH) * 0.015));
      for (let y = 0; y < targetH; y++) {
        const y1 = Math.max(0, y - radius);
        const y2 = Math.min(targetH - 1, y + radius);
        for (let x = 0; x < targetW; x++) {
          const x1 = Math.max(0, x - radius);
          const x2 = Math.min(targetW - 1, x + radius);
          const area = (x2 - x1 + 1) * (y2 - y1 + 1);
          const sum =
            integral[(y2 + 1) * iw + (x2 + 1)] -
            integral[y1 * iw + (x2 + 1)] -
            integral[(y2 + 1) * iw + x1] +
            integral[y1 * iw + x1];
          const localMean = sum / area;
          const val = sharpened[y * targetW + x];
          // Soft-adaptive crisp text preservation
          const outVal = val < localMean - 11 ? 15 : val < localMean - 4 ? Math.min(95, val) : 255;
          const di = (y * targetW + x) * 4;
          data[di] = outVal;
          data[di + 1] = outVal;
          data[di + 2] = outVal;
          data[di + 3] = 255;
        }
      }
    } else {
      for (let p = 0; p < totalPixels; p++) {
        const v = sharpened[p];
        const di = p * 4;
        data[di] = v;
        data[di + 1] = v;
        data[di + 2] = v;
        data[di + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }

  return {
    canvas: outCanvas,
    enhancedDataUrl: outCanvas.toDataURL('image/png'),
    originalDataUrl,
  };
}

// ============================================================================
// OFFLINE TESSERACT OCR ENGINE (Bangla + English)
// ============================================================================

export function getCachedOcrLangs(): string[] {
  try {
    const raw = localStorage.getItem(OCR_LANG_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function markOcrLangCached(langStr: string): void {
  try {
    const existing = new Set(getCachedOcrLangs());
    langStr.split('+').forEach((l) => existing.add(l.trim()));
    localStorage.setItem(OCR_LANG_CACHE_KEY, JSON.stringify(Array.from(existing)));
  } catch {
    // ignore storage quota errors
  }
}

export async function prewarmOfflineOcrPack(
  langMode: OcrLangMode = 'ben+eng',
  onProgress?: (pct: number, statusText: string) => void
): Promise<void> {
  const worker = await createWorker(langMode, OEM.LSTM_ONLY, {
    workerPath: OCR_WORKER_PATH,
    corePath: OCR_CORE_PATH,
    workerBlobURL: false,
    logger: (m) => {
      if (onProgress && typeof m.progress === 'number') {
        onProgress(Math.round(m.progress * 100), m.status || 'Caching OCR language pack');
      }
    },
  });
  try {
    markOcrLangCached(langMode);
  } finally {
    await worker.terminate();
  }
}

export async function runOfflineOcr(
  input: HTMLCanvasElement | Blob | string,
  ocrLang: OcrLangMode,
  onProgress?: (pct: number, statusText: string) => void
): Promise<{
  text: string;
  confidence: number;
  paragraphs: string[];
}> {
  let worker: Awaited<ReturnType<typeof createWorker>> | null = null;
  try {
    worker = await createWorker(ocrLang, OEM.LSTM_ONLY, {
      workerPath: OCR_WORKER_PATH,
      corePath: OCR_CORE_PATH,
      workerBlobURL: false,
      logger: (m) => {
        if (onProgress && typeof m.progress === 'number') {
          onProgress(Math.round(m.progress * 100), m.status || 'recognizing');
        }
      },
    });
    markOcrLangCached(ocrLang);

    const res = await worker.recognize(input, {}, { blocks: true, text: true });
    const rawText = (res.data.text || '')
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    const paragraphs: string[] = [];
    if (res.data.blocks && res.data.blocks.length > 0) {
      for (const blk of res.data.blocks) {
        if (blk.paragraphs && blk.paragraphs.length > 0) {
          for (const para of blk.paragraphs) {
            const pText = (para.text || '').replace(/\s+/g, ' ').trim();
            if (pText) paragraphs.push(pText);
          }
        } else if (blk.text?.trim()) {
          paragraphs.push(blk.text.trim());
        }
      }
    }

    if (paragraphs.length === 0 && rawText) {
      rawText
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean)
        .forEach((p) => paragraphs.push(p));
    }

    return {
      text: rawText,
      confidence: Math.round(res.data.confidence || 0),
      paragraphs,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!navigator.onLine) {
      throw new Error(
        `Offline OCR language pack (${ocrLang}) is not cached yet. Connect briefly once and click "Cache Offline OCR Pack". (${msg})`
      );
    }
    throw err;
  } finally {
    if (worker) {
      await worker.terminate();
    }
  }
}

// ============================================================================
// PDF PARSING & LAYOUT / TABLE RECONSTRUCTION
// ============================================================================

interface PositionedPdfRun {
  str: string;
  x: number;
  y: number;
  width: number;
  fontSize: number;
  bold: boolean;
  italic: boolean;
}

export async function extractStructuredFromPdf(
  file: File,
  options?: {
    autoOcrScanned?: boolean;
    ocrLang?: OcrLangMode;
    captureSnapshots?: boolean;
    onProgress?: (pct: number, msg: string) => void;
  }
): Promise<ExtractedDocumentPayload> {
  const bytes = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
  const numPages = pdf.numPages;

  const pages: StructuredPage[] = [];
  const sheets: ExtractedSheet[] = [];
  const htmlParts: string[] = [];
  const textParts: string[] = [];
  let ocrConfidenceSum = 0;
  let ocrCount = 0;

  for (let pNum = 1; pNum <= numPages; pNum++) {
    options?.onProgress?.(
      Math.round(((pNum - 1) / Math.max(1, numPages)) * 100),
      `Analyzing PDF page ${pNum} / ${numPages}`
    );

    const page = await pdf.getPage(pNum);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();

    const runs: PositionedPdfRun[] = [];
    for (const rawItem of content.items) {
      if (!('str' in rawItem) || !rawItem.str) continue;
      const str = rawItem.str;
      if (!str.trim() && str.length === 0) continue;
      const tr = rawItem.transform || [1, 0, 0, 12, 0, 0];
      const fontSize = Math.max(6, Math.round(Math.hypot(tr[0], tr[1]) || Math.abs(tr[3]) || 11));
      const styleInfo = content.styles?.[rawItem.fontName];
      const fontHint = `${rawItem.fontName || ''} ${styleInfo?.fontFamily || ''}`.toLowerCase();
      runs.push({
        str,
        x: tr[4] || 0,
        y: tr[5] || 0,
        width: rawItem.width || str.length * fontSize * 0.48,
        fontSize,
        bold: /bold|black|heavy|semibold|demi|700|800/.test(fontHint),
        italic: /italic|oblique/.test(fontHint),
      });
    }

    // Group runs into horizontal lines by Y coordinate
    runs.sort((a, b) => b.y - a.y || a.x - b.x);
    interface PdfLine {
      y: number;
      fontSize: number;
      bold: boolean;
      italic: boolean;
      runs: PositionedPdfRun[];
      cells: { x: number; text: string }[];
      fullText: string;
    }

    const lines: PdfLine[] = [];
    for (const run of runs) {
      const tol = Math.max(3, run.fontSize * 0.45);
      const existing = lines.find((l) => Math.abs(l.y - run.y) <= tol);
      if (existing) {
        existing.runs.push(run);
        existing.fontSize = Math.max(existing.fontSize, run.fontSize);
        if (run.bold) existing.bold = true;
        if (run.italic) existing.italic = true;
      } else {
        lines.push({
          y: run.y,
          fontSize: run.fontSize,
          bold: run.bold,
          italic: run.italic,
          runs: [run],
          cells: [],
          fullText: '',
        });
      }
    }

    // Compute gaps inside each line to reconstruct words & table columns
    const fontSizeCounts = new Map<number, number>();
    for (const line of lines) {
      line.runs.sort((a, b) => a.x - b.x);
      let lineStr = '';
      let currentCellText = '';
      let currentCellX = line.runs[0]?.x ?? 0;
      const cells: { x: number; text: string }[] = [];

      let prevEndX = -Infinity;
      for (const r of line.runs) {
        const cleanStr = r.str;
        if (prevEndX > -Infinity) {
          const gap = r.x - prevEndX;
          if (gap > Math.max(15, r.fontSize * 1.4)) {
            if (currentCellText.trim()) {
              cells.push({ x: currentCellX, text: currentCellText.trim() });
            }
            currentCellText = cleanStr;
            currentCellX = r.x;
            lineStr += '   ' + cleanStr;
          } else if (gap > Math.max(1.8, r.fontSize * 0.16) && !lineStr.endsWith(' ') && !cleanStr.startsWith(' ')) {
            lineStr += ' ' + cleanStr;
            currentCellText += ' ' + cleanStr;
          } else {
            lineStr += cleanStr;
            currentCellText += cleanStr;
          }
        } else {
          lineStr = cleanStr;
          currentCellText = cleanStr;
          currentCellX = r.x;
        }
        prevEndX = r.x + r.width;
      }
      if (currentCellText.trim()) {
        cells.push({ x: currentCellX, text: currentCellText.trim() });
      }
      line.cells = cells;
      line.fullText = lineStr.replace(/\s+/g, ' ').trim();
      if (line.fullText) {
        fontSizeCounts.set(line.fontSize, (fontSizeCounts.get(line.fontSize) || 0) + line.fullText.length);
      }
    }

    let bodyFontSize = 11;
    let maxWeight = -1;
    fontSizeCounts.forEach((w, sz) => {
      if (w > maxWeight) {
        maxWeight = w;
        bodyFontSize = sz;
      }
    });

    let blocks: StructuredBlock[] = [];
    const tableRows: string[][] = [];
    let pageRawText = lines
      .map((l) => l.fullText)
      .filter(Boolean)
      .join('\n')
      .trim();

    let snapshotDataUrl: string | undefined;
    let usedOcr = false;

    const needsSnapshot = options?.captureSnapshots || (options?.autoOcrScanned && pageRawText.length < 25);
    if (needsSnapshot) {
      const renderScale = options?.autoOcrScanned && pageRawText.length < 25 ? 2.2 : 1.75;
      const vp = page.getViewport({ scale: renderScale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(vp.width);
      canvas.height = Math.round(vp.height);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise;
        snapshotDataUrl = canvas.toDataURL('image/jpeg', 0.92);

        if (options?.autoOcrScanned && pageRawText.length < 25) {
          const pre = await preprocessImageForOcr(canvas, {
            enhanceSharpness: true,
            upscale2x: false,
            adaptiveThreshold: true,
          });
          const ocrRes = await runOfflineOcr(
            pre.canvas,
            options.ocrLang || 'ben+eng',
            (pct) =>
              options?.onProgress?.(
                Math.round(((pNum - 1 + pct / 100) / Math.max(1, numPages)) * 100),
                `OCR scanned page ${pNum} / ${numPages}`
              )
          );
          if (ocrRes.text) {
            usedOcr = true;
            pageRawText = ocrRes.text;
            ocrConfidenceSum += ocrRes.confidence;
            ocrCount++;
            blocks = ocrRes.paragraphs.map((pText, idx) => ({
              kind: idx === 0 && pText.length < 85 ? 'heading' : 'paragraph',
              text: pText,
              bold: idx === 0 && pText.length < 85,
            }));
          }
        }
      }
    }

    if (!usedOcr) {
      // Group lines into headings, lists, tables, and merged paragraphs
      let idx = 0;
      while (idx < lines.length) {
        const line = lines[idx];
        if (!line.fullText) {
          idx++;
          continue;
        }

        // Check multi-line table block (2+ consecutive lines with >=2 columns)
        if (line.cells.length >= 2) {
          let lookahead = idx + 1;
          const groupLines: PdfLine[] = [line];
          while (
            lookahead < lines.length &&
            lines[lookahead].cells.length >= 2 &&
            Math.abs(lines[lookahead - 1].y - lines[lookahead].y) < bodyFontSize * 3.5
          ) {
            groupLines.push(lines[lookahead]);
            lookahead++;
          }
          if (groupLines.length >= 2) {
            // Cluster X anchors across groupLines to align columns accurately
            const xAnchors: number[] = [];
            for (const gl of groupLines) {
              for (const c of gl.cells) {
                if (!xAnchors.some((ax) => Math.abs(ax - c.x) < 28)) {
                  xAnchors.push(c.x);
                }
              }
            }
            xAnchors.sort((a, b) => a - b);
            const colCount = Math.max(2, xAnchors.length);
            const rows: string[][] = groupLines.map((gl) => {
              const row = new Array<string>(colCount).fill('');
              for (const c of gl.cells) {
                let bestCol = 0;
                let bestDist = Infinity;
                xAnchors.forEach((ax, ci) => {
                  const d = Math.abs(ax - c.x);
                  if (d < bestDist) {
                    bestDist = d;
                    bestCol = ci;
                  }
                });
                row[bestCol] = row[bestCol] ? `${row[bestCol]} ${c.text}` : c.text;
              }
              return row;
            });
            blocks.push({ kind: 'table', text: '', rows });
            rows.forEach((r) => tableRows.push(r));
            idx = lookahead;
            continue;
          }
        }

        // Heading detection
        const isHeading =
          (line.fontSize >= bodyFontSize * 1.2 || (line.bold && line.fullText.length < 90)) &&
          line.fullText.length < 130;

        if (isHeading) {
          blocks.push({
            kind: 'heading',
            text: line.fullText,
            fontSize: line.fontSize,
            bold: true,
          });
          idx++;
          continue;
        }

        // Bullet / numbered list item
        if (/^([•●▪◦\-*]|\d+[.)]|[০-৯]+[.)])\s+/.test(line.fullText)) {
          blocks.push({
            kind: 'list-item',
            text: line.fullText,
            fontSize: line.fontSize,
          });
          idx++;
          continue;
        }

        // Merge consecutive paragraph lines separated by small line spacing
        let paraText = line.fullText;
        let nextIdx = idx + 1;
        while (nextIdx < lines.length) {
          const next = lines[nextIdx];
          if (!next.fullText) break;
          const dy = Math.abs(lines[nextIdx - 1].y - next.y);
          const isNextHeading = next.fontSize >= bodyFontSize * 1.2 || (next.bold && next.fullText.length < 80);
          const isNextList = /^([•●▪◦\-*]|\d+[.)]|[০-৯]+[.)])\s+/.test(next.fullText);
          if (
            dy > bodyFontSize * 2.1 ||
            next.cells.length >= 2 ||
            isNextHeading ||
            isNextList
          ) {
            break;
          }
          paraText += ' ' + next.fullText;
          nextIdx++;
        }

        blocks.push({
          kind: 'paragraph',
          text: paraText,
          fontSize: line.fontSize,
          bold: line.bold,
          italic: line.italic,
        });
        idx = nextIdx;
      }
    }

    // Build fallback sheet rows from lines if no explicit multi-column table existed
    const sheetRows: string[][] =
      tableRows.length > 0
        ? tableRows
        : lines
            .filter((l) => l.fullText)
            .map((l) => (l.cells.length > 1 ? l.cells.map((c) => c.text) : [l.fullText]));

    sheets.push({
      name: `Page_${pNum}`,
      rows: sheetRows.length > 0 ? sheetRows : [['']],
    });

    // Build clean HTML for this page
    const pageHtmlNodes: string[] = [];
    if (numPages > 1) {
      pageHtmlNodes.push(
        `<div style="font-size:11px;color:#64748b;border-bottom:1px solid #e2e8f0;padding-bottom:4px;margin:16px 0 10px 0;">Page ${pNum}</div>`
      );
    }
    for (const blk of blocks) {
      if (blk.kind === 'heading') {
        pageHtmlNodes.push(`<h2>${escapeHtml(blk.text)}</h2>`);
      } else if (blk.kind === 'list-item') {
        pageHtmlNodes.push(`<p style="padding-left:14px;">${escapeHtml(blk.text)}</p>`);
      } else if (blk.kind === 'table' && blk.rows) {
        const tblHtml = blk.rows
          .map(
            (r, ri) =>
              `<tr>${r
                .map((cell) =>
                  ri === 0
                    ? `<th>${escapeHtml(cell)}</th>`
                    : `<td>${escapeHtml(cell)}</td>`
                )
                .join('')}</tr>`
          )
          .join('');
        pageHtmlNodes.push(`<table>${tblHtml}</table>`);
      } else {
        pageHtmlNodes.push(`<p>${escapeHtml(blk.text)}</p>`);
      }
    }
    if (blocks.length === 0 && snapshotDataUrl) {
      pageHtmlNodes.push(`<img src="${snapshotDataUrl}" alt="Page ${pNum}" style="max-width:100%;" />`);
    }

    htmlParts.push(`<div class="doc-page-block">${pageHtmlNodes.join('\n')}</div>`);
    if (pageRawText) textParts.push(pageRawText);

    pages.push({
      pageNumber: pNum,
      widthPt: viewport.width,
      heightPt: viewport.height,
      blocks,
      tableRows,
      rawText: pageRawText,
      snapshotDataUrl,
      usedOcr,
    });
  }

  options?.onProgress?.(100, 'Completed PDF analysis');

  return {
    sourceName: file.name,
    sourceKind: 'pdf',
    title: getBaseName(file.name),
    htmlContent: htmlParts.join('\n'),
    plainText: textParts.join('\n\n'),
    sheets,
    pages,
    detectedOcrConfidence: ocrCount > 0 ? Math.round(ocrConfidenceSum / ocrCount) : undefined,
  };
}

// ============================================================================
// OFFICE / TEXT / IMAGE FILE PARSING
// ============================================================================

function decodeRtfToHtmlAndText(rtf: string): { html: string; text: string } {
  let out = '';
  let i = 0;
  let skipGroupDepth = 0;
  let depth = 0;
  const skipDestinations = new Set([
    'fonttbl',
    'colortbl',
    'stylesheet',
    'info',
    'pict',
    'object',
    'header',
    'footer',
    'fldinst',
  ]);

  while (i < rtf.length) {
    const ch = rtf[i];
    if (ch === '{') {
      depth++;
      // Check if opening a metadata/font destination
      const look = rtf.slice(i + 1, i + 24);
      const destMatch = look.match(/^\\\*?\\([a-z]+)/i);
      if (destMatch && skipDestinations.has(destMatch[1].toLowerCase()) && skipGroupDepth === 0) {
        skipGroupDepth = depth;
      }
      i++;
      continue;
    }
    if (ch === '}') {
      if (skipGroupDepth === depth) skipGroupDepth = 0;
      depth = Math.max(0, depth - 1);
      i++;
      continue;
    }
    if (skipGroupDepth > 0) {
      i++;
      continue;
    }
    if (ch === '\r' || ch === '\n') {
      i++;
      continue;
    }
    if (ch === '\\') {
      const next = rtf[i + 1];
      if (next === '\\' || next === '{' || next === '}') {
        out += next;
        i += 2;
        continue;
      }
      if (next === "'") {
        const hex = rtf.slice(i + 2, i + 4);
        const code = parseInt(hex, 16);
        if (!Number.isNaN(code)) out += String.fromCharCode(code);
        i += 4;
        continue;
      }
      if (next === '~') {
        out += ' ';
        i += 2;
        continue;
      }
      const ctrlMatch = rtf.slice(i + 1).match(/^([a-z]+)(-?\d+)?[ ]?/i);
      if (ctrlMatch) {
        const word = ctrlMatch[1].toLowerCase();
        const param = ctrlMatch[2] ? parseInt(ctrlMatch[2], 10) : null;
        i += 1 + ctrlMatch[0].length;
        if (word === 'par' || word === 'line') {
          out += '\n';
        } else if (word === 'tab') {
          out += '\t';
        } else if (word === 'u' && param !== null) {
          const codePoint = param < 0 ? param + 65536 : param;
          out += String.fromCharCode(codePoint);
          // Skip fallback character immediately following \uN
          if (rtf[i] === '?') i++;
        }
        continue;
      }
      i += 2;
      continue;
    }
    out += ch;
    i++;
  }

  const cleanText = out.replace(/\n{3,}/g, '\n\n').trim();
  const html = cleanText
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`)
    .join('\n');
  return { html, text: cleanText };
}

function extractReadableTextFromLegacyDocBytes(bytes: Uint8Array): string {
  // Check if file is actually HTML/MHTML/RTF saved with .doc extension
  const head = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, 600));
  if (/^\s*\{\\rtf/i.test(head)) {
    const full = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    return decodeRtfToHtmlAndText(full).text;
  }
  if (/<html|<body|MIME-Version/i.test(head)) {
    const full = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    const parser = new DOMParser();
    const doc = parser.parseFromString(full, 'text/html');
    return (doc.body?.innerText || doc.body?.textContent || '').trim();
  }

  // Binary OLE2 .doc: extract UTF-16LE Unicode text runs (supports Bangla 0x0980-0x09FF + Latin)
  const chunks: string[] = [];
  let buf = '';
  for (let i = 0; i + 1 < bytes.length; i += 2) {
    const code = bytes[i] | (bytes[i + 1] << 8);
    const isPrintable =
      (code >= 0x0020 && code <= 0x007e) ||
      (code >= 0x0980 && code <= 0x09ff) ||
      code === 0x000a ||
      code === 0x000d ||
      code === 0x0009 ||
      code === 0x2013 ||
      code === 0x2014 ||
      code === 0x201c ||
      code === 0x201d;
    if (isPrintable) {
      buf += code === 0x000d ? '\n' : String.fromCharCode(code);
    } else {
      if (buf.trim().length >= 6 && !/^(Microsoft|Normal|Times New Roman|Root Entry|WordDocument)/.test(buf.trim())) {
        chunks.push(buf.trim());
      }
      buf = '';
    }
  }
  if (buf.trim().length >= 6) chunks.push(buf.trim());

  if (chunks.length > 0) {
    return chunks.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  // Fallback ASCII scan
  let asciiBuf = '';
  const asciiChunks: string[] = [];
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if ((b >= 32 && b <= 126) || b === 10 || b === 13 || b === 9) {
      asciiBuf += b === 13 ? '\n' : String.fromCharCode(b);
    } else {
      if (asciiBuf.trim().length >= 8) asciiChunks.push(asciiBuf.trim());
      asciiBuf = '';
    }
  }
  return asciiChunks.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

async function parsePptxToPayload(file: File): Promise<ExtractedDocumentPayload> {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  // Load media images into data URLs
  const mediaMap = new Map<string, string>();
  const mediaKeys = Object.keys(zip.files).filter((k) => k.startsWith('ppt/media/'));
  for (const key of mediaKeys) {
    const f = zip.file(key);
    if (!f) continue;
    const b64 = await f.async('base64');
    const ext = key.split('.').pop()?.toLowerCase() || 'png';
    const mime =
      ext === 'jpg' || ext === 'jpeg'
        ? 'image/jpeg'
        : ext === 'webp'
        ? 'image/webp'
        : ext === 'svg'
        ? 'image/svg+xml'
        : 'image/png';
    mediaMap.set(key.replace(/^ppt\//, ''), `data:${mime};base64,${b64}`);
  }

  const slideKeys = Object.keys(zip.files)
    .filter((k) => /^ppt\/slides\/slide\d+\.xml$/i.test(k))
    .sort((a, b) => {
      const na = parseInt(a.match(/slide(\d+)/i)?.[1] || '0', 10);
      const nb = parseInt(b.match(/slide(\d+)/i)?.[1] || '0', 10);
      return na - nb;
    });

  const slides: ExtractedSlide[] = [];
  const parser = new DOMParser();

  for (let idx = 0; idx < slideKeys.length; idx++) {
    const key = slideKeys[idx];
    const xmlStr = await zip.file(key)?.async('string');
    if (!xmlStr) continue;

    const xml = parser.parseFromString(xmlStr, 'application/xml');
    const texts: string[] = [];
    const tables: string[][][] = [];
    const imageUrls: string[] = [];

    // Resolve embedded images for this slide from _rels
    const slideName = key.split('/').pop() || '';
    const relsPath = `ppt/slides/_rels/${slideName}.rels`;
    const relsXmlStr = await zip.file(relsPath)?.async('string');
    if (relsXmlStr) {
      const relsDoc = parser.parseFromString(relsXmlStr, 'application/xml');
      const relNodes = Array.from(relsDoc.getElementsByTagName('Relationship'));
      for (const rel of relNodes) {
        const target = rel.getAttribute('Target') || '';
        const normTarget = target.replace(/^\.\.\//, '');
        if (mediaMap.has(normTarget)) {
          imageUrls.push(mediaMap.get(normTarget)!);
        }
      }
    }

    // Extract tables first (<a:tbl>)
    const tblNodes = Array.from(xml.getElementsByTagName('a:tbl'));
    for (const tbl of tblNodes) {
      const rows: string[][] = [];
      const trNodes = Array.from(tbl.getElementsByTagName('a:tr'));
      for (const tr of trNodes) {
        const row: string[] = [];
        const tcNodes = Array.from(tr.getElementsByTagName('a:tc'));
        for (const tc of tcNodes) {
          const tNodes = Array.from(tc.getElementsByTagName('a:t'));
          row.push(tNodes.map((n) => n.textContent || '').join('').trim());
        }
        rows.push(row);
      }
      if (rows.length > 0) tables.push(rows);
    }

    // Extract paragraph lines outside tables (or all <a:p> blocks)
    const pNodes = Array.from(xml.getElementsByTagName('a:p'));
    for (const p of pNodes) {
      // Skip paragraphs nested inside <a:tbl> so we don't duplicate table cells
      let parent: Node | null = p.parentNode;
      let inTable = false;
      while (parent) {
        if (parent.nodeName === 'a:tbl') {
          inTable = true;
          break;
        }
        parent = parent.parentNode;
      }
      if (inTable) continue;

      const runs = Array.from(p.getElementsByTagName('a:t'));
      const line = runs.map((r) => r.textContent || '').join('').trim();
      if (line) texts.push(line);
    }

    const title = texts[0] || `Slide ${idx + 1}`;
    slides.push({
      index: idx + 1,
      title,
      texts: texts.length > 1 ? texts.slice(1) : texts.length === 1 ? [] : [],
      tables,
      imageUrls,
    });
  }

  const htmlSlides = slides
    .map((s) => {
      const bodyTexts = s.texts.map((t) => `<p>• ${escapeHtml(t)}</p>`).join('');
      const tblHtml = s.tables
        .map(
          (tbl) =>
            `<table>${tbl
              .map(
                (r, ri) =>
                  `<tr>${r
                    .map((c) => (ri === 0 ? `<th>${escapeHtml(c)}</th>` : `<td>${escapeHtml(c)}</td>`))
                    .join('')}</tr>`
              )
              .join('')}</table>`
        )
        .join('');
      const imgsHtml = s.imageUrls
        .slice(0, 3)
        .map((src) => `<img src="${src}" alt="Slide ${s.index}" style="max-height:240px;object-fit:contain;margin-top:8px;" />`)
        .join('');
      return `
        <section data-pdf-slide="${s.index}" style="border:1px solid #cbd5e1;border-radius:8px;padding:24px;background:#ffffff;margin-bottom:16px;">
          <div style="font-size:11px;color:#64748b;margin-bottom:6px;">Slide ${s.index}</div>
          <h2 style="margin-top:0;color:#0f172a;">${escapeHtml(s.title)}</h2>
          ${bodyTexts}
          ${tblHtml}
          ${imgsHtml}
        </section>
      `;
    })
    .join('\n');

  const plainText = slides
    .map((s) => `[Slide ${s.index}] ${s.title}\n${s.texts.join('\n')}`)
    .join('\n\n');

  return {
    sourceName: file.name,
    sourceKind: 'pptx',
    title: getBaseName(file.name),
    htmlContent: htmlSlides || `<p>${escapeHtml(file.name)}</p>`,
    plainText,
    slides,
  };
}

function markdownToHtml(md: string): string {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const html: string[] = [];
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) continue;
    if (line.startsWith('### ')) {
      html.push(`<h3>${escapeHtml(line.slice(4))}</h3>`);
    } else if (line.startsWith('## ')) {
      html.push(`<h2>${escapeHtml(line.slice(3))}</h2>`);
    } else if (line.startsWith('# ')) {
      html.push(`<h1>${escapeHtml(line.slice(2))}</h1>`);
    } else if (/^[-*]\s+/.test(line)) {
      html.push(`<p>• ${escapeHtml(line.replace(/^[-*]\s+/, ''))}</p>`);
    } else {
      const formatted = escapeHtml(line)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>');
      html.push(`<p>${formatted}</p>`);
    }
  }
  return html.join('\n');
}

export async function parseInputFileToPayload(
  file: File,
  options?: {
    ocrOptions?: OcrOptions;
    autoOcrScannedPdf?: boolean;
    capturePdfSnapshots?: boolean;
    onProgress?: (pct: number, msg: string) => void;
  }
): Promise<ExtractedDocumentPayload> {
  const kind = detectSourceKind(file);

  if (kind === 'pdf') {
    return extractStructuredFromPdf(file, {
      autoOcrScanned: options?.autoOcrScannedPdf ?? true,
      ocrLang: options?.ocrOptions?.lang || 'ben+eng',
      captureSnapshots: options?.capturePdfSnapshots ?? false,
      onProgress: options?.onProgress,
    });
  }

  if (kind === 'image') {
    const ocrOpts = options?.ocrOptions || {
      lang: 'ben+eng',
      enhanceSharpness: true,
      upscale2x: true,
      adaptiveThreshold: true,
    };
    options?.onProgress?.(10, 'Enhancing image sharpness');
    const pre = await preprocessImageForOcr(file, ocrOpts);
    const ocrRes = await runOfflineOcr(pre.canvas, ocrOpts.lang, (pct, status) => {
      options?.onProgress?.(15 + Math.round(pct * 0.85), status);
    });
    const htmlContent =
      ocrRes.paragraphs.length > 0
        ? ocrRes.paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('\n')
        : `<p>${escapeHtml(ocrRes.text)}</p>`;
    return {
      sourceName: file.name,
      sourceKind: 'image',
      title: getBaseName(file.name),
      htmlContent,
      plainText: ocrRes.text,
      detectedOcrConfidence: ocrRes.confidence,
      enhancedPreviewUrl: pre.enhancedDataUrl,
      originalPreviewUrl: pre.originalDataUrl,
    };
  }

  if (kind === 'docx') {
    const arrayBuffer = await file.arrayBuffer();
    const mammothApi =
      typeof mammoth.convertToHtml === 'function'
        ? mammoth
        : ((mammoth as unknown as { default?: typeof mammoth }).default ?? mammoth);
    const htmlRes = await mammothApi.convertToHtml({ arrayBuffer });
    const textRes = await mammothApi.extractRawText({ arrayBuffer });
    return {
      sourceName: file.name,
      sourceKind: 'docx',
      title: getBaseName(file.name),
      htmlContent: htmlRes.value || `<p>${escapeHtml(textRes.value)}</p>`,
      plainText: textRes.value.trim(),
    };
  }

  if (kind === 'doc') {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const text = extractReadableTextFromLegacyDocBytes(bytes);
    const head = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, 600));
    let htmlContent = '';
    if (/<html|<body/i.test(head)) {
      const full = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
      const parsed = new DOMParser().parseFromString(full, 'text/html');
      parsed.querySelectorAll('script, style').forEach((el) => el.remove());
      htmlContent = parsed.body?.innerHTML || '';
    }
    if (!htmlContent) {
      htmlContent = text
        .split(/\n{2,}/)
        .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`)
        .join('\n');
    }
    return {
      sourceName: file.name,
      sourceKind: 'doc',
      title: getBaseName(file.name),
      htmlContent,
      plainText: text,
    };
  }

  if (kind === 'xlsx' || kind === 'xls' || kind === 'csv' || kind === 'ods') {
    let workbook: XLSX.WorkBook;
    if (kind === 'csv') {
      const csvText = await file.text();
      workbook = XLSX.read(csvText, { type: 'string', raw: false });
    } else {
      const buf = await file.arrayBuffer();
      workbook = XLSX.read(buf, { type: 'array', codepage: 65001 });
    }

    const sheets: ExtractedSheet[] = [];
    const htmlSheets: string[] = [];
    const textSheets: string[] = [];

    for (const sheetName of workbook.SheetNames) {
      const ws = workbook.Sheets[sheetName];
      const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, {
        header: 1,
        defval: '',
        blankrows: false,
      });
      const rows = aoa.map((r) => (Array.isArray(r) ? r.map((c) => String(c ?? '')) : [String(r ?? '')]));
      sheets.push({ name: sheetName, rows });

      const tblRows = rows
        .map(
          (r, ri) =>
            `<tr>${r
              .map((cell) => (ri === 0 ? `<th>${escapeHtml(cell)}</th>` : `<td>${escapeHtml(cell)}</td>`))
              .join('')}</tr>`
        )
        .join('');
      htmlSheets.push(
        `<div class="doc-page-block"><h3>${escapeHtml(sheetName)}</h3><table>${tblRows}</table></div>`
      );
      textSheets.push(`[${sheetName}]\n` + rows.map((r) => r.join('\t')).join('\n'));
    }

    return {
      sourceName: file.name,
      sourceKind: kind,
      title: getBaseName(file.name),
      htmlContent: htmlSheets.join('\n'),
      plainText: textSheets.join('\n\n'),
      sheets,
    };
  }

  if (kind === 'pptx') {
    return parsePptxToPayload(file);
  }

  if (kind === 'rtf') {
    const raw = await file.text();
    const { html, text } = decodeRtfToHtmlAndText(raw);
    return {
      sourceName: file.name,
      sourceKind: 'rtf',
      title: getBaseName(file.name),
      htmlContent: html,
      plainText: text,
    };
  }

  if (kind === 'html') {
    const raw = await file.text();
    const parsed = new DOMParser().parseFromString(raw, 'text/html');
    parsed.querySelectorAll('script').forEach((el) => el.remove());
    return {
      sourceName: file.name,
      sourceKind: 'html',
      title: parsed.title || getBaseName(file.name),
      htmlContent: parsed.body?.innerHTML || `<p>${escapeHtml(raw)}</p>`,
      plainText: (parsed.body?.innerText || parsed.body?.textContent || '').trim(),
    };
  }

  // MD or TXT
  const text = await file.text();
  const htmlContent =
    kind === 'md'
      ? markdownToHtml(text)
      : text
          .replace(/\r\n/g, '\n')
          .split(/\n{2,}/)
          .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`)
          .join('\n');
  return {
    sourceName: file.name,
    sourceKind: kind,
    title: getBaseName(file.name),
    htmlContent,
    plainText: text.trim(),
  };
}

// ============================================================================
// EXPORTERS: DOCX, DOC, PPTX, XLSX, CSV, RTF, HTML, TXT, & ZERO-BROKEN-FONT PDF
// ============================================================================

export async function exportPayloadToDocx(payload: ExtractedDocumentPayload): Promise<Blob> {
  const children: (Paragraph | Table)[] = [];

  if (payload.pages && payload.pages.length > 0) {
    payload.pages.forEach((pg, pageIdx) => {
      if (pageIdx > 0) {
        children.push(new Paragraph({ children: [new PageBreak()] }));
      }
      if (pg.blocks.length === 0 && pg.snapshotDataUrl) {
        const { bytes, ext } = dataUrlToUint8Array(pg.snapshotDataUrl);
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new ImageRun({
                data: bytes,
                type: ext,
                transformation: { width: 560, height: Math.round((560 * pg.heightPt) / Math.max(1, pg.widthPt)) },
              }),
            ],
          })
        );
        return;
      }

      for (const blk of pg.blocks) {
        if (blk.kind === 'heading') {
          children.push(
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 160, after: 80 },
              children: [
                new TextRun({
                  text: blk.text,
                  bold: true,
                  size: 26,
                  font: 'Nirmala UI',
                }),
              ],
            })
          );
        } else if (blk.kind === 'table' && blk.rows && blk.rows.length > 0) {
          const tableRows = blk.rows.map(
            (r, ri) =>
              new TableRow({
                children: r.map(
                  (cellText) =>
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: cellText,
                              bold: ri === 0,
                              size: 21,
                              font: 'Nirmala UI',
                            }),
                          ],
                        }),
                      ],
                    })
                ),
              })
          );
          children.push(
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
                bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
                left: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
                right: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
                insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
                insideVertical: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
              },
              rows: tableRows,
            })
          );
          children.push(new Paragraph({ text: '' }));
        } else {
          children.push(
            new Paragraph({
              spacing: { after: 110 },
              children: [
                new TextRun({
                  text: blk.text,
                  bold: Boolean(blk.bold),
                  italics: Boolean(blk.italic),
                  size: 22,
                  font: 'Nirmala UI',
                }),
              ],
            })
          );
        }
      }
    });
  } else if (payload.sheets && payload.sheets.length > 0) {
    payload.sheets.forEach((sheet, sIdx) => {
      if (sIdx > 0) children.push(new Paragraph({ children: [new PageBreak()] }));
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: sheet.name, bold: true, font: 'Nirmala UI', size: 26 })],
        })
      );
      if (sheet.rows.length > 0) {
        const rows = sheet.rows.map(
          (r, ri) =>
            new TableRow({
              children: r.map(
                (cell) =>
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: cell,
                            bold: ri === 0,
                            font: 'Nirmala UI',
                            size: 20,
                          }),
                        ],
                      }),
                    ],
                  })
              ),
            })
        );
        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows,
          })
        );
      }
    });
  } else {
    // Parse HTML/plainText paragraphs cleanly
    const parser = new DOMParser();
    const docDom = parser.parseFromString(payload.htmlContent || '', 'text/html');
    const blocks = Array.from(docDom.body.querySelectorAll('h1,h2,h3,h4,p,li,table'));
    if (blocks.length > 0) {
      for (const el of blocks) {
        const tag = el.tagName.toLowerCase();
        if (tag === 'table') {
          const trs = Array.from(el.querySelectorAll('tr'));
          if (trs.length > 0) {
            children.push(
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: trs.map(
                  (tr, ri) =>
                    new TableRow({
                      children: Array.from(tr.querySelectorAll('th,td')).map(
                        (td) =>
                          new TableCell({
                            children: [
                              new Paragraph({
                                children: [
                                  new TextRun({
                                    text: td.textContent?.trim() || '',
                                    bold: ri === 0 || td.tagName.toLowerCase() === 'th',
                                    font: 'Nirmala UI',
                                    size: 20,
                                  }),
                                ],
                              }),
                            ],
                          })
                      ),
                    })
                ),
              })
            );
          }
        } else {
          const txt = el.textContent?.trim();
          if (!txt) continue;
          const isH = tag.startsWith('h');
          children.push(
            new Paragraph({
              heading: isH ? HeadingLevel.HEADING_2 : undefined,
              spacing: { after: 110 },
              children: [
                new TextRun({
                  text: txt,
                  bold: isH,
                  size: isH ? 26 : 22,
                  font: 'Nirmala UI',
                }),
              ],
            })
          );
        }
      }
    }

    if (children.length === 0) {
      const paras = (payload.plainText || '').split(/\n{2,}/).filter((p) => p.trim());
      for (const p of paras) {
        children.push(
          new Paragraph({
            spacing: { after: 110 },
            children: [new TextRun({ text: p.trim(), size: 22, font: 'Nirmala UI' })],
          })
        );
      }
    }
  }

  if (children.length === 0) {
    children.push(new Paragraph({ children: [new TextRun({ text: payload.plainText || ' ' })] }));
  }

  const doc = new Document({
    sections: [{ properties: {}, children }],
  });
  return Packer.toBlob(doc);
}

export function exportPayloadToDoc(payload: ExtractedDocumentPayload): Blob {
  const htmlBody =
    payload.htmlContent ||
    (payload.plainText || '')
      .split(/\n{2,}/)
      .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`)
      .join('\n');

  const docHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
xmlns:w="urn:schemas-microsoft-com:office:word"
xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(payload.title)}</title>
<style>
  @page { size: A4; margin: 20mm; }
  body {
    font-family: 'SolaimanLipi', 'Nirmala UI', 'Noto Sans Bengali', 'Calibri', sans-serif;
    font-size: 12pt;
    line-height: 1.6;
    color: #111827;
  }
  h1, h2, h3 { color: #0f172a; margin: 12pt 0 6pt 0; }
  p { margin: 0 0 8pt 0; }
  table { border-collapse: collapse; width: 100%; margin: 8pt 0; }
  th, td { border: 1px solid #94a3b8; padding: 5pt 7pt; text-align: left; }
  th { background: #f1f5f9; font-weight: bold; }
</style>
</head>
<body>
${htmlBody}
</body>
</html>`;

  return new Blob(['\uFEFF', docHtml], { type: 'application/msword;charset=utf-8' });
}

export async function exportPayloadToPptx(
  payload: ExtractedDocumentPayload,
  mode: PptxMode = 'editable'
): Promise<Blob> {
  const PptxCtor =
    typeof PptxGenJS === 'function'
      ? PptxGenJS
      : ((PptxGenJS as unknown as { default?: typeof PptxGenJS }).default ?? PptxGenJS);
  const pptx = new PptxCtor();
  pptx.layout = 'LAYOUT_WIDE';

  if (payload.pages && payload.pages.length > 0) {
    for (const pg of payload.pages) {
      const slide = pptx.addSlide();

      if (mode === 'hybrid' && pg.snapshotDataUrl) {
        slide.addImage({
          data: pg.snapshotDataUrl,
          x: 0.4,
          y: 0.25,
          w: 12.53,
          h: 7.0,
          sizing: { type: 'contain', w: 12.53, h: 7.0 },
        });
        if (pg.rawText) {
          slide.addNotes(pg.rawText);
        }
        continue;
      }

      const heading = pg.blocks.find((b) => b.kind === 'heading')?.text || `${payload.title} — Page ${pg.pageNumber}`;
      slide.addText(heading, {
        x: 0.6,
        y: 0.4,
        w: 12.1,
        h: 0.75,
        fontSize: 22,
        bold: true,
        color: '0F172A',
        fontFace: 'Nirmala UI',
      });

      let cursorY = 1.25;
      const bodyBlocks = pg.blocks.filter((b) => b.text !== heading);
      for (const blk of bodyBlocks) {
        if (cursorY > 6.7) break;
        if (blk.kind === 'table' && blk.rows && blk.rows.length > 0) {
          const tableData = blk.rows.slice(0, 12).map((row, ri) =>
            row.map((cell) => ({
              text: cell,
              options: {
                bold: ri === 0,
                fill: { color: ri === 0 ? 'E2E8F0' : 'FFFFFF' },
                color: '0F172A',
                fontFace: 'Nirmala UI',
                fontSize: 11,
              },
            }))
          );
          slide.addTable(tableData, {
            x: 0.6,
            y: cursorY,
            w: 12.1,
            border: { type: 'solid', pt: 1, color: 'CBD5E1' },
          });
          cursorY += Math.min(3.4, blk.rows.length * 0.38 + 0.3);
        } else if (blk.text.trim()) {
          const linesEst = Math.max(1, Math.ceil(blk.text.length / 95));
          const boxH = Math.min(2.2, linesEst * 0.32 + 0.15);
          slide.addText(blk.text, {
            x: 0.6,
            y: cursorY,
            w: 12.1,
            h: boxH,
            fontSize: 14,
            color: '334155',
            fontFace: 'Nirmala UI',
            wrap: true,
            valign: 'top',
          });
          cursorY += boxH + 0.12;
        }
      }

      if (bodyBlocks.length === 0 && pg.snapshotDataUrl) {
        slide.addImage({
          data: pg.snapshotDataUrl,
          x: 0.6,
          y: 1.25,
          w: 12.1,
          h: 5.9,
          sizing: { type: 'contain', w: 12.1, h: 5.9 },
        });
      }
    }
  } else if (payload.slides && payload.slides.length > 0) {
    for (const s of payload.slides) {
      const slide = pptx.addSlide();
      slide.addText(s.title, {
        x: 0.6,
        y: 0.4,
        w: 12.1,
        h: 0.75,
        fontSize: 22,
        bold: true,
        color: '0F172A',
        fontFace: 'Nirmala UI',
      });
      if (s.texts.length > 0) {
        slide.addText(s.texts.map((t) => `• ${t}`).join('\n'), {
          x: 0.6,
          y: 1.3,
          w: 12.1,
          h: 5.5,
          fontSize: 15,
          color: '1E293B',
          fontFace: 'Nirmala UI',
          valign: 'top',
        });
      }
    }
  } else {
    const chunks = (payload.plainText || '')
      .split(/\n{2,}/)
      .map((c) => c.trim())
      .filter(Boolean);
    const perSlide = 5;
    for (let i = 0; i < Math.max(1, chunks.length); i += perSlide) {
      const slide = pptx.addSlide();
      const slice = chunks.slice(i, i + perSlide);
      slide.addText(`${payload.title} (${Math.floor(i / perSlide) + 1})`, {
        x: 0.6,
        y: 0.4,
        w: 12.1,
        h: 0.7,
        fontSize: 22,
        bold: true,
        color: '0F172A',
        fontFace: 'Nirmala UI',
      });
      slide.addText(slice.join('\n\n'), {
        x: 0.6,
        y: 1.25,
        w: 12.1,
        h: 5.7,
        fontSize: 14,
        color: '1E293B',
        fontFace: 'Nirmala UI',
        valign: 'top',
      });
    }
  }

  const out = await pptx.write({ outputType: 'blob' });
  return out as Blob;
}

export function exportPayloadToXlsx(payload: ExtractedDocumentPayload): Blob {
  const wb = XLSX.utils.book_new();
  const sheetsToWrite: ExtractedSheet[] =
    payload.sheets && payload.sheets.length > 0
      ? payload.sheets
      : [
          {
            name: 'Sheet1',
            rows: (payload.plainText || '')
              .split('\n')
              .filter((l) => l.trim())
              .map((l) => l.split(/\t|\s{3,}/).map((c) => c.trim())),
          },
        ];

  sheetsToWrite.forEach((sh, idx) => {
    const safeRows = sh.rows.length > 0 ? sh.rows : [['']];
    const ws = XLSX.utils.aoa_to_sheet(safeRows);
    const colWidths: number[] = [];
    for (const row of safeRows) {
      row.forEach((val, ci) => {
        colWidths[ci] = Math.min(55, Math.max(colWidths[ci] || 10, String(val).length + 3));
      });
    }
    ws['!cols'] = colWidths.map((wch) => ({ wch }));
    const sheetName = (sh.name || `Sheet_${idx + 1}`).replace(/[\\/?*[\]:]/g, '').slice(0, 31) || `Sheet_${idx + 1}`;
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  const outBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([outBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

export function exportPayloadToCsv(payload: ExtractedDocumentPayload): Blob {
  const rows: string[][] =
    payload.sheets && payload.sheets.length > 0
      ? payload.sheets.flatMap((sh) => sh.rows)
      : (payload.plainText || '')
          .split('\n')
          .filter((l) => l.trim())
          .map((l) => l.split(/\t|\s{3,}/));

  const csvText = rows
    .map((r) =>
      r
        .map((cell) => {
          const s = String(cell ?? '');
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(',')
    )
    .join('\r\n');

  return new Blob(['\uFEFF', csvText], { type: 'text/csv;charset=utf-8' });
}

export function exportPayloadToRtf(payload: ExtractedDocumentPayload): Blob {
  const encodeUnicodeRtf = (str: string): string => {
    let res = '';
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      if (str[i] === '\\' || str[i] === '{' || str[i] === '}') {
        res += '\\' + str[i];
      } else if (str[i] === '\n') {
        res += '\\par\n';
      } else if (str[i] === '\t') {
        res += '\\tab ';
      } else if (code > 127) {
        const signed = code > 32767 ? code - 65536 : code;
        res += `\\u${signed}?`;
      } else {
        res += str[i];
      }
    }
    return res;
  };

  const rtf = `{\\rtf1\\ansi\\ansicpg65001\\deff0{\\fonttbl{\\f0 Nirmala UI;}{\\f1 SolaimanLipi;}}\\fs24\n${encodeUnicodeRtf(
    payload.plainText || ''
  )}\n}`;
  return new Blob([rtf], { type: 'application/rtf;charset=utf-8' });
}

export function exportPayloadToHtml(payload: ExtractedDocumentPayload): Blob {
  const html = `<!doctype html>
<html lang="bn">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(payload.title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700&family=Plus+Jakarta+Sans:wght@400;600;700&display=swap" rel="stylesheet" />
<style>
  body { font-family: 'SolaimanLipi', 'Noto Sans Bengali', 'Plus Jakarta Sans', sans-serif; max-width: 820px; margin: 32px auto; padding: 0 20px; line-height: 1.65; color: #0f172a; }
  h1, h2, h3 { color: #0f172a; }
  table { border-collapse: collapse; width: 100%; margin: 14px 0; }
  th, td { border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; }
  th { background: #f1f5f9; }
</style>
</head>
<body>
${payload.htmlContent || `<p>${escapeHtml(payload.plainText)}</p>`}
</body>
</html>`;
  return new Blob([html], { type: 'text/html;charset=utf-8' });
}

export function exportPayloadToTxt(payload: ExtractedDocumentPayload): Blob {
  return new Blob(['\uFEFF', payload.plainText || ''], { type: 'text/plain;charset=utf-8' });
}

/**
 * Renders HTML / Office / OCR payload using real browser Unicode font shaping
 * (SolaimanLipi / Noto Sans Bengali / Plus Jakarta Sans), splits cleanly without slicing text mid-line,
 * and compiles into an exact A4 / Letter / Legal PDF.
 */
export async function exportPayloadToPdf(
  payload: ExtractedDocumentPayload,
  pdfOptions: PdfRenderOptions,
  onProgress?: (pct: number, msg: string) => void
): Promise<Blob> {
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }

  const { widthMm, heightMm } = getPaperDimensionsMm(
    pdfOptions.pageSize,
    pdfOptions.orientation
  );
  const pxPerMm = 96 / 25.4;
  const pageWpx = Math.round(widthMm * pxPerMm);
  const pageHpx = Math.round(heightMm * pxPerMm);
  const padPx = Math.round(pdfOptions.marginMm * pxPerMm);
  const contentMaxH = pageHpx - padPx * 2;
  const fontStack = `${getBanglaFontStack(pdfOptions.banglaFont || DEFAULT_BANGLA_FONT)}, 'Plus Jakarta Sans', sans-serif`;

  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-99999px';
  host.style.top = '0';
  host.style.width = `${pageWpx}px`;
  host.style.background = '#ffffff';
  host.style.color = '#0f172a';
  host.style.pointerEvents = 'none';
  host.style.zIndex = '-1';

  const baseStyle = `
    .conv-pdf-root {
      font-family: ${fontStack};
      font-size: ${pdfOptions.fontSizePx}px;
      line-height: 1.62;
      color: #0f172a;
      background: #ffffff;
      box-sizing: border-box;
    }
    .conv-pdf-root h1 { font-size: ${Math.round(pdfOptions.fontSizePx * 1.55)}px; font-weight: 700; margin: 0 0 10px 0; }
    .conv-pdf-root h2 { font-size: ${Math.round(pdfOptions.fontSizePx * 1.3)}px; font-weight: 700; margin: 12px 0 6px 0; }
    .conv-pdf-root h3 { font-size: ${Math.round(pdfOptions.fontSizePx * 1.15)}px; font-weight: 700; margin: 10px 0 6px 0; }
    .conv-pdf-root p { margin: 0 0 8px 0; word-break: break-word; }
    .conv-pdf-root ul, .conv-pdf-root ol { margin: 0 0 8px 20px; padding: 0; }
    .conv-pdf-root li { margin-bottom: 4px; }
    .conv-pdf-root table { border-collapse: collapse; width: 100%; margin: 8px 0 12px 0; font-size: ${Math.max(10, pdfOptions.fontSizePx - 1)}px; }
    .conv-pdf-root th, .conv-pdf-root td { border: 1px solid #cbd5e1; padding: 5px 7px; text-align: left; vertical-align: top; }
    .conv-pdf-root th { background: #f1f5f9; font-weight: 700; }
    .conv-pdf-root img { max-width: 100%; height: auto; }
  `;

  host.innerHTML = `<style>${baseStyle}</style><div class="conv-pdf-root">${
    payload.htmlContent || `<p>${escapeHtml(payload.plainText)}</p>`
  }</div>`;
  document.body.appendChild(host);

  try {
    // Wait for any embedded images inside the document to finish decoding
    const imgs = Array.from(host.querySelectorAll('img'));
    await Promise.all(
      imgs.map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>((res) => {
              img.onload = () => res();
              img.onerror = () => res();
            })
      )
    );

    const pdf = new jsPDF({
      orientation: pdfOptions.orientation,
      unit: 'mm',
      format: [widthMm, heightMm],
      compress: true,
    });

    const slideNodes = Array.from(host.querySelectorAll('[data-pdf-slide]')) as HTMLElement[];

    if (slideNodes.length > 0) {
      // PPTX slides: 1 slide per exact PDF page
      for (let i = 0; i < slideNodes.length; i++) {
        onProgress?.(Math.round(((i + 1) / slideNodes.length) * 100), `Rendering slide ${i + 1}`);
        const pageBox = document.createElement('div');
        pageBox.className = 'conv-pdf-root';
        pageBox.style.width = `${pageWpx}px`;
        pageBox.style.minHeight = `${pageHpx}px`;
        pageBox.style.padding = `${padPx}px`;
        pageBox.style.background = '#ffffff';
        pageBox.appendChild(slideNodes[i].cloneNode(true));
        host.appendChild(pageBox);

        const dataUrl = await toJpeg(pageBox, {
          quality: 0.95,
          pixelRatio: 2.2,
          backgroundColor: '#ffffff',
          cacheBust: true,
        });
        host.removeChild(pageBox);

        if (i > 0) pdf.addPage([widthMm, heightMm], pdfOptions.orientation);
        pdf.addImage(dataUrl, 'JPEG', 0, 0, widthMm, heightMm, undefined, 'FAST');
      }
      return pdf.output('blob');
    }

    // Measure block-level children to build clean non-sliced pages
    const rootEl = host.querySelector('.conv-pdf-root') as HTMLElement;
    rootEl.style.padding = `${padPx}px`;
    const measureNodes: HTMLElement[] = [];

    const collectBlocks = (parent: HTMLElement) => {
      const children = Array.from(parent.children) as HTMLElement[];
      for (const ch of children) {
        const h = ch.getBoundingClientRect().height;
        if (ch.classList.contains('doc-page-block') && h > contentMaxH) {
          collectBlocks(ch);
        } else if (ch.tagName.toLowerCase() === 'table' && h > contentMaxH) {
          // Split oversized spreadsheet/document tables cleanly by rows with repeating header
          const thead = ch.querySelector('thead');
          const allTr = Array.from(ch.querySelectorAll('tr'));
          const headerTr = allTr[0]?.cloneNode(true) as HTMLElement | undefined;
          let chunkTbl = document.createElement('table');
          if (thead) chunkTbl.appendChild(thead.cloneNode(true));
          else if (headerTr) chunkTbl.appendChild(headerTr.cloneNode(true));

          for (let r = thead ? 0 : 1; r < allTr.length; r++) {
            chunkTbl.appendChild(allTr[r].cloneNode(true));
            if (r % 18 === 0 || r === allTr.length - 1) {
              measureNodes.push(chunkTbl);
              if (r < allTr.length - 1) {
                chunkTbl = document.createElement('table');
                if (headerTr) chunkTbl.appendChild(headerTr.cloneNode(true));
              }
            }
          }
        } else {
          measureNodes.push(ch);
        }
      }
    };
    collectBlocks(rootEl);

    // Pack measured blocks into physical PDF page boxes
    const pageBuckets: HTMLElement[][] = [[]];
    let currentUsedH = 0;

    for (const node of measureNodes) {
      const tempBox = document.createElement('div');
      tempBox.className = 'conv-pdf-root';
      tempBox.style.width = `${pageWpx - padPx * 2}px`;
      tempBox.appendChild(node.cloneNode(true));
      host.appendChild(tempBox);
      const nodeH = Math.ceil(tempBox.getBoundingClientRect().height);
      host.removeChild(tempBox);

      if (pageBuckets[pageBuckets.length - 1].length > 0 && currentUsedH + nodeH > contentMaxH) {
        pageBuckets.push([]);
        currentUsedH = 0;
      }
      pageBuckets[pageBuckets.length - 1].push(node);
      currentUsedH += nodeH + 4;
    }

    for (let i = 0; i < pageBuckets.length; i++) {
      onProgress?.(
        Math.round(((i + 1) / pageBuckets.length) * 100),
        `Rendering PDF page ${i + 1} / ${pageBuckets.length}`
      );
      const pageBox = document.createElement('div');
      pageBox.className = 'conv-pdf-root';
      pageBox.style.width = `${pageWpx}px`;
      pageBox.style.minHeight = `${pageHpx}px`;
      pageBox.style.padding = `${padPx}px`;
      pageBox.style.background = '#ffffff';

      for (const n of pageBuckets[i]) {
        pageBox.appendChild(n.cloneNode(true));
      }
      host.appendChild(pageBox);

      const dataUrl = await toJpeg(pageBox, {
        quality: 0.95,
        pixelRatio: 2.2,
        backgroundColor: '#ffffff',
        cacheBust: true,
      });

      const renderedImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const im = new Image();
        im.onload = () => resolve(im);
        im.onerror = reject;
        im.src = dataUrl;
      });
      host.removeChild(pageBox);

      const imgPxPerMm = renderedImg.naturalWidth / widthMm;
      const totalImm = renderedImg.naturalHeight / imgPxPerMm;

      if (totalImm <= heightMm + 2) {
        if (i > 0) pdf.addPage([widthMm, heightMm], pdfOptions.orientation);
        pdf.addImage(dataUrl, 'JPEG', 0, 0, widthMm, Math.min(heightMm, totalImm), undefined, 'FAST');
      } else {
        // Slice safely if a single giant block exceeded one page
        const slicePx = Math.floor(heightMm * imgPxPerMm);
        const subCount = Math.ceil(renderedImg.naturalHeight / slicePx);
        for (let s = 0; s < subCount; s++) {
          if (i > 0 || s > 0) pdf.addPage([widthMm, heightMm], pdfOptions.orientation);
          const sy = s * slicePx;
          const sh = Math.min(slicePx, renderedImg.naturalHeight - sy);
          const sc = document.createElement('canvas');
          sc.width = renderedImg.naturalWidth;
          sc.height = sh;
          const sctx = sc.getContext('2d');
          if (sctx) {
            sctx.fillStyle = '#ffffff';
            sctx.fillRect(0, 0, sc.width, sc.height);
            sctx.drawImage(renderedImg, 0, sy, sc.width, sh, 0, 0, sc.width, sh);
            pdf.addImage(
              sc.toDataURL('image/jpeg', 0.95),
              'JPEG',
              0,
              0,
              widthMm,
              sh / imgPxPerMm,
              undefined,
              'FAST'
            );
          }
        }
      }
    }

    return pdf.output('blob');
  } finally {
    if (host.parentNode) {
      host.parentNode.removeChild(host);
    }
  }
}

// ============================================================================
// UNIFIED CONVERSION DISPATCHER
// ============================================================================

export async function convertPayloadToFormat(
  payload: ExtractedDocumentPayload,
  targetFormat: OutputFormat,
  options: {
    pdfOptions: PdfRenderOptions;
    pptxMode: PptxMode;
    onProgress?: (pct: number, msg: string) => void;
  }
): Promise<{ blob: Blob; filename: string; mime: string }> {
  const base = getBaseName(payload.sourceName);

  switch (targetFormat) {
    case 'docx':
      return {
        blob: await exportPayloadToDocx(payload),
        filename: `${base}.docx`,
        mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };
    case 'doc':
      return {
        blob: exportPayloadToDoc(payload),
        filename: `${base}.doc`,
        mime: 'application/msword',
      };
    case 'pptx':
      return {
        blob: await exportPayloadToPptx(payload, options.pptxMode),
        filename: `${base}.pptx`,
        mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      };
    case 'xlsx':
      return {
        blob: exportPayloadToXlsx(payload),
        filename: `${base}.xlsx`,
        mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
    case 'csv':
      return {
        blob: exportPayloadToCsv(payload),
        filename: `${base}.csv`,
        mime: 'text/csv',
      };
    case 'rtf':
      return {
        blob: exportPayloadToRtf(payload),
        filename: `${base}.rtf`,
        mime: 'application/rtf',
      };
    case 'html':
      return {
        blob: exportPayloadToHtml(payload),
        filename: `${base}.html`,
        mime: 'text/html',
      };
    case 'txt':
      return {
        blob: exportPayloadToTxt(payload),
        filename: `${base}.txt`,
        mime: 'text/plain',
      };
    case 'pdf':
      return {
        blob: await exportPayloadToPdf(payload, options.pdfOptions, options.onProgress),
        filename: `${base}.pdf`,
        mime: 'application/pdf',
      };
  }
}
