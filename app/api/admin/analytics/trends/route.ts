import { NextResponse } from "next/server";
import { requireAdminAnalyticsKey } from "@/lib/analytics/admin-auth";
import { readAllAnalyticsEvents } from "@/lib/analytics/event-store";
import { computeTrends } from "@/lib/analytics/queries";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const denied = requireAdminAnalyticsKey(request);
  if (denied) return denied;
  const { searchParams } = new URL(request.url);
  const daysRaw = searchParams.get("days");
  const days = daysRaw === "30" ? 30 : 7;
  const events = await readAllAnalyticsEvents();
  return NextResponse.json(computeTrends(events, days as 7 | 30));
}
