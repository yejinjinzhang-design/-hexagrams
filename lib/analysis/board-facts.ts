import type { LiuyaoBoard, YaoLineBoard } from "@/types/liuyao-board";

function isKongBranch(branch: string | undefined, dayXunKong: string): boolean {
  if (!branch || !dayXunKong) return false;
  return dayXunKong.includes(branch);
}

function lineToFact(line: YaoLineBoard, dayXunKong: string): string {
  const parts: string[] = [];
  parts.push(`第${line.index}爻`);
  if (line.sixGod) parts.push(line.sixGod);
  if (line.liuQin) parts.push(line.liuQin);
  parts.push(`${line.stem}${line.branch}${line.fiveElement}`);
  if (line.shiYing === "世") parts.push("世爻");
  if (line.shiYing === "应") parts.push("应爻");
  if (line.moving) parts.push("动爻");
  if (isKongBranch(line.branch, dayXunKong)) parts.push(`日空(${line.branch}空)`);
  if (line.fuShen) {
    const fu = `${line.fuShen.liuQin}${line.fuShen.stem}${line.fuShen.branch}${line.fuShen.fiveElement}`;
    const fuKong = isKongBranch(line.fuShen.branch, dayXunKong)
      ? `，伏神日空(${line.fuShen.branch}空)`
      : "";
    parts.push(`伏神：${fu}${fuKong}`);
  }
  return parts.join("，");
}

export function buildBoardFactSheet(board: LiuyaoBoard, movingLines: number[]): string {
  const { benGua, bianGua, meta } = board;
  const benLines = [...benGua.lines]
    .sort((a, b) => b.index - a.index)
    .map((line) => lineToFact(line, meta.dayXunKong))
    .join("\n");

  const bianLines = bianGua
    ? [...bianGua.lines]
        .sort((a, b) => b.index - a.index)
        .map((line) => lineToFact(line, meta.dayXunKong))
        .join("\n")
    : "无变卦";

  return `
【核卦清单（机器排盘事实，必须优先于任何推理）】
- 本卦：${benGua.name}（${benGua.palace}）
- 变卦：${bianGua ? `${bianGua.name}（${bianGua.palace}）` : "无变卦"}
- 动爻：${movingLines.length ? movingLines.join("、") + "爻动" : "无动爻"}
- 世爻：第${benGua.shiPosition || "未标"}爻
- 应爻：第${benGua.yingPosition || "未标"}爻
- 日空/空亡：${meta.dayXunKong}

本卦六爻（自上而下）：
${benLines}

变卦六爻（自上而下）：
${bianLines}

核实要求：凡正文提到卦名、变卦、动爻、世应、某爻六亲干支、伏神、空亡，必须逐项对照本清单；若清单没有支持，不得写成确定事实。
`.trim();
}
