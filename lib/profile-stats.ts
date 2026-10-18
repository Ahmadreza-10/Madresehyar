import 'server-only';
import { and, count, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { assignments, assignmentStatus, attendance, classes, classSubjects, messages, parentStudents, scheduleSlots, studentNotes, users } from '@/db/schema';
import type { CurrentUser } from './auth';
import { dueInfo } from './assignment-calc';
import { fa } from './format';
import { minutesNowTehran, todayTehran } from './time';

export type ProfileStat = { label: string; value: string; hint?: string; icon: 'school' | 'assign' | 'note' | 'check' | 'users' | 'calendar' | 'mail' | 'study'; tone: 'primary' | 'accent' | 'warn' | 'ok' | 'danger' };

/** آمار کوتاه و مفیدِ بالای صفحه‌ی «حساب من»، متناسب با نقش */
export async function profileStats(u: CurrentUser): Promise<{ stats: ProfileStat[]; subtitle: string[] }> {
  const school = u.schoolId;
  if (u.role === 'STUDENT') {
    const [cls] = u.classId ? await db.select({ name: classes.name }).from(classes).where(eq(classes.id, u.classId)).limit(1) : [];
    const asg = u.classId ? await db.select({ id: assignments.id, dueDate: assignments.dueDate, dueTime: assignments.dueTime }).from(assignments).where(eq(assignments.classId, u.classId)) : [];
    const st = asg.length ? await db.select().from(assignmentStatus).where(and(eq(assignmentStatus.studentId, u.id), inArray(assignmentStatus.assignmentId, asg.map((a) => a.id)))) : [];
    const handled = new Set(st.filter((x) => x.doneDate || x.penaltyNoteId).map((x) => x.assignmentId));
    const today = todayTehran(); const now = minutesNowTehran();
    const open = asg.filter((a) => !handled.has(a.id) && (!a.dueDate || !dueInfo(a.dueDate, a.dueTime, today, now).over)).length;
    const notes = await db.select({ t: studentNotes.type }).from(studentNotes).where(eq(studentNotes.studentId, u.id));
    const net = notes.filter((n) => n.t === 'praise').length - notes.filter((n) => n.t === 'discipline').length;
    const [{ abs }] = await db.select({ abs: count() }).from(attendance).where(eq(attendance.studentId, u.id));
    return { subtitle: cls ? [cls.name] : [], stats: [
      { label: 'کلاس', value: cls?.name ?? '—', icon: 'school', tone: 'primary' },
      { label: 'تکلیف باز', value: fa(open), hint: open ? 'هنوز تیک نخورده' : 'همه‌ی تکالیف تمام است 🎉', icon: 'assign', tone: open ? 'warn' : 'ok' },
      { label: 'امتیاز انضباطی', value: net > 0 ? `+${fa(net)}` : fa(net), hint: 'تشویق منهای منفی', icon: 'note', tone: net >= 0 ? 'ok' : 'danger' },
      { label: 'غیبت و تأخیر', value: fa(abs), icon: 'check', tone: abs ? 'warn' : 'ok' },
    ] };
  }
  if (u.role === 'TEACHER') {
    const cs = await db.select({ classId: classSubjects.classId, subjectId: classSubjects.subjectId }).from(classSubjects).where(eq(classSubjects.teacherId, u.id));
    const classIds = [...new Set(cs.map((x) => x.classId))];
    let periods = 0;
    if (classIds.length) { const sl = await db.select({ c: scheduleSlots.classId, s: scheduleSlots.subjectId }).from(scheduleSlots).where(inArray(scheduleSlots.classId, classIds)); periods = sl.filter((x) => cs.some((y) => y.classId === x.c && y.subjectId === x.s)).length; }
    return { subtitle: [`${fa(classIds.length)} کلاس`], stats: [
      { label: 'کلاس‌های من', value: fa(classIds.length), icon: 'school', tone: 'primary' },
      { label: 'درس‌های من', value: fa(cs.length), icon: 'study', tone: 'accent' },
      { label: 'زنگ در هفته', value: fa(periods), icon: 'calendar', tone: 'ok' },
    ] };
  }
  if (u.role === 'PARENT') {
    const kids = await db.select({ f: users.firstName, l: users.lastName }).from(parentStudents).innerJoin(users, eq(users.id, parentStudents.studentId)).where(eq(parentStudents.parentId, u.id));
    const [{ n }] = await db.select({ n: count() }).from(messages).where(and(eq(messages.recipientId, u.id), isNull(messages.readAt)));
    return { subtitle: kids.map((k) => `ولیِ ${k.f} ${k.l}`), stats: [
      { label: 'فرزندان', value: fa(kids.length), hint: kids.map((k) => k.f).join('، ') || 'هنوز پیوندی ثبت نشده', icon: 'users', tone: kids.length ? 'primary' : 'warn' },
      { label: 'پیام خوانده‌نشده', value: fa(n), icon: 'mail', tone: n ? 'warn' : 'ok' },
    ] };
  }
  if ((u.role === 'PRINCIPAL' || u.role === 'VICE') && school) {
    const c = async (role: 'STUDENT' | 'TEACHER' | 'PARENT') => (await db.select({ n: count() }).from(users).where(and(eq(users.schoolId, school), eq(users.role, role))))[0].n;
    const [{ k }] = await db.select({ k: count() }).from(classes).where(eq(classes.schoolId, school));
    return { subtitle: [], stats: [
      { label: 'دانش‌آموزان', value: fa(await c('STUDENT')), icon: 'users', tone: 'primary' },
      { label: 'معلمان', value: fa(await c('TEACHER')), icon: 'study', tone: 'accent' },
      { label: 'کلاس‌ها', value: fa(k), icon: 'school', tone: 'ok' },
    ] };
  }
  return { subtitle: [], stats: [] };
}

/** تعداد فرزندانِ پیوندخورده‌ی یک ولی */
export async function parentStudentsCount(parentId: string): Promise<number> {
  const [{ n }] = await db.select({ n: count() }).from(parentStudents).where(eq(parentStudents.parentId, parentId)); return n;
}
