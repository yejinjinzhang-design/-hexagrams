"use client";

import { useEffect, useRef, useState } from "react";
import { CoinRow } from "./CoinRow";
import { COIN_CONFIG } from "./config";
import type { CoinPhase, CoinSide } from "./Coin";

export interface DivinationCoinsProps {
  disabled?: boolean;
  onRollComplete: (sum: number) => void;
  /** 调试：?coinTest=0|1|2|3 时固定显示 全正/全反/正反正/反正反 */
  forceSides?: [CoinSide, CoinSide, CoinSide] | null;
}

const { durationsMs } = COIN_CONFIG;

function secureRandom(): number {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return arr[0] / 4294967295;
  }
  return Math.random();
}

type ThrowDurations = [number, number, number];
type ThrowDelays = [number, number, number];

function generateThrowTimings(): { durations: ThrowDurations; delays: ThrowDelays } {
  const baseDurations: ThrowDurations = durationsMs as ThrowDurations;

  const durations = baseDurations.map((base) => {
    const r = secureRandom(); // 0~1
    const factor = 0.85 + r * 0.5; // 0.85 ~ 1.35
    return Math.round(base * factor);
  }) as ThrowDurations;

  const delays = [0, 1, 2].map((i) => {
    const r = secureRandom();
    const jitter = r * 220; // 0~220ms
    return Math.round(40 * i + jitter);
  }) as ThrowDelays;

  return { durations, delays };
}

function generateCoinSides(): [CoinSide, CoinSide, CoinSide] {
  const sides: CoinSide[] = [];
  for (let i = 0; i < 3; i++) {
    sides.push(secureRandom() > 0.5 ? "front" : "back");
  }
  return sides as [CoinSide, CoinSide, CoinSide];
}

function patternOfSides(sides: [CoinSide, CoinSide, CoinSide]): string {
  return sides.join("-");
}

/** 随机带符号偏移：绝对值在 [minAbs, maxAbs] 内 */
function jitterSignedMinMax(minAbs: number, maxAbs: number): number {
  const mag = minAbs + secureRandom() * (maxAbs - minAbs);
  return (secureRandom() < 0.5 ? -1 : 1) * mag;
}

/** 三枚 X 向去均值，保证视觉重心仍在行中心（和为 0） */
function recenterTripleX(
  x0: number,
  x1: number,
  x2: number
): [number, number, number] {
  const mean = (x0 + x1 + x2) / 3;
  return [
    Math.round(x0 - mean),
    Math.round(x1 - mean),
    Math.round(x2 - mean),
  ];
}

/**
 * 落点与收势：在 flex 左中右骨架上只做微扰，并对 X 做整体校正，避免整排偏左/偏右。
 */
function generateSettleLandingParams(): {
  settleFromXs: ThrowDurations;
  settleXFinals: ThrowDurations;
  settleFromYs: ThrowDurations;
  settleYFinals: ThrowDurations;
  finalRotZs: ThrowDurations;
} {
  // 最终落点 X：每枚 ±4~8px，再整体去均值
  const rawFinalX = [
    jitterSignedMinMax(4, 8),
    jitterSignedMinMax(4, 8),
    jitterSignedMinMax(4, 8),
  ] as [number, number, number];
  const settleXFinals = recenterTripleX(rawFinalX[0], rawFinalX[1], rawFinalX[2]);

  // 收势起点 X：略大一点的分散，同样去均值，避免从一侧“整排滑入”
  const rawFromX = [
    jitterSignedMinMax(3, 9),
    jitterSignedMinMax(3, 9),
    jitterSignedMinMax(3, 9),
  ] as [number, number, number];
  const settleFromXs = recenterTripleX(rawFromX[0], rawFromX[1], rawFromX[2]);

  // 起点高度：围绕空中高度小幅差异（不做水平校正）
  const settleFromYs: ThrowDurations = [
    Math.round(-40 + jitterSignedMinMax(2, 6)),
    Math.round(-38 + jitterSignedMinMax(2, 6)),
    Math.round(-42 + jitterSignedMinMax(2, 6)),
  ];

  // 落定后极轻微纵向高低差 ±2~4px
  const settleYFinals: ThrowDurations = [
    Math.round(jitterSignedMinMax(2, 4)),
    Math.round(jitterSignedMinMax(2, 4)),
    Math.round(jitterSignedMinMax(2, 4)),
  ];

  // 平面内倾角限制在 ±10°
  const finalRotZs: ThrowDurations = [
    Math.round(-10 + secureRandom() * 20),
    Math.round(-10 + secureRandom() * 20),
    Math.round(-10 + secureRandom() * 20),
  ];

  return {
    settleFromXs,
    settleXFinals,
    settleFromYs,
    settleYFinals,
    finalRotZs,
  };
}

