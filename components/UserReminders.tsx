'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { inQuiet, loadPrefs } from '@/lib/prefs';

type Data = {
  ok: boolean; today: string; nowMin: number; unread: number; announcement: { id: string; title: string } | null;
  slots: { start: string; end: string; subject: string; className: string; room: string | null }[];
  due: { id: string; title: string; subject: string; dueDate: string; dueTime: string | null }[];
};
type Toast = { id: number; title: string; body: string; url?: string };
const hm = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const seen = (k: string) => { try { return localStorage.getItem(k) === '1'; } catch { return false; } };
const mark = (k: string) => { try { localStorage.setItem(k, '1'); } catch { /* حالت خصوصی */ } };

/** یادآورهای شخصیِ کاربر وقتی سایت باز است: شروع کلاس، مهلت تکلیف، پیام و اطلاعیه‌ی جدید.
 *  بر اساس «ترجیحات» حساب من (روی همین دستگاه) تصمیم می‌گیرد و در ساعت سکوت چیزی نشان نمی‌دهد.
 *  اگر اجازه‌ی اعلان مرورگر داده شده باشد، اعلان سیستمی هم نشان می‌دهد؛ وگرنه فقط یک پیام کوچک داخل صفحه. */
export default function UserReminders() {
  const [toasts, setToasts] = useState<Toast[]>([]); const idRef = useRef(0);
  const push = useCallback(async (title: string, body: string, url?: string, tag?: string) => {
    const id = ++idRef.current; setToasts((t) => [...t, { id, title, body, url }]); setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 14_000);
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        const reg = await navigator.serviceWorker?.getRegistration('/sw.js');
        if (reg) await reg.showNotification(title, { body, dir: 'rtl', lang: 'fa', icon: '/icons/icon-192.png', tag: tag ?? `u-${id}`, data: { url: url ?? '/dashboard' } });
        else new Notification(title, { body, dir: 'rtl', lang: 'fa', icon: '/icons/icon-192.png', tag });
      }
    } catch { /* اعلان سیستمی ممکن نشد؛ پیام داخل صفحه کافی است */ }
  }, []);

  const check = useCallback(async () => {
    try {
      const r = await fetch('/api/reminders/me', { cache: 'no-store' }); if (!r.ok) return;
      const d: Data = await r.json(); if (!d.ok) return;
      const p = loadPrefs(); const quiet = inQuiet(p, d.nowMin);
      // پیام و اطلاعیه: مقدارِ قبلی را همیشه به‌روز نگه می‌داریم تا بعد از ساعت سکوت، خبرهای قدیمی یک‌جا نیایند
      const lastUnread = Number(localStorage.getItem('mdy-last-unread') ?? '-1'); localStorage.setItem('mdy-last-unread', String(d.unread));
      const lastAnn = localStorage.getItem('mdy-last-ann'); if (d.announcement) localStorage.setItem('mdy-last-ann', d.announcement.id);
      if (quiet) return;
      if (p.notifMsg && lastUnread >= 0 && d.unread > lastUnread) await push('✉️ پیام جدید', `${d.unread.toLocaleString('fa-IR')} پیام خوانده‌نشده دارید.`, '/messages', 'msg');
      if (p.notifAnn && d.announcement && lastAnn && lastAnn !== d.announcement.id) await push('📣 اطلاعیه‌ی جدید', d.announcement.title, '/announcements', 'ann');
      if (p.remClass) for (const s of d.slots) {
        const left = hm(s.start) - d.nowMin; const key = `mdy-cls-${d.today}-${s.start}-${s.className}`;
        if (left > 0 && left <= p.remClassMin && !seen(key)) { mark(key); await push('🔔 شروع کلاس', `${s.subject} (${s.className}) ${left.toLocaleString('fa-IR')} دقیقه‌ی دیگر، ساعت ${s.start.replace(/^0/, '')}${s.room ? `، ${s.room}` : ''}`, '/schedule', key); }
      }
      if (p.remAssign && d.nowMin >= p.remAssignHour * 60) for (const a of d.due) {
        if (a.dueDate === d.today) continue; // یادآوریِ «عصرِ روز قبل»
        const key = `mdy-asg-${d.today}-${a.id}`;
        if (!seen(key)) { mark(key); await push('📝 مهلت تکلیف فردا', `${a.title} (${a.subject})${a.dueTime ? ` • تا ساعت ${a.dueTime.replace(/^0/, '')}` : ''}`, `/assignments/${a.id}`, key); }
      }
    } catch { /* آفلاین: دقیقه‌ی بعد دوباره */ }
  }, [push]);

  useEffect(() => { check(); const t = setInterval(check, 60_000); const v = () => { if (document.visibilityState === 'visible') check(); }; document.addEventListener('visibilitychange', v); return () => { clearInterval(t); document.removeEventListener('visibilitychange', v); }; }, [check]);
  if (!toasts.length) return null;
  return (
    <div style={{ position: 'fixed', top: 14, inset: '14px 14px auto 14px', zIndex: 95, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 460, marginInline: 'auto', pointerEvents: 'none' }}>
      {toasts.map((t) => (
        <div key={t.id} role="status" style={{ pointerEvents: 'auto', background: 'var(--surface)', border: '1px solid var(--border)', borderInlineStart: '5px solid var(--primary)', borderRadius: 16, padding: '12px 14px', boxShadow: 'var(--shadow)', animation: 'popIn .4s both' }}>
          <div className="row between"><b>{t.title}</b><button type="button" className="btn ghost sm" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} aria-label="بستن">×</button></div>
          <div className="small">{t.url ? <a href={t.url}>{t.body}</a> : t.body}</div>
        </div>))}
    </div>
  );
}
