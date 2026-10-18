import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { assignments, assignmentStatus, classes, classSubjects, subjects, users } from '@/db/schema';
import { createAssignment, deleteAssignment, penalizeAllMissing, penalizeAssignment, revokeAssignmentPenalty, toggleAssignmentDone } from '@/app/actions/school';
import { requireSchoolUser } from '@/lib/auth';
import { isManager, isStaff, focusClassIds, focusStudentIds } from '@/lib/permissions';
import { classesFor, subjectsFor } from '@/lib/school-data';
import { addDays, minutesNowTehran, todayTehran } from '@/lib/time';
import Link from 'next/link';
import { dueInfo, readSteps } from '@/lib/assignment-calc';
import { updateAssignment } from '@/app/actions/edit';
import { ACCEPT, HINT, listAttachments } from '@/lib/uploads';
import AttachmentList from '@/components/AttachmentList';
import { fa, formatJalali, fullName } from '@/lib/format';
import ActionForm from '@/components/ActionForm';
import JalaliDateInput from '@/components/JalaliDateInput';
import { ActionButton, TickButton } from '@/components/AssignmentControls';
import { UserAvatar } from '@/components/UserAvatar';
import { Badge, Card, Empty, PageHead } from '@/components/ui';

export const metadata = { title: 'تکالیف' };

