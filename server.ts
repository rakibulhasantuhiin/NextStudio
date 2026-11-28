import 'dotenv/config';
import { GoogleGenAI, Type } from '@google/genai';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

const SINGLE_PASSPORT_PROMPT =
  "Transform this photo into a high-resolution, print-quality Bangladesh passport-size studio portrait. Replace the background with a solid, clean sky-blue studio background. Ensure bright, balanced studio lighting on the face, neatly tidy up any stray or messy hair on the sides, and align the body and face straight facing forward in a standard passport aspect ratio. Strictly preserve the person's original facial identity and natural features without changing their face.";

const COUPLE_PASSPORT_PROMPT =
  "Combine these two people into a single, seamless, high-resolution print-quality Bangladesh couple passport-size studio photo. Place the boy on the left side and the girl on the right side standing together naturally as a couple portrait. Replace the background with a solid, clean sky-blue studio background. Ensure bright, balanced studio lighting on both faces, neatly tidy up any stray or messy hair on the sides, and align their bodies and faces straight facing forward in a standard couple passport aspect ratio. Strictly preserve both individuals' original facial identities and features without altering their faces.";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB max per photo
    files: 2,
  },
});

function normalizeMimeAndFilename(
  file: Express.Multer.File,
  index: number
): {
  mime: string;
  filename: string;
} {
  const rawMime = (file.mimetype || '').toLowerCase();
  if (rawMime === 'image/png') {
    return { mime: 'image/png', filename: `photo-${index + 1}.png` };
  }
  if (rawMime === 'image/webp') {
    return { mime: 'image/webp', filename: `photo-${index + 1}.webp` };
  }
  return { mime: 'image/jpeg', filename: `photo-${index + 1}.jpg` };
}

interface PreparedImage {
  bytes: Uint8Array<ArrayBuffer>;
  mime: string;
  filename: string;
}

function parseDataUrlImage(input: string, index: number): PreparedImage | null {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed || trimmed === 'data:,') return null;

  let rawMime = 'image/jpeg';
  let base64Body = trimmed;

  if (trimmed.startsWith('data:')) {
    const commaIdx = trimmed.indexOf(',');
    if (commaIdx === -1) return null;
    const meta = trimmed.slice(5, commaIdx);
    const semiIdx = meta.indexOf(';');
    rawMime = (semiIdx >= 0 ? meta.slice(0, semiIdx) : meta).toLowerCase().trim() || 'image/jpeg';
    base64Body = trimmed.slice(commaIdx + 1).trim();
  }

  if (!base64Body) return null;

  let mime = 'image/jpeg';
  let ext = 'jpg';
  if (rawMime.includes('image/png')) {
    mime = 'image/png';
    ext = 'png';
  } else if (rawMime.includes('image/webp')) {
    mime = 'image/webp';
    ext = 'webp';
  }
  try {
    const buf = Buffer.from(base64Body, 'base64');
    if (buf.length < 16) return null;
    return {
      bytes: Uint8Array.from(buf),
      mime,
      filename: `photo-${index + 1}.${ext}`,
    };
  } catch {
    return null;
  }
}

