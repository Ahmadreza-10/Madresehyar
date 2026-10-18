import 'server-only';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { classes, grades, studentNotes, subjects, users } from '@/db/schema';
import type { DatedGrade } from './report-card';
import type { NoteRow } from './discipline-calc';
import { buildPeriods, type SchoolData } from './trends';
import { todayTehran } from './time';

/** همه‌ی داده‌ی لازم برای رتبه‌بندی و نمودارها، فقط برای «یک مدرسه» */
export async function loadSchoolData(schoolId: string, academicYear?: string): Promise<SchoolData> {
  const cls = await db.select().from(classes).where(eq(classes.schoolId, schoolId));
  const students = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName, classId: users.classId }).from(users).where(and(eq(users.role, 'STUDENT'), eq(users.schoolId, schoolId)));
  const rows: DatedGrade[] = await db.select({ studentId: grades.studentId, subjectId: grades.subjectId, subjectName: subjects.name, score: grades.score, maxScore: grades.maxScore, date: grades.date })
    .from(grades).innerJoin(subjects, eq(subjects.id, grades.subjectId)).innerJoin(users, eq(users.id, grades.studentId)).where(eq(users.schoolId, schoolId));
  const notes: NoteRow[] = await db.select({ studentId: studentNotes.studentId, type: studentNotes.type, date: studentNotes.date }).from(studentNotes).innerJoin(users, eq(users.id, studentNotes.studentId)).where(eq(users.schoolId, schoolId));
  const today = todayTehran();
  return { classes: cls, students, rows, notes, today, ...buildPeriods(academicYear ?? cls[0]?.academicYear, today) };
}
