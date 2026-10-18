'use client';
import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';

const Chevron = () => (<svg className="chev" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>);

/** تب‌ها: فقط یک بخش دیده می‌شود تا صفحه شلوغ نشود. همه‌ی بخش‌ها از قبل ساخته شده‌اند (تعویض فوری است). */
export function Tabs({ tabs, initial = 0, initialId }: { tabs: { id: string; label: string; badge?: ReactNode; content: ReactNode }[]; initial?: number; initialId?: string }) {
  const start = initialId ? Math.max(0, tabs.findIndex((t) => t.id === initialId)) : initial;
  const [i, setI] = useState(start);
  return (
    <div className="tabs">
      <div className="tab-list no-print" role="tablist">
        {tabs.map((t, k) => (<button key={t.id} type="button" role="tab" aria-selected={k === i} className={`tab${k === i ? ' on' : ''}`} onClick={() => setI(k)}>{t.label}{t.badge}</button>))}
      </div>
      {tabs.map((t, k) => (<div key={t.id} role="tabpanel" hidden={k !== i} className="tab-panel">{t.content}</div>))}
    </div>
  );
}

/** بخش جمع‌شونده؛ در چاپ همیشه باز است. */
export function Collapse({ title, children, defaultOpen = false, badge, hint }: { title: string; children: ReactNode; defaultOpen?: boolean; badge?: ReactNode; hint?: string }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`card collapse${open ? ' open' : ''}`}>
      <button type="button" className="collapse-head" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="collapse-title">{title}{hint && <small>{hint}</small>}</span>{badge}<Chevron />
      </button>
      <div className="collapse-body">{children}</div>
    </section>
  );
}

/** دکمه‌ی «بازه»: با زدنش ماه‌ها باز می‌شوند و کاربر کل سال یا یک ماه (مثلاً مهر) را انتخاب می‌کند. */
export function PeriodPicker({ current, options }: { current: string; options: { key: string; label: string; href: string }[] }) {
  const [open, setOpen] = useState(false); const ref = useRef<HTMLDivElement>(null);
  const [side, setSide] = useState<'start' | 'end'>('start');
  // منو همیشه به سمتی باز می‌شود که از صفحه بیرون نزند (قبل از باز شدن، فضای دو طرف دکمه سنجیده می‌شود)
  const toggle = () => {
    if (!open && ref.current) {
      const r = ref.current.getBoundingClientRect(); const w = Math.min(360, window.innerWidth * 0.92); const rtl = getComputedStyle(ref.current).direction === 'rtl';
      setSide((rtl ? r.right - w < 8 : r.left + w > window.innerWidth - 8) ? 'end' : 'start');
    }
    setOpen(!open);
  };
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', down); document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key); };
  }, [open]);
  const year = options.find((o) => o.key === 'year') ?? options[0]; const months = options.filter((o) => o.key !== 'year');
  const cur = options.find((o) => o.key === current) ?? year;
  return (
    <div className="picker no-print" ref={ref}>
      <button type="button" className={`picker-btn${open ? ' open' : ''}`} aria-expanded={open} onClick={toggle}>
        <span className="picker-ico" aria-hidden="true">🗓️</span><span className="picker-txt"><small>بازه‌ی نمایش</small><b>{cur.label}</b></span><Chevron />
      </button>
      {open && (
        <div className={`picker-panel side-${side}`} role="listbox">
          <Link href={year.href} onClick={() => setOpen(false)} className={`picker-year${current === 'year' || !months.some((m) => m.key === current) ? ' on' : ''}`}>📚 کل سال تحصیلی</Link>
          <div className="picker-title">ماه‌به‌ماه</div>
          <div className="picker-months">{months.map((m) => (<Link key={m.key} href={m.href} onClick={() => setOpen(false)} className={`picker-month${m.key === current ? ' on' : ''}`}>{m.label}</Link>))}</div>
        </div>
      )}
    </div>
  );
}
