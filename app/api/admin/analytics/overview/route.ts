import { NextResponse } from "next/server";
import { requireAdminAnalyticsKey } from "@/lib/analytics/admin-auth";
import { readAllAnalyticsEvents } from "@/lib/analytics/event-store";
import { computeOverview } from "@/lib/analytics/queries";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const denied = requireAdminAnalyticsKey(request);
  if (denied) return denied;
  const events = await readAllAnalyticsEvents();
  return NextResponse.json(computeOverview(events));
}
