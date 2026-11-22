const SINGLE_PASSPORT_PROMPT =
  "Transform this photo into a high-resolution, print-quality Bangladesh passport-size studio portrait. Replace the background with a solid, clean sky-blue studio background. Ensure bright, balanced studio lighting on the face, neatly tidy up any stray or messy hair on the sides, and align the body and face straight facing forward in a standard passport aspect ratio. Strictly preserve the person's original facial identity and natural features without changing their face.";

const COUPLE_PASSPORT_PROMPT =
  "Combine these two people into a single, seamless, high-resolution print-quality Bangladesh couple passport-size studio photo. Place the boy on the left side and the girl on the right side standing together naturally as a couple portrait. Replace the background with a solid, clean sky-blue studio background. Ensure bright, balanced studio lighting on both faces, neatly tidy up any stray or messy hair on the sides, and align their bodies and faces straight facing forward in a standard couple passport aspect ratio. Strictly preserve both individuals' original facial identities and features without altering their faces.";

interface VercelRequest {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
  on?: (event: string, listener: (chunk?: Uint8Array | string) => void) => void;
  [Symbol.asyncIterator]?: () => AsyncIterator<Uint8Array | string>;
}

interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
  end: (body?: string) => void;
}

interface ParsedImagePayload {
  bytes: Uint8Array<ArrayBuffer>;
  mime: string;
  filename: string;
}

function getHeader(req: VercelRequest, name: string): string {
  const headers = req.headers || {};
  const val = headers[name.toLowerCase()] ?? headers[name];
  if (Array.isArray(val)) return val[0] || '';
  return typeof val === 'string' ? val : '';
}

function normalizeMimeAndExt(rawMimeInput: string): { mime: string; ext: string } {
  const rawMime = rawMimeInput.toLowerCase().trim();
  if (rawMime.includes('image/png')) return { mime: 'image/png', ext: 'png' };
  if (rawMime.includes('image/webp')) return { mime: 'image/webp', ext: 'webp' };
  return { mime: 'image/jpeg', ext: 'jpg' };
}

function parseDataUrlImage(input: string, index: number): ParsedImagePayload | null {
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
    rawMime = (semiIdx >= 0 ? meta.slice(0, semiIdx) : meta).trim() || 'image/jpeg';
    base64Body = trimmed.slice(commaIdx + 1).trim();
  }

  if (!base64Body) return null;

  const { mime, ext } = normalizeMimeAndExt(rawMime);
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

async function readRawBodyBuffer(req: VercelRequest): Promise<Buffer> {
  if (Buffer.isBuffer(req.body)) {
    return req.body;
  }
  if (req.body instanceof Uint8Array) {
    return Buffer.from(req.body);
  }
  if (typeof req.body === 'string') {
    return Buffer.from(req.body, 'utf8');
  }

  const chunks: Buffer[] = [];
  if (typeof req[Symbol.asyncIterator] === 'function') {
    for await (const chunk of req as AsyncIterable<Uint8Array | string>) {
      if (chunk) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : Buffer.from(chunk));
      }
    }
    return Buffer.concat(chunks);
  }

  if (req.on) {
    await new Promise<void>((resolve, reject) => {
      req.on?.('data', (chunk) => {
        if (chunk) {
          chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : Buffer.from(chunk));
        }
      });
      req.on?.('end', () => resolve());
      req.on?.('error', () => reject(new Error('Failed to read request body.')));
    });
  }

  return Buffer.concat(chunks);
}

async function parseIncomingRequest(req: VercelRequest): Promise<{
  mode: 'single' | 'couple';
  images: ParsedImagePayload[];
}> {
  const contentType = getHeader(req, 'content-type');
  const lowerCt = contentType.toLowerCase();

  // Case 1: multipart/form-data (supports cached/legacy FormData clients cleanly via native Web Fetch Response.formData)
  if (lowerCt.includes('multipart/form-data')) {
    const rawBuf = await readRawBodyBuffer(req);
    if (rawBuf.length > 0) {
      const formRes = new Response(Uint8Array.from(rawBuf), {
        headers: { 'content-type': contentType },
      });
      const form = await formRes.formData();
      const modeVal = form.get('mode');
      const mode: 'single' | 'couple' = modeVal === 'couple' ? 'couple' : 'single';

      const fileEntries: Blob[] = [];
      for (const [key, value] of form.entries()) {
        if (
          (key === 'images' || key === 'images[]' || key === 'image' || key === 'image[]') &&
          typeof value !== 'string' &&
          typeof value.arrayBuffer === 'function'
        ) {
          fileEntries.push(value);
        }
      }

      const images: ParsedImagePayload[] = [];
      for (let i = 0; i < Math.min(2, fileEntries.length); i++) {
        const blob = fileEntries[i];
        const ab = await blob.arrayBuffer();
        if (ab.byteLength < 16) continue;
        const { mime, ext } = normalizeMimeAndExt(blob.type || 'image/jpeg');
        images.push({
          bytes: new Uint8Array(ab),
          mime,
          filename: `photo-${i + 1}.${ext}`,
        });
      }

      return { mode, images };
    }
  }

  // Case 2: application/json (supports pre-parsed object, Buffer, Uint8Array, string, or readable stream)
  let parsedObj: Record<string, unknown> = {};

  if (
    req.body &&
    typeof req.body === 'object' &&
    !Buffer.isBuffer(req.body) &&
    !(req.body instanceof Uint8Array) &&
    Object.keys(req.body as Record<string, unknown>).length > 0
  ) {
    parsedObj = req.body as Record<string, unknown>;
  } else {
    const rawBuf = await readRawBodyBuffer(req);
    const rawText = rawBuf.toString('utf8').trim();
    if (rawText) {
      try {
        const json = JSON.parse(rawText);
        if (json && typeof json === 'object') {
          parsedObj = json as Record<string, unknown>;
        }
      } catch {
        parsedObj = {};
      }
    }
  }

  const mode: 'single' | 'couple' = parsedObj.mode === 'couple' ? 'couple' : 'single';
  const rawList = Array.isArray(parsedObj.images)
    ? parsedObj.images
    : typeof parsedObj.image === 'string'
    ? [parsedObj.image]
    : [];

  const images = rawList
    .slice(0, 2)
    .map((item, idx) => (typeof item === 'string' ? parseDataUrlImage(item, idx) : null))
    .filter((item): item is ParsedImagePayload => item !== null);

  return { mode, images };
}

export const config = {
  maxDuration: 60,
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader('Allow', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed. Use POST /api/generate-passport.' });
    return;
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey || apiKey === 'MY_OPENAI_API_KEY') {
      res.status(500).json({
        error:
          'OPENAI_API_KEY is not configured. Please add OPENAI_API_KEY to your project environment variables.',
      });
      return;
    }

    const { mode, images: parsedImages } = await parseIncomingRequest(req);

    if (mode === 'couple' && parsedImages.length < 2) {
      res.status(400).json({
        error: 'Couple Mode requires 2 photos (Boy on Left + Girl on Right).',
      });
      return;
    }
    if (parsedImages.length < 1) {
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
      for (let i = 0; i < 2; i++) {
        const img = parsedImages[i];
        const blob = new Blob([img.bytes], { type: img.mime });
        openAiForm.append('image[]', blob, img.filename);
      }
    } else {
      const img = parsedImages[0];
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

    res.status(200).json({ dataUrl, mode });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    res.status(500).json({ error: message });
  }
}
