import type { LineInfo, LinePolarity } from "@/types/divination";

type Bit = 0 | 1;
type TrigramName = "乾" | "兑" | "离" | "震" | "巽" | "坎" | "艮" | "坤";

const TRIGRAM_BY_BITS: Record<string, TrigramName> = {
  "111": "乾",
  "110": "兑",
  "101": "离",
  "100": "震",
  "011": "巽",
  "010": "坎",
  "001": "艮",
  "000": "坤",
};

// key = 上卦名 + 下卦名，例如：兑坤 => 泽地萃
export const hexagramMap: Record<string, string> = {
  // 上卦：乾
  乾乾: "乾为天",
  乾兑: "天泽履",
  乾离: "天火同人",
  乾震: "天雷无妄",
  乾巽: "天风姤",
  乾坎: "天水讼",
  乾艮: "天山遁",
  乾坤: "天地否",

  // 上卦：兑
  兑乾: "泽天夬",
  兑兑: "兑为泽",
  兑离: "泽火革",
  兑震: "泽雷随",
  兑巽: "泽风大过",
  兑坎: "泽水困",
  兑艮: "泽山咸",
  兑坤: "泽地萃",

  // 上卦：离
  离乾: "火天大有",
  离兑: "火泽睽",
  离离: "离为火",
  离震: "火雷噬嗑",
  离巽: "火风鼎",
  离坎: "火水未济",
  离艮: "火山旅",
  离坤: "火地晋",

  // 上卦：震
  震乾: "雷天大壮",
  震兑: "雷泽归妹",
  震离: "雷火丰",
  震震: "震为雷",
  震巽: "雷风恒",
  震坎: "雷水解",
  震艮: "雷山小过",
  震坤: "雷地豫",

  // 上卦：巽
  巽乾: "风天小畜",
  巽兑: "风泽中孚",
  巽离: "风火家人",
  巽震: "风雷益",
  巽巽: "巽为风",
  巽坎: "风水涣",
  巽艮: "风山渐",
  巽坤: "风地观",

  // 上卦：坎
  坎乾: "水天需",
  坎兑: "水泽节",
  坎离: "水火既济",
  坎震: "水雷屯",
  坎巽: "水风井",
  坎坎: "坎为水",
  坎艮: "水山蹇",
  坎坤: "水地比",

  // 上卦：艮
  艮乾: "山天大畜",
  艮兑: "山泽损",
  艮离: "山火贲",
  艮震: "山雷颐",
  艮巽: "山风蛊",
  艮坎: "山水蒙",
  艮艮: "艮为山",
  艮坤: "山地剥",

  // 上卦：坤
  坤乾: "地天泰",
  坤兑: "地泽临",
  坤离: "地火明夷",
  坤震: "地雷复",
  坤巽: "地风升",
  坤坎: "地水师",
  坤艮: "地山谦",
  坤坤: "坤为地",
};

function toBit(polarity: LinePolarity): Bit {
  return polarity === "yang" ? 1 : 0;
}

function flip(polarity: LinePolarity): LinePolarity {
  return polarity === "yang" ? "yin" : "yang";
}

/**
 * 从三爻（自下而上）得到八卦名。
 * 规则：阳=1，阴=0；111乾 110兑 101离 100震 011巽 010坎 001艮 000坤
 */
export function getTrigramName(lines3: LinePolarity[]): TrigramName {
  if (lines3.length !== 3) {
    throw new Error("getTrigramName 需要 3 爻");
  }
  const bits = lines3.map(toBit).join("");
  const name = TRIGRAM_BY_BITS[bits];
  if (!name) {
    throw new Error(`未知三爻组合：${bits}`);
  }
  return name;
}

export function getHexagramNameFromPolarities(lines6: LinePolarity[]): string {
  if (lines6.length !== 6) return "未知卦";

  // 下卦：1~3（自下而上）；上卦：4~6（自下而上）
  const lower = getTrigramName(lines6.slice(0, 3));
  const upper = getTrigramName(lines6.slice(3, 6));
  const key = `${upper}${lower}`;
  return hexagramMap[key] ?? "未知卦";
}

function debugDump(label: string, lines: LineInfo[], polarities: LinePolarity[]) {
  console.log("HEXAGRAM MAP LOADED:", Object.keys(hexagramMap).length);
  console.log("RAW LINES:", lines);
  if (lines.length !== 6) {
    console.error("Hexagram lines invalid:", lines);
    return;
  }

  const lowerLines = polarities.slice(0, 3);
  const upperLines = polarities.slice(3, 6);
  console.log("LOWER LINES:", lowerLines);
  console.log("UPPER LINES:", upperLines);

  const lowerBits = lowerLines.map(toBit).join("");
  const upperBits = upperLines.map(toBit).join("");
  console.log("LOWER BITS:", lowerBits);
  console.log("UPPER BITS:", upperBits);

  const lowerTrigram = TRIGRAM_BY_BITS[lowerBits];
  const upperTrigram = TRIGRAM_BY_BITS[upperBits];
  console.log("LOWER TRIGRAM:", lowerTrigram);
  console.log("UPPER TRIGRAM:", upperTrigram);

  const key = `${upperTrigram ?? ""}${lowerTrigram ?? ""}`;
  console.log("HEXAGRAM KEY:", key);
  console.log("HEXAGRAM MAP RESULT:", hexagramMap[key]);
  console.log(`${label} DONE`);
}

export function getHexagramName(lines: LineInfo[], debug = false): string {
  const sorted = [...lines].sort((a, b) => a.index - b.index);
  const polarities = sorted.map((l) => l.polarity);
  if (debug) debugDump("[MAIN]", sorted, polarities);
  return getHexagramNameFromPolarities(polarities);
}

export function getChangedHexagramName(lines: LineInfo[], debug = false): string {
  const sorted = [...lines].sort((a, b) => a.index - b.index);
  const changed = sorted.map((l) =>
    l.moving ? flip(l.polarity) : l.polarity
  );
  if (debug) debugDump("[CHANGED]", sorted, changed);
  return getHexagramNameFromPolarities(changed);
}

