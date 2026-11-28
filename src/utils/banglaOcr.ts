import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  ExtractedDocumentPayload,
  OcrLangMode,
  StructuredBlock,
  StructuredPage,
  exportPayloadToDoc,
  exportPayloadToDocx,
  exportPayloadToHtml,
  exportPayloadToPdf,
  exportPayloadToTxt,
  PdfRenderOptions,
  preprocessImageForOcr,
  runOfflineOcr,
} from './documentConverter';
import { getBaseName, loadImageFromFile } from './toolsEngine';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export type BanglaOcrPresetId =
  | 'all-ocr'
  | 'image-to-text'
  | 'photo-to-text'
  | 'handwriting'
  | 'pdf-to-text'
  | 'pdf-to-word'
  | 'mixed-bn-en'
  | 'form-ocr'
  | 'export-suite';

export type OcrEnginePreference = 'auto-hybrid' | 'offline-local' | 'online-ai';
export type BanglaOcrExportFormat = 'docx' | 'doc' | 'pdf' | 'json' | 'txt' | 'html';

export interface BanglaFormField {
  id: string;
  label: string;
  value: string;
}

export interface BanglaOcrPageResult {
  pageNumber: number;
  text: string;
  paragraphs: string[];
  engineUsed: 'online-ai' | 'offline-ocr' | 'pdf-text';
  confidence?: number;
  originalPreviewUrl?: string;
  enhancedPreviewUrl?: string;
  formFields: BanglaFormField[];
  widthPt?: number;
  heightPt?: number;
}

export interface BanglaOcrDocumentResult {
  id: string;
  sourceName: string;
  sourceKind: 'image' | 'pdf';
  presetUsed: BanglaOcrPresetId;
  engineUsed: 'online-ai' | 'offline-ocr' | 'mixed';
  detectedScript: string;
  fullText: string;
  pages: BanglaOcrPageResult[];
  formFields: BanglaFormField[];
  banglaCharCount: number;
  englishCharCount: number;
  banglaNumeralCount: number;
  englishNumeralCount: number;
  avgConfidence?: number;
  fallbackNotice?: string;
}

export interface BanglaOcrRunOptions {
  preset: BanglaOcrPresetId;
  enginePreference: OcrEnginePreference;
  langMode: OcrLangMode;
  enhanceSharpness: boolean;
  upscale2x: boolean;
  adaptiveThreshold: boolean;
  pdfPageRange: string;
  pdfDpiScale: number;
  preferDigitalPdfText: boolean;
}

export async function checkBanglaOcrServerAvailability(): Promise<{
  browserOnline: boolean;
  geminiConfigured: boolean;
}> {
  const browserOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  if (!browserOnline) {
    return { browserOnline: false, geminiConfigured: false };
  }
  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 3500);
    const resp = await fetch('/api/health', { signal: controller.signal });
    window.clearTimeout(timer);
    if (!resp.ok) {
      return { browserOnline: true, geminiConfigured: false };
    }
    const data = (await resp.json()) as { geminiConfigured?: boolean };
    return {
      browserOnline: true,
      geminiConfigured: Boolean(data.geminiConfigured),
    };
  } catch {
    return { browserOnline, geminiConfigured: false };
  }
}

export async function getPdfPageCountForOcr(file: File): Promise<number> {
  const bytes = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
  return pdf.numPages;
}

export function parsePageRangeSelection(spec: string, totalPages: number): number[] {
  const clean = spec.trim().toLowerCase();
  if (!clean || clean === 'all') {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const selected = new Set<number>();
  const parts = clean.split(',');
  for (const rawPart of parts) {
    const part = rawPart.trim();
    if (!part) continue;
    const rangeMatch = part.match(/^(\d+)\s*[-–]\s*(\d+)$/);
    if (rangeMatch) {
      let start = Math.max(1, Number(rangeMatch[1]));
      let end = Math.min(totalPages, Number(rangeMatch[2]));
      if (start > end) [start, end] = [end, start];
      for (let p = start; p <= end; p++) selected.add(p);
    } else if (/^\d+$/.test(part)) {
      const p = Number(part);
      if (p >= 1 && p <= totalPages) selected.add(p);
    }
  }
  if (selected.size === 0) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  return Array.from(selected).sort((a, b) => a - b);
}

export function extractFormFieldsHeuristic(text: string): BanglaFormField[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const fields: BanglaFormField[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    // Match "Label : Value" or "Labelঃ Value" or "Label - Value"
    const match = line.match(/^([^:ঃ\t]{2,48}?)\s*(?:[:ঃ]|\t+|\s-\s)\s*(.+)$/);
    if (match) {
      const label = match[1].replace(/^\d+[.)]\s*/, '').trim();
      const value = match[2].trim();
      if (label && value && !seen.has(`${label}::${value}`)) {
        seen.add(`${label}::${value}`);
        fields.push({
          id: `fld-${fields.length + 1}-${Math.random().toString(36).slice(2, 6)}`,
          label,
          value,
        });
      }
    }
  }
  return fields;
}

