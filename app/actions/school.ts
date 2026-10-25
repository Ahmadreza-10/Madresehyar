'use server';
import { and, eq, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/db';
import { announcements, assignmentFiles, assignments, assignmentStatus, attendance, grades, GRADE_TYPES, NOTE_TYPES, studentNotes, subjects, users } from '@/db/schema';
import { audit } from '@/lib/audit';
import type { CurrentUser } from '@/lib/auth';
import { canAccessStudent, canGradeSubject, classInSchool, isManager, schoolOf, visibleClassIds } from '@/lib/permissions';
import { fail, firstZodError, run, success, type ActionState } from '@/lib/action';
import { minutesNowTehran, parseHM, todayTehran } from '@/lib/time';
import { dueInfo, parseSteps, readSteps, readStepsDone } from '@/lib/assignment-calc';
import { deleteAttachmentsOf, readUploads, saveAttachments } from '@/lib/uploads';

const STAFF = ['PRINCIPAL', 'VICE', 'TEACHER'] as const;
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'تاریخ معتبر نیست.');

/** حضور و غیاب یک کلاس در یک روز: فقط غایب/تأخیر/موجه ذخیره می‌شود؛ «حاضر» یعنی رکوردی نیست */
export async function saveAttendance(_: ActionState, fd: FormData): Promise<ActionState> {
  return run([...STAFF], async (user) => {
    const classId = String(fd.get('classId')); const date = isoDate.safeParse(String(fd.get('date')));
    if (!date.success) return fail('تاریخ معتبر نیست.');
    if (date.data > todayTehran()) return fail('ثبت حضور و غیاب برای روز آینده ممکن نیست.');
    const allowed = await visibleClassIds(user);
    if (!allowed.includes(classId)) return fail('این کلاس در محدوده‌ی دسترسی شما نیست.');
    const students = await db.select({ id: users.id }).from(users).where(and(eq(users.role, 'STUDENT'), eq(users.classId, classId), eq(users.schoolId, schoolOf(user))));
    const ids = students.map((s) => s.id);
    if (!ids.length) return fail('این کلاس دانش‌آموزی ندارد.');
    await db.delete(attendance).where(and(eq(attendance.date, date.data), inArray(attendance.studentId, ids)));
    const rows = ids.flatMap((id) => {
      const st = String(fd.get(`status_${id}`) ?? 'present');
      if (st !== 'absent' && st !== 'late' && st !== 'excused') return [];
      return [{ studentId: id, date: date.data, status: st as 'absent' | 'late' | 'excused', note: String(fd.get(`note_${id}`) ?? '').trim().slice(0, 200) || null, recordedBy: user.id }];
    });
    if (rows.length) await db.insert(attendance).values(rows);
    await audit(user.id, 'ATTENDANCE_SAVE', 'class', classId, `${date.data} • ${rows.length} مورد`);
    revalidatePath('/attendance');
    return success(rows.length ? `حضور و غیاب ثبت شد (${rows.length} مورد غیبت/تأخیر).` : 'حضور و غیاب ثبت شد؛ همه حاضر بودند.');
  });
}

export async function saveGrades(_: ActionState, fd: FormData): Promise<ActionState> {
  return run([...STAFF], async (user) => {
    const meta = z.object({
      classId: z.string().min(1), subjectId: z.string().min(1), title: z.string().trim().min(2, 'عنوان نمره را بنویسید.').max(100),
      type: z.enum(GRADE_TYPES), maxScore: z.coerce.number().min(1).max(100), date: isoDate,
    }).safeParse(Object.fromEntries(fd));
    if (!meta.success) return fail(firstZodError(meta.error));
    const m = meta.data;
    if (!(await canGradeSubject(user, m.classId, m.subjectId))) return fail('شما معلم این درس در این کلاس نیستید.');
    const students = await db.select({ id: users.id }).from(users).where(and(eq(users.role, 'STUDENT'), eq(users.classId, m.classId), eq(users.schoolId, schoolOf(user))));
    const rows: (typeof grades.$inferInsert)[] = [];
    for (const s of students) {
      const raw = String(fd.get(`score_${s.id}`) ?? '').trim().replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace('٫', '.').replace(',', '.');
      if (raw === '') continue;
      const score = Number(raw);
      if (!Number.isFinite(score) || score < 0 || score > m.maxScore) return fail(`نمره‌ی واردشده معتبر نیست (باید بین ۰ و ${m.maxScore} باشد).`);
      rows.push({ studentId: s.id, subjectId: m.subjectId, title: m.title, type: m.type, score, maxScore: m.maxScore, date: m.date, recordedBy: user.id });
    }
    if (!rows.length) return fail('برای حداقل یک دانش‌آموز نمره وارد کنید.');
    await db.insert(grades).values(rows);
    await audit(user.id, 'GRADES_SAVE', 'class', m.classId, `${m.title} • ${rows.length} نمره`);
    revalidatePath('/grades');
    return success(`${rows.length} نمره ثبت شد.`);
  });
}

