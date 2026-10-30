import 'server-only';
import { and, count, eq, gte, lte } from 'drizzle-orm';
import { db } from '@/db';
import { attendance, grades, studyReports } from '@/db/schema';
import { todayTehran } from './time';
import { weekRange, weekSummary, type WeekSummary } from './weekly';

/** خلاصه‌ی «این هفته» برای یک دانش‌آموز (فقط داده‌ی خودش؛ مجوز دسترسی را فراخوان باید بسنجد) */
export async function loadWeekSummary(studentId: string, today = todayTehran()): Promise<WeekSummary> {
  const { from, to } = weekRange(today);
  const [reports, att, [gc]] = await Promise.all([
    db.select({ d: studyReports.date, m: studyReports.durationMin }).from(studyReports).where(and(eq(studyReports.studentId, studentId), gte(studyReports.date, from), lte(studyReports.date, to))),
    db.select({ s: attendance.status }).from(attendance).where(and(eq(attendance.studentId, studentId), gte(attendance.date, from), lte(attendance.date, to))),
    db.select({ n: count() }).from(grades).where(and(eq(grades.studentId, studentId), gte(grades.date, from), lte(grades.date, to))),
  ]);
  return weekSummary({ today, studyMin: reports.reduce((a, r) => a + r.m, 0), studyDays: new Set(reports.map((r) => r.d)).size, absences: att.filter((a) => a.s === 'absent').length, lates: att.filter((a) => a.s === 'late').length, gradeCount: gc?.n ?? 0 });
}
