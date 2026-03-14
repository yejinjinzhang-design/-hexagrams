export type Gender = "male" | "female" | "other";

export interface UserQuestionInput {
  birthYear: number;
  gender: Gender;
  question: string;
}

export type LineKind = "lao-yin" | "shao-yin" | "shao-yang" | "lao-yang";

export type LinePolarity = "yin" | "yang";

export interface LineInfo {
  /** 从 1 开始，1 为最下爻，6 为最上爻 */
  index: number;
  /** 老阴/少阴/少阳/老阳 */
  kind: LineKind;
  /** 阴阳（不考虑动静） */
  polarity: LinePolarity;
  /** 是否为动爻 */
  moving: boolean;
  /** 变爻后的阴阳 */
  changedPolarity: LinePolarity;
  /** 骰子点数和（2-12） */
  diceSum: number;
}

export interface Hexagram {
  /** 自下而上六爻信息 */
  lines: LineInfo[];
  /** 六位二进制编码，最右为上爻：1 表示阳爻，0 表示阴爻 */
  binaryCode: string;
  /** 预留：卦名，如「乾为天」 */
  name?: string;
  /** 预留：简要说明/卦辞 */
  description?: string;
}

export interface DivinationResult {
  /** 输入的六爻（含动静等信息） */
  lines: LineInfo[];
  /** 本卦 */
  originalHexagram: Hexagram;
  /** 变卦（如有动爻） */
  changedHexagram?: Hexagram;
  /** 动爻序号列表（1-6，自下而上） */
  movingLines: number[];
}

