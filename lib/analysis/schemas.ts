import { sanitizeAiText } from "@/utils/sanitizeAiText";

/** 与 .env ANALYSIS_* 对应 */
export type AnalysisProviderId = "deepseek" | "gemini";

export function parseProviderId(raw: string | undefined): AnalysisProviderId {
  const s = (raw || "").toLowerCase().trim();
  if (s === "gemini") return "gemini";
  return "deepseek";
}

export function getAnalysisPipelineRoles(): {
  primary: AnalysisProviderId;
  reviewer: AnalysisProviderId;
  judge: AnalysisProviderId;
} {
  return {
    primary: parseProviderId(process.env.ANALYSIS_PRIMARY),
    reviewer: parseProviderId(process.env.ANALYSIS_REVIEWER),
    judge: parseProviderId(process.env.ANALYSIS_JUDGE),
  };
}

/** Gemini 审稿结构化输出 */
export type ReviewFeedbackJson = {
  vagueSpots: string[];
  misalignedSpots: string[];
  overconfidentSpots: string[];
  missingDetails: string[];
  suggestedAdds: string[];
};

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string")
    .map((s) => sanitizeAiText(s).trim())
    .filter(Boolean);
}

export function parseReviewFeedback(raw: string): ReviewFeedbackJson | null {
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  try {
    const o = JSON.parse(s) as unknown;
    if (!o || typeof o !== "object") return null;
    const rec = o as Record<string, unknown>;
    return {
      vagueSpots: asStringArray(rec.vagueSpots),
      misalignedSpots: asStringArray(rec.misalignedSpots),
      overconfidentSpots: asStringArray(rec.overconfidentSpots),
      missingDetails: asStringArray(rec.missingDetails),
      suggestedAdds: asStringArray(rec.suggestedAdds),
    };
  } catch {
    return null;
  }
}

export function reviewToAuditSummary(r: ReviewFeedbackJson): string {
  const parts: string[] = [];
  if (r.vagueSpots.length) {
    parts.push(`空泛处：${r.vagueSpots.slice(0, 4).join("；")}`);
  }
  if (r.misalignedSpots.length) {
    parts.push(`贴题：${r.misalignedSpots.slice(0, 4).join("；")}`);
  }
  if (r.overconfidentSpots.length) {
    parts.push(`过满：${r.overconfidentSpots.slice(0, 3).join("；")}`);
  }
  if (r.missingDetails.length) {
    parts.push(`待补：${r.missingDetails.slice(0, 4).join("；")}`);
  }
  if (r.suggestedAdds.length) {
    parts.push(`可增：${r.suggestedAdds.slice(0, 4).join("；")}`);
  }
  return parts.join("。").trim();
}

export function extractAuditSummaryFromJson(raw: string): {
  jsonWithoutAudit: string;
  auditSummary?: string;
} {
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  try {
    const o = JSON.parse(s) as Record<string, unknown>;
    const audit = o.auditSummary;
    if (typeof audit === "string" && audit.trim()) {
      const { auditSummary: _a, ...rest } = o;
      void _a;
      return {
        jsonWithoutAudit: JSON.stringify(rest),
        auditSummary: sanitizeAiText(audit).trim(),
      };
    }
    return { jsonWithoutAudit: s };
  } catch {
    return { jsonWithoutAudit: s };
  }
}
