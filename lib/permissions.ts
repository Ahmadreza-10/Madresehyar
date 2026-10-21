import 'server-only';
import { cookies } from 'next/headers';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { classes, classSubjects, parentStudents, subjects, users, type Role } from '@/db/schema';
import type { CurrentUser } from './auth';

export const roleLabels: Record<Role, string> = { ADMIN: 'مدیرکل سامانه', PRINCIPAL: 'مدیر مدرسه', VICE: 'معاون', TEACHER: 'معلم', STUDENT: 'دانش‌آموز', PARENT: 'ولی' };
/** عنوان نمایشی نقش؛ برای معاون، عنوانی که مدیر تعیین کرده (مثلاً «معاون پرورشی») */
export const roleTitle = (u: { role: Role; viceTitle?: string | null }) => (u.role === 'VICE' && u.viceTitle ? u.viceTitle : roleLabels[u.role]);
export const SCHOOL_MANAGER_ROLES: Role[] = ['PRINCIPAL', 'VICE'];
export const SCHOOL_STAFF_ROLES: Role[] = ['PRINCIPAL', 'VICE', 'TEACHER'];
export const ALL_SCHOOL_ROLES: Role[] = ['PRINCIPAL', 'VICE', 'TEACHER', 'STUDENT', 'PARENT'];
/** مدیر یا معاون یک مدرسه (مدیرکل سامانه عمداً داخل داده‌های مدرسه‌ها دسترسی ندارد) */
export const isManager = (r: Role) => r === 'PRINCIPAL' || r === 'VICE';
export const isStaff = (r: Role) => r === 'PRINCIPAL' || r === 'VICE' || r === 'TEACHER';
export const isSuper = (r: Role) => r === 'ADMIN';

/** مدرسه‌ی کاربر؛ برای کاربرانِ بدون مدرسه (مدیرکل) خطا می‌دهد تا هیچ پرسمانی بدون فیلتر مدرسه اجرا نشود */
export function schoolOf(u: CurrentUser): string {
  if (!u.schoolId) throw new Error('این کاربر به هیچ مدرسه‌ای متصل نیست.');
  return u.schoolId;
}

/** کلاس‌هایی که معلم در آن‌ها تدریس می‌کند */
export async function teacherClassIds(teacherId: string): Promise<string[]> {
  const rows = await db.selectDistinct({ classId: classSubjects.classId }).from(classSubjects).where(eq(classSubjects.teacherId, teacherId));
  return rows.map((r) => r.classId);
}

/** کلاس‌هایی که کاربر مجاز است ببیند. همیشه آرایه است (هرگز «همه»): نبودِ مدرسه یعنی هیچ‌چیز. */
export async function visibleClassIds(u: CurrentUser): Promise<string[]> {
  if (!u.schoolId) return [];
  if (isManager(u.role)) return (await db.select({ id: classes.id }).from(classes).where(eq(classes.schoolId, u.schoolId))).map((r) => r.id);
  if (u.role === 'TEACHER') {
    const ids = await teacherClassIds(u.id); if (!ids.length) return [];
    return (await db.select({ id: classes.id }).from(classes).where(and(eq(classes.schoolId, u.schoolId), inArray(classes.id, ids)))).map((r) => r.id);
  }
  if (u.role === 'STUDENT') return u.classId ? [u.classId] : [];
  if (u.role === 'PARENT') {
    const kids = await visibleStudentIds(u); if (!kids.length) return [];
    return [...new Set((await db.select({ c: users.classId }).from(users).where(inArray(users.id, kids))).map((r) => r.c).filter((c): c is string => !!c))];
  }
  return [];
}

/** دانش‌آموزانی که کاربر مجاز به دیدن‌شان است (همیشه فقط از مدرسه‌ی خودش) */
/** معلم فقط نمره و رتبه‌ی «درس‌هایی که خودش تدریس می‌کند» را می‌بیند؛ برای بقیه‌ی نقش‌ها null (بدون محدودیت).
 *  اگر classId داده شود، فقط درس‌های همان کلاس. خروجیِ [] یعنی معلم هیچ درسی در آن کلاس ندارد. */
export async function teacherSubjectIds(u: CurrentUser, classId?: string | null): Promise<string[] | null> {
  if (u.role !== 'TEACHER') return null;
  const rows = await db.select({ s: classSubjects.subjectId, c: classSubjects.classId }).from(classSubjects).where(eq(classSubjects.teacherId, u.id));
  return [...new Set(rows.filter((r) => !classId || r.c === classId).map((r) => r.s))];
}
export async function subjectNames(ids: string[]): Promise<string[]> {
  if (!ids.length) return [];
  return (await db.select({ n: subjects.name }).from(subjects).where(inArray(subjects.id, ids))).map((r) => r.n);
}

