import { NextResponse } from "next/server";
import { requireAdminAnalyticsKey } from "@/lib/analytics/admin-auth";
import { readAllAnalyticsEvents } from "@/lib/analytics/event-store";
import { computeFunnel } from "@/lib/analytics/queries";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const denied = requireAdminAnalyticsKey(request);
  if (denied) return denied;
  const { searchParams } = new URL(request.url);
  const p = searchParams.get("period");
  const period =
    p === "last30" ? "last30" : p === "last7" ? "last7" : "today";
  const events = await readAllAnalyticsEvents();
  return NextResponse.json(computeFunnel(events, period));
}
