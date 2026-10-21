import Link from 'next/link';
import { recoverTrackingCode } from '@/app/actions/recover';
import ActionForm from '@/components/ActionForm';
import { LogoMark } from '@/components/Illus';

export const metadata = { title: 'بازیابی کد پیگیری' };

export default function RecoverPage() {
  return (
    <main className="reg-page narrow">
      <header className="reg-head"><LogoMark size={44} /><div><b>مدرسه‌یار</b><span>بازیابی کد پیگیری</span></div><Link href="/login" className="btn ghost sm">ورود</Link></header>
      <section className="card">
        <h2 style={{ marginBottom: 6 }}>کد پیگیری‌تان را گم کرده‌اید؟</h2>
        <p className="muted small" style={{ marginBottom: 12 }}>همان اطلاعاتی را بنویسید که هنگام ثبت درخواست خرید وارد کردید. اگر درست باشد، کد نمایش داده می‌شود.</p>
        <ActionForm action={recoverTrackingCode} submit="نمایش کد پیگیری" resetOnSuccess={false}>
          <div className="field"><label>شماره‌ی موبایل مدیر</label><input name="phone" dir="ltr" inputMode="tel" required placeholder="09123456789" /></div>
          <div className="field"><label>نام مدرسه</label><input name="schoolName" required /></div>
          <div className="field"><label>نام و نام خانوادگی مدیر</label><input name="managerName" required /></div>
          <div className="field"><label>تعداد دانش‌آموزان</label><input name="studentCount" inputMode="numeric" required /></div>
        </ActionForm>
      </section>
    </main>
  );
}