export async function deleteGrade(fd: FormData) {
  await run([...STAFF], async (user) => {
    const id = String(fd.get('id'));
    const [g] = await db.select().from(grades).where(eq(grades.id, id)).limit(1);
    if (!g) return success();
    const [st] = await db.select().from(users).where(eq(users.id, g.studentId)).limit(1);
    if (!st?.classId || st.schoolId !== user.schoolId || !(await canGradeSubject(user, st.classId, g.subjectId))) return fail('دسترسی ندارید.');
    await db.delete(grades).where(eq(grades.id, id));
    await audit(user.id, 'GRADE_DELETE', 'grade', id);
    revalidatePath('/grades'); revalidatePath(`/students/${g.studentId}`);
    return success();
  });
}

export async function addNote(_: ActionState, fd: FormData): Promise<ActionState> {
  return run([...STAFF], async (user) => {
    const p = z.object({ studentId: z.string().min(1), type: z.enum(NOTE_TYPES), body: z.string().trim().min(2, 'متن یادداشت را بنویسید.').max(500), count: z.coerce.number().int('تعداد باید عدد صحیح باشد.').min(1, 'تعداد حداقل ۱ است.').max(100, 'تعداد حداکثر ۱۰۰ است.').optional() }).safeParse(Object.fromEntries(fd));
    if (!p.success) return fail(firstZodError(p.error));
    if (!(await canAccessStudent(user, p.data.studentId))) return fail('دسترسی ندارید.');
    const { count: cnt, ...rest } = p.data;
    await db.insert(studentNotes).values({ ...rest, count: rest.type === 'note' ? 1 : (cnt ?? 1), date: todayTehran(), authorId: user.id });
    await audit(user.id, 'NOTE_ADD', 'student', p.data.studentId, `${p.data.type}×${p.data.type === 'note' ? 1 : (p.data.count ?? 1)}`);
    revalidatePath(`/students/${p.data.studentId}`); revalidatePath('/discipline');
    return success('یادداشت ثبت شد.');
  });
}

export async function createAssignment(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(['TEACHER'], async (user) => {
    const p = z.object({
      classId: z.string().min(1), subjectId: z.string().min(1), title: z.string().trim().min(2, 'عنوان تکلیف را بنویسید.').max(150),
      description: z.string().trim().max(1000).optional(), dueDate: z.string().optional(), dueTime: z.string().trim().max(5).optional(), steps: z.string().max(2000).optional(),
    }).safeParse(Object.fromEntries(fd));
    if (!p.success) return fail(firstZodError(p.error));
    if (!(await canGradeSubject(user, p.data.classId, p.data.subjectId))) return fail('شما معلم این درس در این کلاس نیستید.');
    const dueTime = p.data.dueTime || null;
    if (dueTime && parseHM(dueTime) === null) return fail('ساعت مهلت معتبر نیست.');
    if (dueTime && !p.data.dueDate) return fail('برای ساعت مهلت، تاریخ مهلت را هم انتخاب کنید.');
    const up = await readUploads(fd); if (!up.ok) return fail(up.error);
    const att = up.files;
    const [a] = await db.insert(assignments).values({ classId: p.data.classId, subjectId: p.data.subjectId, title: p.data.title, description: p.data.description || null, dueDate: p.data.dueDate || null, dueTime, steps: JSON.stringify(parseSteps(p.data.steps ?? '')), createdBy: user.id }).returning({ id: assignments.id });
    await saveAttachments('assignment', a.id, user.id, att);
    await audit(user.id, 'ASSIGNMENT_CREATE', 'class', p.data.classId, p.data.title);
    revalidatePath('/assignments'); revalidatePath('/dashboard');
    return success(att.length ? `تکلیف با ${att.length} پیوست ثبت شد.` : 'تکلیف ثبت شد.');
  });
}

