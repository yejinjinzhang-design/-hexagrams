interface HexagramMeta {
  code: string;
  name: string;
  alias?: string;
  description?: string;
}

const HEXAGRAM_DICT: Record<string, HexagramMeta> = {
  // 111111：乾为天
  "111111": {
    code: "111111",
    name: "乾为天",
    alias: "乾卦",
    description:
      "刚健纯阳之象，多主开创、向上、权威。宜主动进取，把握机会。"
  },
  // 000000：坤为地
  "000000": {
    code: "000000",
    name: "坤为地",
    alias: "坤卦",
    description:
      "柔顺承载之象，多主包容、承接、顺势而为。宜稳健务实，重视协作。"
  }
  // 预留：其余 62 卦可按同结构补充
};

export function getHexagramMetaByCode(code: string): HexagramMeta | undefined {
  return HEXAGRAM_DICT[code];
}

export function listAllHexagramsMeta(): HexagramMeta[] {
  return Object.values(HEXAGRAM_DICT);
}