export default async function AssignmentsPage({ searchParams }: { searchParams: Promise<{ class?: string }> }) {
  const u = await requireSchoolUser(['TEACHER', 'STUDENT', 'PARENT']); const sp = await searchParams; const today = todayTehran(); const nowMin = minutesNowTehran();
  const visible = await focusClassIds(u);
  const rows = !visible.length ? [] : await db.select({ a: assignments, subject: subjects.name, className: classes.name }).from(assignments)
    .innerJoin(subjects, eq(subjects.id, assignments.subjectId)).innerJoin(classes, eq(classes.id, assignments.classId))
    .where(inArray(assignments.classId, visible)).orderBy(desc(assignments.createdAt)).limit(80);

  // وضعیت انجام تکلیف‌ها (تیک دانش‌آموز / منفی معلم)
  const ids = rows.map((r) => r.a.id);
  const atts = await listAttachments('assignment', ids);
  const statuses = ids.length ? await db.select().from(assignmentStatus).where(inArray(assignmentStatus.assignmentId, ids)) : [];
  const stOf = new Map(statuses.map((x) => [`${x.assignmentId}:${x.studentId}`, x]));
  const teaches = new Set<string>();
  if (u.role === 'TEACHER') for (const r of await db.select({ c: classSubjects.classId, s: classSubjects.subjectId }).from(classSubjects).where(eq(classSubjects.teacherId, u.id))) teaches.add(`${r.c}:${r.s}`);
  const classStudents = new Map<string, { id: string; firstName: string; lastName: string; avatarPreset: number | null; avatarPhotoAt: Date | null }[]>();
  if (u.role === 'TEACHER' || u.role === 'PARENT') {
    const scope = await focusStudentIds(u);
    const stu = scope.length ? await db.select({ id: users.id, classId: users.classId, firstName: users.firstName, lastName: users.lastName, avatarPreset: users.avatarPreset, avatarPhotoAt: users.avatarPhotoAt }).from(users).where(and(inArray(users.id, scope), eq(users.status, 'active'))).orderBy(asc(users.lastName), asc(users.firstName)) : [];
    for (const x of stu) if (x.classId) classStudents.set(x.classId, [...(classStudents.get(x.classId) ?? []), x]);
  }

  let form: React.ReactNode = null;
  if (isStaff(u.role)) {
    const cls = await classesFor(u);
    const classId = sp.class && cls.some((c) => c.id === sp.class) ? sp.class : cls[0]?.id;
    const subs = classId ? await subjectsFor(u, classId) : [];
    form = (<Card title="ثبت تکلیف جدید">
      {!cls.length ? <Empty text="کلاسی به شما اختصاص داده نشده است." /> : (<>
        <form className="row" action="/assignments" style={{ marginBottom: 12 }}><select name="class" defaultValue={classId} style={{ maxWidth: 260 }}>{cls.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select><button className="btn ghost sm">تغییر کلاس</button></form>
        {!subs.length ? <div className="alert warn">شما معلم هیچ درسی در این کلاس نیستید.</div> : (
          <ActionForm action={createAssignment} submit="ثبت تکلیف">
            <input type="hidden" name="classId" value={classId} />
            <div className="inline-fields"><div className="field"><label>درس</label><select name="subjectId">{subs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
              <div className="field"><label>مهلت تحویل</label><JalaliDateInput name="dueDate" defaultIso={addDays(today, 3)} /></div>
              <div className="field"><label>ساعت مهلت (اختیاری)</label><input type="time" name="dueTime" /></div></div>
            <div className="field"><label>عنوان</label><input name="title" required maxLength={150} /></div>
            <div className="field"><label>توضیحات</label><textarea name="description" maxLength={1000} /></div>
            <div className="field"><label>مراحل انجام (اختیاری؛ هر خط یک مرحله)</label><textarea name="steps" maxLength={2000} placeholder={'رسم مدل اتم کربن\nرسم مدل اتم اکسیژن\nپاسخ به «فکر کنید»'} /><span className="hint-t">دانش‌آموز هر مرحله را جداگانه تیک می‌زند (حداکثر ۱۲ مرحله).</span></div>
            <div className="field"><label>پیوست (اختیاری)</label><input type="file" name="files" multiple accept={ACCEPT} /><span className="hint-t">{HINT}</span></div>
          </ActionForm>)}</>)}
    </Card>);
  }
  return (
    <>
      <PageHead illus="assignments" title="تکالیف" sub="تکالیف کلاس‌ها" />
      <div className="grid g-main">
        <Card title="فهرست تکالیف">{rows.length > 0 && <div className="tap-hint">👆 روی عنوان هر تکلیف (یا «جزئیات») بزنید تا توضیحات کامل، پیوست‌ها و وضعیت آن را ببینید.</div>}{rows.length ? <div className="list">{rows.map(({ a, subject, className }) => {
          const di = a.dueDate ? dueInfo(a.dueDate, a.dueTime, today, nowMin) : null; const over = di ? di.over : false; const mates = classStudents.get(a.classId) ?? [];
          const mineSt = u.role === 'STUDENT' ? stOf.get(`${a.id}:${u.id}`) : undefined;
          const canManage = u.role === 'TEACHER' && teaches.has(`${a.classId}:${a.subjectId}`);
          const doneN = mates.filter((m) => stOf.get(`${a.id}:${m.id}`)?.doneDate).length;
          const missing = mates.filter((m) => { const t = stOf.get(`${a.id}:${m.id}`); return !t?.doneDate && !t?.penaltyNoteId; });
          return (
          <div key={a.id} style={{ padding: '12px 0' }}>
            <div className="list-item" style={{ alignItems: 'flex-start', padding: 0 }}>
              <div><Link href={`/assignments/${a.id}`} className="asg-link"><b>{a.title}</b><span className="asg-more">جزئیات ‹</span></Link><div className="muted small">{subject} • {className}</div>{a.description && <p className="small" style={{ marginTop: 6 }}>{a.description}</p>}</div>
              <div className="col" style={{ alignItems: 'flex-end', gap: 6 }}>{di?.urgent && <span className="badge urgent">🏁 فوری</span>}{a.dueDate && <Badge tone={over ? '' : 'warn'}>{over ? 'مهلت گذشته' : `تا ${formatJalali(a.dueDate)}${a.dueTime ? ` • ${fa(a.dueTime.replace(/^0(?=\d:)/, ''))}` : ''}`}</Badge>}
                {u.role === 'STUDENT' && <TickButton action={toggleAssignmentDone} assignmentId={a.id} done={!!mineSt?.doneDate} locked={!!mineSt?.penaltyNoteId} lockedText="معلم برای این تکلیف منفی ثبت کرده است" />}
                {u.role === 'STUDENT' && mineSt?.penaltyNoteId && <Badge tone="danger">منفی ثبت شد</Badge>}
                {u.role === 'STUDENT' && mineSt?.doneDate && a.dueDate && mineSt.doneDate > a.dueDate && <Badge tone="warn">با تأخیر</Badge>}
                {u.role === 'TEACHER' && mates.length > 0 && <Badge tone={doneN === mates.length ? 'ok' : 'primary'}>{fa(doneN)} از {fa(mates.length)} انجام دادند</Badge>}
                {isStaff(u.role) && (isManager(u.role) || a.createdBy === u.id) && <form action={deleteAssignment}><input type="hidden" name="id" value={a.id} /><button className="btn danger sm">حذف</button></form>}</div>
            </div>
            {canManage && (<details className="roster"><summary>✏️ ویرایش تکلیف</summary>
              <div style={{ marginTop: 10, maxWidth: 560 }}><ActionForm action={updateAssignment} submit="ذخیره‌ی تغییرات" resetOnSuccess={false} small><input type="hidden" name="id" value={a.id} />
                <div className="inline-fields"><div className="field"><label>مهلت تحویل</label><JalaliDateInput name="dueDate" defaultIso={a.dueDate ?? ''} /></div><div className="field"><label>ساعت مهلت</label><input type="time" name="dueTime" defaultValue={a.dueTime ?? ''} /></div></div>
                <div className="field"><label>عنوان</label><input name="title" defaultValue={a.title} required maxLength={150} /></div>
                <div className="field"><label>توضیحات</label><textarea name="description" defaultValue={a.description ?? ''} maxLength={1000} /></div>
                <div className="field"><label>مراحل (هر خط یک مرحله)</label><textarea name="steps" defaultValue={readSteps(a.steps).join('\n')} maxLength={2000} /></div>
                <div className="field"><label>افزودن پیوست</label><input type="file" name="files" multiple accept={ACCEPT} /><span className="hint-t">{HINT}</span></div>
              </ActionForm>
              <AttachmentList items={atts.filter((f) => f.ownerId === a.id)} canRemove /></div></details>)}
            {u.role === 'PARENT' && mates.length > 0 && <div className="chips" style={{ marginTop: 8 }}>{mates.map((m) => { const t = stOf.get(`${a.id}:${m.id}`); return <Badge key={m.id} tone={t?.doneDate ? 'ok' : t?.penaltyNoteId ? 'danger' : over ? 'warn' : ''}>{m.firstName}: {t?.doneDate ? 'انجام داد' : t?.penaltyNoteId ? 'منفی ثبت شد' : 'انجام نداده'}</Badge>; })}</div>}
            {u.role === 'TEACHER' && mates.length > 0 && (
              <details className="roster"><summary>وضعیت دانش‌آموزان ({fa(doneN)} انجام داده، {fa(missing.length)} انجام نداده)</summary>
                {canManage && missing.length > 0 && (a.dueDate ? (over ? <div style={{ margin: '8px 0' }}><ActionButton action={penalizeAllMissing} fields={{ assignmentId: a.id }} tone="danger" label={`ثبت منفی برای همه‌ی انجام‌نداده‌ها (${fa(missing.length)} نفر)`} confirm="برای همه‌ی دانش‌آموزانی که تکلیف را انجام نداده‌اند منفی ثبت شود؟" /></div> : <p className="muted small" style={{ margin: '8px 0' }}>ثبت منفی بعد از پایان مهلت ({formatJalali(a.dueDate)}) فعال می‌شود.</p>) : <p className="muted small" style={{ margin: '8px 0' }}>این تکلیف مهلت ندارد، پس ثبت منفی ممکن نیست.</p>)}
                {mates.map((m) => { const t = stOf.get(`${a.id}:${m.id}`); const done = !!t?.doneDate; const pen = !!t?.penaltyNoteId; return (
                  <div className="roster-row" key={m.id}>
                    <span className="row" style={{ gap: 8 }}><UserAvatar user={m} size={30} />{fullName(m)}</span>
                    <span className="row" style={{ gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {done ? <Badge tone="ok">✓ انجام داد{a.dueDate && t!.doneDate! > a.dueDate ? ' (با تأخیر)' : ''}</Badge> : pen ? <Badge tone="danger">منفی ثبت شد</Badge> : <Badge tone={over ? 'warn' : ''}>انجام نداده</Badge>}
                      {canManage && !done && !pen && over && <ActionButton action={penalizeAssignment} fields={{ assignmentId: a.id, studentId: m.id }} tone="danger" label="ثبت منفی" />}
                      {canManage && pen && <ActionButton action={revokeAssignmentPenalty} fields={{ assignmentId: a.id, studentId: m.id }} tone="ghost" label="لغو منفی" />}
                    </span>
                  </div>); })}
              </details>)}
          </div>); })}</div> : <Empty text="تکلیفی ثبت نشده است." icon="assign" />}</Card>
        {form}
      </div>
    </>
  );
}
