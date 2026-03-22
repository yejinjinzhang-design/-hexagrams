import { computeDivinationResult } from "@/lib/divination";
import type { LineKind, LinePolarity } from "@/types/divination";
import {
  CAST_TIMEZONE_IANA,
  getZonedWallClockParts,
} from "@/lib/time/cast-timezone";

export type DivinationMethod =
  | "coin"
  | "number"
  | "lunarDate"
  | "manual";

/**
 * 与 `components/divination-coins` 一致：
 * - `front` = 满文面 = 正（记 3）
 * - `back` = 汉字面 = 反（记 2）
 */
export type CoinSide = "front" | "back";

export type DivinationUnifiedResult = {
  method: DivinationMethod;
  timestamp: string;
  diceSums: number[];
  lines: Array<{
    index: number;
    yinYang: LinePolarity;
    moving: boolean;
    coins?: CoinSide[];
    yaoType?: string;
  }>;
  primaryHexagram: {
    name: string;
    code: string;
  };
  upperGua?: {
    num: number;
    name: string;
  };
  lowerGua?: {
    num: number;
    name: string;
  };
  movingLine?: number;
  changedHexagram?: {
    name: string;
    code: string;
  };
  movingLines: number[];
  rawInput?: {
    dateTime?: string;
    numbers?: [number, number, number];
    numberInput?: string;
    calendar?: "lunar";
    manualCoins?: CoinSide[][];
  };
};

function mod8Special(total: number): number {
  const r = total % 8;
  return r === 0 ? 8 : r;
}

function mod6Special(total: number): number {
  const r = total % 6;
  return r === 0 ? 6 : r;
}

const TRIGRAM_BY_NUM: Record<number, "乾" | "兑" | "离" | "震" | "巽" | "坎" | "艮" | "坤"> =
  {
    1: "乾",
    2: "兑",
    3: "离",
    4: "震",
    5: "巽",
    6: "坎",
    7: "艮",
    8: "坤",
  };

// 三爻自下而上（阳=1，阴=0）
const TRIGRAM_BITS_BY_NAME: Record<
  "乾" | "兑" | "离" | "震" | "巽" | "坎" | "艮" | "坤",
  "111" | "110" | "101" | "100" | "011" | "010" | "001" | "000"
> = {
  乾: "111",
  兑: "110",
  离: "101",
  震: "100",
  巽: "011",
  坎: "010",
  艮: "001",
  坤: "000",
};

function digitCharsSum(s: string): number {
  // 严格按字符中数字求和；输入由外层校验保证仅包含数字字符
  let sum = 0;
  for (let i = 0; i < s.length; i++) {
    const d = s.charCodeAt(i) - 48;
    if (d < 0 || d > 9) continue;
    sum += d;
  }
  return sum;
}

function parseNumberInput(numberInput: string): {
  topNum: number;
  bottomNum: number;
  movingLine: number;
  raw: {
    numberInput: string;
    parts?: [string, string];
    continuousDigits?: string;
    sumFront?: number;
    sumBack?: number;
    sumAll?: number;
  };
} {
  const trimmed = numberInput.trim();
  if (!trimmed) {
    throw new Error("numberInput is empty");
  }

  const noSpaces = trimmed.replace(/\s+/g, "");
  if (!/^[0-9.]+$/.test(noSpaces)) {
    throw new Error("numberInput must only contain digits and '.'");
  }

  const hasDot = noSpaces.includes(".");
  if (hasDot) {
    const parts = noSpaces.split(".");
    if (parts.length !== 2) {
      throw new Error("dot-separated numberInput must contain exactly one '.'");
    }
    const [g1, g2] = parts;
    if (!g1 || !g2) {
      throw new Error("dot-separated numberInput groups cannot be empty");
    }
    const sum1 = digitCharsSum(g1);
    const sum2 = digitCharsSum(g2);
    const sumAll = digitCharsSum(g1 + g2);
    return {
      topNum: mod8Special(sum1),
      bottomNum: mod8Special(sum2),
      movingLine: mod6Special(sumAll),
      raw: { numberInput: noSpaces, parts: [g1, g2], sumFront: sum1, sumBack: sum2, sumAll },
    };
  }

  const digits = noSpaces;
  if (!digits) throw new Error("numberInput has no digits");
  // 连续数字串至少两位，才有「前半 / 后半」之分（规范示例 123）
  if (digits.length < 2) {
    throw new Error("continuous numberInput must contain at least 2 digits");
  }
  const frontLen = Math.floor(digits.length / 2);
  const backLen = digits.length - frontLen;
  const front = digits.slice(0, frontLen);
  const back = digits.slice(frontLen, frontLen + backLen);
  const sumFront = front ? digitCharsSum(front) : 0;
  const sumBack = back ? digitCharsSum(back) : 0;
  const sumAll = digitCharsSum(digits);
  return {
    topNum: mod8Special(sumFront),
    bottomNum: mod8Special(sumBack),
    movingLine: mod6Special(sumAll),
    raw: {
      numberInput: noSpaces,
      continuousDigits: digits,
      sumFront,
      sumBack,
      sumAll,
    },
  };
}

