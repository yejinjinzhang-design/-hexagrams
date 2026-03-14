import type { UserQuestionInput } from "@/types/divination";
import type { DivinationResult } from "@/types/divination";

export interface FewShotExample {
  /** 简要描述问题场景 */
  description: string;
  /** 输入示例（用户信息 + 卦象） */
  input: {
    user: UserQuestionInput;
    divination: DivinationResult;
  };
  /** 理想输出示例（JSON 结构） */
  output: unknown;
}

export interface DivinationPromptConfig {
  promptVersion: string;
  fewShotExamples?: FewShotExample[];
}

export const DIVINATION_PROMPT_VERSION = "v1-basic-structure";

export const baseSystemPrompt = `
你是一位严谨的六爻与易学分析助手。

【重要约束】
- 你只根据提供的「结构化卦象数据」和「用户问题信息」进行分析。
- 不要额外推演或编造任何未提供的排盘过程、起卦方式、历法细节。
- 不要假设使用了其它命理体系（如紫微斗数、八字排盘），除非在输入中已经明确提供。
- 风格应当专业、克制、自然，避免夸大其词或过度神秘化的表达。
- 避免使用「一定会」「必然」「绝对」等绝对化措辞，建议使用「倾向于」「较大可能」「需要警惕」「可重点留意」等更温和的表达。

【输出格式要求】
- 你必须严格输出符合 JSON 语法的内容，且外层必须是一个对象。
- 不要输出任何 JSON 以外的文字说明，不要出现注释。
- 如果对某一部分没有足够把握，可以给出温和、模糊但有参考价值的建议。

【输出 JSON 字段说明】
- overall: { summary, details }        // 总体判断
- keyPoints: { summary, details }      // 问题重点分析
- career: { summary, details }         // 事业发展与工作方向
- relationship: { summary, details }   // 感情、人际与家庭相关
- wealth: { summary, details }         // 财务与资源流向
- timing: { summary, details }         // 时间节奏、阶段性趋势
- advice: { summary, details }         // 综合建议与可行行动
- disclaimer: string                   // 免责声明，总结提醒

【免责声明要求】
- 必须明确提醒用户：结果仅供参考，不能替代现实中的理性判断与专业意见。
- 建议类似表述：「仅供参考，重要决策请结合现实情况与自身判断，不要完全依赖卦象与本次分析结果。」
`.trim();

export function buildDivinationUserPrompt(params: {
  user: UserQuestionInput;
  divination: DivinationResult;
  config?: DivinationPromptConfig;
}): { system: string; user: string; promptVersion: string } {
  const { user, divination, config } = params;

  const payload = {
    meta: {
      promptVersion: config?.promptVersion ?? DIVINATION_PROMPT_VERSION
    },
    userInfo: {
      birthYear: user.birthYear,
      gender: user.gender,
      question: user.question
    },
    divination: {
      lines: divination.lines,
      movingLines: divination.movingLines,
      originalHexagram: {
        binaryCode: divination.originalHexagram.binaryCode,
        name: divination.originalHexagram.name,
        description: divination.originalHexagram.description
      },
      changedHexagram: divination.changedHexagram
        ? {
            binaryCode: divination.changedHexagram.binaryCode,
            name: divination.changedHexagram.name,
            description: divination.changedHexagram.description
          }
        : null
    },
    fewShotNotes:
      config?.fewShotExamples && config.fewShotExamples.length > 0
        ? "当前 prompt 已配置 few-shot 示例，请在风格上尽量保持一致。"
        : "当前未配置 few-shot 示例，按系统提示进行自然、克制的分析即可。"
  };

  const userContent = JSON.stringify(payload, null, 2);

  return {
    system: baseSystemPrompt,
    user: userContent,
    promptVersion: payload.meta.promptVersion
  };
}

