'use client';
import { useMemo, useState } from 'react';
import { isoToJalaliParts, jalaliMonthLength, jalaliToIso, JALALI_MONTHS } from '@/lib/jalali';
import { fa } from '@/lib/format';

export type AttRecord = { date: string; status: 'absent' | 'late' | 'excused'; note?: string | null; excuse?: 'pending' | 'approved' | 'rejected' | null };
const LABEL = { absent: 'غیبت', late: 'تأخیر', excused: 'غیبت موجه' } as const;
const EXCUSE = { pending: 'درخواست موجه شدن در انتظار بررسی است', approved: 'درخواست موجه شدن پذیرفته شد', rejected: 'درخواست موجه شدن پذیرفته نشد' } as const;
const HEAD = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];
const dow = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 1) % 7; }; // شنبه = ۰

/** تقویم شمسیِ حضور و غیاب: روزِ دارای غیبت/تأخیر نقطه‌ی رنگی دارد؛ با کلیک روی هر روز وضعیتش را می‌بینید */
export default function AttendanceCalendar({ records, today, studentName }: { records: AttRecord[]; today: string; studentName?: string }) {
  const t = isoToJalaliParts(today);
  const [ym, setYm] = useState({ y: t.y, m: t.m });
  const [sel, setSel] = useState<string>(today);
  const byDate = useMemo(() => new Map(records.map((r) => [r.date, r])), [records]);
  const len = jalaliMonthLength(ym.y, ym.m);
  const first = dow(jalaliToIso(ym.y, ym.m, 1));
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: len }, (_, i) => i + 1)];
  const move = (d: number) => setYm(({ y, m }) => { let nm = m + d, ny = y; if (nm > 12) { nm = 1; ny++; } if (nm < 1) { nm = 12; ny--; } return { y: ny, m: nm }; });
  const monthCount = (s: AttRecord['status']) => records.filter((r) => { const p = isoToJalaliParts(r.date); return p.y === ym.y && p.m === ym.m && r.status === s; }).length;
  const rec = byDate.get(sel); const sp = isoToJalaliParts(sel); const future = sel > today; const friday = dow(sel) === 6;
  const who = studentName ? `${studentName} ` : 'شما '; const have = studentName ? 'داشته است' : 'داشته‌اید'; const was = studentName ? 'حاضر بوده است' : 'حاضر بوده‌اید';

  return (
    <div className="att-cal">
      {/* جهت ثابت (ltr) تا فلش‌ها در صفحه‌ی راست‌به‌چپ جابه‌جا نشوند: فلش سمت راست = ماه قبل، فلش سمت چپ = ماه بعد */}
      <div className="att-cal-head" dir="ltr">
        <button type="button" className="att-nav" onClick={() => move(1)} aria-label="ماه بعد" title="ماه بعد"><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 L5 8 L10 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
        <div className="att-title" dir="rtl"><b>{JALALI_MONTHS[ym.m - 1]}</b><span>{fa(ym.y)}</span></div>
        <button type="button" className="att-nav" onClick={() => move(-1)} aria-label="ماه قبل" title="ماه قبل"><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3 L11 8 L6 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
      </div>
      <div className="att-stats">
        <div className="att-stat absent"><b>{fa(monthCount('absent'))}</b><span>غیبت</span></div>
        <div className="att-stat late"><b>{fa(monthCount('late'))}</b><span>تأخیر</span></div>
        <div className="att-stat excused"><b>{fa(monthCount('excused'))}</b><span>موجه</span></div>
      </div>
      <div className="att-grid">
        {HEAD.map((h) => <div key={h} className="att-dow">{h}</div>)}
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} />;
          const iso = jalaliToIso(ym.y, ym.m, d); const r = byDate.get(iso);
          return (
            <button type="button" key={iso} onClick={() => setSel(iso)} aria-label={`${fa(d)} ${JALALI_MONTHS[ym.m - 1]}${r ? ' ' + LABEL[r.status] : ''}`}
              className={`att-day${iso === today ? ' today' : ''}${iso === sel ? ' sel' : ''}${r ? ' has ' + r.status : ''}${dow(iso) === 6 ? ' off' : ''}${iso > today ? ' future' : ''}`}>
              <span>{fa(d)}</span>
              {r && <i className={`att-dot ${r.status}`} />}
            </button>);
        })}
      </div>
      <div className="att-legend small muted"><span><i className="att-dot absent" /> غیبت</span><span><i className="att-dot late" /> تأخیر</span><span><i className="att-dot excused" /> موجه</span><button type="button" className="att-today" onClick={() => { setYm({ y: t.y, m: t.m }); setSel(today); }}>امروز</button></div>
      <div className={`att-detail ${rec ? rec.status : future || friday ? 'none' : 'ok'}`} role="status">
        <b className="att-detail-date">{rec ? (rec.status === 'late' ? '⏰ ' : rec.status === 'absent' ? '🚫 ' : '📄 ') : future || friday ? '📅 ' : '✅ '}{fa(sp.d)} {JALALI_MONTHS[sp.m - 1]}</b>
        {rec ? (<div>{who}در این روز <b>{LABEL[rec.status]}</b> {have}.{rec.note && <div className="small muted">توضیح ثبت‌کننده: {rec.note}</div>}{rec.excuse && <div className="small">{EXCUSE[rec.excuse]}</div>}</div>)
          : future ? <div className="muted">این روز هنوز نرسیده است.</div>
          : friday ? <div className="muted">جمعه؛ روز تعطیل.</div>
          : <div>{who}در این روز {was}؛ غیبت یا تأخیری ثبت نشده است.</div>}
      </div>
    </div>
  );
}
