import { parseHM } from './time';

/** مراحل تکلیف: هر خط یک مرحله (حداکثر ۱۲ مرحله، هر کدام تا ۱۰۰ نویسه) */
export function parseSteps(raw: string): string[] {
  return raw.split(/\r?\n/).map((l) => l.replace(/^\s*(?:[-•*·]|[0-9۰-۹]+[.)\-])\s*/, '').trim().slice(0, 100)).filter(Boolean).slice(0, 12);
}
export function readJsonArray<T>(raw: string | null | undefined, ok: (x: unknown) => x is T): T[] {
  try { const v = JSON.parse(raw ?? '[]'); return Array.isArray(v) ? v.filter(ok) : []; } catch { return []; }
}
export const readSteps = (raw: string | null | undefined) => readJsonArray<string>(raw, (x): x is string => typeof x === 'string');
export const readStepsDone = (raw: string | null | undefined) => readJsonArray<number>(raw, (x): x is number => Number.isInteger(x));

const dayNum = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000); };
export const daysBetween = (fromIso: string, toIso: string) => dayNum(toIso) - dayNum(fromIso);

export type DueInfo = { over: boolean; days: number; word: 'over' | 'today' | 'tomorrow' | 'dayAfter' | 'later'; urgent: boolean };
/** وضعیت مهلت نسبت به «الان» (تاریخ ISO و دقیقه‌ی روز به وقت تهران). فوری = کمتر از ۴۸ ساعت مانده یا همین امروز و فردا/پس‌فردا */
export function dueInfo(dueDate: string, dueTime: string | null | undefined, todayIso: string, nowMin: number): DueInfo {
  const days = daysBetween(todayIso, dueDate); const tm = dueTime ? parseHM(dueTime) : null;
  if (days < 0 || (days === 0 && tm !== null && nowMin >= tm)) return { over: true, days, word: 'over', urgent: false };
  const word = days === 0 ? 'today' : days === 1 ? 'tomorrow' : days === 2 ? 'dayAfter' : 'later';
  return { over: false, days, word, urgent: days <= 2 };
}
/** «۵ روز پیش» / «امروز» / «دیروز» برای تاریخ ثبت تکلیف */
export function agoText(createdIso: string, todayIso: string, f: (n: number) => string): string {
  const n = daysBetween(createdIso, todayIso);
  return n <= 0 ? 'امروز' : n === 1 ? 'دیروز' : `${f(n)} روز پیش`;
}
