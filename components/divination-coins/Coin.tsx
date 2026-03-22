"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { COIN_CONFIG, COIN_IMAGES } from "./config";

/** front = 满文面（正）；back = 汉字面（反） */
export type CoinSide = "front" | "back";

export type CoinPhase = "idle" | "tossing" | "settling" | "settled";

export interface CoinProps {
  phase: CoinPhase;
  finalSide: CoinSide;
  index?: number;
  /** tossing 阶段参数 */
  tossDurationMs?: number;
  tossDelayMs?: number;
  /** settling 阶段参数 */
  settleDurationMs?: number;
  settleDelayMs?: number;
  settleFromY?: number;
  settleFromX?: number;
  settleXFinal?: number;
  /** 落定后相对行基准的轻微纵向偏移（px） */
  settleYFinal?: number;
  finalRotZ?: number;
}

const { sizePx, containerBg, coinBoxShadow } = COIN_CONFIG;

/** 固定圆形容器：88x88、border-radius 50% + overflow hidden、轻微悬浮阴影 */
const coinCircleStyle = {
  width: sizePx,
  height: sizePx,
  borderRadius: "50%" as const,
  overflow: "hidden" as const,
  backgroundColor: containerBg,
  position: "relative" as const,
  boxShadow: coinBoxShadow,
};

/** img object-fit cover + scale(1.06) 解决白边 */
const coinImageStyle = {
  objectFit: "cover" as const,
  objectPosition: "center" as const,
  transform: "scale(1.06)",
};

export function Coin({
  phase,
  finalSide,
  index = 0,
  tossDurationMs = COIN_CONFIG.animationDurationMs,
  tossDelayMs = 0,
  settleDurationMs = 700,
  settleDelayMs = 0,
  settleFromY = -80,
  settleFromX = 0,
  settleXFinal = 0,
  settleYFinal = 0,
  finalRotZ = 0,
}: CoinProps) {
  const tossDurationSec = tossDurationMs / 1000;
  const settleDurationSec = settleDurationMs / 1000;

  const [throwVars, setThrowVars] = useState<{
    tx1: string;
    tx2: string;
    tx3: string;
    rz1: string;
    rz2: string;
    rz3: string;
  }>({
    tx1: "0px",
    tx2: "0px",
    tx3: "0px",
    rz1: "0deg",
    rz2: "0deg",
    rz3: "0deg",
  });

  useEffect(() => {
    if (phase !== "tossing") return;

    // 每枚铜钱抛掷轨迹与旋转略不同（使用安全随机数，避免时间种子伪随机）
    const array = new Uint32Array(6);
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      crypto.getRandomValues(array);
    } else {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 4294967295);
      }
    }

    const r1 = array[0] / 4294967295 - 0.5;
    const r2 = array[1] / 4294967295 - 0.5;
    const r3 = array[2] / 4294967295 - 0.5;
    const drift = (index - 1) * 6;

    const tx1 = `${Math.round(r1 * 26 + drift)}px`;
    const tx2 = `${Math.round(r2 * 32 + drift)}px`;
    const tx3 = `${Math.round(r3 * 18 + drift * 0.25)}px`;

    const rz1 = `${Math.round(r1 * 140 + index * 11)}deg`;
    const rz2 = `${Math.round(r2 * 200 + index * 13)}deg`;
    const rz3 = `${Math.round(r3 * 120 + index * 9)}deg`;

    setThrowVars({ tx1, tx2, tx3, rz1, rz2, rz3 });
  }, [phase, index]);

  const spinClass =
    phase === "tossing"
      ? "coin-spin-throw"
      : phase === "idle"
        ? "coin-spin-idle"
        : phase === "settling"
          ? "coin-settle"
          : "";

  const renderFaceContent = (face: CoinSide) => (
    <div style={coinCircleStyle}>
      <Image
        src={face === "front" ? COIN_IMAGES.front : COIN_IMAGES.back}
        alt={
          face === "front"
            ? "乾隆通宝满文面（正面）"
            : "乾隆通宝汉字面（反面）"
        }
        fill
        sizes={`${sizePx}px`}
        className="object-cover object-center"
        style={coinImageStyle}
      />
      {/* 极淡高光，增强“金属边缘”的层次感 */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 30% 18%, rgba(255,255,255,0.30), transparent 42%), radial-gradient(circle at 70% 72%, rgba(176,138,87,0.10), transparent 55%)",
          pointerEvents: "none",
          mixBlendMode: "soft-light",
        }}
      />
    </div>
  );

  return (
    <div
      className="coin-3d-wrapper relative flex shrink-0 items-center justify-center overflow-visible"
      style={{
        perspective: "400px",
        width: sizePx,
        height: sizePx,
        isolation: "isolate",
      }}
    >
      {/* 地面阴影：用动画模拟腾空与落下的空间感 */}
      <div
        aria-hidden
        className={`coin-ground-shadow ${
          phase === "tossing"
            ? "coin-shadow-toss"
            : phase === "settling"
              ? "coin-shadow-settle"
              : ""
        }`}
        style={{
          animationDuration: phase === "tossing" ? `${tossDurationSec}s` : undefined,
          ["--settleDurS" as any]: `${settleDurationSec}s`,
          animationDelay:
            phase === "settling" ? `${settleDelayMs / 1000}s` : undefined,
        }}
      />
      <div
        className={`relative h-full w-full ${spinClass}`}
        style={{
          transformStyle: phase === "tossing" ? "preserve-3d" : "flat",
          transform: phase === "tossing" ? "translateZ(0)" : "none",
          ...(phase === "tossing" && {
            animationDuration: `${tossDurationSec}s`,
            animationDelay: `${tossDelayMs / 1000}s`,
            ["--tx1" as any]: throwVars.tx1,
            ["--tx2" as any]: throwVars.tx2,
            ["--tx3" as any]: throwVars.tx3,
            ["--rz1" as any]: throwVars.rz1,
            ["--rz2" as any]: throwVars.rz2,
            ["--rz3" as any]: throwVars.rz3,
          }),
          ...(phase === "settling" && {
            animationDelay: `${settleDelayMs / 1000}s`,
            ["--settleDurS" as any]: `${settleDurationSec}s`,
            ["--settleFromY" as any]: `${settleFromY}px`,
            ["--settleFromX" as any]: `${settleFromX}px`,
            ["--settleXFinal" as any]: `${settleXFinal}px`,
            ["--settleYFinal" as any]: `${settleYFinal}px`,
            ["--finalRotZ" as any]: `${finalRotZ}deg`,
          }),
          ...(phase === "settled" && {
            transform: `translateX(${settleXFinal}px) translateY(${settleYFinal}px) rotateZ(${finalRotZ}deg) scale(1)`,
          }),
        }}
      >
        {phase === "tossing" ? (
          <>
            <div
              className="absolute inset-0 flex items-center justify-center rounded-full overflow-hidden"
              style={{
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                transform: "rotateY(0deg)",
                backgroundColor: containerBg,
              }}
            >
              {renderFaceContent("front")}
            </div>
            <div
              className="absolute inset-0 flex items-center justify-center rounded-full overflow-hidden"
              style={{
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                position: "absolute",
                top: 0,
                left: 0,
                transform: "rotateY(180deg)",
                backgroundColor: containerBg,
              }}
            >
              {renderFaceContent("back")}
            </div>
          </>
        ) : (
          // 停止后收势/落稳：仅渲染 finalSide 单面，杜绝 front/back 过渡与 3D 翻面
          <div className="absolute inset-0 flex items-center justify-center">
            {renderFaceContent(finalSide)}
          </div>
        )}
      </div>
    </div>
  );
}
