import { addDays, weekStart } from './time';

/** چند روز از هفته (شنبه=۰) گذشته است */
export function dayOfWeekIndex(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number); const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); return (wd + 1) % 7;
}

export type WeekSummaryInput = { today: string; studyMin: number; studyDays: number; absences: number; lates: number; gradeCount: number };
export type WeekSummary = WeekSummaryInput & { from: string; headline: string };

/** خلاصه‌ی «این هفته» (از شنبه تا امروز) برای دانش‌آموز و ولی */
export function weekSummary(i: WeekSummaryInput): WeekSummary {
  const idx = dayOfWeekIndex(i.today);
  let headline: string;
  if (i.studyMin <= 0) headline = 'این هفته هنوز مطالعه‌ای ثبت نشده است.';
  else if (i.studyDays >= idx + 1) headline = 'هر روزِ این هفته مطالعه ثبت شده است. آفرین!';
  else headline = `در ${i.studyDays} روز از ${idx + 1} روزِ گذشته‌ی این هفته مطالعه ثبت شده است.`;
  return { ...i, from: weekStart(i.today), headline };
}
export const weekRange = (today: string) => ({ from: weekStart(today), to: addDays(weekStart(today), 6) });
