import 'server-only';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { classes, classSubjects, subjects, users } from '@/db/schema';
import type { CurrentUser } from './auth';
import { isManager, schoolOf } from './permissions';

/** کلاس‌ها (مدیر/معاون: همه‌ی کلاس‌های مدرسه‌ی خودش؛ معلم: فقط کلاس‌های خودش) */
export async function classesFor(u: CurrentUser) {
  const school = schoolOf(u);
  if (isManager(u.role)) return db.select().from(classes).where(eq(classes.schoolId, school)).orderBy(asc(classes.gradeLevel), asc(classes.name));
  const ids = (await db.selectDistinct({ id: classSubjects.classId }).from(classSubjects).where(eq(classSubjects.teacherId, u.id))).map((r) => r.id);
  return ids.length ? db.select().from(classes).where(and(eq(classes.schoolId, school), inArray(classes.id, ids))).orderBy(asc(classes.name)) : [];
}
/** درس‌های یک کلاس که کاربر اجازه‌ی کار روی آن‌ها را دارد */
export async function subjectsFor(u: CurrentUser, classId: string) {
  const school = schoolOf(u);
  const conds = [eq(classSubjects.classId, classId), eq(classes.schoolId, school)];
  if (!isManager(u.role)) conds.push(eq(classSubjects.teacherId, u.id));
  return db.select({ id: subjects.id, name: subjects.name }).from(classSubjects).innerJoin(classes, eq(classes.id, classSubjects.classId)).innerJoin(subjects, eq(subjects.id, classSubjects.subjectId)).where(and(...conds)).orderBy(asc(subjects.name));
}
export async function studentsOfClass(classId: string, schoolId: string) {
  return db.select().from(users).where(and(eq(users.role, 'STUDENT'), eq(users.classId, classId), eq(users.schoolId, schoolId))).orderBy(asc(users.lastName), asc(users.firstName));
}
export const gradeTypeLabels: Record<string, string> = { quiz: 'آزمون کوتاه', midterm: 'میان‌ترم', final: 'پایانی', classwork: 'فعالیت کلاسی', homework: 'تکلیف', oral: 'شفاهی' };
export const attendanceLabels: Record<string, string> = { absent: 'غیبت', late: 'تأخیر', excused: 'موجه' };
