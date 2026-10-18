/** همه‌ی منطق زمان بر پایه‌ی وقت تهران است (ایران ساعت تابستانی ندارد، اما از Intl استفاده می‌کنیم تا مستقل از ساعت سرور باشد). */
export const TZ = 'Asia/Tehran';

export type TehranParts = { y: number; m: number; d: number; h: number; min: number; weekday: number };

export function tehranParts(date: Date = new Date()): TehranParts {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', weekday: 'short',
  });
  const p = Object.fromEntries(f.formatToParts(date).map((x) => [x.type, x.value]));
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday);
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour % 24, min: +p.minute, weekday: wd };
}

const pad = (n: number) => String(n).padStart(2, '0');
export const isoDate = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
export function todayTehran(now: Date = new Date()): string { const p = tehranParts(now); return isoDate(p.y, p.m, p.d); }
export function minutesNowTehran(now: Date = new Date()): number { const p = tehranParts(now); return p.h * 60 + p.min; }

/** «HH:MM» → دقیقه. «24:00» مجاز است و برابر ۱۴۴۰ است. */
export function parseHM(v: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(v.trim());
  if (!m) return null;
  const h = +m[1], mi = +m[2];
  if (mi > 59) return null;
  if (h === 24 && mi === 0) return 1440;
  if (h > 23) return null;
  return h * 60 + mi;
}
export function formatHM(min: number): string { return min >= 1440 ? '24:00' : `${pad(Math.floor(min / 60))}:${pad(min % 60)}`; }

export function addDays(iso: string, delta: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  return isoDate(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}
/** شروع هفته ایرانی (شنبه) */
export function weekStart(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Sun
  const sinceSat = (wd + 1) % 7;
  return addDays(iso, -sinceSat);
}