export async function visibleStudentIds(u: CurrentUser): Promise<string[]> {
  if (!u.schoolId) return [];
  if (isManager(u.role)) return (await db.select({ id: users.id }).from(users).where(and(eq(users.role, 'STUDENT'), eq(users.schoolId, u.schoolId)))).map((r) => r.id);
  if (u.role === 'STUDENT') return [u.id];
  if (u.role === 'PARENT') return (await db.select({ id: parentStudents.studentId }).from(parentStudents).innerJoin(users, eq(users.id, parentStudents.studentId)).where(and(eq(parentStudents.parentId, u.id), eq(users.schoolId, u.schoolId)))).map((r) => r.id);
  if (u.role === 'TEACHER') {
    const cids = await visibleClassIds(u); if (!cids.length) return [];
    return (await db.select({ id: users.id }).from(users).where(and(eq(users.role, 'STUDENT'), eq(users.schoolId, u.schoolId), inArray(users.classId, cids)))).map((r) => r.id);
  }
  return [];
}

export async function canAccessStudent(u: CurrentUser, studentId: string): Promise<boolean> {
  return (await visibleStudentIds(u)).includes(studentId);
}

/** معلم فقط برای درس‌های خودش؛ مدیر/معاون برای همه‌ی کلاس‌ها و درس‌های مدرسه‌ی خودش */
export async function canGradeSubject(u: CurrentUser, classId: string, subjectId: string): Promise<boolean> {
  if (!u.schoolId) return false;
  if (isManager(u.role)) {
    const [c] = await db.select({ id: classes.id }).from(classes).where(and(eq(classes.id, classId), eq(classes.schoolId, u.schoolId))).limit(1);
    const [s] = await db.select({ id: subjects.id }).from(subjects).where(and(eq(subjects.id, subjectId), eq(subjects.schoolId, u.schoolId))).limit(1);
    return !!c && !!s;
  }
  if (u.role !== 'TEACHER') return false;
  const r = await db.select({ id: classSubjects.id }).from(classSubjects).innerJoin(classes, eq(classes.id, classSubjects.classId)).where(and(eq(classSubjects.classId, classId), eq(classSubjects.subjectId, subjectId), eq(classSubjects.teacherId, u.id), eq(classes.schoolId, u.schoolId))).limit(1);
  return r.length > 0;
}

/** آیا مدیر/معاون اجازه‌ی مدیریت این کلاس را دارد؟ */
export async function classInSchool(u: CurrentUser, classId: string): Promise<boolean> {
  if (!u.schoolId) return false;
  const [c] = await db.select({ id: classes.id }).from(classes).where(and(eq(classes.id, classId), eq(classes.schoolId, u.schoolId))).limit(1);
  return !!c;
}

/** فرزندانِ ولی (همه‌ی فرزندان؛ برای مجوزها) به‌ترتیب نام */
async function childrenOf(u: CurrentUser): Promise<string[]> {
  if (u.role !== 'PARENT' || !u.schoolId) return [];
  const rows = await db.select({ id: users.id }).from(parentStudents).innerJoin(users, eq(users.id, parentStudents.studentId)).where(and(eq(parentStudents.parentId, u.id), eq(users.schoolId, u.schoolId))).orderBy(users.firstName, users.lastName);
  return rows.map((r) => r.id);
}
export const CHILD_COOKIE = 'active_child';
/** فرزندِ انتخاب‌شده‌ی ولی (از کوکی)؛ اگر معتبر نبود اولین فرزند */
export async function activeChildId(u: CurrentUser): Promise<string | null> {
  const kids = await childrenOf(u); if (!kids.length) return null;
  const want = (await cookies()).get(CHILD_COOKIE)?.value;
  return want && kids.includes(want) ? want : kids[0];
}
/** برای صفحه‌های نمایشی: ولی فقط فرزندِ انتخاب‌شده را می‌بیند؛ بقیه‌ی نقش‌ها مثل visibleStudentIds. (مجوزها همیشه با visibleStudentIds/canAccessStudent سنجیده می‌شود.) */
export async function focusStudentIds(u: CurrentUser): Promise<string[]> {
  if (u.role !== 'PARENT') return visibleStudentIds(u);
  const id = await activeChildId(u); return id ? [id] : [];
}
export async function focusClassIds(u: CurrentUser): Promise<string[]> {
  if (u.role !== 'PARENT') return visibleClassIds(u);
  const ids = await focusStudentIds(u); if (!ids.length) return [];
  return [...new Set((await db.select({ c: users.classId }).from(users).where(inArray(users.id, ids))).map((r) => r.c).filter((c): c is string => !!c))];
}
