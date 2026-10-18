import 'server-only';
import crypto from 'node:crypto';
import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { schools, sessions, users, type Role } from '@/db/schema';
import { isExpired } from './subscription';

const COOKIE = 'school_session';
const TTL_MS = 1000 * 60 * 60 * 12;
export const hashToken = (t: string) => crypto.createHash('sha256').update(t).digest('hex');

export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + TTL_MS);
  const h = await headers();
  await db.insert(sessions).values({
    userId, tokenHash: hashToken(token), expiresAt,
    ip: h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null, userAgent: h.get('user-agent')?.slice(0, 200) ?? null,
  });
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: shouldSecure(h), path: '/', expires: expiresAt });
}

/**
 * کوکی «secure» فقط وقتی که واقعاً با HTTPS وارد شده‌اند. اگر سایت با http://192.168.x.x (شبکه‌ی خانگی/گوشی)
 * باز شده باشد، مرورگر کوکی secure را دور می‌ریزد و صفحه‌ی بعدی به ورود برمی‌گردد.
 */
function shouldSecure(h: Headers): boolean {
  if (process.env.NODE_ENV !== 'production' || process.env.INSECURE_COOKIES === '1') return false;
  if (process.env.FORCE_SECURE_COOKIES === '1') return true;
  const fwd = h.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase();
  if (fwd) return fwd === 'https';
  const origin = h.get('origin');
  if (origin) { try { return new URL(origin).protocol === 'https:'; } catch { /* ignore */ } }
  return true;
}

/** هش توکنِ نشستِ همین مرورگر (برای تشخیص «این دستگاه» در فهرست نشست‌ها) */
export async function currentSessionHash(): Promise<string | null> {
  const token = (await cookies()).get(COOKIE)?.value; return token ? hashToken(token) : null;
}

export async function destroySession() {
  const store = await cookies(); const token = store.get(COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  store.delete(COOKIE);
}

export type CurrentUser = typeof users.$inferSelect;

/** کاربر فعلی (یا null). نتیجه در طول یک درخواست کش می‌شود. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const rows = await db.select({ s: sessions, u: users }).from(sessions).innerJoin(users, eq(users.id, sessions.userId)).where(eq(sessions.tokenHash, hashToken(token))).limit(1);
  const row = rows[0];
  if (!row || row.s.expiresAt <= new Date() || row.u.status !== 'active') return null;
  if (row.u.schoolId) { // مدرسه‌ی غیرفعال‌شده = قطع دسترسی همه‌ی اعضایش
    const [sc] = await db.select({ status: schools.status, ends: schools.subscriptionEndsAt }).from(schools).where(eq(schools.id, row.u.schoolId)).limit(1);
    if (!sc || sc.status !== 'active' || isExpired(sc.ends)) return null; // اشتراک تمام‌شده = قطع دسترسی تا تمدید
  }
  return row.u;
});

/** برای صفحات: اگر وارد نشده بود به /login می‌رود؛ اگر نقش مجاز نبود به داشبورد. */
export async function requireUser(roles?: Role[]): Promise<CurrentUser> {
  const u = await getCurrentUser();
  if (!u) redirect('/login');
  if (roles && !roles.includes(u.role)) redirect('/dashboard');
  return u;
}

/** برای صفحاتِ داده‌ی مدرسه: مدیرکل سامانه (بدون مدرسه) به پنل مدارس هدایت می‌شود. */
export async function requireSchoolUser(roles?: Role[]): Promise<CurrentUser> {
  const u = await requireUser(roles);
  if (!u.schoolId) redirect('/admin/schools');
  return u;
}

/** برای Server Actionها: خطا می‌اندازد تا به کاربر پیام خوانا برگردد. */
export class AuthError extends Error {}
export async function requireActionUser(roles?: Role[]): Promise<CurrentUser> {
  const u = await getCurrentUser();
  if (!u) throw new AuthError('نشست شما منقضی شده است. دوباره وارد شوید.');
  if (roles && !roles.includes(u.role)) throw new AuthError('شما اجازه‌ی انجام این کار را ندارید.');
  return u;
}
