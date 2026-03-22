"use client";

/**
 * 乾隆通宝汉字面（反面）- SVG 绘制
 * 上乾 右通 下隆 左宝，中方孔，古铜渐变
 */
export function CoinFront() {
  return (
    <svg
      viewBox="0 0 120 120"
      className="h-full w-full"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* 铜色渐变：中心略亮模拟凸面，边缘深 */}
        <radialGradient
          id="coinFrontGradient"
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
          id="coinFrontEdge"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#A08050" />
          <stop offset="100%" stopColor="#5C4528" />
        </linearGradient>
        {/* 内缘阴影 */}
        <filter id="coinFrontShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.35" />
        </filter>
      </defs>
      {/* 外圆 - 铜钱本体 */}
      <circle
        cx="60"
        cy="60"
        r="54"
        fill="url(#coinFrontGradient)"
        filter="url(#coinFrontShadow)"
      />
      {/* 边缘加深 */}
      <circle
        cx="60"
        cy="60"
        r="54"
        fill="none"
        stroke="url(#coinFrontEdge)"
        strokeWidth="3"
      />
      {/* 方孔（中心方形镂空效果：用深色矩形模拟） */}
      <rect
        x="48"
        y="48"
        width="24"
        height="24"
        fill="#3d3428"
        stroke="#2a231c"
        strokeWidth="1"
      />
      {/* 四字：上乾 右通 下隆 左宝 */}
      <text
        x="60"
        y="38"
        textAnchor="middle"
        fill="#4a3c28"
        fontSize="14"
        fontWeight="600"
        fontFamily="serif"
      >
        乾
      </text>
      <text
        x="82"
        y="62"
        textAnchor="middle"
        fill="#4a3c28"
        fontSize="14"
        fontWeight="600"
        fontFamily="serif"
        transform="rotate(90 82 62)"
      >
        通
      </text>
      <text
        x="60"
        y="86"
        textAnchor="middle"
        fill="#4a3c28"
        fontSize="14"
        fontWeight="600"
        fontFamily="serif"
        transform="rotate(180 60 86)"
      >
        隆
      </text>
      <text
        x="38"
        y="62"
        textAnchor="middle"
        fill="#4a3c28"
        fontSize="14"
        fontWeight="600"
        fontFamily="serif"
        transform="rotate(-90 38 62)"
      >
        宝
      </text>
    </svg>
  );
}
