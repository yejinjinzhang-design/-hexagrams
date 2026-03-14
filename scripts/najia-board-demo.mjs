/**
 * najia-core 最小可运行 demo：输入六次摇卦 6/7/8/9，输出排盘信息
 * 运行：node scripts/najia-board-demo.mjs（在项目根目录）
 */
import {
  getNaJiaData,
  getTransformedHexagram,
  getAstrologyData,
} from "najia-core";

// 铜钱和 6/7/8/9 → najia-core YaoType
const SUM_TO_YAO = {
  6: "old_yin",
  7: "young_yang",
  8: "young_yin",
  9: "old_yang",
};

function diceSumsToHexagram(diceSums) {
  if (!Array.isArray(diceSums) || diceSums.length !== 6) {
    throw new Error("diceSums 必须为长度为 6 的数组，元素为 6|7|8|9");
  }
  const lines = diceSums.map((s) => {
    if (!SUM_TO_YAO[s]) throw new Error(`无效的爻值: ${s}`);
    return SUM_TO_YAO[s];
  });
  return { lines };
}

// 卦宫英文名 → 中文（najia-core 内部用 palaceName，未导出，此处占位映射）
const PALACE_NAMES = {
  qian: "乾宫",
  kun: "坤宫",
  zhen: "震宫",
  xun: "巽宫",
  kan: "坎宫",
  li: "离宫",
  gen: "艮宫",
  dui: "兑宫",
};

function main() {
  // 示例：初爻→上爻 依次为 7,8,9,6,7,8 → 有动爻 4（老阴）和 3（老阳，此处为第4、3爻）
  const diceSums = [7, 8, 9, 6, 7, 8];
  const hexagram = diceSumsToHexagram(diceSums);

  const date = new Date();
  const naJiaLines = getNaJiaData(hexagram, date);
  const transformed = getTransformedHexagram(hexagram);

  // 动爻：1-based 爻位
  const movingPositions = hexagram.lines
    .map((yao, i) => (yao === "old_yin" || yao === "old_yang" ? i + 1 : null))
    .filter((v) => v != null);

  // 本卦纳甲排盘（初爻→上爻）
  const benGuaLines = naJiaLines.map((line, i) => ({
    index: i + 1,
    naJia: line.stem + line.branch,
    fiveElement: line.fiveElement,
    liuQin: line.liuQin ?? "",
    sixGod: line.sixGod,
    shiYing: line.shiYing,
    moving: hexagram.lines[i] === "old_yin" || hexagram.lines[i] === "old_yang",
    fuShen: line.fuShen
      ? {
          naJia: line.fuShen.stem + line.fuShen.branch,
          fiveElement: line.fuShen.fiveElement,
          liuQin: line.fuShen.liuQin,
        }
      : undefined,
  }));

  // 变卦纳甲（若需要变卦每爻的六亲等，可再调 getNaJiaData(transformed, date)）
  const bianNaJia =
    movingPositions.length > 0
      ? getNaJiaData(transformed, date)
      : null;
  const bianGuaLines = bianNaJia
    ? bianNaJia.map((line, i) => ({
        index: i + 1,
        naJia: line.stem + line.branch,
        fiveElement: line.fiveElement,
        liuQin: line.liuQin ?? "",
        moving: false,
      }))
    : null;

  const astrology = getAstrologyData(date);

  console.log("========== 输入 ==========");
  console.log("diceSums (初爻→上爻):", diceSums);
  console.log("");

  console.log("========== 本卦 纳甲 / 六亲 / 六神 / 世应 ==========");
  benGuaLines.forEach((l) => {
    console.log(
      `  爻${l.index} ${l.naJia}${l.fiveElement} ${l.liuQin} ${l.sixGod} ${l.shiYing ?? ""} ${l.moving ? "[动]" : ""}`
    );
    if (l.fuShen) console.log(`      伏神: ${l.fuShen.naJia}${l.fuShen.fiveElement} ${l.fuShen.liuQin}`);
  });

  console.log("");
  console.log("动爻爻位:", movingPositions.length ? movingPositions : "无");

  if (bianGuaLines) {
    console.log("");
    console.log("========== 变卦 纳甲 / 六亲 ==========");
    bianGuaLines.forEach((l) =>
      console.log(`  爻${l.index} ${l.naJia}${l.fiveElement} ${l.liuQin}`)
    );
  }

  console.log("");
  console.log("========== 四柱（示例） ==========");
  console.log("  公历:", astrology.solarDate);
  console.log("  干支:", astrology.yearPillar, astrology.monthPillar, astrology.dayPillar);
  console.log("  日空:", astrology.dayXunKong);

  console.log("");
  console.log("========== 排盘 JSON 结构（供 API 对接） ==========");
  const board = {
    benGuaName: "(卦名可由 binaryCode + gua-data 或卦宫规则得到)",
    benGuaPalace: "(卦宫需从 najia 内部 palaceName 映射，如 " + Object.values(PALACE_NAMES).join("/") + ")",
    benGuaLines,
    movingPositions,
    bianGuaName: movingPositions.length ? "(变卦卦名)" : undefined,
    bianGuaLines: bianGuaLines ?? undefined,
    shiPosition: benGuaLines.findIndex((l) => l.shiYing === "世") + 1,
    yingPosition: benGuaLines.findIndex((l) => l.shiYing === "应") + 1,
  };
  console.log(JSON.stringify(board, null, 2));
}

main();
