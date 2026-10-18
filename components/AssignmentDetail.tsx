'use client';
import { useEffect, useRef, useState, useTransition } from 'react';
import { haptic } from '@/lib/prefs';
import type { ActionState } from '@/lib/action';

type Act = (fd: FormData) => Promise<ActionState>;

/** مراحل تکلیف با تیک؛ دانش‌آموز تیک می‌زند و بلافاصله ذخیره می‌شود (برای بقیه فقط نمایش) */
export function StepList({ action, assignmentId, steps, done, readOnly }: { action: Act; assignmentId: string; steps: string[]; done: number[]; readOnly?: boolean }) {
  const [on, setOn] = useState(new Set(done)); const [err, setErr] = useState(''); const [, start] = useTransition();
  const click = (i: number) => {
    if (readOnly) return;
    const next = new Set(on); if (next.has(i)) next.delete(i); else next.add(i); setOn(next); setErr(''); haptic();
    const fd = new FormData(); fd.set('assignmentId', assignmentId); fd.set('index', String(i));
    start(async () => { const r = await action(fd); if (r && !r.ok) { setOn(on); setErr(r.error ?? 'خطا'); } });
  };
  const n = steps.filter((_, i) => on.has(i)).length;
  return (
    <div>
      <div className="row between" style={{ marginBottom: 10 }}><h3>مراحل انجام</h3><span className="muted small num">{n.toLocaleString('fa-IR')} از {steps.length.toLocaleString('fa-IR')}</span></div>
      <div className="progress" style={{ marginBottom: 12 }}><span style={{ width: `${steps.length ? (n / steps.length) * 100 : 0}%` }} /></div>
      <div className="steps">{steps.map((s, i) => (
        <button type="button" key={i} className={`step${on.has(i) ? ' on' : ''}`} onClick={() => click(i)} aria-pressed={on.has(i)} disabled={readOnly} style={readOnly ? { cursor: 'default' } : undefined}>
          <span className="box" aria-hidden>{on.has(i) ? '✓' : ''}</span><span className="t">{s}</span>
        </button>))}</div>
      {err && <div className="alert error" role="alert" style={{ marginTop: 8 }}>{err}</div>}
    </div>
  );
}

/** یادداشت شخصی دانش‌آموز؛ ۰٫۸ ثانیه بعد از آخرین نوشتن خودکار ذخیره می‌شود */
export function NoteBox({ action, assignmentId, initial }: { action: Act; assignmentId: string; initial: string }) {
  const [v, setV] = useState(initial); const [st, setSt] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const first = useRef(true); const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setSt('saving'); if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const fd = new FormData(); fd.set('assignmentId', assignmentId); fd.set('note', v);
      try { const r = await action(fd); setSt(r?.ok ? 'saved' : 'error'); } catch { setSt('error'); }
    }, 800);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [v, action, assignmentId]);
  return (
    <div>
      <div className="row between" style={{ marginBottom: 6 }}><span className="muted small">فقط برای خودتان • خودکار ذخیره می‌شود</span>
        <span className="small" style={{ color: st === 'error' ? 'var(--danger)' : 'var(--muted)' }} role="status">{st === 'saving' ? 'در حال ذخیره…' : st === 'saved' ? '✓ ذخیره شد' : st === 'error' ? 'ذخیره نشد' : ''}</span></div>
      <textarea className="note-box" value={v} maxLength={1000} onChange={(e) => setV(e.target.value)} placeholder="سؤال‌هایی که باید از معلم بپرسم…" />
    </div>
  );
}

/** دکمه‌ی چسبیده به پایین صفحه: علامت‌گذاری به‌عنوان انجام‌شده (و برداشتن آن) */
export function DoneBar({ action, assignmentId, done, locked }: { action: Act; assignmentId: string; done: boolean; locked?: boolean }) {
  const [on, setOn] = useState(done); const [err, setErr] = useState(''); const [pending, start] = useTransition();
  const click = () => {
    const next = !on; setOn(next); setErr(''); haptic(next ? 30 : 15);
    const fd = new FormData(); fd.set('assignmentId', assignmentId);
    start(async () => { const r = await action(fd); if (r && !r.ok) { setOn(!next); setErr(r.error ?? 'خطا'); } });
  };
  return (
    <div className="done-bar">
      <button type="button" className={`done-btn${on ? ' on' : ''}`} onClick={click} disabled={pending || locked}>{on ? '✓ انجام شد (برای برداشتن، دوباره بزنید)' : '✓ علامت‌گذاری به‌عنوان انجام‌شده'}</button>
      {err && <div className="alert error" role="alert" style={{ marginTop: 8 }}>{err}</div>}
      <p className="muted small center" style={{ marginTop: 8 }}>{locked ? 'معلم برای این تکلیف منفی ثبت کرده است.' : 'وضعیت شما برای معلم ثبت می‌شود تا ببیند چه کسی تکلیف را انجام داده است.'}</p>
    </div>
  );
}