export function computeScriptStats(text: string): {
  banglaCharCount: number;
  englishCharCount: number;
  banglaNumeralCount: number;
  englishNumeralCount: number;
  detectedScript: string;
} {
  const banglaChars = text.match(/[\u0980-\u09FF]/g)?.length ?? 0;
  const englishChars = text.match(/[A-Za-z]/g)?.length ?? 0;
  const banglaNumerals = text.match(/[০-৯]/g)?.length ?? 0;
  const englishNumerals = text.match(/[0-9]/g)?.length ?? 0;

  let detectedScript = 'mixed';
  if (banglaChars > 0 && englishChars === 0) detectedScript = 'bangla';
  else if (englishChars > 0 && banglaChars === 0) detectedScript = 'english';
  else if (banglaChars === 0 && englishChars === 0) detectedScript = 'unknown';

  return {
    banglaCharCount: banglaChars,
    englishCharCount: englishChars,
    banglaNumeralCount: banglaNumerals,
    englishNumeralCount: englishNumerals,
    detectedScript,
  };
}

function escapeHtmlBasic(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function prepareImageForOnlineAi(source: File | HTMLCanvasElement): Promise<string> {
  let srcCanvas: HTMLCanvasElement;
  if (source instanceof HTMLCanvasElement) {
    srcCanvas = source;
  } else {
    const img = await loadImageFromFile(source);
    srcCanvas = document.createElement('canvas');
    srcCanvas.width = img.naturalWidth || img.width;
    srcCanvas.height = img.naturalHeight || img.height;
    const ctx = srcCanvas.getContext('2d');
    if (!ctx) throw new Error('Failed to initialize image canvas.');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, srcCanvas.width, srcCanvas.height);
    ctx.drawImage(img, 0, 0);
  }

  // Keep high crisp resolution for small Bangla matras/handwriting while capping max dimension at 2400px
  const maxDim = Math.max(srcCanvas.width, srcCanvas.height);
  const scale = maxDim > 2400 ? 2400 / maxDim : 1;
  const w = Math.max(1, Math.round(srcCanvas.width * scale));
  const h = Math.max(1, Math.round(srcCanvas.height * scale));

  const outCanvas = document.createElement('canvas');
  outCanvas.width = w;
  outCanvas.height = h;
  const octx = outCanvas.getContext('2d');
  if (!octx) return srcCanvas.toDataURL('image/jpeg', 0.92);

  octx.fillStyle = '#ffffff';
  octx.fillRect(0, 0, w, h);
  octx.imageSmoothingEnabled = true;
  octx.imageSmoothingQuality = 'high';
  octx.drawImage(srcCanvas, 0, 0, w, h);

  return outCanvas.toDataURL('image/jpeg', 0.92);
}

async function callOnlineBanglaOcrApi(
  imageDataUrl: string,
  preset: BanglaOcrPresetId,
  langMode: OcrLangMode
): Promise<{
  fullText: string;
  paragraphs: string[];
  detectedScript: string;
  formFields: Array<{ label: string; value: string }>;
}> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 55000);
  try {
    const resp = await fetch('/api/ocr/bangla', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageDataUrl,
        mode: preset,
        langMode,
      }),
      signal: controller.signal,
    });
    const payload = (await resp.json().catch(() => null)) as {
      fullText?: string;
      paragraphs?: string[];
      detectedScript?: string;
      formFields?: Array<{ label?: string; value?: string }>;
      error?: string;
    } | null;

    if (!resp.ok || !payload) {
      throw new Error(payload?.error || `Online OCR failed (HTTP ${resp.status})`);
    }
    return {
      fullText: (payload.fullText || '').normalize('NFC').trim(),
      paragraphs: Array.isArray(payload.paragraphs) ? payload.paragraphs : [],
      detectedScript: payload.detectedScript || 'mixed',
      formFields: Array.isArray(payload.formFields)
        ? payload.formFields
            .map((f) => ({
              label: String(f?.label || '').trim(),
              value: String(f?.value || '').trim(),
            }))
            .filter((f) => f.label || f.value)
        : [],
    };
  } finally {
    window.clearTimeout(timeout);
  }
}

