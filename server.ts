import 'dotenv/config';
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

function parseUploadMiddleware(req: Request, res: Response, next: NextFunction): void {
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
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    res.json({
      ok: true,
      openaiConfigured: Boolean(apiKey && apiKey !== 'MY_OPENAI_API_KEY'),
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

        const files = (req.files as Express.Multer.File[] | undefined) || [];
        const mode = req.body?.mode === 'couple' ? 'couple' : 'single';

        if (mode === 'couple' && files.length < 2) {
          res.status(400).json({
            error: 'Couple Mode requires 2 photos (Boy on Left + Girl on Right).',
          });
          return;
        }
        if (files.length < 1) {
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
            const { mime, filename } = normalizeMimeAndFilename(files[i], i);
            const blob = new Blob([new Uint8Array(files[i].buffer)], { type: mime });
            openAiForm.append('image[]', blob, filename);
          }
        } else {
          const { mime, filename } = normalizeMimeAndFilename(files[0], 0);
          const blob = new Blob([new Uint8Array(files[0].buffer)], { type: mime });
          openAiForm.append('image', blob, filename);
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

  // Return clean JSON 404 for unknown API routes
  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'API route not found.' });
  });

  // Dev vs Production static / Vite middleware setup
  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : undefined,
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
