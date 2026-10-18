'use client';
import { useEffect, useState } from 'react';

const b64 = (s: string) => { const p = '='.repeat((4 - (s.length % 4)) % 4); const r = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from([...r].map((c) => c.charCodeAt(0))); };

/** فعال‌سازی یادآور روی «همین دستگاه» (گوشی یا لپ‌تاپ): مجوز اعلان + ثبت اشتراک Web Push */
export default function PushToggle() {
  const [state, setState] = useState<'checking' | 'unsupported' | 'insecure' | 'denied' | 'off' | 'on'>('checking');
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => { (async () => {
    if (!window.isSecureContext) return setState('insecure');
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return setState('unsupported');
    if (Notification.permission === 'denied') return setState('denied');
    const reg = await navigator.serviceWorker.getRegistration('/sw.js'); const sub = await reg?.pushManager.getSubscription();
    setState(sub && Notification.permission === 'granted' ? 'on' : 'off');
  })().catch(() => setState('unsupported')); }, []);
  const enable = async () => {
    setBusy(true); setMsg(null);
    try {
      const perm = await Notification.requestPermission(); if (perm !== 'granted') { setState(perm === 'denied' ? 'denied' : 'off'); return; }
      const reg = await navigator.serviceWorker.register('/sw.js'); await navigator.serviceWorker.ready;
      const { publicKey } = await (await fetch('/api/push/key')).json();
      const sub = (await reg.pushManager.getSubscription()) ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(publicKey) });
      const r = await fetch('/api/push/subscribe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(sub.toJSON()) });
      if (!r.ok) throw new Error('subscribe failed'); setState('on'); setMsg({ ok: true, text: 'یادآور روی این دستگاه فعال شد.' });
    } catch { setMsg({ ok: false, text: 'فعال‌سازی ناموفق بود. اتصال اینترنت و اجازه‌ی اعلان مرورگر را بررسی کنید.' }); } finally { setBusy(false); }
  };
  const disable = async () => {
    setBusy(true); try { const reg = await navigator.serviceWorker.getRegistration('/sw.js'); const sub = await reg?.pushManager.getSubscription(); if (sub) { await fetch('/api/push/subscribe', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) }); await sub.unsubscribe(); } setState('off'); setMsg({ ok: true, text: 'یادآور روی این دستگاه غیرفعال شد.' }); } finally { setBusy(false); }
  };
  const test = async () => { setBusy(true); try { const j = await (await fetch('/api/push/test', { method: 'POST' })).json(); setMsg({ ok: j.sent > 0, text: j.sent > 0 ? `اعلان آزمایشی به ${j.sent} دستگاه فرستاده شد.` : j.devices ? 'ارسال به دستگاه ناموفق بود؛ دوباره فعال‌سازی کنید.' : 'هنوز دستگاهی ثبت نشده است.' }); } finally { setBusy(false); } };
  return (
    <div className="stack" style={{ gap: 10 }}>
      <p>اگر تا یک ساعت مانده به پایان زمان ثبت و همچنین ساعت ۹ شب، گزارش مطالعه‌ی فرزندتان (یا «عدم مطالعه») ثبت نشده باشد، یک <b>اعلان</b> روی همین دستگاه می‌آید.</p>
      {state === 'checking' && <span className="muted small">در حال بررسی…</span>}
      {state === 'insecure' && <div className="alert warn">اعلان فقط روی آدرس امن (HTTPS) یا localhost کار می‌کند. تا آن موقع، وقتی سایت باز است یادآور داخل صفحه نمایش داده می‌شود.</div>}
      {state === 'unsupported' && <div className="alert warn">این مرورگر از اعلان پشتیبانی نمی‌کند. روی آیفون ابتدا سایت را «افزودن به صفحه‌ی اصلی» کنید. تا آن موقع، وقتی سایت باز است یادآور داخل صفحه نمایش داده می‌شود.</div>}
      {state === 'denied' && <div className="alert error">اعلان برای این سایت در مرورگر بسته شده است؛ از تنظیمات مرورگر (قفل کنار آدرس) آن را «اجازه» بدهید.</div>}
      {state === 'off' && <button type="button" className="btn" disabled={busy} onClick={enable}>🔔 فعال‌سازی یادآور روی این دستگاه</button>}
      {state === 'on' && (<div className="row" style={{ flexWrap: 'wrap' }}><span className="badge ok">✓ فعال است</span><button type="button" className="btn ghost sm" disabled={busy} onClick={test}>ارسال اعلان آزمایشی</button><button type="button" className="btn danger sm" disabled={busy} onClick={disable}>غیرفعال‌سازی</button></div>)}
      {msg && <div className={`alert ${msg.ok ? 'ok' : 'error'}`}>{msg.text}</div>}
      <span className="muted small">برای هر دستگاه (گوشی، لپ‌تاپ) جداگانه فعال کنید.</span>
    </div>
  );
}
