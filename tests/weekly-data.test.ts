/** خلاصه‌ی هفته روی دیتابیس واقعی (موقت): فقط داده‌ی «این هفته‌ی» همان دانش‌آموز شمرده می‌شود */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wk-'));
process.env.DATABASE_URL = `file:${path.join(tmp, 'wk.db')}`;
const ids: Record<string, string> = {};
let load: typeof import('@/lib/weekly-data').loadWeekSummary;
const TODAY = '2026-10-27'; // سه‌شنبه؛ هفته از ۲۰۲۶-۱۰-۲۴ (شنبه) شروع شده

beforeAll(async () => {
  const { db } = await import('@/db'); const { migrate } = await import('drizzle-orm/libsql/migrator');
  await migrate(db, { migrationsFolder: path.resolve(process.cwd(), 'drizzle') });
  const S = await import('@/db/schema'); ({ loadWeekSummary: load } = await import('@/lib/weekly-data'));
  const [sc] = await db.insert(S.schools).values({ name: 'م' }).returning();
  const mk = async (u: string) => (await db.insert(S.users).values({ username: u, passwordHash: 'x', firstName: u, lastName: 't', role: 'STUDENT', schoolId: sc.id }).returning())[0];
  const a = await mk('a'); const b = await mk('b'); ids.a = a.id; ids.b = b.id;
  const [sub] = await db.insert(S.subjects).values({ schoolId: sc.id, name: 'ریاضی' }).returning();
  const rep = (studentId: string, date: string, min: number) => ({ studentId, date, startTime: '17:00', endTime: '18:00', durationMin: min, subjectId: sub.id, topic: 't' });
  await db.insert(S.studyReports).values([rep(a.id, '2026-10-24', 60), rep(a.id, '2026-10-26', 90), rep(a.id, '2026-10-27', 30), rep(a.id, '2026-10-23', 500) /* هفته‌ی قبل */, rep(b.id, '2026-10-26', 999) /* دانش‌آموز دیگر */]);
  await db.insert(S.attendance).values([{ studentId: a.id, date: '2026-10-25', status: 'absent' }, { studentId: a.id, date: '2026-10-26', status: 'late' }, { studentId: a.id, date: '2026-10-20', status: 'absent' }]);
  await db.insert(S.grades).values([{ studentId: a.id, subjectId: sub.id, title: 'x', score: 15, date: '2026-10-26' }, { studentId: a.id, subjectId: sub.id, title: 'y', score: 12, date: '2026-10-10' }]);
});
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

describe('خلاصه‌ی هفته (دیتابیس واقعی)', () => {
  it('فقط داده‌ی همین هفته و همین دانش‌آموز را می‌شمارد', async () => {
    const s = await load(ids.a, TODAY);
    expect(s.studyMin).toBe(180); expect(s.studyDays).toBe(3); expect(s.absences).toBe(1); expect(s.lates).toBe(1); expect(s.gradeCount).toBe(1);
  });
  it('دانش‌آموز دیگر جدا حساب می‌شود', async () => { const s = await load(ids.b, TODAY); expect(s.studyMin).toBe(999); expect(s.studyDays).toBe(1); });
});
