import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { classes, classSubjects, scheduleSlots, subjects, users } from '@/db/schema';
import { requireSchoolUser } from '@/lib/auth';
import { isManager } from '@/lib/permissions';
import { getPeriodCount } from '@/lib/schedule-config';
import { DAY_NAMES, iranWeekday, periodsText, teacherMatrix, teacherWeek, timeRangeText, type TSlot } from '@/lib/teacher-schedule';
import { deleteSlot, saveTeacherSlot } from '@/app/actions/messages';
import ActionForm from '@/components/ActionForm';
import { todayTehran } from '@/lib/time';
import { fa, fullName } from '@/lib/format';
import { UserAvatar } from '@/components/UserAvatar';
import { Tabs } from '@/components/Interactive';
import { Badge, Card, Empty, PageHead } from '@/components/ui';

export const metadata = { title: 'برنامه‌ی معلم' };

export default async function TeacherSchedulePage({ searchParams }: { searchParams: Promise<{ teacher?: string }> }) {
  const u = await requireSchoolUser(['TEACHER', 'PRINCIPAL', 'VICE']); const sp = await searchParams; const manager = isManager(u.role);
  const teachers = await db.select().from(users).where(and(eq(users.schoolId, u.schoolId!), eq(users.role, 'TEACHER'), eq(users.status, 'active'))).orderBy(asc(users.lastName));
  const me = manager ? (teachers.find((t) => t.id === sp.teacher) ?? teachers[0]) : teachers.find((t) => t.id === u.id) ?? u;
  const rows = await db.select({ id: scheduleSlots.id, startTime: scheduleSlots.startTime, endTime: scheduleSlots.endTime, weekday: scheduleSlots.weekday, period: scheduleSlots.period, classId: scheduleSlots.classId, className: classes.name, subject: subjects.name, room: scheduleSlots.room, teacherId: classSubjects.teacherId })
    .from(scheduleSlots).innerJoin(classes, eq(classes.id, scheduleSlots.classId)).innerJoin(subjects, eq(subjects.id, scheduleSlots.subjectId))
    .leftJoin(classSubjects, and(eq(classSubjects.classId, scheduleSlots.classId), eq(classSubjects.subjectId, scheduleSlots.subjectId))).where(eq(classes.schoolId, u.schoolId!));
  const slots: TSlot[] = rows;
  const myCs = manager && me ? await db.select({ classId: classSubjects.classId, subjectId: classSubjects.subjectId, className: classes.name, subject: subjects.name }).from(classSubjects)
    .innerJoin(classes, eq(classes.id, classSubjects.classId)).innerJoin(subjects, eq(subjects.id, classSubjects.subjectId))
    .where(and(eq(classSubjects.teacherId, me.id), eq(classes.schoolId, u.schoolId!))).orderBy(asc(classes.name)) : [];
  if (!me) return (<><PageHead illus="teacher" title="برنامه‌ی معلمان" /><Card><Empty text="هنوز معلمی در مدرسه ثبت نشده است." icon="users" /></Card></>);
  const w = teacherWeek(slots, me.id); const todayIdx = iranWeekday(todayTehran());
  const count = await getPeriodCount(me.schoolId!);
  const periods = Array.from({ length: Math.max(count, ...slots.filter((s) => s.teacherId === me.id).map((s) => s.period)) }, (_, i) => i + 1);
  const cell = (d: number, p: number) => slots.find((s) => s.teacherId === me.id && s.weekday === d && s.period === p);

  const personal = (
    <div className="stack">
      <section className="soft-panel" style={{ '--pc': '#10b981' } as React.CSSProperties}>
        <div className="row" style={{ gap: 14, flexWrap: 'wrap' }}><UserAvatar user={me as { id: string; firstName: string; lastName: string; avatarPreset: number | null; avatarPhotoAt: Date | null }} size={56} />
          <div><b style={{ fontSize: '1.1rem' }}>{fullName(me)}</b><div className="muted small">{fa(w.totalPeriods)} زنگ در هفته • {fa(w.presentDays.length)} روز حضور</div></div></div>
        <div className="hero-chips" style={{ marginTop: 12 }}>
          <span className="badge ok">🏫 روزهای حضور: {w.presentDays.length ? w.presentDays.map((d) => DAY_NAMES[d]).join('، ') : 'ندارد'}</span>
          <span className="badge">🏖️ روزهای بدون کلاس: {w.freeDays.length ? w.freeDays.map((d) => DAY_NAMES[d]).join('، ') : 'ندارد'}</span>
        </div>
      </section>
      <div className="tcards sched-table">{w.days.map((d) => (
        <div key={d.day} className={`tcard${d.hasClass ? ' has' : ''}${d.day === todayIdx ? ' today' : ''}`}>
          <div className="row between"><b>{d.name}</b>{d.day === todayIdx && <Badge tone="primary">امروز</Badge>}</div>
          {d.hasClass ? (<><div className="muted small" style={{ margin: '4px 0 8px' }}>زنگ {periodsText(d.periods.map((x) => x.period), fa)}</div>
            <div className="stack" style={{ gap: 6 }}>{d.periods.map((x) => <div key={x.period} className="tline"><span className="tp num">{fa(x.period)}</span><span><b>{x.subject}</b><span className="muted small"> • {x.className}{x.room ? ` • ${x.room}` : ''}</span>{timeRangeText(x, fa) && <div className="small">🕘 {timeRangeText(x, fa)}</div>}</span></div>)}</div></>)
            : <div className="tfree">کلاس ندارد 🎉<div className="muted small">نیازی به حضور برای تدریس نیست</div></div>}
        </div>))}</div>
      <Card title="جدول هفتگی"><div className="table-wrap sched-table"><table style={{ minWidth: 720 }}><thead><tr><th>زنگ</th>{DAY_NAMES.map((d) => <th key={d}>{d}</th>)}</tr></thead><tbody>
        {periods.map((p) => (<tr key={p}><td><b>{fa(p)}</b></td>{DAY_NAMES.map((_, d) => { const c = cell(d, p); return <td key={d}>{c ? <div><b>{c.subject}</b><div className="muted small">{c.className}{c.room ? ` • ${c.room}` : ''}</div>{timeRangeText(c, fa) && <div className="small">🕘 {timeRangeText(c, fa)}</div>}{manager && c.id && <form action={deleteSlot}><input type="hidden" name="id" value={c.id} /><button className="btn danger sm" style={{ marginTop: 4 }} aria-label="حذف این زنگ">× حذف</button></form>}</div> : <span className="muted">—</span>}</td>; })}</tr>))}
      </tbody></table></div></Card>
      {/* گوشی: هر روز یک تب با فهرست زنگ‌های معلم */}
      <div className="sched-days"><Tabs initialId={String(todayIdx <= 5 ? todayIdx : 0)} tabs={DAY_NAMES.map((name, d) => ({ id: String(d), label: name, content: (
        <div className="sd-list">{periods.map((p) => { const c = cell(d, p); const t = c ? timeRangeText(c, fa) : '';
          return (<div key={p} className={`sd-row${c ? '' : ' empty'}`}><span className="sd-num">{fa(p)}</span>
            {c ? <div className="sd-main"><b>{c.subject}</b><div className="muted small">{[c.className, c.room].filter(Boolean).join(' • ')}</div></div> : <div className="sd-main muted small">کلاس ندارد</div>}
            {c && t && <span className="sd-time">{t}</span>}
            {c && manager && c.id && <form action={deleteSlot}><input type="hidden" name="id" value={c.id} /><button className="btn danger sm" aria-label="حذف این زنگ">×</button></form>}</div>); })}</div>) }))} /></div>
      {manager && (
        <Card title={`ویرایش برنامه‌ی ${fullName(me)}`}>
          {!myCs.length ? <div className="alert warn">برای این معلم هنوز درسی در هیچ کلاسی تعیین نشده است. ابتدا از «کلاس‌ها و درس‌ها» معلمِ درس را مشخص کنید.</div> : (
            <ActionForm action={saveTeacherSlot} submit="ذخیره‌ی زنگ" resetOnSuccess={false}>
              <input type="hidden" name="teacherId" value={me.id} />
              <div className="inline-fields">
                <div className="field"><label>روز</label><select name="weekday">{DAY_NAMES.map((d, i) => <option key={d} value={i}>{d}</option>)}</select></div>
                <div className="field"><label>زنگ</label><select name="period">{periods.map((i) => <option key={i} value={i}>{fa(i)}</option>)}</select></div>
                <div className="field"><label>کلاس و درس</label><select name="cs" defaultValue=""><option value="" disabled>انتخاب…</option>{myCs.map((c) => <option key={c.classId + c.subjectId} value={`${c.classId}:${c.subjectId}`}>{c.className} — {c.subject}</option>)}</select></div>
              </div>
              <div className="inline-fields">
                <div className="field"><label>ساعت شروع</label><input type="time" name="startTime" /></div>
                <div className="field"><label>ساعت پایان</label><input type="time" name="endTime" /></div>
                <div className="field"><label>مکان (اختیاری)</label><input name="room" maxLength={30} /></div>
              </div>
              <span className="hint-t">اگر آن کلاس در همان روز و زنگ قبلاً برنامه داشته باشد، جایگزین می‌شود. اگر معلم در همان روز تداخل زمانی پیدا کند، ذخیره نمی‌شود. برای حذف یک زنگ از دکمه‌ی «حذف» داخل جدول بالا استفاده کنید.</span>
            </ActionForm>)}
        </Card>)}
    </div>);

  const matrix = manager ? teacherMatrix(slots, teachers.map((t) => t.id)) : [];
  const nm = new Map(teachers.map((t) => [t.id, fullName(t)]));
  const overview = manager ? (
    <Card title="همه‌ی معلم‌ها در یک نگاه" action={<span className="muted small">عدد = شماره‌ی زنگ‌ها</span>}>
      <div className="table-wrap sched-table"><table><thead><tr><th>معلم</th>{DAY_NAMES.map((d) => <th key={d}>{d}</th>)}<th>جمع زنگ</th></tr></thead><tbody>
        {matrix.map((m) => (<tr key={m.id}><td><a href={`/teacher-schedule?teacher=${m.id}`}><b>{nm.get(m.id)}</b></a></td>{m.days.map((ps, d) => <td key={d}>{ps.length ? <Badge tone="ok">{periodsText(ps, fa)}</Badge> : <span className="muted">—</span>}</td>)}<td className="num">{fa(m.days.flat().length)}</td></tr>))}
      </tbody></table></div>
      <div className="sched-days"><Tabs initialId={String(todayIdx <= 5 ? todayIdx : 0)} tabs={DAY_NAMES.map((name, d) => { const here = matrix.filter((m) => m.days[d].length); return ({ id: String(d), label: name, content: (
        <div className="sd-list">{here.length ? here.map((m) => (<a key={m.id} href={`/teacher-schedule?teacher=${m.id}`} className="sd-row"><span className="sd-num">{fa(m.days[d].length)}</span><div className="sd-main"><b>{nm.get(m.id)}</b><div className="muted small">زنگ {periodsText(m.days[d], fa)}</div></div><span className="muted">‹</span></a>)) : <div className="sd-row empty"><div className="sd-main muted small">هیچ معلمی در این روز کلاس ندارد</div></div>}
          {matrix.length > here.length && <div className="muted small" style={{ padding: '4px 6px' }}>بدون کلاس: {matrix.filter((m) => !m.days[d].length).map((m) => nm.get(m.id)).join('، ')}</div>}</div>) }); })} /></div>
      <p className="muted small" style={{ marginTop: 8 }}>خانه‌ی خالی (—) یعنی آن معلم در آن روز کلاس ندارد. این جدول از «برنامه‌ی هفتگی» و «معلمِ هر درس در هر کلاس» ساخته می‌شود؛ اگر برای درسی معلم تعیین نشده باشد، در برنامه‌ی هیچ معلمی نمی‌آید.</p>
    </Card>) : null;

  return (
    <>
      <PageHead illus="teacher" title={manager ? 'برنامه‌ی معلمان' : 'برنامه‌ی من'} sub={manager ? 'ببینید هر معلم در چه روزها و چه زنگ‌هایی کلاس دارد.' : 'در چه روزها و چه زنگ‌هایی کلاس دارید؟'}>
        {manager && <form className="row" action="/teacher-schedule"><select name="teacher" defaultValue={me.id} style={{ width: 220 }}>{teachers.map((t) => <option key={t.id} value={t.id}>{fullName(t)}</option>)}</select><button className="btn ghost sm">نمایش</button></form>}
      </PageHead>
      {manager ? <Tabs tabs={[{ id: 'one', label: '👩‍🏫 برنامه‌ی یک معلم', content: personal }, { id: 'all', label: '🧮 همه‌ی معلم‌ها', content: overview }]} initialId={sp.teacher ? 'one' : 'all'} /> : personal}
    </>
  );
}
