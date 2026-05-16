/**
 * 全页氛围：机构级克制水墨。
 * 不再使用大面积米黄、远山、竹影。整页以纯净纸面 + 一道发丝水平线 + 一笔极淡墨痕为限。
 * 视觉中心彻底交还给内容。
 */
export function AmbientBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/* 纸面底色 */}
      <div className="absolute inset-0 bg-[#faf9f5]" />

      {/* 极淡的右上单笔墨痕：作为唯一的水墨意象，不拼贴山水 */}
      <svg
        className="absolute right-[-60px] top-[-40px] h-[260px] w-[420px] text-[#14110e]"
        viewBox="0 0 420 260"
        fill="none"
        preserveAspectRatio="xMaxYMin meet"
        aria-hidden
      >
        <defs>
          <linearGradient id="brush-fade" x1="0%" y1="0%" x2="100%" y2="40%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
            <stop offset="55%" stopColor="currentColor" stopOpacity="0.045" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.085" />
          </linearGradient>
        </defs>
        <path
          fill="url(#brush-fade)"
          d="M40 188 C 120 152 200 122 282 90 C 332 70 372 58 408 52 L 420 0 L 420 158 C 376 168 320 178 252 198 C 168 222 100 232 40 234 Z"
        />
        <path
          stroke="currentColor"
          strokeWidth="0.8"
          strokeOpacity="0.12"
          strokeLinecap="round"
          fill="none"
          d="M48 192 C 132 156 218 124 302 92 C 348 76 384 64 412 58"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* 极淡的左下"水痕"基线，让画面下沿不显得突兀 */}
      <div
        className="absolute inset-x-0 bottom-0 h-[120px]"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, rgba(20, 17, 14, 0.018) 65%, rgba(20, 17, 14, 0.035) 100%)",
        }}
      />
    </div>
  );
}
