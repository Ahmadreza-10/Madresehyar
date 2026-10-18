import { asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';
import { createAdmin, removeAdmin, resetAdminPassword } from '@/app/actions/support';
import { requireUser } from '@/lib/auth';
import { fullName, formatJalali } from '@/lib/format';
import ActionForm from '@/components/ActionForm';
import { Badge, Card, PageHead } from '@/components/ui';

export const metadata = { title: 'مدیران سامانه' };

export default async function AdminsPage() {
  const me = await requireUser(['ADMIN']);
  const list = await db.select().from(users).where(eq(users.role, 'ADMIN')).orderBy(asc(users.createdAt));
  list.sort((a, b) => Number(b.isOwner) - Number(a.isOwner));
  return (
    <>
      <PageHead illus="users" title="مدیران سامانه" sub="همه‌ی ادمین‌ها به مدارس و پشتیبانی دسترسی دارند؛ فقط «ادمین اصلی» می‌تواند ادمین اضافه یا حذف کند." />
      <div className="stack">
        <Card title="ادمین‌ها">
          <div className="list">{list.map((a) => (
            <div className="list-item" key={a.id} style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div><b>{fullName(a)}</b> <span className="muted small">@{a.username}</span>
                <div className="muted small">{a.lastLoginAt ? `آخرین ورود: ${formatJalali(a.lastLoginAt.toISOString().slice(0, 10))}` : 'هنوز وارد نشده'}</div></div>
              <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                {a.isOwner ? <Badge tone="primary">👑 ادمین اصلی</Badge> : <Badge>ادمین</Badge>}{a.id === me.id && <Badge tone="ok">شما</Badge>}
                {me.isOwner && !a.isOwner && (<>
                  <ActionForm action={resetAdminPassword} submit="رمز موقت جدید" small inline resetOnSuccess={false}><input type="hidden" name="id" value={a.id} /></ActionForm>
                  <ActionForm action={removeAdmin} submit="حذف" small danger inline confirm="این ادمین حذف می‌شود و دیگر نمی‌تواند وارد شود. ادامه می‌دهید؟"><input type="hidden" name="id" value={a.id} /></ActionForm></>)}
              </div>
            </div>))}</div>
        </Card>
        {me.isOwner ? (
          <Card title="افزودن ادمین جدید"><div style={{ maxWidth: 520 }}><ActionForm action={createAdmin} submit="ساخت ادمین">
            <div className="inline-fields"><div className="field"><label>نام</label><input name="firstName" required maxLength={50} /></div><div className="field"><label>نام خانوادگی</label><input name="lastName" required maxLength={50} /></div></div>
            <div className="field"><label>نام کاربری</label><input name="username" required dir="ltr" placeholder="admin2" /></div>
            <div className="field"><label>رمز عبور (اختیاری)</label><input name="password" type="text" dir="ltr" placeholder="خالی = رمز موقت خودکار" /></div>
            <span className="hint-t">ادمین جدید در اولین ورود باید رمزش را عوض کند. ادمین اصلی همیشه شما می‌مانید و حذف نمی‌شوید.</span>
          </ActionForm></div></Card>
        ) : <Card><p className="muted small">برای افزودن یا حذف ادمین، با ادمین اصلی سامانه هماهنگ کنید.</p></Card>}
      </div>
    </>
  );
}
