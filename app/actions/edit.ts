'use server';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/db';
import { announcements, assignments, grades, GRADE_TYPES, messages, NOTE_TYPES, studentNotes, supportTickets, users } from '@/db/schema';
import { audit } from '@/lib/audit';
import { canAccessStudent, canGradeSubject, isManager, schoolOf, visibleClassIds } from '@/lib/permissions';
import { fail, firstZodError, run, success, type ActionState } from '@/lib/action';
import { parseHM } from '@/lib/time';
import { parseSteps } from '@/lib/assignment-calc';
import { readUploads, saveAttachments } from '@/lib/uploads';

const STAFF = ['PRINCIPAL', 'VICE', 'TEACHER'] as const;
const ALL = ['PRINCIPAL', 'VICE', 'TEACHER', 'STUDENT', 'PARENT'] as const;
const ALL_WITH_ADMIN = ['ADMIN', ...ALL] as const;
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'تاریخ معتبر نیست.');
const fa2en = (v: string) => v.trim().replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace('٫', '.').replace(',', '.');

/* ---------------- نمره ---------------- */
export async function updateGrade(_: ActionState, fd: FormData): Promise<ActionState> {
  return run([...STAFF], async (user) => {
    const p = z.object({ id: z.string().min(1), title: z.string().trim().min(2, 'عنوان نمره را بنویسید.').max(100), type: z.enum(GRADE_TYPES), date: isoDate, note: z.string().trim().max(300).optional() }).safeParse(Object.fromEntries(fd));
    if (!p.success) return fail(firstZodError(p.error));
    const score = Number(fa2en(String(fd.get('score') ?? ''))); const max = Number(fa2en(String(fd.get('maxScore') ?? '')));
    if (!Number.isFinite(max) || max < 1 || max > 100) return fail('حداکثر نمره معتبر نیست.');
    if (!Number.isFinite(score) || score < 0 || score > max) return fail(`نمره باید بین ۰ و ${max} باشد.`);
    const [g] = await db.select().from(grades).where(eq(grades.id, p.data.id)).limit(1);
    if (!g) return fail('این نمره پیدا نشد.');
    const [st] = await db.select().from(users).where(eq(users.id, g.studentId)).limit(1);
    if (!st?.classId || st.schoolId !== user.schoolId || !(await canGradeSubject(user, st.classId, g.subjectId))) return fail('دسترسی ندارید.');
    await db.update(grades).set({ title: p.data.title, type: p.data.type, date: p.data.date, note: p.data.note || null, score, maxScore: max }).where(eq(grades.id, g.id));
    await audit(user.id, 'GRADE_UPDATE', 'grade', g.id, `${g.score}/${g.maxScore} → ${score}/${max}`);
    revalidatePath('/grades'); revalidatePath('/report-card'); revalidatePath(`/students/${g.studentId}`);
    return success('نمره ویرایش شد.');
  });
}

/* ---------------- مثبت / منفی ---------------- */
export async function updateNote(_: ActionState, fd: FormData): Promise<ActionState> {
  return run([...STAFF], async (user) => {
    const p = z.object({ id: z.string().min(1), type: z.enum(NOTE_TYPES), body: z.string().trim().min(2, 'متن یادداشت را بنویسید.').max(500) }).safeParse(Object.fromEntries(fd));
    if (!p.success) return fail(firstZodError(p.error));
    const [n] = await db.select().from(studentNotes).where(eq(studentNotes.id, p.data.id)).limit(1);
    if (!n || !(await canAccessStudent(user, n.studentId))) return fail('دسترسی ندارید.');
    if (!isManager(user.role) && n.authorId !== user.id) return fail('فقط ثبت‌کننده یا مدیر/معاون می‌تواند این یادداشت را ویرایش کند.');
    await db.update(studentNotes).set({ type: p.data.type, body: p.data.body, editedAt: new Date() }).where(eq(studentNotes.id, n.id));
    await audit(user.id, 'NOTE_UPDATE', 'student', n.studentId, p.data.type);
    revalidatePath('/discipline'); revalidatePath(`/students/${n.studentId}`);
    return success('یادداشت ویرایش شد.');
  });
}

/* ---------------- تکلیف ---------------- */
export async function updateAssignment(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(['TEACHER'], async (user) => {
    const p = z.object({ id: z.string().min(1), title: z.string().trim().min(2, 'عنوان تکلیف را بنویسید.').max(150), description: z.string().trim().max(1000).optional(), dueDate: z.string().optional(), dueTime: z.string().trim().max(5).optional(), steps: z.string().max(2000).optional() }).safeParse(Object.fromEntries(fd));
    if (!p.success) return fail(firstZodError(p.error));
    const [a] = await db.select().from(assignments).where(eq(assignments.id, p.data.id)).limit(1);
    if (!a || !(await canGradeSubject(user, a.classId, a.subjectId))) return fail('دسترسی ندارید.');
    const dueTime = p.data.dueTime || null;
    if (dueTime && parseHM(dueTime) === null) return fail('ساعت مهلت معتبر نیست.');
    if (dueTime && !p.data.dueDate) return fail('برای ساعت مهلت، تاریخ مهلت را هم انتخاب کنید.');
    const up = await readUploads(fd); if (!up.ok) return fail(up.error);
    await db.update(assignments).set({ title: p.data.title, description: p.data.description || null, dueDate: p.data.dueDate || null, dueTime, steps: JSON.stringify(parseSteps(p.data.steps ?? '')) }).where(eq(assignments.id, a.id));
    await saveAttachments('assignment', a.id, user.id, up.files);
    await audit(user.id, 'ASSIGNMENT_UPDATE', 'assignment', a.id, p.data.title);
    revalidatePath('/assignments'); revalidatePath(`/assignments/${a.id}`); revalidatePath('/dashboard');
    return success('تکلیف ویرایش شد.');
  });
}

