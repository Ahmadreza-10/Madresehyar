'use server';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/db';
import { attendance, excuseRequests, messages, users } from '@/db/schema';
import { audit } from '@/lib/audit';
import { fail, firstZodError, run, success, type ActionState } from '@/lib/action';
import { formatJalali } from '@/lib/format';
import { canAccessStudent, isManager } from '@/lib/permissions';

/** خانواده (ولی یا دانش‌آموز) برای یک غیبت/تأخیر توضیح می‌نویسد؛ درخواست برای «ثبت‌کننده‌ی غیبت» می‌رود */
export async function requestExcuse(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(['PARENT', 'STUDENT'], async (user) => {
    const p = z.object({ attendanceId: z.string().min(1), reason: z.string().trim().min(5, 'دلیل غیبت را کمی کامل‌تر بنویسید.').max(1000) }).safeParse(Object.fromEntries(fd));
    if (!p.success) return fail(firstZodError(p.error));
    const [a] = await db.select().from(attendance).where(eq(attendance.id, p.data.attendanceId)).limit(1);
    if (!a || !(await canAccessStudent(user, a.studentId))) return fail('این مورد غیبت در محدوده‌ی دسترسی شما نیست.');
    if (a.status === 'excused') return fail('این غیبت قبلاً موجه شده است.');
    if ((await db.select({ id: excuseRequests.id }).from(excuseRequests).where(eq(excuseRequests.attendanceId, a.id)).limit(1)).length) return fail('برای این غیبت قبلاً درخواست ثبت شده است.');
    const [stu] = await db.select().from(users).where(eq(users.id, a.studentId)).limit(1);
    // گیرنده: همان کسی که غیبت را ثبت کرده؛ اگر دیگر وجود ندارد، مدیر مدرسه
    let recipientId = a.recordedBy;
    if (!recipientId) recipientId = (await db.select({ id: users.id }).from(users).where(and(eq(users.schoolId, stu.schoolId!), eq(users.role, 'PRINCIPAL'))).limit(1))[0]?.id ?? null;
    await db.insert(excuseRequests).values({ attendanceId: a.id, requesterId: user.id, reason: p.data.reason });
    if (recipientId) await db.insert(messages).values({ senderId: user.id, recipientId, subject: `درخواست موجه شدن غیبت — ${stu.firstName} ${stu.lastName}`, body: `غیبت/تأخیر روز ${formatJalali(a.date, true)}\n\nتوضیح خانواده:\n${p.data.reason}\n\nبرای پذیرفتن یا رد کردن، به بخش «حضور و غیاب» بروید.` });
    await audit(user.id, 'EXCUSE_REQUEST', 'attendance', a.id);
    revalidatePath('/attendance'); revalidatePath('/messages');
    return success('درخواست شما برای ثبت‌کننده‌ی غیبت ارسال شد.');
  });
}

/** فقط همان کسی که غیبت را ثبت کرده می‌تواند درخواست را بپذیرد (موجه شود) یا رد کند */
export async function reviewExcuse(fd: FormData) {
  await run(['PRINCIPAL', 'VICE', 'TEACHER'], async (user) => {
    const [row] = await db.select({ r: excuseRequests, a: attendance }).from(excuseRequests).innerJoin(attendance, eq(attendance.id, excuseRequests.attendanceId)).where(eq(excuseRequests.id, String(fd.get('id')))).limit(1);
    if (!row || row.r.status !== 'pending') return success();
    const [stu] = await db.select().from(users).where(eq(users.id, row.a.studentId)).limit(1);
    const mine = row.a.recordedBy === user.id || (!row.a.recordedBy && isManager(user.role));
    if (!stu || stu.schoolId !== user.schoolId || !mine) return fail('فقط ثبت‌کننده‌ی این غیبت می‌تواند تصمیم بگیرد.');
    const approve = fd.get('decision') === 'approve'; const note = String(fd.get('note') ?? '').trim().slice(0, 500) || null;
    await db.update(excuseRequests).set({ status: approve ? 'approved' : 'rejected', reviewerId: user.id, reviewNote: note, reviewedAt: new Date() }).where(eq(excuseRequests.id, row.r.id));
    if (approve) await db.update(attendance).set({ status: 'excused' }).where(eq(attendance.id, row.a.id));
    await db.insert(messages).values({ senderId: user.id, recipientId: row.r.requesterId, subject: approve ? 'غیبت شما موجه شد' : 'درخواست موجه شدن غیبت پذیرفته نشد', body: `غیبت/تأخیر روز ${formatJalali(row.a.date, true)} — ${stu.firstName} ${stu.lastName}${note ? `\n\nتوضیح: ${note}` : ''}` });
    await audit(user.id, approve ? 'EXCUSE_APPROVE' : 'EXCUSE_REJECT', 'attendance', row.a.id);
    revalidatePath('/attendance'); revalidatePath('/messages');
    return success();
  });
}
