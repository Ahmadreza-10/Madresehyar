import { and, asc, desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { plans, purchaseRequests, schools } from '@/db/schema';
import { requestRenewal } from '@/app/actions/register';
import { daysLeft } from '@/lib/subscription';
import { formatJalali, fa, toman } from '@/lib/format';
import { saveSettings } from '@/app/actions/admin';
import { requireUser } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import ActionForm from '@/components/ActionForm';
import { Badge, Card, PageHead } from '@/components/ui';

export const metadata = { title: 'تنظیمات' };

export default async function AdminSettings() {
  const me = await requireUser(['PRINCIPAL', 'VICE']); const s = await getSettings(me.schoolId!);
  const [sc] = await db.select().from(schools).where(eq(schools.id, me.schoolId!)).limit(1);
  const [cur] = sc?.planId ? await db.select().from(plans).where(eq(plans.id, sc.planId)).limit(1) : [];
  const offers = await db.select().from(plans).where(eq(plans.active, true)).orderBy(asc(plans.sortOrder), asc(plans.priceToman));
  const reqs = await db.select({ r: purchaseRequests, plan: plans.name }).from(purchaseRequests).leftJoin(plans, eq(plans.id, purchaseRequests.planId)).where(and(eq(purchaseRequests.schoolId, me.schoolId!), eq(purchaseRequests.kind, 'renew'))).orderBy(desc(purchaseRequests.createdAt)).limit(5);
  const left = daysLeft(sc?.subscriptionEndsAt); const hasPending = reqs.some((x) => x.r.status === 'pending');
  return (
    <>
      <PageHead illus="settings" title="تنظیمات مدرسه" />
      <Card title="اشتراک مدرسه" action={left === null ? <Badge tone="ok">بدون محدودیت زمانی</Badge> : <Badge tone={left <= 0 ? 'danger' : left <= 14 ? 'warn' : 'ok'}>{left <= 0 ? 'تمام شده' : `${fa(left)} روز مانده`}</Badge>}>
        <div className="muted small" style={{ marginBottom: 10 }}>{cur ? `تعرفه‌ی فعلی: ${cur.name} • ` : ''}{sc?.subscriptionEndsAt ? `پایان اشتراک: ${formatJalali(sc.subscriptionEndsAt.toISOString().slice(0, 10), true)}` : 'برای مدرسه‌ی شما تاریخ پایانی تعیین نشده است.'}</div>
        {me.role === 'PRINCIPAL' ? (offers.length ? (hasPending ? <div className="alert warn">درخواست تمدید شما در حال بررسی است.</div> : (
          <ActionForm action={requestRenewal} submit="ارسال درخواست تمدید" resetOnSuccess={false}><div style={{ maxWidth: 480 }}>
            <div className="field"><label>تعرفه‌ی تمدید</label><select name="planId" defaultValue={offers[0].id}>{offers.map((p) => <option key={p.id} value={p.id}>{p.name} — {toman(p.priceToman)} / {fa(p.months)} ماه</option>)}</select></div>
            <div className="field"><label>توضیحات (اختیاری)</label><input name="note" maxLength={500} /></div>
            <p className="hint-t">مدت جدید به انتهای اشتراک فعلی اضافه می‌شود. پرداخت را با ادمین هماهنگ کنید.</p></div></ActionForm>)) : <p className="muted small">فعلاً تعرفه‌ای برای تمدید منتشر نشده است.</p>) : <p className="muted small">تمدید اشتراک را مدیر مدرسه انجام می‌دهد.</p>}
        {reqs.length > 0 && <div className="muted small" style={{ marginTop: 10 }}>سابقه: {reqs.map(({ r, plan }) => `${plan ?? '—'} (${{ pending: 'در انتظار', approved: 'تأیید', payment_review: 'در حال بررسی', paid: 'پرداخت تأیید شد', rejected: 'رد شد', registered: 'تمدید شد' }[r.status]})`).join(' • ')}</div>}
      </Card>
      <div style={{ height: 16 }} />
      <Card title="مدرسه و بازه‌ی ثبت گزارش مطالعه">
        <div style={{ maxWidth: 560 }}>
          <ActionForm action={saveSettings} submit="ذخیره‌ی تنظیمات" resetOnSuccess={false}>
            <div className="inline-fields"><div className="field"><label>نام مدرسه</label><input name="schoolName" defaultValue={s.schoolName} required /></div><div className="field"><label>سال تحصیلی</label><input name="academicYear" defaultValue={s.academicYear} /></div></div>
            <div className="inline-fields">
              <div className="field"><label>شروع بازه‌ی ثبت گزارش</label><input name="studyWindowStart" defaultValue={s.studyWindowStart} dir="ltr" placeholder="08:00" required /></div>
              <div className="field"><label>پایان بازه‌ی ثبت گزارش</label><input name="studyWindowEnd" defaultValue={s.studyWindowEnd} dir="ltr" placeholder="24:00" required /></div>
            </div>
            <label className="chip" style={{ width: 'fit-content' }}><input type="checkbox" name="remindersEnabled" defaultChecked={s.remindersEnabled !== '0'} /><span>یادآور گزارش مطالعه برای اولیا (ساعت ۹ شب و یک ساعت مانده به پایان زمان ثبت)</span></label>
            <label className="chip" style={{ width: 'fit-content' }}><input type="checkbox" name="showRankLists" defaultChecked={s.showRankLists === '1'} /><span>نمایش فهرست کامل رتبه‌ی همکلاسی‌ها و هم‌پایه‌ها به دانش‌آموز و ولی</span></label>
            <div className="card-sub" style={{ marginTop: 6 }}>
              <b>مثبت و منفی خودکار برای گزارش مطالعه (اختیاری)</b>
              <label className="chip" style={{ width: 'fit-content', marginTop: 8 }}><input type="checkbox" name="autoStudyPraise" defaultChecked={s.autoStudyPraise === '1'} /><span>به ازای ارسال گزارش مطالعه، ۱ مثبت ثبت شود (روزی یک بار)</span></label>
              <label className="chip" style={{ width: 'fit-content' }}><input type="checkbox" name="autoStudyNegative" defaultChecked={s.autoStudyNegative === '1'} /><span>به ازای ارسال‌نشدن گزارش مطالعه در یک روز، ۱ منفی ثبت شود</span></label>
              <p className="hint-t">هر دو گزینه پیش‌فرض خاموش‌اند. «منفی» فقط از روزی که روشنش می‌کنید به بعد حساب می‌شود (برای روزهای گذشته منفی ثبت نمی‌شود) و فقط برای دانش‌آموزی که ولی به او وصل است. اگر ولی «عدم مطالعه» اعلام کرده باشد منفی ثبت نمی‌شود. این یادداشت‌ها با عبارت «(ثبت خودکار)» در بخش مثبت‌ها و منفی‌ها دیده می‌شوند و مدیر یا معاون می‌تواند هر کدام را پاک کند.{s.autoStudyNegative === '1' && s.autoStudyNegativeSince ? ` منفی خودکار از ${formatJalali(s.autoStudyNegativeSince)} فعال است.` : ''}</p>
            </div>
            <p className="hint-t">ولیِ هر دانش‌آموز فقط در این بازه (به وقت تهران) می‌تواند گزارش مطالعه ثبت کند. «۲۴:۰۰» یعنی تا نیمه‌شب. اگر نمایش فهرست رتبه‌ها را خاموش کنید، دانش‌آموز و ولی فقط رتبه و معدل خودشان را می‌بینند (معلم و مدیر همیشه فهرست را می‌بینند).</p>
          </ActionForm>
        </div>
      </Card>
    </>
  );
}
