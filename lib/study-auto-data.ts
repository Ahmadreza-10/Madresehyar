import 'server-only';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { parentStudents, studentNotes, studyAutoMarks, studyReports, studySkips, schools, settings, users } from '@/db/schema';
import { getSettings, getStudyWindow } from './settings';
import { minutesNowTehran, todayTehran } from './time';
import { AUTO_NEGATIVE_BODY, AUTO_PRAISE_BODY, datesToProcess, shouldPenalize } from './study-auto';

/** ۱ مثبت برای «ارسال گزارش مطالعه»؛ فقط اگر مدرسه این قابلیت را روشن کرده، و فقط یک بار برای هر دانش‌آموز در هر روز */
export async function awardStudyPraise(studentId: string, schoolId: string, date: string): Promise<boolean> {
  const s = await getSettings(schoolId);
  if (s.autoStudyPraise !== '1') return false;
  const [mark] = await db.insert(studyAutoMarks).values({ studentId, date, kind: 'praise' }).onConflictDoNothing().returning();
  if (!mark) return false; // امروز قبلاً داده شده
  const [note] = await db.insert(studentNotes).values({ studentId, type: 'praise', body: AUTO_PRAISE_BODY, count: 1, date, authorId: null }).returning();
  await db.update(studyAutoMarks).set({ noteId: note.id }).where(eq(studyAutoMarks.id, mark.id));
  return true;
}

/** اگر ولی تنها گزارشِ آن روز را پاک کند، «۱ مثبت»ی که بابتش داده شده بود هم برداشته می‌شود (تا با پاک‌کردن و دوباره‌فرستادن دوبار حساب نشود) */
export async function revokeStudyPraise(studentId: string, date: string): Promise<void> {
  const left = await db.select({ id: studyReports.id }).from(studyReports).where(and(eq(studyReports.studentId, studentId), eq(studyReports.date, date))).limit(1);
  if (left.length) return;
  const [mark] = await db.select().from(studyAutoMarks).where(and(eq(studyAutoMarks.studentId, studentId), eq(studyAutoMarks.date, date), eq(studyAutoMarks.kind, 'praise'))).limit(1);
  if (!mark) return;
  if (mark.noteId) await db.delete(studentNotes).where(eq(studentNotes.id, mark.noteId));
  await db.delete(studyAutoMarks).where(eq(studyAutoMarks.id, mark.id));
}

/**
 * ۱ منفی برای «عدم ارسال گزارش مطالعه» در روزهای تمام‌شده، برای مدرسه‌هایی که این قابلیت را روشن کرده‌اند.
 * بی‌خطر برای اجرای مکرر (هر روز برای هر دانش‌آموز حداکثر یک بار). برمی‌گرداند چند منفی ثبت شد.
 */
export async function runAutoStudyNegatives(now: Date = new Date()): Promise<number> {
  const rows = await db.select({ schoolId: settings.schoolId }).from(settings).where(and(eq(settings.key, 'autoStudyNegative'), eq(settings.value, '1')));
  let created = 0;
  for (const { schoolId } of rows) {
    const [school] = await db.select({ id: schools.id }).from(schools).where(eq(schools.id, schoolId)).limit(1); if (!school) continue;
    const s = await getSettings(schoolId); const since = s.autoStudyNegativeSince || null;
    const w = await getStudyWindow(schoolId);
    const dates = datesToProcess(todayTehran(now), minutesNowTehran(now), w.endMin).filter((d) => since && d >= since);
    if (!dates.length) continue;
    const kids = await db.select({ id: users.id }).from(users).where(and(eq(users.schoolId, schoolId), eq(users.role, 'STUDENT'), eq(users.status, 'active')));
    const ids = kids.map((k) => k.id); if (!ids.length) continue;
    const withParent = new Set((await db.select({ s: parentStudents.studentId }).from(parentStudents).where(inArray(parentStudents.studentId, ids))).map((r) => r.s));
    for (const date of dates) {
      const reported = new Set((await db.select({ s: studyReports.studentId }).from(studyReports).where(and(eq(studyReports.date, date), inArray(studyReports.studentId, ids)))).map((r) => r.s));
      const skipped = new Set((await db.select({ s: studySkips.studentId }).from(studySkips).where(and(eq(studySkips.date, date), inArray(studySkips.studentId, ids)))).map((r) => r.s));
      const marked = new Set((await db.select({ s: studyAutoMarks.studentId }).from(studyAutoMarks).where(and(eq(studyAutoMarks.date, date), eq(studyAutoMarks.kind, 'negative'), inArray(studyAutoMarks.studentId, ids)))).map((r) => r.s));
      for (const id of ids) {
        if (!shouldPenalize({ date, since, hasParent: withParent.has(id), hasReport: reported.has(id), hasDeclaredNoStudy: skipped.has(id), alreadyMarked: marked.has(id) })) continue;
        const [mark] = await db.insert(studyAutoMarks).values({ studentId: id, date, kind: 'negative' }).onConflictDoNothing().returning(); if (!mark) continue;
        const [note] = await db.insert(studentNotes).values({ studentId: id, type: 'discipline', body: AUTO_NEGATIVE_BODY, count: 1, date, authorId: null }).returning();
        await db.update(studyAutoMarks).set({ noteId: note.id }).where(eq(studyAutoMarks.id, mark.id)); created++;
      }
    }
  }
  return created;
}
