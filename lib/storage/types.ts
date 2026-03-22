import type { AnalyzeDivinationResult } from "@/lib/llm/types";
import type { UserQuestionInput } from "@/types/divination";
import type { DivinationResult } from "@/types/divination";
import type { LiuyaoBoard } from "@/types/liuyao-board";
import type { DivinationMethod, CoinSide } from "@/lib/divination-methods";

/** 前事验证后、后续分析前的补述消息（存于会话，供后续 DeepSeek 注入） */
export type PreAnalysisFeedbackMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export type PreAnalysisFeedbackBundle = {
  messages: PreAnalysisFeedbackMessage[];
  /** 用户侧补述汇总（便于 prompt 与调试） */
  summary: string;
};

export interface StoredDivinationSession {
  id: string;
  userInput: UserQuestionInput;
  divination: DivinationResult;
  /** 起卦方式（铜钱/日期/数字/手动） */
  method?: DivinationMethod;
  /** 起卦输入（用于前事/分析/追问的上下文复用） */
  rawInput?: {
    dateTime?: string;
    calendar?: "lunar";
    numberInput?: string;
    manualCoins?: CoinSide[][];
    // 兼容旧版本字段（当前界面可能已不再使用）
    numbers?: [number, number, number];
  };
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

  /** 前事验证（先观应象）模型输出正文，供后续分析引用 */
  preCheckResultText?: string;

  /** 用户对前验的补述与校正 */
  preAnalysisFeedback?: PreAnalysisFeedbackBundle;

  userRating?: number;
  userFeedback?: string;
  editedAnswer?: string;
  finalSelectedAnswer?: string;
}

