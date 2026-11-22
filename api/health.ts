interface VercelRequest {
  method?: string;
}

interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
}

export default function handler(_req: VercelRequest, res: VercelResponse): void {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  res.status(200).json({
    ok: true,
    openaiConfigured: Boolean(apiKey && apiKey !== 'MY_OPENAI_API_KEY'),
  });
}
