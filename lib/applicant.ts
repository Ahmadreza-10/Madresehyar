import 'server-only';
import crypto from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { cookies, headers } from 'next/headers';
import { db } from '@/db';
import { purchaseRequests } from '@/db/schema';
import { shouldSecure } from './auth';
import { normalizeMobile } from './image-check';

const COOKIE = 'applicant_session';
const TTL_MS = 1000 * 60 * 60 * 3;
const hash = (t: string) => crypto.createHash('sha256').update(t).digest('hex');

/** درخواستِ خریدِ «در جریان» که با (موبایل = نام کاربری، کد پیگیری = رمز) پیدا می‌شود؛ درخواست‌های تمدید و ثبت‌نام‌شده‌ها نه */
export async function findApplication(usernameRaw: string, codeRaw: string) {
  const phone = normalizeMobile(usernameRaw); const code = codeRaw.trim().toUpperCase();
  if (!phone || !code) return null;
  const [r] = await db.select().from(purchaseRequests).where(and(eq(purchaseRequests.trackingCode, code), eq(purchaseRequests.phone, phone), eq(purchaseRequests.kind, 'new'))).limit(1);
  return r ?? null;
}

export async function startApplicantSession(requestId: string) {
  const token = crypto.randomBytes(32).toString('hex'); const h = await headers();
  await db.update(purchaseRequests).set({ applicantTokenHash: hash(token) }).where(eq(purchaseRequests.id, requestId));
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: shouldSecure(h), path: '/', expires: new Date(Date.now() + TTL_MS) });
}

export async function getApplication() {
  const token = (await cookies()).get(COOKIE)?.value; if (!token) return null;
  const [r] = await db.select().from(purchaseRequests).where(eq(purchaseRequests.applicantTokenHash, hash(token))).limit(1);
  return r ?? null;
}

export async function endApplicantSession() {
  const store = await cookies(); const token = store.get(COOKIE)?.value;
  if (token) await db.update(purchaseRequests).set({ applicantTokenHash: null }).where(eq(purchaseRequests.applicantTokenHash, hash(token)));
  store.delete(COOKIE);
}