/** تیک‌زدن یا برداشتن یک مرحله‌ی تکلیف (فقط دانش‌آموزِ همان کلاس) */
export async function toggleAssignmentStep(fd: FormData): Promise<ActionState> {
  return run(['STUDENT'], async (user) => {
    const id = String(fd.get('assignmentId')); const idx = Number(fd.get('index'));
    const [a] = await db.select().from(assignments).where(eq(assignments.id, id)).limit(1);
    if (!a || !user.classId || a.classId !== user.classId) return fail('این تکلیف برای کلاس شما نیست.');
    const steps = readSteps(a.steps);
    if (!Number.isInteger(idx) || idx < 0 || idx >= steps.length) return fail('این مرحله وجود ندارد.');
    const [st] = await db.select().from(assignmentStatus).where(and(eq(assignmentStatus.assignmentId, id), eq(assignmentStatus.studentId, user.id))).limit(1);
    const done = new Set(readStepsDone(st?.stepsDone)); if (done.has(idx)) done.delete(idx); else done.add(idx);
    const stepsDone = JSON.stringify([...done].filter((i) => i < steps.length).sort((x, y) => x - y));
    if (st) await db.update(assignmentStatus).set({ stepsDone, updatedAt: new Date() }).where(eq(assignmentStatus.id, st.id));
    else await db.insert(assignmentStatus).values({ assignmentId: id, studentId: user.id, stepsDone });
    revalidatePath(`/assignments/${id}`);
    return success();
  });
}

/** یادداشت شخصی دانش‌آموز برای یک تکلیف (فقط برای خودش؛ معلم نمی‌بیند) */
export async function saveAssignmentNote(fd: FormData): Promise<ActionState> {
  return run(['STUDENT'], async (user) => {
    const id = String(fd.get('assignmentId')); const note = String(fd.get('note') ?? '').slice(0, 1000);
    const [a] = await db.select({ classId: assignments.classId }).from(assignments).where(eq(assignments.id, id)).limit(1);
    if (!a || !user.classId || a.classId !== user.classId) return fail('این تکلیف برای کلاس شما نیست.');
    const [st] = await db.select({ id: assignmentStatus.id }).from(assignmentStatus).where(and(eq(assignmentStatus.assignmentId, id), eq(assignmentStatus.studentId, user.id))).limit(1);
    if (st) await db.update(assignmentStatus).set({ note: note || null, updatedAt: new Date() }).where(eq(assignmentStatus.id, st.id));
    else await db.insert(assignmentStatus).values({ assignmentId: id, studentId: user.id, note: note || null });
    return success('ذخیره شد');
  });
}
export async function deleteAssignment(fd: FormData) {
  await run(['TEACHER'], async (user) => {
    const id = String(fd.get('id'));
    const [a] = await db.select().from(assignments).where(eq(assignments.id, id)).limit(1);
    if (a && (await canGradeSubject(user, a.classId, a.subjectId))) { await deleteAttachmentsOf('assignment', id); await db.delete(assignments).where(eq(assignments.id, id)); revalidatePath('/assignments'); }
    return success();
  });
}

