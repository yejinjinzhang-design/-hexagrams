import { NextResponse } from "next/server";
import { requireAdminAnalyticsKey } from "@/lib/analytics/admin-auth";
import { getSessionById } from "@/lib/storage/mock";

export const runtime = "nodejs";

/**
 * 仅管理员：读取某次占卦会话内的多模型互审内部数据（不落用户前端）
 * GET /api/admin/session-trace?sessionId=xxx
 * 鉴权：x-admin-key 或 ?key= 与 ADMIN_ANALYTICS_KEY 一致
 */
export async function GET(request: Request) {
  const denied = requireAdminAnalyticsKey(request);
  if (denied) return denied;

  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId")?.trim();
  if (!sessionId) {
    return NextResponse.json(
      { error: "缺少 sessionId" },
      { status: 400 }
    );
  }

  const session = await getSessionById(sessionId);
  if (!session) {
    return NextResponse.json({ error: "会话不存在" }, { status: 404 });
  }

  return NextResponse.json({
    sessionId,
    preCheckAuditSummary: session.preCheckAuditSummary ?? null,
    preCheckPipelineTrace: session.preCheckPipelineTrace ?? null,
    postAnalysisAuditSummary: session.postAnalysisAuditSummary ?? null,
    postAnalysisPipelineTrace: session.postAnalysisPipelineTrace ?? null,
  });
}
