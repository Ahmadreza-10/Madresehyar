import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { grades, subjects, users } from '@/db/schema';
import { deleteGrade, saveGrades } from '@/app/actions/school';
import { updateGrade } from '@/app/actions/edit';
import { requireSchoolUser } from '@/lib/auth';
import { isStaff, focusStudentIds } from '@/lib/permissions';
import { classesFor, gradeTypeLabels, studentsOfClass, subjectsFor } from '@/lib/school-data';
import { todayTehran } from '@/lib/time';
import { fa, formatJalaliShort, fullName } from '@/lib/format';
import ActionForm from '@/components/ActionForm';
import JalaliDateInput from '@/components/JalaliDateInput';
import { Badge, Card, Empty, PageHead } from '@/components/ui';
import { gradeInsights } from '@/components/GradeInsights';
import { Collapse, Tabs } from '@/components/Interactive';
import { buildPeriods } from '@/lib/trends';

export const metadata = { title: 'نمرات' };
const tone = (v: number) => (v >= 17 ? 'ok' : v >= 12 ? 'primary' : v >= 10 ? 'warn' : 'danger') as 'ok' | 'primary' | 'warn' | 'danger';

export default async function GradesPage({ searchParams }: { searchParams: Promise<{ class?: string; subject?: string; student?: string; p?: string }> }) {
  const u = await requireSchoolUser(); const sp = await searchParams; const today = todayTehran();

  if (!isStaff(u.role)) {
    const ids = await focusStudentIds(u);
    const kids = ids.length ? await db.select().from(users).where(inArray(users.id, ids)) : [];
    const kid = kids.find((k) => k.id === sp.student) ?? kids[0];
    const rows = kid ? await db.select({ g: grades, subject: subjects.name }).from(grades).innerJoin(subjects, eq(subjects.id, grades.subjectId)).where(eq(grades.studentId, kid.id)).orderBy(desc(grades.date), desc(grades.createdAt)) : [];

    // بازه‌ی پیش‌فرض: ماه جاری (اگر نمره دارد)، وگرنه آخرین ماهی که نمره دارد
    const kidClass = kid?.classId ? await db.query.classes.findFirst({ where: (c, { eq: e }) => e(c.id, kid.classId!) }) : null;
    const ps = buildPeriods(kidClass?.academicYear, today);
    const started = ps.months.filter((m) => m.from <= today);
    const hasGrades = (m: { from: string; to: string }) => rows.some((r) => r.g.date >= m.from && r.g.date <= m.to);
    const cur = started[started.length - 1];
    const defKey = cur && hasGrades(cur) ? cur.key : ([...started].reverse().find(hasGrades)?.key ?? 'year');
    const pk = sp.p ?? defKey;
    const period = [...ps.months, ps.year].find((x) => x.key === pk) ?? ps.year;

    // بخش اصلی: فقط آخرین نمره‌ی هر درس در بازه‌ی انتخاب‌شده (ردیف‌ها از جدیدترین به قدیمی‌ترین‌اند)
    const inPeriod = rows.filter((r) => r.g.date >= period.from && r.g.date <= period.to);
    const latest = new Map<string, (typeof rows)[number]>(); const countBy = new Map<string, number>();
    for (const r of inPeriod) { if (!latest.has(r.subject)) latest.set(r.subject, r); countBy.set(r.subject, (countBy.get(r.subject) ?? 0) + 1); }
    const main = !latest.size
      ? <Card><Empty text={`در ${period.label} هنوز نمره‌ای ثبت نشده است. از دکمه‌ی «بازه‌ی نمایش» بالای صفحه ماه دیگری را انتخاب کنید.`} icon="grades" /></Card>
      : <Card title={`آخرین نمره‌ی هر درس — ${period.label}`}><div className="list">{[...latest.values()].map((r) => (
          <div className="list-item" key={r.subject}>
            <div><b>{r.subject}</b><div className="muted small">{r.g.title} • {gradeTypeLabels[r.g.type]} • {formatJalaliShort(r.g.date)}{(countBy.get(r.subject) ?? 0) > 1 && ` • ${fa((countBy.get(r.subject) ?? 1) - 1)} نمره‌ی دیگر در همین بازه (در بخش «نمرات هر درس»)`}</div></div>
            <Badge tone={tone((r.g.score / r.g.maxScore) * 20)}>{fa(r.g.score)} از {fa(r.g.maxScore)}</Badge>
          </div>))}</div></Card>;

    // بخش جدا: هر درس یک تب بازوبسته‌شونده با همه‌ی نمره‌هایش
    const bySubject = new Map<string, typeof rows>(); for (const r of rows) bySubject.set(r.subject, [...(bySubject.get(r.subject) ?? []), r]);
    const perSubject = !rows.length
      ? <Card><Empty text="هنوز نمره‌ای ثبت نشده است." icon="grades" /></Card>
      : <div className="stack"><p className="muted small" style={{ margin: 0 }}>روی نام هر درس بزنید تا همه‌ی نمره‌هایش باز شود.</p>{[...bySubject.entries()].map(([name, list]) => {
          const avg = list.reduce((a, r) => a + (r.g.score / r.g.maxScore) * 20, 0) / list.length;
          return (
            <Collapse key={name} title={name} hint={`${fa(list.length)} نمره`} badge={<Badge tone={tone(avg)}>میانگین {fa(Math.round(avg * 100) / 100)}</Badge>}>
              <div className="list">{list.map((r) => (
                <div className="list-item" key={r.g.id}><div><b>{r.g.title}</b><div className="muted small">{gradeTypeLabels[r.g.type]} • {formatJalaliShort(r.g.date)}</div></div><Badge tone={tone((r.g.score / r.g.maxScore) * 20)}>{fa(r.g.score)} از {fa(r.g.maxScore)}</Badge></div>))}</div>
            </Collapse>);
        })}</div>;

    const ins = kid?.classId ? await gradeInsights({ schoolId: u.schoolId!, classId: kid.classId, studentId: kid.id, periodKey: pk, hrefFor: (p) => `/grades?student=${kid.id}&p=${p}` }) : null;
    return (<><PageHead title={u.role === 'PARENT' ? 'نمرات فرزندان' : 'نمرات من'} sub="نمره‌ها بر مبنای ۲۰ نمایش داده می‌شوند." illus="grades">
        {kids.length > 1 && <form className="row" action="/grades"><select name="student" defaultValue={kid?.id} style={{ width: 220 }}>{kids.map((k) => <option key={k.id} value={k.id}>{fullName(k)}</option>)}</select><button className="btn ghost sm">نمایش</button></form>}
        {ins?.picker}
      </PageHead>
      <Tabs tabs={[
        { id: 'latest', label: '📒 آخرین نمره‌ها', content: main },
        { id: 'subjects', label: '📚 نمرات هر درس', content: perSubject },
        ...(ins ? [{ id: 'best', label: '🏆 بهترین کلاس پایه', content: ins.ranking }, { id: 'trend', label: '📈 روند معدل', content: ins.trend }] : []),
      ]} /></>);
  }
  const cls = await classesFor(u);
  const classId = sp.class && cls.some((c) => c.id === sp.class) ? sp.class : cls[0]?.id;
  const subs = classId ? await subjectsFor(u, classId) : [];
  const subjectId = sp.subject && subs.some((s) => s.id === sp.subject) ? sp.subject : subs[0]?.id;
  const students = classId ? await studentsOfClass(classId, u.schoolId!) : [];
  const recent = subjectId && students.length ? await db.select().from(grades).where(and(eq(grades.subjectId, subjectId), inArray(grades.studentId, students.map((s) => s.id)))).orderBy(desc(grades.date), desc(grades.createdAt)).limit(60) : [];
  const nameOf = new Map(students.map((s) => [s.id, fullName(s)]));
  const ins = classId ? await gradeInsights({ schoolId: u.schoolId!, classId, periodKey: sp.p ?? 'year', hrefFor: (p) => `/grades?class=${classId}${subjectId ? `&subject=${subjectId}` : ''}&p=${p}` }) : null;

  return (
    <>
      <PageHead title="ثبت و مشاهده‌ی نمرات" sub="نمره‌ها را به‌صورت گروهی برای کل کلاس وارد کنید؛ خانه‌ی خالی یعنی «ثبت نشود»." illus="grades">{ins?.picker}</PageHead>
      <Card>
        <form className="row" action="/grades" style={{ alignItems: 'flex-end' }}>
          <div className="field" style={{ minWidth: 220 }}><label>کلاس</label><select name="class" defaultValue={classId}>{cls.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div className="field" style={{ minWidth: 200 }}><label>درس</label><select name="subject" defaultValue={subjectId}>{subs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          <button className="btn ghost">نمایش</button>
        </form>
      </Card>
      <div style={{ height: 16 }} />
      <Tabs tabs={[{ id: 'entry', label: '✏️ ثبت و مشاهده‌ی نمره', content: (<>{!classId || !subjectId ? <Card><Empty text="درسی برای ثبت نمره به شما اختصاص داده نشده است. مدیر سامانه باید شما را به یک کلاس/درس متصل کند." /></Card> : (
        <div className="grid g-main">
          <Card title="ثبت نمره‌ی جدید">
            <ActionForm action={saveGrades} submit="ذخیره‌ی نمره‌ها">
              <input type="hidden" name="classId" value={classId} /><input type="hidden" name="subjectId" value={subjectId} />
              <div className="inline-fields">
                <div className="field"><label>عنوان</label><input name="title" placeholder="مثلاً: آزمون فصل ۲" required /></div>
                <div className="field"><label>نوع</label><select name="type">{Object.entries(gradeTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                <div className="field"><label>نمره‌ی کل</label><input name="maxScore" type="number" defaultValue={20} min={1} max={100} step="0.25" /></div>
              </div>
              <div className="field"><label>تاریخ</label><div style={{ maxWidth: 360 }}><JalaliDateInput name="date" defaultIso={today} /></div></div>
              <div className="list">{students.map((s) => (<div className="list-item" key={s.id}><span>{fullName(s)}</span><input name={`score_${s.id}`} inputMode="decimal" placeholder="نمره" style={{ width: 110 }} /></div>))}</div>
            </ActionForm>
          </Card>
          <Card title="آخرین نمره‌های این درس">
            {recent.length ? <div className="list">{recent.map((g) => (
              <div className="list-item" key={g.id}><div><b>{nameOf.get(g.studentId)}</b><div className="muted small">{g.title} • {formatJalaliShort(g.date)}</div>
                <details style={{ marginTop: 6 }}><summary className="btn ghost sm" style={{ display: 'inline-flex' }}>ویرایش</summary>
                  <div style={{ marginTop: 8, minWidth: 260 }}><ActionForm action={updateGrade} submit="ذخیره" resetOnSuccess={false} small><input type="hidden" name="id" value={g.id} />
                    <div className="field"><label>عنوان</label><input name="title" defaultValue={g.title} required maxLength={100} /></div>
                    <div className="inline-fields"><div className="field"><label>نوع</label><select name="type" defaultValue={g.type}>{Object.entries(gradeTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                      <div className="field"><label>نمره</label><input name="score" inputMode="decimal" defaultValue={g.score} required /></div>
                      <div className="field"><label>نمره‌ی کل</label><input name="maxScore" inputMode="decimal" defaultValue={g.maxScore} required /></div></div>
                    <div className="field"><label>تاریخ</label><JalaliDateInput name="date" defaultIso={g.date} /></div>
                    <div className="field"><label>توضیح (اختیاری)</label><input name="note" defaultValue={g.note ?? ''} maxLength={300} /></div></ActionForm></div></details></div>
                <div className="row" style={{ gap: 6 }}><Badge tone={tone((g.score / g.maxScore) * 20)}>{fa(g.score)}/{fa(g.maxScore)}</Badge>
                  <form action={deleteGrade}><input type="hidden" name="id" value={g.id} /><button className="btn danger sm" aria-label="حذف نمره">×</button></form></div></div>))}</div> : <Empty text="هنوز نمره‌ای ثبت نشده است." icon="grades" />}
          </Card>
        </div>)}</>) }, ...(ins ? [{ id: 'best', label: '🏆 بهترین کلاس پایه', content: ins.ranking }, { id: 'trend', label: '📈 روند معدل', content: ins.trend }] : [])]} />
    </>
  );
}
