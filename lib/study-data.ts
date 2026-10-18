import 'server-only';
import { and, asc, desc, eq, gte, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { studyReportItems, studyReports, studyTests, subjects, users } from '@/db/schema';

export async function loadReports(opts: { studentIds: string[] | null; from?: string; limit?: number }) {
  const conds = [];
  if (opts.studentIds) { if (!opts.studentIds.length) return []; conds.push(inArray(studyReports.studentId, opts.studentIds)); }
  if (opts.from) conds.push(gte(studyReports.date, opts.from));
  const rows = await db.select({ r: studyReports, subjectName: subjects.name, firstName: users.firstName, lastName: users.lastName })
    .from(studyReports).innerJoin(subjects, eq(subjects.id, studyReports.subjectId)).innerJoin(users, eq(users.id, studyReports.studentId))
    .where(conds.length ? and(...conds) : undefined).orderBy(desc(studyReports.date), desc(studyReports.startTime)).limit(opts.limit ?? 400);
  if (!rows.length) return [];
  const ids = rows.map((x) => x.r.id);
  const [tests, items] = await Promise.all([
    db.select().from(studyTests).where(inArray(studyTests.reportId, ids)),
    db.select({ i: studyReportItems, subjectName: subjects.name }).from(studyReportItems).innerJoin(subjects, eq(subjects.id, studyReportItems.subjectId)).where(inArray(studyReportItems.reportId, ids)).orderBy(asc(studyReportItems.position)),
  ]);
  return rows.map((x) => {
    const myTests = tests.filter((t) => t.reportId === x.r.id);
    let its = items.filter((y) => y.i.reportId === x.r.id).map((y) => ({
      id: y.i.id, subjectId: y.i.subjectId, subjectName: y.subjectName, studyMin: y.i.studyMin, testMin: y.i.testMin, minutes: y.i.studyMin + y.i.testMin,
      topic: y.i.topic, methodList: JSON.parse(y.i.methods) as string[], pages: y.i.pages, mastery: y.i.mastery, goal: y.i.goal, goalAchieved: y.i.goalAchieved,
      tests: myTests.filter((t) => (t.subjectId ?? x.r.subjectId) === y.i.subjectId),
    }));
    // اگر به هر دلیل درسی ثبت نشده بود (داده‌ی خیلی قدیمی)، از ستون‌های خودِ گزارش یک درس می‌سازیم
    if (!its.length) its = [{ id: x.r.id, subjectId: x.r.subjectId, subjectName: x.subjectName, studyMin: x.r.durationMin, testMin: 0, minutes: x.r.durationMin, topic: x.r.topic, methodList: JSON.parse(x.r.methods) as string[], pages: x.r.pages, mastery: x.r.mastery, goal: x.r.goal, goalAchieved: x.r.goalAchieved, tests: myTests }];
    return { ...x.r, subjectName: x.subjectName, studentName: `${x.firstName} ${x.lastName}`, methodList: JSON.parse(x.r.methods) as string[], tests: myTests, items: its };
  });
}
export type LoadedReport = Awaited<ReturnType<typeof loadReports>>[number];

/** هر درسِ هر گزارش یک ردیف؛ برای آمار «سهم هر درس»، مشاور و … */
export function flattenItems(reports: LoadedReport[]) {
  return reports.flatMap((r) => r.items.map((i) => ({ date: r.date, startTime: r.startTime, endTime: r.endTime, durationMin: i.minutes, studyMin: i.studyMin, testMin: i.testMin, subjectId: i.subjectId, subjectName: i.subjectName, mastery: i.mastery, goalAchieved: i.goalAchieved, tests: i.tests })));
}
