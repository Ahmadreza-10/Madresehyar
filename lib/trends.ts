import { academicStartYear, meanOf, monthPeriods, rankAll, yearPeriod, type DatedGrade, type Period } from './report-card';
import { netByStudent, type NoteRow } from './discipline-calc';

export type SchoolData = {
  classes: { id: string; name: string; gradeLevel: string; academicYear: string }[];
  students: { id: string; firstName: string; lastName: string; classId: string | null }[];
  rows: DatedGrade[]; notes: NoteRow[]; today: string; startYear: number; months: Period[]; year: Period;
};
export const buildPeriods = (label: string | undefined, today: string) => { const startYear = academicStartYear(label, today); return { startYear, months: monthPeriods(startYear), year: yearPeriod(startYear) }; };
const within = (rows: DatedGrade[], p: { from: string; to: string }) => rows.filter((g) => g.date >= p.from && g.date <= p.to);
const idsOf = (d: SchoolData, f: (s: SchoolData['students'][number]) => boolean) => d.students.filter(f).map((s) => s.id);

/** رتبه‌بندی کلاس‌های یک پایه بر اساس «میانگین معدل کل دانش‌آموزان کلاس» در یک بازه */
export function classGpaRanking(d: SchoolData, gradeLevel: string, p: { from: string; to: string }) {
  const inP = within(d.rows, p);
  const list = d.classes.filter((c) => c.gradeLevel === gradeLevel).map((c) => { const r = rankAll(inP, idsOf(d, (s) => s.classId === c.id)); return { classId: c.id, name: c.name, avg: meanOf(r), n: r.length }; })
    .filter((x): x is { classId: string; name: string; avg: number; n: number } => x.avg !== null).sort((a, b) => b.avg - a.avg);
  return list.map((x) => ({ ...x, rank: 1 + list.filter((y) => y.avg > x.avg).length }));
}
const monthsSoFar = (d: SchoolData) => d.months.filter((m) => m.from <= d.today);

/** روند ماهانه‌ی معدل: دانش‌آموز (اختیاری) در برابر میانگین کلاس و میانگین پایه */
export function gpaTrend(d: SchoolData, o: { studentId?: string; classId: string; gradeLevel: string }) {
  const ms = monthsSoFar(d);
  const classIds = idsOf(d, (s) => s.classId === o.classId);
  const gradeClassIds = new Set(d.classes.filter((c) => c.gradeLevel === o.gradeLevel).map((c) => c.id));
  const gradeIds = idsOf(d, (s) => !!s.classId && gradeClassIds.has(s.classId));
  const cols = ms.map((m) => { const r = within(d.rows, m); return { mine: o.studentId ? rankAll(r, [o.studentId])[0]?.avg ?? null : null, classAvg: meanOf(rankAll(r, classIds)), gradeAvg: meanOf(rankAll(r, gradeIds)) }; });
  return { labels: ms.map((m) => m.label), mine: cols.map((c) => c.mine), classAvg: cols.map((c) => c.classAvg), gradeAvg: cols.map((c) => c.gradeAvg) };
}
/** روند ماهانه‌ی امتیاز انضباطی (تشویق − منفی): دانش‌آموز در برابر میانگین هر نفر در کلاس */
export function disciplineTrend(d: SchoolData, o: { studentId?: string; classId: string }) {
  const ms = monthsSoFar(d); const classIds = idsOf(d, (s) => s.classId === o.classId);
  const cols = ms.map((m) => { const net = netByStudent(d.notes, m); return { mine: o.studentId ? net.get(o.studentId) ?? 0 : null, classAvg: classIds.length ? Math.round((classIds.reduce((a, id) => a + (net.get(id) ?? 0), 0) / classIds.length) * 100) / 100 : null }; });
  return { labels: ms.map((m) => m.label), mine: cols.map((c) => c.mine), classAvg: cols.map((c) => c.classAvg) };
}
