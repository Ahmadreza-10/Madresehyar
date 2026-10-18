import 'server-only';
import { getSettings } from './settings';

export const MAX_PERIODS = 12;
export const MIN_PERIODS = 1;
/** تعداد زنگ‌های هر روز که مدیر/معاون تعیین کرده است (پیش‌فرض ۴) */
export async function getPeriodCount(schoolId: string): Promise<number> {
  const n = Number((await getSettings(schoolId)).periodsPerDay);
  return Number.isInteger(n) && n >= MIN_PERIODS && n <= MAX_PERIODS ? n : 4;
}
