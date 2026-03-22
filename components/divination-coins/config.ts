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

/**
 * 乾隆通宝朝向约定（与爻值一致）：
 * - `front` = 满文面 = 铜钱「正面」= 记 3 分（三枚皆此为老阳）
 * - `back` = 汉字面 = 铜钱「反面」= 记 2 分（三枚皆此为老阴）
 *
 * 资源文件名沿用历史命名（coin_front / coin_back），此前曾把汉字图误绑到 front；
 * 此处对调绑定，使逻辑上的 front/back 与真实满文/汉字面一致。
 */
export const COIN_IMAGES = {
  front: "/coins/coin_back.png",
  back: "/coins/coin_front.png",
} as const;
