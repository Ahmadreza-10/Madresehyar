import { desc, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { messages, users } from '@/db/schema';
import { markRead, sendMessage } from '@/app/actions/messages';
import { togglePinMessage, updateMessage } from '@/app/actions/edit';
import { ACCEPT, HINT, listAttachments } from '@/lib/uploads';
import AttachmentList from '@/components/AttachmentList';
import { requireUser } from '@/lib/auth';
import { allowedRecipients } from '@/lib/messaging';
import { roleTitle } from '@/lib/permissions';
import { fullName } from '@/lib/format';
import ActionForm from '@/components/ActionForm';
import { Badge, Card, Empty, PageHead } from '@/components/ui';

export const metadata = { title: 'پیام‌ها' };
const fmt = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Tehran' });

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ box?: string; to?: string }> }) {
  const u = await requireUser(); const sp = await searchParams;
  const box = sp.box === 'sent' ? 'sent' : 'inbox';
  const recipients = await allowedRecipients(u);
  const rows = await db.select().from(messages).where(eq(box === 'sent' ? messages.senderId : messages.recipientId, u.id)).orderBy(desc(box === 'sent' ? messages.pinnedBySender : messages.pinnedByRecipient), desc(messages.createdAt)).limit(60);
  const files = await listAttachments('message', rows.map((m) => m.id));
  const otherIds = [...new Set(rows.map((m) => (box === 'sent' ? m.recipientId : m.senderId)))];
  const people = otherIds.length ? await db.select().from(users).where(inArray(users.id, otherIds)) : [];
  const nm = new Map(people.map((p) => [p.id, `${fullName(p)} (${roleTitle(p)})`]));
  return (
    <>
      <PageHead illus="messages" title="پیام‌ها" sub="ارتباط مستقیم و خصوصی بین مدیر، معلم، دانش‌آموز و خانواده" />
      <div className="grid g-main">
        <div>
          <div className="seg" style={{ marginBottom: 12 }}><a href="/messages" className={box === 'inbox' ? 'on' : ''}>دریافتی</a><a href="/messages?box=sent" className={box === 'sent' ? 'on' : ''}>ارسالی</a>{u.schoolId && <a href="/messages/groups">گروه‌ها و کانال‌ها</a>}</div>
          <Card>{rows.length ? <div className="list">{rows.map((m) => (
            <article className="list-item" key={m.id} style={{ alignItems: 'flex-start', ...((box === 'sent' ? m.pinnedBySender : m.pinnedByRecipient) ? { borderInlineStart: '4px solid var(--warn)' } : {}) }}>
              <div style={{ flex: 1, minWidth: 0 }}><div className="row" style={{ gap: 8 }}>{(box === 'sent' ? m.pinnedBySender : m.pinnedByRecipient) && <span className="pin-badge" title="سنجاق‌شده">📌</span>}<b>{m.subject}</b>{box === 'inbox' && !m.readAt && <Badge tone="danger">جدید</Badge>}</div>
                <div className="muted small">{box === 'sent' ? 'به' : 'از'}: {nm.get(box === 'sent' ? m.recipientId : m.senderId)} • {fmt.format(m.createdAt)}{m.editedAt && <span className="edited"> • ویرایش‌شده</span>}</div>
                <p style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{m.body}</p>
                <AttachmentList items={files.filter((f) => f.ownerId === m.id)} canRemove={box === 'sent'} />
                {box === 'sent' && (<details style={{ marginTop: 8 }}><summary className="btn ghost sm" style={{ display: 'inline-flex' }}>ویرایش</summary>
                  <div style={{ marginTop: 10, maxWidth: 520 }}><ActionForm action={updateMessage} submit="ذخیره‌ی تغییرات" resetOnSuccess={false} small><input type="hidden" name="id" value={m.id} />
                    <div className="field"><label>موضوع</label><input name="subject" defaultValue={m.subject} required maxLength={120} /></div>
                    <div className="field"><label>متن</label><textarea name="body" defaultValue={m.body} required maxLength={3000} /></div></ActionForm></div></details>)}</div>
              <div className="row" style={{ gap: 6 }}>
                <form action={togglePinMessage}><input type="hidden" name="id" value={m.id} /><button className="btn ghost sm" title="سنجاق / برداشتن سنجاق">{(box === 'sent' ? m.pinnedBySender : m.pinnedByRecipient) ? '📌 برداشتن' : '📌 سنجاق'}</button></form>
                {box === 'inbox' && !m.readAt && <form action={markRead}><input type="hidden" name="id" value={m.id} /><button className="btn ghost sm">خوانده شد</button></form>}</div>
            </article>))}</div> : <Empty text={box === 'sent' ? 'پیامی نفرستاده‌اید.' : 'پیامی ندارید.'} icon="mail" />}</Card>
        </div>
        <Card title="پیام جدید">
          {recipients.length ? (
            <ActionForm action={sendMessage} submit="ارسال پیام">
              <div className="field"><label>گیرنده</label><select name="recipientId" defaultValue={sp.to ?? ''}><option value="" disabled>انتخاب کنید…</option>{recipients.map((r) => <option key={r.id} value={r.id}>{fullName(r)} — {roleTitle(r)}</option>)}</select></div>
              <div className="field"><label>موضوع</label><input name="subject" required maxLength={120} /></div>
              <div className="field"><label>متن</label><textarea name="body" required maxLength={3000} /></div>
              <div className="field"><label>پیوست (اختیاری)</label><input type="file" name="files" multiple accept={ACCEPT} /><span className="hint-t">{HINT}</span></div>
            </ActionForm>) : <Empty text="گیرنده‌ای برای شما تعریف نشده است." icon="mail" />}
        </Card>
      </div>
    </>
  );
}
