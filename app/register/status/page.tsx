import Link from 'next/link';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { plans } from '@/db/schema';
import { applicantLogout, completeRegistration, submitPayment, updateApplication } from '@/app/actions/register';
import ActionForm from '@/components/ActionForm';
import { LogoMark } from '@/components/Illus';
import { getApplication } from '@/lib/applicant';
import { fa, formatJalali, toman } from '@/lib/format';
import { Badge } from '@/components/ui';
import ApplicationFields from '@/components/ApplicationFields';
import { PASSWORD_HINT } from '@/lib/password-policy';

export const metadata = { title: 'وضعیت درخواست من' };
export const dynamic = 'force-dynamic';

const STEPS = ['درخواست', 'تأیید ادمین', 'پرداخت', 'تأیید پرداخت', 'ساخت حساب مدیر'];
const STEP_OF = { pending: 1, approved: 2, payment_review: 3, paid: 4, registered: 5, rejected: 1 } as const;
const LABEL = { pending: 'در انتظار بررسی', approved: 'تأیید شد؛ منتظر پرداخت', payment_review: 'پرداخت در حال بررسی', paid: 'پرداخت تأیید شد', rejected: 'رد شد', registered: 'ثبت‌نام کامل شد' } as const;
const TONE = { pending: 'warn', approved: 'ok', payment_review: 'warn', paid: 'ok', rejected: 'danger', registered: 'primary' } as const;

