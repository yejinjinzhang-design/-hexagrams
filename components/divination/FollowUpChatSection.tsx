"use client";

import { useState } from "react";
import { trackEvent } from "@/lib/analytics/client";

interface FollowUpChatSectionProps {
  sessionId: string;
}

type ChatRole = "user" | "assistant";

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
}

const SUGGESTED_QUESTIONS: string[] = [
  "此事何时见分晓？",
  "眼下最大的阻碍是什么？",
  "我是否应主动一步？",
  "对方心意究竟如何？",
  "此事后续是否有转机？",
  "我此刻最该避开什么？",
  "若继续推进，结果如何？",
  "此卦所示，利我还是损我？",
];

export function FollowUpChatSection({ sessionId }: FollowUpChatSectionProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "卦意已陈，若仍有未决，可继续参问。",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = {
      id: `local-user-${Date.now()}`,
      role: "user",
      content: trimmed,
    };

    const historyForApi = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/divination/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          question: trimmed,
          history: historyForApi,
        }),
      });

      const data = (await res.json()) as { text: string };
      const text = (data.text || "").trim();

      trackEvent("followup_chat_used", {
        metadata: {
          divination_session_id: sessionId,
          question_len: trimmed.length,
        },
      });

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: text || "卦意未尽显，可稍后再观。",
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e) {
      const assistantMsg: ChatMessage = {
        id: `assistant-error-${Date.now()}`,
        role: "assistant",
        content: "此刻难以细参，稍后再问亦可。",
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleChipClick = (q: string) => {
    setInput(q);
  };

  return (
    <section className="w-full max-w-[1120px] rounded-[16px] border border-[#E5D8C7] bg-[#F4ECDF] p-4 text-xs text-[#3A2F26] md:mx-auto md:p-5">
      <header className="mb-3 border-b border-[#E2D3BF] pb-2">
        <h2 className="font-ritual-title text-sm font-medium tracking-[0.2em] text-[#5c3a2a] md:text-[15px]">
          卦后追问
        </h2>
        <p className="mt-1 text-[11px] leading-relaxed text-[#7a6751]">
          对此卦还有何疑问，可继续参问
        </p>
      </header>

      {/* 推荐追问 chips */}
      <div className="mb-3 flex flex-wrap gap-2">
        {SUGGESTED_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => handleChipClick(q)}
            className="rounded-full border border-[#D7C6AA] bg-[#F8F1E4] px-3 py-1 text-[11px] text-[#7a6751] hover:bg-[#F0E4D1] transition-colors"
          >
            {q}
          </button>
        ))}
      </div>

      {/* 消息列表 */}
      <div className="mb-3 max-h-64 space-y-2 overflow-y-auto rounded-[12px] bg-[#F9F3E6] px-3 py-2">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${
              m.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-[10px] px-3 py-2 text-[11px] leading-relaxed ${
                m.role === "user"
                  ? "bg-[#E8D9BF] text-[#3A2F26]"
                  : "bg-[#FDF8ED] text-[#4A3827]"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
      </div>

      {/* 输入区 */}
      <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-end">
        <div className="flex-1">
          <textarea
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="对此卦还有何疑问？"
            className="w-full resize-none rounded-[10px] border border-[#D7C6AA] bg-[#FBF5EB] px-3 py-2 text-[11px] text-[#3A2F26] placeholder:text-[#B09A82] focus:border-[#C6A46C] focus:outline-none focus:ring-0"
          />
        </div>
        <button
          type="button"
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="mt-1 inline-flex h-9 items-center justify-center rounded-full bg-[#C6A46C] px-4 text-[11px] font-medium text-[#fff9ee] shadow-[0_4px_12px_rgba(198,164,108,0.25)] transition-colors hover:bg-[#B38B43] disabled:cursor-not-allowed disabled:bg-[#D5C3A4] md:mt-0"
        >
          {loading ? "参问中…" : "继续参问"}
        </button>
      </div>
    </section>
  );
}

