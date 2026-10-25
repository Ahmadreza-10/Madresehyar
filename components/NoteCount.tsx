'use client';
import { useRef } from 'react';

/** تعداد مثبت/منفی برای یک بار ثبت: عدد دلخواه (۱ تا ۱۰۰) یا دکمه‌های سریع */
export default function NoteCount({ defaultValue = 1 }: { defaultValue?: number }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="field">
      <label>تعداد <span className="muted">(مثلاً ۲۰ مثبت یا ۱۰ منفی با یک بار ثبت؛ برای «یادداشت ساده» بی‌اثر است)</span></label>
      <input ref={ref} type="number" name="count" min={1} max={100} inputMode="numeric" defaultValue={defaultValue} />
      <div className="quick-min">{[1, 2, 5, 10, 20, 50].map((n) => <button type="button" key={n} onClick={() => { if (ref.current) ref.current.value = String(n); }}>{n.toLocaleString('fa-IR')}</button>)}</div>
    </div>
  );
}
