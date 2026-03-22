"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Overview = {
  date: string;
  uniqueVisitors: number;
  uniqueSessions: number;
  divinationCompleted: number;
  analysisViewed: number;
  followupChatUsed: number;
  visitorsCompletedDivination: number;
};

type TrendPoint = { date: string; value: number };
type Trends = {
  days: number;
  visitorsByDay: TrendPoint[];
  divinationCompletedByDay: TrendPoint[];
  analysisViewedByDay: TrendPoint[];
};

type Funnel = {
  period: string;
  steps: Array<{
    key: string;
    label: string;
    uniqueVisitors: number;
    conversionFromPreviousPct: number | null;
  }>;
  avgDivinationsPerVisitor: number;
  avgSessionDurationSec: number;
};

type MethodsPayload = {
  days: number;
  methods: Array<{ method: string; label: string; count: number }>;
};

const STORAGE_KEY = "admin_analytics_key";

function BarList({
  points,
  color,
}: {
  points: TrendPoint[];
  color: string;
}) {
  const max = Math.max(1, ...points.map((p) => p.value));
  return (
    <div className="flex h-40 items-end gap-1">
      {points.map((p) => (
        <div
          key={p.date}
          className="flex flex-1 flex-col items-center justify-end gap-1"
          title={`${p.date}: ${p.value}`}
        >
          <div
            className="w-full min-h-[2px] rounded-t transition-all"
            style={{
              height: `${Math.max(4, (p.value / max) * 100)}%`,
              backgroundColor: color,
            }}
          />
          <span className="max-w-full truncate text-[9px] text-slate-500">
            {p.date.slice(5)}
          </span>
        </div>
      ))}
    </div>
  );
}

