import type {
  PostAnalysisDetailSection,
  PostAnalysisStructuredResult,
} from "@/lib/storage/types";
import { sanitizeAiText } from "@/utils/sanitizeAiText";

const DEFAULT_SUMMARY_TITLE = "先陈其势";
const DEFAULT_REASONING_TITLE = "再释其由";

function normalizeDetailSections(raw: unknown): PostAnalysisDetailSection[] {
  if (!Array.isArray(raw)) return [];
  const out: PostAnalysisDetailSection[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const title = rec.title;
    const content = rec.content;
    if (typeof title !== "string" || typeof content !== "string") continue;
    const t = title.trim();
    const c = content.trim();
    if (!t || !c) continue;
    out.push({
      title: sanitizeAiText(t),
      content: sanitizeAiText(c),
    });
  }
  return out.slice(0, 5);
}

function stripJsonFence(raw: string): string {
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  return s;
}

function extractJsonObject(raw: string): string | null {
  const s = stripJsonFence(raw);
  const directStart = s.indexOf("{");
  const directEnd = s.lastIndexOf("}");
  if (directStart < 0 || directEnd <= directStart) return null;
  return s.slice(directStart, directEnd + 1).trim();
}

function parseJsonLike(raw: string): unknown {
  const candidates = [stripJsonFence(raw), extractJsonObject(raw)].filter(
    (s): s is string => Boolean(s)
  );

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (typeof parsed === "string") {
        try {
          return JSON.parse(parsed);
        } catch {
          return parsed;
        }
      }
      return parsed;
    } catch {
      /* try next */
    }
  }

  return null;
}

function extractStringField(raw: string, key: string): string {
  const pattern = new RegExp(`"${key}"\\s*:\\s*"([\\s\\S]*?)"\\s*(?:,\\s*"|\\n\\s*[,}])`);
  const match = raw.match(pattern);
  if (!match?.[1]) return "";
  try {
    return JSON.parse(`"${match[1]}"`);
  } catch {
    return match[1].replace(/\\"/g, '"').replace(/\\n/g, "\n").trim();
  }
}

function parseByFieldExtraction(
  raw: string
): Omit<PostAnalysisStructuredResult, "summaryTitle" | "reasoningTitle"> | null {
  const source = extractJsonObject(raw) ?? stripJsonFence(raw);
  const summaryText = sanitizeAiText(extractStringField(source, "summaryText"));
  const reasoningText = sanitizeAiText(extractStringField(source, "reasoningText"));
  if (!summaryText.trim() || !reasoningText.trim()) return null;

  const sections: PostAnalysisDetailSection[] = [];
  const itemPattern =
    /\{\s*"title"\s*:\s*"([\s\S]*?)"\s*,\s*"content"\s*:\s*"([\s\S]*?)"\s*\}/g;
  for (const match of source.matchAll(itemPattern)) {
    const titleRaw = match[1] ?? "";
    const contentRaw = match[2] ?? "";
    const decode = (s: string) => {
      try {
        return JSON.parse(`"${s}"`) as string;
      } catch {
        return s.replace(/\\"/g, '"').replace(/\\n/g, "\n");
      }
    };
    const title = sanitizeAiText(decode(titleRaw));
    const content = sanitizeAiText(decode(contentRaw));
    if (title.trim() && content.trim()) {
      sections.push({ title, content });
    }
  }

  return {
    summaryText,
    reasoningText,
    detailedSections: sections.slice(0, 5),
  };
}

/**
 * 解析走势分析模型返回：裸 JSON 或 ```json ... ```。
 */
export function parsePostAnalysisStructuredContent(
  raw: string
): Omit<PostAnalysisStructuredResult, "summaryTitle" | "reasoningTitle"> | null {
  try {
    const o = parseJsonLike(raw);
    if (!o || typeof o !== "object") return parseByFieldExtraction(raw);
    const rec = o as Record<string, unknown>;
    const summaryText = rec.summaryText;
    const reasoningText = rec.reasoningText;
    if (typeof summaryText !== "string" || typeof reasoningText !== "string") {
      return parseByFieldExtraction(raw);
    }
    const st = sanitizeAiText(summaryText);
    const rt = sanitizeAiText(reasoningText);
    if (!st.trim() || !rt.trim()) return parseByFieldExtraction(raw);
    const sections = normalizeDetailSections(rec.detailedSections);
    return {
      summaryText: st,
      reasoningText: rt,
      detailedSections: sections,
    };
  } catch {
    return parseByFieldExtraction(raw);
  }
}

export function finalizePostAnalysisResult(
  partial: Omit<PostAnalysisStructuredResult, "summaryTitle" | "reasoningTitle"> | null,
  rawFallback: string
): PostAnalysisStructuredResult {
  const text = sanitizeAiText(rawFallback);

  if (
    partial &&
    partial.summaryText.trim() &&
    partial.reasoningText.trim()
  ) {
    let sections = partial.detailedSections.filter(
      (s) => s.title.trim() && s.content.trim()
    );
    if (sections.length > 5) sections = sections.slice(0, 5);
    if (sections.length === 0) {
      sections = [
        {
          title: "卦旨缕述",
          content: [partial.reasoningText.trim(), partial.summaryText.trim()]
            .filter(Boolean)
            .join("\n\n"),
        },
      ];
    }
    if (sections.length === 1) {
      sections = [
        sections[0],
        {
          title: "象外余思",
          content:
            "卦中细义，贵在会心；上文所陈，可与所问之事逐句参较。若与日用未尽相合，亦当以实事为正，勿执辞害意。",
        },
      ];
    }
    return {
      summaryTitle: DEFAULT_SUMMARY_TITLE,
      summaryText: partial.summaryText,
      reasoningTitle: DEFAULT_REASONING_TITLE,
      reasoningText: partial.reasoningText,
      detailedSections: sections,
    };
  }

  return {
    summaryTitle: DEFAULT_SUMMARY_TITLE,
    summaryText: text,
    reasoningTitle: DEFAULT_REASONING_TITLE,
    reasoningText: "",
    detailedSections: text.trim()
      ? [{ title: "卦旨缕述", content: text }]
      : [],
  };
}

/** 注入追问、日志等用的扁平正文 */
export function formatPostAnalysisForContext(
  r: PostAnalysisStructuredResult
): string {
  const parts = [
    `【${r.summaryTitle}】`,
    r.summaryText.trim(),
    "",
    `【${r.reasoningTitle}】`,
    r.reasoningText.trim(),
    "",
    "【细参卦旨】",
  ];
  for (const sec of r.detailedSections) {
    parts.push("");
    parts.push(`「${sec.title}」`);
    parts.push(sec.content.trim());
  }
  return parts.join("\n").trim();
}