/**
 * 铜钱摇卦区：初始三枚满文面（正面）朝上，点击后动画，结果回调
 */
export function DivinationCoins({
  disabled,
  onRollComplete,
  forceSides = null,
}: DivinationCoinsProps) {
  const [finalSides, setFinalSides] = useState<[CoinSide, CoinSide, CoinSide]>([
    "front",
    "front",
    "front",
  ]);
  const lockedFinalSides = forceSides ?? finalSides;

  const [coinPhases, setCoinPhases] = useState<
    [CoinPhase, CoinPhase, CoinPhase]
  >(["idle", "idle", "idle"]);

  const [tossDurations, setTossDurations] = useState<ThrowDurations | null>(
    null
  );
  const [tossDelays, setTossDelays] = useState<ThrowDelays | null>(null);

  const [settleDurations, setSettleDurations] = useState<ThrowDurations | null>(
    null
  );
  const [settleDelays, setSettleDelays] = useState<ThrowDelays | null>(null);
  const [settleFromYs, setSettleFromYs] = useState<ThrowDurations>([
    -80, -80, -80,
  ]);
  const [settleFromXs, setSettleFromXs] = useState<ThrowDurations>([
    0, 0, 0,
  ]);
  const [settleXFinals, setSettleXFinals] = useState<ThrowDurations>([
    0, 0, 0,
  ]);
  const [settleYFinals, setSettleYFinals] = useState<ThrowDurations>([
    0, 0, 0,
  ]);
  const [finalRotZs, setFinalRotZs] = useState<ThrowDurations>([
    0, 0, 0,
  ]);

  const settleTimeoutsRef = useRef<
    [ReturnType<typeof setTimeout> | null, ReturnType<typeof setTimeout> | null, ReturnType<typeof setTimeout> | null]
  >([null, null, null]);

  const rollCompleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const lastPatternRef = useRef<{ pattern: string | null; count: number }>({
    pattern: null,
    count: 0,
  });

  useEffect(() => {
    return () => {
      for (const t of settleTimeoutsRef.current) {
        if (t) clearTimeout(t);
      }
      if (rollCompleteTimeoutRef.current)
        clearTimeout(rollCompleteTimeoutRef.current);
    };
  }, []);

  const effectiveCoinPhases: [CoinPhase, CoinPhase, CoinPhase] =
    forceSides != null
      ? (["settled", "settled", "settled"] as [
          CoinPhase,
          CoinPhase,
          CoinPhase,
        ])
      : coinPhases;

  const isTossing = effectiveCoinPhases.some((p) => p === "tossing");
  const isSettling = effectiveCoinPhases.some((p) => p === "settling");
  const isSettled = effectiveCoinPhases.every((p) => p === "settled");
  const canShowResult = forceSides != null || isSettled;

  const currentSum = lockedFinalSides.reduce(
    (acc, s) => acc + (s === "front" ? 3 : 2),
    0
  );
  const currentKindLabel = (() => {
    if (!canShowResult) return "";
    if (currentSum === 6) return "老阴（动）";
    if (currentSum === 7) return "少阳";
    if (currentSum === 8) return "少阴";
    if (currentSum === 9) return "老阳（动）";
    return "";
  })();

  const clearAllSettleTimers = () => {
    for (const t of settleTimeoutsRef.current) {
      if (t) clearTimeout(t);
    }
    settleTimeoutsRef.current = [null, null, null];
    if (rollCompleteTimeoutRef.current) {
      clearTimeout(rollCompleteTimeoutRef.current);
      rollCompleteTimeoutRef.current = null;
    }
  };

  const startToss = () => {
    if (disabled || forceSides != null) return;
    if (isTossing || isSettling) return;
    // 只允许在 idle/settled 时重新开始新一掷
    if (!coinPhases.every((p) => p === "idle" || p === "settled")) return;

    clearAllSettleTimers();

    // 开始摇卦时就先锁定这一轮的最终正背，让停止时不会再“补翻面”
    const initialFinal = generateCoinSides();
    setFinalSides(initialFinal);

    const { durations: durs, delays: dels } = generateThrowTimings();
    setTossDurations(durs);
    setTossDelays(dels);

    setCoinPhases(["tossing", "tossing", "tossing"]);
  };

  const stopAndSettle = () => {
    if (disabled || forceSides != null) return;
    if (!coinPhases.every((p) => p === "tossing")) return;

    clearAllSettleTimers();

    // 停止后只做收势落下；最终正背已经在开始摇卦时锁定
    const sum = lockedFinalSides.reduce(
      (acc, s) => acc + (s === "front" ? 3 : 2),
      0
    );

    // 收势参数：每枚独立、错开时长
    const settleDurationsLocal: ThrowDurations = [
      Math.round(560 + secureRandom() * 520),
      Math.round(520 + secureRandom() * 560),
      Math.round(580 + secureRandom() * 500),
    ];
    const settleDelaysLocal: ThrowDelays = [
      Math.round(secureRandom() * 80),
      Math.round(90 + secureRandom() * 180),
      Math.round(40 + secureRandom() * 220),
    ];
    const {
      settleFromXs: settleFromXsLocal,
      settleXFinals: settleXFinalsLocal,
      settleFromYs: settleFromYsLocal,
      settleYFinals: settleYFinalsLocal,
      finalRotZs: finalRotZsLocal,
    } = generateSettleLandingParams();

    setSettleDurations(settleDurationsLocal);
    setSettleDelays(settleDelaysLocal);
    setSettleFromYs(settleFromYsLocal);
    setSettleFromXs(settleFromXsLocal);
    setSettleXFinals(settleXFinalsLocal);
    setSettleYFinals(settleYFinalsLocal);
    setFinalRotZs(finalRotZsLocal);

    // 所有 coin 同时进入 settling 阶段，但它们会在不同时间落稳并锁定
    setCoinPhases(["settling", "settling", "settling"]);

    const endTimes = settleDelaysLocal.map(
      (d, i) => d + settleDurationsLocal[i] + 30
    );
    const maxEnd = Math.max(...endTimes);

    settleTimeoutsRef.current = [null, null, null];
    endTimes.forEach((ms, i) => {
      settleTimeoutsRef.current[i] = setTimeout(() => {
        setCoinPhases((prev) => {
          const next: [CoinPhase, CoinPhase, CoinPhase] = [
            prev[0],
            prev[1],
            prev[2],
          ];
          next[i] = "settled";
          return next;
        });
      }, ms);
    });

    rollCompleteTimeoutRef.current = setTimeout(() => {
      onRollComplete(sum);
    }, maxEnd + 60);
  };

  const showTip = forceSides == null && effectiveCoinPhases.every((p) => p === "idle");

  return (
    <div
      className="flex flex-col items-center rounded-[16px] border border-[#E5D8C7] bg-[#F8F3EA] shadow-[0_8px_30px_rgba(0,0,0,0.06)] w-full"
      style={{
        padding: "16px",
        gap: "24px",
      }}
    >
      {/* 起卦案台（纯 CSS、无新素材） */}
      <div
        className="relative w-full"
        style={{
          minHeight: 148,
          paddingTop: 6,
          paddingBottom: 6,
        }}
      >
        {/* 外层托盘 */}
        <div
          aria-hidden
          className="absolute inset-0 rounded-[16px] border border-[#E5D8C7]/60"
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgba(255,255,255,0.55), rgba(255,255,255,0))",
            backgroundColor: "#F3EEDF",
          }}
        />

        {/* 案台垫（绢布 / 宣纸托面感） */}
        <div
          aria-hidden
          className="absolute left-1/2 top-[18px] h-[110px] w-[94%] -translate-x-1/2 rounded-[14px]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(176,138,87,0.16), transparent 45%), radial-gradient(circle at 80% 70%, rgba(94,111,104,0.12), transparent 52%), repeating-linear-gradient(45deg, rgba(62,49,39,0.03) 0px, rgba(62,49,39,0.03) 1px, transparent 1px, transparent 7px)",
            backgroundColor: "#F7F0E1",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(62,49,39,0.05)",
          }}
        />

        {/* 铜钱区 */}
        <div className="relative flex items-center justify-center">
          <CoinRow
            coinPhases={effectiveCoinPhases}
            finalSides={lockedFinalSides}
            tossDurations={tossDurations ?? undefined}
            tossDelays={tossDelays ?? undefined}
            settleDurations={settleDurations ?? undefined}
            settleDelays={settleDelays ?? undefined}
            settleFromYs={settleFromYs}
            settleFromXs={settleFromXs}
            settleXFinals={settleXFinals}
            settleYFinals={settleYFinals}
            finalRotZs={finalRotZs}
          />
        </div>

        {/* 落点阴影底座（增强“放上桌面”） */}
        <div
          aria-hidden
          className={`absolute left-1/2 top-[104px] h-[14px] w-[240px] -translate-x-1/2 rounded-full bg-[rgba(62,49,39,0.10)]`}
          style={{
            filter: isTossing || isSettling ? "blur(6px)" : "blur(3px)",
            opacity: isTossing || isSettling ? 0.55 : 0.35,
            transition: "filter 200ms ease, opacity 200ms ease",
          }}
        />
      </div>

      {/* 固定高度两行：始终占位，避免抛前后高度/间隔突变 */}
      <div
        className="flex flex-col items-center justify-center text-center text-sm text-[#3A2F26]"
        style={{ minHeight: "1.5rem", gap: "6px" }}
      >
        <span style={{ height: "1.25rem", lineHeight: "1.25rem" }}>
          {canShowResult ? (
            <>本次：{currentKindLabel || "阴阳未定"}</>
          ) : (
            <span className="invisible" aria-hidden>
              本次：老阴（动）
            </span>
          )}
        </span>
      </div>

      {/* 小提示：仪式氛围，不喧宾夺主 */}
      {showTip && (
        <div className="text-[12px] text-[#8C7A6B] opacity-80">
          静心凝念，卦由心起
        </div>
      )}

      <button
        type="button"
        onClick={isTossing ? stopAndSettle : startToss}
        disabled={disabled || forceSides != null || isSettling}
        className="rounded-full bg-[#C6A46C] px-7 text-sm font-medium text-[#fff9ee] shadow-[0_6px_18px_rgba(198,164,108,0.28)] disabled:cursor-not-allowed disabled:bg-[#d5c3a4] hover:bg-[#B38B43] transition-colors"
        style={{ minHeight: "44px" }}
      >
        {isTossing ? "点击停止落卦" : isSettling ? "收势落定中..." : "轻抛铜钱"}
      </button>
    </div>
  );
}
