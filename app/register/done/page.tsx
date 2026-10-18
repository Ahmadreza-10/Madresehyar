import Link from 'next/link';
import { LogoMark } from '@/components/Illus';

export const metadata = { title: 'درخواست ثبت شد' };

export default async function DonePage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  return (
    <main className="reg-page narrow">
      <header className="reg-head"><LogoMark size={44} /><div><b>مدرسه‌یار</b><span>درخواست خرید</span></div></header>
      <ol className="reg-steps"><li className="done">۱. انتخاب تعرفه</li><li className="done">۲. اطلاعات</li><li className="on">۳. بررسی و تأیید</li><li>۴. ساخت حساب</li></ol>
      <section className="card" style={{ textAlign: 'center', display: 'grid', gap: 10 }}>
        <h2>درخواست شما ثبت شد</h2>
        <p className="muted">کد پیگیری خود را یادداشت کنید:</p>
        <div className="track-code" dir="ltr">{code ?? '—'}</div>
        <p className="small">پس از بررسی و تأیید ادمین، با همین کد و شماره‌ی موبایل مدیر می‌توانید ثبت‌نام را کامل کنید.</p>
        <div className="row" style={{ justifyContent: 'center' }}><Link className="btn" href={`/register/status${code ? `?code=${encodeURIComponent(code)}` : ''}`}>پیگیری وضعیت</Link><Link className="btn ghost" href="/login">ورود</Link></div>
      </section>
    </main>
  );
}
