"use client";

import { useEffect, useRef, useState } from "react";
import { CoinRow } from "./CoinRow";
import { COIN_CONFIG } from "./config";
import type { CoinSide } from "./Coin";

export interface DivinationCoinsProps {
  disabled?: boolean;
  onRollComplete: (sum: number) => void;
  /** 调试：?coinTest=0|1|2|3 时固定显示 全正/全反/正反正/反正反 */
  forceSides?: [CoinSide, CoinSide, CoinSide] | null;
}

const { durationsMs } = COIN_CONFIG;
const MAX_DURATION_MS = Math.max(...durationsMs) + 80;

/**
 * 铜钱摇卦区：初始三枚正面朝上，点击后动画翻面，结果回调
 */
export function DivinationCoins({
  disabled,
  onRollComplete,
  forceSides = null,
}: DivinationCoinsProps) {
  const [sides, setSides] = useState<[CoinSide, CoinSide, CoinSide]>([
    "front",
    "front",
    "front",
  ]);
  const displaySides = forceSides ?? sides;
  const [spinning, setSpinning] = useState(false);
  const [hasThrownOnce, setHasThrownOnce] = useState(false);
  const [rolling, setRolling] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const startRolling = () => {
    if (disabled || rolling) return;
    setRolling(true);
    setSpinning(true);
    setHasThrownOnce(true);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setSides([
        Math.random() > 0.5 ? "front" : "back",
        Math.random() > 0.5 ? "front" : "back",
        Math.random() > 0.5 ? "front" : "back",
      ]);
    }, 140);
  };

  const stopAndCommit = () => {
    if (!rolling) return;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setRolling(false);
    setSpinning(false);
    const sum = sides.reduce(
      (acc, s) => acc + (s === "front" ? 3 : 2),
      0
    );
    onRollComplete(sum);
  };

  const currentSum = displaySides.reduce(
    (acc, s) => acc + (s === "front" ? 3 : 2),
    0
  );
  const labels = displaySides.map((s) => (s === "front" ? "正" : "背"));

  return (
    <div
      className="flex flex-col items-center rounded-2xl border border-[#e0d2b8] bg-[#faf5ea]/95 shadow-[0_8px_30px_rgba(0,0,0,0.06)] w-full"
      style={{
        padding: "32px",
        gap: "24px",
      }}
    >
      <CoinRow sides={displaySides} spinning={spinning} />

      {/* 固定高度两行：始终占位，避免抛前后高度/间隔突变 */}
      <div
        className="flex flex-col items-center justify-center text-center text-sm text-[#5c4a38]"
        style={{ minHeight: "3.5rem", gap: "8px" }}
      >
        <span style={{ height: "1.25rem", lineHeight: "1.25rem" }}>
          {forceSides != null || hasThrownOnce ? (
            <>本次：{labels.join(" / ")} → 和值 {currentSum}</>
          ) : (
            <span className="invisible" aria-hidden>
              本次：— → 和值 —
            </span>
          )}
        </span>
        <span className="text-xs text-[#8a755a]">
          6=老阴，7=少阳，8=少阴，9=老阳 · 三枚同抛，自下而上共六爻
        </span>
      </div>

      <button
        type="button"
        onClick={rolling ? stopAndCommit : startRolling}
        disabled={disabled || forceSides != null}
        className="rounded-full bg-[#c5883a] px-7 text-sm font-medium text-[#fff9ee] shadow-[0_6px_18px_rgba(180,129,55,0.28)] disabled:cursor-not-allowed disabled:bg-[#d5c3a4] hover:bg-[#b87a32] transition-colors"
        style={{ minHeight: "44px" }}
      >
        {rolling ? "点击停止落卦" : "轻抛铜钱"}
      </button>
    </div>
  );
}
