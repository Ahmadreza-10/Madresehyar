'use server';
import { and, eq, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { studyReportItems, studyReports, studySkips, studyTests, subjects } from '@/db/schema';
import { AuthError, requireActionUser } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { canAccessStudent, schoolOf } from '@/lib/permissions';
import { getStudyWindow } from '@/lib/settings';
import { isWithinWindow, studyReportSchema, testPercent, totalMinutes } from '@/lib/study';
import { formatHM, minutesNowTehran, todayTehran } from '@/lib/time';
import { fail, firstZodError, run, success, type ActionState } from '@/lib/action';

/** payload به‌صورت JSON در فیلد hidden می‌آید تا فرم پویا (چند دسته تست) ساده بماند */
export async function submitStudyReport(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    // ولیِ همان دانش‌آموز یا خودِ دانش‌آموز؛ مدیر، معاون و معلم نمی‌توانند ثبت کنند
    const user = await requireActionUser(['PARENT', 'STUDENT']);
    let raw: unknown;
    try { raw = JSON.parse(String(fd.get('payload') ?? '{}')); } catch { return fail('اطلاعات فرم خوانده نشد.'); }
    const parsed = studyReportSchema.safeParse(raw);
    if (!parsed.success) return fail(firstZodError(parsed.error));
    const input = parsed.data;

    const studentId = user.role === 'STUDENT' ? user.id : input.studentId; const date = todayTehran();
    if (!studentId) return fail('فرزند را انتخاب کنید.');
    if (!(await canAccessStudent(user, studentId))) return fail(user.role === 'STUDENT' ? 'گزارش را فقط برای خودت می‌توانی ثبت کنی.' : 'این دانش‌آموز فرزندِ شما نیست.');
    // ویرایش: فقط ولیِ ثبت‌کننده، فقط همان روز (و داخل بازه‌ی مجاز، که پایین‌تر بررسی می‌شود)
    const editId = String(fd.get('editId') ?? '') || null;
    let editTimes: { startTime: string; endTime: string } | null = null;
    if (editId) {
      const [ex] = await db.select().from(studyReports).where(eq(studyReports.id, editId)).limit(1);
      if (!ex || ex.createdBy !== user.id || ex.date !== date || ex.studentId !== studentId) return fail('این گزارش قابل ویرایش نیست (فقط گزارش‌های امروزِ خودتان).');
      editTimes = { startTime: ex.startTime, endTime: ex.endTime };
    }

    // فقط امروز و فقط داخل بازه‌ی مجاز مدرسه (بررسی سمت سرور؛ با تغییر ساعت گوشی دور زده نمی‌شود)
    const w = await getStudyWindow(schoolOf(user));
    if (!isWithinWindow(w)) return fail(`ثبت گزارش فقط از ساعت ${w.startLabel} تا ${w.endLabel === '24:00' ? '۲۴:۰۰ (نیمه‌شب)' : w.endLabel} مجاز است.`);

    const duration = totalMinutes(input.items);
    if (duration <= 0) return fail('زمان مطالعه یا تست را وارد کنید.');
    // ساعت شروع و پایان دیگر از کاربر پرسیده نمی‌شود: پایان = همین الان، شروع = پایان منهای مجموع زمان‌ها (ویرایش: ساعت‌های قبلی می‌ماند)
    const nowM = minutesNowTehran();
    const times = editTimes ?? { startTime: formatHM(Math.max(0, nowM - duration)), endTime: formatHM(nowM) };

    const ids = input.items.map((i) => i.subjectId);
    const okSubjects = await db.select({ id: subjects.id }).from(subjects).where(and(inArray(subjects.id, ids), eq(subjects.schoolId, schoolOf(user))));
    if (okSubjects.length !== ids.length) return fail('یکی از درس‌های انتخاب‌شده معتبر نیست.');

    // سقف منطقی برای مجموع مطالعه‌ی یک روز (همه‌ی گزارش‌های آن روز)
    const sameDay = await db.select().from(studyReports).where(and(eq(studyReports.studentId, studentId), eq(studyReports.date, date)));
    if (sameDay.filter((r) => r.id !== editId).reduce((a, r) => a + r.durationMin, 0) + duration > 16 * 60) return fail('مجموع مطالعه‌ی یک روز نمی‌تواند بیشتر از ۱۶ ساعت باشد.');

    // ستون‌های قدیمیِ گزارش از اولین درس پر می‌شوند (سازگاری)؛ جزئیات واقعی در study_report_items است
    const first = input.items[0];
    const values = {
      studentId, date, startTime: times.startTime, endTime: times.endTime, durationMin: duration, subjectId: first.subjectId,
      topic: input.items.map((i) => i.topic).filter(Boolean).join(' • ').slice(0, 200), methods: JSON.stringify(first.methods), pages: input.items.reduce((a, i) => a + i.pages, 0),
      mastery: Math.min(5, Math.max(1, Math.round(input.items.reduce((a, i) => a + i.mastery, 0) / input.items.length))),
      goal: first.goal || null, goalAchieved: first.goalAchieved ?? null, notes: input.notes || null,
    };
    if (editId) { await db.delete(studyReportItems).where(eq(studyReportItems.reportId, editId)); await db.delete(studyTests).where(eq(studyTests.reportId, editId)); }
    const [report] = editId ? await db.update(studyReports).set(values).where(eq(studyReports.id, editId)).returning() : await db.insert(studyReports).values({ ...values, createdBy: user.id }).returning();
    await db.insert(studyReportItems).values(input.items.map((i, pos) => ({
      reportId: report.id, subjectId: i.subjectId, studyMin: i.studyMin, testMin: i.testMin, topic: i.topic, methods: JSON.stringify(i.methods),
      pages: i.pages, mastery: i.mastery, goal: i.goal || null, goalAchieved: i.goalAchieved ?? null, position: pos,
    })));
    const testRows = input.items.flatMap((i) => i.tests.map((t) => ({
      reportId: report.id, subjectId: i.subjectId, source: t.source || 'تست', totalCount: t.totalCount, correctCount: t.correctCount, wrongCount: t.wrongCount,
      blankCount: t.blankCount, durationMin: t.durationMin ?? null, note: t.note || null, percent: testPercent(t.correctCount, t.wrongCount, t.totalCount),
    })));
    if (testRows.length) await db.insert(studyTests).values(testRows);
    await db.delete(studySkips).where(and(eq(studySkips.studentId, studentId), eq(studySkips.date, date))); // اگر قبلاً «عدم مطالعه» زده بود، حالا که گزارش داد لغو می‌شود
    await audit(user.id, editId ? 'STUDY_REPORT_UPDATE' : 'STUDY_REPORT_CREATE', 'study_report', report.id, `برای ${studentId}`);
    revalidatePath('/study'); revalidatePath('/dashboard');
    return success(editId ? 'گزارش ویرایش شد.' : 'گزارش مطالعه ثبت شد.');
  } catch (e) {
    if (e instanceof AuthError) return fail(e.message);
    console.error(e); return fail('خطای غیرمنتظره؛ دوباره تلاش کنید.');
  }
}

