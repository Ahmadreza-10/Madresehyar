import Link from 'next/link';
import { redirect } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { plans } from '@/db/schema';
import { submitRequest } from '@/app/actions/register';
import ActionForm from '@/components/ActionForm';
import { LogoMark } from '@/components/Illus';
import { fa, toman } from '@/lib/format';

export const metadata = { title: 'درخواست خرید' };
export const dynamic = 'force-dynamic';

const TYPES = ['ابتدایی', 'متوسطه‌ی اول', 'متوسطه‌ی دوم', 'هنرستان', 'پیش‌دبستانی', 'آموزشگاه / مرکز آموزشی', 'سایر'];

export default async function ApplyPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const sp = await searchParams;
  const [plan] = sp.plan ? await db.select().from(plans).where(and(eq(plans.id, sp.plan), eq(plans.active, true))).limit(1) : [];
  if (!plan) redirect('/register');
  return (
    <main className="reg-page">
      <header className="reg-head"><LogoMark size={44} /><div><b>مدرسه‌یار</b><span>درخواست خرید</span></div><Link href="/register" className="btn ghost sm">تغییر تعرفه</Link></header>
      <ol className="reg-steps"><li className="done">۱. انتخاب تعرفه</li><li className="on">۲. اطلاعات مدرسه و مدیر</li><li>۳. بررسی و تأیید</li><li>۴. ساخت حساب</li></ol>
      <div className="apply-grid">
        <aside className="card apply-summary">
          <span className="muted small">تعرفه‌ی انتخابی</span>
          <h2>{plan.name}</h2>
          <div className="plan-price">{toman(plan.priceToman)}</div>
          <div className="muted small">برای {fa(plan.months)} ماه</div>
          <ul><li>{plan.maxStudents > 0 ? `تا ${fa(plan.maxStudents)} دانش‌آموز` : 'دانش‌آموز نامحدود'}</li><li>همه‌ی امکانات سامانه</li>{plan.description && <li>{plan.description}</li>}</ul>
          <p className="hint-t">پرداختی در این مرحله انجام نمی‌شود. پس از بررسی ادمین با شما هماهنگ می‌شود.</p>
        </aside>
        <section className="card reg-form">
          <ActionForm action={submitRequest} submit="ثبت درخواست خرید">
            <input type="hidden" name="planId" value={plan.id} />
            <h3 className="reg-sec">اطلاعات مدرسه</h3>
            <div className="field"><label>نام مدرسه</label><input name="schoolName" required maxLength={80} /></div>
            <div className="inline-fields">
              <div className="field"><label>مقطع / نوع مرکز</label><select name="schoolType" defaultValue=""><option value="">انتخاب کنید</option>{TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
              <div className="field"><label>تعداد دانش‌آموزان</label><input name="studentCount" type="number" min={1} max={plan.maxStudents > 0 ? plan.maxStudents : 50000} required inputMode="numeric" /></div>
              <div className="field"><label>تعداد معلمان <span className="muted">(اختیاری)</span></label><input name="teacherCount" type="number" min={0} max={5000} inputMode="numeric" /></div>
            </div>
            <div className="inline-fields">
              <div className="field"><label>استان</label><input name="province" maxLength={60} /></div>
              <div className="field"><label>شهر</label><input name="city" maxLength={60} /></div>
            </div>
            <div className="field"><label>نشانی <span className="muted">(اختیاری)</span></label><input name="address" maxLength={250} /></div>
            <h3 className="reg-sec">اطلاعات مدیر</h3>
            <div className="field"><label>نام و نام خانوادگی مدیر</label><input name="managerName" required maxLength={60} autoComplete="name" /></div>
            <div className="inline-fields">
              <div className="field"><label>شماره‌ی موبایل</label><input name="phone" required dir="ltr" inputMode="tel" placeholder="09123456789" autoComplete="tel" /></div>
              <div className="field"><label>ایمیل <span className="muted">(اختیاری)</span></label><input name="email" type="email" dir="ltr" maxLength={100} autoComplete="email" /></div>
            </div>
            <div className="field"><label>توضیحات <span className="muted">(اختیاری)</span></label><textarea name="note" maxLength={500} /></div>
            <label className="check"><input type="checkbox" name="terms" required /> شرایط استفاده از سامانه را می‌پذیرم و اطلاعات واردشده را درست تأیید می‌کنم.</label>
          </ActionForm>
        </section>
      </div>
    </main>
  );
}
