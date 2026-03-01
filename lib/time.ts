import { ActiveSession } from "./types";

export function getElapsed(session: ActiveSession | null) {
  if (!session) return 0;
  if (!session.running || !session.startTime) {
    return session.accumulatedTime;
  }
  return (
    session.accumulatedTime +
    (Date.now() - new Date(session.startTime).getTime())
  );
}

export function formatHoursMinutes(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}
