'use client';
import { useState, useTransition } from 'react';
import type { ActionState } from '@/lib/action';
import { haptic } from '@/lib/prefs';

type Act = (fd: FormData) => Promise<ActionState>;

/** تیک «انجام دادم» برای دانش‌آموز؛ بلافاصله تغییر می‌کند و اگر خطا بود برمی‌گردد */
export function TickButton({ action, assignmentId, done, locked, lockedText }: { action: Act; assignmentId: string; done: boolean; locked?: boolean; lockedText?: string }) {
  const [on, setOn] = useState(done); const [err, setErr] = useState(''); const [pending, start] = useTransition();
  const [prev, setPrev] = useState(done); if (prev !== done) { setPrev(done); setOn(done); } // همگام با داده‌ی سرور بعد از بازخوانی
  const click = () => {
    const next = !on; setOn(next); setErr(''); haptic();
    const fd = new FormData(); fd.set('assignmentId', assignmentId);
    start(async () => { const r = await action(fd); if (r && !r.ok) { setOn(!next); setErr(r.error ?? 'خطا'); } });
  };
  return (
    <div className="col" style={{ alignItems: 'flex-end', gap: 4 }}>
      <button type="button" className={`tick${on ? ' on' : ''}`} onClick={click} disabled={pending || locked} aria-pressed={on} title={locked ? lockedText : undefined}>
        <span className="box" aria-hidden>{on ? '✓' : ''}</span>{on ? 'انجام شد' : 'انجام دادم'}
      </button>
      {err && <span className="small" style={{ color: 'var(--danger, #dc2626)' }} role="alert">{err}</span>}
    </div>
  );
}

/** دکمه‌ی عمومی برای اجرای یک Server Action با چند فیلد پنهان و نمایش خطا/پیام */
export function ActionButton({ action, fields, label, tone = '', confirm }: { action: Act; fields: Record<string, string>; label: string; tone?: 'danger' | 'ghost' | ''; confirm?: string }) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null); const [pending, start] = useTransition();
  const click = () => {
    if (confirm && !window.confirm(confirm)) return;
    const fd = new FormData(); for (const [k, v] of Object.entries(fields)) fd.set(k, v);
    start(async () => { const r = await action(fd); setMsg(r ? { ok: !!r.ok, text: (r.ok ? r.message : r.error) ?? '' } : null); });
  };
  return (<span className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
    <button type="button" className={`btn sm${tone ? ` ${tone}` : ''}`} onClick={click} disabled={pending}>{pending ? '…' : label}</button>
    {msg?.text && <span className="small" style={{ color: msg.ok ? 'var(--ok, #16a34a)' : 'var(--danger, #dc2626)' }} role="status">{msg.text}</span>}
  </span>);
}