/** دانش‌آموز «انجام شد» را تیک می‌زند یا برمی‌دارد. بعد از ثبت منفی توسط معلم قابل تغییر نیست. */
export async function toggleAssignmentDone(fd: FormData): Promise<ActionState> {
  return run(['STUDENT'], async (user) => {
    const id = String(fd.get('assignmentId'));
    const [a] = await db.select().from(assignments).where(eq(assignments.id, id)).limit(1);
    if (!a || !user.classId || a.classId !== user.classId) return fail('این تکلیف برای کلاس شما نیست.');
    const [st] = await db.select().from(assignmentStatus).where(and(eq(assignmentStatus.assignmentId, id), eq(assignmentStatus.studentId, user.id))).limit(1);
    if (st?.penaltyNoteId) return fail('معلم برای این تکلیف منفی ثبت کرده است؛ با معلم هماهنگ کنید.');
    const doneDate = st?.doneDate ? null : todayTehran();
    if (st) await db.update(assignmentStatus).set({ doneDate, updatedAt: new Date() }).where(eq(assignmentStatus.id, st.id));
    else await db.insert(assignmentStatus).values({ assignmentId: id, studentId: user.id, doneDate });
    revalidatePath('/assignments'); revalidatePath(`/assignments/${id}`); revalidatePath('/dashboard');
    return success(doneDate ? 'تکلیف انجام‌شده ثبت شد.' : 'تیک برداشته شد.');
  });
}

/** ثبت منفی برای یک دانش‌آموز که تکلیف را انجام نداده؛ فقط بعد از پایان مهلت و فقط توسط معلمِ همان درس */
async function penalizeOne(user: CurrentUser, a: typeof assignments.$inferSelect, subject: string, studentId: string): Promise<'ok' | 'skip'> {
  const [stu] = await db.select({ id: users.id, classId: users.classId, schoolId: users.schoolId }).from(users).where(and(eq(users.id, studentId), eq(users.role, 'STUDENT'))).limit(1);
  if (!stu || stu.classId !== a.classId || stu.schoolId !== user.schoolId) return 'skip';
  const [st] = await db.select().from(assignmentStatus).where(and(eq(assignmentStatus.assignmentId, a.id), eq(assignmentStatus.studentId, studentId))).limit(1);
  if (st?.doneDate || st?.penaltyNoteId) return 'skip';
  const [note] = await db.insert(studentNotes).values({ studentId, type: 'discipline', body: `عدم انجام تکلیف «${a.title}» (${subject})`, date: todayTehran(), authorId: user.id }).returning({ id: studentNotes.id });
  if (st) await db.update(assignmentStatus).set({ penaltyNoteId: note.id, updatedAt: new Date() }).where(eq(assignmentStatus.id, st.id));
  else await db.insert(assignmentStatus).values({ assignmentId: a.id, studentId, penaltyNoteId: note.id });
  return 'ok';
}
async function loadForPenalty(user: CurrentUser, assignmentId: string): Promise<{ a: typeof assignments.$inferSelect; subject: string } | string> {
  const [row] = await db.select({ a: assignments, subject: subjects.name }).from(assignments).innerJoin(subjects, eq(subjects.id, assignments.subjectId)).where(eq(assignments.id, assignmentId)).limit(1);
  if (!row || !(await canGradeSubject(user, row.a.classId, row.a.subjectId))) return 'شما معلم این درس در این کلاس نیستید.';
  if (!row.a.dueDate) return 'این تکلیف مهلت ندارد؛ برای ثبت منفی ابتدا باید مهلت داشته باشد.';
  if (!dueInfo(row.a.dueDate, row.a.dueTime, todayTehran(), minutesNowTehran()).over) return 'ثبت منفی فقط بعد از پایان مهلت تحویل ممکن است.';
  return row;
}
export async function penalizeAssignment(fd: FormData): Promise<ActionState> {
  return run(['TEACHER'], async (user) => {
    const r = await loadForPenalty(user, String(fd.get('assignmentId'))); if (typeof r === 'string') return fail(r);
    const studentId = String(fd.get('studentId'));
    const res = await penalizeOne(user, r.a, r.subject, studentId);
    if (res === 'ok') await audit(user.id, 'ASSIGNMENT_PENALTY', 'student', studentId, r.a.title);
    revalidatePath('/assignments'); revalidatePath('/discipline'); revalidatePath(`/students/${studentId}`);
    return res === 'ok' ? success('منفی ثبت شد.') : fail('برای این دانش‌آموز نمی‌توان منفی ثبت کرد (تکلیف را انجام داده یا قبلاً منفی خورده است).');
  });
}
export async function penalizeAllMissing(fd: FormData): Promise<ActionState> {
  return run(['TEACHER'], async (user) => {
    const r = await loadForPenalty(user, String(fd.get('assignmentId'))); if (typeof r === 'string') return fail(r);
    const stu = await db.select({ id: users.id }).from(users).where(and(eq(users.role, 'STUDENT'), eq(users.classId, r.a.classId), eq(users.schoolId, schoolOf(user)), eq(users.status, 'active')));
    let n = 0; for (const s of stu) if ((await penalizeOne(user, r.a, r.subject, s.id)) === 'ok') n++;
    if (n) await audit(user.id, 'ASSIGNMENT_PENALTY_ALL', 'assignment', r.a.id, `${n} نفر`);
    revalidatePath('/assignments'); revalidatePath('/discipline');
    return n ? success(`برای ${n} دانش‌آموز منفی ثبت شد.`) : success('دانش‌آموزِ انجام‌نداده‌ای باقی نمانده است.');
  });
}
/** لغو منفیِ تکلیف (مثلاً اشتباه ثبت شده یا دانش‌آموز بعداً تحویل داده) */
export async function revokeAssignmentPenalty(fd: FormData): Promise<ActionState> {
  return run(['TEACHER'], async (user) => {
    const [row] = await db.select({ st: assignmentStatus, a: assignments }).from(assignmentStatus).innerJoin(assignments, eq(assignments.id, assignmentStatus.assignmentId))
      .where(and(eq(assignmentStatus.assignmentId, String(fd.get('assignmentId'))), eq(assignmentStatus.studentId, String(fd.get('studentId'))))).limit(1);
    if (!row || !(await canGradeSubject(user, row.a.classId, row.a.subjectId))) return fail('دسترسی ندارید.');
    if (row.st.penaltyNoteId) await db.delete(studentNotes).where(eq(studentNotes.id, row.st.penaltyNoteId));
    await db.update(assignmentStatus).set({ penaltyNoteId: null, updatedAt: new Date() }).where(eq(assignmentStatus.id, row.st.id));
    await audit(user.id, 'ASSIGNMENT_PENALTY_REVOKE', 'student', row.st.studentId, row.a.title);
    revalidatePath('/assignments'); revalidatePath('/discipline'); revalidatePath(`/students/${row.st.studentId}`);
    return success('منفی لغو شد.');
  });
}

