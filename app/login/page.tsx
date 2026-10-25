import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import LoginForm from './LoginForm';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { LoginArt, LogoMark } from '@/components/Illus';
import InstallApp from '@/components/InstallApp';

export const metadata = { title: 'ورود' };
export const dynamic = 'force-dynamic';

const opt = (c: string) => ({ '--oc': c }) as CSSProperties;

export default async function LoginPage() {
  if (await getCurrentUser()) redirect('/dashboard');
  return (
    <main className="login-page login-simple">
      <section className="login-hero">
        <div className="row"><LogoMark size={46} /><div><b style={{ fontSize: '1.3rem' }}>مدرسه‌یار</b><span className="login-tag">سامانه‌ی مدیریت مدرسه</span></div></div>
        <div className="login-hero-text">
          <h1>مدرسه، معلم و دانش‌آموز؛ همه در یک سامانه</h1>
          <p>نمرات، حضور و غیاب، تکالیف و اطلاعیه‌ها در کنار گزارش مطالعه‌ی روزانه‌ی دانش‌آموزان.</p>
          <div className="hero-points">
            <div>📚 گزارش مطالعه‌ی روزانه</div><div>📊 کارنامه، رتبه و نمودار پیشرفت</div><div>🔐 هر مدرسه فقط داده‌های خودش را می‌بیند</div>
          </div>
          <LoginArt className="login-scene" />
        </div>
        <small className="login-hero-foot" style={{ opacity: .7 }}>سامانه‌ی چندمدرسه‌ای مدرسه‌یار</small>
      </section>
      <section className="login-box">
        <div className="login-card">
          <h2>ورود به سامانه</h2>
          <p className="muted login-help">نام کاربری و رمز عبوری که مدرسه به شما داده را بنویسید.</p>
          <LoginForm />
          <div className="login-opts" aria-label="گزینه‌های دیگر">
            <Link href="/forgot" className="login-opt" style={opt('#f59e0b')}><span aria-hidden="true">🔑</span>رمز عبورم را فراموش کرده‌ام</Link>
            <Link href="/register" className="login-opt" style={opt('#6366f1')}><span aria-hidden="true">🛒</span>تعرفه‌ها و خرید سامانه</Link>
            <Link href="/features" className="login-opt" style={opt('#14b8a6')}><span aria-hidden="true">✨</span>امکانات سامانه</Link>
            <Link href="/register/recover" className="login-opt" style={opt('#ec4899')}><span aria-hidden="true">🔎</span>کد پیگیری خرید را گم کرده‌ام</Link>
          </div>
          <div style={{ marginTop: 14 }}><InstallApp compact /></div>
          <details className="login-more">
            <summary>درخواست خرید داده‌اید؟</summary>
            <div className="login-more-body"><p className="muted small">همین‌جا با <b>شماره‌ی موبایل</b> (به‌جای نام کاربری) و <b>کد پیگیری</b> (به‌جای رمز) وارد شوید تا وضعیت درخواست را ببینید.</p></div>
          </details>
        </div>
      </section>
    </main>
  );
}
