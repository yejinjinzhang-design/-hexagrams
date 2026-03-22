/**
 * najia-core 最小可运行 demo：GET 请求即返回一组示例排盘 JSON
 * 运行：npm run dev 后访问 GET /api/demo-liuyao-board
 */
import { NextResponse } from "next/server";
import { computeDivinationResult } from "@/lib/divination";
import { buildLiuyaoBoard } from "@/lib/liuyao-board";

export async function GET() {
  try {
    const diceSums = [7, 8, 9, 6, 7, 8];
    /** 固定瞬时点，避免 demo 随部署环境时区漂移 */
    const date = new Date("2025-01-15T12:00:00.000Z");
    const divination = computeDivinationResult(diceSums);
    const board = buildLiuyaoBoard(diceSums, date, divination);

    return NextResponse.json({
      input: { diceSums, note: "初爻→上爻；四柱按 Asia/Shanghai 解释该瞬时点" },
      board,
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "排盘计算失败",
      },
      { status: 500 }
    );
  }
}
