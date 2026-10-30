/** مثبت/منفی خودکارِ گزارش مطالعه (اختیاری): منطق خالص + روی دیتابیس واقعی موقت */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { datesToProcess, shouldPenalize } from '@/lib/study-auto';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'auto-'));
process.env.DATABASE_URL = `file:${path.join(tmp, 'auto.db')}`;
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

describe('روزهای قابل قضاوت', () => {
  it('پایان ۲۴:۰۰: فقط دیروز', () => { expect(datesToProcess('2026-10-27', 23 * 60 + 59, 1440)).toEqual(['2026-10-26']); });
  it('پایان ۲۲:۰۰: قبل از آن فقط دیروز، بعد از آن دیروز و امروز', () => {
    expect(datesToProcess('2026-10-27', 21 * 60, 22 * 60)).toEqual(['2026-10-26']);
    expect(datesToProcess('2026-10-27', 22 * 60, 22 * 60)).toEqual(['2026-10-26', '2026-10-27']);
  });
});
describe('شرط ثبت منفی', () => {
  const ok = { date: '2026-10-26', since: '2026-10-25', hasParent: true, hasReport: false, hasDeclaredNoStudy: false, alreadyMarked: false };
  it('همه‌ی شرایط برقرار: منفی', () => { expect(shouldPenalize(ok)).toBe(true); });
  it('قبل از روز فعال‌سازی: خیر', () => { expect(shouldPenalize({ ...ok, date: '2026-10-24' })).toBe(false); });
  it('قابلیت روشن نشده (since خالی): خیر', () => { expect(shouldPenalize({ ...ok, since: null })).toBe(false); });
  it('ولی ندارد: خیر', () => { expect(shouldPenalize({ ...ok, hasParent: false })).toBe(false); });
  it('گزارش داده: خیر', () => { expect(shouldPenalize({ ...ok, hasReport: true })).toBe(false); });
  it('«عدم مطالعه» اعلام شده: خیر', () => { expect(shouldPenalize({ ...ok, hasDeclaredNoStudy: true })).toBe(false); });
  it('قبلاً ثبت شده: خیر', () => { expect(shouldPenalize({ ...ok, alreadyMarked: true })).toBe(false); });
});

