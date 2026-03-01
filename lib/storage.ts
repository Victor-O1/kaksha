export function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : fallback;
}

export function save<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}
