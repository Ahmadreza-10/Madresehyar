import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { auditLogs, users } from '@/db/schema';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { fullName } from '@/lib/format';
import { Card, Empty, PageHead } from '@/components/ui';

export const metadata = { title: 'گزارش فعالیت‌ها' };

export default async function AuditPage() {
  const me = await requireUser(['ADMIN']);
  // فقط «ادمین اصلی» سامانه؛ مدیر و معاون مدارس به این بخش دسترسی ندارند
  if (!me.isOwner) redirect('/dashboard');
  const rows = await db.select({ l: auditLogs, u: users }).from(auditLogs).leftJoin(users, eq(users.id, auditLogs.actorId)).orderBy(desc(auditLogs.createdAt)).limit(200);
  const fmt = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Tehran' });
  return (
    <>
      <PageHead illus="log" title="گزارش فعالیت‌ها" sub="۲۰۰ رویداد آخر (ورود، تغییر دسترسی، ثبت نمره و …)" />
      {!rows.length ? <Card><Empty text="رویدادی ثبت نشده است." icon="log" /></Card> : (
        <div className="table-wrap"><table><thead><tr><th>زمان</th><th>کاربر</th><th>رویداد</th><th>جزئیات</th><th>IP</th></tr></thead><tbody>
          {rows.map(({ l, u }) => <tr key={l.id}><td className="num small">{fmt.format(l.createdAt)}</td><td>{u ? fullName(u) : '—'}</td><td dir="ltr" style={{ textAlign: 'right' }}><code>{l.action}</code></td><td className="small muted">{l.detail}</td><td dir="ltr" className="small muted">{l.ip}</td></tr>)}</tbody></table></div>)}
    </>
  );
}
