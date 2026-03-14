import type { DivinationResult } from "@/types/divination";
import type { UserQuestionInput } from "@/types/divination";

interface ProfessionalHexagramTableProps {
  user: UserQuestionInput;
  result: DivinationResult;
}

const POSITION_LABEL: Record<number, string> = {
  1: "初爻",
  2: "二爻",
  3: "三爻",
  4: "四爻",
  5: "五爻",
  6: "上爻"
};

export function ProfessionalHexagramTable({
  user,
  result
}: ProfessionalHexagramTableProps) {
  const linesTopDown = [...result.lines].sort((a, b) => b.index - a.index);

  return (
    <section className="rounded-2xl border border-[#e0d2b8] bg-[#faf5ea]/95 p-5 text-xs text-[#4a3a2a] md:p-6">
      <header className="mb-3 space-y-1">
        <div className="flex flex-wrap items-baseline gap-3">
          <div>
            卦主：{user.birthYear} 年{" "}
            {user.gender === "male"
              ? "男"
              : user.gender === "female"
              ? "女"
              : "其他"}
          </div>
          <div className="text-[#7d5a2b]">问事：{user.question}</div>
        </div>
        <div className="text-[11px] text-[#8a755a]">
          本卦：{result.originalHexagram.name ?? "待补充"}（
          {result.originalHexagram.binaryCode}）
          {result.changedHexagram
            ? ` · 变卦：${
                result.changedHexagram.name ?? "待补充"
              }（${result.changedHexagram.binaryCode}）`
            : ""}
        </div>
      </header>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-[11px]">
          <thead>
            <tr className="border-b border-[#e0d2b8] bg-[#f5eddc] text-[#6b5235]">
              <th className="px-2 py-1 text-left">位次</th>
              <th className="px-2 py-1 text-left">阴阳</th>
              <th className="px-2 py-1 text-left">动静</th>
              <th className="px-2 py-1 text-left">本卦爻象</th>
              <th className="px-2 py-1 text-left">变卦爻象</th>
              <th className="px-2 py-1 text-left">备注</th>
            </tr>
          </thead>
          <tbody>
            {linesTopDown.map((line) => {
              const isYang = line.polarity === "yang";
              const isMoving = line.moving;
              const changedYang = line.changedPolarity === "yang";

              const renderSegment = (yang: boolean) =>
                yang ? "———" : "—  —";

              return (
                <tr
                  key={line.index}
                  className="border-b border-[#f0e3c8] last:border-0"
                >
                  <td className="px-2 py-1">{POSITION_LABEL[line.index]}</td>
                  <td className="px-2 py-1">{isYang ? "阳" : "阴"}</td>
                  <td className="px-2 py-1">
                    {isMoving ? "动爻" : "静爻"}
                  </td>
                  <td className="px-2 py-1 font-mono">
                    {renderSegment(isYang)}
                  </td>
                  <td className="px-2 py-1 font-mono">
                    {renderSegment(changedYang)}
                  </td>
                  <td className="px-2 py-1 text-[#8f7a5d]">
                    {isMoving ? "本爻变动" : ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

