import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { attendance, classes, grades, parentStudents, studentNotes, subjects, users } from '@/db/schema';
import { addNote, deleteGrade } from '@/app/actions/school';
import { requireSchoolUser } from '@/lib/auth';
import { currentMonthPeriod, loadRankContext, resultFor } from '@/lib/ranking';
import { canAccessStudent, isManager, isStaff, teacherSubjectIds } from '@/lib/permissions';
import { attendanceLabels, gradeTypeLabels } from '@/lib/school-data';
import { flattenItems, loadReports } from '@/lib/study-data';
import { summarize } from '@/lib/study-stats';
import { addDays, todayTehran } from '@/lib/time';
import { fa, formatDuration, formatJalali, formatJalaliShort, fullName } from '@/lib/format';
import ActionForm from '@/components/ActionForm';
import ReportCard from '@/components/ReportCard';
import { WeekChart } from '@/components/StudyCharts';
import { Badge, Card, Empty, PageHead, Stat } from '@/components/ui';

const noteTone = { note: '', praise: 'ok', discipline: 'danger' } as const;
const noteLabel = { note: 'یادداشت', praise: 'تشویق', discipline: 'انضباطی' } as const;

export default async function StudentProfile({ params }: { params: Promise<{ id: string }> }) {
  const u = await requireSchoolUser(); const { id } = await params;
  if (!(await canAccessStudent(u, id))) notFound();
  const [st] = await db.select({ s: users, className: classes.name }).from(users).leftJoin(classes, eq(classes.id, users.classId)).where(eq(users.id, id)).limit(1);
  if (!st || st.s.role !== 'STUDENT') notFound();
  const today = todayTehran(); const staff = isStaff(u.role);
  const canSeeStudy = u.role !== 'TEACHER'; // معلم مطالعه‌ی کلی دانش‌آموز را نمی‌بیند
  const reports = canSeeStudy ? await loadReports({ studentIds: [id], from: addDays(today, -29), limit: 100 }) : [];
  const stats = summarize(flattenItems(reports), today);
  // معلم فقط نمره‌ی درس‌های خودش را می‌بیند
  const mySubjects = await teacherSubjectIds(u, st.s.classId); const onlyMine = mySubjects !== null;
  const grCond = onlyMine ? and(eq(grades.studentId, id), inArray(grades.subjectId, mySubjects.length ? mySubjects : ['-'])) : eq(grades.studentId, id);
  const gr = await db.select({ g: grades, subject: subjects.name }).from(grades).innerJoin(subjects, eq(subjects.id, grades.subjectId)).where(grCond).orderBy(desc(grades.date)).limit(30);
  const att = await db.select().from(attendance).where(eq(attendance.studentId, id)).orderBy(desc(attendance.date)).limit(15);
  const notes = await db.select().from(studentNotes).where(eq(studentNotes.studentId, id)).orderBy(desc(studentNotes.createdAt)).limit(15);
  // شماره‌ی اولیا فقط برای مدیر و معاون
  const parents = isManager(u.role) ? await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName, phone: users.phone }).from(parentStudents).innerJoin(users, eq(users.id, parentStudents.parentId)).where(eq(parentStudents.studentId, id)) : [];
  const ctx = await loadRankContext(id, mySubjects);
  const yr = ctx ? resultFor(ctx, ctx.year) : null; const cmPeriod = ctx ? currentMonthPeriod(ctx) : undefined; const cm = ctx && cmPeriod ? resultFor(ctx, cmPeriod) : null;
  const praise = notes.filter((n) => n.type === 'praise').length; const disc = notes.filter((n) => n.type === 'discipline').length;
  const rk = (r: { rank: number } | null | undefined, n: number | undefined) => (r ? `${fa(r.rank)} از ${fa(n ?? 0)}` : '—');
  const avg = gr.length ? Math.round((gr.reduce((a, r) => a + (r.g.score / r.g.maxScore) * 20, 0) / gr.length) * 100) / 100 : null;

  return (
    <>
      <PageHead illus="students" title={fullName(st.s)} sub={`${st.className ?? 'بدون کلاس'} • نام کاربری: ${st.s.username}`} />
      {isManager(u.role) && (<Card title="اولیا و شماره‌ی تماس" className="">{parents.length ? <div className="list">{parents.map((p) => (<div className="list-item" key={p.id}><b>{p.firstName} {p.lastName}</b>{p.phone ? <a className="btn ghost sm" href={`tel:${p.phone}`} dir="ltr">📞 {p.phone}</a> : <Badge tone="warn">شماره ثبت نشده</Badge>}</div>))}</div> : <Empty text="ولی‌ای به این دانش‌آموز متصل نشده است." icon="users" />}</Card>)}
      <div style={{ height: 16 }} />
      <div className="grid g4">
        {canSeeStudy && <Stat label="مطالعه‌ی این هفته" value={formatDuration(stats.weekMin)} icon="study" tone="accent" />}
        {canSeeStudy && <Stat label="روزهای پیاپی" value={`${fa(stats.streak)} روز`} icon="fire" tone="warn" />}
        <Stat label={onlyMine ? 'میانگین نمرات درس شما' : 'میانگین نمرات'} value={avg === null ? '—' : fa(avg)} hint="از ۲۰" icon="grades" tone="ok" />
        <Stat label="غیبت و تأخیر" value={fa(att.length)} icon="check" tone="danger" />
      </div>
      <div className="grid g-main" style={{ marginTop: 16 }}>
        {canSeeStudy ? <Card title="مطالعه‌ی ۷ روز اخیر"><WeekChart data={stats.last7} /></Card> : <Card title="مطالعه"><div className="muted small">معلم فقط زمان مطالعه‌ی درس خودش را در بخش «گزارش مطالعه» می‌بیند.</div></Card>}
        <Card title="مثبت‌ها و منفی‌ها (تشویق و انضباطی) و رتبه" action={<Link href={`/discipline?student=${id}`} className="small">جزئیات و نمودار ←</Link>}>
          <div className="rank-strip">
            <div><span>رتبه در کلاس (کل سال)</span><b className="num">{rk(yr?.myClass, yr?.cls.length)}</b></div>
            <div><span>رتبه در پایه (کل سال)</span><b className="num">{rk(yr?.myGrade, yr?.grd.length)}</b></div>
            {cmPeriod && <div><span>رتبه در کلاس ({cmPeriod.label})</span><b className="num">{rk(cm?.myClass, cm?.cls.length)}</b></div>}
            {cmPeriod && <div><span>رتبه در پایه ({cmPeriod.label})</span><b className="num">{rk(cm?.myGrade, cm?.grd.length)}</b></div>}
            <div><span>{onlyMine ? 'میانگین درس شما (کل سال)' : 'معدل کل سال'}</span><b className="num">{yr?.myClass ? fa(yr.myClass.avg) : '—'}</b></div>
            <div><span>تشویق / انضباطی</span><b className="num">{fa(praise)} / {fa(disc)}</b></div>
          </div>
          {staff && (<ActionForm action={addNote} submit="ثبت یادداشت" small><input type="hidden" name="studentId" value={id} />
            <div className="inline-fields"><select name="type" defaultValue="note"><option value="note">یادداشت</option><option value="praise">تشویق</option><option value="discipline">انضباطی</option></select></div><textarea name="body" required maxLength={500} placeholder="متن یادداشت…" style={{ minHeight: 64 }} /></ActionForm>)}
          {notes.length ? <div className="list" style={{ marginTop: 12 }}>{notes.map((n) => <div className="list-item" key={n.id} style={{ alignItems: 'flex-start' }}><div className="small">{n.body}<div className="muted">{formatJalali(n.date)}</div></div><Badge tone={noteTone[n.type]}>{noteLabel[n.type]}</Badge></div>)}</div> : !staff && <Empty text="یادداشتی ثبت نشده است." icon="note" />}
        </Card>
      </div>
      <div className="grid g2" style={{ marginTop: 16 }}>
        <Card title="نمرات اخیر">{gr.length ? <div className="list">{gr.map(({ g, subject }) => (
          <div className="list-item" key={g.id}><div><b>{subject}</b><div className="muted small">{g.title} • {gradeTypeLabels[g.type]} • {formatJalaliShort(g.date)}</div></div>
            <div className="row" style={{ gap: 6 }}><Badge tone="primary">{fa(g.score)} از {fa(g.maxScore)}</Badge>{staff && <form action={deleteGrade}><input type="hidden" name="id" value={g.id} /><button className="btn danger sm">×</button></form>}</div></div>))}</div> : <Empty text="نمره‌ای ثبت نشده است." icon="grades" />}</Card>
        <Card title="غیبت‌ها و تأخیرها">{att.length ? <div className="list">{att.map((a) => <div className="list-item" key={a.id}><div>{formatJalali(a.date, true)}{a.note && <div className="muted small">{a.note}</div>}</div><Badge tone={a.status === 'absent' ? 'danger' : a.status === 'late' ? 'warn' : 'primary'}>{attendanceLabels[a.status]}</Badge></div>)}</div> : <Empty text="موردی ثبت نشده است. 👏" icon="check" />}</Card>
      </div>
      {canSeeStudy && (<><h2 style={{ margin: '26px 0 10px' }}>گزارش‌های مطالعه‌ی ۳۰ روز اخیر</h2>
      {reports.length ? reports.map((r) => <ReportCard key={r.id} r={r} canFeedback={isManager(u.role)} />) : <Card><Empty text="گزارشی ثبت نشده است." icon="study" /></Card>}</>)}
    </>
  );
}
