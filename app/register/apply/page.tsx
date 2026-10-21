import Link from 'next/link';
import { redirect } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { plans } from '@/db/schema';
import { submitRequest } from '@/app/actions/register';
import ActionForm from '@/components/ActionForm';
import { LogoMark } from '@/components/Illus';
import { fa, toman } from '@/lib/format';
import ApplicationFields from '@/components/ApplicationFields';

export const metadata = { title: 'درخواست خرید' };
export const dynamic = 'force-dynamic';

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
            <ApplicationFields maxStudents={plan.maxStudents} />
            <label className="check"><input type="checkbox" name="terms" required /> شرایط استفاده از سامانه را می‌پذیرم و اطلاعات واردشده را درست تأیید می‌کنم.</label>
          </ActionForm>
        </section>
      </div>
    </main>
  );
}
