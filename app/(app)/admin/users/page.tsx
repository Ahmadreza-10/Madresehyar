import Link from 'next/link';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { classes, passwordResets, schools, users, type Role } from '@/db/schema';
import { createUser, setViceTitle, deleteUser, resetPassword, updateUser, fulfillPasswordReset, dismissPasswordReset } from '@/app/actions/admin';
import { requireUser } from '@/lib/auth';
import { roleLabels, roleTitle } from '@/lib/permissions';
import { fa, fullName } from '@/lib/format';
import ActionForm from '@/components/ActionForm';
import { Collapse } from '@/components/Interactive';
import { Badge, Card, Empty, Initial, PageHead } from '@/components/ui';

export const metadata = { title: 'کاربران و دسترسی‌ها' };
const VICE_TITLES = ['معاون آموزشی', 'معاون پرورشی', 'معاون اجرایی', 'معاون فرهنگی', 'معاون پشتیبانی', 'معاون اداری و مالی'];
const GROUP_TITLE: Record<Role, string> = { ADMIN: 'مدیران کل', PRINCIPAL: 'مدیران مدرسه', VICE: 'معاونان', TEACHER: 'معلمان', STUDENT: 'دانش‌آموزان', PARENT: 'اولیا' };
const roleTone = { ADMIN: 'danger', PRINCIPAL: 'primary', VICE: 'primary', TEACHER: 'accent', STUDENT: 'ok', PARENT: '' } as const;

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ role?: string; q?: string; school?: string }> }) {
  const me = await requireUser(['ADMIN', 'PRINCIPAL', 'VICE']); const sp = await searchParams;
  const superUser = me.role === 'ADMIN';
  // مدیرکل: فقط مدیر و معاونِ مدارس | مدیر/معاون: فقط معلم، دانش‌آموز و ولیِ مدرسه‌ی خودش
  const ROLES: Role[] = superUser ? ['PRINCIPAL', 'VICE'] : ['TEACHER', 'STUDENT', 'PARENT'];
  const schoolList = superUser ? await db.select().from(schools).orderBy(asc(schools.name)) : [];
  const schoolFilter = superUser ? (schoolList.some((x) => x.id === sp.school) ? sp.school : undefined) : me.schoolId!;
  const cls = superUser ? [] : await db.select().from(classes).where(eq(classes.schoolId, me.schoolId!)).orderBy(asc(classes.name));
  const all = await db.select({ u: users, className: classes.name, schoolName: schools.name }).from(users).leftJoin(classes, eq(classes.id, users.classId)).leftJoin(schools, eq(schools.id, users.schoolId))
    .where(and(inArray(users.role, ROLES), schoolFilter ? eq(users.schoolId, schoolFilter) : undefined)).orderBy(asc(users.role), asc(users.lastName));
  const resets = await db.select({ r: passwordResets, u: users }).from(passwordResets).innerJoin(users, eq(users.id, passwordResets.userId))
    .where(and(eq(passwordResets.status, 'pending'), inArray(users.role, ROLES), superUser ? undefined : eq(users.schoolId, me.schoolId!))).orderBy(asc(passwordResets.createdAt));
  const role = ROLES.includes(sp.role as Role) ? (sp.role as Role) : undefined; const q = (sp.q ?? '').trim();
  const list = all.filter((r) => (!role || r.u.role === role) && (!q || fullName(r.u).includes(q) || r.u.username.includes(q.toLowerCase())));
  const counts = Object.fromEntries(ROLES.map((r) => [r, all.filter((x) => x.u.role === r).length]));

  const classSelect = (def?: string | null) => (superUser ? null : <div className="field"><label>کلاس (برای دانش‌آموز)</label><select name="classId" defaultValue={def ?? ''}><option value="">—</option>{cls.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>);
  const roleSelect = (def?: Role) => (<div className="field"><label>نقش</label><select name="role" defaultValue={def ?? ROLES[0]}>{ROLES.map((r) => <option key={r} value={r}>{roleLabels[r]}</option>)}</select></div>);

  const viceForm = (id: string, cur: string | null) => (<ActionForm action={setViceTitle} submit="ذخیره‌ی عنوان" small resetOnSuccess={false}><input type="hidden" name="id" value={id} /><div className="field" style={{ maxWidth: 320 }}><label>این معاون چه معاونی است؟</label><input name="viceTitle" list="vice-titles" defaultValue={cur ?? ''} maxLength={40} placeholder="مثلاً: معاون پرورشی" /></div></ActionForm>);
  const vices = me.role === 'PRINCIPAL' ? await db.select().from(users).where(and(eq(users.role, 'VICE'), eq(users.schoolId, me.schoolId!))).orderBy(asc(users.lastName)) : [];

  return (
    <>
      <datalist id="vice-titles">{VICE_TITLES.map((t) => <option key={t} value={t} />)}</datalist>
      <PageHead illus="users" title={superUser ? 'مدیران و معاونان مدارس' : 'کاربران مدرسه'} sub={superUser ? 'مدیرکل سامانه مدیر و معاونِ هر مدرسه را اضافه و مدیریت می‌کند. بقیه‌ی کاربران را مدیر یا معاونِ همان مدرسه اضافه می‌کند.' : 'معلم، دانش‌آموز و ولیِ مدرسه‌ی خودتان را اضافه کنید و دسترسی‌شان را مدیریت کنید.'}>
        <form className="row" action="/admin/users"><input name="q" defaultValue={q} placeholder="جستجو…" style={{ width: 180 }} />{role && <input type="hidden" name="role" value={role} />}{superUser && schoolFilter && <input type="hidden" name="school" value={schoolFilter} />}<button className="btn ghost sm">جستجو</button></form>
      </PageHead>
      {me.role === 'PRINCIPAL' && (<><Collapse title="معاونان مدرسه و عنوان‌شان" hint="مدیر مشخص می‌کند هر معاون چه معاونی است" badge={<Badge tone="primary">{fa(vices.length)} نفر</Badge>}>{vices.length ? <div className="stack">{vices.map((v) => (<div key={v.id}><div className="row" style={{ marginBottom: 6 }}><Initial name={v.firstName} /><b>{fullName(v)}</b><Badge tone="primary">{roleTitle(v)}</Badge></div>{viceForm(v.id, v.viceTitle)}</div>))}</div> : <Empty text="هنوز معاونی برای مدرسه‌ی شما ثبت نشده است. مدیرکل سامانه معاونان را اضافه می‌کند." icon="users" />}</Collapse><div style={{ height: 16 }} /></>)}
      {resets.length > 0 && (
        <><Collapse title="درخواست‌های فراموشی رمز" badge={<Badge tone="warn">{fa(resets.length)} درخواست</Badge>}>
          <p className="muted small" style={{ marginBottom: 10 }}>این افراد رمزشان را فراموش کرده‌اند. اگر مطمئنید خودشان هستند «ساخت رمز موقت» را بزنید و رمز را فقط به خودِ آن‌ها بدهید.</p>
          <div className="stack">{resets.map(({ r, u }) => (
            <div className="row between" key={r.id} style={{ flexWrap: 'wrap', gap: 10 }}>
              <div><b>{fullName(u)}</b> <Badge tone={roleTone[u.role]}>{roleTitle(u)}</Badge>{r.claimedName && <span className="muted small"> • نوشته: {r.claimedName}</span>}<div className="muted small" dir="ltr" style={{ textAlign: 'right' }}>{u.username}{u.phone ? ` • ${u.phone}` : ''}</div></div>
              <div className="row" style={{ alignItems: 'flex-start', gap: 8 }}>
                <ActionForm action={fulfillPasswordReset} submit="ساخت رمز موقت" small inline resetOnSuccess={false}><input type="hidden" name="id" value={r.id} /></ActionForm>
                <ActionForm action={dismissPasswordReset} submit="نادیده" small danger inline><input type="hidden" name="id" value={r.id} /></ActionForm>
              </div>
            </div>))}</div>
        </Collapse><div style={{ height: 16 }} /></>)}
      <Collapse title="➕ افزودن کاربر جدید" hint="برای ساخت معلم، دانش‌آموز یا ولی">
            <ActionForm action={createUser} submit="ساخت کاربر" resetOnSuccess>
              <div className="inline-fields">
                <div className="field"><label>نام</label><input name="firstName" required /></div><div className="field"><label>نام خانوادگی</label><input name="lastName" required /></div>
                <div className="field"><label>نام کاربری (انگلیسی)</label><input name="username" dir="ltr" required placeholder="مثلاً: ali.rezaei" /></div>
                {superUser && <div className="field"><label>مدرسه</label><select name="schoolId" required defaultValue={schoolFilter ?? ''}><option value="" disabled>انتخاب کنید…</option>{schoolList.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>}
                {roleSelect()}{classSelect()}
                {superUser && <div className="field"><label>عنوان معاون <span className="muted">(فقط برای معاون)</span></label><input name="viceTitle" list="vice-titles" maxLength={40} placeholder="مثلاً: معاون پرورشی" /></div>}
                <div className="field"><label>موبایل</label><input name="phone" dir="ltr" inputMode="tel" /></div>
                <div className="field"><label>رمز عبور <span className="muted">(خالی = ساخت خودکار)</span></label><input name="password" dir="ltr" minLength={8} /></div>
              </div>
            </ActionForm>
      </Collapse>
      <div className="row" style={{ margin: '18px 0 10px' }}>
        <div className="seg" style={{ flexWrap: 'wrap' }}><Link href={`/admin/users${schoolFilter && superUser ? `?school=${schoolFilter}` : ''}`} className={!role ? 'on' : ''}>همه ({fa(all.length)})</Link>{ROLES.map((r) => <Link key={r} href={`/admin/users?role=${r}${superUser && schoolFilter ? `&school=${schoolFilter}` : ''}`} className={role === r ? 'on' : ''}>{roleLabels[r]} ({fa(counts[r])})</Link>)}</div>
      </div>
      {!list.length ? <Card><Empty text="کاربری پیدا نشد." icon="users" /></Card> : (
        <div className="stack">{ROLES.filter((r) => list.some((x) => x.u.role === r)).map((r) => (
          <Collapse key={r} title={GROUP_TITLE[r]} hint="روی نام هر نفر بزنید تا ویرایش و رمز و حذف باز شود" badge={<Badge tone={roleTone[r] || undefined}>{fa(list.filter((x) => x.u.role === r).length)} نفر</Badge>}>
            <div className="stack">{list.filter((x) => x.u.role === r).map(({ u, className, schoolName }) => (
          <Card key={u.id}>
            <details>
              <summary className="row between"><div className="row"><Initial name={u.firstName} /><div><b>{fullName(u)}</b><div className="muted small" dir="ltr" style={{ textAlign: 'right' }}>{u.username}</div></div></div>
                <div className="row" style={{ gap: 6 }}><Badge tone={roleTone[u.role]}>{roleTitle(u)}</Badge>{superUser && schoolName && <Badge>{schoolName}</Badge>}{className && <Badge>{className}</Badge>}<Badge tone={u.status === 'active' ? 'ok' : 'danger'}>{u.status === 'active' ? 'فعال' : 'مسدود'}</Badge></div></summary>
              <div style={{ marginTop: 16 }} className="stack">
                {u.role === 'VICE' && viceForm(u.id, u.viceTitle)}
                <ActionForm action={updateUser} submit="ذخیره‌ی تغییرات" resetOnSuccess={false}>
                  <input type="hidden" name="id" value={u.id} />
                  <div className="inline-fields">
                    <div className="field"><label>نام</label><input name="firstName" defaultValue={u.firstName} required /></div><div className="field"><label>نام خانوادگی</label><input name="lastName" defaultValue={u.lastName} required /></div>
                    {roleSelect(u.role)}{classSelect(u.classId)}
                    <div className="field"><label>دسترسی به سایت</label><select name="status" defaultValue={u.status}><option value="active">مجاز (فعال)</option><option value="disabled">مسدود</option></select></div>
                    <div className="field"><label>موبایل</label><input name="phone" dir="ltr" defaultValue={u.phone ?? ''} /></div>
                    <div className="field"><label>کد ملی</label><input name="nationalCode" dir="ltr" defaultValue={u.nationalCode ?? ''} /></div>
                  </div>
                </ActionForm>
                {(<div className="row" style={{ alignItems: 'flex-start' }}>
                  <ActionForm action={resetPassword} submit="بازنشانی رمز عبور" small resetOnSuccess={false} confirm="رمز جدید ساخته می‌شود و کاربر از سایت خارج می‌شود. ادامه می‌دهید؟"><input type="hidden" name="id" value={u.id} /></ActionForm>
                  <ActionForm action={deleteUser} submit="حذف کاربر" danger small confirm="این کاربر و همه‌ی داده‌های مرتبط با او (گزارش‌ها، نمرات، غیبت‌ها) برای همیشه حذف می‌شود. مطمئنید؟"><input type="hidden" name="id" value={u.id} /></ActionForm></div>)}
                {u.lastLoginAt && <div className="muted small">آخرین ورود: {new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Tehran' }).format(u.lastLoginAt)}</div>}
              </div>
            </details>
          </Card>))}</div>
          </Collapse>))}</div>)}
    </>
  );
}
