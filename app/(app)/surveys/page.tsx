import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { classes, classSubjects, subjects, teacherReviews, users } from '@/db/schema';
import { setSurveyOpen, submitTeacherReview, toggleReviewHidden } from '@/app/actions/surveys';
import { requireSchoolUser } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { fa, fullName } from '@/lib/format';
import { CRITERIA, MIN_RESPONSES, starText, summarizeReviews, verdict, verdictTone, type ReviewSummary } from '@/lib/survey';
import ActionForm from '@/components/ActionForm';
import { Collapse } from '@/components/Interactive';
import RateField from '@/components/RateField';
import { Badge, Card, Empty, PageHead } from '@/components/ui';

export const metadata = { title: 'نظرسنجی معلم‌ها' };
export const dynamic = 'force-dynamic';

/** میانگین هر معیار به‌صورت نوار */
function Meters({ s }: { s: ReviewSummary }) {
  return (
    <div className="meters">{CRITERIA.map((c) => (
      <div className="meter" key={c.key}>
        <span className="meter-l">{c.label}</span>
        <div className="meter-bar"><span style={{ width: `${(s[c.key] / 5) * 100}%` }} className={`m${Math.round(s[c.key])}`} /></div>
        <b className="num">{fa(s[c.key])}</b>
      </div>))}</div>
  );
}
type Cm = { id: string; overall: number; comment: string | null; hidden: boolean };
function Comments({ list, manage }: { list: Cm[]; manage?: boolean }) {
  const shown = list.filter((c) => c.comment && (manage || !c.hidden));
  if (!shown.length) return <p className="muted small" style={{ margin: 0 }}>هنوز نظر نوشته‌ای ثبت نشده است.</p>;
  return (
    <div className="list">{shown.map((c) => (
      <div className="list-item" key={c.id} style={{ alignItems: 'flex-start', opacity: c.hidden ? .55 : 1 }}>
        <div className="small" style={{ flex: 1 }}><div className="rv-stars" aria-label={`امتیاز کلی ${c.overall} از ۵`}>{starText(c.overall)}</div>{c.comment}{c.hidden && <div className="muted">(پنهان‌شده برای معلم)</div>}</div>
        {manage && <form action={toggleReviewHidden}><input type="hidden" name="id" value={c.id} /><button className="btn ghost sm">{c.hidden ? 'آشکار کردن' : 'پنهان کردن'}</button></form>}
      </div>))}</div>
  );
}