/** فقط ولیِ ثبت‌کننده، فقط همان روز و داخل بازه‌ی مجاز می‌تواند گزارش اشتباه را پاک کند */
export async function deleteStudyReport(fd: FormData) {
  const user = await requireActionUser(['PARENT', 'STUDENT']);
  const id = String(fd.get('id'));
  const [r] = await db.select().from(studyReports).where(eq(studyReports.id, id)).limit(1);
  if (!r) return;
  const w = await getStudyWindow(schoolOf(user));
  if (r.createdBy !== user.id || r.date !== todayTehran() || !isWithinWindow(w) || !(await canAccessStudent(user, r.studentId))) return;
  await db.delete(studyReports).where(eq(studyReports.id, id));
  await audit(user.id, 'STUDY_REPORT_DELETE', 'study_report', id);
  revalidatePath('/study');
}

export async function saveFeedback(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await requireActionUser(['PRINCIPAL', 'VICE']);
    const id = String(fd.get('id')); const text = String(fd.get('feedback') ?? '').trim().slice(0, 500);
    const [r] = await db.select().from(studyReports).where(eq(studyReports.id, id)).limit(1);
    if (!r || !(await canAccessStudent(user, r.studentId))) return fail('دسترسی ندارید.');
    await db.update(studyReports).set({ teacherFeedback: text || null, feedbackBy: user.id }).where(eq(studyReports.id, id));
    await audit(user.id, 'STUDY_FEEDBACK', 'study_report', id);
    revalidatePath('/study');
    return success('بازخورد ذخیره شد.');
  } catch (e) { return fail(e instanceof AuthError ? e.message : 'خطا در ذخیره.'); }
}


/** ولی: «امروز مطالعه نداشت» (فقط امروز، فقط داخل بازه‌ی مجاز، و فقط اگر برای امروز گزارشی ثبت نشده) */
export async function declareNoStudy(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(['PARENT', 'STUDENT'], async (user) => {
    const studentId = user.role === 'STUDENT' ? user.id : String(fd.get('studentId') ?? '');
    if (!(await canAccessStudent(user, studentId))) return fail('این دانش‌آموز فرزندِ شما نیست.');
    const w = await getStudyWindow(schoolOf(user)); const date = todayTehran();
    if (!isWithinWindow(w)) return fail(`ثبت فقط از ساعت ${w.startLabel} تا ${w.endLabel === '24:00' ? '۲۴:۰۰ (نیمه‌شب)' : w.endLabel} مجاز است.`);
    if ((await db.select({ id: studyReports.id }).from(studyReports).where(and(eq(studyReports.studentId, studentId), eq(studyReports.date, date))).limit(1)).length) return fail('برای امروز گزارش مطالعه ثبت شده است؛ «عدم مطالعه» معنا ندارد.');
    await db.insert(studySkips).values({ studentId, date, createdBy: user.id }).onConflictDoNothing();
    await audit(user.id, 'STUDY_NO_STUDY', 'student', studentId, date);
    revalidatePath('/study'); revalidatePath('/dashboard');
    return success('«عدم مطالعه» برای امروز ثبت شد.');
  });
}
export async function undoNoStudy(fd: FormData) {
  const user = await requireActionUser(['PARENT', 'STUDENT']); const studentId = user.role === 'STUDENT' ? user.id : String(fd.get('studentId') ?? '');
  const w = await getStudyWindow(schoolOf(user));
  if (!(await canAccessStudent(user, studentId)) || !isWithinWindow(w)) return;
  await db.delete(studySkips).where(and(eq(studySkips.studentId, studentId), eq(studySkips.date, todayTehran())));
  revalidatePath('/study'); revalidatePath('/dashboard');
}
