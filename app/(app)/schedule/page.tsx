import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { classSubjects, classes as classesT, scheduleSlots, subjects, users } from '@/db/schema';
import { deleteSlot, savePeriodCount, saveSlot } from '@/app/actions/messages';
import { MAX_PERIODS, getPeriodCount } from '@/lib/schedule-config';
import { Tabs } from '@/components/Interactive';
import { todayTehran } from '@/lib/time';
import { requireSchoolUser } from '@/lib/auth';
import { isManager, focusClassIds } from '@/lib/permissions';
import { fa } from '@/lib/format';
import { iranWeekday, timeRangeText } from '@/lib/teacher-schedule';
import ActionForm from '@/components/ActionForm';
import { Card, Empty, PageHead } from '@/components/ui';

export const metadata = { title: 'برنامه‌ی هفتگی' };
const DAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه'];

export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ class?: string }> }) {
  const u = await requireSchoolUser(); const sp = await searchParams;
  // برنامه‌ی مدرسه برای همه یکی است: هر کاربر می‌تواند برنامه‌ی هر کلاسِ مدرسه‌ی خودش را ببیند؛ فقط مدیر و معاون تغییرش می‌دهند.
  const cls = await db.select().from(classesT).where(eq(classesT.schoolId, u.schoolId!)).orderBy(asc(classesT.gradeLevel), asc(classesT.name));
  const mine = (await focusClassIds(u))[0];
  const classId = sp.class && cls.some((c) => c.id === sp.class) ? sp.class : cls.some((c) => c.id === mine) ? mine : cls[0]?.id;
  if (!classId) return (<><PageHead illus="schedule" title="برنامه‌ی هفتگی" /><Card><Empty text="کلاسی برای نمایش وجود ندارد." icon="calendar" /></Card></>);
  const slots = await db.select({ s: scheduleSlots, subject: subjects.name, tf: users.firstName, tl: users.lastName }).from(scheduleSlots).innerJoin(subjects, eq(subjects.id, scheduleSlots.subjectId))
    .leftJoin(classSubjects, and(eq(classSubjects.classId, scheduleSlots.classId), eq(classSubjects.subjectId, scheduleSlots.subjectId))).leftJoin(users, eq(users.id, classSubjects.teacherId)).where(eq(scheduleSlots.classId, classId));
  const subs = await db.select({ id: subjects.id, name: subjects.name }).from(classSubjects).innerJoin(subjects, eq(subjects.id, classSubjects.subjectId)).where(eq(classSubjects.classId, classId)).orderBy(asc(subjects.name));
  const count = await getPeriodCount(u.schoolId!);
  const periods = Array.from({ length: Math.max(count, ...slots.map((x) => x.s.period)) }, (_, i) => i + 1);
  const todayDay = iranWeekday(todayTehran());
  const cell = (d: number, p: number) => slots.find((x) => x.s.weekday === d && x.s.period === p);
  const edit = isManager(u.role);
  return (
    <>
      <PageHead illus="schedule" title="برنامه‌ی هفتگی کلاس" sub={edit ? 'شما می‌توانید زنگ‌ها را تنظیم کنید؛ همه‌ی کاربران همین برنامه را می‌بینند.' : 'این برنامه را مدیر و معاون تنظیم کرده‌اند و برای همه یکسان است.'}>
        {cls.length > 1 && <form className="row" action="/schedule"><select name="class" defaultValue={classId} style={{ width: 220 }}>{[...new Set(cls.map((c) => c.gradeLevel))].map((g) => <optgroup key={g} label={`پایه‌ی ${g}`}>{cls.filter((c) => c.gradeLevel === g).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>)}</select><button className="btn ghost sm">نمایش</button></form>}
      </PageHead>
      <div className="table-wrap sched-table"><table style={{ minWidth: 720 }}><thead><tr><th>زنگ</th>{DAYS.map((d) => <th key={d}>{d}</th>)}</tr></thead><tbody>
        {periods.map((p) => (<tr key={p}><td><b>{fa(p)}</b></td>{DAYS.map((_, d) => { const c = cell(d, p); return (<td key={d}>{c ? (<div><b>{c.subject}</b>{timeRangeText(c.s, fa) && <div className="small">🕘 {timeRangeText(c.s, fa)}</div>}{c.tf && <div className="muted small">{c.tf} {c.tl}</div>}{c.s.room && <div className="muted small">{c.s.room}</div>}{edit && <form action={deleteSlot}><input type="hidden" name="id" value={c.s.id} /><button className="btn danger sm" style={{ marginTop: 4 }}>×</button></form>}</div>) : <span className="muted">—</span>}</td>); })}</tr>))}
      </tbody></table></div>
      {/* گوشی: هر روز یک تب؛ زنگ‌ها زیر هم با شماره‌ی زنگ و ساعت */}
      <div className="sched-days">
        <Tabs initialId={String(todayDay <= 5 ? todayDay : 0)} tabs={DAYS.map((name, d) => ({ id: String(d), label: name, content: (
          <div className="sd-list">{periods.map((p) => { const c = cell(d, p); const t = c ? timeRangeText(c.s, fa) : '';
            return (<div key={p} className={`sd-row${c ? '' : ' empty'}`}>
              <span className="sd-num">{fa(p)}</span>
              {c ? (<div className="sd-main"><b>{c.subject}</b><div className="muted small">{[c.tf ? `${c.tf} ${c.tl}` : '', c.s.room].filter(Boolean).join(' • ')}</div></div>) : <div className="sd-main muted small">بدون درس</div>}
              {c && t && <span className="sd-time">{t}</span>}
              {c && edit && <form action={deleteSlot}><input type="hidden" name="id" value={c.s.id} /><button className="btn danger sm" aria-label="حذف زنگ">×</button></form>}
            </div>); })}</div>) }))} />
      </div>
      {edit && (<><div style={{ height: 16 }} /><Card title="تعداد زنگ‌های هر روز"><ActionForm action={savePeriodCount} submit="ذخیره" resetOnSuccess={false} inline><div className="field"><label>مثلاً ۵ زنگه یا ۶ زنگه</label><select name="count" defaultValue={String(count)}>{Array.from({ length: MAX_PERIODS }, (_, i) => <option key={i} value={i + 1}>{fa(i + 1)} زنگ</option>)}</select></div></ActionForm></Card></>)}
      {edit && (<><div style={{ height: 16 }} /><Card title="افزودن یا تغییر یک زنگ">
        <ActionForm action={saveSlot} submit="ذخیره" resetOnSuccess={false}><input type="hidden" name="classId" value={classId} />
          <div className="inline-fields">
            <div className="field"><label>روز</label><select name="weekday">{DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}</select></div>
            <div className="field"><label>زنگ</label><select name="period">{periods.map((i) => <option key={i} value={i}>{fa(i)}</option>)}</select></div>
            <div className="field"><label>درس</label><select name="subjectId" defaultValue=""><option value="" disabled>انتخاب…</option>{subs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <div className="field"><label>کلاس/مکان</label><input name="room" maxLength={30} /></div>
            <div className="field"><label>ساعت شروع</label><input type="time" name="startTime" /></div>
            <div className="field"><label>ساعت پایان</label><input type="time" name="endTime" /></div>
          </div>
          <span className="hint-t">ساعت اختیاری است؛ اگر وارد کنید هر دو (شروع و پایان) لازم است. ثبت در زنگی که قبلاً پر شده، آن را جایگزین می‌کند.</span>
          {!subs.length && <span className="hint-t">ابتدا از پنل ادمین درس‌های این کلاس را تعریف کنید.</span>}
        </ActionForm></Card></>)}
    </>
  );
}
