import Link from 'next/link';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { plans } from '@/db/schema';
import { LogoMark } from '@/components/Illus';
import { fa, toman } from '@/lib/format';

export const metadata = { title: 'تعرفه‌ها و ثبت‌نام مدرسه' };
export const dynamic = 'force-dynamic';

export default async function RegisterPage() {
  const list = await db.select().from(plans).where(eq(plans.active, true)).orderBy(asc(plans.sortOrder), asc(plans.priceToman));
  return (
    <main className="reg-page">
      <header className="reg-head"><LogoMark size={44} /><div><b>مدرسه‌یار</b><span>خرید و ثبت‌نام مدرسه</span></div><Link href="/login" className="btn ghost sm">ورود</Link></header>
      <section className="reg-intro"><h1>سامانه‌ی مدرسه‌ی خودتان را راه بیندازید</h1><p>نمرات، حضور و غیاب، تکالیف، برنامه‌ی هفتگی، گزارش مطالعه و پیام‌رسان گروهی؛ همه برای مدیر، معلم، دانش‌آموز و ولی. تعرفه را انتخاب کنید و درخواست بدهید؛ پس از تأیید، ثبت‌نام را کامل می‌کنید.</p></section>
      {list.length === 0 ? <div className="card"><p className="muted">هنوز تعرفه‌ای منتشر نشده است. بعداً سر بزنید یا با پشتیبانی تماس بگیرید.</p></div> : (
        <section className="plan-grid">{list.map((p, i) => (
          <article key={p.id} className={`plan-card${i === 1 && list.length > 2 ? ' on' : ''}`}>
            {i === 1 && list.length > 2 && <span className="plan-flag">پیشنهادی</span>}
            <h3>{p.name}</h3>
            <div className="plan-price">{toman(p.priceToman)}</div>
            <div className="muted small">برای {fa(p.months)} ماه</div>
            <ul><li>{p.maxStudents > 0 ? `تا ${fa(p.maxStudents)} دانش‌آموز` : 'دانش‌آموز نامحدود'}</li><li>همه‌ی امکانات سامانه</li>{p.description && <li>{p.description}</li>}</ul>
            <Link href={`/register/apply?plan=${p.id}`} className={`btn${i === 1 || list.length < 3 ? '' : ' ghost'}`}>انتخاب و ادامه</Link>
          </article>))}</section>)}
      <p className="small" style={{ textAlign: 'center' }}>قبلاً درخواست داده‌اید؟ <Link href="/register/status">پیگیری وضعیت و تکمیل ثبت‌نام</Link></p>
    </main>
  );
}
