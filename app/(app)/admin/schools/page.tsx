import Link from 'next/link';
import { asc, count, eq } from 'drizzle-orm';
import { db } from '@/db';
import { schools, users } from '@/db/schema';
import { createSchool, updateSchool } from '@/app/actions/admin';
import { deleteSchool, extendSchool } from '@/app/actions/plans';
import { deactivateExpiredSchools } from '@/lib/expiry';
import { daysLeft, isExpired } from '@/lib/subscription';
import { formatJalali } from '@/lib/format';
import { requireUser } from '@/lib/auth';
import { fa, fullName } from '@/lib/format';
import { roleTitle } from '@/lib/permissions';
import ActionForm from '@/components/ActionForm';
import { Badge, Card, Empty, PageHead } from '@/components/ui';

export const metadata = { title: 'مدارس و مدیران' };

export default async function SchoolsPage() {
  await requireUser(['ADMIN']);
  await deactivateExpiredSchools();
  const list = await db.select().from(schools).orderBy(asc(schools.name));
  const per = await db.select({ schoolId: users.schoolId, role: users.role, n: count() }).from(users).groupBy(users.schoolId, users.role);
  const mgrs = await db.select().from(users).where(eq(users.status, 'active'));
  const n = (id: string, role: string) => per.find((x) => x.schoolId === id && x.role === role)?.n ?? 0;
  return (
    <>
      <PageHead illus="school" title="مدارس و مدیران" sub="هر مدرسه داده‌های جداگانه‌ی خودش را دارد و کاربرانش فقط همان را می‌بینند. اینجا مدرسه می‌سازید و مدیر و معاونش را اضافه می‌کنید؛ مدیر و معاون خودشان معلم، دانش‌آموز و ولی را اضافه می‌کنند." />
      <Card title="مدرسه‌ی جدید"><div style={{ maxWidth: 480 }}><ActionForm action={createSchool} submit="ساخت مدرسه"><div className="field"><label>نام مدرسه</label><input name="name" required maxLength={80} placeholder="مثلاً: دبیرستان شهید بهشتی" /></div></ActionForm></div></Card>
      <div className="stack" style={{ marginTop: 16 }}>
        {!list.length && <Card><Empty text="هنوز مدرسه‌ای ساخته نشده است." icon="school" /></Card>}
        {list.map((sc) => {
          const heads = mgrs.filter((m) => m.schoolId === sc.id && (m.role === 'PRINCIPAL' || m.role === 'VICE'));
          return (
            <Card key={sc.id} title={sc.name} action={<Badge tone={sc.status === 'active' ? 'ok' : 'danger'}>{sc.status === 'active' ? 'فعال' : 'غیرفعال'}</Badge>}>
              <div className="muted small" style={{ marginBottom: 10 }}>{fa(n(sc.id, 'TEACHER'))} معلم • {fa(n(sc.id, 'STUDENT'))} دانش‌آموز • {fa(n(sc.id, 'PARENT'))} ولی</div>
              <div className="row small" style={{ marginBottom: 10, gap: 8 }}>{(() => { const l = daysLeft(sc.subscriptionEndsAt); return l === null ? <Badge>اشتراک: بدون محدودیت</Badge> : <Badge tone={l <= 0 ? 'danger' : l <= 14 ? 'warn' : 'ok'}>{l <= 0 ? 'اشتراک تمام شده' : `${fa(l)} روز مانده`}{sc.subscriptionEndsAt ? ` • تا ${formatJalali(sc.subscriptionEndsAt.toISOString().slice(0, 10))}` : ''}</Badge>; })()}
                <form action={extendSchool} className="row" style={{ gap: 6 }}><input type="hidden" name="id" value={sc.id} /><select name="months" defaultValue="12" style={{ width: 120 }}>{[1, 3, 6, 12, 24].map((m) => <option key={m} value={m}>{fa(m)} ماه</option>)}</select><button className="btn ghost sm">تمدید</button></form></div>
              <div className="chips" style={{ marginBottom: 12 }}>{heads.length ? heads.map((h) => <Badge key={h.id} tone="primary">{roleTitle(h)}: {fullName(h)}</Badge>) : <Badge tone="warn">مدیر یا معاونی ثبت نشده</Badge>}</div>
              <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <Link className="btn sm" href={`/admin/users?school=${sc.id}`}>مدیران و معاونان این مدرسه ←</Link>
                {isExpired(sc.subscriptionEndsAt) && <ActionForm action={deleteSchool} submit="حذف مدرسه" danger small inline className="" confirm={`مدرسه‌ی «${sc.name}» با همه‌ی کاربران و داده‌هایش برای همیشه حذف می‌شود. ادامه می‌دهید؟`}><input type="hidden" name="id" value={sc.id} /></ActionForm>}
                <details><summary className="btn ghost sm" style={{ display: 'inline-flex' }}>ویرایش / غیرفعال‌سازی</summary>
                  <div style={{ marginTop: 12, minWidth: 280 }}><ActionForm action={updateSchool} submit="ذخیره" resetOnSuccess={false}><input type="hidden" name="id" value={sc.id} />
                    <div className="field"><label>نام</label><input name="name" defaultValue={sc.name} required /></div>
                    <div className="field"><label>وضعیت</label><select name="status" defaultValue={sc.status}><option value="active">فعال</option><option value="disabled">غیرفعال (ورود همه‌ی اعضا مسدود می‌شود)</option></select></div>
                  </ActionForm></div></details>
              </div>
            </Card>);
        })}
      </div>
    </>
  );
}
