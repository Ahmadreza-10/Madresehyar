import Link from 'next/link';
import type { ReactNode } from 'react';
import { requireUser } from '@/lib/auth';
import { allowedRecipients } from '@/lib/messaging';
import { conversationList } from '@/lib/chat';
import { isManager, roleTitle } from '@/lib/permissions';
import { fullName } from '@/lib/format';
import { UserAvatar } from '@/components/UserAvatar';
import ChatList from './ChatList';
import ChatProvider, { type Target } from './ChatProvider';
import ChatLive from './ChatLive';
import Bubbles, { type Bubble } from './Bubbles';

/** قاب پیام‌رسان: ستون گفتگوها + پنجره‌ی گفتگوی انتخاب‌شده (در گوشی فقط یکی از این دو دیده می‌شود) */
export async function ChatShell({ activeKey, children }: { activeKey?: string; children?: ReactNode }) {
  const u = await requireUser();
  const [items, recips] = await Promise.all([conversationList(u), allowedRecipients(u)]);
  const people = recips.map((r) => ({ id: r.id, name: fullName(r), sub: roleTitle(r), avatar: <UserAvatar user={r} size={46} /> }));
  const targets: Target[] = [...items.map((i) => ({ key: i.key, name: i.name, sub: i.sub, avatar: i.avatar })), ...people.filter((p) => !items.some((i) => i.key === `u:${p.id}`)).map((p) => ({ key: `u:${p.id}`, name: p.name, sub: p.sub, avatar: p.avatar }))];
  return (
    <ChatProvider key={activeKey ?? 'none'} targets={targets}>
    <div className={`msgr${children ? ' has-thread' : ''}`}>
      <ChatList items={items} people={people} activeKey={activeKey} canManageGroups={isManager(u.role)} />
      <section className="msgr-thread">{children ?? (
        <div className="msgr-placeholder"><div style={{ fontSize: '3.4rem' }}>💬</div><b>گفتگویی را انتخاب کنید</b><span className="muted small">از فهرست کنار، یک گفتگو را باز کنید یا با «پیام جدید» برای یک نفر بنویسید.</span></div>)}</section>
    </div>
    </ChatProvider>
  );
}

/** پنجره‌ی یک گفتگو: سربرگ، پیام‌ها، نوار نوشتن */
export function ChatThread({ name, sub, avatar, bubbles, showAuthor, composer, headExtra, pins, count, unread, withUserId, emptyText }: {
  name: string; sub?: string; avatar: ReactNode; bubbles: Bubble[]; showAuthor?: boolean; composer: ReactNode; headExtra?: ReactNode; pins?: ReactNode; count: number; unread?: number; withUserId?: string; emptyText?: string;
}) {
  return (
    <>
      <header className="msgr-head">
        <Link href="/messages" className="msgr-back" aria-label="بازگشت به گفتگوها">→</Link>
        {avatar}
        <div className="msgr-head-t"><b>{name}</b>{sub && <span className="muted small">{sub}</span>}</div>
        {headExtra}
      </header>
      {pins}
      <div className="msgr-body">
        {bubbles.length ? <Bubbles items={bubbles} showAuthor={showAuthor} /> : <div className="msgr-empty-thread">{emptyText ?? 'هنوز پیامی نیست. اولین پیام را بفرستید 👋'}</div>}
      </div>
      {composer}
      <ChatLive count={count} unread={unread ?? 0} withUserId={withUserId} />
    </>
  );
}
