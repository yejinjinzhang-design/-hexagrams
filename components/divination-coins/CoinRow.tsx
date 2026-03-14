"use client";

import { Coin, type CoinSide } from "./Coin";
import { COIN_CONFIG } from "./config";

export interface CoinRowProps {
  /** 三枚铜钱的正背结果，顺序固定 [左, 中, 右] */
  sides: [CoinSide, CoinSide, CoinSide];
  spinning: boolean;
}

const { gapPx, durationsMs } = COIN_CONFIG;

/**
 * 三枚铜钱 flex 居中排列，gap 32px
 */
export function CoinRow({ sides, spinning }: CoinRowProps) {
  return (
    <div
      className={`flex flex-row items-center justify-center ${spinning ? "coin-row-toss" : ""}`}
      style={{
        gap: gapPx,
        height: COIN_CONFIG.sizePx,
        minHeight: COIN_CONFIG.sizePx,
      }}
    >
      <Coin
        index={0}
        side={sides[0]}
        spinning={spinning}
        durationMs={durationsMs[0]}
      />
      <Coin
        index={1}
        side={sides[1]}
        spinning={spinning}
        durationMs={durationsMs[1]}
      />
      <Coin
        index={2}
        side={sides[2]}
        spinning={spinning}
        durationMs={durationsMs[2]}
      />
    </div>
  );
}
