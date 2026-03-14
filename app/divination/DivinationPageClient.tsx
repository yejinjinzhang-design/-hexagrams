"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { DivinationCoins } from "@/components/divination-coins";
import { LoadingState } from "@/components/LoadingState";
import { computeDivinationResult } from "@/lib/divination";
import type { Gender, LineKind } from "@/types/divination";
import type { CoinSide } from "@/components/divination-coins";

/** ?coinTest=0|1|2|3 固定四组对比：全正/全反/正反正/反正反 */
const COIN_TEST_COMBOS: [CoinSide, CoinSide, CoinSide][] = [
  ["front", "front", "front"],
  ["back", "back", "back"],
  ["front", "back", "front"],
  ["back", "front", "back"],
];

function lineKindToLabel(kind: LineKind): string {
  switch (kind) {
    case "lao-yin":
      return "老阴";
    case "shao-yin":
      return "少阴";
    case "shao-yang":
      return "少阳";
    case "lao-yang":
      return "老阳";
    default:
      return kind;
  }
}

export default function DivinationPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const userInput = useMemo(() => {
    const birthYearParam = searchParams.get("birthYear");
    const birthYear = birthYearParam ? Number(birthYearParam) : undefined;
    const gender = (searchParams.get("gender") || "male") as Gender;
    const question = searchParams.get("question") || "";
    return { birthYear, gender, question };
  }, [searchParams]);

  const coinTest = searchParams.get("coinTest");
  const forceSides =
    coinTest !== null && coinTest !== ""
      ? COIN_TEST_COMBOS[parseInt(coinTest, 10)] ?? null
      : null;

  const [diceSums, setDiceSums] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRollComplete = (sum: number) => {
    if (diceSums.length >= 6) return;
    const next = [...diceSums, sum];
    setDiceSums(next);
  };

  const handleReset = () => {
    setDiceSums([]);
    setError(null);
  };

  const readyForAnalysis = diceSums.length === 6;

  const previewResult =
    diceSums.length === 6 ? computeDivinationResult(diceSums) : null;

  const handleGenerate = async () => {
    if (!readyForAnalysis || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: userInput,
          diceSums
        })
      });
      if (!res.ok) {
        throw new Error(`分析请求失败：${res.status}`);
      }
      const data = (await res.json()) as { sessionId: string };
      router.push(`/result?sessionId=${data.sessionId}`);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "分析调用出现问题，请稍后重试。"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="max-w-lg mx-auto flex flex-col"
      style={{ gap: "24px" }}
    >
      <div className="rounded-2xl border border-[#e0d2b8] bg-[#faf5ea]/90 p-5 shadow-[0_10px_32px_rgba(0,0,0,0.04)] md:p-6">
        <h2 className="text-base font-semibold text-[#3b2f2f] md:text-lg">
          乾隆通宝 · 起爻
        </h2>
        <p className="mt-2 text-xs text-[#5c4a38] md:text-[13px]">
          一次抛掷为一爻，共六爻，自下而上成卦。
        </p>
          <div className="mt-3 grid gap-3 text-[12px] text-[#5c4a38] md:grid-cols-3">
          <div>
            出生年份：
            {typeof userInput.birthYear === "number"
              ? userInput.birthYear
              : "未填写"}
          </div>
          <div>
            性别：
            {userInput.gender === "male"
              ? "男"
              : userInput.gender === "female"
              ? "女"
              : "其他/不便说明"}
          </div>
          <div className="md:col-span-1">
            已完成：{diceSums.length} / 6 次
          </div>
        </div>
          <div className="mt-1 text-[12px] text-[#5c4a38]">
          问题：
          {userInput.question || "（未填写具体问题，本卦偏整体趋势参考）"}
        </div>
      </div>

      <DivinationCoins
        disabled={diceSums.length >= 6 || submitting}
        onRollComplete={handleRollComplete}
        forceSides={forceSides}
      />

      <div className="flex flex-wrap items-center gap-3 text-xs text-[#5c4a38]">
        <span>已记录爻值：</span>
        {diceSums.length === 0 && (
          <span className="text-[#b0a08a]">尚未开始</span>
        )}
        {diceSums.map((s, idx) => (
          <span
            key={idx}
            className="inline-flex items-center justify-center rounded-full border border-[#d6c29f] px-2 py-0.5 text-[11px]"
          >
            第 {idx + 1} 爻：{s}
          </span>
        ))}
        {diceSums.length > 0 && (
          <button
            type="button"
            onClick={handleReset}
            className="ml-auto text-[11px] text-[#a07132] underline-offset-2 hover:underline"
          >
            重新起卦
          </button>
        )}
      </div>

      {previewResult && (
        <div className="rounded-2xl border border-[#e0d2b8] bg-[#f7f1e4]/90 p-4 text-xs text-[#5c4a38]">
          <p className="mb-2 text-[11px] text-[#7d5a2b]">
            六爻结构预览：
          </p>
          <div className="flex flex-col gap-1">
            {previewResult.lines
              .slice()
              .sort((a, b) => b.index - a.index)
              .map((line) => (
                <div
                  key={line.index}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="w-10 text-[11px] text-[#8b7a63]">
                    第 {line.index} 爻
                  </span>
                  <span className="flex-1 text-[11px]">
                    {lineKindToLabel(line.kind)} · 原：
                    {line.polarity === "yang" ? "阳" : "阴"} / 变：
                    {line.changedPolarity === "yang" ? "阳" : "阴"}{" "}
                    {line.moving ? "（动爻）" : "（静）"}
                  </span>
                  <span className="w-14 text-right text-[11px] text-[#a18f76]">
                    爻值：{line.diceSum}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="pt-2">
        <button
          type="button"
          disabled={!readyForAnalysis || submitting}
          onClick={handleGenerate}
          className="flex w-full items-center justify-center rounded-full bg-[#c5883a] px-4 py-3 text-sm font-medium text-[#fff9ee] shadow-[0_10px_26px_rgba(180,129,55,0.35)] disabled:cursor-not-allowed disabled:bg-[#d5c3a4]"
        >
          {submitting ? "正在生成 AI 分析..." : "生成 AI 解析卦意"}
        </button>
      </div>

      {submitting && <LoadingState />}
    </div>
  );
}
