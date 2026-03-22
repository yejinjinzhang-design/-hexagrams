"use client";

import type { LiuyaoBoard, YaoLineBoard } from "@/types/liuyao-board";
import type { UserQuestionInput } from "@/types/divination";

function bitForIndex(binaryTopDown: string, index: number): "0" | "1" {
  // binaryTopDown: 6 chars, from 上爻到初爻
  const pos = 6 - index;
  const ch = binaryTopDown[pos];
  return ch === "1" ? "1" : "0";
}

function lineInfo(line: YaoLineBoard): string {
  return `${line.liuQin}${line.stem}${line.branch}`;
}

function YaoShape({ yinYang }: { yinYang: "yin" | "yang" }) {
  if (yinYang === "yang") {
    return (
      <div className="h-[7px] w-[52px] rounded-[2px] bg-[#5F4A36]" />
    );
  }
  return (
    <div className="flex h-[7px] w-[52px] items-center justify-between">
      <div className="h-[7px] w-[22px] rounded-[2px] bg-[#5F4A36]" />
      <div className="h-[7px] w-[22px] rounded-[2px] bg-[#5F4A36]" />
    </div>
  );
}

function MovingDot() {
  return (
    <span className="inline-block h-[8px] w-[8px] rounded-full bg-[#C6A46C]" />
  );
}

function ShiYingTag({ value }: { value?: "世" | "应" }) {
  if (!value) return null;
  if (value === "世") {
    return (
      <span className="inline-flex items-center rounded bg-[#f5e5c4] px-1.5 py-[1px] text-[10px] text-[#8B6B3F]">
        世
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded border border-[#C89B5A] bg-transparent px-1.5 py-[1px] text-[10px] text-[#8B6B3F]">
      应
    </span>
  );
}

interface Props {
  board: LiuyaoBoard;
  user: UserQuestionInput;
}

export function TraditionalHexagramLayout({ board, user }: Props) {
  const { benGua, bianGua, meta } = board;
  const hasBian = !!bianGua;
  const mainName = benGua.name === "待补充" ? "" : benGua.name;
  const changedName = bianGua?.name === "待补充" ? "" : bianGua?.name;
  const linesTopDown = [...benGua.lines].sort((a, b) => b.index - a.index);

  const bianLineByIndex = new Map<number, YaoLineBoard>();
  if (bianGua) {
    for (const l of bianGua.lines) bianLineByIndex.set(l.index, l);
  }

  const genderLabel =
    user.gender === "male" ? "男" : user.gender === "female" ? "女" : "未说明";

  return (
    <section className="w-full max-w-[1120px] rounded-[16px] border border-[#E5D8C7] bg-[#F8F3EA] p-4 text-[#3A2F26] md:mx-auto">
      {/* 盘头信息（弱化） */}
      <div className="mb-4 space-y-1 text-left">
        <p className="text-[16px] font-semibold font-ritual-title leading-relaxed text-[#3A2F26] md:text-[18px]">
          所问：{user.question}
        </p>
        <p className="text-[13px] leading-relaxed font-ritual-title text-[#8C7A6B]">
          问卦者：{user.birthYear} 年生{" "}
          {genderLabel}　起卦时：{meta.solarDate}　四柱：
          {meta.yearPillar} {meta.monthPillar} {meta.dayPillar} {meta.hourPillar}
        </p>
      </div>

      {/* 卦名标题区：与下方卦象网格同宽同轴对齐 */}
      <div className="mb-6 mt-6 text-center font-ritual-title text-[#3A2F26]">
        {/* 网格固定宽度：665px（左364px + 分割线1px + 右300px） */}
        <div className="mx-auto flex flex-row items-start justify-center" style={{ width: 665 }}>
          <div className="w-[364px] text-center">
            <div className="text-[12px] tracking-[0.3em] text-[#8C7A6B] md:text-[13px]">
              本卦
            </div>
            <div className="text-[20px] font-semibold md:text-[24px]">
              {mainName || "未知卦"}
            </div>
          </div>

          {/* 仅用来占位，让“变卦”标题严格落在右半部正下方 */}
          <div aria-hidden className="w-[1px]" />

          <div className="w-[300px] text-center">
            {hasBian && bianGua ? (
              <>
                <div className="text-[12px] tracking-[0.3em] text-[#8C7A6B] md:text-[13px]">
                  变卦
                </div>
                <div className="text-[20px] font-semibold md:text-[24px]">
                  {changedName || "未知卦"}
                </div>
              </>
            ) : null}
          </div>
        </div>

        {!hasBian ? (
          <div className="mt-2 text-[11px] tracking-[0.08em] text-[#8C7A6B]">
            本卦无动爻，止于本卦
          </div>
        ) : null}
      </div>

      {/* 双列六爻排盘 */}
      <div className="mt-4 overflow-x-auto pb-1">
        <div className="mx-auto" style={{ width: 665 }}>
          <div className="flex flex-col gap-2 font-mono text-[11px] md:text-[12px]">
          {linesTopDown.map((benLine) => {
          const benBit = bitForIndex(benGua.binary, benLine.index);
          const yinYangBen: "yin" | "yang" = benBit === "1" ? "yang" : "yin";
          const isMoving = benLine.moving;
          const bianLine = hasBian && bianGua ? bianLineByIndex.get(benLine.index) ?? null : null;
          const yinYangBian: "yin" | "yang" | null =
            bianLine && bianGua
              ? bitForIndex(bianGua.binary, bianLine.index) === "1"
                ? "yang"
                : "yin"
              : null;

          return (
            <div
              key={benLine.index}
              className="grid h-9 items-center"
              style={{
                gridTemplateColumns:
                  "80px 140px 80px 24px 40px 1px 80px 140px 80px",
              }}
            >
              {/* 六神 */}
              <div className="text-center text-[11px] text-[#7a6751]">
                {benLine.sixGod}
              </div>

              {/* 本卦六亲+干支 */}
              <div className="pr-2 text-right text-[12px] text-[#4a3a2a]">
                {lineInfo(benLine)}
              </div>

              {/* 本卦爻 */}
              <div className="flex items-center justify-center">
                <YaoShape yinYang={yinYangBen} />
              </div>

              {/* 动爻标记独立列 */}
              <div className="flex items-center justify-center">
                {isMoving ? <MovingDot /> : null}
              </div>

              {/* 世/应标签固定列 */}
              <div className="flex items-center justify-center">
                <ShiYingTag value={benLine.shiYing} />
              </div>

              {/* 分割线 */}
              <div className="h-full w-px bg-[#E5D5BD]" />

              {/* 变卦爻 */}
              <div className="flex items-center justify-center">
                {yinYangBian ? (
                  <YaoShape yinYang={yinYangBian} />
                ) : (
                  <div className="h-[6px] w-[56px] rounded-[4px] bg-[#d5c8b4]" />
                )}
              </div>

              {/* 变卦六亲+干支 */}
              <div className="pl-2 text-left text-[12px] text-[#6b5235]">
                {bianLine ? lineInfo(bianLine) : ""}
              </div>

              {/* 右侧对称补偿列（占位） */}
              <div />
            </div>
          );
        })}
          </div>
        </div>
      </div>
    </section>
  );
}

