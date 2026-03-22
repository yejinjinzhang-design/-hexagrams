import type { AnalyticsEventRecord } from "./types";
import {
  lastNDaysShanghai,
  parseEventDayShanghai,
  todayShanghai,
} from "./time";

function filterByDays(events: AnalyticsEventRecord[], days: Set<string>) {
  return events.filter((e) => days.has(parseEventDayShanghai(e.event_time)));
}

function filterToday(events: AnalyticsEventRecord[]) {
  const t = todayShanghai();
  return events.filter((e) => parseEventDayShanghai(e.event_time) === t);
}

function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

export type OverviewResult = {
  date: string;
  uniqueVisitors: number;
  uniqueSessions: number;
  divinationCompleted: number;
  analysisViewed: number;
  followupChatUsed: number;
  /** 今日至少完成过一次起卦的独立访客 */
  visitorsCompletedDivination: number;
};

export function computeOverview(events: AnalyticsEventRecord[]): OverviewResult {
  const today = filterToday(events);
  const visitors = unique(today.map((e) => e.visitor_id));
  const sessions = unique(today.map((e) => e.session_id));
  const divDone = today.filter((e) => e.event_name === "divination_completed");
  const analysis = today.filter((e) => e.event_name === "analysis_viewed");
  const follow = today.filter((e) => e.event_name === "followup_chat_used");
  const visitorsDivDone = unique(divDone.map((e) => e.visitor_id));

  return {
    date: todayShanghai(),
    uniqueVisitors: visitors.length,
    uniqueSessions: sessions.length,
    divinationCompleted: divDone.length,
    analysisViewed: analysis.length,
    followupChatUsed: follow.length,
    visitorsCompletedDivination: visitorsDivDone.length,
  };
}

export type TrendPoint = { date: string; value: number };

export type TrendsResult = {
  days: number;
  visitorsByDay: TrendPoint[];
  divinationCompletedByDay: TrendPoint[];
  analysisViewedByDay: TrendPoint[];
};

export function computeTrends(
  events: AnalyticsEventRecord[],
  days: 7 | 30
): TrendsResult {
  const labels = lastNDaysShanghai(days);
  const daySet = new Set(labels);
  const subset = filterByDays(events, daySet);

  const visitorsByDay = labels.map((date) => {
    const dayEvents = subset.filter(
      (e) => parseEventDayShanghai(e.event_time) === date
    );
    return {
      date,
      value: unique(dayEvents.map((e) => e.visitor_id)).length,
    };
  });

  const divinationCompletedByDay = labels.map((date) => ({
    date,
    value: subset.filter(
      (e) =>
        parseEventDayShanghai(e.event_time) === date &&
        e.event_name === "divination_completed"
    ).length,
  }));

  const analysisViewedByDay = labels.map((date) => ({
    date,
    value: subset.filter(
      (e) =>
        parseEventDayShanghai(e.event_time) === date &&
        e.event_name === "analysis_viewed"
    ).length,
  }));

  return {
    days,
    visitorsByDay,
    divinationCompletedByDay,
    analysisViewedByDay,
  };
}

export type MethodRow = { method: string; label: string; count: number };

const METHOD_LABELS: Record<string, string> = {
  coin: "铜钱摇卦",
  lunarDate: "时间卦（农历）",
  solarDate: "时间卦（阳历）",
  number: "数字起卦",
  manual: "手动录入",
};

export function computeMethodDistribution(
  events: AnalyticsEventRecord[],
  days: 7 | 30
): MethodRow[] {
  const labels = lastNDaysShanghai(days);
  const daySet = new Set(labels);
  const subset = filterByDays(events, daySet).filter(
    (e) => e.event_name === "divination_method_selected"
  );
  const counts: Record<string, number> = {};
  for (const e of subset) {
    let method = "unknown";
    try {
      const m = JSON.parse(e.metadata) as { method?: string };
      if (m.method) method = m.method;
    } catch {
      /* */
    }
    counts[method] = (counts[method] ?? 0) + 1;
  }

  const keys = ["coin", "lunarDate", "solarDate", "number", "manual", "unknown"];
  return keys.map((method) => ({
    method,
    label: METHOD_LABELS[method] ?? method,
    count: counts[method] ?? 0,
  }));
}

