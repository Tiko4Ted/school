import type { Role } from "@prisma/client";

type SessionUser = {
  id: string;
  email?: string | null;
  role: Role;
};

type TestSession = {
  user?: SessionUser | null;
} | null;

const sessionState: { current: TestSession } = { current: null };

export function setTestSession(session: TestSession) {
  sessionState.current = session;
}

export function getTestSession() {
  return sessionState.current;
}
