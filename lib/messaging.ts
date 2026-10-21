import 'server-only';
import { and, asc, eq, inArray, ne, or } from 'drizzle-orm';
import { db } from '@/db';
import { classSubjects, parentStudents, users } from '@/db/schema';
import type { CurrentUser } from './auth';
import { isManager, visibleClassIds, visibleStudentIds } from './permissions';

/** چه کسانی را می‌شود پیام داد؟ همیشه فقط داخل مدرسه‌ی خود (مدیرکل سامانه فقط با مدیر/معاون مدارس) */
export async function allowedRecipients(u: CurrentUser) {
  const active = eq(users.status, 'active');
  const cols = { id: users.id, firstName: users.firstName, lastName: users.lastName, role: users.role, viceTitle: users.viceTitle, avatarPreset: users.avatarPreset, avatarPhotoAt: users.avatarPhotoAt };
  const order = [asc(users.role), asc(users.lastName)] as const;
  if (u.role === 'ADMIN') return db.select(cols).from(users).where(and(active, inArray(users.role, ['PRINCIPAL', 'VICE']))).orderBy(...order);
  if (!u.schoolId) return [];
  if (isManager(u.role)) return db.select(cols).from(users).where(and(active, ne(users.id, u.id), or(eq(users.schoolId, u.schoolId), eq(users.role, 'ADMIN')))).orderBy(...order);

  const ids = new Set<string>();
  const add = (rows: { id: string }[]) => rows.forEach((r) => ids.add(r.id));
  add(await db.select({ id: users.id }).from(users).where(and(active, eq(users.schoolId, u.schoolId), inArray(users.role, ['PRINCIPAL', 'VICE']))));
  if (u.role === 'TEACHER') {
    add(await db.select({ id: users.id }).from(users).where(and(active, eq(users.schoolId, u.schoolId), eq(users.role, 'TEACHER'))));
    const students = await visibleStudentIds(u);
    add(students.map((id) => ({ id })));
    if (students.length) add((await db.select({ id: parentStudents.parentId }).from(parentStudents).where(inArray(parentStudents.studentId, students))).map((r) => ({ id: r.id })));
  } else {
    const classIds = await visibleClassIds(u);
    if (classIds.length) add((await db.selectDistinct({ id: classSubjects.teacherId }).from(classSubjects).where(inArray(classSubjects.classId, classIds))).filter((r): r is { id: string } => !!r.id));
  }
  ids.delete(u.id);
  if (!ids.size) return [];
  return db.select(cols).from(users).where(and(active, eq(users.schoolId, u.schoolId), inArray(users.id, [...ids]))).orderBy(...order);
}
