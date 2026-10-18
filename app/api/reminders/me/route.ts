import { and, count, desc, eq, inArray, isNull, or } from 'drizzle-orm';
import { db } from '@/db';
import { announcements, assignments, assignmentStatus, classes, classSubjects, messages, scheduleSlots, subjects } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { visibleClassIds } from '@/lib/permissions';
import { iranWeekday } from '@/lib/teacher-schedule';
import { addDays, minutesNowTehran, todayTehran } from '@/lib/time';

/** داده‌ی یادآورهای «همین کاربر» (دانش‌آموز، معلم، ولی…) برای صفحه‌ی باز: زنگ‌های امروز، تکالیفِ فردا، پیام‌ها و اطلاعیه‌ها.
 *  همه‌ی تصمیم‌ها (ساعت سکوت، ۱۰ دقیقه مانده، عصرِ روز قبل) سمت مرورگر و بر اساس ترجیحات خودِ کاربر گرفته می‌شود. */
export async function GET() {
  const u = await getCurrentUser();
  if (!u || !u.schoolId) return Response.json({ ok: false }, { status: 401 });
  const today = todayTehran(); const weekday = iranWeekday(today);
  let slots: { start: string; end: string; subject: string; className: string; room: string | null }[] = [];
  const base = db.select({ start: scheduleSlots.startTime, end: scheduleSlots.endTime, subject: subjects.name, className: classes.name, room: scheduleSlots.room }).from(scheduleSlots)
    .innerJoin(subjects, eq(subjects.id, scheduleSlots.subjectId)).innerJoin(classes, eq(classes.id, scheduleSlots.classId));
  if (u.role === 'STUDENT' && u.classId) slots = await base.where(and(eq(scheduleSlots.classId, u.classId), eq(scheduleSlots.weekday, weekday))) as never;
  else if (u.role === 'TEACHER') slots = await base.innerJoin(classSubjects, and(eq(classSubjects.classId, scheduleSlots.classId), eq(classSubjects.subjectId, scheduleSlots.subjectId))).where(and(eq(classSubjects.teacherId, u.id), eq(scheduleSlots.weekday, weekday))) as never;
  slots = slots.filter((s) => s.start);

  let due: { id: string; title: string; subject: string; dueDate: string; dueTime: string | null }[] = [];
  if (u.role === 'STUDENT' && u.classId) {
    const rows = await db.select({ id: assignments.id, title: assignments.title, subject: subjects.name, dueDate: assignments.dueDate, dueTime: assignments.dueTime }).from(assignments).innerJoin(subjects, eq(subjects.id, assignments.subjectId))
      .where(and(eq(assignments.classId, u.classId), inArray(assignments.dueDate, [today, addDays(today, 1)])));
    const done = rows.length ? await db.select({ a: assignmentStatus.assignmentId, d: assignmentStatus.doneDate }).from(assignmentStatus).where(and(eq(assignmentStatus.studentId, u.id), inArray(assignmentStatus.assignmentId, rows.map((r) => r.id)))) : [];
    const finished = new Set(done.filter((x) => x.d).map((x) => x.a));
    due = rows.filter((r) => r.dueDate && !finished.has(r.id)).map((r) => ({ ...r, dueDate: r.dueDate! }));
  }
  const [{ unread }] = await db.select({ unread: count() }).from(messages).where(and(eq(messages.recipientId, u.id), isNull(messages.readAt)));
  const vis = await visibleClassIds(u);
  const [ann] = await db.select({ id: announcements.id, title: announcements.title }).from(announcements)
    .where(and(eq(announcements.schoolId, u.schoolId), vis.length ? or(isNull(announcements.classId), inArray(announcements.classId, vis)) : isNull(announcements.classId))).orderBy(desc(announcements.createdAt)).limit(1);
  return Response.json({ ok: true, today, nowMin: minutesNowTehran(), slots, due, unread, announcement: ann ?? null }, { headers: { 'cache-control': 'no-store' } });
}
