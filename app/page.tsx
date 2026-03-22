"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics/client";
import type { Gender } from "@/types/divination";

export default function HomePage() {
  const router = useRouter();
  const [birthYear, setBirthYear] = useState("");
  const [gender, setGender] = useState<string>("");
  const [question, setQuestion] = useState("");
  const [showQuestionHint, setShowQuestionHint] = useState(false);
  const [toastText, setToastText] = useState<string | null>(null);
  const questionRef = useRef<HTMLTextAreaElement | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      setShowQuestionHint(true);
      setToastText("将心中所问写下，卦方可应");
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
      toastTimerRef.current = window.setTimeout(() => {
        setToastText(null);
        toastTimerRef.current = null;
      }, 2000);
      if (questionRef.current) {
        questionRef.current.focus();
      }
      return;
    }

    const params = new URLSearchParams();
    const yearNum = Number(birthYear);
    if (Number.isInteger(yearNum) && birthYear.trim() !== "") {
      params.set("birthYear", String(yearNum));
    }
    if (gender) {
      params.set("gender", gender as Gender);
    }
    params.set("question", trimmedQuestion);

    trackEvent("question_submitted", {
      metadata: {
        question_len: trimmedQuestion.length,
        has_birth_year: Boolean(birthYear.trim()),
        gender: gender || undefined,
      },
    });

    router.push(`/divination?${params.toString()}`);
  };

  const canSubmit = question.trim().length > 0;

  return (
    <div className="mx-auto min-h-screen w-full max-w-[1200px] px-4 md:px-5">
      {toastText && (
        <div className="pointer-events-none fixed left-1/2 top-16 z-50 -translate-x-1/2 px-4">
          <div className="rounded-full border border-[#e0d2b8] bg-[#3b2f2f]/70 px-4 py-2 text-[12px] tracking-[0.08em] text-[#fff9ee] shadow-[0_10px_26px_rgba(0,0,0,0.18)] backdrop-blur">
            {toastText}
          </div>
        </div>
      )}
      <section className="mb-10 space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="font-ritual-title text-[26px] font-semibold tracking-[0.25em] text-[#3e3127] md:text-[30px]">
              六爻起卦
            </h1>
          </div>
        </div>
      </section>

      <section className="rounded-[16px] border border-[#E5D8C7] bg-[#F8F3EA] p-5 shadow-[0_14px_44px_rgba(0,0,0,0.04)] md:rounded-[22px] md:px-9 md:py-8">
        <header className="mb-4 flex items-baseline justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[#3e3127] md:text-lg">
              问卦者
            </h2>
            <p className="mt-2 text-xs text-[#8C7A6B] md:text-[13px]">
              卦随人念而生
            </p>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs text-[#4a3a2a] md:text-sm">
                出生年份
              </label>
              <input
                type="number"
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                placeholder="如：1993"
                className="w-full border-b border-dashed border-[#d7c3a7] bg-transparent px-0 pb-1 text-sm text-[#3e3127] outline-none focus:border-solid focus:border-[#C6A46C]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-[#4a3a2a] md:text-sm">
                性别
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "male", label: "男" },
                  { value: "female", label: "女" },
                  { value: "other", label: "其他 / 不便说明" },
                ].map((opt) => {
                  const selected = gender === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setGender((prev) =>
                          prev === opt.value ? "" : opt.value
                        )
                      }
                      className={`rounded-full border px-3 py-1 text-[11px] ${
                        selected
                          ? "border-[#c5883a] bg-[#f4e4c9] text-[#5c3a2a]"
                          : "border-[#d8c7a6] bg-transparent text-[#5c4a38] hover:bg-[#f5efe4]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-[#4a3a2a] md:text-sm">
              此刻心中所问
            </label>
            <textarea
              ref={questionRef}
              value={question}
              onChange={(e) => {
                setQuestion(e.target.value);
                if (showQuestionHint && e.target.value.trim()) {
                  setShowQuestionHint(false);
                }
              }}
              rows={4}
              placeholder={"将心中所问写下\n一事一念，卦自有应"}
              className="w-full rounded-xl border border-[#E5D8C7] bg-[#FDF7EC] px-3 py-2 text-sm text-[#3e3127] outline-none focus:border-[#C6A46C]"
            />
            <p className="text-[11px] leading-relaxed text-[#a28f73]">
              问意若明，卦象自清；问意若散，卦意亦难聚
            </p>
            {showQuestionHint && (
              <p className="text-[11px] leading-relaxed text-[#b2613c]">
                心意未明，卦象难清，请先写下此刻真正所求之事，再轻按起卦
              </p>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className={`inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-medium md:text-base ${
                canSubmit
                  ? "bg-[#C6A46C] text-[#fff9ee] shadow-[0_10px_26px_rgba(198,164,108,0.35)] hover:brightness-105"
                  : "bg-[#d9cbb1] text-[#f5efe4] opacity-60 cursor-not-allowed"
              }`}
            >
              静心片刻 · 起卦
            </button>
          </div>

        </form>
      </section>
    </div>
  );
}

