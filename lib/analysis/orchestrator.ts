import {
  buildPostJudgeUser,
  buildPostReviewUser,
  buildPrecheckJudgeUser,
  buildPrecheckReviewUser,
  POST_JUDGE_APPEND,
  POST_REVIEWER_SYSTEM,
  PRECHECK_JUDGE_APPEND,
  PRECHECK_REVIEWER_SYSTEM,
} from "@/lib/analysis/prompts";
import {
  extractAuditSummaryFromJson,
  getAnalysisPipelineRoles,
  parseReviewFeedback,
  reviewToAuditSummary,
  type AnalysisProviderId,
} from "@/lib/analysis/schemas";
import type {
  DivinationPipelineTrace,
  DivinationPipelineTraceStep,
} from "@/lib/storage/types";
import { deepseekChat, isDeepseekConfigured } from "@/lib/llm/deepseek";
import { geminiChat, isGeminiConfigured } from "@/lib/llm/gemini";

const MAX_DRAFT_CLIP = 14_000;
const MAX_REVIEW_CLIP = 18_000;

export type OrchestratorLlmResult = {
  content: string;
  auditSummary?: string;
  pipelineTrace?: DivinationPipelineTrace;
};

function clipBody(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}\n\n…（已截断，全文约 ${t.length} 字）`;
}

function prettyReviewRaw(raw: string): string {
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  try {
    return JSON.stringify(JSON.parse(s), null, 2);
  } catch {
    return raw;
  }
}

function alternate(id: AnalysisProviderId): AnalysisProviderId {
  return id === "deepseek" ? "gemini" : "deepseek";
}

function canRun(id: AnalysisProviderId): boolean {
  return id === "deepseek" ? isDeepseekConfigured() : isGeminiConfigured();
}

async function chat(
  id: AnalysisProviderId,
  args: {
    system: string;
    user: string;
    jsonObject?: boolean;
    jsonMime?: boolean;
    timeoutMs?: number;
  }
) {
  if (id === "gemini") {
    return geminiChat({
      system: args.system,
      user: args.user,
      jsonMime: args.jsonMime ?? true,
      timeoutMs: args.timeoutMs,
    });
  }
  return deepseekChat({
    system: args.system,
    user: args.user,
    jsonObject: args.jsonObject ?? true,
    timeoutMs: args.timeoutMs,
  });
}

type DraftOk = { content: string; provider: AnalysisProviderId };

async function runDraft(
  primary: AnalysisProviderId,
  system: string,
  user: string,
  timeoutMs: number
): Promise<DraftOk | null> {
  const order: AnalysisProviderId[] = canRun(primary)
    ? [primary, alternate(primary)]
    : [alternate(primary), primary];

  const tried = new Set<AnalysisProviderId>();
  for (const id of order) {
    if (tried.has(id) || !canRun(id)) continue;
    tried.add(id);
    const r = await chat(id, {
      system,
      user,
      jsonObject: true,
      jsonMime: true,
      timeoutMs,
    });
    if (r.ok && r.content.trim()) {
      console.info(
        `[multi-model] ① 初稿完成 provider=${id}（字节约 ${r.content.length}）`
      );
      return { content: r.content.trim(), provider: id };
    }
    console.warn("[orchestrator] draft failed on", id, r.ok ? "" : r.error);
  }
  return null;
}

function reviewerCallable(reviewer: AnalysisProviderId): boolean {
  return canRun(reviewer);
}

function draftStep(d: DraftOk): DivinationPipelineTraceStep {
  return {
    phase: "初稿",
    provider: d.provider,
    body: clipBody(d.content, MAX_DRAFT_CLIP),
  };
}

/**
 * 验证前事：初稿 → 审稿 → 裁决；任一后段失败则回退初稿。
 */
export async function orchestratePrecheckLlm(params: {
  system: string;
  user: string;
  userQuestion: string;
  boardFacts?: string;
}): Promise<OrchestratorLlmResult> {
  const roles = getAnalysisPipelineRoles();
  console.info(
    `[multi-model] 验证前事 角色 primary=${roles.primary} reviewer=${roles.reviewer} judge=${roles.judge}`
  );
  const draftOk = await runDraft(
    roles.primary,
    params.system,
    params.user,
    60_000
  );
  if (!draftOk) {
    throw new Error("precheck_draft_failed");
  }
  const draft = draftOk.content;

  if (!reviewerCallable(roles.reviewer)) {
    console.info(
      "[multi-model] 未跑审稿（审稿模型未配置或不可用），仅初稿即终稿"
    );
    return {
      content: draft,
      pipelineTrace: { steps: [draftStep(draftOk)] },
    };
  }

  const rev = await chat(roles.reviewer, {
    system: PRECHECK_REVIEWER_SYSTEM,
    user: buildPrecheckReviewUser({
      userQuestion: params.userQuestion,
      draftJson: draft,
      boardFacts: params.boardFacts,
    }),
    jsonObject: roles.reviewer === "deepseek",
    jsonMime: roles.reviewer === "gemini",
    timeoutMs: 55_000,
  });

  if (!rev.ok || !rev.content.trim()) {
    console.warn(
      "[multi-model] precheck step=review failed provider=",
      roles.reviewer,
      rev.ok ? "empty" : rev.error
    );
    return {
      content: draft,
      pipelineTrace: {
        steps: [
          draftStep(draftOk),
          {
            phase: "审稿",
            provider: roles.reviewer,
            body: `审稿未成功：${rev.ok ? "返回为空" : rev.error}`,
          },
        ],
      },
    };
  }
  console.info(
    `[multi-model] ② 审稿完成 provider=${roles.reviewer}（字节约 ${rev.content.length}）`
  );

  const reviewParsed = parseReviewFeedback(rev.content);
  const reviewJson =
    reviewParsed != null
      ? JSON.stringify(reviewParsed, null, 0)
      : JSON.stringify({
          vagueSpots: [],
          misalignedSpots: [],
          overconfidentSpots: [],
          missingDetails: [],
          suggestedAdds: [rev.content.slice(0, 600)],
        });

  const reviewBody = clipBody(prettyReviewRaw(rev.content), MAX_REVIEW_CLIP);

  if (!canRun(roles.judge)) {
    console.info(
      "[multi-model] precheck step=judge skipped (judge not configured); using draft"
    );
    return {
      content: draft,
      auditSummary: reviewParsed ? reviewToAuditSummary(reviewParsed) : undefined,
      pipelineTrace: {
        steps: [
          draftStep(draftOk),
          { phase: "审稿", provider: roles.reviewer, body: reviewBody },
          {
            phase: "裁决",
            provider: roles.judge,
            body: "裁决侧未配置或不可用，页面正文仍为初稿。上列为审稿结构化意见。",
          },
        ],
      },
    };
  }

  const judgeSystem = `${params.system}\n\n${PRECHECK_JUDGE_APPEND}`;
  const judgeUser = buildPrecheckJudgeUser({
    userQuestion: params.userQuestion,
    draftJson: draft,
    reviewJson,
    boardFacts: params.boardFacts,
  });

  const judged = await chat(roles.judge, {
    system: judgeSystem,
    user: judgeUser,
    jsonObject: roles.judge === "deepseek",
    jsonMime: roles.judge === "gemini",
    timeoutMs: 95_000,
  });

  if (!judged.ok || !judged.content.trim()) {
    console.warn(
      "[multi-model] precheck step=judge failed provider=",
      roles.judge,
      judged.ok ? "empty" : judged.error
    );
    return {
      content: draft,
      auditSummary: reviewParsed ? reviewToAuditSummary(reviewParsed) : undefined,
      pipelineTrace: {
        steps: [
          draftStep(draftOk),
          { phase: "审稿", provider: roles.reviewer, body: reviewBody },
          {
            phase: "裁决",
            provider: roles.judge,
            body: `定稿未成功（${judged.ok ? "空内容" : judged.error}），正文已回退为初稿。`,
          },
        ],
      },
    };
  }

  const extracted = extractAuditSummaryFromJson(judged.content);
  let audit = extracted.auditSummary;
  if (!audit && reviewParsed) audit = reviewToAuditSummary(reviewParsed);

  console.info(
    `[multi-model] ③ 裁决定稿 provider=${roles.judge} auditSummary=${audit ? "有" : "无"}`
  );

  const judgeNarrative =
    audit?.trim() ||
    "已定稿：裁决模型已据审稿整合 JSON 字段，正文见页面主区域。";

  return {
    content: extracted.jsonWithoutAudit.trim() || judged.content.trim(),
    auditSummary: audit,
    pipelineTrace: {
      steps: [
        draftStep(draftOk),
        { phase: "审稿", provider: roles.reviewer, body: reviewBody },
        {
          phase: "裁决",
          provider: roles.judge,
          body: judgeNarrative,
        },
      ],
    },
  };
}

/**
 * 后事分析：同上流水线，终稿 JSON 与现有解析器兼容。
 */
export async function orchestratePostAnalysisLlm(params: {
  system: string;
  user: string;
  userQuestion: string;
  boardFacts?: string;
}): Promise<OrchestratorLlmResult> {
  const roles = getAnalysisPipelineRoles();
  console.info(
    "[multi-model] post_analysis roles:",
    `primary=${roles.primary} reviewer=${roles.reviewer} judge=${roles.judge}`
  );

  const draftOk = await runDraft(
    roles.primary,
    params.system,
    params.user,
    75_000
  );
  if (!draftOk) {
    throw new Error("post_draft_failed");
  }
  const draft = draftOk.content;
  console.info(
    "[multi-model] post_analysis step=draft ok provider=",
    draftOk.provider
  );

  if (!reviewerCallable(roles.reviewer)) {
    console.info(
      "[multi-model] post_analysis step=review skipped (reviewer not configured or no API key)"
    );
    return {
      content: draft,
      pipelineTrace: { steps: [draftStep(draftOk)] },
    };
  }

  const rev = await chat(roles.reviewer, {
    system: POST_REVIEWER_SYSTEM,
    user: buildPostReviewUser({
      userQuestion: params.userQuestion,
      draftJson: draft,
      boardFacts: params.boardFacts,
    }),
    jsonObject: roles.reviewer === "deepseek",
    jsonMime: roles.reviewer === "gemini",
    timeoutMs: 55_000,
  });

  if (!rev.ok || !rev.content.trim()) {
    console.warn(
      "[multi-model] post_analysis step=review failed provider=",
      roles.reviewer,
      rev.ok ? "empty" : rev.error
    );
    return {
      content: draft,
      pipelineTrace: {
        steps: [
          draftStep(draftOk),
          {
            phase: "审稿",
            provider: roles.reviewer,
            body: `审稿未成功：${rev.ok ? "返回为空" : rev.error}`,
          },
        ],
      },
    };
  }
  console.info(
    `[multi-model] 后事 ② 审稿完成 provider=${roles.reviewer}（字节约 ${rev.content.length}）`
  );

  const reviewParsed = parseReviewFeedback(rev.content);
  const reviewJson =
    reviewParsed != null
      ? JSON.stringify(reviewParsed, null, 0)
      : JSON.stringify({
          vagueSpots: [],
          misalignedSpots: [],
          overconfidentSpots: [],
          missingDetails: [],
          suggestedAdds: [rev.content.slice(0, 600)],
        });

  const reviewBody = clipBody(prettyReviewRaw(rev.content), MAX_REVIEW_CLIP);

  if (!canRun(roles.judge)) {
    console.info(
      "[multi-model] post_analysis step=judge skipped (judge not configured); using draft"
    );
    return {
      content: draft,
      auditSummary: reviewParsed ? reviewToAuditSummary(reviewParsed) : undefined,
      pipelineTrace: {
        steps: [
          draftStep(draftOk),
          { phase: "审稿", provider: roles.reviewer, body: reviewBody },
          {
            phase: "裁决",
            provider: roles.judge,
            body: "裁决侧未配置或不可用，正文仍为初稿。",
          },
        ],
      },
    };
  }

  const judgeSystem = `${params.system}\n\n${POST_JUDGE_APPEND}`;
  const judgeUser = buildPostJudgeUser({
    userQuestion: params.userQuestion,
    draftJson: draft,
    reviewJson,
    boardFacts: params.boardFacts,
  });

  const judged = await chat(roles.judge, {
    system: judgeSystem,
    user: judgeUser,
    jsonObject: roles.judge === "deepseek",
    jsonMime: roles.judge === "gemini",
    timeoutMs: 100_000,
  });

  if (!judged.ok || !judged.content.trim()) {
    console.warn(
      "[multi-model] post_analysis step=judge failed provider=",
      roles.judge,
      judged.ok ? "empty" : judged.error
    );
    return {
      content: draft,
      auditSummary: reviewParsed ? reviewToAuditSummary(reviewParsed) : undefined,
      pipelineTrace: {
        steps: [
          draftStep(draftOk),
          { phase: "审稿", provider: roles.reviewer, body: reviewBody },
          {
            phase: "裁决",
            provider: roles.judge,
            body: `定稿未成功（${judged.ok ? "空内容" : judged.error}），正文已回退为初稿。`,
          },
        ],
      },
    };
  }

  const extracted = extractAuditSummaryFromJson(judged.content);
  let audit = extracted.auditSummary;
  if (!audit && reviewParsed) audit = reviewToAuditSummary(reviewParsed);

  console.info(
    `[multi-model] 后事 ③ 裁决定稿 provider=${roles.judge} auditSummary=${audit ? "有" : "无"}`
  );

  const judgeNarrative =
    audit?.trim() ||
    "已定稿：裁决模型已据审稿整合 JSON，正文见页面主区域。";

  return {
    content: extracted.jsonWithoutAudit.trim() || judged.content.trim(),
    auditSummary: audit,
    pipelineTrace: {
      steps: [
        draftStep(draftOk),
        { phase: "审稿", provider: roles.reviewer, body: reviewBody },
        { phase: "裁决", provider: roles.judge, body: judgeNarrative },
      ],
    },
  };
}
