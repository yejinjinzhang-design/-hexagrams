/** 单爻排盘：纳甲、六亲、六神、世应、伏神等 */
export interface YaoLineBoard {
  index: number;
  naJia: string;
  stem: string;
  branch: string;
  fiveElement: string;
  liuQin: string;
  sixGod: string;
  shiYing?: "世" | "应";
  moving: boolean;
  fuShen?: {
    naJia: string;
    stem: string;
    branch: string;
    fiveElement: string;
    liuQin: string;
  };
}

/** 本卦/变卦一块的完整信息 */
export interface HexagramBoard {
  name: string;
  palace: string;
  binary: string;
  typeTags: string[];
  lines: YaoLineBoard[];
  shiPosition: number;
  yingPosition: number;
}

/** 全局格局（六冲、六合等） */
export interface GlobalIndicator {
  type: string;
  level: string;
  message: string;
}

/** 排盘顶部：时间、四柱、旬空、神煞占位 */
export interface LiuyaoBoardMeta {
  solarDate: string;
  lunarDate: string;
  yearPillar: string;
  monthPillar: string;
  dayPillar: string;
  hourPillar: string;
  dayXunKong: string;
  shenSha?: {
    yima?: string;
    taohua?: string;
    guiren?: string;
    rilu?: string;
  };
}

/** 完整六爻排盘（给结果页用） */
export interface LiuyaoBoard {
  meta: LiuyaoBoardMeta;
  benGua: HexagramBoard;
  bianGua: HexagramBoard | null;
  indicators: GlobalIndicator[];
}
