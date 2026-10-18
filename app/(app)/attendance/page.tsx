import Link from 'next/link';
import { and, desc, eq, inArray, isNull, or } from 'drizzle-orm';
import { db } from '@/db';
import { attendance, excuseRequests, users } from '@/db/schema';
import { requestExcuse, reviewExcuse } from '@/app/actions/excuse';
import { saveAttendance } from '@/app/actions/school';
import { requireSchoolUser } from '@/lib/auth';
import { isManager, isStaff, focusStudentIds } from '@/lib/permissions';
import { attendanceLabels, classesFor, studentsOfClass } from '@/lib/school-data';
import { todayTehran } from '@/lib/time';
import { fa, formatJalali, fullName } from '@/lib/format';
import ActionForm from '@/components/ActionForm';
import AttendanceCalendar from '@/components/AttendanceCalendar';
import CalendarToggle from '@/components/CalendarToggle';
import JalaliDateInput from '@/components/JalaliDateInput';
import { Badge, Card, Empty, PageHead } from '@/components/ui';

export const metadata = { title: 'حضور و غیاب' };

export default async function AttendancePage({ searchParams }: { searchParams: Promise<{ class?: string; date?: string }> }) {
  const u = await requireSchoolUser(); const sp = await searchParams; const today = todayTehran();

  if (!isStaff(u.role)) {
    // دانش‌آموز و ولی: سوابق غیبت + درخواست موجه شدن با توضیح
    const ids = await focusStudentIds(u);
    const rows = ids.length ? await db.select({ a: attendance, fn: users.firstName, ln: users.lastName }).from(attendance).innerJoin(users, eq(users.id, attendance.studentId)).where(inArray(attendance.studentId, ids)).orderBy(desc(attendance.date)).limit(400) : [];
    const reqs = rows.length ? await db.select().from(excuseRequests).where(inArray(excuseRequests.attendanceId, rows.map((r) => r.a.id))) : [];
    const reqOf = new Map(reqs.map((r) => [r.attendanceId, r]));
    const calRecords = rows.map(({ a }) => ({ date: a.date, status: a.status, note: a.note, excuse: reqOf.get(a.id)?.status ?? null }));
    const sumStudent = u.role === 'PARENT' && ids[0] ? (await db.select({ f: users.firstName }).from(users).where(eq(users.id, ids[0])).limit(1))[0]?.f : undefined;
    return (<><PageHead illus="attendance" title="غیبت‌ها و تأخیرها" sub="روی هر روز تقویم بزنید تا وضعیتش را ببینید. اگر غیبت یا تأخیر دلیل موجهی داشت، توضیح بنویسید تا برای ثبت‌کننده‌ی آن ارسال شود." />
      <Card><CalendarToggle><AttendanceCalendar records={calRecords} today={today} studentName={sumStudent} /></CalendarToggle></Card><div style={{ height: 16 }} />
      <Card title="فهرست غیبت‌ها و تأخیرها">{rows.length ? <div className="list">{rows.map(({ a: r, fn, ln }) => { const q = reqOf.get(r.id); return (
        <div className="list-item" key={r.id} style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220 }}><b>{formatJalali(r.date, true)}</b>{u.role === 'PARENT' && <span className="muted small"> • {fn} {ln}</span>}{r.note && <div className="muted small">{r.note}</div>}
            {q && <div className="small" style={{ marginTop: 6 }}><span className="muted">توضیح شما: </span>{q.reason}{q.status === 'rejected' && q.reviewNote && <div className="muted">پاسخ: {q.reviewNote}</div>}{q.status === 'approved' && q.reviewNote && <div className="muted">پاسخ: {q.reviewNote}</div>}</div>}
            {!q && r.status !== 'excused' && (<details style={{ marginTop: 8 }}><summary className="btn ghost sm" style={{ display: 'inline-flex' }}>درخواست موجه شدن</summary>
              <div style={{ marginTop: 10, maxWidth: 460 }}><ActionForm action={requestExcuse} submit="ارسال درخواست" small><input type="hidden" name="attendanceId" value={r.id} /><div className="field"><label>توضیح و دلیل غیبت</label><textarea name="reason" required minLength={5} maxLength={1000} placeholder="مثلاً: بیماری با ارائه‌ی گواهی پزشکی…" /></div></ActionForm></div></details>)}
          </div>
          <div className="row" style={{ gap: 6 }}>{q && <Badge tone={q.status === 'pending' ? 'warn' : q.status === 'approved' ? 'ok' : 'danger'}>{q.status === 'pending' ? 'در انتظار بررسی' : q.status === 'approved' ? 'موجه شد' : 'پذیرفته نشد'}</Badge>}<Badge tone={r.status === 'absent' ? 'danger' : r.status === 'late' ? 'warn' : 'primary'}>{attendanceLabels[r.status]}</Badge></div>
        </div>); })}</div> : <Empty text="هیچ غیبت یا تأخیری ثبت نشده است. 👏" icon="check" />}</Card></>);
  }

  // درخواست‌های موجه شدنِ در انتظارِ همین کاربر (غیبت‌هایی که خودش ثبت کرده؛ مدیر/معاون: ثبت‌کننده‌ی حذف‌شده هم)
  const mineCond = isManager(u.role) ? or(eq(attendance.recordedBy, u.id), isNull(attendance.recordedBy)) : eq(attendance.recordedBy, u.id);
  const pending = await db.select({ r: excuseRequests, a: attendance, fn: users.firstName, ln: users.lastName }).from(excuseRequests).innerJoin(attendance, eq(attendance.id, excuseRequests.attendanceId)).innerJoin(users, eq(users.id, attendance.studentId))
    .where(and(eq(excuseRequests.status, 'pending'), eq(users.schoolId, u.schoolId!), mineCond)).orderBy(desc(excuseRequests.createdAt));
  const reqUsers = pending.length ? await db.select().from(users).where(inArray(users.id, pending.map((p) => p.r.requesterId))) : [];
  const reqName = new Map(reqUsers.map((x) => [x.id, `${fullName(x)} (${x.role === 'PARENT' ? 'ولی' : 'دانش‌آموز'})`]));

  const cls = await classesFor(u);
  const classId = sp.class && cls.some((c) => c.id === sp.class) ? sp.class : cls[0]?.id;
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) && sp.date <= today ? sp.date : today;
  const students = classId ? await studentsOfClass(classId, u.schoolId!) : [];
  const existing = students.length ? await db.select().from(attendance).where(and(eq(attendance.date, date), inArray(attendance.studentId, students.map((s) => s.id)))) : [];
  const byStudent = new Map(existing.map((e) => [e.studentId, e]));

  return (
    <>
      <PageHead illus="attendance" title="حضور و غیاب" sub="فقط غایب‌ها و تأخیرها را مشخص کنید؛ بقیه حاضر حساب می‌شوند." />
      {pending.length > 0 && (<><Card title={`درخواست‌های موجه شدن غیبت (${fa(pending.length)})`}><div className="list">{pending.map(({ r, a, fn, ln }) => (
        <form action={reviewExcuse} className="list-item" key={r.id} style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <input type="hidden" name="id" value={r.id} />
          <div style={{ flex: 1, minWidth: 240 }}><b>{fn} {ln}</b> <span className="muted small">• {formatJalali(a.date, true)} • {attendanceLabels[a.status]}</span>
            <div className="small" style={{ marginTop: 6 }}><span className="muted">توضیح {reqName.get(r.requesterId)}: </span>{r.reason}</div></div>
          <div className="stack" style={{ minWidth: 240 }}><input name="note" placeholder="پاسخ (اختیاری)" maxLength={500} />
            <div className="row"><button className="btn sm" name="decision" value="approve">موجه شد</button><button className="btn danger sm" name="decision" value="reject">رد درخواست</button></div></div>
        </form>))}</div></Card><div style={{ height: 16 }} /></>)}
      <Card>
        <form className="row" action="/attendance" style={{ alignItems: 'flex-end' }}>
          <div className="field" style={{ minWidth: 220 }}><label>کلاس</label><select name="class" defaultValue={classId}>{cls.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div className="field" style={{ minWidth: 300 }}><label>تاریخ</label><JalaliDateInput name="date" defaultIso={date} /></div>
          <button className="btn ghost">نمایش</button>
        </form>
      </Card>
      <div style={{ height: 16 }} />
      {!cls.length ? <Card><Empty text="هنوز کلاسی به شما اختصاص داده نشده است. از مدیر سامانه بخواهید شما را به یک کلاس/درس متصل کند." /></Card>
        : !students.length ? <Card><Empty text="این کلاس دانش‌آموزی ندارد." icon="users" /></Card> : (
        <Card title={`${formatJalali(date, true)} • ${fa(students.length)} دانش‌آموز`}>
          <ActionForm action={saveAttendance} submit="ذخیره‌ی حضور و غیاب" resetOnSuccess={false}>
            <input type="hidden" name="classId" value={classId} /><input type="hidden" name="date" value={date} />
            <div className="list">{students.map((s) => { const cur = byStudent.get(s.id)?.status ?? 'present'; return (
              <div className="list-item" key={s.id} style={{ flexWrap: 'wrap' }}>
                <div className="row"><div className="avatar">{s.firstName[0]}</div><Link href={`/students/${s.id}`}>{fullName(s)}</Link></div>
                <div className="radio-row">
                  {([['present', 'حاضر', 'p'], ['absent', 'غایب', 'a'], ['late', 'تأخیر', 'l'], ['excused', 'موجه', 'e']] as const).map(([v, l, c]) => (
                    <label key={v}><input type="radio" name={`status_${s.id}`} value={v} defaultChecked={cur === v} /><span className={c}>{l}</span></label>))}
                  <input name={`note_${s.id}`} defaultValue={byStudent.get(s.id)?.note ?? ''} placeholder="توضیح" style={{ width: 160, minHeight: 34, padding: '4px 10px' }} />
                </div>
              </div>); })}</div>
          </ActionForm>
        </Card>)}
    </>
  );
}