export type FunnelStep = {
  key: string;
  label: string;
  uniqueVisitors: number;
  /** 相对上一步留存率，第一步为 100 */
  conversionFromPreviousPct: number | null;
};

function visitorsForStep(
  events: AnalyticsEventRecord[],
  predicate: (e: AnalyticsEventRecord) => boolean
): Set<string> {
  const s = new Set<string>();
  for (const e of events) {
    if (predicate(e)) s.add(e.visitor_id);
  }
  return s;
}

export type FunnelResult = {
  period: "today" | "last7" | "last30";
  steps: FunnelStep[];
  avgDivinationsPerVisitor: number;
  avgSessionDurationSec: number;
};

export function computeFunnel(
  events: AnalyticsEventRecord[],
  period: "today" | "last7" | "last30"
): FunnelResult {
  let labels: string[];
  if (period === "today") {
    labels = [todayShanghai()];
  } else {
    labels = lastNDaysShanghai(period === "last7" ? 7 : 30);
  }
  const daySet = new Set(labels);
  const ev = filterByDays(events, daySet);

  const home = visitorsForStep(
    ev,
    (e) => e.event_name === "page_view" && e.page === "/"
  );
  const q = visitorsForStep(ev, (e) => e.event_name === "question_submitted");
  const start = visitorsForStep(ev, (e) => e.event_name === "divination_started");
  const done = visitorsForStep(ev, (e) => e.event_name === "divination_completed");
  const pre = visitorsForStep(ev, (e) => e.event_name === "pre_validation_viewed");
  const ana = visitorsForStep(ev, (e) => e.event_name === "analysis_viewed");
  const fu = visitorsForStep(ev, (e) => e.event_name === "followup_chat_used");

  const stepsRaw = [
    { key: "page_view_home", label: "访问首页", set: home },
    { key: "question_submitted", label: "提交问题", set: q },
    { key: "divination_started", label: "进入起卦页", set: start },
    { key: "divination_completed", label: "完成起卦", set: done },
    { key: "pre_validation_viewed", label: "查看前事验证", set: pre },
    { key: "analysis_viewed", label: "查看后续分析", set: ana },
    { key: "followup_chat_used", label: "使用追问聊天", set: fu },
  ];

  const steps: FunnelStep[] = stepsRaw.map((s, i) => {
    const prev = i > 0 ? stepsRaw[i - 1].set.size : null;
    const cur = s.set.size;
    let conversionFromPreviousPct: number | null = null;
    if (i === 0) conversionFromPreviousPct = 100;
    else if (prev !== null && prev > 0) {
      conversionFromPreviousPct = Math.round((cur / prev) * 1000) / 10;
    } else if (prev === 0) {
      conversionFromPreviousPct = 0;
    }
    return {
      key: s.key,
      label: s.label,
      uniqueVisitors: cur,
      conversionFromPreviousPct,
    };
  });

  const visitorsAny = unique(ev.map((e) => e.visitor_id));
  const divCount = ev.filter((e) => e.event_name === "divination_completed").length;
  const avgDivinationsPerVisitor =
    visitorsAny.length > 0
      ? Math.round((divCount / visitorsAny.length) * 100) / 100
      : 0;

  const bySession: Record<string, number[]> = {};
  for (const e of ev) {
    const t = new Date(e.event_time).getTime();
    if (!Number.isFinite(t)) continue;
    if (!bySession[e.session_id]) bySession[e.session_id] = [];
    bySession[e.session_id].push(t);
  }
  let totalDur = 0;
  let nDur = 0;
  for (const ts of Object.values(bySession)) {
    if (ts.length < 2) continue;
    const min = Math.min(...ts);
    const max = Math.max(...ts);
    const sec = (max - min) / 1000;
    if (sec > 0 && sec < 6 * 60 * 60) {
      totalDur += sec;
      nDur += 1;
    }
  }
  const avgSessionDurationSec =
    nDur > 0 ? Math.round((totalDur / nDur) * 10) / 10 : 0;

  return {
    period,
    steps,
    avgDivinationsPerVisitor,
    avgSessionDurationSec,
  };
}
