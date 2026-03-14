import type {
  AnalyzeDivinationInput,
  AnalyzeDivinationOptions,
  AnalyzeDivinationResult
} from "@/lib/llm/types";
import { DeepSeekProvider } from "@/lib/llm/providers/deepseek";

const deepseekProvider = new DeepSeekProvider();

export async function routeAnalyzeDivination(
  input: AnalyzeDivinationInput,
  options?: AnalyzeDivinationOptions
): Promise<AnalyzeDivinationResult> {
  const questionLength = input.user.question?.length ?? 0;

  const modelHint =
    questionLength > 120
      ? "deepseek-reasoner"
      : "deepseek-chat";

  return deepseekProvider.analyzeDivination(input, {
    ...options,
    modelHint
  });
}

