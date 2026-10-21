import { deleteStudyReport, saveFeedback } from '@/app/actions/study';
import { methodLabels } from '@/lib/study';
import type { LoadedReport } from '@/lib/study-data';
import { fa, formatDuration } from '@/lib/format';
import ActionForm from './ActionForm';
import { Badge } from './ui';

export default function ReportCard({ r, showStudent, canFeedback, canDelete }: { r: LoadedReport; showStudent?: boolean; canFeedback?: boolean; canDelete?: boolean }) {
  return (
    <article className="report">
      <div className="report-top">
        <div>
          <div className="row" style={{ gap: 8 }}><b>{r.items.length > 1 ? `${fa(r.items.length)} درس` : r.items[0]?.subjectName}</b>{r.items.length > 1 && <span className="muted small">{r.items.map((i) => i.subjectName).join('، ')}</span>}</div>
          <div className="muted small num">{showStudent && <>{r.studentName} • </>}ثبت در ساعت {fa(r.endTime)}</div>
        </div>
        <div className="row" style={{ gap: 6 }}><Badge tone="primary">{formatDuration(r.durationMin)}</Badge></div>
      </div>
      <div className="study-items">{r.items.map((i) => (
        <div className="study-item" key={i.id}>
          <div className="row between" style={{ gap: 8, flexWrap: 'wrap' }}>
            <div><b>{i.subjectName}</b> {i.topic && <><span className="muted">•</span> <span className="small">{i.topic}</span></>}</div>
            <div className="row" style={{ gap: 6 }}>
              {i.studyMin > 0 && <Badge tone="primary">📖 مطالعه {formatDuration(i.studyMin)}</Badge>}
              {i.testMin > 0 && <Badge tone="accent">📝 تست {formatDuration(i.testMin)}</Badge>}
            </div>
          </div>
          {i.methodList.length > 0 && <div className="row" style={{ gap: 6 }}>{i.methodList.map((m) => <Badge key={m}>{methodLabels[m as keyof typeof methodLabels] ?? m}</Badge>)}</div>}
          {i.tests.length > 0 && (
            <div className="tests">{i.tests.map((t) => (
              <div className="test-line num" key={t.id}><b>{t.source}</b><span>{fa(t.totalCount)} تست</span><Badge tone="ok">{fa(t.correctCount)} صحیح</Badge><Badge tone="danger">{fa(t.wrongCount)} غلط</Badge><Badge>{fa(t.blankCount)} نزده</Badge>
                {t.durationMin ? <span className="muted">{fa(t.durationMin)} دقیقه</span> : null}<Badge tone={t.percent >= 60 ? 'ok' : t.percent >= 30 ? 'warn' : 'danger'}>{fa(t.percent)}٪</Badge>{t.note && <span className="muted">— {t.note}</span>}</div>))}</div>
          )}
        </div>))}</div>
      {r.notes && <div className="small muted">📝 {r.notes}</div>}
      {r.teacherFeedback && <div className="feedback"><b>بازخورد معلم:</b> {r.teacherFeedback}</div>}
      {(canFeedback || canDelete) && (
        <div className="row" style={{ alignItems: 'flex-start' }}>
          {canFeedback && (
            <details className="grow"><summary className="btn ghost sm" style={{ display: 'inline-flex' }}>{r.teacherFeedback ? 'ویرایش بازخورد' : 'نوشتن بازخورد'}</summary>
              <div style={{ marginTop: 10 }}><ActionForm action={saveFeedback} submit="ذخیره" resetOnSuccess={false} small><input type="hidden" name="id" value={r.id} /><textarea name="feedback" defaultValue={r.teacherFeedback ?? ''} maxLength={500} placeholder="بازخورد شما برای دانش‌آموز…" /></ActionForm></div></details>
          )}
          {canDelete && <a className="btn ghost sm" href={`/study?edit=${r.id}&tab=form`}>ویرایش</a>}
          {canDelete && <form action={deleteStudyReport}><input type="hidden" name="id" value={r.id} /><button className="btn danger sm">حذف</button></form>}
        </div>
      )}
    </article>
  );
}
