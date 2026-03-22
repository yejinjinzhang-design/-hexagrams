/** 与埋点方案一致的事件名 */
export const ANALYTICS_EVENT_NAMES = [
  "page_view",
  "question_submitted",
  "divination_started",
  "divination_method_selected",
  "line_completed",
  "divination_completed",
  "pre_validation_viewed",
  "pre_feedback_submitted",
  "analysis_viewed",
  "followup_chat_used",
  "reset_divination",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];

export type AnalyticsEventRecord = {
  id: string;
  visitor_id: string;
  session_id: string;
  event_name: AnalyticsEventName;
  page: string;
  event_time: string;
  /** JSON 字符串，便于 JSONL 存储 */
  metadata: string;
};

export type AnalyticsEventInput = {
  visitor_id: string;
  session_id: string;
  event_name: AnalyticsEventName;
  page: string;
  event_time: string;
  metadata?: Record<string, unknown>;
};