/* ---------------- اطلاعیه ---------------- */
async function ownAnnouncement(user: { id: string; role: string; schoolId: string | null }, id: string) {
  const [a] = await db.select().from(announcements).where(eq(announcements.id, id)).limit(1);
  return a && a.schoolId === user.schoolId && (isManager(user.role as 'PRINCIPAL') || a.authorId === user.id) ? a : null;
}
export async function updateAnnouncement(_: ActionState, fd: FormData): Promise<ActionState> {
  return run([...STAFF], async (user) => {
    const p = z.object({ id: z.string().min(1), title: z.string().trim().min(2, 'عنوان را بنویسید.').max(150), body: z.string().trim().min(2, 'متن اطلاعیه را بنویسید.').max(2000) }).safeParse(Object.fromEntries(fd));
    if (!p.success) return fail(firstZodError(p.error));
    const a = await ownAnnouncement(user, p.data.id); if (!a) return fail('دسترسی ندارید.');
    const up = await readUploads(fd); if (!up.ok) return fail(up.error);
    await db.update(announcements).set({ title: p.data.title, body: p.data.body, editedAt: new Date() }).where(eq(announcements.id, a.id));
    await saveAttachments('announcement', a.id, user.id, up.files);
    await audit(user.id, 'ANNOUNCEMENT_UPDATE', 'announcement', a.id);
    revalidatePath('/announcements'); revalidatePath('/dashboard');
    return success('اطلاعیه ویرایش شد.');
  });
}
export async function togglePinAnnouncement(fd: FormData) {
  await run([...STAFF], async (user) => {
    const a = await ownAnnouncement(user, String(fd.get('id'))); if (!a) return fail('دسترسی ندارید.');
    await db.update(announcements).set({ pinned: !a.pinned }).where(eq(announcements.id, a.id));
    revalidatePath('/announcements'); revalidatePath('/dashboard');
    return success();
  });
}

/* ---------------- پیام ---------------- */
export async function updateMessage(_: ActionState, fd: FormData): Promise<ActionState> {
  return run([...ALL_WITH_ADMIN], async (u) => {
    const p = z.object({ id: z.string().min(1), subject: z.string().trim().min(2, 'موضوع را بنویسید.').max(120), body: z.string().trim().min(1, 'متن پیام را بنویسید.').max(3000) }).safeParse(Object.fromEntries(fd));
    if (!p.success) return fail(firstZodError(p.error));
    const r = await db.update(messages).set({ subject: p.data.subject, body: p.data.body, editedAt: new Date() }).where(and(eq(messages.id, p.data.id), eq(messages.senderId, u.id))).returning({ id: messages.id });
    if (!r.length) return fail('فقط فرستنده می‌تواند پیام را ویرایش کند.');
    revalidatePath('/messages');
    return success('پیام ویرایش شد.');
  });
}
export async function togglePinMessage(fd: FormData) {
  await run([...ALL_WITH_ADMIN], async (u) => {
    const [m] = await db.select().from(messages).where(eq(messages.id, String(fd.get('id')))).limit(1);
    if (!m) return success();
    if (m.recipientId === u.id) await db.update(messages).set({ pinnedByRecipient: !m.pinnedByRecipient }).where(eq(messages.id, m.id));
    else if (m.senderId === u.id) await db.update(messages).set({ pinnedBySender: !m.pinnedBySender }).where(eq(messages.id, m.id));
    revalidatePath('/messages');
    return success();
  });
}

/* ---------------- پیام به پشتیبانی ---------------- */
export async function updateTicket(_: ActionState, fd: FormData): Promise<ActionState> {
  return run([...ALL], async (u) => {
    const p = z.object({ id: z.string().min(1), subject: z.string().trim().min(3, 'موضوع را بنویسید (حداقل ۳ نویسه).').max(100), body: z.string().trim().min(10, 'متن پیام را کامل‌تر بنویسید.').max(2000) }).safeParse(Object.fromEntries(fd));
    if (!p.success) return fail(firstZodError(p.error));
    const r = await db.update(supportTickets).set({ subject: p.data.subject, body: p.data.body, editedAt: new Date() }).where(and(eq(supportTickets.id, p.data.id), eq(supportTickets.userId, u.id), eq(supportTickets.status, 'open'))).returning({ id: supportTickets.id });
    if (!r.length) return fail('پیامی که پاسخ گرفته یا بسته شده قابل ویرایش نیست.');
    revalidatePath('/help'); revalidatePath('/admin/support');
    return success('پیام ویرایش شد.');
  });
}
