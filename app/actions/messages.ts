'use server';
import { and, eq, isNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/db';
import { chatPosts, classes, classSubjects, messages, scheduleSlots, subjects, users } from '@/db/schema';
import type { CurrentUser } from '@/lib/auth';
import { parseSlotTimes, slotConflict } from '@/lib/teacher-schedule';
import { audit } from '@/lib/audit';
import { MAX_PERIODS, MIN_PERIODS } from '@/lib/schedule-config';
import { setSetting } from '@/lib/settings';
import { allowedRecipients } from '@/lib/messaging';
import { groupAccess } from '@/lib/groups';
import { copyAttachments, nameOf, planAttachmentEdit, snippetOf } from '@/lib/chat-ops';
import { deleteAttachmentsOf, listAttachments, readUploads, saveAttachments } from '@/lib/uploads';
import { classInSchool, schoolOf } from '@/lib/permissions';
import { fail, firstZodError, run, success, type ActionState } from '@/lib/action';

export async function sendMessage(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(['ADMIN', 'PRINCIPAL', 'VICE', 'TEACHER', 'STUDENT', 'PARENT'], async (u) => {
    const p = z.object({ recipientId: z.string().min(1, 'گیرنده را انتخاب کنید.'), subject: z.string().trim().min(2, 'موضوع را بنویسید.').max(120), body: z.string().trim().min(2, 'متن پیام را بنویسید.').max(3000) }).safeParse(Object.fromEntries(fd));
    if (!p.success) return fail(firstZodError(p.error));
    const ok = (await allowedRecipients(u)).some((r) => r.id === p.data.recipientId);
    if (!ok) return fail('شما اجازه‌ی ارسال پیام به این کاربر را ندارید.');
    const up = await readUploads(fd); if (!up.ok) return fail(up.error);
    const [msg] = await db.insert(messages).values({ senderId: u.id, ...p.data }).returning({ id: messages.id });
    await saveAttachments('message', msg.id, u.id, up.files);
    await audit(u.id, 'MESSAGE_SEND', 'user', p.data.recipientId);
    revalidatePath('/messages');
    return success('پیام ارسال شد.');
  });
}

const ANY = ['ADMIN', 'PRINCIPAL', 'VICE', 'TEACHER', 'STUDENT', 'PARENT'] as const;

/** پیام‌رسان: ارسال پیام به یک نفر (بدون موضوع؛ متن یا فایل کافی است) */
export async function sendChat(_: ActionState, fd: FormData): Promise<ActionState> {
  return run([...ANY], async (u) => {
    const recipientId = String(fd.get('recipientId') ?? ''); const body = String(fd.get('body') ?? '').trim();
    if (!recipientId) return fail('گیرنده مشخص نیست.');
    if (body.length > 3000) return fail('متن پیام بیش از ۳۰۰۰ نویسه است.');
    const up = await readUploads(fd); if (!up.ok) return fail(up.error);
    if (!body && !up.files.length) return fail('متن یا فایل بگذارید.');
    if (!(await allowedRecipients(u)).some((r) => r.id === recipientId)) return fail('شما اجازه‌ی ارسال پیام به این کاربر را ندارید.');
    let replyToId: string | null = null; let replySnippet: string | null = null;
    const rid = String(fd.get('replyToId') ?? '');
    if (rid) {
      const [r] = await db.select().from(messages).where(eq(messages.id, rid)).limit(1);
      if (r && ((r.senderId === u.id && r.recipientId === recipientId) || (r.senderId === recipientId && r.recipientId === u.id))) {
        replyToId = r.id; replySnippet = snippetOf(await nameOf(r.senderId), r.body, (await listAttachments('message', [r.id])).length > 0);
      }
    }
    const [msg] = await db.insert(messages).values({ senderId: u.id, recipientId, subject: '', body, replyToId, replySnippet }).returning({ id: messages.id });
    await saveAttachments('message', msg.id, u.id, up.files);
    await audit(u.id, 'MESSAGE_SEND', 'user', recipientId);
    revalidatePath('/messages');
    return success();
  });
}

/** با باز شدن گفتگو، پیام‌های دریافتیِ آن گفتگو «خوانده‌شده» می‌شود */
export async function markConversationRead(userId: string) {
  await run([...ANY], async (u) => {
    await db.update(messages).set({ readAt: new Date() }).where(and(eq(messages.senderId, userId), eq(messages.recipientId, u.id), isNull(messages.readAt)));
    revalidatePath('/messages'); revalidatePath('/', 'layout');
    return success();
  });
}

export async function editChatMessage(_: ActionState, fd: FormData): Promise<ActionState> {
  return run([...ANY], async (u) => {
    const id = String(fd.get('id') ?? ''); const body = String(fd.get('body') ?? '').trim();
    if (body.length > 3000) return fail('متن پیام بیش از ۳۰۰۰ نویسه است.');
    const [m] = await db.select().from(messages).where(and(eq(messages.id, id), eq(messages.senderId, u.id))).limit(1);
    if (!m) return fail('فقط فرستنده می‌تواند پیام را ویرایش کند.');
    const plan = await planAttachmentEdit('message', id, fd); if (!plan.ok) return fail(plan.error);
    if (!body && plan.total === 0) return fail('پیام نمی‌تواند خالی باشد.');
    await plan.apply(u.id);
    await db.update(messages).set({ body, editedAt: new Date() }).where(eq(messages.id, id));
    revalidatePath('/messages');
    return success('ذخیره شد.');
  });
}

/** هدایت یک پیام (شخصی یا گروهی) به یک گفتگوی دیگر؛ named=0 یعنی «هدایت بدون نام بردن» */
export async function forwardMessage(_: ActionState, fd: FormData): Promise<ActionState> {
  return run([...ANY], async (u) => {
    const kind = String(fd.get('kind') ?? ''); const srcId = String(fd.get('id') ?? ''); const target = String(fd.get('target') ?? ''); const named = String(fd.get('named') ?? '1') === '1';
    let body = ''; let authorId: string | null = null; let fromKind: 'message' | 'group_post';
    if (kind === 'message') {
      const [m] = await db.select().from(messages).where(eq(messages.id, srcId)).limit(1);
      if (!m || (m.senderId !== u.id && m.recipientId !== u.id)) return fail('این پیام در دسترس شما نیست.');
      body = m.body; authorId = m.senderId; fromKind = 'message';
    } else if (kind === 'post') {
      const [p] = await db.select().from(chatPosts).where(eq(chatPosts.id, srcId)).limit(1);
      const a = p ? await groupAccess(u, p.groupId) : null; if (!p || !a) return fail('این پیام در دسترس شما نیست.');
      body = p.body; authorId = p.authorId; fromKind = 'group_post';
    } else return fail('پیام نامعتبر است.');
    const forwardedFrom = named ? await nameOf(authorId) : null;
    const [tk, tid] = [target.slice(0, 1), target.slice(2)];
    if (tk === 'u') {
      if (!(await allowedRecipients(u)).some((r) => r.id === tid)) return fail('به این کاربر نمی‌توانید پیام بدهید.');
      const [n] = await db.insert(messages).values({ senderId: u.id, recipientId: tid, subject: '', body, forwardedFrom }).returning({ id: messages.id });
      await copyAttachments(fromKind, srcId, 'message', n.id, u.id);
    } else if (tk === 'g') {
      const a = await groupAccess(u, tid); if (!a) return fail('این گروه پیدا نشد.'); if (!a.canPost) return fail('در این کانال فقط مدیران می‌توانند پیام بگذارند.');
      const [n] = await db.insert(chatPosts).values({ groupId: tid, authorId: u.id, body, forwardedFrom }).returning({ id: chatPosts.id });
      await copyAttachments(fromKind, srcId, 'group_post', n.id, u.id);
      revalidatePath(`/messages/groups/${tid}`);
    } else return fail('مقصد نامعتبر است.');
    revalidatePath('/messages');
    return success('هدایت شد.');
  });
}

export async function deleteChatMessage(fd: FormData) {
  await run([...ANY], async (u) => {
    const id = String(fd.get('id') ?? '');
    const r = await db.delete(messages).where(and(eq(messages.id, id), eq(messages.senderId, u.id))).returning({ id: messages.id });
    if (r.length) await deleteAttachmentsOf('message', id);
    revalidatePath('/messages'); revalidatePath('/', 'layout');
    return success();
  });
}

export async function markRead(fd: FormData) {
  await run(['ADMIN', 'PRINCIPAL', 'VICE', 'TEACHER', 'STUDENT', 'PARENT'], async (u) => {
    await db.update(messages).set({ readAt: new Date() }).where(and(eq(messages.id, String(fd.get('id'))), eq(messages.recipientId, u.id)));
    revalidatePath('/messages'); revalidatePath('/', 'layout');
    return success();
  });
}

const slotSchema = z.object({
  classId: z.string().min(1), weekday: z.coerce.number().int().min(0).max(5), period: z.coerce.number().int().min(1).max(MAX_PERIODS),
  subjectId: z.string().min(1, 'درس را انتخاب کنید.'), room: z.string().trim().max(30).optional(),
  startTime: z.string().trim().max(5).optional(), endTime: z.string().trim().max(5).optional(),
});

/** ذخیره‌ی یک زنگ در برنامه‌ی کلاس (فقط مدیر/معاون). اگر expectTeacherId داده شود، درس باید در آن کلاس به همان معلم داده شده باشد.
 *  معلم نمی‌تواند هم‌زمان دو کلاس داشته باشد. */
async function writeSlot(u: CurrentUser, raw: unknown, expectTeacherId?: string): Promise<ActionState> {
  const p = slotSchema.safeParse(raw);
  if (!p.success) return fail(firstZodError(p.error));
  const d = p.data;
  const t = parseSlotTimes(d.startTime, d.endTime);
  if (!t.ok) return fail(t.error);
  if (!(await classInSchool(u, d.classId))) return fail('این کلاس در مدرسه‌ی شما نیست.');
  if (!(await db.select({ id: subjects.id }).from(subjects).where(and(eq(subjects.id, d.subjectId), eq(subjects.schoolId, schoolOf(u)))).limit(1)).length) return fail('این درس در مدرسه‌ی شما نیست.');
  const [cs] = await db.select({ teacherId: classSubjects.teacherId }).from(classSubjects).where(and(eq(classSubjects.classId, d.classId), eq(classSubjects.subjectId, d.subjectId))).limit(1);
  if (expectTeacherId && cs?.teacherId !== expectTeacherId) return fail('این درس در این کلاس به این معلم داده نشده است. ابتدا در «کلاس‌ها و درس‌ها» معلم درس را تعیین کنید.');
  if (cs?.teacherId) {
    const mine = await db.select({ weekday: scheduleSlots.weekday, period: scheduleSlots.period, classId: scheduleSlots.classId, startTime: scheduleSlots.startTime, endTime: scheduleSlots.endTime, className: classes.name })
      .from(scheduleSlots).innerJoin(classes, eq(classes.id, scheduleSlots.classId))
      .innerJoin(classSubjects, and(eq(classSubjects.classId, scheduleSlots.classId), eq(classSubjects.subjectId, scheduleSlots.subjectId)))
      .where(and(eq(classSubjects.teacherId, cs.teacherId), eq(classes.schoolId, schoolOf(u)), eq(scheduleSlots.weekday, d.weekday)));
    const c = slotConflict(mine, { weekday: d.weekday, period: d.period, classId: d.classId, startTime: t.start, endTime: t.end });
    if (c) return fail(`این معلم در همین روز، زنگ ${c.period} (کلاس ${c.className}) را دارد و با این زنگ تداخل پیدا می‌کند.`);
  }
  const vals = { classId: d.classId, weekday: d.weekday, period: d.period, subjectId: d.subjectId, room: d.room || null, startTime: t.start, endTime: t.end };
  await db.insert(scheduleSlots).values(vals).onConflictDoUpdate({ target: [scheduleSlots.classId, scheduleSlots.weekday, scheduleSlots.period], set: { subjectId: vals.subjectId, room: vals.room, startTime: vals.startTime, endTime: vals.endTime } });
  await audit(u.id, 'SCHEDULE_SAVE', 'class', d.classId, expectTeacherId ? `teacher ${expectTeacherId}` : undefined);
  revalidatePath('/schedule'); revalidatePath('/teacher-schedule');
  return success('ذخیره شد.');
}

export async function saveSlot(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(['PRINCIPAL', 'VICE'], (u) => writeSlot(u, Object.fromEntries(fd)));
}

/** ویرایش برنامه‌ی یک معلم (از صفحه‌ی «برنامه‌ی معلمان»): کلاس و درس با هم، به‌صورت «classId:subjectId» می‌آید */
export async function saveTeacherSlot(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(['PRINCIPAL', 'VICE'], async (u) => {
    const teacherId = String(fd.get('teacherId') ?? ''); const [classId, subjectId] = String(fd.get('cs') ?? '').split(':');
    if (!teacherId || !classId || !subjectId) return fail('کلاس و درس را انتخاب کنید.');
    const [t] = await db.select({ id: users.id }).from(users).where(and(eq(users.id, teacherId), eq(users.role, 'TEACHER'), eq(users.schoolId, schoolOf(u)))).limit(1);
    if (!t) return fail('این معلم در مدرسه‌ی شما نیست.');
    return writeSlot(u, { ...Object.fromEntries(fd), classId, subjectId }, teacherId);
  });
}
export async function deleteSlot(fd: FormData) {
  await run(['PRINCIPAL', 'VICE'], async (u) => {
    const [sl] = await db.select({ classId: scheduleSlots.classId }).from(scheduleSlots).where(eq(scheduleSlots.id, String(fd.get('id')))).limit(1);
    if (sl && (await classInSchool(u, sl.classId))) { await db.delete(scheduleSlots).where(eq(scheduleSlots.id, String(fd.get('id')))); await audit(u.id, 'SCHEDULE_DELETE', 'class', sl.classId); revalidatePath('/schedule'); revalidatePath('/teacher-schedule'); }
    return success();
  });
}

/** تعیین تعداد زنگ‌های هر روز (فقط مدیر/معاون): مثلاً ۵ یا ۶ زنگه */
export async function savePeriodCount(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(['PRINCIPAL', 'VICE'], async (u) => {
    const n = Number(fd.get('count'));
    if (!Number.isInteger(n) || n < MIN_PERIODS || n > MAX_PERIODS) return fail(`تعداد زنگ باید بین ${MIN_PERIODS} تا ${MAX_PERIODS} باشد.`);
    const last = await db.select({ p: scheduleSlots.period }).from(scheduleSlots).innerJoin(classes, eq(classes.id, scheduleSlots.classId)).where(eq(classes.schoolId, schoolOf(u)));
    const maxUsed = Math.max(0, ...last.map((x) => x.p));
    await setSetting(schoolOf(u), 'periodsPerDay', String(n));
    await audit(u.id, 'SCHEDULE_PERIODS', 'settings', undefined, String(n));
    revalidatePath('/schedule'); revalidatePath('/teacher-schedule');
    return success(maxUsed > n ? `ذخیره شد. توجه: هنوز زنگ‌هایی تا شماره‌ی ${maxUsed} ثبت شده که همچنان نمایش داده می‌شوند؛ برای حذف، آن‌ها را پاک کنید.` : 'ذخیره شد.');
  });
}
