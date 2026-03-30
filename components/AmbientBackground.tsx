/**
 * 全页氛围：宣纸暖底、浓淡不匀、淡墨晕、远山水墨、角落竹影。
 * 避免 SVG feTurbulence 平铺（易产生斜向接缝与「AI 纹理」感）。
 */
export function AmbientBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/* 宣纸底色 + 局部浓淡（无重复平铺纹理） */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(165deg, #fcf9f4 0%, #f4ebe0 34%, #f8f3eb 68%, #efe6d8 100%)
          `,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          opacity: 0.85,
          background: `
            radial-gradient(ellipse 95% 70% at 6% 4%, rgba(188, 168, 138, 0.28), transparent 58%),
            radial-gradient(ellipse 70% 55% at 98% 12%, rgba(115, 105, 92, 0.1), transparent 52%),
            radial-gradient(ellipse 85% 55% at 50% 96%, rgba(165, 148, 128, 0.12), transparent 56%),
            radial-gradient(ellipse 45% 38% at 70% 36%, rgba(255, 252, 247, 0.72), transparent 55%),
            radial-gradient(ellipse 28% 22% at 22% 62%, rgba(100, 88, 74, 0.04), transparent 70%),
            radial-gradient(ellipse 35% 28% at 82% 48%, rgba(62, 49, 39, 0.035), transparent 65%)
          `,
        }}
      />
      {/* 极轻「纸纤维」：仅多层柔边，无噪点图块 */}
      <div
        className="absolute inset-0 opacity-[0.4]"
        style={{
          background: `
            radial-gradient(ellipse 8% 12% at 15% 25%, rgba(62, 49, 39, 0.045), transparent 100%),
            radial-gradient(ellipse 6% 10% at 42% 78%, rgba(62, 49, 39, 0.035), transparent 100%),
            radial-gradient(ellipse 7% 11% at 73% 33%, rgba(62, 49, 39, 0.03), transparent 100%),
            radial-gradient(ellipse 5% 9% at 88% 71%, rgba(62, 49, 39, 0.028), transparent 100%),
            radial-gradient(ellipse 6% 8% at 31% 91%, rgba(62, 49, 39, 0.025), transparent 100%)
          `,
        }}
      />
      {/* 顶区极淡墨（靠边，避免压中间阅读区） */}
      <div
        className="absolute left-1/2 top-0 h-[min(36vh,260px)] w-[min(100vw,900px)] -translate-x-1/2"
        style={{
          background:
            "radial-gradient(ellipse 88% 70% at 50% -8%, rgba(62, 49, 39, 0.06), transparent 62%)",
        }}
      />
      {/* 右下隅淡墨 */}
      <div
        className="absolute bottom-0 right-0 h-[min(36vh,280px)] w-[min(52vw,480px)]"
        style={{
          background:
            "radial-gradient(ellipse 70% 58% at 100% 100%, rgba(62, 49, 39, 0.11), transparent 72%)",
        }}
      />
      {/* 远山水墨：墨色留在四周，中间留白（遮罩）以免压正文与按钮 */}
      <div
        className="absolute inset-x-0 bottom-0 h-[min(38vh,300px)] opacity-[0.52]"
        style={{
          WebkitMaskImage:
            "radial-gradient(ellipse 82% 95% at 50% 100%, transparent 0%, transparent 36%, rgba(0,0,0,0.45) 55%, black 85%)",
          maskImage:
            "radial-gradient(ellipse 82% 95% at 50% 100%, transparent 0%, transparent 36%, rgba(0,0,0,0.45) 55%, black 85%)",
          WebkitMaskSize: "100% 100%",
          maskSize: "100% 100%",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
        }}
      >
        <svg
          className="h-full w-full text-[#3a322c]"
          viewBox="0 0 1200 420"
          preserveAspectRatio="xMidYMax slice"
          aria-hidden
        >
          <defs>
            <linearGradient id="ink-far" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
              <stop offset="35%" stopColor="currentColor" stopOpacity="0.05" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.12" />
            </linearGradient>
            <linearGradient id="ink-mid-a" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
              <stop offset="30%" stopColor="currentColor" stopOpacity="0.06" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.14" />
            </linearGradient>
            <linearGradient id="ink-mid-b" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
              <stop offset="28%" stopColor="currentColor" stopOpacity="0.07" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.17" />
            </linearGradient>
            <linearGradient id="ink-near" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
              <stop offset="22%" stopColor="currentColor" stopOpacity="0.08" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.22" />
            </linearGradient>
            <linearGradient id="water-mist" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#f4ebe0" stopOpacity="0.65" />
              <stop offset="45%" stopColor="#f6efe4" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#f6efe4" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* 最远层峦（多峰） */}
          <path
            fill="url(#ink-far)"
            d="M0 158 C 95 148 140 108 228 118 C 310 88 390 108 468 95 C 548 78 612 98 698 88 C 778 72 858 92 938 82 C 1018 72 1105 95 1200 85 L 1200 420 L 0 420 Z"
          />
          {/* 中景左段岛峦 */}
          <path
            fill="url(#ink-mid-a)"
            d="M0 198 C 72 175 128 142 205 155 C 268 128 338 152 405 138 C 455 118 512 145 580 162 C 520 185 455 175 398 198 C 320 218 248 205 168 228 C 105 248 48 268 0 285 L 0 420 Z"
          />
          {/* 中景主脉 */}
          <path
            fill="url(#ink-mid-a)"
            d="M0 218 C 180 188 320 165 455 188 C 538 172 615 198 702 185 C 792 168 875 195 968 178 C 1048 162 1125 188 1200 175 L 1200 420 L 0 420 Z"
          />
          {/* 近岸浓一层 */}
          <path
            fill="url(#ink-mid-b)"
            d="M0 252 C 220 218 380 235 520 248 C 612 228 705 258 805 242 C 898 225 985 262 1085 248 C 1145 238 1185 255 1200 262 L 1200 420 L 0 420 Z"
          />
          <path
            fill="url(#ink-near)"
            d="M0 288 C 260 255 480 275 640 292 C 735 272 835 305 955 288 C 1045 275 1125 298 1200 308 L 1200 420 L 0 420 Z"
          />
          {/* 水际雾 */}
          <path
            fill="url(#water-mist)"
            d="M0 312 C 280 292 520 305 740 318 C 900 308 1055 322 1200 315 L 1200 420 L 0 420 Z"
          />
          {/* —— 线描：主脉山脊 —— */}
          <g
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          >
            <path
              strokeWidth={1.15}
              strokeOpacity={0.24}
              d="M0 152 C 110 138 175 95 265 105 C 348 78 425 98 508 85 C 592 68 668 88 752 78 C 838 65 918 85 1005 72 C 1088 60 1165 82 1200 75"
            />
            <path
              strokeWidth={0.95}
              strokeOpacity={0.18}
              d="M0 188 C 155 162 285 138 418 158 C 505 142 588 168 678 152 C 768 135 855 162 948 145 C 1035 128 1118 155 1200 138"
            />
            <path
              strokeWidth={0.85}
              strokeOpacity={0.2}
              d="M0 228 C 198 198 348 218 488 232 C 578 212 668 242 768 225 C 862 208 952 238 1055 222 C 1128 210 1185 232 1200 238"
            />
            <path
              strokeWidth={0.75}
              strokeOpacity={0.17}
              d="M0 268 C 240 238 420 258 598 275 C 698 255 798 288 912 272 C 1002 258 1088 285 1200 272"
            />
            {/* 辅脉与谷间起伏 */}
            <path
              strokeWidth={0.55}
              strokeOpacity={0.13}
              d="M120 195 C 185 168 248 182 312 165 C 368 148 428 175 492 158"
            />
            <path
              strokeWidth={0.5}
              strokeOpacity={0.12}
              d="M520 178 C 592 155 648 172 718 158 C 788 142 848 168 918 152"
            />
            <path
              strokeWidth={0.55}
              strokeOpacity={0.14}
              d="M180 248 C 268 225 348 242 438 228 C 528 212 612 248 705 232"
            />
            <path
              strokeWidth={0.48}
              strokeOpacity={0.11}
              d="M758 238 C 828 218 892 248 968 232 C 1042 218 1105 245 1165 235"
            />
            {/* 短皴（枯笔意） */}
            <path
              strokeWidth={0.4}
              strokeOpacity={0.1}
              d="M85 210 L 102 198 M 128 205 L 155 188 M 198 218 L 225 198 M 268 228 L 298 205 M 348 235 L 378 215"
            />
            <path
              strokeWidth={0.38}
              strokeOpacity={0.09}
              d="M455 205 L 478 188 M 512 198 L 542 178 M 588 208 L 618 185 M 668 198 L 695 178 M 738 205 L 768 182"
            />
            <path
              strokeWidth={0.36}
              strokeOpacity={0.1}
              d="M828 218 L 858 198 M 898 228 L 928 205 M 968 218 L 998 195 M 1048 225 L 1078 202"
            />
            <path
              strokeWidth={0.35}
              strokeOpacity={0.09}
              d="M142 268 L 172 252 M 228 282 L 258 262 M 318 288 L 352 268 M 412 295 L 445 275 M 512 302 L 548 282"
            />
            <path
              strokeWidth={0.34}
              strokeOpacity={0.08}
              d="M628 288 L 662 268 M 712 298 L 748 278 M 808 305 L 842 285 M 912 298 L 948 278"
            />
            {/* 水纹 */}
            <path
              strokeWidth={0.45}
              strokeOpacity={0.09}
              d="M0 338 C 200 328 400 348 600 335 C 800 322 1000 342 1200 328"
            />
            <path
              strokeWidth={0.38}
              strokeOpacity={0.07}
              d="M40 358 C 280 348 520 368 760 355 C 920 348 1080 362 1180 352"
            />
            <path
              strokeWidth={0.32}
              strokeOpacity={0.06}
              d="M120 378 C 380 368 620 388 880 375 C 980 372 1088 382 1160 378"
            />
          </g>
        </svg>
      </div>
      {/* 左上：竹枝剪影（线描为主，勿用大色块椭圆） */}
      <svg
        className="absolute left-0 top-0 h-[min(42vh,340px)] w-[min(48vw,300px)] text-[#2e261f] sm:w-[min(44vw,280px)]"
        style={{ opacity: 0.16 }}
        viewBox="0 0 260 340"
        preserveAspectRatio="xMinYMin meet"
        fill="none"
      >
        <g
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        >
          <path
            strokeWidth={1.35}
            d="M14 318 C 32 228 22 140 30 88 C 34 52 48 22 62 8"
            opacity={0.95}
          />
          <path
            strokeWidth={0.95}
            d="M28 248 Q 58 218 92 198"
            opacity={0.45}
          />
          <path
            strokeWidth={0.95}
            d="M36 188 Q 72 162 108 138"
            opacity={0.4}
          />
          <path
            strokeWidth={0.95}
            d="M22 278 Q 54 258 86 242"
            opacity={0.38}
          />
          {/* 竹叶：细长勾勒 */}
          <path
            strokeWidth={0.85}
            d="M98 118 Q 108 108 122 118 Q 108 128 98 118"
            opacity={0.42}
          />
          <path
            strokeWidth={0.85}
            d="M112 152 Q 124 140 138 152 Q 124 164 112 152"
            opacity={0.36}
          />
          <path
            strokeWidth={0.85}
            d="M88 188 Q 100 176 114 188 Q 100 200 88 188"
            opacity={0.32}
          />
          <path
            strokeWidth={0.75}
            d="M72 98 Q 82 88 94 96"
            opacity={0.28}
          />
        </g>
      </svg>
      {/* 右下：竹影 */}
      <svg
        className="absolute bottom-0 right-0 h-[min(40vh,300px)] w-[min(58vw,380px)] text-[#2e261f]"
        style={{ opacity: 0.13 }}
        viewBox="0 0 340 300"
        preserveAspectRatio="xMaxYMax meet"
        fill="none"
      >
        <g
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        >
          <path
            strokeWidth={1.3}
            d="M326 292 C 286 220 298 130 276 72 C 268 44 252 18 236 6"
            opacity={0.92}
          />
          <path
            strokeWidth={0.95}
            d="M308 228 Q 258 198 212 178"
            opacity={0.42}
          />
          <path
            strokeWidth={0.95}
            d="M292 168 Q 242 142 198 118"
            opacity={0.36}
          />
          <path
            strokeWidth={0.85}
            d="M232 132 Q 252 118 272 128 Q 252 142 232 132"
            opacity={0.38}
          />
          <path
            strokeWidth={0.85}
            d="M258 168 Q 278 154 298 168 Q 278 182 258 168"
            opacity={0.33}
          />
          <path
            strokeWidth={0.85}
            d="M198 198 Q 218 184 238 198 Q 218 212 198 198"
            opacity={0.3}
          />
        </g>
      </svg>
    </div>
  );
}
