'use client';
import { useMemo, useState } from 'react';
import { isoToJalaliParts, jalaliMonthLength, jalaliToIso, JALALI_MONTHS } from '@/lib/jalali';
import { fa } from '@/lib/format';

/** انتخاب تاریخ شمسی؛ مقدار میلادی (YYYY-MM-DD) در فیلد hidden با نام name ارسال می‌شود */
export default function JalaliDateInput({ name, defaultIso, disabled }: { name: string; defaultIso: string; disabled?: boolean }) {
  const init = isoToJalaliParts(defaultIso);
  const [y, setY] = useState(init.y); const [m, setM] = useState(init.m); const [d, setD] = useState(init.d);
  const maxD = jalaliMonthLength(y, m);
  const day = Math.min(d, maxD);
  const iso = useMemo(() => jalaliToIso(y, m, day), [y, m, day]);
  const years = [init.y - 1, init.y, init.y + 1];
  return (
    <div className="jdate">
      <input type="hidden" name={name} value={iso} />
      <select value={day} onChange={(e) => setD(+e.target.value)} disabled={disabled} aria-label="روز">{Array.from({ length: maxD }, (_, i) => <option key={i} value={i + 1}>{fa(i + 1)}</option>)}</select>
      <select value={m} onChange={(e) => setM(+e.target.value)} disabled={disabled} aria-label="ماه">{JALALI_MONTHS.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}</select>
      <select value={y} onChange={(e) => setY(+e.target.value)} disabled={disabled} aria-label="سال">{years.map((v) => <option key={v} value={v}>{fa(String(v))}</option>)}</select>
    </div>
  );
}
