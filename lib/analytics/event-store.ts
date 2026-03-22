import { randomUUID } from "crypto";
import { mkdir, appendFile, readFile } from "fs/promises";
import path from "path";
import type { AnalyticsEventInput, AnalyticsEventRecord } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const EVENTS_FILE = path.join(DATA_DIR, "analytics-events.jsonl");

export async function appendAnalyticsEvent(
  input: AnalyticsEventInput
): Promise<AnalyticsEventRecord> {
  await mkdir(DATA_DIR, { recursive: true });
  const id = randomUUID();
  const metadata =
    typeof input.metadata === "object" && input.metadata !== null
      ? JSON.stringify(input.metadata)
      : "{}";
  const row: AnalyticsEventRecord = {
    id,
    visitor_id: input.visitor_id,
    session_id: input.session_id,
    event_name: input.event_name,
    page: input.page,
    event_time: input.event_time,
    metadata,
  };
  await appendFile(EVENTS_FILE, `${JSON.stringify(row)}\n`, "utf8");
  return row;
}

export async function readAllAnalyticsEvents(): Promise<AnalyticsEventRecord[]> {
  try {
    const raw = await readFile(EVENTS_FILE, "utf8");
    const lines = raw.split("\n").filter((l) => l.trim());
    const out: AnalyticsEventRecord[] = [];
    for (const line of lines) {
      try {
        out.push(JSON.parse(line) as AnalyticsEventRecord);
      } catch {
        /* skip bad line */
      }
    }
    return out;
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === "ENOENT") return [];
    throw e;
  }
}
