"use client";

import type { PreAnalysisFeedbackMessage } from "@/lib/storage/types";

type FeedbackMessageListProps = {
  messages: PreAnalysisFeedbackMessage[];
};

export function FeedbackMessageList({ messages }: FeedbackMessageListProps) {
  return (
    <div className="mb-3">
      <div className="max-h-[220px] space-y-2.5 overflow-y-auto rounded-[12px] border border-[#E8DCC8]/80 bg-[#FAF5EB] px-3 py-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[88%] rounded-[11px] px-3 py-2 text-[11px] leading-relaxed ${
                m.role === "user"
                  ? "bg-[#E0D0B0] text-[#2e241c]"
                  : "bg-[#FDF9F1] text-[#5c4a38] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
