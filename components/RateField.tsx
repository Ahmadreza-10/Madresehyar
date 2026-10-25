import { fa } from '@/lib/format';

/** امتیازدهی ۱ تا ۵ با دکمه‌های رادیویی (بدون نیاز به جاوااسکریپت) */
export default function RateField({ name, label, hint, defaultValue }: { name: string; label: string; hint?: string; defaultValue?: number }) {
  return (
    <fieldset className="rate">
      <legend>{label}{hint && <small> — {hint}</small>}</legend>
      <div className="rate-opts">{[1, 2, 3, 4, 5].map((n) => (
        <label key={n}><input type="radio" name={name} value={n} defaultChecked={defaultValue === n} required /><span className={`r${n}`}>{fa(n)}</span></label>))}</div>
      <div className="rate-ends"><small>خیلی ضعیف</small><small>عالی</small></div>
    </fieldset>
  );
}
