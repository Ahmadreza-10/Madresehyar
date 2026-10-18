import Link from 'next/link';
import { completeRegistration } from '@/app/actions/register';
import ActionForm from '@/components/ActionForm';
import { LogoMark } from '@/components/Illus';
import { lookupRequest } from '@/lib/purchase';
import { formatJalali, toman, fa } from '@/lib/format';
import { Badge } from '@/components/ui';

export const metadata = { title: 'پیگیری درخواست' };
export const dynamic = 'force-dynamic';
const LABEL = { pending: 'در انتظار بررسی', approved: 'تأیید شد', rejected: 'رد شد', registered: 'ثبت‌نام کامل شد' } as const;
const TONE = { pending: 'warn', approved: 'ok', rejected: 'danger', registered: 'primary' } as const;

export default async function StatusPage({ searchParams }: { searchParams: Promise<{ code?: string; phone?: string }> }) {
  const sp = await searchParams; const asked = !!(sp.code && sp.phone);
  const res = asked ? await lookupRequest(sp.code!, sp.phone!) : null;
  const r = res && 'r' in res ? res.r : null;
  return (
    <main className="reg-page narrow">
      <header className="reg-head"><LogoMark size={44} /><div><b>مدرسه‌یار</b><span>پیگیری درخواست</span></div><Link href="/register" className="btn ghost sm">تعرفه‌ها</Link></header>
      <section className="card">
        <form className="form" action="/register/status" method="get">
          <div className="field"><label>کد پیگیری</label><input name="code" defaultValue={sp.code ?? ''} dir="ltr" required autoCapitalize="characters" placeholder="مثلاً K7M2QX9TBA" /></div>
          <div className="field"><label>شماره‌ی موبایل مدیر</label><input name="phone" defaultValue={sp.phone ?? ''} dir="ltr" inputMode="tel" required placeholder="09123456789" /></div>
          <button className="btn">نمایش وضعیت</button>
        </form>
      </section>
      {res && 'error' in res && <div className="alert error" style={{ marginTop: 14 }}>{res.error}</div>}
      {r && (
        <section className="card" style={{ marginTop: 14 }}>
          <div className="row between"><h3>{r.schoolName}</h3><Badge tone={TONE[r.status]}>{LABEL[r.status]}</Badge></div>
          <div className="muted small" style={{ margin: '6px 0 10px' }}>{r.managerName} • ثبت‌شده در {formatJalali(r.createdAt.toISOString().slice(0, 10))}{res && 'planName' in res && res.planName ? ` • تعرفه‌ی ${res.planName}` : ''}</div>
          <div className="plan-price" style={{ fontSize: '1.2rem' }}>{toman(r.priceToman)}</div>
          {r.adminNote && <div className="feedback" style={{ marginTop: 10 }}><b>پیام ادمین:</b> {r.adminNote}</div>}
          {r.status === 'pending' && <p className="muted small" style={{ marginTop: 10 }}>درخواست شما در صف بررسی است. پس از تأیید، همین صفحه فرم تکمیل ثبت‌نام را نشان می‌دهد.</p>}
          {r.status === 'rejected' && <p className="muted small" style={{ marginTop: 10 }}>متأسفانه درخواست پذیرفته نشد. می‌توانید با اصلاحات، درخواست جدیدی بدهید.</p>}
          {r.status === 'registered' && <p style={{ marginTop: 10 }}>ثبت‌نام کامل شده است. <Link href="/login">ورود به سامانه</Link></p>}
          {r.status === 'approved' && r.kind === 'new' && (
            <div style={{ marginTop: 14 }}><h3 style={{ marginBottom: 8 }}>تکمیل ثبت‌نام</h3><p className="muted small" style={{ marginBottom: 10 }}>درخواست شما تأیید شد. نام کاربری و رمز حساب مدیر مدرسه را تعیین کنید ({fa(r.studentCount)} دانش‌آموز).</p>
              <ActionForm action={completeRegistration} submit="ساخت مدرسه و حساب مدیر" resetOnSuccess={false}>
                <input type="hidden" name="code" value={r.trackingCode} /><input type="hidden" name="phone" value={r.phone} />
                <div className="field"><label>نام کاربری (انگلیسی)</label><input name="username" dir="ltr" required autoCapitalize="none" autoComplete="username" /></div>
                <div className="inline-fields"><div className="field"><label>رمز عبور</label><input name="password" type="password" dir="ltr" minLength={8} required autoComplete="new-password" /></div>
                  <div className="field"><label>تکرار رمز</label><input name="again" type="password" dir="ltr" minLength={8} required autoComplete="new-password" /></div></div>
              </ActionForm></div>)}
        </section>)}
    </main>
  );
}
