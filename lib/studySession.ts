export type ActiveSession = {
  sessionId: string;
  subjectId: string;
  startTime: string | null;
  accumulatedTime: number;
  running: boolean;
};

const KEY = "activeStudySession";

export function saveSession(session: ActiveSession) {
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function loadSession(): ActiveSession | null {
  const raw = localStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : null;
}

export function clearSession() {
  localStorage.removeItem(KEY);
}

export function getElapsed(session: ActiveSession) {
  if (!session.running || !session.startTime) {
    return session.accumulatedTime;
  }

  return (
    session.accumulatedTime +
    (Date.now() - new Date(session.startTime).getTime())
  );
}
