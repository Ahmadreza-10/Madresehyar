'use client';
import { useState } from 'react';

/** دکمه‌ی باز و بسته کردن تقویم */
export default function CalendarToggle({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="cal-toggle2">
      <button type="button" className={`btn${open ? ' ghost' : ''}`} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {open ? '✕ بستن تقویم' : '📅 باز کردن تقویم حضور و غیاب'}
      </button>
      {open && <div style={{ marginTop: 14 }}>{children}</div>}
    </div>
  );
}
