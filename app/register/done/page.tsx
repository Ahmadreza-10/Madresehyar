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
        <p className="small">برای پیگیری، در <b>صفحه‌ی ورود</b> «شماره‌ی موبایل» را به‌عنوان نام کاربری و «این کد» را به‌جای رمز عبور بنویسید. بعد از تأیید ادمین پرداخت می‌کنید، و پس از تأیید پرداخت، مدیر مدرسه می‌شوید.</p>
        <div className="row" style={{ justifyContent: 'center' }}><Link className="btn" href="/login">رفتن به صفحه‌ی ورود</Link><Link className="btn ghost" href="/features">امکانات سامانه</Link></div>
      </section>
    </main>
  );
}
