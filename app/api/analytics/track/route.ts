import { NextResponse } from "next/server";
import { appendAnalyticsEvent } from "@/lib/analytics/event-store";
import {
  ANALYTICS_EVENT_NAMES,
  type AnalyticsEventName,
} from "@/lib/analytics/types";

export const runtime = "nodejs";

function isEventName(s: string): s is AnalyticsEventName {
  return (ANALYTICS_EVENT_NAMES as readonly string[]).includes(s);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      visitor_id?: string;
      session_id?: string;
      event_name?: string;
      page?: string;
      event_time?: string;
      metadata?: Record<string, unknown>;
    };

    const visitor_id = typeof body.visitor_id === "string" ? body.visitor_id.trim() : "";
    const session_id = typeof body.session_id === "string" ? body.session_id.trim() : "";
    const event_name = body.event_name;
    const page =
      typeof body.page === "string" && body.page.startsWith("/")
        ? body.page.slice(0, 256)
        : "/";
    const event_time =
      typeof body.event_time === "string" ? body.event_time : new Date().toISOString();

    if (!visitor_id || !session_id || !event_name || !isEventName(event_name)) {
      return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
    }

    await appendAnalyticsEvent({
      visitor_id,
      session_id,
      event_name,
      page,
      event_time,
      metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : {},
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
