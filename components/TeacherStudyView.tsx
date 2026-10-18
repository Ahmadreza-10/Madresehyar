import Link from 'next/link';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { classes, classSubjects, studyReportItems, studyReports, subjects, users } from '@/db/schema';
import { addDays, todayTehran } from '@/lib/time';
import { fa, formatDuration, formatJalali, fullName } from '@/lib/format';
import { Badge, Card, Empty, PageHead } from './ui';

/** دید معلم از مطالعه: فقط «زمانِ مطالعه‌ی درس خودش» در یک روز (پیش‌فرض دیروز)؛ اگر مطالعه نکرده «عدم مطالعه». مجموع ساعات و درس‌های دیگر دیده نمی‌شود. */
export default async function TeacherStudyView({ teacherId, schoolId, dateParam }: { teacherId: string; schoolId: string; dateParam?: string }) {
  const today = todayTehran();
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, -(i + 1))); // دیروز تا ۷ روز قبل
  const date = dateParam && days.includes(dateParam) ? dateParam : days[0];
  const pairs = await db.select({ classId: classSubjects.classId, className: classes.name, subjectId: classSubjects.subjectId, subjectName: subjects.name }).from(classSubjects)
    .innerJoin(classes, eq(classes.id, classSubjects.classId)).innerJoin(subjects, eq(subjects.id, classSubjects.subjectId))
    .where(and(eq(classSubjects.teacherId, teacherId), eq(classes.schoolId, schoolId))).orderBy(asc(classes.name), asc(subjects.name));
  const classIds = [...new Set(pairs.map((p) => p.classId))];
  const students = classIds.length ? await db.select().from(users).where(and(eq(users.role, 'STUDENT'), eq(users.schoolId, schoolId), inArray(users.classId, classIds))).orderBy(asc(users.lastName)) : [];
  const subjectIds = [...new Set(pairs.map((p) => p.subjectId))];
  // فقط ستون‌های لازم: درس خودِ معلم و زمان‌ها؛ موضوع، تست و بقیه‌ی درس‌های همان گزارش هرگز خوانده نمی‌شوند
  const reps = students.length && subjectIds.length ? await db.select({ studentId: studyReports.studentId, subjectId: studyReportItems.subjectId, study: studyReportItems.studyMin, test: studyReportItems.testMin }).from(studyReportItems)
    .innerJoin(studyReports, eq(studyReports.id, studyReportItems.reportId))
    .where(and(eq(studyReports.date, date), inArray(studyReports.studentId, students.map((s) => s.id)), inArray(studyReportItems.subjectId, subjectIds))) : [];
  const parts = (sid: string, sub: string) => reps.filter((r) => r.studentId === sid && r.subjectId === sub).reduce((a, r) => ({ study: a.study + r.study, test: a.test + r.test }), { study: 0, test: 0 });
  const minutes = (sid: string, sub: string) => { const p = parts(sid, sub); return p.study + p.test; };
  return (
    <>
      <PageHead title="مطالعه‌ی درس شما" sub="فقط زمان مطالعه‌ی هر دانش‌آموز برای درسِ خودتان نمایش داده می‌شود؛ اگر مطالعه نکرده باشد «عدم مطالعه» می‌بینید." />
      <div className="seg" style={{ marginBottom: 16, flexWrap: 'wrap' }}>{days.map((d, i) => <Link key={d} href={`/study?d=${d}`} className={d === date ? 'on' : ''}>{i === 0 ? 'دیروز' : formatJalali(d)}</Link>)}</div>
      {!pairs.length ? <Card><Empty text="درسی به شما اختصاص داده نشده است." icon="study" /></Card> : (
        <div className="stack">{pairs.map((p) => { const p0 = p;
          const list = students.filter((s) => s.classId === p.classId);
          const studied = list.filter((s) => minutes(s.id, p.subjectId) > 0).length;
          return (<Card key={p.classId + p.subjectId} title={`${p.subjectName} — ${p.className}`} action={<span className="muted small">{formatJalali(date, true)} • {fa(studied)} نفر مطالعه کرده‌اند، {fa(list.length - studied)} نفر عدم مطالعه</span>}>
            {list.length ? <div className="table-wrap"><table><thead><tr><th>دانش‌آموز</th><th>مطالعه‌ی درس {p.subjectName}</th></tr></thead><tbody>
              {list.map((s) => { const m = minutes(s.id, p.subjectId); return (<tr key={s.id}><td>{fullName(s)}</td><td>{m > 0 ? (<div className="row" style={{ gap: 6 }}><Badge tone="ok">{formatDuration(m)}</Badge>{(() => { const p = parts(s.id, p0.subjectId); return <span className="muted small">{p.study > 0 && `مطالعه ${formatDuration(p.study)}`}{p.study > 0 && p.test > 0 && ' • '}{p.test > 0 && `تست ${formatDuration(p.test)}`}</span>; })()}</div>) : <Badge tone="danger">عدم مطالعه</Badge>}</td></tr>); })}
            </tbody></table></div> : <Empty text="این کلاس دانش‌آموزی ندارد." icon="users" />}
          </Card>);
        })}</div>)}
    </>
  );
}