describe('روی دیتابیس واقعی', () => {
  const ids: Record<string, string> = {};
  let A: typeof import('@/lib/study-auto-data'); let S: typeof import('@/db/schema'); let dbm: typeof import('@/db')['db']; let eq: typeof import('drizzle-orm')['eq'];
  const notesOf = async (id: string) => (await dbm.select().from(S.studentNotes).where(eq(S.studentNotes.studentId, id)));
  beforeAll(async () => {
    ({ db: dbm } = await import('@/db')); ({ eq } = await import('drizzle-orm'));
    const { migrate } = await import('drizzle-orm/libsql/migrator'); await migrate(dbm, { migrationsFolder: path.resolve(process.cwd(), 'drizzle') });
    S = await import('@/db/schema'); A = await import('@/lib/study-auto-data');
    const mkSchool = async (n: string) => (await dbm.insert(S.schools).values({ name: n }).returning())[0];
    const sc = await mkSchool('روشن'); const off = await mkSchool('خاموش'); ids.sc = sc.id; ids.off = off.id;
    const mk = async (u: string, schoolId: string, extra: Record<string, unknown> = {}) => (await dbm.insert(S.users).values({ username: u, passwordHash: 'x', firstName: u, lastName: 't', role: 'STUDENT', schoolId, ...extra }).returning())[0];
    const [s1, s2, s3, s4, s5, o1] = [await mk('s1', sc.id), await mk('s2', sc.id), await mk('s3', sc.id), await mk('s4', sc.id), await mk('s5', sc.id, { status: 'disabled' }), await mk('o1', off.id)];
    Object.assign(ids, { s1: s1.id, s2: s2.id, s3: s3.id, s4: s4.id, s5: s5.id, o1: o1.id });
    const parent = (await dbm.insert(S.users).values({ username: 'p', passwordHash: 'x', firstName: 'p', lastName: 't', role: 'PARENT', schoolId: sc.id }).returning())[0];
    const parentO = (await dbm.insert(S.users).values({ username: 'po', passwordHash: 'x', firstName: 'p', lastName: 't', role: 'PARENT', schoolId: off.id }).returning())[0];
    await dbm.insert(S.parentStudents).values([s1, s2, s3, s5].map((s) => ({ parentId: parent.id, studentId: s.id })).concat([{ parentId: parentO.id, studentId: o1.id }]));
    const [sub] = await dbm.insert(S.subjects).values({ schoolId: sc.id, name: 'ریاضی' }).returning();
    await dbm.insert(S.studyReports).values({ studentId: s2.id, date: '2026-10-26', startTime: '17:00', endTime: '18:00', durationMin: 60, subjectId: sub.id, topic: 't' });
    await dbm.insert(S.studySkips).values({ studentId: s3.id, date: '2026-10-26' });
    const set = (schoolId: string, key: string, value: string) => dbm.insert(S.settings).values({ schoolId, key, value });
    await set(sc.id, 'autoStudyNegative', '1'); await set(sc.id, 'autoStudyNegativeSince', '2026-10-25'); await set(sc.id, 'autoStudyPraise', '1');
  });

  const NOW = new Date('2026-10-27T06:30:00Z'); // ۲۷ اکتبر، ساعت ۱۰ صبح به وقت تهران
  it('فقط دانش‌آموزِ بدون گزارش و بدون اعلام ولی و دارای ولی، منفی می‌گیرد', async () => {
    expect(await A.runAutoStudyNegatives(NOW)).toBe(1);
    const n1 = await notesOf(ids.s1); expect(n1).toHaveLength(1); expect(n1[0].type).toBe('discipline'); expect(n1[0].count).toBe(1); expect(n1[0].date).toBe('2026-10-26'); expect(n1[0].body).toContain('ثبت خودکار');
    for (const k of ['s2', 's3', 's4', 's5', 'o1']) expect(await notesOf(ids[k])).toHaveLength(0); // گزارش‌دهنده، اعلام‌کننده، بدون ولی، غیرفعال، مدرسه‌ی خاموش
  });
  it('اجرای دوباره چیزی تکراری نمی‌سازد', async () => { expect(await A.runAutoStudyNegatives(NOW)).toBe(0); expect(await notesOf(ids.s1)).toHaveLength(1); });
  it('روزهای قبل از فعال‌سازی منفی نمی‌گیرند', async () => {
    await dbm.update(S.settings).set({ value: '2026-10-27' }).where(eq(S.settings.key, 'autoStudyNegativeSince'));
    const later = new Date('2026-10-28T06:30:00Z'); // دیروز = ۲۷ ؛ حالا since=۲۷ پس مجاز است
    expect(await A.runAutoStudyNegatives(later)).toBeGreaterThan(0);
    await dbm.update(S.settings).set({ value: '2026-10-29' }).where(eq(S.settings.key, 'autoStudyNegativeSince'));
    expect(await A.runAutoStudyNegatives(new Date('2026-10-29T06:30:00Z'))).toBe(0); // دیروز=۲۸ < since
  });
  it('مثبتِ ارسال گزارش: یک بار در روز، و فقط اگر روشن باشد', async () => {
    expect(await A.awardStudyPraise(ids.s2, ids.sc, '2026-10-27')).toBe(true);
    expect(await A.awardStudyPraise(ids.s2, ids.sc, '2026-10-27')).toBe(false);
    expect((await notesOf(ids.s2)).filter((n) => n.type === 'praise')).toHaveLength(1);
    expect(await A.awardStudyPraise(ids.o1, ids.off, '2026-10-27')).toBe(false); // مدرسه‌ی خاموش
    expect(await notesOf(ids.o1)).toHaveLength(0);
  });
  it('پاک‌کردن تنها گزارش آن روز، مثبت را برمی‌دارد و دوباره‌فرستادن دوباره می‌دهد', async () => {
    await A.revokeStudyPraise(ids.s2, '2026-10-27'); // گزارشی برای ۲۷ نیست
    expect((await notesOf(ids.s2)).filter((n) => n.type === 'praise')).toHaveLength(0);
    expect(await A.awardStudyPraise(ids.s2, ids.sc, '2026-10-27')).toBe(true);
  });
  it('اگر گزارش دیگری برای همان روز مانده باشد مثبت برداشته نمی‌شود', async () => {
    const [sub] = await dbm.select().from(S.subjects).limit(1);
    await dbm.insert(S.studyReports).values({ studentId: ids.s2, date: '2026-10-27', startTime: '17:00', endTime: '18:00', durationMin: 30, subjectId: sub.id, topic: 't' });
    await A.revokeStudyPraise(ids.s2, '2026-10-27');
    expect((await notesOf(ids.s2)).filter((n) => n.type === 'praise')).toHaveLength(1);
  });
});