export default async function StatusPage() {
  const r = await getApplication();
  if (!r) redirect('/login');
  const [plan] = r.planId ? await db.select().from(plans).where(eq(plans.id, r.planId)).limit(1) : [];
  const at = STEP_OF[r.status];
  return (
    <main className="reg-page narrow">
      <header className="reg-head"><LogoMark size={44} /><div><b>مدرسه‌یار</b><span>وضعیت درخواست من</span></div>
        <form action={applicantLogout}><button className="btn ghost sm">خروج</button></form></header>
      <ol className="reg-steps">{STEPS.map((t, i) => <li key={t} className={r.status !== 'rejected' && i + 1 < at ? 'done' : i + 1 === at ? (r.status === 'rejected' ? 'bad' : 'on') : ''}>{fa(i + 1)}. {t}</li>)}</ol>
      <section className="card">
        <div className="row between"><h3>{r.schoolName}</h3><Badge tone={TONE[r.status]}>{LABEL[r.status]}</Badge></div>
        <div className="muted small" style={{ margin: '6px 0 10px' }}>{r.managerName} • ثبت‌شده در {formatJalali(r.createdAt.toISOString().slice(0, 10))}{plan ? ` • تعرفه‌ی ${plan.name}` : ''} • کد: <span dir="ltr">{r.trackingCode}</span></div>
        <div className="plan-price" style={{ fontSize: '1.2rem' }}>{toman(r.priceToman)}</div>

        {r.status === 'pending' && <p className="muted" style={{ marginTop: 12 }}>درخواست شما در صف بررسی ادمین است. هر زمان بخواهید با همان شماره‌ی موبایل و کد پیگیری دوباره وارد شوید و وضعیت را ببینید.</p>}

        {r.status === 'rejected' && <div style={{ marginTop: 12 }}><div className="alert error">درخواست شما پذیرفته نشد.{r.adminNote ? ` پیام ادمین: ${r.adminNote}` : ''}</div><p className="small" style={{ marginTop: 10 }}>می‌توانید با اصلاحات، <Link href="/register">درخواست تازه‌ای</Link> ثبت کنید.</p></div>}

        {r.status === 'approved' && (
          <div style={{ marginTop: 14 }}>
            <div className="feedback"><b>درخواست شما تأیید شد.</b> مبلغ بالا را طبق راهنمای زیر پرداخت کنید و سپس رسید را ثبت کنید.</div>
            <div className="pay-box"><b>راهنمای پرداخت</b><p>{r.adminNote ? r.adminNote : 'ادمین به‌زودی راهنمای پرداخت (شماره‌ی کارت/حساب) را اعلام می‌کند؛ اگر پیامی نمی‌بینید با پشتیبانی تماس بگیرید.'}</p></div>
            <h3 style={{ margin: '14px 0 8px' }}>ثبت رسید پرداخت</h3>
            <ActionForm action={submitPayment} submit="ثبت رسید و ارسال برای بررسی" resetOnSuccess={false}>
              <div className="field"><label>شماره‌ی پیگیری پرداخت <span className="muted">(یا چهار رقم آخر کارت مبدأ)</span></label><input name="ref" dir="ltr" required minLength={4} maxLength={40} inputMode="numeric" /></div>
              <div className="field"><label>توضیحات <span className="muted">(اختیاری؛ مثلاً ساعت و تاریخ واریز)</span></label><input name="note" maxLength={300} /></div>
            </ActionForm>
          </div>)}

        {r.status === 'payment_review' && (
          <div style={{ marginTop: 12 }}>
            <div className="feedback">رسید شما ثبت شد. ادمین پرداخت را بررسی می‌کند؛ پس از تأیید، همین‌جا حساب مدیر خود را می‌سازید.{r.adminNote ? <><br />پیام ادمین: {r.adminNote}</> : null}</div>
            <details style={{ marginTop: 10 }}><summary className="btn ghost sm" style={{ display: 'inline-flex' }}>ویرایش رسید</summary>
              <ActionForm action={submitPayment} submit="ذخیره‌ی ویرایش" resetOnSuccess={false}>
                <div className="field"><label>شماره‌ی پیگیری پرداخت</label><input name="ref" dir="ltr" required minLength={4} maxLength={40} defaultValue={r.payRef ?? ''} /></div>
                <div className="field"><label>توضیحات</label><input name="note" maxLength={300} defaultValue={r.payNote ?? ''} /></div>
              </ActionForm></details>
          </div>)}

        {r.status === 'paid' && (
          <div style={{ marginTop: 14 }}>
            <div className="feedback"><b>پرداخت شما تأیید شد.</b> نام کاربری و رمز عبور را انتخاب کنید تا مدرسه‌ی شما ساخته شود و مدیر آن شوید.</div>
            <ActionForm action={completeRegistration} submit="ساخت مدرسه و حساب مدیر" resetOnSuccess={false}>
              <div className="field"><label>نام کاربری (انگلیسی)</label><input name="username" dir="ltr" required defaultValue={r.phone} autoCapitalize="none" autoComplete="username" /></div>
              <p className="hint-t">{PASSWORD_HINT}</p>
              <div className="inline-fields"><div className="field"><label>رمز عبور</label><input name="password" type="password" dir="ltr" minLength={10} required autoComplete="new-password" /></div>
                <div className="field"><label>تکرار رمز</label><input name="again" type="password" dir="ltr" minLength={10} required autoComplete="new-password" /></div></div>
            </ActionForm>
          </div>)}

        {r.status === 'registered' && <p style={{ marginTop: 12 }}>ثبت‌نام کامل شده است. <Link href="/login">ورود به سامانه</Link></p>}
      </section>
      {r.status !== 'registered' && r.status !== 'rejected' && (
        <details className="card"><summary style={{ cursor: 'pointer', fontWeight: 700 }}>ویرایش اطلاعات درخواست</summary>
          <ActionForm action={updateApplication} submit="ذخیره‌ی تغییرات" resetOnSuccess={false}>
            <ApplicationFields v={r} maxStudents={plan?.maxStudents ?? 0} />
          </ActionForm></details>)}
      <p className="small" style={{ textAlign: 'center' }}>مدیر دسترسی به سامانه فقط پس از تأیید پرداخت فعال می‌شود. <Link href="/features">دیدن امکانات سامانه</Link></p>
    </main>
  );
}
