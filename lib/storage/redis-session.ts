/**
 * 可选：Upstash Redis（HTTP），适合 Vercel 多实例共享占卦会话。
 * 在 Vercel / .env.local 配置 UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN 即启用。
 */
import { Redis } from "@upstash/redis";
import type { StoredDivinationSession } from "@/lib/storage/types";

const KEY_PREFIX = "liuyao:session:";
const INDEX_KEY = "liuyao:sessions:index";
/** 会话保留 7 天（可再追问窗口） */
const TTL_SECONDS = 60 * 60 * 24 * 7;

let redisClient: Redis | null | undefined;

function getRedisClient(): Redis | null {
  if (redisClient !== undefined) return redisClient;
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) {
    redisClient = null;
    return null;
  }
  redisClient = new Redis({ url, token });
  return redisClient;
}

export function isRedisSessionStoreEnabled(): boolean {
  return getRedisClient() !== null;
}

export async function redisWriteSession(
  session: StoredDivinationSession
): Promise<void> {
  const r = getRedisClient();
  if (!r) return;
  try {
    await r.set(KEY_PREFIX + session.id, JSON.stringify(session), {
      ex: TTL_SECONDS,
    });
    await r.lpush(INDEX_KEY, session.id);
    await r.ltrim(INDEX_KEY, 0, 499);
  } catch (e) {
    console.error("[storage] redisWriteSession failed:", e);
  }
}

export async function redisReadSession(
  id: string
): Promise<StoredDivinationSession | null> {
  const r = getRedisClient();
  if (!r) return null;
  try {
    const raw = await r.get(KEY_PREFIX + id);
    if (raw == null) return null;
    if (typeof raw === "string") {
      return JSON.parse(raw) as StoredDivinationSession;
    }
    return raw as StoredDivinationSession;
  } catch (e) {
    console.error("[storage] redisReadSession failed:", e);
    return null;
  }
}

export async function redisListSessionIds(limit: number): Promise<string[]> {
  const r = getRedisClient();
  if (!r) return [];
  try {
    const raw = await r.lrange<string[]>(INDEX_KEY, 0, Math.max(0, limit * 3 - 1));
    const out: string[] = [];
    const seen = new Set<string>();
    for (const id of raw) {
      if (typeof id !== "string" || seen.has(id)) continue;
      seen.add(id);
      out.push(id);
      if (out.length >= limit) break;
    }
    return out;
  } catch (e) {
    console.error("[storage] redisListSessionIds failed:", e);
    return [];
  }
}
