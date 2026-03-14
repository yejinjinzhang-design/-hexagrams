import type { StoredDivinationSession } from "@/lib/storage/types";

const sessions = new Map<string, StoredDivinationSession>();

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
    createdAt
  };
  sessions.set(id, session);
  return session;
}

export async function updateSession(
  id: string,
  patch: Partial<StoredDivinationSession>
): Promise<StoredDivinationSession | null> {
  const current = sessions.get(id);
  if (!current) return null;
  const next: StoredDivinationSession = {
    ...current,
    ...patch
  };
  sessions.set(id, next);
  return next;
}

export async function getSessionById(
  id: string
): Promise<StoredDivinationSession | null> {
  return sessions.get(id) ?? null;
}