function parseUploadMiddleware(req: Request, res: Response, next: NextFunction): void {
  const contentType = (req.headers['content-type'] || '').toLowerCase();
  if (!contentType.includes('multipart/form-data')) {
    next();
    return;
  }
  upload.array('images', 2)(req, res, (err: unknown) => {
    if (!err) {
      next();
      return;
    }
    if (err instanceof multer.MulterError) {
      const msg =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'Uploaded image is too large (max 25MB per photo).'
          : err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE'
          ? 'Please upload 1 photo for Single Mode or 2 photos for Couple Mode.'
          : err.message;
      res.status(400).json({ error: msg });
      return;
    }
    const message = err instanceof Error ? err.message : 'Failed to process uploaded image.';
    res.status(400).json({ error: message });
  });
}

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '30mb' }));

  // Health check
  app.get('/api/health', (_req: Request, res: Response) => {
    const openaiKey = process.env.OPENAI_API_KEY?.trim();
    const geminiKey = process.env.GEMINI_API_KEY?.trim();
    res.json({
      ok: true,
      openaiConfigured: Boolean(openaiKey && openaiKey !== 'MY_OPENAI_API_KEY'),
      geminiConfigured: Boolean(geminiKey && geminiKey !== 'MY_GEMINI_API_KEY'),
    });
  });

  // OpenAI gpt-image-1 Image Edit API route for Single & Couple AI Passport Photos
  app.post(
    '/api/generate-passport',
    parseUploadMiddleware,
    async (req: Request, res: Response) => {
      try {
        const apiKey = process.env.OPENAI_API_KEY?.trim();
        if (!apiKey || apiKey === 'MY_OPENAI_API_KEY') {
          res.status(500).json({
            error:
              'OPENAI_API_KEY is not configured. Please add OPENAI_API_KEY to your server environment secrets.',
          });
          return;
        }

        const mode = req.body?.mode === 'couple' ? 'couple' : 'single';
        const multipartFiles = (req.files as Express.Multer.File[] | undefined) || [];
        let preparedImages: PreparedImage[] = [];

        if (multipartFiles.length > 0) {
          preparedImages = multipartFiles.slice(0, 2).map((file, i) => {
            const { mime, filename } = normalizeMimeAndFilename(file, i);
            return {
              bytes: Uint8Array.from(file.buffer),
              mime,
              filename,
            };
          });
        } else if (Array.isArray(req.body?.images)) {
          preparedImages = (req.body.images as unknown[])
            .slice(0, 2)
            .map((item, idx) => (typeof item === 'string' ? parseDataUrlImage(item, idx) : null))
            .filter((item): item is PreparedImage => item !== null);
        }

        if (mode === 'couple' && preparedImages.length < 2) {
          res.status(400).json({
            error: 'Couple Mode requires 2 photos (Boy on Left + Girl on Right).',
          });
          return;
        }
        if (preparedImages.length < 1) {
          res.status(400).json({ error: 'Please upload an image file.' });
          return;
        }

        const openAiForm = new FormData();
        openAiForm.append('model', 'gpt-image-1');
        openAiForm.append(
          'prompt',
          mode === 'couple' ? COUPLE_PASSPORT_PROMPT : SINGLE_PASSPORT_PROMPT
        );
        openAiForm.append('size', mode === 'couple' ? '1536x1024' : '1024x1536');
        openAiForm.append('quality', 'high');

        if (mode === 'couple') {
          // OpenAI gpt-image-1 multi-image edit syntax requires image[]
          for (let i = 0; i < 2; i++) {
            const img = preparedImages[i];
            const blob = new Blob([img.bytes], { type: img.mime });
            openAiForm.append('image[]', blob, img.filename);
          }
        } else {
          const img = preparedImages[0];
          const blob = new Blob([img.bytes], { type: img.mime });
          openAiForm.append('image', blob, img.filename);
        }

        const openAiResp = await fetch('https://api.openai.com/v1/images/edits', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          body: openAiForm,
        });

        const payload = (await openAiResp.json().catch(() => null)) as {
          data?: Array<{ b64_json?: string; url?: string }>;
          error?: { message?: string };
        } | null;

        if (!openAiResp.ok || !payload?.data?.[0]) {
          const errMsg =
            payload?.error?.message ||
            `OpenAI Image Edit API error (HTTP ${openAiResp.status})`;
          console.error('[generate-passport] OpenAI error:', errMsg);
          res.status(openAiResp.status >= 400 ? openAiResp.status : 502).json({
            error: errMsg,
          });
          return;
        }

        const first = payload.data[0];
        let dataUrl = '';

        if (first.b64_json) {
          dataUrl = `data:image/png;base64,${first.b64_json}`;
        } else if (first.url) {
          const imgResp = await fetch(first.url);
          if (!imgResp.ok) {
            res.status(502).json({
              error: `Failed to download generated image (HTTP ${imgResp.status}).`,
            });
            return;
          }
          const arrBuf = await imgResp.arrayBuffer();
          const contentType = imgResp.headers.get('content-type') || 'image/png';
          dataUrl = `data:${contentType};base64,${Buffer.from(arrBuf).toString('base64')}`;
        }

        if (!dataUrl) {
          res.status(502).json({ error: 'OpenAI returned an empty image payload.' });
          return;
        }

        res.json({ dataUrl, mode });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unexpected server error';
        console.error('[generate-passport] Exception:', err);
        res.status(500).json({ error: message });
      }
    }
  );

  // Gemini 4 Hydrogen Server-Side Bangla & Bengali OCR Endpoint
  app.post('/api/ocr/bangla', async (req: Request, res: Response) => {
    try {
      const geminiKey = process.env.GEMINI_API_KEY?.trim();
      if (!geminiKey || geminiKey === 'MY_GEMINI_API_KEY') {
        res.status(503).json({
          error:
            'GEMINI_API_KEY is not configured in server secrets. Use Offline OCR or configure GEMINI_API_KEY in Settings > Secrets.',
        });
        return;
      }

      const rawImage = typeof req.body?.imageDataUrl === 'string' ? req.body.imageDataUrl : '';
      const prepared = parseDataUrlImage(rawImage, 0);
      if (!prepared) {
        res.status(400).json({ error: 'Invalid or missing image payload.' });
        return;
      }
      if (prepared.bytes.byteLength > 18 * 1024 * 1024) {
        res.status(413).json({ error: 'Image payload exceeds 18MB limit.' });
        return;
      }

      const allowedModes = new Set([
        'all-ocr',
        'image-to-text',
        'photo-to-text',
        'handwriting',
        'pdf-to-text',
        'pdf-to-word',
        'mixed-bn-en',
        'form-ocr',
        'export-suite',
      ]);
      const mode =
        typeof req.body?.mode === 'string' && allowedModes.has(req.body.mode)
          ? req.body.mode
          : 'all-ocr';

      const langMode =
        req.body?.langMode === 'ben' || req.body?.langMode === 'eng'
          ? req.body.langMode
          : 'ben+eng';

      const modeGuidance: Record<string, string> = {
        'handwriting':
          'Focus carefully on handwritten Bengali and English cursive/printed handwriting (notes, letters, signatures, filled boxes). Strictly keep Bengali numerals (০১২৩৪৫৬৭৮৯) as Bengali digits and English numerals as English digits.',
        'form-ocr':
          'This is a filled-in form containing printed labels and typed or handwritten answers. Extract every field into formFields (label + value) and also preserve clean fullText.',
        'photo-to-text':
          'This is a phone photo, WhatsApp forward, or screenshot that may have perspective tilt, shadows, or compression noise. Read every Bengali and English character clearly without guessing unprinted text.',
        'mixed-bn-en':
          'Read mixed Bangla and English text seamlessly in one pass, keeping both scripts and both numeral systems intact.',
        'pdf-to-text':
          'Transcribe the scanned Bengali/English PDF page faithfully preserving headings, paragraphs, bullet lists, and tables.',
        'pdf-to-word':
          'Transcribe the scanned Bengali/English PDF page preserving document structure, headings, lists, and clean Unicode paragraphs suitable for Word export.',
      };

      const systemInstruction = [
        'You are a high-precision Bangla (Bengali) and English OCR transcription engine.',
        'Transcribe all visible text strictly verbatim into clean NFC Unicode without broken conjuncts (যুক্তাক্ষর) or corrupted vowel signs (কার/মাত্রা).',
        'Do not translate Bengali to English or English to Bengali.',
        'Preserve Bengali numerals (০১২৩৪৫৬৭৮৯) as Bengali and English numerals (0123456789) as English exactly as written.',
        langMode === 'ben'
          ? 'Prioritize Bengali script and Bengali punctuation (।).'
          : 'Support both Bengali and English scripts accurately in reading order.',
        modeGuidance[mode] || 'Transcribe all printed and handwritten Bengali/English text cleanly.',
      ].join(' ');

      const ai = new GoogleGenAI({
        apiKey: geminiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const base64Data = Buffer.from(prepared.bytes).toString('base64');
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: prepared.mime,
                data: base64Data,
              },
            },
            {
              text: 'Extract all text, paragraphs, and any form label-value pairs from this document image in reading order.',
            },
          ],
        },
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              fullText: {
                type: Type.STRING,
                description: 'Complete verbatim Unicode transcription in natural reading order.',
              },
              paragraphs: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Clean logical paragraphs or lines extracted in reading order.',
              },
              detectedScript: {
                type: Type.STRING,
                description: 'Detected language/script such as bangla, english, or mixed.',
              },
              containsHandwriting: {
                type: Type.BOOLEAN,
                description: 'Whether handwritten text was detected.',
              },
              formFields: {
                type: Type.ARRAY,
                description: 'Key-value pairs if the document is a filled-in form or structured record.',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING },
                    value: { type: Type.STRING },
                  },
                },
              },
            },
          },
        },
      });

      const rawJson = (response.text ?? '{}').trim();
      let parsedJson: {
        fullText?: string;
        paragraphs?: string[];
        detectedScript?: string;
        containsHandwriting?: boolean;
        formFields?: Array<{ label?: string; value?: string }>;
      } = {};
      try {
        parsedJson = JSON.parse(rawJson);
      } catch {
        parsedJson = { fullText: rawJson, paragraphs: rawJson ? [rawJson] : [] };
      }

      const fullText = (parsedJson.fullText || '').normalize('NFC').trim();
      const paragraphs = Array.isArray(parsedJson.paragraphs)
        ? parsedJson.paragraphs.map((p) => String(p || '').normalize('NFC').trim()).filter(Boolean)
        : fullText
        ? fullText.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
        : [];
      const formFields = Array.isArray(parsedJson.formFields)
        ? parsedJson.formFields
            .map((f) => ({
              label: String(f?.label || '').normalize('NFC').trim(),
              value: String(f?.value || '').normalize('NFC').trim(),
            }))
            .filter((f) => f.label || f.value)
        : [];

      res.json({
        fullText,
        paragraphs,
        detectedScript: parsedJson.detectedScript || 'mixed',
        containsHandwriting: Boolean(parsedJson.containsHandwriting),
        formFields,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Online Bangla OCR request failed.';
      console.error('[api/ocr/bangla] Exception:', err);
      res.status(502).json({ error: message });
    }
  });

  // Return clean JSON 404 for unknown API routes
  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'API route not found.' });
  });

  // Dev vs Production static / Vite middleware setup
  if (!IS_PROD) {
    // Serve a clean no-WebSocket /@vite/client module in dev mode (HMR is disabled in preview)
    app.get('/@vite/client', (_req: Request, res: Response) => {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.send(`
const sheetsMap = new Map();
export function updateStyle(id, content) {
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.setAttribute('data-vite-dev-id', id);
    style.textContent = content;
    document.head.appendChild(style);
    sheetsMap.set(id, style);
  } else {
    style.textContent = content;
  }
}
export function removeStyle(id) {
  const style = sheetsMap.get(id);
  if (style) {
    document.head.removeChild(style);
    sheetsMap.delete(id);
  }
}
export function createHotContext() {
  return {
    data: {},
    accept() {},
    acceptExports() {},
    dispose() {},
    prune() {},
    decline() {},
    invalidate() {},
    on() {},
    off() {},
    send() {},
  };
}
export function injectQuery(url, queryToInject) {
  if (!url || !queryToInject) return url;
  const [base, hash] = url.split('#');
  const sep = base.includes('?') ? '&' : '?';
  return base + sep + queryToInject + (hash ? '#' + hash : '');
}
export class ErrorOverlay extends HTMLElement {}
`);
    });

    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      const indexPath = path.join(distDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  // Global JSON error fallback for API errors
  app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      next(err);
      return;
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    if (req.path.startsWith('/api')) {
      res.status(500).json({ error: message });
      return;
    }
    res.status(500).send(message);
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
