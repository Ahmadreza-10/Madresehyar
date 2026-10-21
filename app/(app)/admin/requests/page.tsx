import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { plans, purchaseRequests } from '@/db/schema';
import { reviewPayment, reviewRequest, updateRequestNote } from '@/app/actions/plans';
import { requireUser } from '@/lib/auth';
import { fa, formatJalali, toman } from '@/lib/format';
import { Badge, Card, Empty, PageHead } from '@/components/ui';

export const metadata = { title: 'درخواست‌های ثبت‌نام' };
const LABEL = { pending: 'در انتظار', approved: 'تأیید شد (منتظر پرداخت خریدار)', payment_review: 'رسید پرداخت در انتظار بررسی', paid: 'پرداخت تأیید شد (منتظر ساخت حساب)', rejected: 'رد شد', registered: 'تکمیل شد' } as const;
const TONE = { pending: 'warn', approved: 'ok', payment_review: 'warn', paid: 'ok', rejected: 'danger', registered: 'primary' } as const;

function EditNote({ id, note, price }: { id: string; note: string | null; price?: number }) {
  return (
    <details style={{ marginTop: 8 }}><summary className="btn ghost sm" style={{ display: 'inline-flex' }}>ویرایش پیام{price !== undefined ? ' / قیمت' : ''}</summary>
      <form action={updateRequestNote} className="stack" style={{ maxWidth: 520, marginTop: 8 }}>
        <input type="hidden" name="id" value={id} />
        {price !== undefined && <div className="field"><label>قیمت نهایی (تومان)</label><input name="price" defaultValue={price} inputMode="numeric" dir="ltr" /></div>}
        <div className="field"><label>پیام / راهنمای پرداخت برای خریدار</label><textarea name="note" defaultValue={note ?? ''} maxLength={500} /></div>
        <div className="row"><button className="btn sm">ذخیره</button></div>
      </form>
    </details>
  );
}

export default async function RequestsPage() {
  await requireUser(['ADMIN']);
  const rows = await db.select({ r: purchaseRequests, plan: plans.name, months: plans.months }).from(purchaseRequests).leftJoin(plans, eq(plans.id, purchaseRequests.planId)).orderBy(desc(purchaseRequests.createdAt)).limit(200);
  const pending = rows.filter((x) => x.r.status === 'pending'); const pay = rows.filter((x) => x.r.status === 'payment_review'); const done = rows.filter((x) => x.r.status !== 'pending' && x.r.status !== 'payment_review');
  return (
    <>
      <PageHead illus="school" title="درخواست‌های ثبت‌نام و تمدید" sub={`${fa(pending.length)} درخواست و ${fa(pay.length)} پرداخت در انتظار`} />
      <div className="stack">
        {pay.map(({ r, plan }) => (
          <Card key={r.id} title={`پرداخت: ${r.schoolName}`} action={<Badge tone="warn">بررسی رسید</Badge>}>
            <div className="muted small" style={{ marginBottom: 8 }}>{r.managerName} • <span dir="ltr">{r.phone}</span> • {plan ?? '—'} • <b>{toman(r.priceToman)}</b></div>
            <p className="small">شماره‌ی پیگیری خریدار: <b dir="ltr">{r.payRef}</b>{r.payNote ? ` — ${r.payNote}` : ''}</p>
            <form action={reviewPayment} className="stack" style={{ maxWidth: 520, marginTop: 8 }}>
              <input type="hidden" name="id" value={r.id} />
              <div className="field"><label>پیام برای خریدار در صورت عدم تأیید (اختیاری)</label><input name="note" maxLength={500} /></div>
              <div className="row"><button className="btn sm" name="decision" value="confirm">تأیید پرداخت</button><button className="btn danger sm" name="decision" value="bounce">پرداخت تأیید نشد</button></div>
            </form>
            <EditNote id={r.id} note={r.adminNote} />
          </Card>))}
        {pending.length ? pending.map(({ r, plan, months }) => (
          <Card key={r.id} title={r.schoolName} action={<Badge tone="warn">{r.kind === 'renew' ? 'تمدید' : 'جدید'}</Badge>}>
            <div className="muted small" style={{ marginBottom: 8 }}>{r.managerName} • <span dir="ltr">{r.phone}</span>{[r.province, r.city].filter(Boolean).length ? ` • ${[r.province, r.city].filter(Boolean).join('، ')}` : ''}{r.email ? ` • ${r.email}` : ''} • {formatJalali(r.createdAt.toISOString().slice(0, 10))}</div>
            <div className="chips" style={{ marginBottom: 8 }}><Badge tone="primary">{plan ?? 'تعرفه‌ی حذف‌شده'}{months ? ` • ${fa(months)} ماه` : ''}</Badge>{r.kind === 'new' && <Badge>{fa(r.studentCount)} دانش‌آموز</Badge>}{r.teacherCount > 0 && <Badge>{fa(r.teacherCount)} معلم</Badge>}{r.schoolType && <Badge>{r.schoolType}</Badge>}<Badge tone="ok">{toman(r.priceToman)}</Badge><Badge>کد: {r.trackingCode}</Badge></div>
            {r.address && <p className="muted small" style={{ marginBottom: 6 }}>نشانی: {r.address}</p>}
            {r.note && <p className="small" style={{ whiteSpace: 'pre-wrap', marginBottom: 8 }}>{r.note}</p>}
            <form action={reviewRequest} className="stack" style={{ maxWidth: 520 }}>
              <input type="hidden" name="id" value={r.id} />
              <div className="inline-fields"><div className="field"><label>قیمت نهایی (تومان) — برای تخفیف تغییر دهید</label><input name="price" defaultValue={r.priceToman} inputMode="numeric" dir="ltr" /></div></div>
              <div className="field"><label>راهنمای پرداخت برای خریدار (شماره کارت/حساب) — یا دلیل رد</label><input name="note" maxLength={500} /></div>
              <div className="row"><button className="btn sm" name="decision" value="approve">{r.kind === 'renew' ? 'تأیید و تمدید' : 'تأیید'}</button><button className="btn danger sm" name="decision" value="reject">رد</button></div>
            </form>
          </Card>)) : <Card><Empty text="درخواستِ در انتظاری نیست." icon="mail" /></Card>}
        {done.length > 0 && <Card title="سابقه"><div className="list">{done.map(({ r, plan }) => (
          <div className="list-item" key={r.id} style={{ flexWrap: 'wrap' }}><div style={{ flex: 1, minWidth: 200 }}><b>{r.schoolName}</b> <span className="muted small">• {r.managerName} • {plan ?? '—'} • {toman(r.priceToman)} • {r.kind === 'renew' ? 'تمدید' : 'جدید'}</span>{r.adminNote && <div className="muted small">{r.adminNote}</div>}{r.kind === 'new' && (r.status === 'approved' || r.status === 'paid') && <EditNote id={r.id} note={r.adminNote} price={r.status === 'approved' ? r.priceToman : undefined} />}</div><Badge tone={TONE[r.status]}>{LABEL[r.status]}</Badge></div>))}</div></Card>}
      </div>
    </>
  );
}
