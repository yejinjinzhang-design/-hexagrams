"use client";

import type { AnalyticsEventName } from "./types";

const VISITOR_KEY = "analytics_visitor_id";
const SESSION_KEY = "analytics_session_id";

function safeRandomId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `v_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
  }
}

export function getAnalyticsVisitorId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = safeRandomId();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return safeRandomId();
  }
}

/** 单次浏览器标签会话，关闭标签后重建 */
export function getAnalyticsSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = safeRandomId();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return safeRandomId();
  }
}

export function getCurrentPagePath(): string {
  if (typeof window === "undefined") return "";
  return window.location.pathname || "/";
}

type TrackOpts = {
  metadata?: Record<string, unknown>;
};

export function trackEvent(eventName: AnalyticsEventName, opts?: TrackOpts) {
  if (typeof window === "undefined") return;

  const visitor_id = getAnalyticsVisitorId();
  const session_id = getAnalyticsSessionId();
  const page = getCurrentPagePath();
  const event_time = new Date().toISOString();
  const body = JSON.stringify({
    visitor_id,
    session_id,
    event_name: eventName,
    page,
    event_time,
    metadata: opts?.metadata ?? {},
  });

  const url = "/api/analytics/track";

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      const ok = navigator.sendBeacon(url, blob);
      if (ok) return;
    }
  } catch {
    /* fall through */
  }

  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    /* silent */
  });
}
