import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { plans, purchaseRequests } from '@/db/schema';
import { reviewRequest } from '@/app/actions/plans';
import { requireUser } from '@/lib/auth';
import { fa, formatJalali, toman } from '@/lib/format';
import { Badge, Card, Empty, PageHead } from '@/components/ui';

export const metadata = { title: 'درخواست‌های ثبت‌نام' };
const LABEL = { pending: 'در انتظار', approved: 'تأیید شد (منتظر تکمیل ثبت‌نام)', rejected: 'رد شد', registered: 'تکمیل شد' } as const;
const TONE = { pending: 'warn', approved: 'ok', rejected: 'danger', registered: 'primary' } as const;

export default async function RequestsPage() {
  await requireUser(['ADMIN']);
  const rows = await db.select({ r: purchaseRequests, plan: plans.name, months: plans.months }).from(purchaseRequests).leftJoin(plans, eq(plans.id, purchaseRequests.planId)).orderBy(desc(purchaseRequests.createdAt)).limit(200);
  const pending = rows.filter((x) => x.r.status === 'pending'); const done = rows.filter((x) => x.r.status !== 'pending');
  return (
    <>
      <PageHead illus="school" title="درخواست‌های ثبت‌نام و تمدید" sub={`${fa(pending.length)} درخواست در انتظار`} />
      <div className="stack">
        {pending.length ? pending.map(({ r, plan, months }) => (
          <Card key={r.id} title={r.schoolName} action={<Badge tone="warn">{r.kind === 'renew' ? 'تمدید' : 'جدید'}</Badge>}>
            <div className="muted small" style={{ marginBottom: 8 }}>{r.managerName} • <span dir="ltr">{r.phone}</span>{[r.province, r.city].filter(Boolean).length ? ` • ${[r.province, r.city].filter(Boolean).join('، ')}` : ''}{r.email ? ` • ${r.email}` : ''} • {formatJalali(r.createdAt.toISOString().slice(0, 10))}</div>
            <div className="chips" style={{ marginBottom: 8 }}><Badge tone="primary">{plan ?? 'تعرفه‌ی حذف‌شده'}{months ? ` • ${fa(months)} ماه` : ''}</Badge>{r.kind === 'new' && <Badge>{fa(r.studentCount)} دانش‌آموز</Badge>}{r.teacherCount > 0 && <Badge>{fa(r.teacherCount)} معلم</Badge>}{r.schoolType && <Badge>{r.schoolType}</Badge>}<Badge tone="ok">{toman(r.priceToman)}</Badge><Badge>کد: {r.trackingCode}</Badge></div>
            {r.address && <p className="muted small" style={{ marginBottom: 6 }}>نشانی: {r.address}</p>}
            {r.note && <p className="small" style={{ whiteSpace: 'pre-wrap', marginBottom: 8 }}>{r.note}</p>}
            <form action={reviewRequest} className="stack" style={{ maxWidth: 520 }}>
              <input type="hidden" name="id" value={r.id} />
              <div className="inline-fields"><div className="field"><label>قیمت نهایی (تومان) — برای تخفیف تغییر دهید</label><input name="price" defaultValue={r.priceToman} inputMode="numeric" dir="ltr" /></div></div>
              <div className="field"><label>پیام برای مدیر مدرسه (اختیاری؛ مثلاً شماره حساب یا دلیل رد)</label><input name="note" maxLength={500} /></div>
              <div className="row"><button className="btn sm" name="decision" value="approve">{r.kind === 'renew' ? 'تأیید و تمدید' : 'تأیید'}</button><button className="btn danger sm" name="decision" value="reject">رد</button></div>
            </form>
          </Card>)) : <Card><Empty text="درخواستِ در انتظاری نیست." icon="mail" /></Card>}
        {done.length > 0 && <Card title="سابقه"><div className="list">{done.map(({ r, plan }) => (
          <div className="list-item" key={r.id} style={{ flexWrap: 'wrap' }}><div style={{ flex: 1, minWidth: 200 }}><b>{r.schoolName}</b> <span className="muted small">• {r.managerName} • {plan ?? '—'} • {toman(r.priceToman)} • {r.kind === 'renew' ? 'تمدید' : 'جدید'}</span>{r.adminNote && <div className="muted small">{r.adminNote}</div>}</div><Badge tone={TONE[r.status]}>{LABEL[r.status]}</Badge></div>))}</div></Card>}
      </div>
    </>
  );
}