async function recognizeSingleCanvasOrFile(
  source: File | HTMLCanvasElement,
  pageNumber: number,
  options: BanglaOcrRunOptions,
  onProgress?: (pct: number, msg: string) => void
): Promise<{
  pageResult: BanglaOcrPageResult;
  fallbackNotice?: string;
}> {
  onProgress?.(10, 'Sharpening image & enhancing Bangla strokes...');
  const pre = await preprocessImageForOcr(source, {
    enhanceSharpness: options.enhanceSharpness,
    upscale2x: options.upscale2x,
    adaptiveThreshold: options.adaptiveThreshold,
  });

  const canTryOnline =
    options.enginePreference !== 'offline-local' &&
    (typeof navigator === 'undefined' || navigator.onLine);

  let fallbackNotice: string | undefined;

  if (canTryOnline) {
    try {
      onProgress?.(35, 'Recognizing Bangla & English text via Online AI...');
      const onlineDataUrl = await prepareImageForOnlineAi(source);
      const aiRes = await callOnlineBanglaOcrApi(
        onlineDataUrl,
        options.preset,
        options.langMode
      );

      const formFields: BanglaFormField[] =
        aiRes.formFields.length > 0
          ? aiRes.formFields.map((f, idx) => ({
              id: `p${pageNumber}-f${idx + 1}`,
              label: f.label,
              value: f.value,
            }))
          : extractFormFieldsHeuristic(aiRes.fullText);

      onProgress?.(100, 'Online AI recognition complete');
      return {
        pageResult: {
          pageNumber,
          text: aiRes.fullText,
          paragraphs:
            aiRes.paragraphs.length > 0
              ? aiRes.paragraphs
              : aiRes.fullText.split(/\n{2,}/).filter(Boolean),
          engineUsed: 'online-ai',
          originalPreviewUrl: pre.originalDataUrl,
          enhancedPreviewUrl: pre.enhancedDataUrl,
          formFields,
        },
      };
    } catch (err) {
      if (options.enginePreference === 'online-ai') {
        throw err instanceof Error ? err : new Error('Online AI OCR failed.');
      }
      fallbackNotice =
        err instanceof Error
          ? err.message
          : 'Online AI unavailable — processed with Offline Browser OCR.';
    }
  } else if (options.enginePreference === 'online-ai') {
    throw new Error('Internet connection is offline. Switch to Auto Hybrid or Offline Local.');
  }

  onProgress?.(45, `Running Offline OCR (${options.langMode})...`);
  const offRes = await runOfflineOcr(pre.canvas, options.langMode, (pct, status) => {
    onProgress?.(Math.min(98, 45 + Math.round(pct * 0.52)), `Offline OCR: ${status}`);
  });

  const cleanText = offRes.text.normalize('NFC').trim();
  const formFields = extractFormFieldsHeuristic(cleanText);

  return {
    fallbackNotice,
    pageResult: {
      pageNumber,
      text: cleanText,
      paragraphs: offRes.paragraphs.map((p) => p.normalize('NFC')),
      engineUsed: 'offline-ocr',
      confidence: offRes.confidence,
      originalPreviewUrl: pre.originalDataUrl,
      enhancedPreviewUrl: pre.enhancedDataUrl,
      formFields,
    },
  };
}

