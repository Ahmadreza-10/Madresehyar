'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

type Pending = { slot: 'evening' | 'last-hour' | null; date: string; pending: { id: string; name: string }[]; text: string };
/** وقتی سایت باز است (ولی)، هر دقیقه وضعیت را می‌پرسد و در صورت نیاز یادآور نشان می‌دهد (بنر داخل صفحه + اعلان مرورگر اگر اجازه داده شده). */
export default function ReminderWatcher() {
  const path = usePathname(); const [data, setData] = useState<Pending | null>(null); const [hidden, setHidden] = useState<string | null>(null);
  const check = useCallback(async () => {
    try {
      const j: Pending = await (await fetch('/api/reminders/pending', { cache: 'no-store' })).json();
      if (!j.slot || !j.pending.length) { setData(null); return; }
      setData(j);
      const key = `rem-${j.date}-${j.slot}`;
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '1');
        if ('Notification' in window && Notification.permission === 'granted') {
          const body = `${j.text}؛ گزارش امروزِ ${j.pending.map((p) => p.name).join('، ')} ثبت نشده است.`;
          const reg = await navigator.serviceWorker?.getRegistration('/sw.js');
          if (reg) await reg.showNotification('⏰ یادآور گزارش مطالعه', { body, dir: 'rtl', lang: 'fa', icon: '/icons/icon-192.png', tag: `study-${j.date}`, data: { url: '/study' } }); else new Notification('⏰ یادآور گزارش مطالعه', { body, dir: 'rtl', lang: 'fa' });
        }
      }
    } catch { /* آفلاین: بعداً دوباره */ }
  }, []);
  useEffect(() => { check(); const t = setInterval(check, 60_000); const v = () => { if (document.visibilityState === 'visible') check(); }; document.addEventListener('visibilitychange', v); return () => { clearInterval(t); document.removeEventListener('visibilitychange', v); }; }, [check]);
  if (!data || !data.slot || path === '/study' || hidden === `${data.date}-${data.slot}`) return null;
  return (
    <div className="reminder-banner" role="alert">
      <span className="rb-bell" aria-hidden="true">⏰</span>
      <div className="rb-text"><b>یادآور گزارش مطالعه</b><span>{data.text}؛ برای {data.pending.map((p) => p.name).join('، ')} هنوز گزارشی یا «عدم مطالعه» ثبت نشده است.</span></div>
      <Link href="/study" className="btn sm">ثبت گزارش</Link>
      <button type="button" className="btn ghost sm" onClick={() => setHidden(`${data.date}-${data.slot}`)}>بعداً</button>
    </div>
  );
}
