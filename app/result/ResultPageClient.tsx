"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LoadingState } from "@/components/LoadingState";
import { PreCheckPage } from "../../components/divination/PreCheckPage";
import { AnalysisPage } from "../../components/divination/AnalysisPage";
import { TraditionalHexagramLayout } from "../../components/divination/TraditionalHexagramLayout";
import type { StoredDivinationSession } from "@/lib/storage/types";

export default function ResultPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("sessionId");

  const [session, setSession] = useState<StoredDivinationSession | null>(null);
  const [loading, setLoading] = useState<boolean>(!!sessionId);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<"casted" | "precheck" | "analysis">(
    "precheck"
  );

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    const fetchSession = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/analyze?sessionId=${sessionId}`);
        if (!res.ok) {
          throw new Error(`查询失败：${res.status}`);
        }
        const data = (await res.json()) as { session: StoredDivinationSession | null };
        if (!data.session) {
          throw new Error("未找到对应的占卦记录，请重新起卦。");
        }
        setSession(data.session);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "加载结果时出现问题，请稍后重试。"
        );
      } finally {
        setLoading(false);
      }
    };

    void fetchSession();
  }, [sessionId]);

  let body: JSX.Element | null = null;

  if (!sessionId) {
    body = (
      <div className="space-y-4">
        <p className="text-sm text-gray-300">
          缺少会话标识，无法展示结果。请重新起卦。
        </p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="rounded-full border border-[#E5D8C7] bg-[#F8F3EA] px-4 py-2 text-sm text-[#3A2F26]"
        >
          返回首页重新开始
        </button>
      </div>
    );
  } else if (loading || !session) {
    body = (
      <LoadingState message="正在载入本次卦象与 AI 分析结果..." />
    );
  } else {
    const { userInput } = session;
    body = (
      <>
        {/* A. 卦象展示（本卦 / 变卦 / 动爻 / 世应） */}
        {session.board ? (
          <TraditionalHexagramLayout board={session.board} user={userInput} />
        ) : null}

        {error && <p className="text-xs text-red-500">{error}</p>}

        {/* B. 前事验证页面 */}
        {stage === "precheck" && sessionId && (
          <PreCheckPage
            key={sessionId}
            sessionId={sessionId}
            initialPreAnalysisFeedback={session.preAnalysisFeedback}
            onConfirm={() => setStage("analysis")}
            onRestart={() => router.push("/")}
          />
        )}

        {/* C. 正式分析阶段 */}
        {stage === "analysis" && sessionId && (
          <AnalysisPage sessionId={sessionId} />
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto w-full max-w-[420px] space-y-5 px-4 py-6 md:max-w-[1200px] md:px-5">
        {body}
      </div>
    </div>
  );
}
