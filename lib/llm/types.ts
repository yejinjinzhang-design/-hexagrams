import type { UserQuestionInput } from "@/types/divination";
import type { DivinationResult } from "@/types/divination";
import type { DivinationAnalysis } from "@/types/analysis";

export type LLMProviderName = "deepseek";

export interface LLMModelRef {
  provider: LLMProviderName;
  model: string;
}

export interface AnalyzeDivinationInput {
  user: UserQuestionInput;
  divination: DivinationResult;
}

export interface AnalyzeDivinationOptions {
  modelHint?: string;
}

export interface AnalyzeDivinationResult {
  analysis: DivinationAnalysis;
  model: LLMModelRef;
  promptVersion: string;
  rawText?: string;
}

export interface LLMProvider {
  readonly name: LLMProviderName;
  analyzeDivination(
    input: AnalyzeDivinationInput,
    options?: AnalyzeDivinationOptions
  ): Promise<AnalyzeDivinationResult>;
}

