export interface SectionAnalysis {
  summary: string;
  details?: string;
}

export interface DivinationAnalysis {
  overall: SectionAnalysis;
  keyPoints: SectionAnalysis;
  career: SectionAnalysis;
  relationship: SectionAnalysis;
  wealth: SectionAnalysis;
  timing: SectionAnalysis;
  advice: SectionAnalysis;
  disclaimer: string;
}

export interface DivinationAnalysisPayload {
  overall?: Partial<SectionAnalysis>;
  keyPoints?: Partial<SectionAnalysis>;
  career?: Partial<SectionAnalysis>;
  relationship?: Partial<SectionAnalysis>;
  wealth?: Partial<SectionAnalysis>;
  timing?: Partial<SectionAnalysis>;
  advice?: Partial<SectionAnalysis>;
  disclaimer?: string;
}

