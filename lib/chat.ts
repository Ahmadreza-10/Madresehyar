import 'server-only';
import type { ReactNode } from 'react';
import { createElement } from 'react';
import { desc, eq, inArray, or } from 'drizzle-orm';
import { db } from '@/db';
import { chatPosts, messages, users } from '@/db/schema';
import type { CurrentUser } from './auth';
import { UserAvatar } from '@/components/UserAvatar';
import { myGroups } from './groups';
import { fullName } from './format';
import { roleTitle } from './permissions';
import { todayTehran } from './time';
import { formatJalali } from './format';

export type ConvItem = { key: string; href: string; kind: 'user' | 'group' | 'channel'; name: string; sub: string; preview: string; at: number; unread: number; avatar: ReactNode };

const clip = (s: string, n = 60) => { const t = s.replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n) + '…' : t; };
export const clock = new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tehran' });
/** برچسب روز برای جداکننده‌ی گفتگو: امروز / دیروز / تاریخ شمسی */
export function dayLabel(d: Date, now = new Date()): string {
  const iso = todayTehran(d); const today = todayTehran(now); const yest = todayTehran(new Date(now.getTime() - 86_400_000));
  return iso === today ? 'امروز' : iso === yest ? 'دیروز' : formatJalali(iso, true);
}
export const dayKey = (d: Date) => todayTehran(d);

const groupAvatar = (kind: string) => createElement('div', { className: 'avatar', style: { width: 46, height: 46, fontSize: '1.3rem' } }, kind === 'channel' ? '📢' : '👥');

/** فهرست گفتگوها (پیام‌های مستقیم + گروه‌ها و کانال‌ها)؛ جدیدترین بالا */
export async function conversationList(u: CurrentUser): Promise<ConvItem[]> {
  const rows = await db.select().from(messages).where(or(eq(messages.senderId, u.id), eq(messages.recipientId, u.id))).orderBy(desc(messages.createdAt)).limit(1500);
  const byOther = new Map<string, { last: (typeof rows)[number]; unread: number }>();
  for (const m of rows) {
    const o = m.senderId === u.id ? m.recipientId : m.senderId;
    const e = byOther.get(o) ?? { last: m, unread: 0 };
    if (m.recipientId === u.id && !m.readAt) e.unread++;
    byOther.set(o, e);
  }
  const people = byOther.size ? await db.select().from(users).where(inArray(users.id, [...byOther.keys()])) : [];
  const items: ConvItem[] = [];
  for (const p of people) {
    const e = byOther.get(p.id)!; const mine = e.last.senderId === u.id;
    items.push({ key: `u:${p.id}`, href: `/messages?with=${p.id}`, kind: 'user', name: fullName(p), sub: roleTitle(p), preview: `${mine ? 'شما: ' : ''}${e.last.body ? clip(e.last.body) : '📎 پیوست'}`, at: e.last.createdAt.getTime(), unread: e.unread, avatar: createElement(UserAvatar, { user: p, size: 46 }) });
  }
  const groups = await myGroups(u);
  if (groups.length) {
    const posts = await db.select().from(chatPosts).where(inArray(chatPosts.groupId, groups.map((g) => g.id))).orderBy(desc(chatPosts.createdAt)).limit(1500);
    const lastBy = new Map<string, (typeof posts)[number]>(); for (const p of posts) if (!lastBy.has(p.groupId)) lastBy.set(p.groupId, p);
    const authorIds = [...new Set([...lastBy.values()].map((p) => p.authorId).filter((x): x is string => !!x))];
    const authors = authorIds.length ? await db.select().from(users).where(inArray(users.id, authorIds)) : [];
    const an = new Map(authors.map((a) => [a.id, a.firstName]));
    for (const g of groups) {
      const l = lastBy.get(g.id);
      items.push({ key: `g:${g.id}`, href: `/messages/groups/${g.id}`, kind: g.kind === 'channel' ? 'channel' : 'group', name: g.name, sub: g.kind === 'channel' ? 'کانال' : 'گروه', preview: l ? `${l.authorId ? (an.get(l.authorId) ?? '') + ': ' : ''}${l.body ? clip(l.body, 50) : '📎 پیوست'}` : 'هنوز پیامی نیست', at: (l?.createdAt ?? g.createdAt).getTime(), unread: 0, avatar: groupAvatar(g.kind) });
    }
  }
  return items.sort((a, b) => b.at - a.at);
}
