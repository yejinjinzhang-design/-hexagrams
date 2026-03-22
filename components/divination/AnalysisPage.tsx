"use client";

import { useEffect, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics/client";
import { FollowUpChatSection } from "./FollowUpChatSection";

interface AnalysisPageProps {
  sessionId: string;
}

export function AnalysisPage({ sessionId }: AnalysisPageProps) {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const analysisViewedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      console.log("ANALYSIS request sessionId:", sessionId);
      setLoading(true);
      try {
        const payload = { sessionId };
        console.log("ANALYSIS request payload:", payload);
        const res = await fetch("/api/divination/analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
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

  useEffect(() => {
    if (loading || analysisViewedRef.current) return;
    analysisViewedRef.current = true;
    trackEvent("analysis_viewed", {
      metadata: { divination_session_id: sessionId },
    });
  }, [loading, sessionId]);

  const displayText = (() => {
    if (loading) {
      return "卦意渐展，正在细断其后……";
    }
    if (text && text.trim()) {
      return text;
    }
    return "卦意未尽显，可稍后再观";
  })();

  return (
    <>
      <section className="w-full max-w-[1120px] rounded-[16px] border border-[#E5D8C7] bg-[#F8F3EA] p-4 text-xs text-[#3A2F26] md:mx-auto">
        <h2 className="font-ritual-title text-sm font-medium tracking-[0.2em] text-[#5c3a2a] md:text-[15px]">
          再断其后
        </h2>
        <p className="mt-2 text-[11px] leading-relaxed text-[#7a6751]">
          前象既合，方可再推其后
          <br className="hidden md:block" />
          从用神、世应、动爻细看此事趋向
        </p>

        <div className="mt-4 space-y-2 rounded-md bg-[#f7efe0] px-4 py-3 text-[11px] leading-relaxed text-[#5c4a38] md:px-5 md:py-4 whitespace-pre-wrap">
          {displayText}
        </div>
      </section>

      <div className="mt-6">
        <FollowUpChatSection sessionId={sessionId} />
      </div>
    </>
  );
}

