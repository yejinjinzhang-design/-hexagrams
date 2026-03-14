"use client";

import Image from "next/image";
import { CoinFront } from "./CoinFront";
import { CoinBack } from "./CoinBack";

export type CoinSide = "front" | "back";

export interface CoinProps {
  side: CoinSide;
  spinning: boolean;
  durationMs?: number;
}

const USE_PHOTO = true; // 使用裁剪后的真实照片

/**
 * 单枚铜钱：真实照片或 SVG，纯 Y 轴翻面，无厚度层避免残影
 */
export function Coin({
  side,
  spinning,
  durationMs = 900
}: CoinProps) {
  const durationSec = durationMs / 1000;
  const spinClass = spinning
    ? side === "front"
      ? "coin-spin-front"
      : "coin-spin-back"
    : "";

  return (
    <div
      className="coin-3d-wrapper"
      style={{
        perspective: "400px",
        width: "72px",
        height: "72px",
        isolation: "isolate"
      }}
    >
      <div
        className={`relative h-full w-full ${spinClass}`}
        style={{
          transformStyle: "preserve-3d",
          transform: "translateZ(0)",
          ...(spinning && { animationDuration: `${durationSec}s` }),
          ...(!spinning && {
            transform: `translateZ(0) rotateY(${side === "front" ? 0 : 180}deg)`
          })
        }}
      >
        {/* 正面：无黑底，照片放大居中只留铜钱 */}
        <div
          className="absolute inset-0 flex items-center justify-center rounded-full overflow-hidden bg-[#e8dcc8]"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(0deg)"
          }}
        >
          <div className="relative h-full w-full rounded-full overflow-hidden">
            {USE_PHOTO ? (
              <Image
                src="/coins/qianlong-front.png"
                alt="乾隆通宝正面"
                fill
                sizes="72px"
                className="object-cover rounded-full"
                style={{
                  objectPosition: "center center",
                  filter: "brightness(1.05) contrast(1.08) saturate(1.03)",
                  transform: "scale(1.35)"
                }}
              />
            ) : (
              <CoinFront />
            )}
          </div>
        </div>
        {/* 背面：同上 */}
        <div
          className="absolute inset-0 flex items-center justify-center rounded-full overflow-hidden bg-[#e8dcc8]"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            position: "absolute",
            top: 0,
            left: 0,
            transform: "rotateY(180deg)"
          }}
        >
          <div className="relative h-full w-full rounded-full overflow-hidden">
            {USE_PHOTO ? (
              <Image
                src="/coins/qianlong-back.png"
                alt="乾隆通宝背面"
                fill
                sizes="72px"
                className="object-cover rounded-full"
                style={{
                  objectPosition: "center center",
                  filter: "brightness(1.05) contrast(1.08) saturate(1.03)",
                  transform: "scale(1.35)"
                }}
              />
            ) : (
              <CoinBack />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
