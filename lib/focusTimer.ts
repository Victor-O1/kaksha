export type ActiveSession = {
  sessionId: string;
  subjectId: string;
  subjectName: string;
  startTime: string; // ISO
  expectedDuration: number; // ms
};

const STORAGE_KEY = "activeFocusSession";

export function saveSession(session: ActiveSession) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function loadSession(): ActiveSession | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}

export function getRemainingTime(session: ActiveSession) {
  const elapsed = Date.now() - new Date(session.startTime).getTime();
  return Math.max(0, session.expectedDuration - elapsed);
}
