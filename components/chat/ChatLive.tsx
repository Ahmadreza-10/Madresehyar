'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useTransition } from 'react';
import { markConversationRead } from '@/app/actions/messages';

/** رفتار زنده‌ی گفتگو: رفتن به آخرین پیام، به‌روزرسانی خودکار هر ۱۰ ثانیه (فقط وقتی صفحه دیده می‌شود)، و «خوانده شد» زدن پیام‌های دریافتی */
export default function ChatLive({ count, unread, withUserId }: { count: number; unread: number; withUserId?: string }) {
  const router = useRouter(); const prev = useRef<number | null>(null); const [, start] = useTransition();
  useEffect(() => {
    const body = document.querySelector<HTMLElement>('.msgr-body'); if (!body) return;
    if (prev.current === null) body.scrollTop = body.scrollHeight;
    else if (count > prev.current) { const near = body.scrollHeight - body.scrollTop - body.clientHeight < 160; if (near) body.scrollTo({ top: body.scrollHeight, behavior: 'smooth' }); }
    prev.current = count;
  }, [count]);
  useEffect(() => { if (withUserId && unread > 0) start(() => { void markConversationRead(withUserId); }); }, [withUserId, unread]);
  useEffect(() => {
    const tick = () => { if (document.visibilityState === 'visible') router.refresh(); };
    const t = setInterval(tick, 10_000); const vis = () => { if (document.visibilityState === 'visible') router.refresh(); };
    document.addEventListener('visibilitychange', vis);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', vis); };
  }, [router]);
  return null;
}