export async function recognizeDocumentWithBanglaOcr(
  file: File,
  options: BanglaOcrRunOptions,
  onProgress?: (pct: number, msg: string) => void
): Promise<BanglaOcrDocumentResult> {
  const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
  const id = `ocr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  if (!isPdf) {
    const { pageResult, fallbackNotice } = await recognizeSingleCanvasOrFile(
      file,
      1,
      options,
      onProgress
    );
    const stats = computeScriptStats(pageResult.text);
    return {
      id,
      sourceName: file.name,
      sourceKind: 'image',
      presetUsed: options.preset,
      engineUsed: pageResult.engineUsed === 'online-ai' ? 'online-ai' : 'offline-ocr',
      detectedScript: stats.detectedScript,
      fullText: pageResult.text,
      pages: [pageResult],
      formFields: pageResult.formFields,
      banglaCharCount: stats.banglaCharCount,
      englishCharCount: stats.englishCharCount,
      banglaNumeralCount: stats.banglaNumeralCount,
      englishNumeralCount: stats.englishNumeralCount,
      avgConfidence: pageResult.confidence,
      fallbackNotice,
    };
  }

  // PDF workflow with page range picker
  const bytes = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
  const selectedPages = parsePageRangeSelection(options.pdfPageRange, pdf.numPages);

  const pageResults: BanglaOcrPageResult[] = [];
  const allFormFields: BanglaFormField[] = [];
  let fallbackNotice: string | undefined;

  for (let i = 0; i < selectedPages.length; i++) {
    const pNum = selectedPages[i];
    const basePct = Math.round((i / Math.max(1, selectedPages.length)) * 100);
    onProgress?.(basePct, `Preparing PDF page ${pNum} of ${pdf.numPages}...`);

    const pdfPage = await pdf.getPage(pNum);
    const rawViewport = pdfPage.getViewport({ scale: 1 });
    const renderViewport = pdfPage.getViewport({ scale: options.pdfDpiScale || 2.4 });

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(renderViewport.width);
    canvas.height = Math.round(renderViewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to create PDF render canvas.');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await pdfPage.render({ canvasContext: ctx, viewport: renderViewport, canvas }).promise;
    const origDataUrl = canvas.toDataURL('image/jpeg', 0.9);

    // Check embedded text layer if digital preference is enabled and mode is not handwriting/form-ocr
    let usedDigitalLayer = false;
    if (
      options.preferDigitalPdfText &&
      options.preset !== 'handwriting' &&
      options.preset !== 'form-ocr'
    ) {
      const txtContent = await pdfPage.getTextContent();
      const rawDigital = txtContent.items
        .map((it) => ('str' in it ? it.str : ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      const hasReplacementGarbage = /[\uFFFD]/.test(rawDigital);
      if (rawDigital.length >= 40 && !hasReplacementGarbage) {
        usedDigitalLayer = true;
        const paragraphs = rawDigital
          .split(/\n{2,}/)
          .map((p) => p.normalize('NFC').trim())
          .filter(Boolean);
        const fFields = extractFormFieldsHeuristic(rawDigital);
        fFields.forEach((f) => allFormFields.push(f));
        pageResults.push({
          pageNumber: pNum,
          text: rawDigital.normalize('NFC'),
          paragraphs: paragraphs.length > 0 ? paragraphs : [rawDigital.normalize('NFC')],
          engineUsed: 'pdf-text',
          originalPreviewUrl: origDataUrl,
          enhancedPreviewUrl: origDataUrl,
          formFields: fFields,
          widthPt: rawViewport.width,
          heightPt: rawViewport.height,
        });
      }
    }

    if (!usedDigitalLayer) {
      const { pageResult, fallbackNotice: notice } = await recognizeSingleCanvasOrFile(
        canvas,
        pNum,
        options,
        (subPct, msg) => {
          const overall = Math.round(
            ((i + subPct / 100) / Math.max(1, selectedPages.length)) * 100
          );
          onProgress?.(overall, `Page ${pNum}: ${msg}`);
        }
      );
      if (notice && !fallbackNotice) fallbackNotice = notice;
      pageResult.originalPreviewUrl = pageResult.originalPreviewUrl || origDataUrl;
      pageResult.widthPt = rawViewport.width;
      pageResult.heightPt = rawViewport.height;
      pageResult.formFields.forEach((f) => allFormFields.push(f));
      pageResults.push(pageResult);
    }
  }

  const fullText = pageResults
    .map((p) => (pageResults.length > 1 ? `--- Page ${p.pageNumber} ---\n${p.text}` : p.text))
    .join('\n\n')
    .trim();

  const stats = computeScriptStats(fullText);
  const onlineCount = pageResults.filter((p) => p.engineUsed === 'online-ai').length;
  const offlineCount = pageResults.filter((p) => p.engineUsed === 'offline-ocr').length;
  const confPages = pageResults.filter((p) => typeof p.confidence === 'number');
  const avgConfidence =
    confPages.length > 0
      ? Math.round(
          confPages.reduce((sum, p) => sum + (p.confidence || 0), 0) / confPages.length
        )
      : undefined;

  return {
    id,
    sourceName: file.name,
    sourceKind: 'pdf',
    presetUsed: options.preset,
    engineUsed:
      onlineCount > 0 && offlineCount === 0
        ? 'online-ai'
        : offlineCount > 0 && onlineCount === 0
        ? 'offline-ocr'
        : 'mixed',
    detectedScript: stats.detectedScript,
    fullText,
    pages: pageResults,
    formFields: allFormFields,
    banglaCharCount: stats.banglaCharCount,
    englishCharCount: stats.englishCharCount,
    banglaNumeralCount: stats.banglaNumeralCount,
    englishNumeralCount: stats.englishNumeralCount,
    avgConfidence,
    fallbackNotice,
  };
}

export function buildPayloadFromBanglaOcrResult(
  res: BanglaOcrDocumentResult
): ExtractedDocumentPayload {
  const baseTitle = getBaseName(res.sourceName);
  const blocks: StructuredBlock[] = [];
  const htmlChunks: string[] = [];

  if (res.formFields.length > 0) {
    const rows = [
      ['Field Label', 'Extracted Value'],
      ...res.formFields.map((f) => [f.label, f.value]),
    ];
    blocks.push({ kind: 'heading', text: 'Extracted Form Fields', fontSize: 15, bold: true });
    blocks.push({ kind: 'table', text: '', rows });

    htmlChunks.push('<h3>Extracted Form Fields</h3>');
    htmlChunks.push(
      '<table><thead><tr><th>Field</th><th>Value</th></tr></thead><tbody>' +
        res.formFields
          .map(
            (f) =>
              `<tr><td>${escapeHtmlBasic(f.label)}</td><td>${escapeHtmlBasic(f.value)}</td></tr>`
          )
          .join('') +
        '</tbody></table>'
    );
  }

  const paragraphs = res.fullText
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  for (const para of paragraphs) {
    blocks.push({ kind: 'paragraph', text: para, fontSize: 12 });
    htmlChunks.push(
      `<p>${escapeHtmlBasic(para).replace(/\n/g, '<br/>')}</p>`
    );
  }

  const structuredPages: StructuredPage[] = res.pages.map((p) => ({
    pageNumber: p.pageNumber,
    widthPt: p.widthPt || 595,
    heightPt: p.heightPt || 842,
    blocks: p.paragraphs.map((para) => ({
      kind: 'paragraph' as const,
      text: para,
      fontSize: 12,
    })),
    tableRows:
      p.formFields.length > 0
        ? [['Label', 'Value'], ...p.formFields.map((f) => [f.label, f.value])]
        : [],
    rawText: p.text,
    usedOcr: p.engineUsed !== 'pdf-text',
  }));

  return {
    sourceName: res.sourceName,
    sourceKind: res.sourceKind,
    title: baseTitle,
    htmlContent: htmlChunks.join('\n') || `<p>${escapeHtmlBasic(res.fullText)}</p>`,
    plainText: res.fullText,
    pages: structuredPages.length > 0 ? structuredPages : undefined,
    detectedOcrConfidence: res.avgConfidence,
  };
}

export function exportBanglaOcrToJson(res: BanglaOcrDocumentResult): Blob {
  const cleanPayload = {
    fileName: res.sourceName,
    sourceType: res.sourceKind,
    preset: res.presetUsed,
    engineUsed: res.engineUsed,
    detectedScript: res.detectedScript,
    metrics: {
      banglaCharacters: res.banglaCharCount,
      englishCharacters: res.englishCharCount,
      banglaNumerals: res.banglaNumeralCount,
      englishNumerals: res.englishNumeralCount,
      averageConfidence: res.avgConfidence ?? null,
    },
    formFields: res.formFields.map((f) => ({
      label: f.label,
      value: f.value,
    })),
    pages: res.pages.map((p) => ({
      pageNumber: p.pageNumber,
      engineUsed: p.engineUsed,
      confidence: p.confidence ?? null,
      text: p.text,
      paragraphs: p.paragraphs,
      formFields: p.formFields.map((f) => ({ label: f.label, value: f.value })),
    })),
    fullText: res.fullText,
  };

  return new Blob([JSON.stringify(cleanPayload, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
}

export async function exportBanglaOcrResultToFormat(
  res: BanglaOcrDocumentResult,
  format: BanglaOcrExportFormat,
  pdfOptions: PdfRenderOptions,
  onProgress?: (pct: number, msg: string) => void
): Promise<{ blob: Blob; ext: string }> {
  if (format === 'json') {
    return { blob: exportBanglaOcrToJson(res), ext: 'json' };
  }
  const payload = buildPayloadFromBanglaOcrResult(res);
  if (format === 'docx') {
    return { blob: await exportPayloadToDocx(payload), ext: 'docx' };
  }
  if (format === 'doc') {
    return { blob: exportPayloadToDoc(payload), ext: 'doc' };
  }
  if (format === 'html') {
    return { blob: exportPayloadToHtml(payload), ext: 'html' };
  }
  if (format === 'txt') {
    return { blob: exportPayloadToTxt(payload), ext: 'txt' };
  }
  return {
    blob: await exportPayloadToPdf(payload, pdfOptions, onProgress),
    ext: 'pdf',
  };
}
