import type { AnalyzeDivinationResult } from "@/lib/llm/types";
import type { UserQuestionInput } from "@/types/divination";
import type { DivinationResult } from "@/types/divination";
import type { LiuyaoBoard } from "@/types/liuyao-board";

export interface StoredDivinationSession {
  id: string;
  userInput: UserQuestionInput;
  divination: DivinationResult;
  /** 完整排盘（纳甲、六亲、六神、卦宫等），有则结果页展示传统两列表格 */
  board?: LiuyaoBoard;
  /** AI 提供方（可能尚未完成分析时为空） */
  provider?: AnalyzeDivinationResult["model"]["provider"];
  /** 使用的模型名称（可能尚未完成分析时为空） */
  model?: string;
  /** 提示词版本（可能尚未完成分析时为空） */
  promptVersion?: string;
  /** AI 解析结果（后台计算过程中可能为 undefined） */
  aiResult?: AnalyzeDivinationResult["analysis"];
  rawText?: string;
  createdAt: string;

  userRating?: number;
  userFeedback?: string;
  editedAnswer?: string;
  finalSelectedAnswer?: string;
}

