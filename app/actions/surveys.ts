'use server';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { classes, classSubjects, teacherReviews, users } from '@/db/schema';
import { audit } from '@/lib/audit';
import { fail, firstZodError, run, success, type ActionState } from '@/lib/action';
import { schoolOf } from '@/lib/permissions';
import { getSettings, setSetting } from '@/lib/settings';
import { reviewSchema } from '@/lib/survey';

/** دانش‌آموز: ثبت یا ویرایش نظر درباره‌ی یکی از معلم‌های کلاسش (ناشناس) */
export async function submitTeacherReview(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(['STUDENT'], async (u) => {
    const p = reviewSchema.safeParse(Object.fromEntries(fd)); if (!p.success) return fail(firstZodError(p.error));
    const school = schoolOf(u);
    if ((await getSettings(school)).teacherSurveyOpen === '0') return fail('نظرسنجی فعلاً بسته است.');
    if (!u.classId) return fail('شما به هیچ کلاسی وصل نیستید.');
    const [cs] = await db.select({ year: classes.academicYear }).from(classSubjects).innerJoin(classes, eq(classes.id, classSubjects.classId))
      .where(and(eq(classSubjects.classId, u.classId), eq(classSubjects.teacherId, p.data.teacherId), eq(classSubjects.subjectId, p.data.subjectId))).limit(1);
    if (!cs) return fail('این معلم در کلاس شما این درس را تدریس نمی‌کند.');
    const vals = { overall: p.data.overall, teaching: p.data.teaching, mastery: p.data.mastery, behavior: p.data.behavior, comment: p.data.comment || null };
    const [ex] = await db.select({ id: teacherReviews.id }).from(teacherReviews).where(and(eq(teacherReviews.studentId, u.id), eq(teacherReviews.teacherId, p.data.teacherId), eq(teacherReviews.subjectId, p.data.subjectId), eq(teacherReviews.academicYear, cs.year))).limit(1);
    if (ex) await db.update(teacherReviews).set({ ...vals, updatedAt: new Date() }).where(eq(teacherReviews.id, ex.id));
    else await db.insert(teacherReviews).values({ ...vals, schoolId: school, teacherId: p.data.teacherId, studentId: u.id, subjectId: p.data.subjectId, academicYear: cs.year });
    // عمداً audit ثبت نمی‌شود تا ناشناس‌بودن نظر در گزارش فعالیت‌ها هم حفظ شود
    revalidatePath('/surveys');
    return success(ex ? 'نظر شما به‌روز شد. ممنون 🙏' : 'نظر شما ثبت شد. ممنون 🙏');
  });
}

/** مدیر/معاون: باز و بسته کردن نظرسنجی */
export async function setSurveyOpen(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(['PRINCIPAL', 'VICE'], async (u) => {
    const open = String(fd.get('open') ?? '1') === '1';
    await setSetting(schoolOf(u), 'teacherSurveyOpen', open ? '1' : '0');
    await audit(u.id, 'SURVEY_TOGGLE', 'school', schoolOf(u), open ? 'open' : 'closed');
    revalidatePath('/surveys');
    return success(open ? 'نظرسنجی باز شد.' : 'نظرسنجی بسته شد.');
  });
}

/** مدیر/معاون: پنهان یا آشکار کردن یک نظرِ نامناسب (نمره‌ی آن همچنان حساب می‌شود، فقط متن پنهان می‌شود) */
export async function toggleReviewHidden(fd: FormData) {
  await run(['PRINCIPAL', 'VICE'], async (u) => {
    const id = String(fd.get('id') ?? '');
    const [r] = await db.select().from(teacherReviews).where(and(eq(teacherReviews.id, id), eq(teacherReviews.schoolId, schoolOf(u)))).limit(1);
    if (!r) return fail('این نظر پیدا نشد.');
    await db.update(teacherReviews).set({ hidden: !r.hidden }).where(eq(teacherReviews.id, id));
    await audit(u.id, r.hidden ? 'REVIEW_UNHIDE' : 'REVIEW_HIDE', 'user', r.teacherId);
    revalidatePath('/surveys');
    return success();
  });
}
