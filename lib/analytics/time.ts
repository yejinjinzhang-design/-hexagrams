const TZ = "Asia/Shanghai";

/** YYYY-MM-DD（上海时区） */
export function formatDateShanghai(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function todayShanghai(): string {
  return formatDateShanghai(new Date());
}

export function parseEventDayShanghai(iso: string): string {
  try {
    return formatDateShanghai(new Date(iso));
  } catch {
    return "";
  }
}

/** 生成最近 n 天的日期字符串（含今天），上海日历 */
export function lastNDaysShanghai(n: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    out.push(formatDateShanghai(d));
  }
  return out;
}
