const SINGLE_PASSPORT_PROMPT =
  "Transform this photo into a high-resolution, print-quality Bangladesh passport-size studio portrait. Replace the background with a solid, clean sky-blue studio background. Ensure bright, balanced studio lighting on the face, neatly tidy up any stray or messy hair on the sides, and align the body and face straight facing forward in a standard passport aspect ratio. Strictly preserve the person's original facial identity and natural features without changing their face.";

const COUPLE_PASSPORT_PROMPT =
  "Combine these two people into a single, seamless, high-resolution print-quality Bangladesh couple passport-size studio photo. Place the boy on the left side and the girl on the right side standing together naturally as a couple portrait. Replace the background with a solid, clean sky-blue studio background. Ensure bright, balanced studio lighting on both faces, neatly tidy up any stray or messy hair on the sides, and align their bodies and faces straight facing forward in a standard couple passport aspect ratio. Strictly preserve both individuals' original facial identities and features without altering their faces.";

interface VercelRequest {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
  on?: (event: string, listener: (chunk?: Uint8Array | string) => void) => void;
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

function parseDataUrlImage(input: string, index: number): ParsedImagePayload | null {
  if (typeof input !== 'string' || !input.trim()) return null;

  const match = input.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/);
  let rawMime = 'image/jpeg';
  let base64Body = input.trim();

  if (match) {
    rawMime = match[1].toLowerCase();
    base64Body = match[2];
  }

  let mime = 'image/jpeg';
  let ext = 'jpg';
  if (rawMime === 'image/png') {
    mime = 'image/png';
    ext = 'png';
  } else if (rawMime === 'image/webp') {
    mime = 'image/webp';
    ext = 'webp';
  }

  try {
    const buf = Buffer.from(base64Body, 'base64');
    if (buf.length === 0) return null;
    return {
      bytes: Uint8Array.from(buf),
      mime,
      filename: `photo-${index + 1}.${ext}`,
    };
  } catch {
    return null;
  }
}

async function readJsonBody(req: VercelRequest): Promise<Record<string, unknown>> {
  if (req.body && typeof req.body === 'object') {
    return req.body as Record<string, unknown>;
  }
  if (typeof req.body === 'string' && req.body.trim()) {
    try {
      return JSON.parse(req.body) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (!req.on) return {};

  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    req.on?.('data', (chunk) => {
      if (chunk) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : Buffer.from(chunk));
      }
    });
    req.on?.('end', () => resolve());
    req.on?.('error', () => reject(new Error('Failed to read request body.')));
  });

  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export const config = {
  maxDuration: 60,
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
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

    const body = await readJsonBody(req);
    const mode = body.mode === 'couple' ? 'couple' : 'single';
    const rawImages = Array.isArray(body.images) ? body.images : [];
    const parsedImages = rawImages
      .slice(0, 2)
      .map((item, idx) => (typeof item === 'string' ? parseDataUrlImage(item, idx) : null))
      .filter((item): item is ParsedImagePayload => item !== null);

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
