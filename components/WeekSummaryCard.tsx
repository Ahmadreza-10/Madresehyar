import { fa, formatDuration } from '@/lib/format';
import type { WeekSummary } from '@/lib/weekly';

/** خلاصه‌ی این هفته (شنبه تا امروز). name = نام فرزند (برای ولی) */
export default function WeekSummaryCard({ s, name }: { s: WeekSummary; name?: string }) {
  return (
    <section className="card week-card" aria-label="خلاصه‌ی این هفته">
      <h3>{name ? `این هفته — ${name}` : 'خلاصه‌ی این هفته'}</h3>
      <p className="muted small week-head">{s.headline}</p>
      <div className="week-goal small">مطالعه‌ی این هفته: <b className="num">{formatDuration(s.studyMin)}</b></div>
      <div className="week-facts">
        <div><b className="num">{fa(s.studyDays)}</b><span>روز مطالعه</span></div>
        <div><b className="num">{fa(s.absences + s.lates)}</b><span>غیبت/تأخیر</span></div>
        <div><b className="num">{fa(s.gradeCount)}</b><span>نمره‌ی تازه</span></div>
      </div>
    </section>
  );
}
