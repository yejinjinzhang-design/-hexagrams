import type { DivinationResult, LineInfo, LineKind } from "@/types/divination";

interface HexagramViewProps {
  result: DivinationResult;
}

function kindToLabel(kind: LineKind): string {
  switch (kind) {
    case "lao-yin":
      return "老阴";
    case "shao-yin":
      return "少阴";
    case "shao-yang":
      return "少阳";
    case "lao-yang":
      return "老阳";
    default:
      return kind;
  }
}

function renderLineSymbol(line: LineInfo) {
  const isYang = line.polarity === "yang";
  const isMoving = line.moving;
  const base =
    "relative h-6 w-full rounded-full border border-ink-accent/40 bg-gradient-to-r from-slate-900 to-slate-800 flex items-center justify-center text-[11px] text-gray-300";

  if (isYang) {
    return (
      <div className={base}>
        <div className="h-[2px] w-[76%] rounded-full bg-ink-accent" />
        {isMoving && (
          <span className="absolute right-2 text-[10px] text-amber-300">
            动
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={base}>
      <div className="flex h-[2px] w-[76%] items-center justify-between">
        <span className="h-[2px] w-[30%] rounded-full bg-ink-accent" />
        <span className="h-[2px] w-[30%] rounded-full bg-ink-accent" />
      </div>
      {isMoving && (
        <span className="absolute right-2 text-[10px] text-amber-300">动</span>
      )}
    </div>
  );
}

export function HexagramView({ result }: HexagramViewProps) {
  const { originalHexagram, changedHexagram, movingLines } = result;

  const renderHex = (kind: "original" | "changed") => {
    const hex = kind === "original" ? originalHexagram : changedHexagram;
    if (!hex) return null;
    const isChangedHex = kind === "changed";
    return (
      <div className="flex flex-1 flex-col gap-2 rounded-xl border border-ink-accent/30 bg-ink-muted/60 p-3">
        <div className="mb-1 flex items-baseline justify-between gap-2 text-xs text-gray-300">
          <div className="font-medium text-ink-accent">
            {kind === "original" ? "本卦" : "变卦"}
            {hex.name ? ` · ${hex.name}` : null}
          </div>
          <div className="text-[10px] text-gray-400">
            代码：{hex.binaryCode || "未知"}
          </div>
        </div>
        <div className="flex flex-col-reverse gap-1">
          {hex.lines.map((line) => (
            <div key={`${kind}-${line.index}`} className="flex items-center gap-2">
              <span className="w-4 text-[10px] text-gray-400">
                {line.index}
              </span>
              {renderLineSymbol(line)}
              <span className="w-16 text-[10px] text-gray-400">
                {isChangedHex
                  ? line.polarity === "yang"
                    ? "少阳"
                    : "少阴"
                  : kindToLabel(line.kind)}
                {line.moving ? " 动" : ""}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-ink-accent/40 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 text-sm">
      <div className="mb-1 flex items-center justify-between text-xs text-gray-300">
        <span className="font-medium text-ink-accent">六爻卦象</span>
        <span className="text-[10px] text-gray-400">
          动爻：{movingLines.length > 0 ? movingLines.join("、") : "无"}
        </span>
      </div>
      <div className="flex flex-col gap-3 md:flex-row">
        {renderHex("original")}
        {renderHex("changed")}
      </div>
    </div>
  );
}

