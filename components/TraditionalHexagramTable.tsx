"use client";

import type { UserQuestionInput } from "@/types/divination";
import type { LiuyaoBoard, YaoLineBoard } from "@/types/liuyao-board";

const POSITION_LABEL: Record<number, string> = {
  6: "上爻",
  5: "五爻",
  4: "四爻",
  3: "三爻",
  2: "二爻",
  1: "初爻",
};

interface TraditionalHexagramTableProps {
  user: UserQuestionInput;
  board: LiuyaoBoard;
}

function YaoRow({
  position,
  benLine,
  bianLine,
  hasBianGua,
}: {
  position: number;
  benLine: YaoLineBoard;
  bianLine: YaoLineBoard | null;
  hasBianGua: boolean;
}) {
  const posLabel = POSITION_LABEL[position];
  const isMoving = benLine.moving;

  return (
    <tr
      className={`border-b border-[#e8dcc8] last:border-0 ${
        isMoving ? "bg-amber-50/80" : ""
      }`}
    >
      <td className="px-2 py-1.5 text-center text-[#5c4a38]">
        {posLabel}
        {isMoving && (
          <span
            className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-amber-500"
            title="动爻"
          />
        )}
      </td>
      <td className="px-2 py-1.5 text-center text-[11px] text-[#6b5235]">
        {benLine.sixGod}
      </td>
      <td className="border-l border-[#e0d2b8] px-2 py-1.5">
        <div className="flex flex-wrap items-baseline gap-x-1 text-[11px]">
          <span className="font-medium text-[#3b2f2f]">
            {benLine.liuQin}
            {benLine.naJia}
            {benLine.fiveElement}
          </span>
          {benLine.shiYing && (
            <span className="rounded bg-[#c5883a]/20 px-1 text-[10px] text-[#8d6c3e]">
              {benLine.shiYing}
            </span>
          )}
        </div>
        {benLine.fuShen && (
          <div className="mt-0.5 text-[10px] text-[#8a755a]">
            伏神：{benLine.fuShen.liuQin}
            {benLine.fuShen.naJia}
            {benLine.fuShen.fiveElement}
          </div>
        )}
      </td>
      <td
        className={`border-l border-[#e0d2b8] px-2 py-1.5 ${
          !hasBianGua ? "text-[#b0a08a]" : ""
        }`}
      >
        {bianLine ? (
          <div className="text-[11px] text-[#4a3a2a]">
            {bianLine.liuQin}
            {bianLine.naJia}
            {bianLine.fiveElement}
          </div>
        ) : (
          <span className="text-[11px]">—</span>
        )}
      </td>
    </tr>
  );
}

export function TraditionalHexagramTable({
  user,
  board,
}: TraditionalHexagramTableProps) {
  const { meta, benGua, bianGua, indicators } = board;
  const hasBianGua = bianGua != null;
  const linesTopDown = [...benGua.lines].sort((a, b) => b.index - a.index);
  const bianLinesTopDown = bianGua
    ? [...bianGua.lines].sort((a, b) => b.index - a.index)
    : null;

  return (
    <section className="rounded-2xl border border-[#e0d2b8] bg-[#faf5ea]/95 overflow-hidden text-[#4a3a2a]">
      {/* 顶部：卦主、问事、时间与四柱 */}
      <header className="border-b border-[#e0d2b8] bg-[#f7f1e4] px-4 py-3">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs">
          <span>
            卦主：{user.birthYear} 年
            {user.gender === "male" ? "男" : user.gender === "female" ? "女" : "其他"}
          </span>
          <span className="text-[#7d5a2b]">问事：{user.question}</span>
        </div>
        <div className="mt-2 text-[11px] text-[#6b5235]">
          {meta.solarDate} · {meta.lunarDate}
        </div>
        <div className="mt-1 text-[11px] text-[#8a755a]">
          四柱：{meta.yearPillar} {meta.monthPillar} {meta.dayPillar}{" "}
          {meta.hourPillar} · 日空：{meta.dayXunKong}
          {meta.shenSha &&
            (meta.shenSha.yima ||
              meta.shenSha.taohua ||
              meta.shenSha.guiren ||
              meta.shenSha.rilu) ? (
              <span className="ml-1">
                神煞：驿马{meta.shenSha.yima ?? "—"} 桃花
                {meta.shenSha.taohua ?? "—"} 贵人{meta.shenSha.guiren ?? "—"}{" "}
                日禄{meta.shenSha.rilu ?? "—"}
              </span>
            ) : null}
        </div>
        {/* 本卦 / 变卦 标题行 + 格局 tag */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-[12px] font-medium text-[#3b2f2f]">
            本卦：{benGua.name}（{benGua.palace}
            {benGua.typeTags.length > 0 ? `，${benGua.typeTags.join("、")}` : ""}）
          </span>
          {hasBianGua && bianGua && (
            <span className="text-[12px] text-[#6b5235]">
              变卦：{bianGua.name}（{bianGua.palace}）
            </span>
          )}
        </div>
      </header>

      {/* 传统两列表格：从上爻到初爻 */}
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-[11px]">
          <thead>
            <tr className="border-b border-[#e0d2b8] bg-[#f5eddc] text-[#6b5235]">
              <th className="px-2 py-1.5 text-center font-medium">爻位</th>
              <th className="px-2 py-1.5 text-center font-medium">六神</th>
              <th className="border-l border-[#e0d2b8] px-2 py-1.5 text-left font-medium">
                本卦（六亲·纳甲·五行·世应·伏神）
              </th>
              <th className="border-l border-[#e0d2b8] px-2 py-1.5 text-left font-medium">
                变卦（六亲·纳甲·五行）
              </th>
            </tr>
          </thead>
          <tbody>
            {linesTopDown.map((benLine) => {
              const bianLine = bianLinesTopDown?.find(
                (l) => l.index === benLine.index
              ) ?? null;
              return (
                <YaoRow
                  key={benLine.index}
                  position={benLine.index}
                  benLine={benLine}
                  bianLine={bianLine}
                  hasBianGua={hasBianGua}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
