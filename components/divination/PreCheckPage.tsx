"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics/client";
import { buildPreAnalysisFeedbackSummary } from "@/lib/pre-analysis-feedback";
import type {
  PreAnalysisFeedbackBundle,
  PreAnalysisFeedbackMessage,
} from "@/lib/storage/types";
import { PreAnalysisFeedbackSection } from "@/components/divination/pre-analysis-feedback";

interface PreCheckPageProps {
  sessionId: string;
  /** 若会话中已有补述（例如返回同页），用于还原 */
  initialPreAnalysisFeedback?: PreAnalysisFeedbackBundle | null;
  onConfirm: () => void;
  onRestart: () => void;
}

export function PreCheckPage({
  sessionId,
  initialPreAnalysisFeedback,
  onConfirm,
  onRestart,
}: PreCheckPageProps) {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [continuing, setContinuing] = useState(false);
  const preValidationTracked = useRef(false);

  const [feedbackMessages, setFeedbackMessages] = useState<
    PreAnalysisFeedbackMessage[]
  >(() =>
    initialPreAnalysisFeedback?.messages?.length
      ? initialPreAnalysisFeedback.messages
      : []
  );

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/divination/precheck", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const data = (await res.json()) as { text: string };
        if (cancelled) return;
        setText(data.text);
      } catch {
        if (cancelled) return;
        setText(null);
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const displayText = (() => {
    if (loading) {
      return "卦象渐明，正在细观应象……";
    }
    if (text && text.trim()) {
      return text;
    }
    return "卦已成象，其意未显，可稍候再观";
  })();

  const handleConfirm = useCallback(async () => {
    if (loading || continuing) return;
    setContinuing(true);
    try {
      const summary = buildPreAnalysisFeedbackSummary(feedbackMessages);
      const bundle: PreAnalysisFeedbackBundle = {
        messages: feedbackMessages,
        summary,
      };
      const res = await fetch("/api/analyze", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, preAnalysisFeedback: bundle }),
      });
      if (!res.ok) {
        console.error("PATCH preAnalysisFeedback failed", await res.text());
      }
      onConfirm();
    } catch (e) {
      console.error(e);
      onConfirm();
    } finally {
      setContinuing(false);
    }
  }, [continuing, feedbackMessages, loading, onConfirm, sessionId]);

  return (
    <div className="mx-auto w-full max-w-[1120px] space-y-5">
      <section className="w-full rounded-[16px] border border-[#E5D8C7] bg-[#F8F3EA] p-4 text-xs text-[#3A2F26] md:mx-auto">
        <h2 className="font-ritual-title text-sm font-medium tracking-[0.2em] text-[#5c3a2a] md:text-[15px]">
          先观应象
        </h2>
        <p className="mt-2 text-[11px] leading-relaxed text-[#7a6751]">
          卦先照见当下，再言后势；若其应相合，方可细断其后
        </p>

        <div className="mt-4 min-h-[74px] space-y-2 rounded-md border border-[#E5D8C7]/70 bg-[#f7efe0] px-4 py-3 text-[11px] leading-relaxed text-[#5c4a38] md:px-5 md:py-4 whitespace-pre-wrap">
          {displayText}
        </div>
      </section>

      <PreAnalysisFeedbackSection
        disabled={loading}
        messages={feedbackMessages}
        onMessagesChange={setFeedbackMessages}
        divinationSessionId={sessionId}
      />

      <div className="flex flex-col items-stretch gap-3 md:flex-row md:justify-center">
        <button
          type="button"
          onClick={() => void handleConfirm()}
          disabled={loading || continuing}
          className="inline-flex h-11 w-full items-center justify-center whitespace-nowrap rounded-full bg-[#C6A46C] px-6 py-[10px] text-center text-[14px] font-medium tracking-[0.05em] text-white transition-all hover:bg-[#B89459] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed md:w-auto md:min-w-[240px]"
        >
          {continuing ? "正在收纳前情…" : "与我所处相合，可再断其后"}
        </button>
        <button
          type="button"
          onClick={onRestart}
          disabled={continuing}
          className="inline-flex h-11 w-full items-center justify-center whitespace-nowrap rounded-full border border-[#C6A46C] bg-transparent px-6 py-[10px] text-center text-[14px] text-[#8B6B3F] transition-all hover:bg-[rgba(198,164,108,0.08)] disabled:opacity-50 md:w-auto md:min-w-[240px]"
        >
          所应未显之象，可再起一卦
        </button>
      </div>
    </div>
  );
}
