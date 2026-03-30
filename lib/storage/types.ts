import type { AnalyzeDivinationResult } from "@/lib/llm/types";
import type { UserQuestionInput } from "@/types/divination";
import type { DivinationResult } from "@/types/divination";
import type { LiuyaoBoard } from "@/types/liuyao-board";
import type { DivinationMethod, CoinSide } from "@/lib/divination-methods";
import type { CastTimeContext } from "@/lib/time/cast-timezone";

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

/** 「再断其后」分层：先势 / 再因 / 细参（动态小节） */
export type PostAnalysisDetailSection = {
  title: string;
  content: string;
};

export type PostAnalysisStructuredResult = {
  summaryTitle: string;
  summaryText: string;
  reasoningTitle: string;
  reasoningText: string;
  detailedSections: PostAnalysisDetailSection[];
};

/** 「验证前事」分层输出（模型 JSON → 前端分区展示） */
export type PreCheckStructuredResult = {
  /** 第一层：先观其应式前情总览，高密度、少术数专名 */
  plainValidationSummary: string;
  /** 第二层：为何如此判断；可有少量爻象术语，须配白话 */
  reasoningExplanation: string;
  /** 第三层：术数细解，可按动爻/世应/月日/五行分段 */
  technicalInterpretation: string;
};

export interface StoredDivinationSession {
  id: string;
  userInput: UserQuestionInput;
  divination: DivinationResult;
  /** 起卦方式（铜钱/日期/数字/手动） */
  method?: DivinationMethod;
  /**
   * 起卦瞬时点与元数据（由前端生成，服务端只存照；排盘与展示均基于 timestampIso / timestampMs）
   */
  castTimeContext?: CastTimeContext;

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

  /**
   * 前事验证结构化输出：白话结论 / 因何如此 / 术数细解
   * 供结果页分层展示；`preCheckResultText` 为其扁平拼接，供后续分析 API 注入
   */
  preCheckResult?: PreCheckStructuredResult;

  /** 前事验证扁平正文（由 preCheckResult 生成或与旧版兼容的纯文本） */
  preCheckResultText?: string;

  /** 用户对前验的补述与校正 */
  preAnalysisFeedback?: PreAnalysisFeedbackBundle;

  /** 走势分析结构化结果（再断其后） */
  postAnalysisResult?: PostAnalysisStructuredResult;
  /** 走势分析扁平正文，供追问 API 等注入 */
  postAnalysisFlatText?: string;

  userRating?: number;
  userFeedback?: string;
  editedAnswer?: string;
  finalSelectedAnswer?: string;
}

