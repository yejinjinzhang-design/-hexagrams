"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics/client";
import { DivinationCoins } from "@/components/divination-coins";
import { LoadingState } from "@/components/LoadingState";
import { computeDivinationResult } from "@/lib/divination";
import {
  deriveHexagramFromDate,
  deriveHexagramFromManualLines,
  deriveHexagramFromNumbersInput,
  deriveHexagramFromSpecified,
  deriveYaoFromCoins,
  TRIGRAM_OPTIONS,
  type DivinationMethod
} from "@/lib/divination-methods";
import type { Gender, LineKind } from "@/types/divination";
import type { CoinSide } from "@/components/divination-coins";
import {
  buildCastTimeContextFromMs,
  formatInstantInTimeZoneZh,
  parseDatetimeLocalAsShanghaiInstant,
  shanghaiNowDatetimeLocalValue,
} from "@/lib/time/cast-timezone";

/** ?coinTest=0|1|2|3 固定四组对比：全正/全反/正反正/反正反 */
const COIN_TEST_COMBOS: [CoinSide, CoinSide, CoinSide][] = [
  ["front", "front", "front"],
  ["back", "back", "back"],
  ["front", "back", "front"],
  ["back", "front", "back"],
];

// 三爻自下而上：阳=1，阴=0；显示时反转为自上而下。
const TRIGRAM_BITS_BY_NUM: Record<number, string> = {
  1: "111",
  2: "110",
  3: "101",
  4: "100",
  5: "011",
  6: "010",
  7: "001",
  8: "000",
};

function lineKindToLabel(kind: LineKind): string {
  switch (kind) {
    case "lao-yin":
      return "老阴（动）";
    case "shao-yin":
      return "少阴";
    case "shao-yang":
      return "少阳";
    case "lao-yang":
      return "老阳（动）";
    default:
      return kind;
  }
}

function yaoPositionLabel(index: number): string {
  return index === 1
    ? "初爻"
    : index === 2
      ? "二爻"
      : index === 3
        ? "三爻"
        : index === 4
          ? "四爻"
          : index === 5
            ? "五爻"
            : "上爻";
}

function TrigramGlyph({
  num,
  active,
}: {
  num: number;
  active?: boolean;
}) {
  const bits = (TRIGRAM_BITS_BY_NUM[num] ?? "111").split("").reverse();
  const color = active ? "bg-[#4b3423]" : "bg-[#7a6349]";
  return (
    <span className="flex w-7 flex-col gap-[3px]" aria-hidden="true">
      {bits.map((bit, idx) =>
        bit === "1" ? (
          <span
            key={`${num}-${idx}`}
            className={`h-[3px] w-full rounded-full ${color}`}
          />
        ) : (
          <span key={`${num}-${idx}`} className="flex h-[3px] w-full gap-[5px]">
            <span className={`h-full flex-1 rounded-full ${color}`} />
            <span className={`h-full flex-1 rounded-full ${color}`} />
          </span>
        )
      )}
    </span>
  );
}