export default async function SurveysPage() {
  const u = await requireSchoolUser(['STUDENT', 'TEACHER', 'PRINCIPAL', 'VICE']); const school = u.schoolId!;
  const settings = await getSettings(school); const open = settings.teacherSurveyOpen !== '0';
  const years = await db.selectDistinct({ y: classes.academicYear }).from(classes).where(eq(classes.schoolId, school));
  const year = years.map((x) => x.y).sort().at(-1) ?? '';

  // ---------------- دانش‌آموز ----------------
  if (u.role === 'STUDENT') {
    const rows = u.classId ? await db.select({ teacherId: classSubjects.teacherId, subjectId: classSubjects.subjectId, subject: subjects.name, tf: users.firstName, tl: users.lastName, year: classes.academicYear })
      .from(classSubjects).innerJoin(subjects, eq(subjects.id, classSubjects.subjectId)).innerJoin(users, eq(users.id, classSubjects.teacherId)).innerJoin(classes, eq(classes.id, classSubjects.classId))
      .where(eq(classSubjects.classId, u.classId)).orderBy(asc(subjects.name)) : [];
    const mine = rows.length ? await db.select().from(teacherReviews).where(and(eq(teacherReviews.studentId, u.id), eq(teacherReviews.academicYear, rows[0].year))) : [];
    const mineOf = new Map(mine.map((r) => [`${r.teacherId}:${r.subjectId}`, r]));
    const done = rows.filter((r) => mineOf.has(`${r.teacherId}:${r.subjectId}`)).length;
    return (
      <>
        <PageHead illus="survey" title="نظرسنجی معلم‌ها" sub="نظر صادقانه و محترمانه‌ی شما به بهتر شدن کلاس کمک می‌کند." />
        <div className="alert ok" style={{ marginBottom: 14 }}>🔒 <b>نظر شما ناشناس است.</b> نه معلم و نه مدیر نمی‌بینند چه کسی چه نوشته است. فقط میانگین نمره‌ها و متن نظرها نمایش داده می‌شود.</div>
        {!open && <div className="alert warn" style={{ marginBottom: 14 }}>نظرسنجی فعلاً بسته است و نمی‌توانید نظر جدید ثبت کنید.</div>}
        {!rows.length ? <Card><Empty text="هنوز معلمی برای درس‌های کلاس شما مشخص نشده است." icon="users" /></Card> : (
          <div className="stack">
            <div className="muted small">برای {fa(rows.length)} معلم می‌توانید نظر بدهید • {fa(done)} مورد را ثبت کرده‌اید. روی نام هر معلم بزنید.</div>
            {rows.map((r) => {
              const m = mineOf.get(`${r.teacherId}:${r.subjectId}`);
              return (
                <Collapse key={`${r.teacherId}:${r.subjectId}`} title={`${r.tf} ${r.tl}`} hint={`درس ${r.subject}`} badge={m ? <Badge tone="ok">ثبت شد • {starText(m.overall)}</Badge> : <Badge tone="warn">ثبت نشده</Badge>}>
                  <ActionForm action={submitTeacherReview} submit={m ? 'به‌روزرسانی نظر' : 'ثبت نظر'} resetOnSuccess={false}>
                    <input type="hidden" name="teacherId" value={r.teacherId ?? ''} /><input type="hidden" name="subjectId" value={r.subjectId} />
                    {CRITERIA.map((c) => <RateField key={c.key} name={c.key} label={c.label} hint={c.hint} defaultValue={m?.[c.key]} />)}
                    <div className="field"><label>توضیح <span className="muted">(اختیاری)</span></label><textarea name="comment" defaultValue={m?.comment ?? ''} maxLength={500} placeholder="چه چیزی خوب بود؟ چه چیزی می‌تواند بهتر شود؟ مؤدبانه و بدون توهین بنویسید." style={{ minHeight: 80 }} /></div>
                  </ActionForm>
                </Collapse>);
            })}
          </div>)}
      </>
    );
  }

  // ---------------- معلم ----------------
  if (u.role === 'TEACHER') {
    const revs = await db.select().from(teacherReviews).where(and(eq(teacherReviews.teacherId, u.id), eq(teacherReviews.academicYear, year)));
    const subs = revs.length ? await db.select().from(subjects).where(inArray(subjects.id, [...new Set(revs.map((r) => r.subjectId))])) : [];
    const mySubs = await db.selectDistinct({ id: subjects.id, name: subjects.name }).from(classSubjects).innerJoin(subjects, eq(subjects.id, classSubjects.subjectId)).where(eq(classSubjects.teacherId, u.id));
    const names = new Map([...subs, ...mySubs].map((s) => [s.id, s.name]));
    const ids = [...new Set([...mySubs.map((s) => s.id), ...revs.map((r) => r.subjectId)])];
    return (
      <>
        <PageHead illus="survey" title="نظرسنجی دانش‌آموزان" sub={`نظر ناشناس دانش‌آموزان درباره‌ی تدریس شما • سال تحصیلی ${year}`} />
        <div className="alert ok" style={{ marginBottom: 14 }}>🔒 برای حفظ ناشناس‌ماندن دانش‌آموزان، نتیجه فقط وقتی نمایش داده می‌شود که حداقل <b>{fa(MIN_RESPONSES)}</b> نفر نظر داده باشند.</div>
        {!ids.length ? <Card><Empty text="هنوز درسی برای شما ثبت نشده است." icon="users" /></Card> : (
          <div className="stack">{ids.map((sid) => {
            const list = revs.filter((r) => r.subjectId === sid); const sum = summarizeReviews(list); const enough = !!sum && sum.n >= MIN_RESPONSES;
            return (
              <Card key={sid} title={`درس ${names.get(sid) ?? ''}`} action={<Badge tone={enough ? verdictTone(sum!.overall) : undefined}>{enough ? `${starText(sum!.overall)} ${verdict(sum!.overall)}` : `${fa(sum?.n ?? 0)} نظر`}</Badge>}>
                {enough ? (<><div className="muted small" style={{ marginBottom: 8 }}>میانگین {fa(sum!.n)} دانش‌آموز (از ۵)</div><Meters s={sum!} /><h4 style={{ margin: '16px 0 8px' }}>نظرهای نوشته‌شده</h4><Comments list={list} /></>)
                  : <p className="muted" style={{ margin: 0 }}>هنوز تعداد نظرها به {fa(MIN_RESPONSES)} نرسیده است ({fa(sum?.n ?? 0)} نظر). بعد از رسیدن به این تعداد، نتیجه اینجا دیده می‌شود.</p>}
              </Card>);
          })}</div>)}
      </>
    );
  }

  // ---------------- مدیر / معاون ----------------
  const revs = await db.select().from(teacherReviews).where(and(eq(teacherReviews.schoolId, school), eq(teacherReviews.academicYear, year)));
  const teach = await db.select({ teacherId: classSubjects.teacherId, subjectId: classSubjects.subjectId, subject: subjects.name, tf: users.firstName, tl: users.lastName }).from(classSubjects)
    .innerJoin(classes, eq(classes.id, classSubjects.classId)).innerJoin(subjects, eq(subjects.id, classSubjects.subjectId)).innerJoin(users, eq(users.id, classSubjects.teacherId)).where(eq(classes.schoolId, school));
  const T = new Map<string, { name: string; subs: Map<string, string> }>();
  for (const t of teach) { if (!t.teacherId) continue; const e = T.get(t.teacherId) ?? { name: fullName({ firstName: t.tf, lastName: t.tl }), subs: new Map() }; e.subs.set(t.subjectId, t.subject); T.set(t.teacherId, e); }
  const cards = [...T.entries()].map(([id, e]) => { const mine = revs.filter((r) => r.teacherId === id); return { id, ...e, mine, sum: summarizeReviews(mine) }; })
    .sort((a, b) => (b.sum?.overall ?? -1) - (a.sum?.overall ?? -1));
  return (
    <>
      <PageHead illus="survey" title="نظرسنجی معلمان" sub={`نتیجه‌ی ناشناسِ نظر دانش‌آموزان • سال تحصیلی ${year}`} />
      <Card title="وضعیت نظرسنجی" action={<Badge tone={open ? 'ok' : 'warn'}>{open ? 'باز است' : 'بسته است'}</Badge>}>
        <p className="muted small" style={{ marginTop: 0 }}>وقتی نظرسنجی بسته باشد، دانش‌آموزان نمی‌توانند نظر جدید ثبت یا ویرایش کنند. نتیجه‌ها همچنان دیده می‌شود. هویت دانش‌آموزان برای هیچ‌کس (حتی مدیر) نمایش داده نمی‌شود.</p>
        <ActionForm action={setSurveyOpen} submit={open ? 'بستن نظرسنجی' : 'باز کردن نظرسنجی'} small danger={open}><input type="hidden" name="open" value={open ? '0' : '1'} /></ActionForm>
      </Card>
      <div style={{ height: 16 }} />
      {!cards.length ? <Card><Empty text="هنوز معلمی به درسی در کلاس‌ها وصل نشده است." icon="users" /></Card> : (
        <div className="stack">
          <div className="muted small">{fa(cards.length)} معلم • {fa(revs.length)} نظر ثبت‌شده. روی نام هر معلم بزنید.</div>
          {cards.map((c) => (
            <Collapse key={c.id} title={c.name} hint={`درس‌ها: ${[...c.subs.values()].join('، ')}`} badge={c.sum ? <Badge tone={verdictTone(c.sum.overall)}>{starText(c.sum.overall)} {fa(c.sum.overall)} • {fa(c.sum.n)} نظر</Badge> : <Badge>بدون نظر</Badge>}>
              {c.sum ? (<>
                {c.sum.n < MIN_RESPONSES && <div className="alert warn" style={{ marginBottom: 10 }}>تعداد نظرها کمتر از {fa(MIN_RESPONSES)} است؛ برای معلم هنوز نمایش داده نمی‌شود.</div>}
                <Meters s={c.sum} />
                {[...c.subs.entries()].filter(([sid]) => c.mine.some((r) => r.subjectId === sid)).length > 1 && (
                  <div className="chips" style={{ marginTop: 10 }}>{[...c.subs.entries()].map(([sid, nm]) => { const sm = summarizeReviews(c.mine.filter((r) => r.subjectId === sid)); return sm ? <span key={sid} className="badge">{nm}: {fa(sm.overall)} ({fa(sm.n)} نظر)</span> : null; })}</div>)}
                <h4 style={{ margin: '16px 0 8px' }}>نظرهای نوشته‌شده</h4>
                <Comments list={c.mine} manage />
              </>) : <p className="muted" style={{ margin: 0 }}>هنوز هیچ دانش‌آموزی درباره‌ی این معلم نظر نداده است.</p>}
            </Collapse>))}
        </div>)}
    </>
  );
}
