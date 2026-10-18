/** محدودسازی تلاش‌های ورود ناموفق (در حافظه؛ برای یک سرور کافی است) */
const attempts = new Map<string, { count: number; first: number; lockedUntil: number }>();
const MAX = 6; const WINDOW = 10 * 60_000; const LOCK = 10 * 60_000;

export function checkLogin(key: string): { ok: true } | { ok: false; retryMin: number } {
  const a = attempts.get(key); const now = Date.now();
  if (a && a.lockedUntil > now) return { ok: false, retryMin: Math.ceil((a.lockedUntil - now) / 60_000) };
  return { ok: true };
}
export function recordFailure(key: string) {
  const now = Date.now(); let a = attempts.get(key);
  if (!a || now - a.first > WINDOW) a = { count: 0, first: now, lockedUntil: 0 };
  a.count += 1; if (a.count >= MAX) { a.lockedUntil = now + LOCK; a.count = 0; a.first = now; }
  attempts.set(key, a);
}
export function recordSuccess(key: string) { attempts.delete(key); }
