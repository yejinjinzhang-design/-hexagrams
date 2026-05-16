import { mkdir, readFile, readdir, writeFile } from "fs/promises";
import path from "path";
import type { StoredDivinationSession } from "@/lib/storage/types";
import {
  isRedisSessionStoreEnabled,
  redisListSessionIds,
  redisReadSession,
  redisWriteSession,
} from "@/lib/storage/redis-session";

declare global {
  // eslint-disable-next-line no-var
  var __vibeLabSessions: Map<string, StoredDivinationSession> | undefined;
}

const sessions =
  globalThis.__vibeLabSessions ?? (globalThis.__vibeLabSessions = new Map());

/** 未配置 Redis 时：Vercel 用 /tmp，本地用 data/sessions */
function getSessionsDir(): string {
  if (process.env.VERCEL) {
    return path.join("/tmp", "vibe-lab-sessions");
  }
  return path.join(process.cwd(), "data", "sessions");
}

async function writeSessionToDisk(session: StoredDivinationSession): Promise<void> {
  if (isRedisSessionStoreEnabled()) return;
  try {
    const dir = getSessionsDir();
    await mkdir(dir, { recursive: true });
    const file = path.join(dir, `${session.id}.json`);
    await writeFile(file, JSON.stringify(session), "utf8");
  } catch (e) {
    console.error("[storage] writeSessionToDisk failed:", e);
  }
}

async function readSessionFromDisk(
  id: string
): Promise<StoredDivinationSession | null> {
  if (isRedisSessionStoreEnabled()) return null;
  try {
    const file = path.join(getSessionsDir(), `${id}.json`);
    const raw = await readFile(file, "utf8");
    return JSON.parse(raw) as StoredDivinationSession;
  } catch {
    return null;
  }
}

function randomId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function saveSession(
  data: Omit<StoredDivinationSession, "id" | "createdAt">
): Promise<StoredDivinationSession> {
  const id = randomId();
  const createdAt = new Date().toISOString();
  const session: StoredDivinationSession = {
    ...data,
    id,
    createdAt,
  };
  sessions.set(id, session);
  await redisWriteSession(session);
  await writeSessionToDisk(session);
  return session;
}

export async function updateSession(
  id: string,
  patch: Partial<StoredDivinationSession>
): Promise<StoredDivinationSession | null> {
  const current = await getSessionById(id);
  if (!current) return null;
  const next: StoredDivinationSession = {
    ...current,
    ...patch,
  };
  sessions.set(id, next);
  await redisWriteSession(next);
  await writeSessionToDisk(next);
  return next;
}

export async function getSessionById(
  id: string
): Promise<StoredDivinationSession | null> {
  const cached = sessions.get(id);
  if (cached) return cached;

  if (isRedisSessionStoreEnabled()) {
    const fromRedis = await redisReadSession(id);
    if (fromRedis) {
      sessions.set(id, fromRedis);
      return fromRedis;
    }
    return null;
  }

  const fromDisk = await readSessionFromDisk(id);
  if (fromDisk) {
    sessions.set(id, fromDisk);
    return fromDisk;
  }
  return null;
}

export async function listRecentSessions(
  limit: number = 50
): Promise<StoredDivinationSession[]> {
  const safeLimit = Math.max(1, Math.min(limit, 200));

  if (isRedisSessionStoreEnabled()) {
    const ids = await redisListSessionIds(safeLimit);
    const rows = await Promise.all(ids.map((id) => getSessionById(id)));
    return rows
      .filter((s): s is StoredDivinationSession => Boolean(s))
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, safeLimit);
  }

  const fromMemory = [...sessions.values()];
  const byId = new Map<string, StoredDivinationSession>(
    fromMemory.map((session) => [session.id, session])
  );

  try {
    const dir = getSessionsDir();
    const files = await readdir(dir);
    await Promise.all(
      files
        .filter((file) => file.endsWith(".json"))
        .map(async (file) => {
          try {
            const raw = await readFile(path.join(dir, file), "utf8");
            const session = JSON.parse(raw) as StoredDivinationSession;
            byId.set(session.id, session);
          } catch {
            /* skip bad session file */
          }
        })
    );
  } catch {
    /* no local session dir yet */
  }

  return [...byId.values()]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, safeLimit);
}
