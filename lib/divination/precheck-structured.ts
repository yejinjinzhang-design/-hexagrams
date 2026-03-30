import type { PreCheckStructuredResult } from "@/lib/storage/types";
import { sanitizeAiText } from "@/utils/sanitizeAiText";

export function formatPreCheckForAnalysis(
  r: PreCheckStructuredResult
): string {
  const parts = [
    "【先观其应】",
    r.plainValidationSummary.trim(),
    "",
    "【再明其理】",
    r.reasoningExplanation.trim(),
    "",
    "【细参卦旨】",
    r.technicalInterpretation.trim(),
  ];
  return parts.join("\n").trim();
}

/**
 * 解析模型返回：支持裸 JSON 或 ```json ... ``` 包裹。
 */
export function parsePrecheckStructuredContent(
  raw: string
): PreCheckStructuredResult | null {
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  try {
    const o = JSON.parse(s) as unknown;
    if (!o || typeof o !== "object") return null;
    const rec = o as Record<string, unknown>;
    const a = rec.plainValidationSummary;
    const b = rec.reasoningExplanation;
    const c = rec.technicalInterpretation;
    if (typeof a !== "string" || typeof b !== "string" || typeof c !== "string") {
      return null;
    }
    return {
      plainValidationSummary: sanitizeAiText(a),
      reasoningExplanation: sanitizeAiText(b),
      technicalInterpretation: sanitizeAiText(c),
    };
  } catch {
    return null;
  }
}

/** JSON 解析失败时：全文暂置「先观其应」一层，以免页面空白 */
export function fallbackPreCheckFromRaw(raw: string): PreCheckStructuredResult {
  return {
    plainValidationSummary: sanitizeAiText(raw),
    reasoningExplanation: "",
    technicalInterpretation: "",
  };
}
