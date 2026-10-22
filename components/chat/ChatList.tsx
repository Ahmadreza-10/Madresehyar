'use client';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import type { ConvItem } from '@/lib/chat';

type Person = { id: string; name: string; sub: string; avatar: ReactNode };
const timeFa = new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tehran' });
const dayFa = new Intl.DateTimeFormat('fa-IR', { month: 'short', day: 'numeric', timeZone: 'Asia/Tehran' });
const when = (ms: number) => { const d = new Date(ms); const n = new Date(); return d.toDateString() === n.toDateString() ? timeFa.format(d) : dayFa.format(d); };

/** ستون فهرست گفتگوها: جست‌وجو، گفتگوهای قبلی و دکمه‌ی «پیام جدید» برای انتخاب یک نفر */
export default function ChatList({ items, people, activeKey, canManageGroups }: { items: ConvItem[]; people: Person[]; activeKey?: string; canManageGroups: boolean }) {
  const [q, setQ] = useState(''); const [mode, setMode] = useState<'chats' | 'new'>('chats'); const [filter, setFilter] = useState<'all' | 'user' | 'group' | 'channel'>('all');
  const t = q.trim();
  const count = (k: 'user' | 'group' | 'channel') => items.filter((i) => i.kind === k).length;
  const shown = items.filter((i) => (filter === 'all' || i.kind === filter) && (!t || i.name.includes(t)));
  const pShown = people.filter((p) => !t || p.name.includes(t) || p.sub.includes(t));
  return (
    <aside className="msgr-list">
      <div className="msgr-list-head">
        <h2>💬 {mode === 'new' ? 'پیام جدید' : 'پیام‌ها'}</h2>
        {mode === 'new' ? <button type="button" className="btn ghost sm" onClick={() => { setMode('chats'); setQ(''); }}>بازگشت</button>
          : <button type="button" className="btn sm" onClick={() => { setMode('new'); setQ(''); }} disabled={!people.length}>✏️ پیام جدید</button>}
      </div>
      {mode === 'chats' && (
        <div className="msgr-filters" role="tablist" aria-label="نوع گفتگو">
          {([['all', 'همه', items.length], ['user', 'شخصی', count('user')], ['group', 'گروه‌ها', count('group')], ['channel', 'کانال‌ها', count('channel')]] as const).map(([k, l, n]) => (
            <button type="button" role="tab" aria-selected={filter === k} key={k} className={`mf${filter === k ? ' on' : ''}`} onClick={() => setFilter(k)}>{l}{n > 0 && <span className="mf-n">{n.toLocaleString('fa-IR')}</span>}</button>))}
        </div>)}
      <div className="msgr-search"><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={mode === 'new' ? 'جست‌وجوی نام یا نقش…' : 'جست‌وجو در گفتگوها…'} aria-label="جست‌وجو" /></div>
      <div className="msgr-items">
        {mode === 'chats' ? (shown.length ? shown.map((i) => (
          <Link key={i.key} href={i.href} className={`msgr-item${i.key === activeKey ? ' on' : ''}`}>
            {i.avatar}
            <div className="msgr-item-body">
              <div className="msgr-item-top"><b>{i.name}</b><span className="muted small">{when(i.at)}</span></div>
              <div className="msgr-item-bot"><span className="msgr-prev">{i.preview}</span>{i.unread > 0 && <span className="msgr-badge">{i.unread.toLocaleString('fa-IR')}</span>}</div>
            </div>
          </Link>)) : <div className="msgr-empty">{items.length ? (filter !== 'all' && !t ? 'در این دسته گفتگویی نیست.' : 'گفتگویی با این نام پیدا نشد.') : 'هنوز گفتگویی ندارید. دکمه‌ی «پیام جدید» را بزنید و برای یک نفر بنویسید.'}</div>)
          : (pShown.length ? pShown.map((p) => (
            <Link key={p.id} href={`/messages?with=${p.id}`} className="msgr-item">
              {p.avatar}<div className="msgr-item-body"><div className="msgr-item-top"><b>{p.name}</b></div><div className="msgr-item-bot"><span className="msgr-prev">{p.sub}</span></div></div>
            </Link>)) : <div className="msgr-empty">کسی پیدا نشد.</div>)}
      </div>
      {canManageGroups && mode === 'chats' && <Link href="/messages/groups" className="msgr-foot">👥 ساخت و مدیریت گروه و کانال</Link>}
    </aside>
  );
}
