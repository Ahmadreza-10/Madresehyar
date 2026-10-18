import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import LoginForm from './LoginForm';
import { LoginArt, LogoMark } from '@/components/Illus';

export const metadata = { title: 'ورود' };
export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  if (await getCurrentUser()) redirect('/dashboard');
  return (
    <main className="login-page">
      <section className="login-hero">
        <div className="row"><LogoMark size={46} /><div><b style={{ fontSize: '1.3rem' }}>مدرسه‌یار</b><span className="login-tag">سامانه‌ی مدیریت مدرسه</span></div></div>
        <div>
          <h1>مدرسه، معلم و دانش‌آموز؛ همه در یک سامانه</h1>
          <p>نمرات، حضور و غیاب، تکالیف و اطلاعیه‌ها در کنار گزارش مطالعه‌ی روزانه‌ی دانش‌آموزان.</p>
          <div className="hero-points">
            <div>📚 گزارش مطالعه‌ی روزانه</div><div>📊 کارنامه، رتبه و نمودار پیشرفت</div><div>🔐 هر مدرسه فقط داده‌های خودش را می‌بیند</div>
          </div>
          <LoginArt className="login-scene" />
        </div>
        <small style={{ opacity: .7 }}>سامانه‌ی چندمدرسه‌ای مدرسه‌یار</small>
      </section>
      <section className="login-box"><div className="login-card"><h2 style={{ marginBottom: 6 }}>ورود</h2><p className="muted" style={{ marginBottom: 22 }}>نام کاربری و رمز عبوری که مدیر مدرسه به شما داده را وارد کنید.</p><LoginForm /><p className="login-reg">مدیر مدرسه هستید و می‌خواهید سامانه را برای مدرسه‌تان بخرید؟ <a href="/register">تعرفه‌ها و ثبت‌نام</a></p></div></section>
    </main>
  );
}
