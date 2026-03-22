import type { PreAnalysisFeedbackMessage } from "@/lib/storage/types";

/** 从补述消息列表提取用户侧正文，供后续分析 prompt 注入 */
export function buildPreAnalysisFeedbackSummary(
  messages: Pick<PreAnalysisFeedbackMessage, "role" | "content">[] | undefined
): string {
  if (!messages?.length) return "";
  return messages
    .filter((m) => m.role === "user")
    .map((m) => m.content.trim())
    .filter(Boolean)
    .join("\n\n—\n\n");
}
