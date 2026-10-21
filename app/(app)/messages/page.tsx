import { and, desc, eq, or } from 'drizzle-orm';
import { db } from '@/db';
import { messages, users } from '@/db/schema';
import { deleteChatMessage, editChatMessage, sendChat } from '@/app/actions/messages';
import { listAttachments } from '@/lib/uploads';
import { requireUser } from '@/lib/auth';
import { allowedRecipients } from '@/lib/messaging';
import { roleTitle } from '@/lib/permissions';
import { fullName } from '@/lib/format';
import ActionForm from '@/components/ActionForm';
import { UserAvatar } from '@/components/UserAvatar';
import { ChatShell, ChatThread } from '@/components/chat/ChatShell';
import ChatComposer from '@/components/chat/ChatComposer';
import type { Bubble } from '@/components/chat/Bubbles';

export const metadata = { title: 'پیام‌ها' };
export const dynamic = 'force-dynamic';

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ with?: string; to?: string }> }) {
  const u = await requireUser(); const sp = await searchParams;
  const withId = sp.with ?? sp.to ?? '';
  let thread: React.ReactNode = null;

  if (withId) {
    const [other] = await db.select().from(users).where(eq(users.id, withId)).limit(1);
    const canWrite = other ? (await allowedRecipients(u)).some((r) => r.id === withId) : false;
    const latest = other ? await db.select().from(messages).where(or(and(eq(messages.senderId, u.id), eq(messages.recipientId, withId)), and(eq(messages.senderId, withId), eq(messages.recipientId, u.id)))).orderBy(desc(messages.createdAt)).limit(200) : [];
    if (!other || (!canWrite && !latest.length)) {
      thread = <div className="msgr-placeholder"><div style={{ fontSize: '3rem' }}>🚫</div><b>این گفتگو در دسترس نیست</b><span className="muted small">شما اجازه‌ی پیام دادن به این کاربر را ندارید.</span></div>;
    } else {
      const rows = [...latest].reverse();
      const files = await listAttachments('message', rows.map((m) => m.id));
      const unread = rows.filter((m) => m.recipientId === u.id && !m.readAt).length;
      const bubbles: Bubble[] = rows.map((m) => {
        const mine = m.senderId === u.id;
        return {
          id: m.id, mine, subject: m.subject || undefined, body: m.body, at: m.createdAt, edited: !!m.editedAt, read: mine ? !!m.readAt : undefined,
          files: files.filter((f) => f.ownerId === m.id), canRemoveFiles: mine,
          menu: mine ? (<>
            {m.body && <details className="bmenu-edit"><summary className="btn ghost sm" style={{ display: 'inline-flex' }}>ویرایش</summary>
              <div style={{ marginTop: 8 }}><ActionForm action={editChatMessage} submit="ذخیره" resetOnSuccess={false} small><input type="hidden" name="id" value={m.id} /><textarea name="body" defaultValue={m.body} required maxLength={3000} style={{ minHeight: 70 }} /></ActionForm></div></details>}
            <form action={deleteChatMessage}><input type="hidden" name="id" value={m.id} /><button className="btn danger sm">حذف پیام</button></form></>) : undefined,
        };
      });
      thread = (
        <ChatThread name={fullName(other)} sub={roleTitle(other)} avatar={<UserAvatar user={other} size={42} />} bubbles={bubbles} count={rows.length} unread={unread} withUserId={other.id}
          composer={canWrite ? <ChatComposer action={sendChat} hidden={{ recipientId: other.id }} /> : <div className="msgr-closed">ارسال پیام جدید به این کاربر ممکن نیست.</div>} />);
    }
  }
  return <ChatShell activeKey={withId ? `u:${withId}` : undefined}>{thread}</ChatShell>;
}