function FunnelBars({ steps }: { steps: Funnel["steps"] }) {
  const max = Math.max(1, ...steps.map((s) => s.uniqueVisitors));
  return (
    <div className="space-y-3">
      {steps.map((s) => (
        <div key={s.key}>
          <div className="mb-1 flex justify-between text-xs">
            <span className="font-medium text-slate-700">{s.label}</span>
            <span className="text-slate-500">
              {s.uniqueVisitors} 人
              {s.conversionFromPreviousPct != null && s.key !== "page_view_home"
                ? ` · ${s.conversionFromPreviousPct}% 较上步`
                : ""}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all"
              style={{ width: `${(s.uniqueVisitors / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdminDashboardClient() {
  const [adminKey, setAdminKey] = useState("");
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [trends7, setTrends7] = useState<Trends | null>(null);
  const [trends30, setTrends30] = useState<Trends | null>(null);
  const [funnelToday, setFunnelToday] = useState<Funnel | null>(null);
  const [funnel7, setFunnel7] = useState<Funnel | null>(null);
  const [methods, setMethods] = useState<MethodsPayload | null>(null);
  const [trendTab, setTrendTab] = useState<7 | 30>(7);
  const hydratedRef = useRef(false);

  const effectiveKey = savedKey ?? adminKey;

  const loadAll = useCallback(async (keyOverride?: string) => {
    const key = (keyOverride ?? effectiveKey).trim();
    if (!key) {
      setError("请输入 ADMIN_ANALYTICS_KEY");
      return;
    }
    setLoading(true);
    setError(null);
    const headers = { "x-admin-key": key };
    try {
      const [o, t7, t30, ft, f7, m] = await Promise.all([
        fetch("/api/admin/analytics/overview", { headers }).then((r) => {
          if (!r.ok) throw new Error(`overview ${r.status}`);
          return r.json() as Promise<Overview>;
        }),
        fetch("/api/admin/analytics/trends?days=7", { headers }).then((r) => {
          if (!r.ok) throw new Error(`trends7 ${r.status}`);
          return r.json() as Promise<Trends>;
        }),
        fetch("/api/admin/analytics/trends?days=30", { headers }).then((r) => {
          if (!r.ok) throw new Error(`trends30 ${r.status}`);
          return r.json() as Promise<Trends>;
        }),
        fetch("/api/admin/analytics/funnel?period=today", { headers }).then(
          (r) => {
            if (!r.ok) throw new Error(`funnel today ${r.status}`);
            return r.json() as Promise<Funnel>;
          }
        ),
        fetch("/api/admin/analytics/funnel?period=last7", { headers }).then(
          (r) => {
            if (!r.ok) throw new Error(`funnel7 ${r.status}`);
            return r.json() as Promise<Funnel>;
          }
        ),
        fetch("/api/admin/analytics/methods?days=7", { headers }).then((r) => {
          if (!r.ok) throw new Error(`methods ${r.status}`);
          return r.json() as Promise<MethodsPayload>;
        }),
      ]);
      setOverview(o);
      setTrends7(t7);
      setTrends30(t30);
      setFunnelToday(ft);
      setFunnel7(f7);
      setMethods(m);
      try {
        sessionStorage.setItem(STORAGE_KEY, key);
        setSavedKey(key);
      } catch {
        /* */
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [effectiveKey]);

  useEffect(() => {
    if (hydratedRef.current) return;
    try {
      const k = sessionStorage.getItem(STORAGE_KEY);
      if (k?.trim()) {
        hydratedRef.current = true;
        setSavedKey(k);
        void loadAll(k);
      }
    } catch {
      /* */
    }
  }, [loadAll]);

  const activeTrends = trendTab === 7 ? trends7 : trends30;

  const methodMax = useMemo(() => {
    if (!methods?.methods.length) return 1;
    return Math.max(1, ...methods.methods.map((m) => m.count));
  }, [methods]);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            产品数据面板
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            匿名访客（visitor_id）与会话（session_id）口径 · 数据存于本地{" "}
            <code className="rounded bg-slate-200 px-1 text-xs">data/analytics-events.jsonl</code>
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          {!savedKey && (
            <input
              type="password"
              placeholder="ADMIN_ANALYTICS_KEY"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              className="w-56 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          )}
          <button
            type="button"
            onClick={() => void loadAll()}
            disabled={loading}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "加载中…" : "刷新数据"}
          </button>
          {savedKey && (
            <button
              type="button"
              onClick={() => {
                sessionStorage.removeItem(STORAGE_KEY);
                setSavedKey(null);
                setAdminKey("");
              }}
              className="text-sm text-slate-500 underline"
            >
              清除密钥
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {overview && (
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            今日概览 · {overview.date}（上海时区）
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: "今日独立访客", value: overview.uniqueVisitors },
              { label: "今日会话数", value: overview.uniqueSessions },
              { label: "今日起卦完成次数", value: overview.divinationCompleted },
              {
                label: "今日完成起卦的访客数",
                value: overview.visitorsCompletedDivination,
              },
              { label: "今日后续分析查看次数", value: overview.analysisViewed },
              { label: "今日追问发送次数", value: overview.followupChatUsed },
            ].map((c) => (
              <div
                key={c.label}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="text-xs font-medium text-slate-500">{c.label}</div>
                <div className="mt-2 text-3xl font-semibold tabular-nums text-slate-900">
                  {c.value}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeTrends && (
        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              趋势
            </h2>
            <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setTrendTab(7)}
                className={`rounded-md px-3 py-1 ${trendTab === 7 ? "bg-slate-900 text-white" : "text-slate-600"}`}
              >
                近 7 天
              </button>
              <button
                type="button"
                onClick={() => setTrendTab(30)}
                className={`rounded-md px-3 py-1 ${trendTab === 30 ? "bg-slate-900 text-white" : "text-slate-600"}`}
              >
                近 30 天
              </button>
            </div>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-2 text-sm font-medium text-slate-700">独立访客</div>
              <BarList points={activeTrends.visitorsByDay} color="#6366f1" />
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-2 text-sm font-medium text-slate-700">起卦完成</div>
              <BarList
                points={activeTrends.divinationCompletedByDay}
                color="#0ea5e9"
              />
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-2 text-sm font-medium text-slate-700">分析查看</div>
              <BarList
                points={activeTrends.analysisViewedByDay}
                color="#10b981"
              />
            </div>
          </div>
        </section>
      )}

      {methods && (
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            起卦方式分布（近 {methods.days} 天 · divination_method_selected）
          </h2>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="space-y-3">
              {methods.methods.map((m) => (
                <div key={m.method}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span>{m.label}</span>
                    <span className="text-slate-500">{m.count}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-amber-500"
                      style={{ width: `${(m.count / methodMax) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="grid gap-8 lg:grid-cols-2">
        {funnelToday && (
          <div>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
              转化漏斗 · 今日（独立访客口径）
            </h2>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <FunnelBars steps={funnelToday.steps} />
              <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
                <p>
                  平均每位访客起卦完成次数（周期内）：{" "}
                  <strong className="text-slate-800">
                    {funnelToday.avgDivinationsPerVisitor}
                  </strong>
                </p>
                <p className="mt-1">
                  平均会话时长（有 2+ 事件且 &lt;6h）：{" "}
                  <strong className="text-slate-800">
                    {funnelToday.avgSessionDurationSec}s
                  </strong>
                </p>
              </div>
            </div>
          </div>
        )}
        {funnel7 && (
          <div>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
              转化漏斗 · 近 7 天
            </h2>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <FunnelBars steps={funnel7.steps} />
              <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
                <p>
                  平均每位访客起卦完成次数：{" "}
                  <strong className="text-slate-800">
                    {funnel7.avgDivinationsPerVisitor}
                  </strong>
                </p>
                <p className="mt-1">
                  平均会话时长：{" "}
                  <strong className="text-slate-800">
                    {funnel7.avgSessionDurationSec}s
                  </strong>
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      <footer className="border-t border-slate-200 pt-6 text-xs text-slate-400">
        <p>
          卡在哪一步：对比漏斗各步「独立访客」与相对上一步留存率即可看出流失位置。
        </p>
        <p className="mt-1">
          部署在无持久磁盘的 Serverless 环境时，请改为数据库或对象存储承载事件日志。
        </p>
      </footer>
    </div>
  );
}
