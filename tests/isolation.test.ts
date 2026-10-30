/**
 * جداسازی داده‌ی مدرسه‌ها (مهم‌ترین قاعده‌ی امنیتی سامانه).
 * روی یک دیتابیس موقت واقعی (با همه‌ی مهاجرت‌ها) دو مدرسه می‌سازد و بررسی می‌کند هیچ نقشی
 * داده‌ی مدرسه‌ی دیگر را نمی‌بیند یا تغییر نمی‌دهد.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'iso-'));
process.env.DATABASE_URL = `file:${path.join(tmp, 'iso.db')}`;

type U = import('@/lib/auth').CurrentUser;
let P: typeof import('@/lib/permissions');
const W: Record<string, U> = {}; // کاربران با نام کوتاه
const ids: Record<string, string> = {};

beforeAll(async () => {
  const { db } = await import('@/db');
  const { migrate } = await import('drizzle-orm/libsql/migrator');
  await migrate(db, { migrationsFolder: path.resolve(process.cwd(), 'drizzle') });
  const S = await import('@/db/schema');
  P = await import('@/lib/permissions');

  const mkSchool = async (name: string) => (await db.insert(S.schools).values({ name }).returning())[0];
  const A = await mkSchool('مدرسه‌ی الف'); const B = await mkSchool('مدرسه‌ی ب');
  const mkUser = async (key: string, role: U['role'], schoolId: string | null, extra: Partial<U> = {}) => {
    const [u] = await db.insert(S.users).values({ username: key, passwordHash: 'x', firstName: key, lastName: 'تست', role, schoolId, ...extra }).returning();
    W[key] = u; return u;
  };
  const mkClass = async (schoolId: string, name: string) => (await db.insert(S.classes).values({ schoolId, name, gradeLevel: 'نهم', academicYear: '1405' }).returning())[0];
  const mkSubject = async (schoolId: string, name: string) => (await db.insert(S.subjects).values({ schoolId, name }).returning())[0];
  const cA = await mkClass(A.id, 'A1'); const cB = await mkClass(B.id, 'B1');
  const sA = await mkSubject(A.id, 'ریاضی'); const sB = await mkSubject(B.id, 'ریاضی');
  Object.assign(ids, { A: A.id, B: B.id, cA: cA.id, cB: cB.id, sA: sA.id, sB: sB.id });

  await mkUser('adminSys', 'ADMIN', null);
  await mkUser('principalA', 'PRINCIPAL', A.id); await mkUser('principalB', 'PRINCIPAL', B.id);
  await mkUser('teacherA', 'TEACHER', A.id); await mkUser('teacherB', 'TEACHER', B.id);
  await mkUser('studentA', 'STUDENT', A.id, { classId: cA.id }); await mkUser('studentA2', 'STUDENT', A.id, { classId: cA.id });
  await mkUser('studentB', 'STUDENT', B.id, { classId: cB.id });
  await mkUser('parentA', 'PARENT', A.id);
  await db.insert(S.classSubjects).values([{ classId: cA.id, subjectId: sA.id, teacherId: W.teacherA.id }, { classId: cB.id, subjectId: sB.id, teacherId: W.teacherB.id }]);
  // ولیِ مدرسه‌ی الف: یک فرزند درست + یک پیوند «مخرب» به دانش‌آموز مدرسه‌ی ب
  await db.insert(S.parentStudents).values([{ parentId: W.parentA.id, studentId: W.studentA.id }, { parentId: W.parentA.id, studentId: W.studentB.id }]);
});
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

describe('جداسازی مدرسه‌ها', () => {
  it('مدیر فقط دانش‌آموزان و کلاس‌های مدرسه‌ی خودش را می‌بیند', async () => {
    expect((await P.visibleStudentIds(W.principalA)).sort()).toEqual([W.studentA.id, W.studentA2.id].sort());
    expect(await P.visibleClassIds(W.principalA)).toEqual([ids.cA]);
    expect(await P.visibleStudentIds(W.principalB)).toEqual([W.studentB.id]);
    expect(await P.visibleClassIds(W.principalB)).toEqual([ids.cB]);
  });
  it('مدیر به دانش‌آموز مدرسه‌ی دیگر دسترسی ندارد', async () => {
    expect(await P.canAccessStudent(W.principalA, W.studentB.id)).toBe(false);
    expect(await P.canAccessStudent(W.principalB, W.studentA.id)).toBe(false);
    expect(await P.canAccessStudent(W.principalA, W.studentA.id)).toBe(true);
  });
  it('مدیر نمی‌تواند کلاس یا درس مدرسه‌ی دیگر را نمره‌گذاری یا مدیریت کند', async () => {
    expect(await P.canGradeSubject(W.principalA, ids.cA, ids.sA)).toBe(true);
    expect(await P.canGradeSubject(W.principalA, ids.cB, ids.sB)).toBe(false);
    expect(await P.canGradeSubject(W.principalA, ids.cA, ids.sB)).toBe(false); // کلاس خودی + درس بیگانه
    expect(await P.canGradeSubject(W.principalA, ids.cB, ids.sA)).toBe(false);
    expect(await P.classInSchool(W.principalA, ids.cB)).toBe(false);
    expect(await P.classInSchool(W.principalA, ids.cA)).toBe(true);
  });
  it('معلم فقط کلاس‌ها و دانش‌آموزان درس خودش را می‌بیند', async () => {
    expect(await P.visibleClassIds(W.teacherA)).toEqual([ids.cA]);
    expect((await P.visibleStudentIds(W.teacherA)).sort()).toEqual([W.studentA.id, W.studentA2.id].sort());
    expect(await P.canAccessStudent(W.teacherA, W.studentB.id)).toBe(false);
    expect(await P.canGradeSubject(W.teacherA, ids.cA, ids.sA)).toBe(true);
    expect(await P.canGradeSubject(W.teacherA, ids.cB, ids.sB)).toBe(false);
    expect(await P.canGradeSubject(W.teacherB, ids.cA, ids.sA)).toBe(false);
  });
  it('دانش‌آموز فقط خودش را می‌بیند، نه هم‌کلاسی را (برای داده‌ی خصوصی) و نه مدرسه‌ی دیگر را', async () => {
    expect(await P.visibleStudentIds(W.studentA)).toEqual([W.studentA.id]);
    expect(await P.canAccessStudent(W.studentA, W.studentA2.id)).toBe(false);
    expect(await P.canAccessStudent(W.studentA, W.studentB.id)).toBe(false);
    expect(await P.canGradeSubject(W.studentA, ids.cA, ids.sA)).toBe(false);
  });
  it('پیوند ولی به دانش‌آموزِ مدرسه‌ی دیگر نادیده گرفته می‌شود', async () => {
    expect(await P.visibleStudentIds(W.parentA)).toEqual([W.studentA.id]);
    expect(await P.canAccessStudent(W.parentA, W.studentB.id)).toBe(false);
    expect(await P.visibleClassIds(W.parentA)).toEqual([ids.cA]);
  });
  it('مدیرکل سامانه داخل داده‌ی مدرسه‌ها دسترسی ندارد', async () => {
    expect(await P.visibleStudentIds(W.adminSys)).toEqual([]);
    expect(await P.visibleClassIds(W.adminSys)).toEqual([]);
    expect(await P.canGradeSubject(W.adminSys, ids.cA, ids.sA)).toBe(false);
    expect(() => P.schoolOf(W.adminSys)).toThrow();
  });
  it('schoolOf مدرسه‌ی درست را برمی‌گرداند', () => {
    expect(P.schoolOf(W.principalA)).toBe(ids.A); expect(P.schoolOf(W.studentB)).toBe(ids.B);
  });
});
