import type {
  DivinationResult,
  Hexagram,
  LineInfo,
  LineKind,
  LinePolarity
} from "@/types/divination";
import { getHexagramMetaByCode } from "@/lib/gua-data";
import { getChangedHexagramName, getHexagramName } from "@/utils/hexagram";

/**
 * 采用「三枚铜钱」起卦法（乾隆通宝）：
 * - 正面 = 满文面，记 3
 * - 反面 = 汉字面，记 2
 * 三枚分数之和为：
 * - 6 => 老阴（三反，阴爻动）
 * - 7 => 少阳（两反一正，静阳）
 * - 8 => 少阴（两正一反，静阴）
 * - 9 => 老阳（三正，阳爻动）
 */
export function mapCoinSumToLineKind(sum: number): LineKind {
  if (sum === 6) return "lao-yin";
  if (sum === 7) return "shao-yang";
  if (sum === 8) return "shao-yin";
  if (sum === 9) return "lao-yang";
  throw new Error("coin sum must be one of 6, 7, 8, 9");
}

export function getPolarity(kind: LineKind): LinePolarity {
  if (kind === "lao-yin" || kind === "shao-yin") return "yin";
  return "yang";
}

export function isMoving(kind: LineKind): boolean {
  return kind === "lao-yin" || kind === "lao-yang";
}

export function getChangedPolarity(kind: LineKind): LinePolarity {
  if (!isMoving(kind)) {
    return getPolarity(kind);
  }
  return getPolarity(kind) === "yin" ? "yang" : "yin";
}

export function buildLineInfo(coinSum: number, index: number): LineInfo {
  const kind = mapCoinSumToLineKind(coinSum);
  const polarity = getPolarity(kind);
  const moving = isMoving(kind);
  const changedPolarity = getChangedPolarity(kind);

  return {
    index,
    kind,
    polarity,
    moving,
    changedPolarity,
    diceSum: coinSum
  };
}

export function computeBinaryCodeFromPolarities(
  polarities: LinePolarity[]
): string {
  if (polarities.length !== 6) {
    throw new Error("hexagram must have 6 lines");
  }

  const bitsBottomToTop = polarities.map((p) => (p === "yang" ? "1" : "0"));
  const bitsTopToBottom = [...bitsBottomToTop].reverse();
  return bitsTopToBottom.join("");
}

export function buildHexagramFromLines(lines: LineInfo[]): Hexagram {
  if (lines.length !== 6) {
    throw new Error("hexagram must have 6 lines");
  }

  const sorted = [...lines].sort((a, b) => a.index - b.index);
  const polarities = sorted.map((l) => l.polarity);
  const binaryCode = computeBinaryCodeFromPolarities(polarities);

  const meta = getHexagramMetaByCode(binaryCode);

  return {
    lines: sorted,
    binaryCode,
    name: meta?.name ?? getHexagramName(sorted),
    description: meta?.description
  };
}

export function buildChangedHexagramFromLines(lines: LineInfo[]): Hexagram {
  if (lines.length !== 6) {
    throw new Error("hexagram must have 6 lines");
  }

  const sorted = [...lines].sort((a, b) => a.index - b.index);
  const polarities = sorted.map((l) => l.changedPolarity);
  const binaryCode = computeBinaryCodeFromPolarities(polarities);
  const meta = getHexagramMetaByCode(binaryCode);

  const changedLines: LineInfo[] = sorted.map((l) => ({
    ...l,
    polarity: l.changedPolarity
  }));

  return {
    lines: changedLines,
    binaryCode,
    name: meta?.name ?? getChangedHexagramName(sorted),
    description: meta?.description
  };
}

export function computeDivinationResult(coinSums: number[]): DivinationResult {
  if (coinSums.length !== 6) {
    throw new Error("exactly 6 coin sums are required");
  }

  const lines = coinSums.map((sum, idx) => buildLineInfo(sum, idx + 1));
  const movingLines = lines.filter((l) => l.moving).map((l) => l.index);

  const originalHexagram = buildHexagramFromLines(lines);
  const changedHexagram =
    movingLines.length > 0 ? buildChangedHexagramFromLines(lines) : undefined;

  return {
    lines,
    originalHexagram,
    changedHexagram,
    movingLines
  };
}

