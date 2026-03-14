/**
 * 铜钱 UI：88x88 圆形容器、object-fit cover、scale(1.06) 去白边、gap 32px、轻微悬浮阴影
 */
export const COIN_CONFIG = {
  /** 单枚铜钱容器 88x88 */
  sizePx: 88,
  /** 三枚铜钱间距 32px */
  gapPx: 32,
  /** 容器背景 */
  containerBg: "#f3efe6",
  /** 铜钱轻微悬浮感（像摆在桌上） */
  coinBoxShadow: "0 2px 4px rgba(0,0,0,0.15), 0 8px 18px rgba(0,0,0,0.08)",
  /** 动画总时长（ms） */
  animationDurationMs: 1900,
  /** 三枚错落时长（ms） */
  durationsMs: [1800, 1850, 1900] as [number, number, number],
} as const;

/** 使用脚本生成的最终 UI 素材，不再使用旧素材 */
export const COIN_IMAGES = {
  front: "/coins/coin_front.png",
  back: "/coins/coin_back.png",
} as const;
