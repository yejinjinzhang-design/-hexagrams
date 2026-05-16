const DEEPSEEK_BASE = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-chat";

export function isDeepseekConfigured(): boolean {
  return Boolean(process.env.DEEPSEEK_API_KEY?.trim());
}

export type DeepseekChatParams = {
  system: string;
  user: string;
  model?: string;
  timeoutMs?: number;
  /** 启用时请求 JSON 输出（须环境支持 response_format） */
  jsonObject?: boolean;
};

export type LlmTextResult =
  | { ok: true; content: string }
  | { ok: false; error: string };

/**
 * DeepSeek Chat Completions：供占断编排等多处复用。
 */
export async function deepseekChat(
  params: DeepseekChatParams
): Promise<LlmTextResult> {
  const key = process.env.DEEPSEEK_API_KEY?.trim();
  if (!key) {
    return { ok: false, error: "DEEPSEEK_API_KEY 未配置" };
  }

  const model = params.model?.trim() || DEFAULT_MODEL;
  const timeoutMs = params.timeoutMs ?? 90_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: params.system },
      { role: "user", content: params.user },
    ],
  };

  if (params.jsonObject || process.env.DEEPSEEK_JSON_MODE === "1") {
    body.response_format = { type: "json_object" };
  }

  try {
    const res = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const raw = await res.text();
    if (!res.ok) {
      console.error("[deepseekChat] HTTP", res.status, raw.slice(0, 500));
      return { ok: false, error: `DeepSeek HTTP ${res.status}` };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ok: false, error: "DeepSeek 响应非 JSON" };
    }

    const rec = parsed as Record<string, unknown>;
    const choices = rec.choices as unknown[] | undefined;
    const first = choices?.[0] as Record<string, unknown> | undefined;
    const message = first?.message as Record<string, unknown> | undefined;
    const content = message?.content;
    if (typeof content !== "string" || !content.trim()) {
      return { ok: false, error: "DeepSeek 返回内容为空" };
    }
    return { ok: true, content: content.trim() };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("abort")) {
      return { ok: false, error: "DeepSeek 请求超时" };
    }
    console.error("[deepseekChat]", e);
    return { ok: false, error: msg };
  } finally {
    clearTimeout(timer);
  }
}
