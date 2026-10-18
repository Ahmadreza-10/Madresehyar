import { fa, formatDurationShort, formatJalaliShort } from '@/lib/format';
import { addDays } from '@/lib/time';
import { isoToJalaliParts } from '@/lib/jalali';

export function WeekChart({ data }: { data: { date: string; min: number }[] }) {
  const max = Math.max(60, ...data.map((d) => d.min));
  return (
    <div className="bars" role="img" aria-label="نمودار مطالعه‌ی ۷ روز اخیر">
      {data.map((d) => {
        const [y, m, dd] = d.date.split('-').map(Number); const wd = ['ی', 'د', 'س', 'چ', 'پ', 'ج', 'ش'][new Date(Date.UTC(y, m - 1, dd)).getUTCDay()];
        return (<div className="bar-col" key={d.date}><span className="bar-val num">{d.min ? formatDurationShort(d.min) : ''}</span><div className={`bar${d.min ? '' : ' zero'}`} style={{ height: `${Math.max(3, (d.min / max) * 100)}%` }} /><span className="bar-lbl">{wd}</span><span className="bar-lbl num" style={{ opacity: .6 }}>{fa(isoToJalaliParts(d.date).d)}</span></div>);
      })}
    </div>
  );
}

/** نقشه‌ی گرمایی ۳۰ روز: هر خانه یک روز؛ هرچه پررنگ‌تر، مطالعه‌ی بیشتر (قدیمی‌ترین روز بالا-راست) */
export function Heatmap({ reports, today }: { reports: { date: string; min: number }[]; today: string }) {
  const by = new Map<string, number>(); for (const r of reports) by.set(r.date, (by.get(r.date) ?? 0) + r.min);
  const days = Array.from({ length: 30 }, (_, i) => addDays(today, i - 29));
  const lvl = (m: number) => (m === 0 ? '' : m < 45 ? 'l1' : m < 90 ? 'l2' : m < 180 ? 'l3' : 'l4');
  return (<div><div className="heat" role="img" aria-label="نقشه‌ی فعالیت مطالعه">{days.map((d, k) => <i key={d} style={{ '--i': k } as React.CSSProperties} className={lvl(by.get(d) ?? 0)} title={`${formatJalaliShort(d)} • ${fa(by.get(d) ?? 0)} دقیقه`} />)}</div><div className="muted small" style={{ marginTop: 8 }}>هر خانه یک روز است؛ رنگ پررنگ‌تر یعنی مطالعه‌ی بیشتر.</div></div>);
}
