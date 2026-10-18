import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { assignmentFiles, assignments, assignmentStatus, classes, classSubjects, subjects, users } from '@/db/schema';
import { saveAssignmentNote, toggleAssignmentDone, toggleAssignmentStep } from '@/app/actions/school';
import { requireSchoolUser } from '@/lib/auth';
import { visibleClassIds } from '@/lib/permissions';
import { agoText, dueInfo, readSteps, readStepsDone } from '@/lib/assignment-calc';
import { fa, formatJalali, fullName } from '@/lib/format';
import { minutesNowTehran, todayTehran } from '@/lib/time';
import { NoteBox, DoneBar, StepList } from '@/components/AssignmentDetail';
import { Illus } from '@/components/Illus';
import { Badge, Card } from '@/components/ui';
import { listAttachments } from '@/lib/uploads';
import AttachmentList from '@/components/AttachmentList';

export const metadata = { title: 'جزئیات تکلیف' };
const clock = (t: string) => fa(t.replace(/^0(?=\d:)/, ''));
const kb = (n: number) => `${fa(Math.max(1, Math.round(n / 1024)))} کیلوبایت`;
const WORD = { over: 'مهلت گذشته', today: 'امروز', tomorrow: 'فردا', dayAfter: 'پس‌فردا', later: '' } as const;

export default async function AssignmentDetail({ params }: { params: Promise<{ id: string }> }) {
  const u = await requireSchoolUser(['TEACHER', 'STUDENT', 'PARENT']); const { id } = await params;
  const [row] = await db.select({ a: assignments, subject: subjects.name, className: classes.name }).from(assignments)
    .innerJoin(subjects, eq(subjects.id, assignments.subjectId)).innerJoin(classes, eq(classes.id, assignments.classId)).where(eq(assignments.id, id)).limit(1);
  if (!row || !(await visibleClassIds(u)).includes(row.a.classId)) notFound();
  const { a } = row; const today = todayTehran(); const nowMin = minutesNowTehran();
  const [teacher] = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName }).from(classSubjects).innerJoin(users, eq(users.id, classSubjects.teacherId))
    .where(and(eq(classSubjects.classId, a.classId), eq(classSubjects.subjectId, a.subjectId))).limit(1);
  const files = await db.select({ id: assignmentFiles.id, name: assignmentFiles.name, mime: assignmentFiles.mime, size: assignmentFiles.size }).from(assignmentFiles).where(eq(assignmentFiles.assignmentId, id)).orderBy(asc(assignmentFiles.createdAt));
  const newFiles = await listAttachments('assignment', [id]);
  const mine = u.role === 'STUDENT' ? (await db.select().from(assignmentStatus).where(and(eq(assignmentStatus.assignmentId, id), eq(assignmentStatus.studentId, u.id))).limit(1))[0] : undefined;
  const steps = readSteps(a.steps); const due = a.dueDate ? dueInfo(a.dueDate, a.dueTime, today, nowMin) : null;
  const dueWord = due ? (due.word === 'later' ? `${fa(due.days)} روز دیگر` : WORD[due.word]) : '';
  const created = todayTehran(a.createdAt);

  return (
    <>
      <div className="row" style={{ marginBottom: 8 }}><Link href="/assignments" className="btn ghost sm">→ بازگشت به تکالیف</Link></div>
      <div className="ad-head">
        <span className="ad-ico" style={{ '--ac': '#ec4899' } as React.CSSProperties}><Illus name="assignments" size={44} /></span>
        <div><b style={{ fontSize: '1.1rem' }}>{row.subject}</b><div className="muted small">{teacher ? `دبیر ${fullName(teacher)}` : 'بدون معلم'} • {row.className}</div></div>
      </div>
      <h1 className="ad-title">{a.title}</h1>
      <div className="row" style={{ marginBottom: 14 }}>
        {due?.urgent && <span className="badge urgent">🏁 فوری</span>}
        {due && <Badge tone={due.over ? '' : 'warn'}>🕘 {dueWord}{a.dueTime ? ` • ${clock(a.dueTime)}` : ''}</Badge>}
        {mine?.penaltyNoteId && <Badge tone="danger">منفی ثبت شد</Badge>}
      </div>

      {a.dueDate && <div className="ad-info"><div><div className="k">مهلت تحویل</div><div className="v">{formatJalali(a.dueDate, true)}{a.dueTime ? ` • ساعت ${clock(a.dueTime)}` : ''}</div></div></div>}
      <div className="ad-info"><div><div className="k">تاریخ ارائه</div><div className="v">{agoText(created, today, fa)} • {formatJalali(created)}</div></div></div>
      {teacher && <div className="ad-info"><div><div className="k">دبیر</div><div className="v">{fullName(teacher)}</div></div>{u.role !== 'TEACHER' && <Link className="btn ghost sm" href={`/messages?to=${teacher.id}`}>✉️ پیام</Link>}</div>}

      {a.description && <section style={{ marginTop: 22 }}><h3 style={{ marginBottom: 8 }}>شرح تکلیف</h3><p style={{ whiteSpace: 'pre-wrap', lineHeight: 2 }}>{a.description}</p></section>}
      {steps.length > 0 && <section style={{ marginTop: 22 }}><StepList action={toggleAssignmentStep} assignmentId={a.id} steps={steps} done={readStepsDone(mine?.stepsDone)} readOnly={u.role !== 'STUDENT'} /></section>}
      {newFiles.length > 0 && <section style={{ marginTop: 22 }}><h3 style={{ marginBottom: 10 }}>پیوست</h3><AttachmentList items={newFiles} /></section>}
      {files.length > 0 && <section style={{ marginTop: 22 }}><h3 style={{ marginBottom: 10 }}>پیوست</h3><div className="stack" style={{ gap: 10 }}>{files.map((f) => (
        <div className="file-card" key={f.id}><span className={`file-ico ${f.mime === 'application/pdf' ? 'pdf' : 'img'}`}>{f.mime === 'application/pdf' ? 'PDF' : 'عکس'}</span>
          <div className="grow"><b dir="auto">{f.name}</b><div className="muted small">{kb(f.size)}</div></div>
          <a className="btn ghost sm" href={`/api/assignment-file/${f.id}`} target="_blank" rel="noopener">👁 مشاهده</a></div>))}</div></section>}
      {u.role === 'STUDENT' && <section style={{ marginTop: 22 }}><h3 style={{ marginBottom: 8 }}>یادداشت من</h3><NoteBox action={saveAssignmentNote} assignmentId={a.id} initial={mine?.note ?? ''} /></section>}
      {u.role === 'TEACHER' && <Card className="" title="وضعیت دانش‌آموزان"><p className="muted small">برای دیدن اینکه چه کسی تکلیف را انجام داده و ثبت منفی بعد از پایان مهلت، به <Link href="/assignments">فهرست تکالیف</Link> بروید.</p></Card>}
      {u.role === 'STUDENT' && <DoneBar action={toggleAssignmentDone} assignmentId={a.id} done={!!mine?.doneDate} locked={!!mine?.penaltyNoteId} />}
    </>
  );
}
