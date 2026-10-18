'use server';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { and, eq, ne, count } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/db';
import { sessions, supportTickets, users } from '@/db/schema';
import { audit } from '@/lib/audit';
import { fail, firstZodError, run, success, type ActionState } from '@/lib/action';

const ticketSchema = z.object({
  subject: z.string().trim().min(3, 'موضوع را بنویسید (حداقل ۳ نویسه).').max(100),
  body: z.string().trim().min(10, 'متن پیام را کامل‌تر بنویسید (حداقل ۱۰ نویسه).').max(2000),
});

/** هر کاربر (غیر از مدیران سامانه) می‌تواند به پشتیبانی پیام بدهد؛ حداکثر ۵ پیامِ بدون پاسخ همزمان */
export async function createTicket(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(['PRINCIPAL', 'VICE', 'TEACHER', 'STUDENT', 'PARENT'], async (u) => {
    const p = ticketSchema.safeParse({ subject: fd.get('subject'), body: fd.get('body') });
    if (!p.success) return fail(firstZodError(p.error));
    const [{ n }] = await db.select({ n: count() }).from(supportTickets).where(and(eq(supportTickets.userId, u.id), eq(supportTickets.status, 'open')));
    if (n >= 5) return fail('چند پیامِ بدون پاسخ دارید؛ لطفاً تا پاسخ پشتیبانی صبر کنید.');
    const [t] = await db.insert(supportTickets).values({ userId: u.id, subject: p.data.subject, body: p.data.body }).returning();
    await audit(u.id, 'SUPPORT_TICKET', 'support_ticket', t.id, p.data.subject);
    revalidatePath('/help'); revalidatePath('/admin/support');
    return success('پیام شما برای پشتیبانی ارسال شد. پاسخ را در همین صفحه می‌بینید.');
  });
}

export async function closeTicket(fd: FormData) {
  await run(['PRINCIPAL', 'VICE', 'TEACHER', 'STUDENT', 'PARENT'], async (u) => {
    const id = String(fd.get('id'));
    await db.update(supportTickets).set({ status: 'closed' }).where(and(eq(supportTickets.id, id), eq(supportTickets.userId, u.id)));
    revalidatePath('/help'); revalidatePath('/admin/support'); return success();
  });
}

/** مدیرکل: پاسخ به یک پیام */
export async function replyTicket(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(['ADMIN'], async (admin) => {
    const id = String(fd.get('id')); const reply = String(fd.get('reply') ?? '').trim();
    if (reply.length < 2) return fail('متن پاسخ را بنویسید.');
    if (reply.length > 2000) return fail('پاسخ حداکثر ۲۰۰۰ نویسه باشد.');
    const r = await db.update(supportTickets).set({ reply, status: 'answered', repliedBy: admin.id, repliedAt: new Date() }).where(eq(supportTickets.id, id)).returning({ id: supportTickets.id });
    if (!r.length) return fail('پیام پیدا نشد.');
    await audit(admin.id, 'SUPPORT_REPLY', 'support_ticket', id);
    revalidatePath('/admin/support'); revalidatePath('/help');
    return success('پاسخ ثبت شد.');
  });
}

/* ---------- مدیریت ادمین‌ها: فقط «ادمین اصلی» ---------- */
const tempPassword = () => crypto.randomBytes(6).toString('base64url').replace(/[-_]/g, 'x') + '7a';
const adminSchema = z.object({
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,30}$/, 'نام کاربری فقط حروف انگلیسی، عدد و ._- (۳ تا ۳۰ نویسه) باشد.'),
  firstName: z.string().trim().min(1, 'نام را بنویسید.').max(50),
  lastName: z.string().trim().min(1, 'نام خانوادگی را بنویسید.').max(50),
});

export async function createAdmin(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(['ADMIN'], async (me) => {
    if (!me.isOwner) return fail('فقط ادمین اصلی می‌تواند ادمین جدید اضافه کند.');
    const p = adminSchema.safeParse(Object.fromEntries(fd));
    if (!p.success) return fail(firstZodError(p.error));
    if ((await db.select({ id: users.id }).from(users).where(eq(users.username, p.data.username)).limit(1)).length) return fail('این نام کاربری قبلاً استفاده شده است.');
    const typed = String(fd.get('password') ?? '').trim();
    if (typed && typed.length < 8) return fail('رمز عبور باید حداقل ۸ نویسه باشد.');
    const password = typed || tempPassword();
    const [u] = await db.insert(users).values({ ...p.data, role: 'ADMIN', isOwner: false, passwordHash: await bcrypt.hash(password, 10), mustChangePassword: true }).returning();
    await audit(me.id, 'ADMIN_CREATE', 'user', u.id, p.data.username);
    revalidatePath('/admin/admins');
    return success(`ادمین ساخته شد. رمز موقت: ${password} (در اولین ورود باید آن را عوض کند)`);
  });
}

export async function removeAdmin(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(['ADMIN'], async (me) => {
    if (!me.isOwner) return fail('فقط ادمین اصلی می‌تواند ادمین‌ها را حذف کند.');
    const id = String(fd.get('id'));
    const [t] = await db.select().from(users).where(and(eq(users.id, id), eq(users.role, 'ADMIN'), ne(users.id, me.id))).limit(1);
    if (!t) return fail('این ادمین پیدا نشد (ادمین اصلی حذف نمی‌شود).');
    if (t.isOwner) return fail('ادمین اصلی قابل حذف نیست.');
    await db.delete(users).where(eq(users.id, id));
    await audit(me.id, 'ADMIN_REMOVE', 'user', id, t.username);
    revalidatePath('/admin/admins');
    return success('ادمین حذف شد.');
  });
}

export async function resetAdminPassword(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(['ADMIN'], async (me) => {
    if (!me.isOwner) return fail('فقط ادمین اصلی می‌تواند رمز ادمین‌ها را بازنشانی کند.');
    const id = String(fd.get('id'));
    const [t] = await db.select().from(users).where(and(eq(users.id, id), eq(users.role, 'ADMIN'), eq(users.isOwner, false))).limit(1);
    if (!t) return fail('ادمین پیدا نشد.');
    const password = tempPassword();
    await db.update(users).set({ passwordHash: await bcrypt.hash(password, 10), mustChangePassword: true }).where(eq(users.id, id));
    await db.delete(sessions).where(eq(sessions.userId, id));
    await audit(me.id, 'ADMIN_RESET_PASSWORD', 'user', id);
    return success(`رمز موقت جدید: ${password}`);
  });
}
