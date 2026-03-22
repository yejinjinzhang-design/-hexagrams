"use client";

import { useCallback, useState } from "react";
import { trackEvent } from "@/lib/analytics/client";
import type { PreAnalysisFeedbackMessage } from "@/lib/storage/types";
import { FeedbackInputBox } from "./FeedbackInputBox";
import { FeedbackMessageList } from "./FeedbackMessageList";

/** 单会话内用户侧补述条数上限（与系统应答轮次对应） */
export const MAX_PRE_ANALYSIS_USER_TURNS = 3;

const ACK_AFTER_USER: [string, string, string] = [
  "此条已记下。若还有未尽之处，可再述一二；若无，便可续断其后。",
  "又一条已录。前情渐明，可再补一句，或直接续断其后。",
  "补述已足，可先据此续断其后；若仍有多端，卦成之后再问亦可。",
];

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

type PreAnalysisFeedbackSectionProps = {
  disabled?: boolean;
  messages: PreAnalysisFeedbackMessage[];
  onMessagesChange: (next: PreAnalysisFeedbackMessage[]) => void;
  /** 用于埋点关联占卦会话 */
  divinationSessionId?: string;
};

export function PreAnalysisFeedbackSection({
  disabled,
  messages,
  onMessagesChange,
  divinationSessionId,
}: PreAnalysisFeedbackSectionProps) {
  const [input, setInput] = useState("");

  const userTurns = messages.filter((m) => m.role === "user").length;
  const maxReached = userTurns >= MAX_PRE_ANALYSIS_USER_TURNS;

  const appendRound = useCallback(
    (userText: string) => {
      const now = new Date().toISOString();
      const userMsg: PreAnalysisFeedbackMessage = {
        id: newId("user"),
        role: "user",
        content: userText,
        createdAt: now,
      };
      const ackIndex = Math.min(userTurns, ACK_AFTER_USER.length - 1);
      const assistantMsg: PreAnalysisFeedbackMessage = {
        id: newId("asst"),
        role: "assistant",
        content: ACK_AFTER_USER[ackIndex],
        createdAt: now,
      };
      onMessagesChange([...messages, userMsg, assistantMsg]);
    },
    [messages, onMessagesChange, userTurns]
  );

  const handleSend = () => {
    const t = input.trim();
    if (!t || maxReached || disabled) return;
    trackEvent("pre_feedback_submitted", {
      metadata: {
        divination_session_id: divinationSessionId,
        round: userTurns + 1,
        content_len: t.length,
      },
    });
    appendRound(t);
    setInput("");
  };

  return (
    <section className="w-full max-w-[1120px] rounded-[16px] border border-[#E5D8C7] bg-[#F6EFE3] p-4 text-xs text-[#3A2F26] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] md:mx-auto md:p-5">
      <header className="mb-3 border-b border-[#E2D3BF] pb-2">
        <h2 className="font-ritual-title text-sm font-medium tracking-[0.2em] text-[#5c3a2a] md:text-[15px]">
          前情补述
        </h2>
        <p className="mt-1 text-[11px] leading-relaxed text-[#7a6751]">
          若前事所验未尽贴切，可于此补述一二
        </p>
        <p className="mt-1.5 text-[11px] leading-relaxed text-[#7a6751]">
          补充现状与修正之处，可使后续分析更贴近实际
        </p>
      </header>

      <FeedbackMessageList messages={messages} />

      <FeedbackInputBox
        value={input}
        onChange={setInput}
        onSubmit={handleSend}
        disabled={disabled}
        maxUserTurnsReached={maxReached}
      />

      {maxReached ? (
        <p className="mt-2 text-[10px] text-[#9a866f]">
          本轮补述已满三则，可先续断其后；未尽之意可俟卦成后再问。
        </p>
      ) : null}

      <p className="mt-3 text-[10px] leading-relaxed text-[#a69378]">
        补充前情后，后续分析会更贴近实际；若不补述，亦可径直续断其后。
      </p>
    </section>
  );
}