const ZHI_TO_NUM: Record<
  "子" | "丑" | "寅" | "卯" | "辰" | "巳" | "午" | "未" | "申" | "酉" | "戌" | "亥",
  number
> = {
  子: 1,
  丑: 2,
  寅: 3,
  卯: 4,
  辰: 5,
  巳: 6,
  午: 7,
  未: 8,
  申: 9,
  酉: 10,
  戌: 11,
  亥: 12,
};

function zhiCharToNum(zhi: string): number {
  const c = zhi.trim().slice(-1);
  const num = ZHI_TO_NUM[c as keyof typeof ZHI_TO_NUM];
  if (!num) throw new Error(`Unknown zhi: ${zhi}`);
  return num;
}

function buildUnifiedFromHexNums(params: {
  upperNum: number;
  lowerNum: number;
  movingLine: number; // 1-6
  method: DivinationMethod;
  timestamp?: string;
  rawInput?: DivinationUnifiedResult["rawInput"];
}): DivinationUnifiedResult {
  const {
    upperNum,
    lowerNum,
    movingLine,
    method,
    rawInput,
    timestamp = new Date().toISOString(),
  } = params;

  const upperGuaName = TRIGRAM_BY_NUM[upperNum];
  const lowerGuaName = TRIGRAM_BY_NUM[lowerNum];
  if (!upperGuaName || !lowerGuaName) {
    throw new Error(`Invalid trigram numbers: upper=${upperNum}, lower=${lowerNum}`);
  }

  const upperBits = TRIGRAM_BITS_BY_NAME[upperGuaName].split("");
  const lowerBits = TRIGRAM_BITS_BY_NAME[lowerGuaName].split("");

  const polarities: LinePolarity[] = [];
  // index: 1..6, where 1 is 初爻 (bottom). polarities array is bottom->top.
  for (let i = 0; i < 6; i++) {
    const bit = i < 3 ? lowerBits[i] : upperBits[i - 3];
    polarities.push(bit === "1" ? "yang" : "yin");
  }

  // 梅花易数只得六爻阴阳与一动爻位；下列 6/7/8/9 仅为与现有六爻排盘（najia）管线兼容的静爻/动爻编码，
  // 并非「铜钱六次逐爻投掷」起卦。
  const diceSums = polarities.map((pol, idx) => {
    const linePos = idx + 1;
    if (linePos === movingLine) {
      return pol === "yin" ? 6 : 9;
    }
    return pol === "yang" ? 7 : 8;
  });

  const div = computeDivinationResult(diceSums);

  return {
    method,
    timestamp,
    diceSums,
    lines: div.lines.map((l) => ({
      index: l.index,
      yinYang: l.polarity,
      moving: l.moving,
      yaoType: yaoTypeFromKind(l.kind),
    })),
    primaryHexagram: {
      name: div.originalHexagram.name ?? "未知卦",
      code: div.originalHexagram.binaryCode ?? div.originalHexagram.binaryCode,
    },
    changedHexagram: div.changedHexagram
      ? {
          name: div.changedHexagram.name ?? "未知卦",
          code: div.changedHexagram.binaryCode,
        }
      : undefined,
    movingLines: div.movingLines,
    movingLine,
    upperGua: { num: upperNum, name: upperGuaName },
    lowerGua: { num: lowerNum, name: lowerGuaName },
    rawInput,
  };
}

/** 爻型展示：老阳/老阴带「动」，少阳/少阴为静 */
function yaoTypeFromKind(kind: LineKind): string {
  switch (kind) {
    case "lao-yin":
      return "老阴（动）";
    case "shao-yang":
      return "少阳";
    case "shao-yin":
      return "少阴";
    case "lao-yang":
      return "老阳（动）";
    default:
      return kind;
  }
}

function buildUnifiedFromDiceSums(
  diceSums: number[],
  method: DivinationMethod,
  rawInput?: DivinationUnifiedResult["rawInput"],
  timestamp: string = new Date().toISOString()
): DivinationUnifiedResult {
  const div = computeDivinationResult(diceSums);

  return {
    method,
    timestamp,
    diceSums,
    lines: div.lines.map((l) => ({
      index: l.index,
      yinYang: l.polarity,
      moving: l.moving,
      yaoType: yaoTypeFromKind(l.kind),
      // 占位算法里没有 coins 细节
    })),
    primaryHexagram: {
      name: div.originalHexagram.name ?? "未知卦",
      code: div.originalHexagram.binaryCode ?? div.originalHexagram.binaryCode,
    },
    changedHexagram: div.changedHexagram
      ? {
          name: div.changedHexagram.name ?? "未知卦",
          code: div.changedHexagram.binaryCode,
        }
      : undefined,
    movingLines: div.movingLines,
    rawInput,
  };
}

