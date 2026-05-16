const GEMINI_HOST = "https://generativelanguage.googleapis.com";

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export type GeminiChatParams = {
  system: string;
  user: string;
  /** 如 gemini-2.0-flash、gemini-1.5-flash */
  model?: string;
  timeoutMs?: number;
  /** 尽量要求 JSON 输出 */
  jsonMime?: boolean;
};

export type LlmTextResult =
  | { ok: true; content: string }
  | { ok: false; error: string };

function defaultModel(): string {
  return process.env.GEMINI_MODEL?.trim() || "gemini-1.5-flash";
}

/**
 * Google Gemini generateContent（v1beta）
 */
export async function geminiChat(
  params: GeminiChatParams
): Promise<LlmTextResult> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    return { ok: false, error: "GEMINI_API_KEY 未配置" };
  }

  const model = params.model?.trim() || defaultModel();
  const timeoutMs = params.timeoutMs ?? 90_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const url = `${GEMINI_HOST}/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;

  const generationConfig: Record<string, unknown> = {
    temperature: 0.55,
  };
  if (params.jsonMime) {
    generationConfig.responseMimeType = "application/json";
  }

  const body = {
    systemInstruction: {
      parts: [{ text: params.system }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: params.user }],
      },
    ],
    generationConfig,
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const raw = await res.text();
    if (!res.ok) {
      console.error("[geminiChat] HTTP", res.status, raw.slice(0, 600));
      return { ok: false, error: `Gemini HTTP ${res.status}` };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ok: false, error: "Gemini 响应非 JSON" };
    }

    const rec = parsed as Record<string, unknown>;
    const candidates = rec.candidates as unknown[] | undefined;
    const c0 = candidates?.[0] as Record<string, unknown> | undefined;
    const content = c0?.content as Record<string, unknown> | undefined;
    const parts = content?.parts as unknown[] | undefined;
    const p0 = parts?.[0] as Record<string, unknown> | undefined;
    const text = p0?.text;
    if (typeof text !== "string" || !text.trim()) {
      return { ok: false, error: "Gemini 返回内容为空" };
    }
    return { ok: true, content: text.trim() };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("abort")) {
      return { ok: false, error: "Gemini 请求超时" };
    }
    console.error("[geminiChat]", e);
    return { ok: false, error: msg };
  } finally {
    clearTimeout(timer);
  }
}
