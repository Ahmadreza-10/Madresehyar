import { asc } from 'drizzle-orm';
import { db } from '@/db';
import { plans } from '@/db/schema';
import { savePlan } from '@/app/actions/plans';
import { requireUser } from '@/lib/auth';
import ActionForm from '@/components/ActionForm';
import { Badge, Card, Empty, PageHead } from '@/components/ui';
import { fa, toman } from '@/lib/format';

export const metadata = { title: 'تعرفه‌ها' };

function Fields({ p }: { p?: typeof plans.$inferSelect }) {
  return (<>
    {p && <input type="hidden" name="id" value={p.id} />}
    <div className="inline-fields">
      <div className="field"><label>نام تعرفه</label><input name="name" defaultValue={p?.name} required maxLength={60} placeholder="مثلاً: سالانه" /></div>
      <div className="field"><label>قیمت (تومان)</label><input name="price" defaultValue={p?.priceToman ?? ''} required inputMode="numeric" dir="ltr" placeholder="1500000" /></div>
    </div>
    <div className="inline-fields">
      <div className="field"><label>مدت (ماه)</label><input name="months" type="number" min={1} max={60} defaultValue={p?.months ?? 12} required /></div>
      <div className="field"><label>سقف دانش‌آموز (۰ = نامحدود)</label><input name="maxStudents" defaultValue={p?.maxStudents ?? 0} inputMode="numeric" dir="ltr" /></div>
      <div className="field"><label>ترتیب نمایش</label><input name="sortOrder" type="number" min={0} max={999} defaultValue={p?.sortOrder ?? 0} /></div>
    </div>
    <div className="field"><label>توضیح کوتاه (اختیاری)</label><input name="description" defaultValue={p?.description ?? ''} maxLength={300} /></div>
    {p && <label className="chip" style={{ width: 'fit-content' }}><input type="checkbox" name="active" defaultChecked={p.active} /><span>فعال (در صفحه‌ی ثبت‌نام دیده شود)</span></label>}
  </>);
}

export default async function PlansPage() {
  await requireUser(['ADMIN']);
  const list = await db.select().from(plans).orderBy(asc(plans.sortOrder), asc(plans.priceToman));
  return (
    <>
      <PageHead illus="school" title="تعرفه‌ها" sub="قیمت و مدتی که مدیران مدرسه‌ها در صفحه‌ی «ثبت‌نام» می‌بینند (آدرس عمومی: /register)." />
      <div className="grid g-main">
        <div className="stack">{list.length ? list.map((p) => (
          <Card key={p.id} title={p.name} action={<Badge tone={p.active ? 'ok' : ''}>{p.active ? 'فعال' : 'غیرفعال'}</Badge>}>
            <div className="muted small" style={{ marginBottom: 8 }}>{toman(p.priceToman)} • {fa(p.months)} ماه • {p.maxStudents > 0 ? `تا ${fa(p.maxStudents)} دانش‌آموز` : 'دانش‌آموز نامحدود'}</div>
            <details><summary className="btn ghost sm" style={{ display: 'inline-flex' }}>ویرایش</summary><div style={{ marginTop: 12 }}><ActionForm action={savePlan} submit="ذخیره" resetOnSuccess={false} small><Fields p={p} /></ActionForm></div></details>
          </Card>)) : <Card><Empty text="هنوز تعرفه‌ای نساخته‌اید." icon="school" /></Card>}</div>
        <Card title="تعرفه‌ی جدید"><ActionForm action={savePlan} submit="ساخت تعرفه"><Fields /></ActionForm></Card>
      </div>
    </>
  );
}
