import { buildDivinationUserPrompt } from "@/lib/prompts";
import type {
  AnalyzeDivinationInput,
  AnalyzeDivinationOptions,
  AnalyzeDivinationResult,
  LLMModelRef,
  LLMProvider
} from "@/lib/llm/types";
import type { DivinationAnalysis } from "@/types/analysis";

const DEEPSEEK_BASE_URL = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-chat";
const REASONING_MODEL = "deepseek-reasoner";

function getApiKey(): string {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    throw new Error("DEEPSEEK_API_KEY 未配置，请在 .env.local 中设置。");
  }
  return key;
}

function buildUrl(path: string): string {
  return `${DEEPSEEK_BASE_URL}${path}`;
}

function buildModelRef(model: string): LLMModelRef {
  return {
    provider: "deepseek",
    model
  };
}

function buildFallbackAnalysis(): DivinationAnalysis {
  const emptySection = {
    summary: "本次未能成功解析模型返回结果，仅给出通用提示。",
    details:
      "可以稍后重试，或简要调整提问方式再起卦。现实中的理性判断与行动始终更为重要。"
  };

  return {
    overall: emptySection,
    keyPoints: emptySection,
    career: emptySection,
    relationship: emptySection,
    wealth: emptySection,
    timing: emptySection,
    advice: emptySection,
    disclaimer:
      "本次分析结果解析失败，仅供参考。重要决策请结合现实情况与自身判断，不要完全依赖卦象与本次分析结果。"
  };
}

export class DeepSeekProvider implements LLMProvider {
  readonly name = "deepseek" as const;

  async analyzeDivination(
    input: AnalyzeDivinationInput,
    options?: AnalyzeDivinationOptions
  ): Promise<AnalyzeDivinationResult> {
    const { system, user, promptVersion } = buildDivinationUserPrompt({
      user: input.user,
      divination: input.divination
    });

    const model =
      options?.modelHint && options.modelHint === REASONING_MODEL
        ? REASONING_MODEL
        : DEFAULT_MODEL;

    const body = {
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
      response_format: {
        type: "json_object"
      }
    };

    let rawText = "";
    let parsed: unknown;

    try {
      const res = await fetch(buildUrl("/chat/completions"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getApiKey()}`
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        throw new Error(`DeepSeek API 响应错误: ${res.status}`);
      }

      const data = (await res.json()) as any;
      rawText = data.choices?.[0]?.message?.content ?? "";

      try {
        parsed = JSON.parse(rawText);
      } catch {
        const match = rawText.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            parsed = JSON.parse(match[0]);
          } catch {
            parsed = undefined;
          }
        }
      }
    } catch (error) {
      const fallback = buildFallbackAnalysis();
      return {
        analysis: fallback,
        model: buildModelRef(model),
        promptVersion,
        rawText:
          rawText ||
          (error instanceof Error ? error.message : "DeepSeek API 调用失败")
      };
    }

    if (!parsed) {
      const fallback = buildFallbackAnalysis();
      return {
        analysis: fallback,
        model: buildModelRef(model),
        promptVersion,
        rawText
      };
    }

    const analysis: DivinationAnalysis = {
      overall: {
        summary: (parsed as any).overall?.summary ?? "",
        details: (parsed as any).overall?.details ?? ""
      },
      keyPoints: {
        summary: (parsed as any).keyPoints?.summary ?? "",
        details: (parsed as any).keyPoints?.details ?? ""
      },
      career: {
        summary: (parsed as any).career?.summary ?? "",
        details: (parsed as any).career?.details ?? ""
      },
      relationship: {
        summary: (parsed as any).relationship?.summary ?? "",
        details: (parsed as any).relationship?.details ?? ""
      },
      wealth: {
        summary: (parsed as any).wealth?.summary ?? "",
        details: (parsed as any).wealth?.details ?? ""
      },
      timing: {
        summary: (parsed as any).timing?.summary ?? "",
        details: (parsed as any).timing?.details ?? ""
      },
      advice: {
        summary: (parsed as any).advice?.summary ?? "",
        details: (parsed as any).advice?.details ?? ""
      },
      disclaimer:
        (parsed as any).disclaimer ??
        "本结果仅供参考，重要决策请结合现实情况与自身判断，不要完全依赖卦象与本次分析结果。"
    };

    return {
      analysis,
      model: buildModelRef(model),
      promptVersion,
      rawText
    };
  }
}

