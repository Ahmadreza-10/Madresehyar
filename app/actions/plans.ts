'use server';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/db';
import { plans, purchaseRequests, schools } from '@/db/schema';
import { audit } from '@/lib/audit';
import { fail, firstZodError, run, success, type ActionState } from '@/lib/action';
import { extendedEnd, isExpired } from '@/lib/subscription';

const bump = () => { revalidatePath('/admin/plans'); revalidatePath('/admin/requests'); revalidatePath('/admin/schools'); revalidatePath('/register'); revalidatePath('/admin/settings'); revalidatePath('/', 'layout'); };
const faDigits = (s: string) => s.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[,،٬\s]/g, '');

/** عدد صحیح از رشته (ارقام فارسی و جداکننده‌ی هزارگان هم پذیرفته می‌شود) */
const intStr = (min: number, max: number, msg: string) => z.string().transform(faDigits).transform((v) => (v === '' ? NaN : Number(v))).pipe(z.number(msg).int(msg).min(min, msg).max(max, msg));

const planSchema = z.object({
  name: z.string().trim().min(2, 'نام تعرفه را بنویسید.').max(60), description: z.string().trim().max(300).optional(),
  price: intStr(0, 10_000_000_000, 'قیمت را فقط با عدد (۰ تا ۱۰ میلیارد) بنویسید.'),
  months: z.coerce.number().int().min(1, 'مدت باید حداقل ۱ ماه باشد.').max(60), maxStudents: intStr(0, 100000, 'سقف دانش‌آموز را با عدد بنویسید.'),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

/** ساخت یا ویرایش تعرفه (مدیران سامانه) */
export async function savePlan(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(['ADMIN'], async (u) => {
    const p = planSchema.safeParse(Object.fromEntries(fd)); if (!p.success) return fail(firstZodError(p.error));
    const d = p.data; const id = String(fd.get('id') ?? ''); const active = fd.get('active') === 'on' || !id;
    const vals = { name: d.name, description: d.description || null, priceToman: d.price, months: d.months, maxStudents: d.maxStudents, sortOrder: d.sortOrder, active };
    if (id) await db.update(plans).set(vals).where(eq(plans.id, id)); else await db.insert(plans).values(vals);
    await audit(u.id, id ? 'PLAN_UPDATE' : 'PLAN_CREATE', 'plan', id || undefined, d.name); bump();
    return success(id ? 'ذخیره شد.' : 'تعرفه ساخته شد.');
  });
}

/** بررسی درخواست: تأیید (با امکان تغییر قیمت/تخفیف) یا رد. تمدید با تأیید فوراً اعمال می‌شود. */
export async function reviewRequest(fd: FormData) {
  await run(['ADMIN'], async (u) => {
    const id = String(fd.get('id') ?? ''); const [r] = await db.select().from(purchaseRequests).where(eq(purchaseRequests.id, id)).limit(1);
    if (!r || r.status !== 'pending') return fail('این درخواست دیگر در انتظار نیست.');
    const approve = fd.get('decision') === 'approve'; const note = String(fd.get('note') ?? '').trim().slice(0, 500) || null;
    const priceRaw = faDigits(String(fd.get('price') ?? '')); const price = priceRaw === '' ? r.priceToman : Number(priceRaw);
    if (!Number.isInteger(price) || price < 0) return fail('قیمت نامعتبر است.');
    if (!approve) { await db.update(purchaseRequests).set({ status: 'rejected', adminNote: note, decidedBy: u.id, decidedAt: new Date() }).where(eq(purchaseRequests.id, id)); }
    else if (r.kind === 'renew' && r.schoolId) {
      const [plan] = r.planId ? await db.select().from(plans).where(eq(plans.id, r.planId)).limit(1) : [];
      const [sc] = await db.select().from(schools).where(eq(schools.id, r.schoolId)).limit(1);
      if (!plan || !sc) return fail('تعرفه یا مدرسه پیدا نشد.');
      await db.update(schools).set({ planId: plan.id, status: 'active', subscriptionEndsAt: extendedEnd(sc.subscriptionEndsAt, plan.months) }).where(eq(schools.id, sc.id));
      await db.update(purchaseRequests).set({ status: 'registered', priceToman: price, adminNote: note, decidedBy: u.id, decidedAt: new Date(), registeredAt: new Date() }).where(eq(purchaseRequests.id, id));
    } else await db.update(purchaseRequests).set({ status: 'approved', priceToman: price, adminNote: note, decidedBy: u.id, decidedAt: new Date() }).where(eq(purchaseRequests.id, id));
    await audit(u.id, approve ? 'PURCHASE_APPROVE' : 'PURCHASE_REJECT', 'purchase', id, r.schoolName); bump();
    return success();
  });
}

/** بررسی رسید پرداخت: تأیید (خریدار می‌تواند حساب مدیر را بسازد) یا برگرداندن با پیام */
export async function reviewPayment(fd: FormData) {
  await run(['ADMIN'], async (u) => {
    const id = String(fd.get('id') ?? ''); const [r] = await db.select().from(purchaseRequests).where(eq(purchaseRequests.id, id)).limit(1);
    if (!r || r.status !== 'payment_review') return fail('این پرداخت دیگر در انتظار بررسی نیست.');
    const ok = fd.get('decision') === 'confirm'; const note = String(fd.get('note') ?? '').trim().slice(0, 500) || null;
    if (ok) await db.update(purchaseRequests).set({ status: 'paid' }).where(eq(purchaseRequests.id, id));
    else await db.update(purchaseRequests).set({ status: 'approved', adminNote: note ?? 'پرداخت تأیید نشد؛ لطفاً دوباره بررسی و رسید را ثبت کنید.', payRef: null, payNote: null, paySubmittedAt: null }).where(eq(purchaseRequests.id, id));
    await audit(u.id, ok ? 'PAYMENT_CONFIRM' : 'PAYMENT_REJECT', 'purchase', id, r.schoolName); bump();
    return success();
  });
}

/** ویرایش پیام/راهنمای پرداخت (و قیمت، تا قبل از پرداخت) توسط ادمین */
export async function updateRequestNote(fd: FormData) {
  await run(['ADMIN'], async (u) => {
    const id = String(fd.get('id') ?? ''); const [r] = await db.select().from(purchaseRequests).where(eq(purchaseRequests.id, id)).limit(1);
    if (!r || r.kind !== 'new' || r.status === 'registered') return fail('این درخواست قابل ویرایش نیست.');
    const note = String(fd.get('note') ?? '').trim().slice(0, 500) || null; const set: { adminNote: string | null; priceToman?: number } = { adminNote: note };
    if (r.status === 'approved' && fd.get('price') !== null) { const raw = faDigits(String(fd.get('price'))); const price = raw === '' ? r.priceToman : Number(raw); if (!Number.isInteger(price) || price < 0) return fail('قیمت نامعتبر است.'); set.priceToman = price; }
    await db.update(purchaseRequests).set(set).where(eq(purchaseRequests.id, id));
    await audit(u.id, 'PURCHASE_NOTE_EDIT', 'purchase', id, r.schoolName); bump();
    return success();
  });
}

/** حذف کاملِ مدرسه (با همه‌ی داده‌هایش) — فقط وقتی اشتراکش تمام شده باشد */
export async function deleteSchool(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(['ADMIN'], async (u) => {
    const id = String(fd.get('id') ?? ''); const [sc] = await db.select().from(schools).where(eq(schools.id, id)).limit(1);
    if (!sc) return fail('مدرسه پیدا نشد.');
    if (!isExpired(sc.subscriptionEndsAt)) return fail('فقط مدرسه‌ای که اشتراکش تمام شده قابل حذف است.');
    try { await db.delete(schools).where(eq(schools.id, id)); }
    catch (e) { console.error('delete school failed', e); return fail('حذف انجام نشد؛ چون به داده‌های دیگری وابسته است.'); }
    await audit(u.id, 'SCHOOL_DELETE', 'school', id, sc.name); bump();
    return success(`مدرسه‌ی «${sc.name}» حذف شد.`);
  });
}

/** تمدید دستی اشتراک یک مدرسه توسط مدیر سامانه */
export async function extendSchool(fd: FormData) {
  await run(['ADMIN'], async (u) => {
    const id = String(fd.get('id') ?? ''); const months = Number(fd.get('months'));
    if (!Number.isInteger(months) || months < 1 || months > 60) return fail('مدت نامعتبر است.');
    const [sc] = await db.select().from(schools).where(eq(schools.id, id)).limit(1); if (!sc) return fail('مدرسه پیدا نشد.');
    await db.update(schools).set({ status: 'active', subscriptionEndsAt: extendedEnd(sc.subscriptionEndsAt, months) }).where(and(eq(schools.id, id)));
    await audit(u.id, 'SCHOOL_EXTEND', 'school', id, `${months} ماه`); bump();
    return success();
  });
}
