"use client";

import Image from "next/image";
import { COIN_CONFIG, COIN_IMAGES } from "./config";

export type CoinSide = "front" | "back";

export interface CoinProps {
  side: CoinSide;
  spinning: boolean;
  durationMs?: number;
  index?: number;
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
  side,
  spinning,
  durationMs = COIN_CONFIG.animationDurationMs,
  index = 0,
}: CoinProps) {
  const durationSec = durationMs / 1000;
  const spinClass = spinning
    ? side === "front"
      ? "coin-spin-front"
      : "coin-spin-back"
    : "";

  const renderFaceContent = (face: CoinSide) => (
    <div style={coinCircleStyle}>
      <Image
        src={face === "front" ? COIN_IMAGES.front : COIN_IMAGES.back}
        alt={face === "front" ? "乾隆通宝正面" : "乾隆通宝背面"}
        fill
        sizes={`${sizePx}px`}
        className="object-cover object-center"
        style={coinImageStyle}
      />
    </div>
  );

  return (
    <div
      className="coin-3d-wrapper flex shrink-0 items-center justify-center"
      style={{
        perspective: "400px",
        width: sizePx,
        height: sizePx,
        isolation: "isolate",
      }}
    >
      <div
        className={`relative h-full w-full ${spinClass}`}
        style={{
          transformStyle: "preserve-3d",
          transform: "translateZ(0)",
          ...(spinning && { animationDuration: `${durationSec}s` }),
          ...(!spinning && {
            transform: `translateZ(0) rotateY(${side === "front" ? 0 : 180}deg)`,
          }),
        }}
      >
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
      </div>
    </div>
  );
}
