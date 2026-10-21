import Link from 'next/link';
import { and, asc, eq, gte, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { studyReports, studySkips, subjects, users } from '@/db/schema';
import { declareNoStudy, undoNoStudy } from '@/app/actions/study';
import ActionForm from '@/components/ActionForm';
import { dayBreakdown, rangeSummary } from '@/lib/no-study';
import { requireSchoolUser } from '@/lib/auth';
import { isManager, isStaff, focusStudentIds } from '@/lib/permissions';
import { classesFor } from '@/lib/school-data';
import TeacherStudyView from '@/components/TeacherStudyView';
import { Tabs } from '@/components/Interactive';
import { getStudyWindow } from '@/lib/settings';
import { flattenItems, loadReports } from '@/lib/study-data';
import { summarize } from '@/lib/study-stats';
import { addDays, todayTehran } from '@/lib/time';
import { fa, formatDuration, formatJalali } from '@/lib/format';
import { Badge, Card, Empty, PageHead, Stat } from '@/components/ui';
import StudyForm from '@/components/StudyForm';
import ReportCard from '@/components/ReportCard';
import { WeekChart, Heatmap } from '@/components/StudyCharts';

export const metadata = { title: 'گزارش مطالعه' };

export default async function StudyPage({ searchParams }: { searchParams: Promise<{ student?: string; range?: string; class?: string; d?: string; tab?: string; edit?: string; nsm?: string; nsd?: string }> }) {
  const user = await requireSchoolUser(); const sp = await searchParams;
  if (user.role === 'TEACHER') return <TeacherStudyView teacherId={user.id} schoolId={user.schoolId!} dateParam={sp.d} />;
  const today = todayTehran(); const staff = isStaff(user.role);
  const canWrite = user.role === 'PARENT' || user.role === 'STUDENT'; const isSelf = user.role === 'STUDENT';
  const range = sp.range === '7' || sp.range === 'all' ? sp.range : '30';
  const from = range === 'all' ? undefined : addDays(today, -(range === '7' ? 6 : 29));

  const allScope = await focusStudentIds(user);
  const classOpts = isManager(user.role) ? await classesFor(user) : [];
  const chosenClass = classOpts.find((c) => c.id === sp.class);
  const allRows = allScope.length ? await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName, classId: users.classId }).from(users).where(inArray(users.id, allScope)).orderBy(asc(users.lastName)) : [];
  const studentRows = chosenClass ? allRows.filter((r) => r.classId === chosenClass.id) : allRows;
  const scope = studentRows.map((r) => r.id);
  const students = studentRows.map((s) => ({ id: s.id, name: `${s.firstName} ${s.lastName}` }));
  const chosen = sp.student && students.some((s) => s.id === sp.student) ? sp.student : undefined;
  const reports = await loadReports({ studentIds: chosen ? [chosen] : scope, from });
  const stats = summarize(flattenItems(reports), today);

  // درس‌های قابل انتخاب در فرمِ ولی: درس‌های همین مدرسه
  const subjectOpts = canWrite ? await db.select({ id: subjects.id, name: subjects.name }).from(subjects).where(eq(subjects.schoolId, user.schoolId!)).orderBy(asc(subjects.name)) : [];

  const w = await getStudyWindow(user.schoolId!);
  // ویرایش گزارش امروزِ خودِ ولی
  const er = canWrite && sp.edit ? reports.find((r) => r.id === sp.edit && r.createdBy === user.id && r.date === today) : undefined;
  const initial = er ? { id: er.id, studentId: er.studentId, startTime: er.startTime, endTime: er.endTime, notes: er.notes ?? '', items: er.items.map((i) => ({ subjectId: i.subjectId, studyMin: i.studyMin, topic: i.topic, methods: i.methodList, pages: i.pages, mastery: i.mastery, goal: i.goal ?? '', goalAchieved: i.goalAchieved ?? null, tests: i.tests.map((t) => ({ source: t.source, totalCount: t.totalCount, correctCount: t.correctCount, wrongCount: t.wrongCount, blankCount: t.blankCount, durationMin: t.durationMin, note: t.note ?? '' })) })) } : undefined;
  const byDay = new Map<string, typeof reports>(); for (const r of reports) byDay.set(r.date, [...(byDay.get(r.date) ?? []), r]);
  const q = (o: Record<string, string | undefined>) => { const p = new URLSearchParams(); for (const [k, v] of Object.entries({ student: chosen, range, class: chosenClass?.id, ...o })) if (v) p.set(k, v); return `/study?${p}`; };
  // نقشه‌ی فعالیت: برای یک دانش‌آموز = مطالعه‌ی خودش؛ برای کلاس/مدرسه = «میانگین هر دانش‌آموز» (تا تعداد دانش‌آموزان نقشه را بی‌معنی پررنگ نکند)
  const heatDiv = chosen ? 1 : Math.max(1, scope.length);
  const heatTitle = chosen ? `نقشه‌ی فعالیت ۳۰ روز اخیر — ${students.find((x) => x.id === chosen)?.name}` : chosenClass ? `نقشه‌ی فعالیت ۳۰ روز اخیر — میانگین هر دانش‌آموزِ ${chosenClass.name}` : staff ? 'نقشه‌ی فعالیت ۳۰ روز اخیر — میانگین هر دانش‌آموزِ مدرسه' : 'نقشه‌ی فعالیت ۳۰ روز اخیر';

  // «عدم مطالعه»های ثبت‌شده توسط ولی (۳۱ روز اخیر)
  const skipRows = scope.length ? await db.select().from(studySkips).where(and(inArray(studySkips.studentId, scope), gte(studySkips.date, addDays(today, -31)))) : [];
  const nameOf = new Map(studentRows.map((r) => [r.id, `${r.firstName} ${r.lastName}`]));
  const todayReported = new Set(reports.filter((r) => r.date === today).map((r) => r.studentId));
  const todaySkip = new Set(skipRows.filter((k) => k.date === today).map((k) => k.studentId));
  const noStudyCard = canWrite && students.length ? (
    <Card title={isSelf ? 'امروز مطالعه نداشتی؟' : 'امروز مطالعه نداشت؟'} className="">
      <p className="muted small" style={{ marginBottom: 10 }}>{isSelf ? 'اگر امروز اصلاً مطالعه نکرده‌ای، «عدم مطالعه» را ثبت کن تا برای مدرسه مشخص باشد. اگر بعداً مطالعه کردی، کافی است گزارش ثبت کنی؛ «عدم مطالعه» خودکار لغو می‌شود.' : 'اگر فرزندتان امروز اصلاً مطالعه نکرده، «عدم مطالعه» را ثبت کنید تا برای مدرسه مشخص باشد و یادآور هم نیاید. اگر بعداً مطالعه کرد، کافی است گزارش ثبت کنید؛ «عدم مطالعه» خودکار لغو می‌شود.'}</p>
      <div className="list">{students.map((s) => (
        <div className="list-item" key={s.id} style={{ flexWrap: 'wrap' }}><b>{s.name}</b>
          {todayReported.has(s.id) ? <Badge tone="ok">امروز گزارش دارد ✓</Badge>
            : todaySkip.has(s.id) ? (<div className="row"><Badge tone="warn">عدم مطالعه ثبت شده</Badge><form action={undoNoStudy}><input type="hidden" name="studentId" value={s.id} /><button className="btn ghost sm">لغو</button></form></div>)
            : (<div style={{ minWidth: 220 }}><ActionForm action={declareNoStudy} submit="ثبت عدم مطالعه" small><input type="hidden" name="studentId" value={s.id} /></ActionForm></div>)}
        </div>))}</div>
    </Card>) : null;
  const skipShown = skipRows.filter((k) => k.date >= addDays(today, -29) && (chosen ? k.studentId === chosen : true));
  const skipCard = (!isManager(user.role) || chosen) && skipShown.length ? (
    <Card title="روزهای «عدم مطالعه» (۳۰ روز اخیر)" className=""><div className="chips">{[...skipShown].sort((a, b) => (a.date < b.date ? 1 : -1)).map((k) => <span key={k.id} className="badge warn">{formatJalali(k.date)}{students.length > 1 ? ` • ${nameOf.get(k.studentId)}` : ''}</span>)}</div></Card>) : null;

  // دید مدیر/معاون: چه کسانی در یک روز یا در ۳۰ روز اخیر مطالعه نداشتند
  let noStudyView: React.ReactNode = null;
  if (isManager(user.role)) {
    const nsMode = sp.nsm === '30' ? '30' : 'day';
    const dayOptions = Array.from({ length: 31 }, (_, i) => addDays(today, -i));
    const nsDate = dayOptions.includes(sp.nsd ?? '') ? (sp.nsd as string) : addDays(today, -1);
    const rd = scope.length ? await db.selectDistinct({ s: studyReports.studentId, d: studyReports.date }).from(studyReports).where(and(inArray(studyReports.studentId, scope), gte(studyReports.date, addDays(today, -31)))) : [];
    const repMap = new Map<string, Set<string>>(); for (const r of rd) repMap.set(r.s, (repMap.get(r.s) ?? new Set()).add(r.d));
    const skMap = new Map<string, Set<string>>(); for (const k of skipRows) skMap.set(k.studentId, (skMap.get(k.studentId) ?? new Set()).add(k.date));
    const sds = scope.map((id) => ({ id, reportDays: repMap.get(id) ?? new Set<string>(), skipDays: skMap.get(id) ?? new Set<string>() }));
    const clsName = new Map(classOpts.map((c) => [c.id, c.name])); const clsOf = new Map(studentRows.map((r) => [r.id, r.classId]));
    const who = (id: string) => (<Link key={id} href={`/students/${id}`} className="list-item" style={{ color: 'inherit' }}><b>{nameOf.get(id)}</b><span className="muted small">{clsName.get(clsOf.get(id) ?? '') ?? ''}</span></Link>);
    const dayRes = dayBreakdown(sds, nsDate);
    const days30 = Array.from({ length: 30 }, (_, i) => addDays(today, -(i + 1)));
    const sum30 = rangeSummary(sds, days30);
    noStudyView = (
      <Card title="🚫 دانش‌آموزانی که مطالعه نداشتند">
        <div className="seg" style={{ marginBottom: 14 }}><Link href={q({ tab: 'nostudy', nsm: 'day', nsd: nsDate })} className={nsMode === 'day' ? 'on' : ''}>یک روز مشخص</Link><Link href={q({ tab: 'nostudy', nsm: '30' })} className={nsMode === '30' ? 'on' : ''}>۳۰ روز اخیر</Link></div>
        {nsMode === 'day' ? (<>
          <form className="row" action="/study" style={{ marginBottom: 14 }}><input type="hidden" name="tab" value="nostudy" /><input type="hidden" name="nsm" value="day" /><input type="hidden" name="range" value={range} />{chosenClass && <input type="hidden" name="class" value={chosenClass.id} />}
            <select name="nsd" defaultValue={nsDate} style={{ width: 260 }}>{dayOptions.map((d) => <option key={d} value={d}>{formatJalali(d, true)}{d === today ? ' (امروز، تا این لحظه)' : ''}</option>)}</select><button className="btn sm">نمایش</button></form>
          <div className="hero-chips" style={{ marginBottom: 12 }}><span className="badge ok">✓ مطالعه کردند: {fa(dayRes.studied.length)}</span><span className="badge warn">🚫 عدم مطالعه (اعلام ولی): {fa(dayRes.declared.length)}</span><span className="badge danger">❔ گزارش ثبت نشده: {fa(dayRes.unreported.length)}</span></div>
          <div className="grid g2">
            <div><div className="muted small" style={{ marginBottom: 6 }}>عدم مطالعه (اعلام ولی)</div>{dayRes.declared.length ? <div className="list">{dayRes.declared.map(who)}</div> : <Empty text="کسی اعلام نکرده است." icon="check" />}</div>
            <div><div className="muted small" style={{ marginBottom: 6 }}>گزارش ثبت نشده</div>{dayRes.unreported.length ? <div className="list">{dayRes.unreported.map(who)}</div> : <Empty text="همه گزارش داده‌اند. 👏" icon="check" />}</div>
          </div></>) : (
          sum30.length ? <div className="table-wrap"><table><thead><tr><th>دانش‌آموز</th><th>کلاس</th><th>اعلام ولی</th><th>گزارش ثبت نشده</th><th>جمع روزها</th></tr></thead><tbody>
            {sum30.map((x) => <tr key={x.id}><td><Link href={`/students/${x.id}`}>{nameOf.get(x.id)}</Link></td><td>{clsName.get(clsOf.get(x.id) ?? '') ?? '—'}</td><td className="num">{fa(x.declared.length)}</td><td className="num">{fa(x.unreported.length)}</td><td className="num"><b>{fa(x.total)}</b> از {fa(30)}</td></tr>)}
          </tbody></table></div> : <Empty text="در ۳۰ روز اخیر همه‌ی دانش‌آموزان هر روز گزارش داده‌اند. 👏" icon="check" />)}
        <p className="muted small" style={{ marginTop: 10 }}>«گزارش ثبت نشده» یعنی ولی نه گزارش داده و نه «عدم مطالعه» ثبت کرده است. روز جاری هنوز تمام نشده و در جمع ۳۰ روز نیست.</p>
      </Card>);
  }

  const progressView = (<>
      <div className="grid g-main">
        <Card title="مطالعه‌ی ۷ روز اخیر"><WeekChart data={stats.last7} /></Card>
        <Card title="سهم هر درس">
          {stats.bySubject.length ? <div className="col">{stats.bySubject.slice(0, 6).map((s) => (
            <div key={s.name}><div className="row between small"><span>{s.name}</span><span className="muted num">{formatDuration(s.min)}</span></div><div className="progress" style={{ marginTop: 4 }}><span style={{ width: `${(s.min / stats.bySubject[0].min) * 100}%` }} /></div></div>))}</div> : <Empty text="هنوز داده‌ای نیست." />}
        </Card>
      </div>

      <Card title={heatTitle} className=""><Heatmap reports={reports.map((r) => ({ date: r.date, min: r.durationMin / heatDiv }))} today={today} /></Card>
</>);
  const filters = (<div className="filters-bar">
          {isManager(user.role) && <a className="btn ghost sm" href={`/study/export?range=${range}${chosen ? `&student=${chosen}` : ''}`}>دانلود اکسل (CSV)</a>}
          {classOpts.length > 0 && (<form className="row" action="/study"><input type="hidden" name="range" value={range} /><select name="class" defaultValue={chosenClass?.id ?? ''} style={{ width: 200 }}><option value="">همه‌ی کلاس‌ها</option>{classOpts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select><button className="btn ghost sm">کلاس</button></form>)}
          {students.length > 1 && (
            <form className="row" action="/study"><input type="hidden" name="range" value={range} />{chosenClass && <input type="hidden" name="class" value={chosenClass.id} />}
              <select name="student" defaultValue={chosen ?? ''} style={{ width: 220 }}><option value="">همه‌ی دانش‌آموزان</option>{students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
              <button className="btn ghost sm">فیلتر</button></form>)}
          <div className="seg"><Link href={q({ range: '7' })} className={range === '7' ? 'on' : ''}>۷ روز</Link><Link href={q({ range: '30' })} className={range === '30' ? 'on' : ''}>۳۰ روز</Link><Link href={q({ range: 'all' })} className={range === 'all' ? 'on' : ''}>همه</Link></div>
</div>);
  const listView = (<>
      {skipCard}
      {reports.length === 0 ? <Card><Empty text="در این بازه گزارشی ثبت نشده است." icon="study" /></Card> : [...byDay.entries()].map(([date, list]) => (
        <section key={date}>
          <div className="day-head"><span style={{ color: 'var(--text)', fontWeight: 700 }}>{formatJalali(date, true)}</span><span className="num">{formatDuration(list.reduce((a, r) => a + r.durationMin, 0))}</span></div>
          {list.map((r) => <ReportCard key={r.id} r={r} showStudent={user.role !== 'STUDENT'} canFeedback={isManager(user.role)} canDelete={canWrite && r.createdBy === user.id && r.date === today} />)}
        </section>
      ))}
</>);
  return (
    <div className="compact">
      <PageHead illus="study" title="گزارش مطالعه" sub={user.role === 'STUDENT' ? 'کتاب‌هایی که امروز خواندی و تست‌هایی که زدی را اینجا ثبت کن و پیشرفتت را ببین.' : user.role === 'PARENT' ? 'گزارش مطالعه‌ی روزانه‌ی فرزندتان را اینجا ثبت کنید.' : 'پیگیری مطالعه‌ی دانش‌آموزان (فقط مشاهده و بازخورد)'} />
      <div className="grid g4" style={{ marginBottom: 16 }}>
        <Stat label="مطالعه‌ی امروز" value={formatDuration(stats.todayMin)} icon="clock" tone="primary" />
        <Stat label="مطالعه‌ی این هفته" value={formatDuration(stats.weekMin)} hint="از شنبه" icon="study" tone="accent" />
        <Stat label={staff && !chosen ? 'روزهای فعال (مجموع)' : 'روزهای پیاپی'} value={`${fa(staff && !chosen ? stats.activeDays : stats.streak)} روز`} icon="fire" tone="warn" />
        <Stat label="میانگین تست‌ها" value={stats.avgPercent === null ? '—' : `${fa(stats.avgPercent)}٪`} hint={stats.totalTests ? `${fa(stats.totalTests)} تست` : 'هنوز تستی ثبت نشده'} icon="target" tone="ok" />
      </div>

      {filters}
      <Tabs tabs={[
        ...(canWrite ? [{ id: 'form', label: '✏️ ثبت گزارش', content: (<div className="stack"><Card title={initial ? 'ویرایش گزارش امروز' : 'ثبت گزارش جدید'} className="">
          {students.length ? <StudyForm key={initial?.id ?? 'new'} initial={initial} self={isSelf} subjects={subjectOpts} students={students} windowStart={w.startMin} windowEnd={w.endMin} startLabel={w.startLabel} endLabel={w.endLabel} /> : <Empty text="هنوز فرزندی به حساب شما متصل نشده است. از مدیر یا معاون مدرسه بخواهید پیوند را ثبت کند." icon="users" />}
        </Card>{noStudyCard}</div>) }] : []),
        { id: 'progress', label: '📈 پیشرفت', content: progressView },
        { id: 'list', label: '📋 گزارش‌ها', content: listView },
        ...(noStudyView ? [{ id: 'nostudy', label: '🚫 عدم مطالعه', content: noStudyView }] : []),
      ]} initialId={sp.tab} />
    </div>
  );
}