export default function DivinationPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const userInput = useMemo(() => {
    const birthYearParam = searchParams.get("birthYear");
    const birthYear = birthYearParam ? Number(birthYearParam) : undefined;
    const genderParam = searchParams.get("gender");
    const gender = genderParam ? (genderParam as Gender) : "other";
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

  const [method, setMethod] = useState<DivinationMethod>("coin");
  const [castTimeISO, setCastTimeISO] = useState<string>(() => new Date().toISOString());

  // 日期卦：`datetime-local` 按北京时间（Asia/Shanghai）解释，与排盘一致
  const [dateTimeLocal, setDateTimeLocal] = useState<string>(() =>
    shanghaiNowDatetimeLocalValue()
  );

  // 数字卦（梅花易数数字起卦：支持连续数字串或带 '.' 分隔两组）
  const [numberInput, setNumberInput] = useState<string>("");

  const prevDiceLenRef = useRef(0);
  const divinationStartedRef = useRef(false);

  // 手动录入：每爻 3 枚硬币（正/反），从下到上（初爻→上爻）对应 lines[0..5]
  const [manualCoins, setManualCoins] = useState<Array<Array<CoinSide | null>>>(
    () =>
      Array.from({ length: 6 }, () =>
        Array.from({ length: 3 }, () => null)
      )
  );
  const [specifiedUpperNum, setSpecifiedUpperNum] = useState(1);
  const [specifiedLowerNum, setSpecifiedLowerNum] = useState(1);
  const [specifiedMovingLines, setSpecifiedMovingLines] = useState<number[]>([]);

  useEffect(() => {
    setDiceSums([]);
    setError(null);
    setCastTimeISO(new Date().toISOString());
    setDateTimeLocal(shanghaiNowDatetimeLocalValue());
    setNumberInput("");
    setManualCoins(
      Array.from({ length: 6 }, () => Array.from({ length: 3 }, () => null))
    );
    setSpecifiedUpperNum(1);
    setSpecifiedLowerNum(1);
    setSpecifiedMovingLines([]);
    prevDiceLenRef.current = 0;
  }, [method]);

  useEffect(() => {
    if (divinationStartedRef.current) return;
    divinationStartedRef.current = true;
    trackEvent("divination_started", {
      metadata: {
        has_question: Boolean(userInput.question?.trim()),
      },
    });
  }, [userInput.question]);

  useEffect(() => {
    trackEvent("divination_method_selected", {
      metadata: { method },
    });
  }, [method]);

  useEffect(() => {
    const n = diceSums.length;
    if (n === 0) {
      prevDiceLenRef.current = 0;
      return;
    }
    const prev = prevDiceLenRef.current;
    if (n > prev) {
      for (let i = prev + 1; i <= n; i++) {
        trackEvent("line_completed", {
          metadata: { line_index: i, method },
        });
      }
    }
    prevDiceLenRef.current = n;
  }, [diceSums.length, method]);

  const handleRollComplete = (sum: number) => {
    if (diceSums.length >= 6) return;
    const next = [...diceSums, sum];
    setDiceSums(next);
  };

  const updateCastTimeFromLocal = (value: string) => {
    setDateTimeLocal(value);
    if (method === "lunarDate") {
      setDiceSums([]);
    }
    try {
      if (!value) return;
      const instant = parseDatetimeLocalAsShanghaiInstant(value);
      setCastTimeISO(instant.toISOString());
    } catch {
      // datetime-local 编辑过程中可能出现半截值，提交时再提示用户。
    }
  };

  const useCurrentCastTime = () => {
    setDateTimeLocal(shanghaiNowDatetimeLocalValue());
    setCastTimeISO(new Date().toISOString());
    if (method === "lunarDate") {
      setDiceSums([]);
    }
  };

  const resolveSelectedCastTimeISO = () => {
    if (!dateTimeLocal) {
      throw new Error("请先选择起卦时间。");
    }
    const instant = parseDatetimeLocalAsShanghaiInstant(dateTimeLocal);
    const iso = instant.toISOString();
    setCastTimeISO(iso);
    return iso;
  };

  const handleReset = () => {
    trackEvent("reset_divination", { metadata: { method } });
    setDiceSums([]);
    prevDiceLenRef.current = 0;
    setError(null);
    setManualCoins(Array.from({ length: 6 }, () => Array.from({ length: 3 }, () => null)));
    setNumberInput("");
    useCurrentCastTime();
    setSpecifiedUpperNum(1);
    setSpecifiedLowerNum(1);
    setSpecifiedMovingLines([]);
  };

  const readyForAnalysis = diceSums.length === 6;

  const previewResult =
    diceSums.length === 6 ? computeDivinationResult(diceSums) : null;
  const specifiedPreview = useMemo(
    () =>
      deriveHexagramFromSpecified({
        upperNum: specifiedUpperNum,
        lowerNum: specifiedLowerNum,
        movingLines: specifiedMovingLines,
      }),
    [specifiedLowerNum, specifiedMovingLines, specifiedUpperNum]
  );

  const castTimeText = useMemo(
    () => formatInstantInTimeZoneZh(castTimeISO),
    [castTimeISO]
  );

  const birthYearText =
    typeof userInput.birthYear === "number" ? `${userInput.birthYear}年` : "未填写";
  const genderText =
    userInput.gender === "male"
      ? "男"
      : userInput.gender === "female"
        ? "女"
        : "其他";

  const handleGenerate = async () => {
    if (!readyForAnalysis || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const selectedCastTimeISO = resolveSelectedCastTimeISO();
      const timestampMs = new Date(selectedCastTimeISO).getTime();
      if (!Number.isFinite(timestampMs)) {
        throw new Error("起卦时间无效，请重新选择或起卦。");
      }
      const castCtx = buildCastTimeContextFromMs(timestampMs);

      const rawInput =
        method === "lunarDate"
          ? { dateTime: castCtx.timestampIso, calendar: "lunar" as const }
          : method === "number"
            ? { numberInput }
            : method === "manual"
              ? { manualCoins: manualCoins.map((line) => line as CoinSide[]) }
            : method === "specified"
              ? {
                  specified: {
                    upperNum: specifiedUpperNum,
                    lowerNum: specifiedLowerNum,
                    movingLines: specifiedMovingLines,
                  },
                }
              : undefined;

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: userInput,
          diceSums,
          castTime: castCtx.timestampIso,
          castTimeContext: castCtx,
          method,
          rawInput,
        })
      });
      if (!res.ok) {
        throw new Error(`分析请求失败：${res.status}`);
      }
      const data = (await res.json()) as { sessionId: string };
      trackEvent("divination_completed", {
        metadata: { method, session_id: data.sessionId },
      });
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
    <div className="min-h-screen">
      <div className="mx-auto max-w-[430px] px-3 py-5 md:px-4 md:py-6">
        {/* 1) 标题区 */}
        <div className="mb-5 text-center">
          <p className="ink-eyebrow">六爻成象</p>
          <h1 className="mt-1 font-ritual-title text-[22px] font-semibold tracking-[0.28em] text-[#34281f] md:text-[24px]">
            起卦
          </h1>
        </div>

        {/* 2) 信息卡片 */}
        <section className="mb-5 ink-panel p-4 text-[#3A2F26] box-border">
          <div className="mb-3">
            <div className="text-[12px] font-medium font-ritual-title text-[#8C7A6B]">
              所问
            </div>
              <div className="mt-1 text-[18px] font-semibold font-ritual-title leading-relaxed">
              {userInput.question || "（请先写下此刻心中所问）"}
            </div>
          </div>

          <div className="space-y-3 text-[14px]">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[12px] font-medium font-ritual-title text-[#8C7A6B]">
                问卦者
              </span>
              <span className="font-semibold font-ritual-title text-[#3A2F26]">
                {birthYearText} · {genderText}
              </span>
            </div>

            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[12px] font-medium font-ritual-title text-[#8C7A6B]">
                起卦时
              </span>
              <span className="font-semibold font-ritual-title text-[#3A2F26]">
                {castTimeText || "（稍后显示）"}
              </span>
            </div>

            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[12px] font-medium font-ritual-title text-[#8C7A6B]">
                已完成
              </span>
              <span className="font-semibold font-ritual-title text-[#3A2F26]">
                {diceSums.length} / 6 爻
              </span>
            </div>
          </div>
        </section>

        {/* 3) 起卦方式 */}
        <section className="mb-5 ink-panel p-4 text-[#3A2F26] box-border">
          <div className="mb-3 text-center font-ritual-title text-[14px] font-semibold tracking-[0.2em] text-[#8C7A6B]">
            起卦方式
          </div>
          <div className="flex flex-row flex-wrap justify-center gap-2">
            {(
              [
                ["coin", "铜钱摇卦"],
                ["lunarDate", "时间卦"],
                ["number", "数字起卦"],
                ["manual", "手动录入"],
                ["specified", "指定卦"],
              ] as Array<[DivinationMethod, string]>
            ).map(([m, label]) => {
              const active = method === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    active
                      ? "border border-[#b08a57] bg-[linear-gradient(135deg,#b98b4f,#d0ab70)] text-[#fff9ee] shadow-[0_8px_18px_rgba(145,95,46,0.18)]"
                      : "border border-[#d7c6aa]/85 bg-[#fffaf2]/55 text-[#7a6349] hover:bg-[#f4ead8]"
                  }`}
                  style={{ minHeight: 36 }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="mb-5 ink-panel p-4 text-[#3A2F26] box-border">
          <div className="mb-3 text-center font-ritual-title text-[14px] font-semibold tracking-[0.2em] text-[#8C7A6B]">
            起卦时间
          </div>
          <label className="text-[12px] text-[#8C7A6B]">
            可改为旧卦当时的时间（北京时间）
            <input
              type="datetime-local"
              value={dateTimeLocal}
              onChange={(e) => updateCastTimeFromLocal(e.target.value)}
              className="mt-2 w-full ink-input text-[14px]"
            />
          </label>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={useCurrentCastTime}
              className="ink-button-secondary w-full px-5 py-2 text-sm"
            >
              使用当前时间
            </button>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-[#a28f73]">
            铜钱、数字、手动录入、指定卦都会按这里的时间排盘；时间卦也会用这里的时间推卦。
          </p>
        </section>

        {/* 4) 起卦输入（按方式切换） */}
        <section className="mb-3">
          {method === "coin" && (
            <DivinationCoins
              disabled={diceSums.length >= 6 || submitting}
              onRollComplete={handleRollComplete}
              forceSides={forceSides}
            />
          )}

          {method === "lunarDate" && (
            <div className="ink-panel p-4 text-[#3A2F26] transition-opacity duration-150">
              <div className="text-center font-ritual-title text-[16px] font-semibold text-[#3A2F26]">
                时间起卦
              </div>
              <div className="mt-2 text-center text-[12px] text-[#8C7A6B]">
                以上方所选时间，起此一卦
              </div>

              <div className="mt-4 flex flex-col gap-3">
                <div className="ink-subpanel-muted px-3 py-2 text-center text-[12px] text-[#5c4a38]">
                  {castTimeText}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    disabled={!dateTimeLocal}
                    onClick={() => {
                      try {
                        const iso = resolveSelectedCastTimeISO();
                        const r = deriveHexagramFromDate(iso);
                        setDiceSums(r.diceSums);
                      } catch {
                        setError("日期起卦失败，请重试。");
                      }
                    }}
                    className="ink-button-primary w-full px-5 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    按此时间起卦
                  </button>
                </div>
              </div>
            </div>
          )}

          {method === "number" && (
            <div className="ink-panel p-4 text-[#3A2F26] transition-opacity duration-150">
              <div className="text-center font-ritual-title text-[16px] font-semibold text-[#3A2F26]">
                数字起卦
              </div>
              <div className="mt-2 text-center text-[12px] text-[#8C7A6B]">以数字起意，推得此卦</div>

              <div className="mt-4 flex flex-col gap-3">
                <label className="text-[12px] text-[#8C7A6B]">
                  数字起卦输入
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="如 123 或 1.23"
                    value={numberInput}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^\d.]/g, "");
                      setNumberInput(v);
                    }}
                    className="mt-2 w-full ink-input text-[14px]"
                  />
                </label>

                <button
                  type="button"
                  disabled={!numberInput.trim()}
                  onClick={() => {
                    try {
                      const r = deriveHexagramFromNumbersInput(numberInput);
                      resolveSelectedCastTimeISO();
                      setDiceSums(r.diceSums);
                    } catch {
                      setError("数字起卦失败，请重试。");
                    }
                  }}
                  className="ink-button-primary w-full px-5 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-55"
                >
                  据数起卦
                </button>
              </div>
            </div>
          )}

          {method === "specified" && (
            <div className="ink-panel p-4 text-[#3A2F26] transition-opacity duration-150">
              <div className="text-center font-ritual-title text-[16px] font-semibold text-[#3A2F26]">
                指定卦
              </div>
              <div className="mt-2 text-center text-[12px] text-[#8C7A6B]">
                直接指定本卦，并选择几爻发动
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <div className="mb-2 text-[12px] text-[#8C7A6B]">上卦</div>
                  <div className="grid grid-cols-4 gap-2">
                    {TRIGRAM_OPTIONS.map((gua) => {
                      const active = specifiedUpperNum === gua.num;
                      return (
                        <button
                          key={`upper-${gua.num}`}
                          type="button"
                          onClick={() => {
                            setSpecifiedUpperNum(gua.num);
                            setDiceSums([]);
                          }}
                          className={`flex min-h-[42px] items-center justify-center gap-2 rounded-full border px-2 py-2 text-[12px] transition-colors ${
                            active
                              ? "border-[#b08a57] bg-[#efe0c4] text-[#4b3423]"
                              : "border-[#D7C6AA] bg-[#fffaf2]/50 text-[#8B6B3F] hover:bg-[#F0E4D1]"
                          }`}
                        >
                          <TrigramGlyph num={gua.num} active={active} />
                          <span>{gua.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-[12px] text-[#8C7A6B]">下卦</div>
                  <div className="grid grid-cols-4 gap-2">
                    {TRIGRAM_OPTIONS.map((gua) => {
                      const active = specifiedLowerNum === gua.num;
                      return (
                        <button
                          key={`lower-${gua.num}`}
                          type="button"
                          onClick={() => {
                            setSpecifiedLowerNum(gua.num);
                            setDiceSums([]);
                          }}
                          className={`flex min-h-[42px] items-center justify-center gap-2 rounded-full border px-2 py-2 text-[12px] transition-colors ${
                            active
                              ? "border-[#b08a57] bg-[#efe0c4] text-[#4b3423]"
                              : "border-[#D7C6AA] bg-[#fffaf2]/50 text-[#8B6B3F] hover:bg-[#F0E4D1]"
                          }`}
                        >
                          <TrigramGlyph num={gua.num} active={active} />
                          <span>{gua.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="ink-subpanel-muted px-4 py-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-ritual-title text-[14px] font-semibold text-[#3A2F26]">
                        {specifiedPreview.primaryHexagram.name}
                      </div>
                      <div className="mt-1 text-[11px] text-[#8C7A6B]">
                        上{specifiedPreview.upperGua?.name} · 下{specifiedPreview.lowerGua?.name}
                      </div>
                    </div>
                    <div className="text-[11px] text-[#8C7A6B]">
                      {specifiedMovingLines.length
                        ? `${specifiedMovingLines.map(yaoPositionLabel).join("、")}动`
                        : "静卦"}
                    </div>
                  </div>

                  <div className="mx-auto flex max-w-[180px] flex-col gap-2">
                    {specifiedPreview.lines
                      .slice()
                      .sort((a, b) => b.index - a.index)
                      .map((line) => {
                        const isYang = line.yinYang === "yang";
                        const isMoving = specifiedMovingLines.includes(line.index);
                        return (
                          <div
                            key={`specified-preview-${line.index}`}
                            className="grid grid-cols-[36px_1fr_28px] items-center gap-2"
                          >
                            <span className="text-right text-[10px] text-[#a28f73]">
                              {yaoPositionLabel(line.index)}
                            </span>
                            <div className="flex items-center justify-center">
                              {isYang ? (
                                <div
                                  className={`h-[7px] w-full rounded-full ${
                                    isMoving ? "bg-[#b2613c]" : "bg-[#5c4a38]"
                                  }`}
                                />
                              ) : (
                                <div className="flex w-full gap-4">
                                  <div
                                    className={`h-[7px] flex-1 rounded-full ${
                                      isMoving ? "bg-[#b2613c]" : "bg-[#5c4a38]"
                                    }`}
                                  />
                                  <div
                                    className={`h-[7px] flex-1 rounded-full ${
                                      isMoving ? "bg-[#b2613c]" : "bg-[#5c4a38]"
                                    }`}
                                  />
                                </div>
                              )}
                            </div>
                            <span className="text-[10px] text-[#b2613c]">
                              {isMoving ? "动" : ""}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-[12px] text-[#8C7A6B]">动爻</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSpecifiedMovingLines([]);
                        setDiceSums([]);
                      }}
                      className="text-[11px] text-[#8C7A6B] underline underline-offset-4"
                    >
                      设为无动爻
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3, 4, 5, 6].map((lineIndex) => {
                      const active = specifiedMovingLines.includes(lineIndex);
                      return (
                        <button
                          key={`moving-${lineIndex}`}
                          type="button"
                          onClick={() => {
                            setSpecifiedMovingLines((prev) =>
                              prev.includes(lineIndex)
                                ? prev.filter((n) => n !== lineIndex)
                                : [...prev, lineIndex].sort((a, b) => a - b)
                            );
                            setDiceSums([]);
                          }}
                          className={`rounded-full border px-3 py-2 text-[12px] transition-colors ${
                            active
                              ? "border-[#b08a57] bg-[#efe0c4] text-[#4b3423]"
                              : "border-[#D7C6AA] bg-[#fffaf2]/50 text-[#8B6B3F] hover:bg-[#F0E4D1]"
                          }`}
                        >
                          {yaoPositionLabel(lineIndex)}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-[#a28f73]">
                    可选一个或多个动爻；不选则按静卦处理。
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    try {
                      const timestamp = resolveSelectedCastTimeISO();
                      const r = deriveHexagramFromSpecified({
                        upperNum: specifiedUpperNum,
                        lowerNum: specifiedLowerNum,
                        movingLines: specifiedMovingLines,
                        timestamp,
                      });
                      setDiceSums(r.diceSums);
                    } catch {
                      setError("指定卦生成失败，请重试。");
                    }
                  }}
                  className="ink-button-primary w-full px-5 py-2 text-sm"
                >
                  生成指定卦
                </button>
              </div>
            </div>
          )}

          {method === "manual" && (
            <div className="ink-panel p-4 text-[#3A2F26] transition-opacity duration-150">
              <div className="text-center font-ritual-title text-[16px] font-semibold text-[#3A2F26]">
                手动录入
              </div>

              <div className="mt-4 flex flex-col gap-3">
                {([5, 4, 3, 2, 1, 0] as const).map((yaoIdx) => {
                  const rowIndex = yaoIdx; // 0..5, 0 初爻（底部）
                  const label = rowIndex === 0
                    ? "初爻"
                    : rowIndex === 1
                      ? "二爻"
                      : rowIndex === 2
                        ? "三爻"
                        : rowIndex === 3
                          ? "四爻"
                          : rowIndex === 4
                            ? "五爻"
                            : "上爻";

                  const coins = manualCoins[rowIndex];
                  const complete = coins.every((c) => c === "front" || c === "back");
                  const yaoPreview = complete
                    ? deriveYaoFromCoins(coins as CoinSide[])
                    : null;
                  const yaoTypeText = yaoPreview?.yaoType ?? "";

                  return (
                    <div
                      key={`manual-yao-${yaoIdx}`}
                      className="ink-subpanel-muted px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[12px] font-medium text-[#8C7A6B]">{label}</div>
                        <div className="text-[12px] text-[#5c4a38]">
                          {complete ? yaoTypeText : " "}
                        </div>
                      </div>

                      <div className="mt-2 flex flex-row flex-wrap gap-2">
                        {[0, 1, 2].map((coinIdx) => {
                          const v = coins[coinIdx];
                          return (
                            <div key={coinIdx} className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const next = manualCoins.map((line) => [...line]);
                                  next[rowIndex][coinIdx] = "front";
                                  setManualCoins(next);
                                }}
                                className={`rounded-full px-3 py-1 text-[11px] border transition-colors ${
                                  v === "front"
                                    ? "border-[#b08a57] bg-[#efe0c4] text-[#4b3423]"
                                    : "border-[#D7C6AA] bg-[#fffaf2]/50 text-[#8B6B3F] hover:bg-[#F0E4D1]"
                                }`}
                              >
                                正
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const next = manualCoins.map((line) => [...line]);
                                  next[rowIndex][coinIdx] = "back";
                                  setManualCoins(next);
                                }}
                                className={`rounded-full px-3 py-1 text-[11px] border transition-colors ${
                                  v === "back"
                                    ? "border-[#b08a57] bg-[#efe0c4] text-[#4b3423]"
                                    : "border-[#D7C6AA] bg-[#fffaf2]/50 text-[#8B6B3F] hover:bg-[#F0E4D1]"
                                }`}
                              >
                                反
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => {
                      setManualCoins(
                        Array.from({ length: 6 }, () => Array.from({ length: 3 }, () => null))
                      );
                      setDiceSums([]);
                      setError(null);
                    }}
                    className="ink-button-secondary w-full px-5 py-2 text-sm"
                  >
                    清空重填
                  </button>
                  <button
                    type="button"
                    disabled={!manualCoins.every((line) => line.every((c) => c === "front" || c === "back"))}
                    onClick={() => {
                      try {
                        const complete = manualCoins.map((line) => line as any);
                        const dice = deriveHexagramFromManualLines(complete).diceSums;
                        resolveSelectedCastTimeISO();
                        setDiceSums(dice);
                      } catch {
                        setError("手动录入生成失败，请重试。");
                      }
                    }}
                    className="ink-button-primary w-full px-5 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    生成此卦
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {previewResult && (
          <div className="mt-4 ink-panel p-4 text-[#3A2F26]">
            <p className="mb-2 text-[12px] font-medium text-[#8C7A6B]">
              已成之象（自下而上）
            </p>
            <div className="flex flex-col gap-1">
              {previewResult.lines
                .slice()
                .sort((a, b) => a.index - b.index)
                .map((line) => {
                  const isYang = line.polarity === "yang";
                  const yinYangLabel = isYang ? "阳" : "阴";
                  const glyph = isYang ? "———" : "— —";
                  return (
                    <div
                      key={line.index}
                      className="flex items-center justify-between gap-3"
                    >
                      <span className="w-12 text-[11px] text-[#8C7A6B]">
                        第 {line.index} 爻
                      </span>
                      <span className="flex-1 text-[11px]">
                        {lineKindToLabel(line.kind)} · {yinYangLabel}
                      </span>
                      <span className="w-16 text-right text-[11px] tracking-[0.3em] text-[#5c4a38]">
                        {glyph}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {error && <p className="mt-3 text-xs text-red-500">{error}</p>}

        <div className="pt-3">
          <button
            type="button"
            disabled={!readyForAnalysis || submitting}
            onClick={handleGenerate}
            className="ink-button-primary flex w-full px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-55"
          >
            {submitting ? "先观应象中..." : "先观应象"}
          </button>
        </div>

        {submitting && <LoadingState />}

        {diceSums.length > 0 && !submitting && (
          <div className="pt-3 text-center">
            <button
              type="button"
              onClick={handleReset}
              className="text-[12px] text-[#8C7A6B] underline underline-offset-4 hover:text-[#C6A46C]"
            >
              重新起卦
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
