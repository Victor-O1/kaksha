export const timeToMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

export const isCollision = (
  sessions: any[],
  newSession: any,
  ignoreId?: string,
) => {
  const newStart = timeToMinutes(newSession.start);
  const newEnd = timeToMinutes(newSession.end);

  return sessions.some((s) => {
    if (s.id === ignoreId) return false;

    const start = timeToMinutes(s.start);
    const end = timeToMinutes(s.end);

    return newStart < end && newEnd > start;
  });
};
