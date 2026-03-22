/**
 * 起卦时刻统一按「东八区墙钟」解释与展示，避免服务端（如 Vercel / UTC）与浏览器本地时区不一致。
 * 公历瞬时点仍用 UTC 毫秒 / ISO-8601 存储；农历、四柱、时辰、时间卦均由 Asia/Shanghai 墙钟分量推算。
 */

export const CAST_TIMEZONE_IANA = "Asia/Shanghai" as const;

export type ZonedWallClockParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

export type CastTimeContext = {
  /** 起卦瞬时点（UTC） */
  timestampMs: number;
  timestampIso: string;
  /** 产品约定：命理用墙钟时区 */
  timezone: typeof CAST_TIMEZONE_IANA;
  /** 浏览器本地与 UTC 的偏移（分），仅作审计；计算不依赖此字段 */
  timezoneOffsetMinutes: number;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** 将某一瞬时点映射到指定 IANA 时区的「墙钟」年月日时分秒 */
export function getZonedWallClockParts(
  instant: Date | number,
  timeZone: string = CAST_TIMEZONE_IANA
): ZonedWallClockParts {
  const d = typeof instant === "number" ? new Date(instant) : instant;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(d);
  const map: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== "literal") map[p.type] = p.value;
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second ?? "0"),
  };
}

function wallClockTuple(p: ZonedWallClockParts): number {
  return (
    p.year * 1e10 +
    p.month * 1e8 +
    p.day * 1e6 +
    p.hour * 1e4 +
    p.minute * 100 +
    p.second
  );
}

function compareWallClock(
  a: ZonedWallClockParts,
  b: ZonedWallClockParts
): number {
  const ta = wallClockTuple(a);
  const tb = wallClockTuple(b);
  return ta < tb ? -1 : ta > tb ? 1 : 0;
}

/**
 * 将「某时区墙钟上的年月日时分秒」转为 UTC 瞬时点（不依赖进程 TZ）。
 * Asia/Shanghai 无夏令时，单调性好；其它时区若遇不存在的本地时刻会抛错。
 */
export function instantFromZonedWallClock(
  parts: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second?: number;
  },
  timeZone: string = CAST_TIMEZONE_IANA
): Date {
  const target: ZonedWallClockParts = {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second ?? 0,
  };

  let lo =
    Date.UTC(parts.year, parts.month - 1, parts.day) - 48 * 3600 * 1000;
  let hi =
    Date.UTC(parts.year, parts.month - 1, parts.day) + 48 * 3600 * 1000;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const got = getZonedWallClockParts(mid, timeZone);
    const c = compareWallClock(got, target);
    if (c === 0) {
      return new Date(mid);
    }
    if (c < 0) {
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  // 极少数环境下二分未命中同一毫秒，在邻域线性扫一秒范围
  const guess =
    Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) -
    8 * 3600 * 1000;
  for (let delta = -2000; delta <= 2000; delta++) {
    const t = guess + delta;
    if (compareWallClock(getZonedWallClockParts(t, timeZone), target) === 0) {
      return new Date(t);
    }
  }

  throw new Error(
    `无法在时区 ${timeZone} 找到与墙钟 ${JSON.stringify(target)} 对应的瞬时点`
  );
}

/**
 * `datetime-local` 值为无时区的「年月日时分」，按产品约定解释为北京时间。
 */
export function parseDatetimeLocalAsShanghaiInstant(dateTimeLocal: string): Date {
  const m = dateTimeLocal.trim().match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/
  );
  if (!m) {
    throw new Error("datetime-local 格式无效");
  }
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const hour = Number(m[4]);
  const minute = Number(m[5]);
  const second = m[6] != null ? Number(m[6]) : 0;
  if (
    [year, month, day, hour, minute, second].some(
      (n) => !Number.isFinite(n) || Number.isNaN(n)
    )
  ) {
    throw new Error("datetime-local 含非法数字");
  }
  return instantFromZonedWallClock(
    { year, month, day, hour, minute, second },
    CAST_TIMEZONE_IANA
  );
}

/** 当前时刻在 Asia/Shanghai 下的 `datetime-local` 字符串 */
export function shanghaiNowDatetimeLocalValue(): string {
  const p = getZonedWallClockParts(Date.now(), CAST_TIMEZONE_IANA);
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}T${pad2(p.hour)}:${pad2(p.minute)}`;
}

/** 用于界面展示：不要用 toISOString() 当本地时间 */
export function formatInstantInTimeZoneZh(
  instant: Date | string | number,
  timeZone: string = CAST_TIMEZONE_IANA
): string {
  const d =
    typeof instant === "string"
      ? new Date(instant)
      : typeof instant === "number"
        ? new Date(instant)
        : instant;
  if (!Number.isFinite(d.getTime())) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

export function buildCastTimeContextFromMs(
  timestampMs: number
): CastTimeContext {
  const d = new Date(timestampMs);
  if (!Number.isFinite(d.getTime())) {
    throw new Error("无效的起卦时间戳");
  }
  return {
    timestampMs,
    timestampIso: d.toISOString(),
    timezone: CAST_TIMEZONE_IANA,
    timezoneOffsetMinutes: -d.getTimezoneOffset(),
  };
}
