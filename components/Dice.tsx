"use client";

import { useEffect, useRef, useState } from "react";
import { Coin, type CoinSide } from "./Coin";

interface DiceProps {
  disabled?: boolean;
  onRollComplete: (sum: number) => void;
}

/** 三枚铜钱各自动画时长（毫秒），错落停止 */
const COIN_DURATIONS_MS = [900, 950, 1000];
const MAX_DURATION_MS = 1050;

export function Dice({ disabled, onRollComplete }: DiceProps) {
  const [results, setResults] = useState<CoinSide[]>(["front", "front", "front"]);
  const [spinning, setSpinning] = useState(false);
  const [hasThrownOnce, setHasThrownOnce] = useState(false);
  const doneTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (doneTimeoutRef.current) clearTimeout(doneTimeoutRef.current);
    };
  }, []);

  const startRolling = () => {
    if (disabled || spinning) return;
    // 先随机出本爻三枚正背，再播动画，动画落定即该结果
    const next: CoinSide[] = Array.from({ length: 3 }, () =>
      Math.random() > 0.5 ? "front" : "back"
    );
    setResults(next);
    setSpinning(true);

    if (doneTimeoutRef.current) clearTimeout(doneTimeoutRef.current);
    doneTimeoutRef.current = setTimeout(() => {
      setSpinning(false);
      setHasThrownOnce(true);
      doneTimeoutRef.current = null;
      const sum = next.reduce((acc, s) => acc + (s === "front" ? 3 : 2), 0);
      onRollComplete(sum);
    }, MAX_DURATION_MS + 50);
  };

  const currentSum = results.reduce(
    (acc, side) => acc + (side === "front" ? 3 : 2),
    0
  );

  const currentKindLabel =
    currentSum === 6
      ? "老阴（动）"
      : currentSum === 7
      ? "少阳"
      : currentSum === 8
      ? "少阴"
      : currentSum === 9
      ? "老阳（动）"
      : "";

  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-[#e0d2b8] bg-[#faf5ea]/95 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-center gap-5">
        <Coin
          side={results[0]}
          spinning={spinning}
          durationMs={COIN_DURATIONS_MS[0]}
        />
        <Coin
          side={results[1]}
          spinning={spinning}
          durationMs={COIN_DURATIONS_MS[1]}
        />
        <Coin
          side={results[2]}
          spinning={spinning}
          durationMs={COIN_DURATIONS_MS[2]}
        />
      </div>

      <div className="flex flex-col items-center gap-1 text-center text-xs text-[#5c4a38]">
        {hasThrownOnce && !spinning && (
          <span>本次：{currentKindLabel || "阴阳未定"}</span>
        )}
        <span className="text-[10px] text-[#8a755a]">
          三枚铜钱同抛一次为一爻，自下而上共六爻
        </span>
      </div>

      <button
        type="button"
        onClick={startRolling}
        disabled={disabled || spinning}
        className="rounded-full bg-[#c5883a] px-5 py-2 text-xs font-medium text-[#fff9ee] shadow-[0_6px_18px_rgba(180,129,55,0.35)] disabled:cursor-not-allowed disabled:bg-[#d5c3a4]"
      >
        {spinning ? "铜钱翻动中…" : "轻抛铜钱"}
      </button>
    </div>
  );
}
