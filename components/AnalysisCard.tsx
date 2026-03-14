import type { SectionAnalysis } from "@/types/analysis";

interface AnalysisCardProps {
  title: string;
  section: SectionAnalysis;
  emphasis?: boolean;
}

export function AnalysisCard({ title, section, emphasis }: AnalysisCardProps) {
  return (
    <section
      className={`flex flex-col gap-2 rounded-xl border border-ink-accent/30 bg-ink-muted/60 p-4 text-sm ${
        emphasis ? "shadow-soft-glow" : ""
      }`}
    >
      <h3 className="text-sm font-semibold text-ink-accent">{title}</h3>
      {section.summary && (
        <p className="text-[13px] leading-relaxed text-gray-100">
          {section.summary}
        </p>
      )}
      {section.details && (
        <p className="text-[12px] leading-relaxed text-gray-300">
          {section.details}
        </p>
      )}
    </section>
  );
}

