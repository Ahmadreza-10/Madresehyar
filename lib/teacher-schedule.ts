import { parseHM } from './time';

/** برنامه‌ی هفتگی معلم از روی «برنامه‌ی کلاس‌ها» + «معلمِ هر درس در هر کلاس» (روز ۰=شنبه … ۵=پنجشنبه) */
export type TSlot = { id?: string; startTime?: string | null; endTime?: string | null; weekday: number; period: number; classId: string; className: string; subject: string; room: string | null; teacherId: string | null };
export const DAY_NAMES = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه'];
/** ایندکس روز هفته‌ی ایرانی (شنبه=۰ … جمعه=۶) برای یک تاریخ ISO */
export const iranWeekday = (iso: string) => (new Date(`${iso}T12:00:00Z`).getUTCDay() + 1) % 7;

export function teacherWeek(slots: TSlot[], teacherId: string) {
  const mine = slots.filter((s) => s.teacherId === teacherId);
  const days = DAY_NAMES.map((name, d) => { const list = mine.filter((s) => s.weekday === d).sort((a, b) => a.period - b.period); return { day: d, name, periods: list, hasClass: list.length > 0 }; });
  return { days, totalPeriods: mine.length, presentDays: days.filter((x) => x.hasClass).map((x) => x.day), freeDays: days.filter((x) => !x.hasClass).map((x) => x.day) };
}
/** ماتریس همه‌ی معلم‌ها: برای هر معلم و هر روز، شماره‌ی زنگ‌ها */
export function teacherMatrix(slots: TSlot[], teacherIds: string[]) {
  return teacherIds.map((id) => ({ id, days: DAY_NAMES.map((_, d) => slots.filter((s) => s.teacherId === id && s.weekday === d).map((s) => s.period).sort((a, b) => a - b)) }));
}
/** ساعت شروع و پایان زنگ: یا هر دو خالی، یا هر دو معتبر (HH:MM) و پایان بعد از شروع */
export function parseSlotTimes(start?: string | null, end?: string | null): { ok: true; start: string | null; end: string | null } | { ok: false; error: string } {
  const a = (start ?? '').trim(), b = (end ?? '').trim();
  if (!a && !b) return { ok: true, start: null, end: null };
  if (!a || !b) return { ok: false, error: 'ساعت شروع و پایان را هر دو وارد کنید (یا هر دو را خالی بگذارید).' };
  const x = parseHM(a), y = parseHM(b);
  if (x === null || y === null) return { ok: false, error: 'ساعت واردشده معتبر نیست.' };
  if (y <= x) return { ok: false, error: 'ساعت پایان باید بعد از ساعت شروع باشد.' };
  return { ok: true, start: a.padStart(5, '0'), end: b.padStart(5, '0') };
}
/** «۹:۲۰ تا ۱۰:۳۰»؛ اگر ساعت ثبت نشده باشد رشته‌ی خالی */
export const timeRangeText = (s: { startTime?: string | null; endTime?: string | null }, f: (n: string) => string) => (s.startTime && s.endTime ? `${f(s.startTime)} تا ${f(s.endTime)}` : '');

/** اگر معلم در همان روز با این زنگ تداخل دارد (همان شماره‌ی زنگ یا ساعت‌های هم‌پوشان)، زنگِ متداخل را برمی‌گرداند.
 *  زنگِ «همان کلاس و همان زنگ» که قرار است جایگزین شود، تداخل حساب نمی‌شود. */
export function slotConflict<T extends { weekday: number; period: number; classId: string; startTime?: string | null; endTime?: string | null }>(
  existing: T[], cand: { weekday: number; period: number; classId: string; startTime: string | null; endTime: string | null },
): T | null {
  const cs = cand.startTime ? parseHM(cand.startTime) : null, ce = cand.endTime ? parseHM(cand.endTime) : null;
  for (const e of existing) {
    if (e.weekday !== cand.weekday || (e.classId === cand.classId && e.period === cand.period)) continue;
    if (e.period === cand.period) return e;
    const es = e.startTime ? parseHM(e.startTime) : null, ee = e.endTime ? parseHM(e.endTime) : null;
    if (cs !== null && ce !== null && es !== null && ee !== null && cs < ee && es < ce) return e;
  }
  return null;
}

/** «۱ تا ۳ و ۵» برای فهرست زنگ‌ها */
export function periodsText(ps: number[], f: (n: number) => string) {
  const out: string[] = []; let i = 0;
  while (i < ps.length) { let j = i; while (j + 1 < ps.length && ps[j + 1] === ps[j] + 1) j++; out.push(j - i >= 2 ? `${f(ps[i])} تا ${f(ps[j])}` : ps.slice(i, j + 1).map(f).join(' و ')); i = j + 1; }
  return out.join(' و ');
}
