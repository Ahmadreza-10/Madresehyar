/** تحلیل «عدم مطالعه»: هر روز برای هر دانش‌آموز یکی از سه وضعیت است: مطالعه کرده | عدم مطالعه (اعلام ولی) | گزارش ثبت نشده */
export type DayStatus = 'studied' | 'declared' | 'unreported';
export const dayStatus = (reports: Set<string>, skips: Set<string>, date: string): DayStatus => (reports.has(date) ? 'studied' : skips.has(date) ? 'declared' : 'unreported');

export type StudentDays = { id: string; reportDays: Set<string>; skipDays: Set<string> };
/** وضعیت همه‌ی دانش‌آموزان در «یک روز» */
export function dayBreakdown(students: StudentDays[], date: string) {
  const by: Record<DayStatus, string[]> = { studied: [], declared: [], unreported: [] };
  for (const s of students) by[dayStatus(s.reportDays, s.skipDays, date)].push(s.id);
  return by;
}
/** خلاصه‌ی چند روز: برای هر دانش‌آموز چند روز عدم مطالعه (اعلام‌شده / بدون گزارش) داشته؛ فقط کسانی که حداقل یک روز دارند، بیشترین اول */
export function rangeSummary(students: StudentDays[], dates: string[]) {
  return students.map((s) => {
    const declared = dates.filter((d) => dayStatus(s.reportDays, s.skipDays, d) === 'declared');
    const unreported = dates.filter((d) => dayStatus(s.reportDays, s.skipDays, d) === 'unreported');
    return { id: s.id, declared, unreported, total: declared.length + unreported.length };
  }).filter((x) => x.total > 0).sort((a, b) => b.total - a.total || b.declared.length - a.declared.length);
}
