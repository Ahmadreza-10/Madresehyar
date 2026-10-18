'use server';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/db';
import { plans, purchaseRequests, schools, users } from '@/db/schema';
import { audit } from '@/lib/audit';
import { fail, firstZodError, run, success, type ActionState } from '@/lib/action';
import { normalizeMobile } from '@/lib/image-check';
import { checkLogin, recordFailure } from '@/lib/rate-limit';
import { addMonths, trackingCode } from '@/lib/subscription';
import { schoolOf } from '@/lib/permissions';

const ip = async () => (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
const newCode = () => trackingCode((n) => crypto.randomBytes(n));

/** ثبت درخواست خرید توسط مدیرِ مدرسه (بدون نیاز به ورود). قیمت از تعرفه کپی می‌شود. */
export async function submitRequest(_: ActionState, fd: FormData): Promise<ActionState> {
  const key = `reqsubmit|${await ip()}`;
  const gate = checkLogin(key); if (!gate.ok) return fail(`تعداد درخواست‌ها زیاد بود. ${gate.retryMin} دقیقه‌ی دیگر دوباره امتحان کنید.`);
  const p = z.object({
    schoolName: z.string().trim().min(2, 'نام مدرسه را بنویسید.').max(80), managerName: z.string().trim().min(3, 'نام و نام خانوادگی مدیر را بنویسید.').max(60),
    phone: z.string().trim().min(1, 'شماره‌ی موبایل را بنویسید.'), province: z.string().trim().max(60).optional(), address: z.string().trim().max(250).optional(), schoolType: z.string().trim().max(40).optional(), email: z.union([z.literal(''), z.string().trim().email('ایمیل معتبر نیست.').max(100)]).optional(), teacherCount: z.coerce.number().int().min(0).max(5000).optional(), terms: z.literal('on', { error: 'پذیرش شرایط استفاده الزامی است.' }), city: z.string().trim().max(60).optional(), planId: z.string().min(1, 'یک تعرفه را انتخاب کنید.'),
    studentCount: z.coerce.number().int('تعداد دانش‌آموز را درست بنویسید.').min(1, 'تعداد دانش‌آموزان را بنویسید.').max(50000), note: z.string().trim().max(500).optional(),
  }).safeParse(Object.fromEntries(fd));
  if (!p.success) return fail(firstZodError(p.error));
  const d = p.data; const phone = normalizeMobile(d.phone); if (!phone) return fail('شماره‌ی موبایل معتبر نیست (مثلاً ۰۹۱۲۳۴۵۶۷۸۹).');
  recordFailure(key); // شمارنده‌ی ارسال در هر IP
  const [plan] = await db.select().from(plans).where(and(eq(plans.id, d.planId), eq(plans.active, true))).limit(1);
  if (!plan) return fail('این تعرفه دیگر موجود نیست.');
  if (plan.maxStudents > 0 && d.studentCount > plan.maxStudents) return fail(`این تعرفه تا ${plan.maxStudents} دانش‌آموز را پوشش می‌دهد؛ تعرفه‌ی بزرگ‌تری انتخاب کنید.`);
  const dup = await db.select({ id: purchaseRequests.id }).from(purchaseRequests).where(and(eq(purchaseRequests.phone, phone), eq(purchaseRequests.kind, 'new'), eq(purchaseRequests.status, 'pending'))).limit(1);
  if (dup.length) return fail('برای این شماره درخواستی در حال بررسی است. منتظر تماس بمانید یا با کد پیگیری، وضعیت را ببینید.');
  const code = newCode();
  const [r] = await db.insert(purchaseRequests).values({ trackingCode: code, kind: 'new', planId: plan.id, schoolName: d.schoolName, managerName: d.managerName, phone, city: d.city || null, province: d.province || null, address: d.address || null, schoolType: d.schoolType || null, email: d.email || null, teacherCount: d.teacherCount ?? 0, studentCount: d.studentCount, note: d.note || null, priceToman: plan.priceToman }).returning({ id: purchaseRequests.id });
  await audit(null, 'PURCHASE_REQUEST', 'purchase', r.id, d.schoolName);
  redirect(`/register/done?code=${code}`);
}

/** تمدید اشتراک توسط مدیر مدرسه (نیاز به ورود) */
export async function requestRenewal(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(['PRINCIPAL'], async (u) => {
    const planId = String(fd.get('planId') ?? ''); const [plan] = await db.select().from(plans).where(and(eq(plans.id, planId), eq(plans.active, true))).limit(1);
    if (!plan) return fail('یک تعرفه را انتخاب کنید.');
    const open = await db.select({ id: purchaseRequests.id }).from(purchaseRequests).where(and(eq(purchaseRequests.schoolId, schoolOf(u)), eq(purchaseRequests.kind, 'renew'), eq(purchaseRequests.status, 'pending'))).limit(1);
    if (open.length) return fail('یک درخواست تمدید در حال بررسی دارید.');
    const [sc] = await db.select({ name: schools.name }).from(schools).where(eq(schools.id, schoolOf(u))).limit(1);
    const phone = normalizeMobile(u.phone ?? '') ?? '';
    const [r] = await db.insert(purchaseRequests).values({ trackingCode: newCode(), kind: 'renew', planId: plan.id, schoolId: schoolOf(u), schoolName: sc?.name ?? '', managerName: `${u.firstName} ${u.lastName}`, phone, studentCount: 0, note: String(fd.get('note') ?? '').trim().slice(0, 500) || null, priceToman: plan.priceToman }).returning({ id: purchaseRequests.id });
    await audit(u.id, 'RENEW_REQUEST', 'purchase', r.id, plan.name);
    revalidatePath('/admin/settings'); revalidatePath('/admin/requests');
    return success('درخواست تمدید ثبت شد. پس از تأیید، اشتراک شما به‌صورت خودکار تمدید می‌شود.');
  });
}

/** تکمیل ثبت‌نام پس از تأیید ادمین: ساخت مدرسه و حساب مدیر */
export async function completeRegistration(_: ActionState, fd: FormData): Promise<ActionState> {
  const key = `regdone|${await ip()}`; const gate = checkLogin(key); if (!gate.ok) return fail(`تلاش‌های ناموفق زیاد بود. ${gate.retryMin} دقیقه‌ی دیگر دوباره امتحان کنید.`);
  const code = String(fd.get('code') ?? '').trim().toUpperCase(); const phone = normalizeMobile(String(fd.get('phone') ?? ''));
  const [r] = phone ? await db.select().from(purchaseRequests).where(and(eq(purchaseRequests.trackingCode, code), eq(purchaseRequests.phone, phone))).limit(1) : [];
  if (!r || r.kind !== 'new') { recordFailure(key); return fail('کد پیگیری یا شماره‌ی موبایل درست نیست.'); }
  if (r.status !== 'approved') return fail(r.status === 'registered' ? 'ثبت‌نام این درخواست قبلاً کامل شده است؛ وارد شوید.' : 'این درخواست هنوز تأیید نشده است.');
  const username = String(fd.get('username') ?? '').trim().toLowerCase(); const password = String(fd.get('password') ?? ''); const again = String(fd.get('again') ?? '');
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) return fail('نام کاربری فقط حروف انگلیسی، عدد و ._- (۳ تا ۳۰ نویسه) باشد.');
  if (password.length < 8) return fail('رمز عبور باید حداقل ۸ نویسه باشد.'); if (password !== again) return fail('تکرار رمز یکسان نیست.');
  if ((await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1)).length) return fail('این نام کاربری گرفته شده است؛ نام دیگری انتخاب کنید.');
  const [plan] = r.planId ? await db.select().from(plans).where(eq(plans.id, r.planId)).limit(1) : [];
  const parts = r.managerName.split(/\s+/); const firstName = parts[0]; const lastName = parts.slice(1).join(' ') || '—';
  // ادعای یک‌باره: فقط اگر هنوز approved است به registered تبدیل می‌شود (جلوگیری از ثبت‌نام دوباره با دو درخواست هم‌زمان)
  const claim = await db.update(purchaseRequests).set({ status: 'registered', registeredAt: new Date() }).where(and(eq(purchaseRequests.id, r.id), eq(purchaseRequests.status, 'approved'))).returning({ id: purchaseRequests.id });
  if (!claim.length) return fail('این درخواست قبلاً استفاده شده است.');
  try {
    const [sc] = await db.insert(schools).values({ name: r.schoolName, planId: plan?.id ?? null, subscriptionEndsAt: plan ? addMonths(new Date(), plan.months) : null }).returning({ id: schools.id });
    const [u] = await db.insert(users).values({ username, passwordHash: await bcrypt.hash(password, 10), firstName, lastName, role: 'PRINCIPAL', schoolId: sc.id, phone: r.phone }).returning({ id: users.id });
    await db.update(purchaseRequests).set({ createdSchoolId: sc.id }).where(eq(purchaseRequests.id, r.id));
    await audit(u.id, 'SCHOOL_REGISTERED', 'school', sc.id, r.schoolName);
  } catch (e) {
    console.error('register failed', e); await db.update(purchaseRequests).set({ status: 'approved', registeredAt: null }).where(eq(purchaseRequests.id, r.id));
    return fail('ثبت‌نام انجام نشد؛ دوباره تلاش کنید.');
  }
  redirect('/login?registered=1');
}
