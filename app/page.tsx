"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Gender } from "@/types/divination";

export default function HomePage() {
  const router = useRouter();
  const [birthYear, setBirthYear] = useState("");
  const [gender, setGender] = useState<Gender>("male");
  const [question, setQuestion] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    const yearNum = Number(birthYear);
    if (Number.isInteger(yearNum) && birthYear.trim() !== "") {
      params.set("birthYear", String(yearNum));
    }
    params.set("gender", gender);
    if (question.trim()) {
      params.set("question", question.trim());
    }

    router.push(`/divination?${params.toString()}`);
  };

  return (
    <div className="min-h-[70vh]">
      <section className="mb-10 space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-semibold tracking-[0.25em] text-[#3b2f2f] md:text-[30px]">
              六爻起卦
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[#5c4a38] md:text-base">
              以三枚乾隆通宝为象 以六爻卦理为骨
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[#e0d2b8] bg-[#faf5ea]/90 p-6 shadow-[0_14px_44px_rgba(0,0,0,0.05)] md:p-8">
        <header className="mb-4 flex items-baseline justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[#3b2f2f] md:text-lg">
              问卦者
            </h2>
            <p className="mt-2 text-xs text-[#5c4a38] md:text-[13px]">
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
                className="w-full border-b border-dashed border-[#d8c7a6] bg-transparent px-0 pb-1 text-sm text-[#3b2f2f] outline-none focus:border-solid focus:border-[#c5883a]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-[#4a3a2a] md:text-sm">
                性别
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
                className="w-full border-b border-dashed border-[#d8c7a6] bg-transparent px-0 pb-1 text-sm text-[#3b2f2f] outline-none focus:border-solid focus:border-[#c5883a]"
              >
                <option value="male">男</option>
                <option value="female">女</option>
                <option value="other">其他 / 不便说明</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-[#4a3a2a] md:text-sm">
              此刻所问之事
            </label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={4}
              placeholder="可以简单写下：此刻最牵挂的一件事、一个抉择、一段关系，或一个方向。"
              className="w-full rounded-xl border border-[#e3d4b4] bg-[#fdf7ec] px-3 py-2 text-sm text-[#3b2f2f] outline-none focus:border-[#c5883a]"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#c5883a] px-4 py-3 text-sm font-medium text-[#fff9ee] shadow-[0_10px_26px_rgba(180,129,55,0.35)] hover:brightness-105 md:text-base"
            >
              静心片刻 · 起卦
            </button>
          </div>

        </form>
      </section>
    </div>
  );
}

