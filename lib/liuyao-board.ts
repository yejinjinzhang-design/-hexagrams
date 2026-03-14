import {
  getNaJiaData,
  getTransformedHexagram,
  getAstrologyData,
  analyzeGlobalIndicators,
} from "najia-core";
import type { YaoType } from "najia-core";
import type { DivinationResult } from "@/types/divination";
import type {
  LiuyaoBoard,
  HexagramBoard,
  YaoLineBoard,
  GlobalIndicator,
  LiuyaoBoardMeta,
} from "@/types/liuyao-board";

const SUM_TO_YAO: Record<number, YaoType> = {
  6: "old_yin",
  7: "young_yang",
  8: "young_yin",
  9: "old_yang",
};

/** 八纯卦 + 归魂卦 binary -> 卦宫名（与 najia 一致） */
const BINARY_TO_PALACE: Record<string, string> = {
  "111111": "乾宫",
  "000000": "坤宫",
  "100100": "震宫",
  "011011": "巽宫",
  "010010": "坎宫",
  "101101": "离宫",
  "001001": "艮宫",
  "110110": "兑宫",
  "111101": "乾宫",
  "000010": "坤宫",
  "100110": "震宫",
  "011001": "巽宫",
  "010000": "坎宫",
  "101111": "离宫",
  "001010": "艮宫",
  "110100": "兑宫",
};

function diceSumsToHexagram(diceSums: number[]) {
  if (!Array.isArray(diceSums) || diceSums.length !== 6) {
    throw new Error("diceSums 必须为长度为 6 的数组");
  }
  const lines = diceSums.map((s) => {
    if (!SUM_TO_YAO[s]) throw new Error(`无效爻值: ${s}`);
    return SUM_TO_YAO[s];
  });
  return { lines };
}

/** 从爻性得到本卦 binary（初爻→上爻，1=阳 0=阴） */
function hexagramToBinary(lines: YaoType[]): string {
  const bits = lines.map((l) =>
    l === "young_yang" || l === "old_yang" ? "1" : "0"
  );
  const bottomToTop = bits.join("");
  const topToBottom = [...bits].reverse().join("");
  return topToBottom;
}

function buildMeta(astro: ReturnType<typeof getAstrologyData>): LiuyaoBoardMeta {
  return {
    solarDate: astro.solarDate,
    lunarDate: astro.lunarDate,
    yearPillar: astro.yearPillar,
    monthPillar: astro.monthPillar,
    dayPillar: astro.dayPillar,
    hourPillar: astro.hourPillar,
    dayXunKong: astro.dayXunKong,
    shenSha: {},
  };
}

function mapIndicators(
  alerts: Array< { type: string; level: string; message: string } >
): GlobalIndicator[] {
  return alerts.map((a) => ({
    type: a.type,
    level: a.level,
    message: a.message,
  }));
}

/**
 * 根据 diceSums 与起卦时间构建完整排盘；可选传入 divination 以带卦名。
 */
export function buildLiuyaoBoard(
  diceSums: number[],
  date: Date,
  divination?: DivinationResult
): LiuyaoBoard {
  const hexagram = diceSumsToHexagram(diceSums);
  const astro = getAstrologyData(date);
  const naJiaLines = getNaJiaData(hexagram, date);
  const transformed = getTransformedHexagram(hexagram);

  const movingPositions = hexagram.lines
    .map((yao, i) =>
      yao === "old_yin" || yao === "old_yang" ? i + 1 : null
    )
    .filter((v): v is number => v != null);

  const benBinary = divination?.originalHexagram.binaryCode ?? hexagramToBinary(hexagram.lines);
  const bianBinary =
    movingPositions.length > 0
      ? divination?.changedHexagram?.binaryCode ?? hexagramToBinary(transformed.lines)
      : "";

  const benGuaLines: YaoLineBoard[] = naJiaLines.map((line, i) => ({
    index: i + 1,
    naJia: line.stem + line.branch,
    stem: line.stem,
    branch: line.branch,
    fiveElement: line.fiveElement,
    liuQin: line.liuQin ?? "",
    sixGod: line.sixGod,
    shiYing: line.shiYing as "世" | "应" | undefined,
    moving: hexagram.lines[i] === "old_yin" || hexagram.lines[i] === "old_yang",
    fuShen: line.fuShen
      ? {
          naJia: line.fuShen.stem + line.fuShen.branch,
          stem: line.fuShen.stem,
          branch: line.fuShen.branch,
          fiveElement: line.fuShen.fiveElement,
          liuQin: line.fuShen.liuQin,
        }
      : undefined,
  }));

  const shiPosition =
    benGuaLines.findIndex((l) => l.shiYing === "世") + 1 || 0;
  const yingPosition =
    benGuaLines.findIndex((l) => l.shiYing === "应") + 1 || 0;

  const benGua: HexagramBoard = {
    name: divination?.originalHexagram.name ?? "待补充",
    palace: BINARY_TO_PALACE[benBinary] ?? "—",
    binary: benBinary,
    typeTags: [],
    lines: benGuaLines,
    shiPosition: shiPosition || 0,
    yingPosition: yingPosition || 0,
  };

  let bianGua: HexagramBoard | null = null;
  if (movingPositions.length > 0 && bianBinary) {
    const bianNaJia = getNaJiaData(transformed, date);
    const bianGuaLines: YaoLineBoard[] = bianNaJia.map((line, i) => ({
      index: i + 1,
      naJia: line.stem + line.branch,
      stem: line.stem,
      branch: line.branch,
      fiveElement: line.fiveElement,
      liuQin: line.liuQin ?? "",
      sixGod: line.sixGod,
      shiYing: line.shiYing as "世" | "应" | undefined,
      moving: false,
      fuShen: undefined,
    }));
    const bShi = bianGuaLines.findIndex((l) => l.shiYing === "世") + 1 || 0;
    const bYing = bianGuaLines.findIndex((l) => l.shiYing === "应") + 1 || 0;
    bianGua = {
      name: divination?.changedHexagram?.name ?? "待补充",
      palace: BINARY_TO_PALACE[bianBinary] ?? "—",
      binary: bianBinary,
      typeTags: [],
      lines: bianGuaLines,
      shiPosition: bShi,
      yingPosition: bYing,
    };
  }

  const hexBranches = naJiaLines.map((l) => l.branch);
  const transformedBranches =
    bianGua != null ? bianGua.lines.map((l) => l.branch) : [];
  const monthBranch =
    astro.monthPillar.length >= 2 ? astro.monthPillar[1]! : "";
  const dayBranch = astro.dayPillar.length >= 2 ? astro.dayPillar[1]! : "";
  const movingIndices = movingPositions.map((p) => p - 1);

  const alerts = analyzeGlobalIndicators(
    hexBranches,
    transformedBranches,
    movingIndices,
    monthBranch,
    dayBranch,
    benGua.name
  );
  const indicators = mapIndicators(alerts);
  benGua.typeTags = indicators.map((i) => i.message);

  return {
    meta: buildMeta(astro),
    benGua,
    bianGua,
    indicators,
  };
}
