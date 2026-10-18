import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';
import { periodResult, type Period } from './report-card';
import { loadSchoolData } from './school-stats';
import { isoToJalaliParts } from './jalali';

/** همه‌ی داده‌ی لازم برای رتبه‌بندی یک دانش‌آموز: همکلاسی‌ها، هم‌پایه‌ها و کل مدرسه (همیشه فقط همان مدرسه) */
export async function loadRankContext(studentId: string) {
  const [me] = await db.select().from(users).where(eq(users.id, studentId)).limit(1);
  if (!me || me.role !== 'STUDENT' || !me.schoolId) return null;
  const first = (await db.query.classes.findFirst({ where: (c, { eq: e }) => e(c.id, me.classId ?? '') })) ?? null;
  const data = await loadSchoolData(me.schoolId, first?.academicYear);
  const cls = data.classes.find((c) => c.id === me.classId) ?? null;
  // هم‌پایه = همه‌ی کلاس‌های همین مدرسه با همان «پایه» (مثلاً همه‌ی دهم‌ها)
  const gradeClasses = cls ? data.classes.filter((c) => c.gradeLevel === cls.gradeLevel) : [];
  const gradeSet = new Set(gradeClasses.map((c) => c.id));
  const gradeStudents = cls ? data.students.filter((s) => s.classId && gradeSet.has(s.classId)) : data.students.filter((s) => s.id === me.id);
  return {
    me, cls, gradeClasses, gradeStudents, data,
    classIds: data.students.filter((s) => s.classId === me.classId).map((s) => s.id),
    gradeIds: gradeStudents.map((s) => s.id), schoolIds: data.students.map((s) => s.id),
    rows: data.rows, notes: data.notes, today: data.today, startYear: data.startYear, months: data.months, year: data.year,
  };
}
export type RankContext = NonNullable<Awaited<ReturnType<typeof loadRankContext>>>;
export const resultFor = (c: RankContext, p: Pick<Period, 'from' | 'to'>) => periodResult(c.rows, p, c.classIds, c.gradeIds, c.me.id, c.schoolIds);

/** ماهِ جاریِ سال تحصیلی (برای نمایش «رتبه‌ی این ماه») */
export function currentMonthPeriod(c: RankContext): Period | undefined {
  const j = isoToJalaliParts(c.today); const key = `${j.y}-${String(j.m).padStart(2, '0')}`;
  return c.months.find((m) => m.key === key);
}
