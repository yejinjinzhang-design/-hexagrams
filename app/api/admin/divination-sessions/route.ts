import { NextResponse } from "next/server";
import { requireAdminAnalyticsKey } from "@/lib/analytics/admin-auth";
import { listRecentSessions } from "@/lib/storage/mock";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const denied = requireAdminAnalyticsKey(request);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const limitRaw = Number(searchParams.get("limit") ?? 50);
  const limit = Number.isFinite(limitRaw)
    ? Math.max(1, Math.min(Math.floor(limitRaw), 100))
    : 50;

  const sessions = await listRecentSessions(limit);
  return NextResponse.json({
    sessions: sessions.map((session) => {
      const preFeedbackCount =
        session.preAnalysisFeedback?.messages.filter((m) => m.role === "user")
          .length ?? 0;
      const followupCount = session.followupCount ?? 0;
      return {
        id: session.id,
        createdAt: session.createdAt,
        castTime: session.castTimeContext?.timestampIso ?? null,
        question: session.userInput.question,
        birthYear: session.userInput.birthYear,
        gender: session.userInput.gender,
        method: session.method ?? "unknown",
        originalHexagram: session.divination.originalHexagram.name ?? "未知卦",
        changedHexagram: session.divination.changedHexagram?.name ?? null,
        movingLines: session.divination.movingLines,
        boardSummary: session.board
          ? {
              benGua: session.board.benGua.name,
              bianGua: session.board.bianGua?.name ?? null,
              shiPosition: session.board.benGua.shiPosition,
              yingPosition: session.board.benGua.yingPosition,
            }
          : null,
        hasPreCheck: Boolean(session.preCheckResult || session.preCheckResultText),
        hasPostAnalysis: Boolean(
          session.postAnalysisResult || session.postAnalysisFlatText
        ),
        preCheckFit: session.preCheckFit ?? null,
        hasPreAnalysisFeedback: preFeedbackCount > 0,
        preAnalysisFeedbackCount: preFeedbackCount,
        hasFollowup: followupCount > 0,
        followupCount,
        resultUrl: `/result?sessionId=${session.id}`,
      };
    }),
  });
}
