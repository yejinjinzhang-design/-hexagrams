"use client";

import type { LiuyaoBoard, YaoLineBoard } from "@/types/liuyao-board";
import type { UserQuestionInput } from "@/types/divination";

function bitForIndex(binaryTopDown: string, index: number): "0" | "1" {
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
      <div className="h-[6px] w-[40px] shrink-0 rounded-[2px] bg-[#5F4A36] md:h-[7px] md:w-[52px]" />
    );
  }
  return (
    <div className="flex h-[6px] w-[40px] shrink-0 items-center justify-between md:h-[7px] md:w-[52px]">
      <div className="h-[6px] w-[17px] rounded-[2px] bg-[#5F4A36] md:h-[7px] md:w-[22px]" />
      <div className="h-[6px] w-[17px] rounded-[2px] bg-[#5F4A36] md:h-[7px] md:w-[22px]" />
    </div>
  );
}

function MovingDot() {
  return (
    <span className="inline-block h-[7px] w-[7px] shrink-0 rounded-full bg-[#C6A46C] md:h-[8px] md:w-[8px]" />
  );
}

function ShiYingTag({ value }: { value?: "世" | "应" }) {
  if (!value) return null;
  if (value === "世") {
    return (
      <span className="inline-flex shrink-0 items-center rounded bg-[#f5e5c4] px-1 py-[1px] text-[9px] text-[#8B6B3F] md:px-1.5 md:text-[10px]">
        世
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center rounded border border-[#C89B5A] bg-transparent px-1 py-[1px] text-[9px] text-[#8B6B3F] md:px-1.5 md:text-[10px]">
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
    <section className="mx-auto w-full max-w-[1120px] min-w-0 overflow-hidden rounded-[16px] border border-[#E5D8C7] bg-[#F8F3EA] px-3 py-4 text-[#3A2F26] md:px-6 md:py-4 md:mx-auto">
      {/* 盘头信息 */}
      <div className="mb-4 min-w-0 space-y-1 text-left">
        <p className="break-words text-[15px] font-semibold font-ritual-title leading-relaxed text-[#3A2F26] md:text-[18px]">
          所问：{user.question}
        </p>
        <p className="break-words text-[11px] leading-relaxed font-ritual-title text-[#8C7A6B] md:text-[13px]">
          问卦者：{user.birthYear} 年生 {genderLabel}　起卦时：{meta.solarDate}
          　四柱：{meta.yearPillar} {meta.monthPillar} {meta.dayPillar}{" "}
          {meta.hourPillar}
        </p>
      </div>

      {/* 桌面端：双列标题（固定宽网格，仅 md+） */}
      <div className="mb-5 mt-4 hidden text-center font-ritual-title text-[#3A2F26] md:block">
        <div
          className="mx-auto flex max-w-full flex-row items-start justify-center"
          style={{ width: 665, maxWidth: "100%" }}
        >
          <div className="min-w-0 flex-1 text-center" style={{ maxWidth: 364 }}>
            <div className="text-[12px] tracking-[0.25em] text-[#8C7A6B] md:text-[13px]">
              本卦
            </div>
            <div className="break-keep text-center text-[22px] font-semibold md:text-[24px]">
              {mainName || "未知卦"}
            </div>
          </div>
          <div aria-hidden className="w-px shrink-0 self-stretch bg-transparent" />
          <div className="min-w-0 flex-1 text-center" style={{ maxWidth: 300 }}>
            {hasBian && bianGua ? (
              <>
                <div className="text-[12px] tracking-[0.25em] text-[#8C7A6B] md:text-[13px]">
                  变卦
                </div>
                <div className="break-keep text-center text-[22px] font-semibold md:text-[24px]">
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

      {/* 手机端：本卦 / 变卦标题上下堆叠 */}
      <div className="mb-5 mt-2 space-y-6 text-center font-ritual-title text-[#3A2F26] md:hidden">
        <div className="w-full min-w-0 px-1">
          <div className="text-[11px] tracking-[0.28em] text-[#8C7A6B]">本卦</div>
          <div className="mt-1 break-keep text-center text-lg font-semibold leading-snug">
            {mainName || "未知卦"}
          </div>
        </div>
        {hasBian && bianGua ? (
          <div className="w-full min-w-0 border-t border-[#E5D8C7] pt-5 px-1">
            <div className="text-[11px] tracking-[0.28em] text-[#8C7A6B]">变卦</div>
            <div className="mt-1 break-keep text-center text-lg font-semibold leading-snug">
              {changedName || "未知卦"}
            </div>
          </div>
        ) : (
          <div className="text-[10px] tracking-[0.08em] text-[#8C7A6B]">
            本卦无动爻，止于本卦
          </div>
        )}
      </div>

      {/* 手机端：先本卦六爻，再变卦六爻 */}
      <div className="min-w-0 space-y-8 md:hidden">
        <div className="min-w-0 overflow-hidden rounded-lg border border-[#E8DCC8]/80 bg-[#FBF6EE] px-2 py-3">
          <div className="mb-2 text-center text-[10px] font-medium tracking-widest text-[#8C7A6B]">
            本卦爻象
          </div>
          <div className="flex flex-col gap-2.5 font-mono">
            {linesTopDown.map((benLine) => {
              const benBit = bitForIndex(benGua.binary, benLine.index);
              const yinYangBen: "yin" | "yang" = benBit === "1" ? "yang" : "yin";
              const isMoving = benLine.moving;
              return (
                <div
                  key={`m-ben-${benLine.index}`}
                  className="grid min-w-0 grid-cols-[minmax(0,2rem)_minmax(0,1fr)_auto_auto_minmax(0,1.75rem)] items-center gap-x-1.5 gap-y-0"
                >
                  <div className="min-w-0 truncate text-center text-[10px] text-[#7a6751]">
                    {benLine.sixGod}
                  </div>
                  <div className="min-w-0 break-all text-right text-[11px] leading-tight text-[#4a3a2a]">
                    {lineInfo(benLine)}
                  </div>
                  <div className="flex shrink-0 justify-center">
                    <YaoShape yinYang={yinYangBen} />
                  </div>
                  <div className="flex shrink-0 justify-center">
                    {isMoving ? <MovingDot /> : null}
                  </div>
                  <div className="flex shrink-0 justify-center">
                    <ShiYingTag value={benLine.shiYing} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {hasBian && bianGua ? (
          <div className="min-w-0 overflow-hidden rounded-lg border border-[#E8DCC8]/80 bg-[#FBF6EE] px-2 py-3">
            <div className="mb-2 text-center text-[10px] font-medium tracking-widest text-[#8C7A6B]">
              变卦爻象
            </div>
            <div className="flex flex-col gap-2.5 font-mono">
              {linesTopDown.map((benLine) => {
                const bianLine = bianLineByIndex.get(benLine.index) ?? null;
                const yinYangBian: "yin" | "yang" | null =
                  bianLine && bianGua
                    ? bitForIndex(bianGua.binary, bianLine.index) === "1"
                      ? "yang"
                      : "yin"
                    : null;
                return (
                  <div
                    key={`m-bian-${benLine.index}`}
                    className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3"
                  >
                    <div className="flex shrink-0 justify-center">
                      {yinYangBian ? (
                        <YaoShape yinYang={yinYangBian} />
                      ) : (
                        <div className="h-[6px] w-[40px] shrink-0 rounded-[4px] bg-[#d5c8b4] md:h-[6px] md:w-[44px]" />
                      )}
                    </div>
                    <div className="min-w-0 break-all text-left text-[11px] leading-tight text-[#6b5235]">
                      {bianLine ? lineInfo(bianLine) : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      {/* 桌面端：双列六爻 */}
      <div className="mt-2 hidden min-w-0 md:block md:overflow-x-auto md:pb-1">
        <div className="mx-auto max-w-full" style={{ width: 665 }}>
          <div className="flex flex-col gap-2 font-mono text-[12px]">
            {linesTopDown.map((benLine) => {
              const benBit = bitForIndex(benGua.binary, benLine.index);
              const yinYangBen: "yin" | "yang" = benBit === "1" ? "yang" : "yin";
              const isMoving = benLine.moving;
              const bianLine =
                hasBian && bianGua ? bianLineByIndex.get(benLine.index) ?? null : null;
              const yinYangBian: "yin" | "yang" | null =
                bianLine && bianGua
                  ? bitForIndex(bianGua.binary, bianLine.index) === "1"
                    ? "yang"
                    : "yin"
                  : null;

              return (
                <div
                  key={benLine.index}
                  className="grid h-9 min-w-0 items-center"
                  style={{
                    gridTemplateColumns:
                      "80px 140px 80px 24px 40px 1px 80px 140px 80px",
                  }}
                >
                  <div className="text-center text-[11px] text-[#7a6751]">
                    {benLine.sixGod}
                  </div>
                  <div className="min-w-0 pr-2 text-right text-[12px] text-[#4a3a2a]">
                    {lineInfo(benLine)}
                  </div>
                  <div className="flex items-center justify-center">
                    <YaoShape yinYang={yinYangBen} />
                  </div>
                  <div className="flex items-center justify-center">
                    {isMoving ? <MovingDot /> : null}
                  </div>
                  <div className="flex items-center justify-center">
                    <ShiYingTag value={benLine.shiYing} />
                  </div>
                  <div className="h-full w-px shrink-0 bg-[#E5D5BD]" />
                  <div className="flex items-center justify-center">
                    {yinYangBian ? (
                      <YaoShape yinYang={yinYangBian} />
                    ) : (
                      <div className="h-[6px] w-[52px] rounded-[4px] bg-[#d5c8b4] md:h-[7px]" />
                    )}
                  </div>
                  <div className="min-w-0 pl-2 text-left text-[12px] text-[#6b5235]">
                    {bianLine ? lineInfo(bianLine) : ""}
                  </div>
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
