/**
 * najia-core 最小可运行 demo：GET 请求即返回一组示例排盘 JSON
 * 运行：npm run dev 后访问 GET /api/demo-liuyao-board
 */
import { NextResponse } from "next/server";
import {
  getNaJiaData,
  getTransformedHexagram,
  getAstrologyData,
} from "najia-core";
import type { YaoType } from "najia-core";

const SUM_TO_YAO: Record<number, YaoType> = {
  6: "old_yin",
  7: "young_yang",
  8: "young_yin",
  9: "old_yang",
};

function diceSumsToHexagram(diceSums: number[]) {
  if (!Array.isArray(diceSums) || diceSums.length !== 6) {
    throw new Error("diceSums 必须为长度为 6 的数组，元素为 6|7|8|9");
  }
  const lines = diceSums.map((s) => {
    if (!SUM_TO_YAO[s]) throw new Error(`无效的爻值: ${s}`);
    return SUM_TO_YAO[s];
  });
  return { lines };
}

export async function GET() {
  try {
    const diceSums = [7, 8, 9, 6, 7, 8];
    const hexagram = diceSumsToHexagram(diceSums);
    const date = new Date();

    const naJiaLines = getNaJiaData(hexagram, date);
    const transformed = getTransformedHexagram(hexagram);

    const movingPositions = hexagram.lines
      .map((yao, i) =>
        yao === "old_yin" || yao === "old_yang" ? i + 1 : null
      )
      .filter((v): v is number => v != null);

    const benGuaLines = naJiaLines.map((line, i) => ({
      index: i + 1,
      naJia: line.stem + line.branch,
      fiveElement: line.fiveElement,
      liuQin: line.liuQin ?? "",
      sixGod: line.sixGod,
      shiYing: line.shiYing,
      moving:
        hexagram.lines[i] === "old_yin" ||
        hexagram.lines[i] === "old_yang",
      fuShen: line.fuShen
        ? {
            naJia: line.fuShen.stem + line.fuShen.branch,
            fiveElement: line.fuShen.fiveElement,
            liuQin: line.fuShen.liuQin,
          }
        : undefined,
    }));

    const bianNaJia =
      movingPositions.length > 0 ? getNaJiaData(transformed, date) : null;
    const bianGuaLines = bianNaJia
      ? bianNaJia.map((line, i) => ({
          index: i + 1,
          naJia: line.stem + line.branch,
          fiveElement: line.fiveElement,
          liuQin: line.liuQin ?? "",
        }))
      : null;

    const astrology = getAstrologyData(date);

    const board = {
      input: { diceSums, note: "初爻→上爻" },
      benGua: {
        lines: benGuaLines,
        movingPositions,
        shiPosition: benGuaLines.findIndex((l) => l.shiYing === "世") + 1,
        yingPosition: benGuaLines.findIndex((l) => l.shiYing === "应") + 1,
      },
      bianGua: movingPositions.length
        ? { lines: bianGuaLines }
        : null,
      siZhu: {
        solarDate: astrology.solarDate,
        yearPillar: astrology.yearPillar,
        monthPillar: astrology.monthPillar,
        dayPillar: astrology.dayPillar,
        dayXunKong: astrology.dayXunKong,
      },
    };

    return NextResponse.json(board);
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "排盘计算失败",
      },
      { status: 500 }
    );
  }
}