export function deriveHexagramFromNumbersInput(numberInput: string): DivinationUnifiedResult {
  const { topNum, bottomNum, movingLine, raw } = parseNumberInput(numberInput);

  return buildUnifiedFromHexNums({
    upperNum: topNum,
    lowerNum: bottomNum,
    movingLine,
    method: "number",
    rawInput: { numberInput: raw.numberInput },
  });
}

/**
 * 农历（阴历）日期时间起卦（梅花易数常见取法）：
 * - 上卦：(年支序数 + 农历月 + 农历日) mod 8（余 0 作 8）
 * - 下卦：(年支序数 + 农历月 + 农历日 + 时支序数) mod 8
 * - 动爻：与下卦同一总和 mod 6（余 0 作 6）
 * 公历时刻仅用于换算农历与八字时辰，无「附加数」项。
 */
export function deriveHexagramFromDate(dateTimeISO: string): DivinationUnifiedResult {
  const d = new Date(dateTimeISO);
  if (!Number.isFinite(d.getTime())) {
    throw new Error("Invalid dateTimeISO");
  }
  // 与排盘一致：用「瞬时点」在 Asia/Shanghai 的墙钟分量换算农历，避免服务端 UTC 下 getHours 等错位
  const timestamp = d.toISOString();
  const wall = getZonedWallClockParts(d, CAST_TIMEZONE_IANA);

  const { Solar } = require("lunar-javascript");
  // 由公历时刻转农历，再按农历规则取卦；时支仍由八字时辰推得
  const solar = Solar.fromYmdHms(
    wall.year,
    wall.month,
    wall.day,
    wall.hour,
    wall.minute,
    wall.second
  );
  const lunar = solar.getLunar();

  const yearGanZhi: string = lunar.getYearInGanZhi();
  const yearBranch = yearGanZhi.slice(-1);
  const yearBranchNum = zhiCharToNum(yearBranch);

  const timeGanZhi: string = lunar.getEightChar().getTime();
  const timeZhi = timeGanZhi.slice(-1);
  const timeBranchNum = zhiCharToNum(timeZhi);

  const lunarMonth: number = lunar.getMonth();
  const lunarDay: number = lunar.getDay();
  const upperTotal = yearBranchNum + lunarMonth + lunarDay;
  const lowerTotal =
    yearBranchNum + lunarMonth + lunarDay + timeBranchNum;

  const movingTotal = lowerTotal;
  const upperNum = mod8Special(upperTotal);
  const lowerNum = mod8Special(lowerTotal);
  const movingLine = mod6Special(movingTotal);

  return buildUnifiedFromHexNums({
    upperNum,
    lowerNum,
    movingLine,
    method: "lunarDate",
    rawInput: {
      dateTime: dateTimeISO,
      calendar: "lunar",
    },
    timestamp,
  });
}

export function deriveYaoFromCoins(coins: CoinSide[]): {
  diceSum: number;
  kind: LineKind;
  polarity: LinePolarity;
  moving: boolean;
  yaoType: string;
} {
  if (!Array.isArray(coins) || coins.length !== 3) {
    throw new Error("Each yao must have exactly 3 coins.");
  }
  const frontCount = coins.filter((c) => c === "front").length;
  const backCount = 3 - frontCount;

  // 正面=满文：3正老阳，3反老阴，2正1反少阴，2反1正少阳（与 3/2 计分一致）
  let kind: LineKind;
  if (frontCount === 3) {
    kind = "lao-yang";
  } else if (backCount === 3) {
    kind = "lao-yin";
  } else if (frontCount === 2 && backCount === 1) {
    kind = "shao-yin";
  } else if (frontCount === 1 && backCount === 2) {
    kind = "shao-yang";
  } else {
    throw new Error("Invalid coin state");
  }

  const diceSum = frontCount * 3 + backCount * 2;
  const polarity: LinePolarity = kind === "lao-yin" || kind === "shao-yin" ? "yin" : "yang";
  const moving = kind === "lao-yin" || kind === "lao-yang";
  return {
    diceSum,
    kind,
    polarity,
    moving,
    yaoType: yaoTypeFromKind(kind),
  };
}

export function deriveHexagramFromManualLines(
  manualCoins: CoinSide[][]
): DivinationUnifiedResult {
  if (!Array.isArray(manualCoins) || manualCoins.length !== 6) {
    throw new Error("manualCoins must be 6 yao lines from bottom to top.");
  }

  const diceSums = manualCoins.map((coins) => deriveYaoFromCoins(coins).diceSum);
  const unified = buildUnifiedFromDiceSums(
    diceSums,
    "manual",
    { manualCoins },
    new Date().toISOString()
  );

  // 把 coins / moving 等细节补全到 lines 上（用户看得到）
  unified.lines = manualCoins.map((coins, i) => {
    const yao = deriveYaoFromCoins(coins);
    return {
      index: i + 1,
      yinYang: yao.polarity,
      moving: yao.moving,
      coins,
      yaoType: yao.yaoType,
    };
  });

  return unified;
}

