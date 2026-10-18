'use server';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { db } from '@/db';
import { schools, users } from '@/db/schema';
import { createSession, destroySession, getCurrentUser } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { isExpired } from '@/lib/subscription';
import { checkLogin, recordFailure, recordSuccess } from '@/lib/rate-limit';
import { fail, success, type ActionState } from '@/lib/action';

export async function loginAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const username = String(fd.get('username') ?? '').trim().toLowerCase();
  const password = String(fd.get('password') ?? '');
  if (!username || !password) return fail('نام کاربری و رمز عبور را وارد کنید.');

  const h = await headers();
  const key = `${username}|${h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local'}`;
  const gate = checkLogin(key);
  if (!gate.ok) return fail(`تعداد تلاش‌های ناموفق زیاد بود. ${gate.retryMin} دقیقه‌ی دیگر دوباره امتحان کنید.`);

  let user: typeof users.$inferSelect | undefined;
  try {
    [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
  } catch (e) {
    console.error('LOGIN DB ERROR', e);
    return fail('اتصال به پایگاه‌داده برقرار نیست. دستور «npm run db:setup» را اجرا کنید.');
  }
  // مقایسه‌ی رمز حتی برای کاربر ناموجود انجام می‌شود تا زمان پاسخ چیزی لو ندهد
  const ok = await bcrypt.compare(password, user?.passwordHash ?? '$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvali');
  if (!user || !ok) { recordFailure(key); return fail('نام کاربری یا رمز عبور اشتباه است.'); }
  if (user.status !== 'active') return fail('دسترسی این حساب توسط مدیر غیرفعال شده است.');
  if (user.schoolId) { const [sc] = await db.select({ st: schools.status, ends: schools.subscriptionEndsAt }).from(schools).where(eq(schools.id, user.schoolId)).limit(1); if (!sc || sc.st !== 'active') return fail('دسترسی این مدرسه به سامانه غیرفعال شده است.'); if (isExpired(sc.ends)) return fail('اشتراک این مدرسه تمام شده است. مدیر مدرسه باید آن را تمدید کند (با پشتیبانی تماس بگیرید).'); }

  recordSuccess(key);
  await createSession(user.id);
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  await audit(user.id, 'LOGIN', 'user', user.id);
  redirect(user.mustChangePassword ? '/profile?force=1' : '/dashboard');
}

export async function logoutAction() {
  const u = await getCurrentUser();
  await destroySession();
  if (u) await audit(u.id, 'LOGOUT', 'user', u.id);
  redirect('/login');
}

export async function changePasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const u = await getCurrentUser();
  if (!u) return fail('نشست شما منقضی شده است.');
  const current = String(fd.get('current') ?? ''); const next = String(fd.get('next') ?? ''); const again = String(fd.get('again') ?? '');
  if (!(await bcrypt.compare(current, u.passwordHash))) return fail('رمز فعلی درست نیست.');
  if (next.length < 8) return fail('رمز جدید باید حداقل ۸ نویسه باشد.');
  if (next !== again) return fail('تکرار رمز جدید یکسان نیست.');
  await db.update(users).set({ passwordHash: await bcrypt.hash(next, 10), mustChangePassword: false }).where(eq(users.id, u.id));
  await audit(u.id, 'PASSWORD_CHANGE', 'user', u.id);
  return success('رمز عبور با موفقیت تغییر کرد.');
}

/** تغییر نام کاربری توسط خودِ کاربر؛ با رمز فعلی تأیید می‌شود و نباید با کاربر دیگری یکی باشد */
export async function changeUsernameAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const u = await getCurrentUser();
  if (!u) return fail('نشست شما منقضی شده است.');
  const username = String(fd.get('username') ?? '').trim().toLowerCase(); const password = String(fd.get('password') ?? '');
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) return fail('نام کاربری فقط حروف انگلیسی، عدد و ._- (۳ تا ۳۰ نویسه) باشد.');
  if (!(await bcrypt.compare(password, u.passwordHash))) return fail('رمز عبور درست نیست.');
  if (username === u.username) return fail('این همان نام کاربری فعلی شماست.');
  const taken = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
  if (taken.length) return fail('این نام کاربری قبلاً توسط شخص دیگری گرفته شده است.');
  await db.update(users).set({ username }).where(eq(users.id, u.id));
  await audit(u.id, 'USERNAME_CHANGE', 'user', u.id, `${u.username} → ${username}`);
  return success(`نام کاربری شما به «${username}» تغییر کرد. دفعه‌ی بعد با همین نام و رمزتان وارد شوید.`);
}
