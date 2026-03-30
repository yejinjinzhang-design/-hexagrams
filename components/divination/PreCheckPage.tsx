"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics/client";
import { buildPreAnalysisFeedbackSummary } from "@/lib/pre-analysis-feedback";
import type {
  PreAnalysisFeedbackBundle,
  PreAnalysisFeedbackMessage,
  PreCheckStructuredResult,
} from "@/lib/storage/types";
import { PreAnalysisFeedbackSection } from "@/components/divination/pre-analysis-feedback";

interface PreCheckPageProps {
  sessionId: string;
  /** 若会话中已有补述（例如返回同页），用于还原 */
  initialPreAnalysisFeedback?: PreAnalysisFeedbackBundle | null;
  onConfirm: () => void;
  onRestart: () => void;
}

function SectionShell({
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
  /** 开篇总势：略放大字号与行距，突出信息权重 */
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
            : "text-[11px] leading-relaxed text-[#4a3d32] md:text-[12px]"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

export function PreCheckPage({
  sessionId,
  initialPreAnalysisFeedback,
  onConfirm,
  onRestart,
}: PreCheckPageProps) {
  const stripFullStop = (s: string) => s.replaceAll("。", "");

  const [preCheck, setPreCheck] = useState<PreCheckStructuredResult | null>(
    null
  );
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
        const data = (await res.json()) as {
          preCheck?: PreCheckStructuredResult;
          text?: string;
        };
        if (cancelled) return;
        if (data.preCheck) {
          setPreCheck(data.preCheck);
        } else if (data.text?.trim()) {
          setPreCheck({
            plainValidationSummary: data.text.trim(),
            reasoningExplanation: "",
            technicalInterpretation: "",
          });
        } else {
          setPreCheck(null);
        }
      } catch {
        if (cancelled) return;
        setPreCheck(null);
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
    if (loading || !preCheck || preValidationTracked.current) return;
    preValidationTracked.current = true;
    trackEvent("pre_validation_viewed", { metadata: { sessionId } });
  }, [loading, preCheck, sessionId]);

  const bodyContent = (() => {
    if (loading) {
      return (
        <SectionShell
          title="先观其应"
          subtitle="卦气未凝，稍待其显……"
          emphasis
          lead
        >
          <p className="text-[#7a6751]">请少待</p>
        </SectionShell>
      );
    }
    if (!preCheck) {
      return (
        <SectionShell
          title="先观其应"
          subtitle="象已成而辞未至，或可稍候再观"
          emphasis
          lead
        >
          <p className="text-[#7a6751]">
            前象一时未能载入，可刷新此页，或返而重起一卦
          </p>
        </SectionShell>
      );
    }
    const {
      plainValidationSummary,
      reasoningExplanation,
      technicalInterpretation,
    } =
      preCheck;
    return (
      <div className="space-y-3">
        <SectionShell
          title="先观其应"
          subtitle="先就所问之事，照见已成之象"
          emphasis
          lead
        >
          {plainValidationSummary.trim() ? (
            stripFullStop(plainValidationSummary)
          ) : (
            <span className="text-[#8C7A6B]">（此层暂未陈辞）</span>
          )}
        </SectionShell>

        <SectionShell
          title="再明其理"
          subtitle="卦中所以如此，略陈其机"
        >
          {reasoningExplanation.trim() ? (
            stripFullStop(reasoningExplanation)
          ) : (
            <span className="text-[#8C7A6B]">
              （此层书辞从简，细旨见下）
            </span>
          )}
        </SectionShell>

        <details className="group rounded-md border border-[#D4C4A8]/90 bg-[#f4ead8]/80">
          <summary className="cursor-pointer list-none px-3 py-2.5 font-ritual-title text-[11px] font-medium tracking-[0.15em] text-[#6b5235] transition-colors marker:content-none md:px-4 md:text-[12px] [&::-webkit-details-marker]:hidden">
            <span className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
              <span className="inline-flex items-center gap-1.5">
                <span>细参卦旨</span>
                <span className="text-[#C6A46C] transition-transform group-open:rotate-90 sm:inline">
                  ›
                </span>
              </span>
              <span className="text-[10px] font-normal tracking-normal text-[#9a8a78] sm:pl-0">
                此中多涉术数，欲深观者再启即可
              </span>
            </span>
          </summary>
          <p className="border-b border-[#E5D8C7]/60 px-3 pb-2 pt-1 text-[10px] leading-relaxed text-[#9a8a78] md:px-4">
            动静生克，世应往来，皆可于此续观
          </p>
          <div className="px-3 py-3 text-[11px] leading-relaxed text-[#4a3d32] md:px-4 md:text-[12px] md:leading-[1.75] whitespace-pre-wrap">
            {technicalInterpretation.trim() ? (
              stripFullStop(technicalInterpretation)
            ) : (
              <span className="text-[#8C7A6B]">（此下暂未缕析）</span>
            )}
          </div>
        </details>
      </div>
    );
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
      <section className="w-full rounded-[16px] border border-[#E5D8C7] bg-[#F8F3EA] p-4 text-xs text-[#3A2F26] md:mx-auto md:p-5">
        <div className="flex flex-col gap-0.5 border-b border-[#E5D8C7]/60 pb-3">
          <h2 className="font-ritual-title text-sm font-medium tracking-[0.2em] text-[#5c3a2a] md:text-[15px]">
            先观应象
          </h2>
          <p className="text-[11px] leading-relaxed text-[#7a6751] md:text-[12px]">
            先照其象，再明其理；若欲深参，可续观其解
          </p>
        </div>

        <div className="mt-4 space-y-3">{bodyContent}</div>
      </section>

      <PreAnalysisFeedbackSection
        disabled={loading}
        messages={feedbackMessages}
        onMessagesChange={setFeedbackMessages}
        divinationSessionId={sessionId}
      />

      <div className="relative flex flex-col items-stretch gap-3 rounded-[14px] bg-[#faf6ee]/95 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] md:flex-row md:justify-center md:px-4 md:py-4">
        <button
          type="button"
          onClick={() => void handleConfirm()}
          disabled={loading || continuing}
          className="inline-flex h-11 w-full items-center justify-center whitespace-nowrap rounded-full bg-[#C6A46C] px-6 py-[10px] text-center text-[14px] font-semibold tracking-[0.04em] text-[#2e2418] shadow-[0_2px_8px_rgba(62,49,39,0.12)] transition-all hover:bg-[#B89459] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed md:w-auto md:min-w-[240px]"
        >
          {continuing ? "正在收纳前情…" : "与我所处相合，可再断其后"}
        </button>
        <button
          type="button"
          onClick={onRestart}
          disabled={continuing}
          className="inline-flex h-11 w-full items-center justify-center whitespace-nowrap rounded-full border border-[#b8925a] bg-[#fffdf8] px-6 py-[10px] text-center text-[14px] font-medium tracking-[0.04em] text-[#3A2F26] transition-all hover:bg-[#f5ecdf] disabled:opacity-50 md:w-auto md:min-w-[240px]"
        >
          所应未显之象，可再起一卦
        </button>
      </div>
    </div>
  );
}
