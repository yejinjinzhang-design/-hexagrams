"use client";

/**
 * 乾隆通宝满文面（正面）- SVG 绘制
 * 方孔 + 满文/装饰纹样，古铜色
 */
export function CoinBack() {
  return (
    <svg
      viewBox="0 0 120 120"
      className="h-full w-full"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient
          id="coinBackGradient"
          cx="50%"
          cy="50%"
          r="50%"
          fx="45%"
          fy="45%"
        >
          <stop offset="0%" stopColor="#C4A060" />
          <stop offset="40%" stopColor="#9B7344" />
          <stop offset="100%" stopColor="#5C4528" />
        </radialGradient>
        <linearGradient
          id="coinBackEdge"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#A08050" />
          <stop offset="100%" stopColor="#5C4528" />
        </linearGradient>
        <filter id="coinBackShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.35" />
        </filter>
      </defs>
      <circle
        cx="60"
        cy="60"
        r="54"
        fill="url(#coinBackGradient)"
        filter="url(#coinBackShadow)"
      />
      <circle
        cx="60"
        cy="60"
        r="54"
        fill="none"
        stroke="url(#coinBackEdge)"
        strokeWidth="3"
      />
      {/* 方孔 */}
      <rect
        x="48"
        y="48"
        width="24"
        height="24"
        fill="#3d3428"
        stroke="#2a231c"
        strokeWidth="1"
      />
      {/* 装饰纹样：双线圆 + 四角云纹简化 */}
      <circle
        cx="60"
        cy="60"
        r="32"
        fill="none"
        stroke="#6b5344"
        strokeWidth="2"
        opacity="0.9"
      />
      <circle
        cx="60"
        cy="60"
        r="28"
        fill="none"
        stroke="#5c4528"
        strokeWidth="1"
        opacity="0.7"
      />
      {/* 四角装饰（类似满文/云纹） */}
      <path
        d="M44 36 Q52 32 60 36 Q68 32 76 36"
        stroke="#5c4528"
        strokeWidth="1.5"
        fill="none"
        opacity="0.85"
      />
      <path
        d="M84 44 Q88 52 84 60 Q88 68 84 76"
        stroke="#5c4528"
        strokeWidth="1.5"
        fill="none"
        opacity="0.85"
      />
      <path
        d="M76 84 Q68 88 60 84 Q52 88 44 84"
        stroke="#5c4528"
        strokeWidth="1.5"
        fill="none"
        opacity="0.85"
      />
      <path
        d="M36 76 Q32 68 36 60 Q32 52 36 44"
        stroke="#5c4528"
        strokeWidth="1.5"
        fill="none"
        opacity="0.85"
      />
      {/* 中心小菱形装饰 */}
      <path
        d="M60 52 L66 60 L60 68 L54 60 Z"
        fill="none"
        stroke="#6b5344"
        strokeWidth="1"
        opacity="0.8"
      />
    </svg>
  );
}
