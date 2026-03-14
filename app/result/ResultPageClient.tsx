"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { HexagramView } from "@/components/HexagramView";
import { AnalysisCard } from "@/components/AnalysisCard";
import { LoadingState } from "@/components/LoadingState";
import { ProfessionalHexagramTable } from "@/components/ProfessionalHexagramTable";
import { TraditionalHexagramTable } from "@/components/TraditionalHexagramTable";
import type { StoredDivinationSession } from "@/lib/storage/types";

export default function ResultPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("sessionId");

  const [session, setSession] = useState<StoredDivinationSession | null>(null);
  const [loading, setLoading] = useState<boolean>(!!sessionId);
  const [error, setError] = useState<string | null>(null);

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

  // 如果卦象已加载但 AI 分析尚未完成，则轮询后台会话，等待分析结果更新
  useEffect(() => {
    if (!sessionId) return;
    if (!session || session.aiResult) return;

    let cancelled = false;
    const interval = setInterval(async () => {
      if (cancelled) return;
      try {
        const res = await fetch(`/api/analyze?sessionId=${sessionId}`);
        if (!res.ok) return;
        const data = (await res.json()) as {
          session: StoredDivinationSession | null;
        };
        if (data.session && data.session.aiResult) {
          setSession(data.session);
          clearInterval(interval);
        }
      } catch {
        // 静默失败，下一次轮询再试
      }
    }, 2500);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [sessionId, session]);

  if (!sessionId) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-300">
          缺少会话标识，无法展示结果。请重新起卦。
        </p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="rounded-full border border-ink-accent px-4 py-2 text-sm text-ink-accent"
        >
          返回首页重新开始
        </button>
      </div>
    );
  }

  if (loading || !session) {
    return (
      <LoadingState message="正在载入本次卦象与 AI 分析结果..." />
    );
  }

  const { userInput, divination, aiResult, provider, model, createdAt } =
    session;

  const aiPending = !aiResult;

  return (
    <div className="space-y-6">
      {session.board ? (
        <TraditionalHexagramTable user={userInput} board={session.board} />
      ) : (
        <ProfessionalHexagramTable user={userInput} result={divination} />
      )}

      <HexagramView result={divination} />

      {error && <p className="text-xs text-red-500">{error}</p>}

      {aiPending ? (
        <LoadingState message="卦象已生成，AI 正在细致推演与撰写分析..." />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <AnalysisCard
              title="总体判断"
              section={aiResult.overall}
              emphasis
            />
            <AnalysisCard
              title="问题重点分析"
              section={aiResult.keyPoints}
            />
            <AnalysisCard title="事业" section={aiResult.career} />
            <AnalysisCard
              title="感情与人际"
              section={aiResult.relationship}
            />
            <AnalysisCard title="财运与资源" section={aiResult.wealth} />
            <AnalysisCard title="时间趋势" section={aiResult.timing} />
          </div>

          <AnalysisCard title="建议" section={aiResult.advice} emphasis />
        </>
      )}

      <div className="flex flex-wrap gap-3 pt-2 text-xs text-[#5c4a38]">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="rounded-full border border-[#c5883a] px-4 py-2 text-[#8d6c3e]"
        >
          再起一卦
        </button>
        <span className="text-[11px] text-[#9b8464]">
          结果仅为参考，请仍以现实理性判断为主。
        </span>
      </div>
    </div>
  );
}
