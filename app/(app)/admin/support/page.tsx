import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { schools, supportTickets, users } from '@/db/schema';
import { replyTicket } from '@/app/actions/support';
import { requireUser } from '@/lib/auth';
import { fa, formatJalali, fullName } from '@/lib/format';
import { roleTitle } from '@/lib/permissions';
import ActionForm from '@/components/ActionForm';
import { Badge, Card, Empty, PageHead } from '@/components/ui';

export const metadata = { title: 'پشتیبانی' };
const statusTone = { open: 'warn', answered: 'ok', closed: '' } as const;
const statusLabel = { open: 'بدون پاسخ', answered: 'پاسخ داده شد', closed: 'بسته' } as const;
const order = { open: 0, answered: 1, closed: 2 } as const;

export default async function SupportInbox() {
  await requireUser(['ADMIN']);
  const rows = await db.select({ t: supportTickets, u: users, school: schools.name }).from(supportTickets).innerJoin(users, eq(users.id, supportTickets.userId)).leftJoin(schools, eq(schools.id, users.schoolId)).orderBy(desc(supportTickets.createdAt)).limit(200);
  rows.sort((a, b) => order[a.t.status] - order[b.t.status]);
  const open = rows.filter((r) => r.t.status === 'open').length;
  return (
    <>
      <PageHead illus="messages" title="پیام‌های پشتیبانی" sub={`${fa(open)} پیام بدون پاسخ`} />
      <div className="stack">{rows.length ? rows.map(({ t, u, school }) => (
        <Card key={t.id} title={t.subject} action={<Badge tone={statusTone[t.status]}>{statusLabel[t.status]}</Badge>}>
          <div className="muted small" style={{ marginBottom: 8 }}>{fullName(u)} • {roleTitle(u)}{school ? ` • ${school}` : ''} • @{u.username} • {formatJalali(t.createdAt.toISOString().slice(0, 10))}</div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{t.body}</div>
          {t.reply && <div className="feedback" style={{ marginTop: 10 }}><b>پاسخ:</b> <span style={{ whiteSpace: 'pre-wrap' }}>{t.reply}</span></div>}
          {t.status !== 'closed' && (<details style={{ marginTop: 10 }}><summary className="btn ghost sm" style={{ display: 'inline-flex' }}>{t.reply ? 'ویرایش پاسخ' : 'پاسخ دادن'}</summary>
            <div style={{ marginTop: 10, maxWidth: 560 }}><ActionForm action={replyTicket} submit="ثبت پاسخ" resetOnSuccess={false} small><input type="hidden" name="id" value={t.id} /><textarea name="reply" defaultValue={t.reply ?? ''} required maxLength={2000} placeholder="پاسخ برای کاربر…" /></ActionForm></div></details>)}
        </Card>)) : <Card><Empty text="هنوز پیامی نرسیده است." icon="mail" /></Card>}</div>
    </>
  );
}
