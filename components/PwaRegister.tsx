'use client';
import { useEffect } from 'react';

/** ثبت Service Worker از همان ابتدا: لازم برای نصب برنامه، صفحه‌ی «آفلاین» و دریافت اعلان */
export default function PwaRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
    const go = () => { navigator.serviceWorker.register('/sw.js').catch(() => {}); };
    if (document.readyState === 'complete') go(); else window.addEventListener('load', go, { once: true });
  }, []);
  return null;
}
