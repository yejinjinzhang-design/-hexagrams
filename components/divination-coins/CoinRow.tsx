"use client";

import { Coin, type CoinPhase, type CoinSide } from "./Coin";
import { COIN_CONFIG } from "./config";

export interface CoinRowProps {
  coinPhases: [CoinPhase, CoinPhase, CoinPhase];
  /** 三枚铜钱最终朝向：front=满文（正），back=汉字（反），顺序 [左, 中, 右] */
  finalSides: [CoinSide, CoinSide, CoinSide];
  /** tossing 阶段参数 */
  tossDurations?: [number, number, number];
  tossDelays?: [number, number, number];
  /** settling 阶段参数 */
  settleDurations?: [number, number, number];
  settleDelays?: [number, number, number];
  settleFromYs?: [number, number, number];
  settleFromXs?: [number, number, number];
  settleXFinals?: [number, number, number];
  settleYFinals?: [number, number, number];
  finalRotZs?: [number, number, number];
}

const { gapPx, durationsMs } = COIN_CONFIG;

/**
 * 三枚铜钱 flex 居中排列，gap 32px
 */
export function CoinRow({
  coinPhases,
  finalSides,
  tossDurations,
  tossDelays,
  settleDurations,
  settleDelays,
  settleFromYs,
  settleFromXs,
  settleXFinals,
  settleYFinals,
  finalRotZs,
}: CoinRowProps) {
  return (
    <div
      className="flex flex-row items-center justify-center"
      style={{
        gap: gapPx,
        height: COIN_CONFIG.sizePx,
        minHeight: COIN_CONFIG.sizePx,
      }}
    >
      {[0, 1, 2].map((i) => {
        const coinPhase = coinPhases[i as 0 | 1 | 2];
        const durationMs =
          tossDurations && tossDurations[i as 0 | 1 | 2] != null
            ? tossDurations[i as 0 | 1 | 2]
            : durationsMs[i as 0 | 1 | 2];
        const delayMs =
          tossDelays && tossDelays[i as 0 | 1 | 2] != null
            ? tossDelays[i as 0 | 1 | 2]
            : i * 80;

        const settleDurationMs =
          settleDurations && settleDurations[i as 0 | 1 | 2] != null
            ? settleDurations[i as 0 | 1 | 2]
            : 700;
        const settleDelayMs =
          settleDelays && settleDelays[i as 0 | 1 | 2] != null
            ? settleDelays[i as 0 | 1 | 2]
            : 0;

        const fromY =
          settleFromYs && settleFromYs[i as 0 | 1 | 2] != null
            ? settleFromYs[i as 0 | 1 | 2]
            : -80;
        const fromX =
          settleFromXs && settleFromXs[i as 0 | 1 | 2] != null
            ? settleFromXs[i as 0 | 1 | 2]
            : 0;
        const xFinal =
          settleXFinals && settleXFinals[i as 0 | 1 | 2] != null
            ? settleXFinals[i as 0 | 1 | 2]
            : 0;
        const yFinal =
          settleYFinals && settleYFinals[i as 0 | 1 | 2] != null
            ? settleYFinals[i as 0 | 1 | 2]
            : 0;

        const rotZ =
          finalRotZs && finalRotZs[i as 0 | 1 | 2] != null
            ? finalRotZs[i as 0 | 1 | 2]
            : 0;

        const coin = (
          <Coin
            key={i}
            index={i}
            phase={coinPhase}
            finalSide={finalSides[i as 0 | 1 | 2]}
            tossDurationMs={durationMs}
            tossDelayMs={delayMs}
            settleDurationMs={settleDurationMs}
            settleDelayMs={settleDelayMs}
            settleFromY={fromY}
            settleFromX={fromX}
            settleXFinal={xFinal}
            settleYFinal={yFinal}
            finalRotZ={rotZ}
          />
        );

        // 静置时加入轻微错落，模拟“刚放上案台”的角度与高低。
        const placements =
          coinPhase === "tossing" || coinPhase === "settling" || coinPhase === "settled"
            ? { ty: 0, rot: 0 }
            : i === 0
              ? { ty: 8, rot: -8 }
              : i === 1
                ? { ty: 2, rot: 4 }
                : { ty: 10, rot: 10 };

        return (
          <div
            key={`place-${i}`}
            className={`coin-place ${
              coinPhase === "idle" ? "coin-breathe" : ""
            }`}
            style={{
              transition:
                coinPhase === "idle" ? "transform 250ms ease" : "none",
              ["--baseTy" as any]: `${placements.ty}px`,
              ["--baseRot" as any]: `${placements.rot}deg`,
              animationDelay: `${i * 0.12}s`,
            }}
          >
            {coin}
          </div>
        );
      })}
    </div>
  );
}
