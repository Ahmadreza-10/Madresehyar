'use client';
import { useEffect, useState } from 'react';

type BIP = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };
type W = Window & { __bip?: BIP };

/** دکمه‌ی «نصب برنامه»: با یک لمس خودِ مرورگر برنامه را نصب می‌کند (بدون راهنما).
 *  رویداد نصب در اسکریپت اولیه‌ی صفحه گرفته می‌شود تا قبل از آماده‌شدن این دکمه از دست نرود.
 *  اگر مرورگر نصب خودکار را پشتیبانی نکند (یا برنامه قبلاً نصب باشد) دکمه نمایش داده نمی‌شود.
 *  شکل دکمه با CSS تعیین می‌شود: روی گوشی کارت تمام‌عرض، روی لپ‌تاپ دکمه‌ی جمع‌وجور. */
export default function InstallApp({ compact = false }: { compact?: boolean }) {
  const [evt, setEvt] = useState<BIP | null>(null); const [installed, setInstalled] = useState(false); const [ready, setReady] = useState(false);
  useEffect(() => {
    const w = window as W;
    setInstalled(window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
    if (w.__bip) setEvt(w.__bip); setReady(true);
    const h = (e: Event) => { e.preventDefault(); w.__bip = e as BIP; setEvt(e as BIP); };
    const done = () => { setInstalled(true); setEvt(null); w.__bip = undefined; };
    window.addEventListener('beforeinstallprompt', h); window.addEventListener('appinstalled', done);
    return () => { window.removeEventListener('beforeinstallprompt', h); window.removeEventListener('appinstalled', done); };
  }, []);
  if (!ready) return null;
  if (installed) return compact ? null : <span className="badge ok">✓ برنامه نصب شده است</span>;
  if (!evt) return null;

  const install = async () => {
    await evt.prompt(); const r = await evt.userChoice.catch(() => null);
    if (r?.outcome === 'accepted') { setEvt(null); (window as W).__bip = undefined; }
  };
  return (
    <div className={`install-app${compact ? ' compact' : ''}`}>
      <button type="button" className="install-btn" onClick={install}><span aria-hidden="true">📲</span><span><b>نصب برنامه</b><small>مثل یک اپلیکیشن، تمام‌صفحه و سریع‌تر باز می‌شود</small></span></button>
    </div>
  );
}
