'use client';
import type { ReactNode } from 'react';

/** منوی انتخابی که با تغییر مقدار، فرمِ خودش را همان لحظه ارسال می‌کند (دیگر لازم نیست دکمه‌ی «فیلتر» بزنید) */
export default function AutoSelect({ name, defaultValue, width = 220, children, label }: { name: string; defaultValue: string; width?: number; children: ReactNode; label: string }) {
  return (
    <select name={name} defaultValue={defaultValue} style={{ width }} aria-label={label} onChange={(e) => e.currentTarget.form?.requestSubmit()}>{children}</select>
  );
}
