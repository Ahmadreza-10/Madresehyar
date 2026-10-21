import Link from 'next/link';
import { requestPasswordReset } from '@/app/actions/recover';
import ActionForm from '@/components/ActionForm';
import { LogoMark } from '@/components/Illus';

export const metadata = { title: 'فراموشی رمز عبور' };

export default function ForgotPage() {
  return (
    <main className="reg-page narrow">
      <header className="reg-head"><LogoMark size={44} /><div><b>مدرسه‌یار</b><span>فراموشی رمز عبور</span></div><Link href="/login" className="btn ghost sm">ورود</Link></header>
      <section className="card">
        <h2 style={{ marginBottom: 6 }}>رمزتان را فراموش کرده‌اید؟</h2>
        <ol className="muted small" style={{ paddingInlineStart: 18, margin: '0 0 14px', display: 'grid', gap: 4 }}>
          <li>نام کاربری (یا شماره‌ی موبایل) و نام خودتان را بنویسید.</li>
          <li>درخواست برای مدیر یا معاون مدرسه می‌رود.</li>
          <li>مدیر شما را می‌شناسد و یک رمز موقت به شما می‌دهد.</li>
          <li>با رمز موقت وارد می‌شوید و رمز تازه‌ی خودتان را می‌گذارید.</li>
        </ol>
        <ActionForm action={requestPasswordReset} submit="ارسال درخواست" resetOnSuccess>
          <div className="field"><label>نام کاربری یا شماره‌ی موبایل</label><input name="who" dir="ltr" required autoCapitalize="none" /></div>
          <div className="field"><label>نام و نام خانوادگی شما</label><input name="name" maxLength={80} autoComplete="name" /></div>
        </ActionForm>
        <p className="small muted" style={{ marginTop: 12 }}>خریدار هستید و کد پیگیری‌تان را گم کرده‌اید؟ <Link href="/register/recover">بازیابی کد پیگیری</Link></p>
      </section>
    </main>
  );
}