export async function createAnnouncement(_: ActionState, fd: FormData): Promise<ActionState> {
  return run([...STAFF], async (user) => {
    const p = z.object({ title: z.string().trim().min(2, 'عنوان را بنویسید.').max(150), body: z.string().trim().min(2, 'متن اطلاعیه را بنویسید.').max(2000), classId: z.string().optional() }).safeParse(Object.fromEntries(fd));
    if (!p.success) return fail(firstZodError(p.error));
    const classId = p.data.classId || null;
    const allowed = await visibleClassIds(user);
    if (classId ? !allowed.includes(classId) : !isManager(user.role)) return fail('معلم فقط می‌تواند برای کلاس‌های خودش اطلاعیه بگذارد.');
    const up = await readUploads(fd); if (!up.ok) return fail(up.error);
    const [an] = await db.insert(announcements).values({ title: p.data.title, body: p.data.body, classId, schoolId: schoolOf(user), authorId: user.id }).returning({ id: announcements.id });
    await saveAttachments('announcement', an.id, user.id, up.files);
    await audit(user.id, 'ANNOUNCEMENT_CREATE', 'announcement', undefined, p.data.title);
    revalidatePath('/announcements'); revalidatePath('/dashboard');
    return success('اطلاعیه منتشر شد.');
  });
}
export async function deleteAnnouncement(fd: FormData) {
  await run([...STAFF], async (user) => {
    const id = String(fd.get('id'));
    const [a] = await db.select().from(announcements).where(eq(announcements.id, id)).limit(1);
    if (a && a.schoolId === user.schoolId && (isManager(user.role) || a.authorId === user.id)) { await deleteAttachmentsOf('announcement', id); await db.delete(announcements).where(eq(announcements.id, id)); revalidatePath('/announcements'); revalidatePath('/dashboard'); }
    return success();
  });
}
