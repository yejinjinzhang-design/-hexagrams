"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics/client";
import type { PostAnalysisStructuredResult } from "@/lib/storage/types";
import { FollowUpChatSection } from "./FollowUpChatSection";

interface AnalysisPageProps {
  sessionId: string;
}

function LayerBlock({
  title,
  subtitle,
  children,
  emphasis,
  lead,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  emphasis?: boolean;
  lead?: boolean;
}) {
  return (
    <div
      className={`rounded-md border px-3 py-3 md:px-4 md:py-3.5 ${
        emphasis
          ? "border-[#D4C4A8] bg-[#faf6ee] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]"
          : "border-[#E5D8C7]/80 bg-[#f7efe0]/90"
      } ${lead ? "md:py-4" : ""}`}
    >
      <h3 className="font-ritual-title text-[12px] font-medium tracking-[0.12em] text-[#5c3a2a] md:text-[13px]">
        {title}
      </h3>
      {subtitle ? (
        <p className="mt-1 text-[10px] leading-relaxed text-[#8C7A6B] md:text-[11px]">
          {subtitle}
        </p>
      ) : null}
      <div
        className={`mt-2.5 whitespace-pre-wrap ${
          lead
            ? "text-[12px] leading-[1.85] text-[#3A2F26] md:text-[13px] md:leading-[1.9]"
            : "text-[11px] leading-relaxed text-[#4a3d32] md:text-[12px] md:leading-[1.75]"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

export function AnalysisPage({ sessionId }: AnalysisPageProps) {
  const [analysis, setAnalysis] = useState<PostAnalysisStructuredResult | null>(
    null
  );
  const [loading, setLoading] = useState<boolean>(true);
  const analysisViewedRef = useRef(false);

  const stripFullStop = (s: string) => s.replaceAll("。", "");

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/divination/analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const data = (await res.json()) as {
          analysis?: PostAnalysisStructuredResult;
          text?: string;
        };
        if (cancelled) return;
        if (data.analysis) {
          setAnalysis(data.analysis);
        } else if (data.text?.trim()) {
          setAnalysis({
            summaryTitle: "先陈其势",
            summaryText: data.text.trim(),
            reasoningTitle: "再释其由",
            reasoningText: "",
            detailedSections: [],
          });
        } else {
          setAnalysis(null);
        }
      } catch {
        if (cancelled) return;
        setAnalysis(null);
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

  const body = (() => {
    if (loading) {
      return (
        <LayerBlock
          title="先陈其势"
          subtitle="卦意渐展，正在细断其后……"
          emphasis
          lead
        >
          <p className="text-[#7a6751]">请少待</p>
        </LayerBlock>
      );
    }
    if (!analysis) {
      return (
        <LayerBlock
          title="先陈其势"
          subtitle="卦意未尽显，可稍后再观"
          emphasis
          lead
        >
          <p className="text-[#7a6751]">
            走势一时未能载入，可刷新此页或稍候再试
          </p>
        </LayerBlock>
      );
    }

    const {
      summaryTitle,
      summaryText,
      reasoningTitle,
      reasoningText,
      detailedSections,
    } = analysis;

    return (
      <div className="space-y-3">
        <LayerBlock
          title={summaryTitle || "先陈其势"}
          subtitle="后势总览，先握其纲"
          emphasis
          lead
        >
          {summaryText.trim() ? (
            stripFullStop(summaryText)
          ) : (
            <span className="text-[#8C7A6B]">（此层暂未陈辞）</span>
          )}
        </LayerBlock>

        {reasoningText.trim() ? (
          <LayerBlock
            title={reasoningTitle || "再释其由"}
            subtitle="卦中所以如此，略陈其机"
          >
            {stripFullStop(reasoningText)}
          </LayerBlock>
        ) : null}

        {detailedSections.length > 0 ? (
          <div className="rounded-md border border-[#D4C4A8]/90 bg-[#f4ead8]/80 px-3 py-3 md:px-4 md:py-3.5">
            <h3 className="font-ritual-title text-[12px] font-medium tracking-[0.12em] text-[#5c3a2a] md:text-[13px]">
              细参卦旨
            </h3>
            <p className="mt-1 text-[10px] leading-relaxed text-[#8C7A6B] md:text-[11px]">
              分节缕析，各就所重；不拘一格，以尽此卦之言
            </p>
            <div className="mt-3 space-y-3">
              {detailedSections.map((sec, idx) => (
                <div
                  key={`${sec.title}-${idx}`}
                  className="rounded-md border border-[#E5D8C7]/70 bg-[#faf6ee]/90 px-3 py-2.5 md:px-3.5 md:py-3"
                >
                  <h4 className="font-ritual-title text-[11px] font-medium tracking-[0.1em] text-[#6b5235] md:text-[12px]">
                    {sec.title}
                  </h4>
                  <div className="mt-2 text-[11px] leading-relaxed text-[#4a3d32] md:text-[12px] md:leading-[1.75] whitespace-pre-wrap">
                    {stripFullStop(sec.content)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    );
  })();

  return (
    <>
      <section className="w-full max-w-[1120px] rounded-[16px] border border-[#E5D8C7] bg-[#F8F3EA] p-4 text-xs text-[#3A2F26] md:mx-auto md:p-5">
        <div className="flex flex-col gap-0.5 border-b border-[#E5D8C7]/60 pb-3">
          <h2 className="font-ritual-title text-sm font-medium tracking-[0.2em] text-[#5c3a2a] md:text-[15px]">
            再断其后
          </h2>
          <p className="text-[11px] leading-relaxed text-[#7a6751] md:text-[12px]">
            前象既合，方可再推其后
          </p>
        </div>

        <div className="mt-4 space-y-3">{body}</div>
      </section>

      <div className="mt-6">
        <FollowUpChatSection sessionId={sessionId} />
      </div>
    </>
  );
}
