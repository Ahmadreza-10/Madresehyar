'use server';
import { and, eq, or } from 'drizzle-orm';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { passwordResets, purchaseRequests, users } from '@/db/schema';
import { fail, success, type ActionState } from '@/lib/action';
import { audit } from '@/lib/audit';
import { normalizeMobile } from '@/lib/image-check';
import { checkLogin, recordFailure } from '@/lib/rate-limit';

const ip = async () => (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
const norm = (s: string) => s.replace(/[\s‌‏‎]+/g, ' ').replace(/ي/g, 'ی').replace(/ك/g, 'ک').trim().toLowerCase();
const faDigits = (s: string) => s.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));

/** «رمز عبورم را فراموش کرده‌ام»: درخواست برای مدیر/معاون ثبت می‌شود. پاسخ همیشه یکسان است تا معلوم نشود چنین کاربری هست یا نه. */
export async function requestPasswordReset(_: ActionState, fd: FormData): Promise<ActionState> {
  const key = `pwforgot|${await ip()}`; const gate = checkLogin(key);
  if (!gate.ok) return fail(`درخواست‌ها زیاد بود. ${gate.retryMin} دقیقه‌ی دیگر دوباره امتحان کنید.`);
  const who = String(fd.get('who') ?? '').trim().toLowerCase(); const name = String(fd.get('name') ?? '').trim().slice(0, 80);
  if (who.length < 3) return fail('نام کاربری یا شماره‌ی موبایل را بنویسید.');
  recordFailure(key); // هر ارسال یک امتیاز می‌گیرد تا کسی نتواند انبوه درخواست بفرستد
  const phone = normalizeMobile(who);
  const [u] = await db.select().from(users).where(phone ? or(eq(users.username, faDigits(who)), eq(users.phone, phone)) : eq(users.username, who)).limit(1);
  if (u && u.role !== 'ADMIN' && u.status === 'active') {
    const open = await db.select({ id: passwordResets.id }).from(passwordResets).where(and(eq(passwordResets.userId, u.id), eq(passwordResets.status, 'pending'))).limit(1);
    if (!open.length) { const [r] = await db.insert(passwordResets).values({ userId: u.id, claimedName: name || null }).returning({ id: passwordResets.id }); await audit(null, 'PASSWORD_FORGOT', 'user', u.id, r.id); }
  }
  return success('درخواست شما برای مدیر مدرسه ارسال شد (اگر نام کاربری درست باشد). مدیر پس از شناختن شما، رمز موقتی می‌سازد و به شما می‌دهد؛ با آن وارد شوید و رمز تازه‌ی خودتان را بگذارید. اگر مدیر مدرسه هستید با مدیر سامانه تماس بگیرید.');
}

/** گم‌کردن کد پیگیری خرید: با چهار نشانیِ درخواست (موبایل، نام مدرسه، نام مدیر، تعداد دانش‌آموز) کد نمایش داده می‌شود */
export async function recoverTrackingCode(_: ActionState, fd: FormData): Promise<ActionState> {
  const key = `coderecover|${await ip()}`; const gate = checkLogin(key);
  if (!gate.ok) return fail(`تلاش‌ها زیاد بود. ${gate.retryMin} دقیقه‌ی دیگر دوباره امتحان کنید.`);
  const phone = normalizeMobile(String(fd.get('phone') ?? '')); const school = norm(String(fd.get('schoolName') ?? '')); const manager = norm(String(fd.get('managerName') ?? ''));
  const count = Number(faDigits(String(fd.get('studentCount') ?? '')));
  if (!phone || !school || !manager || !Number.isInteger(count)) return fail('همه‌ی چهار مورد را کامل بنویسید.');
  const rows = await db.select().from(purchaseRequests).where(and(eq(purchaseRequests.phone, phone), eq(purchaseRequests.kind, 'new')));
  const r = rows.find((x) => norm(x.schoolName) === school && norm(x.managerName) === manager && x.studentCount === count && x.status !== 'registered');
  if (!r) { recordFailure(key); return fail('اطلاعات با هیچ درخواستی یکی نبود. دقیقاً همان‌طور که هنگام ثبت نوشتید وارد کنید.'); }
  await audit(null, 'CODE_RECOVER', 'purchase', r.id, r.schoolName);
  return success(`کد پیگیری شما: ${r.trackingCode} — در صفحه‌ی ورود، موبایل را به‌جای نام کاربری و این کد را به‌جای رمز بنویسید.`);
}
