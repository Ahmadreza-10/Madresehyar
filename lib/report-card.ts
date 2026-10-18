/** محاسبه‌ی کارنامه: میانگین هر درس (در مقیاس ۲۰)، معدل کل، رتبه‌ی کلاسی */
export type GradeRow = { studentId: string; subjectId: string; subjectName: string; score: number; maxScore: number };

export const to20 = (score: number, max: number) => (max > 0 ? (score / max) * 20 : 0);
const r2 = (n: number) => Math.round(n * 100) / 100;

export function subjectAverages(rows: GradeRow[]) {
  const m = new Map<string, { name: string; sum: number; n: number }>();
  for (const g of rows) { const e = m.get(g.subjectId) ?? { name: g.subjectName, sum: 0, n: 0 }; e.sum += to20(g.score, g.maxScore); e.n += 1; m.set(g.subjectId, e); }
  return new Map([...m].map(([id, e]) => [id, { name: e.name, avg: r2(e.sum / e.n), count: e.n }]));
}
export function overall(avgs: Map<string, { avg: number }>): number | null {
  const v = [...avgs.values()].map((a) => a.avg);
  return v.length ? r2(v.reduce((a, b) => a + b, 0) / v.length) : null;
}
/** رتبه با روش «رقابتی»: هم‌نمره‌ها رتبه‌ی یکسان می‌گیرند */
export function classRank(allRows: GradeRow[], studentId: string, classStudentIds: string[]) {
  const totals = classStudentIds.map((id) => ({ id, o: overall(subjectAverages(allRows.filter((g) => g.studentId === id))) })).filter((x): x is { id: string; o: number } => x.o !== null);
  const me = totals.find((t) => t.id === studentId); if (!me) return null;
  return { rank: 1 + totals.filter((t) => t.o > me.o).length, of: totals.length, classAvg: r2(totals.reduce((a, t) => a + t.o, 0) / totals.length) };
}
export function classSubjectAverages(allRows: GradeRow[]) { return subjectAverages(allRows); }

import { jalaliMonthLength, jalaliToIso, isoToJalaliParts, JALALI_MONTHS } from './jalali';

export type DatedGrade = GradeRow & { date: string };
export type Ranked = { studentId: string; avg: number; rank: number };

/** معدل کل هر دانش‌آموز + رتبه‌ی «رقابتی» (هم‌معدل‌ها رتبه‌ی یکسان). دانش‌آموزِ بدون نمره رتبه نمی‌گیرد. */
export function rankAll(rows: GradeRow[], studentIds: string[]): Ranked[] {
  const by = new Map<string, GradeRow[]>(); for (const g of rows) { const a = by.get(g.studentId); if (a) a.push(g); else by.set(g.studentId, [g]); }
  const list = studentIds.flatMap((id) => { const o = by.has(id) ? overall(subjectAverages(by.get(id)!)) : null; return o === null ? [] : [{ studentId: id, avg: o }]; }).sort((a, b) => b.avg - a.avg);
  return list.map((x) => ({ ...x, rank: 1 + list.filter((y) => y.avg > x.avg).length }));
}
export const meanOf = (r: Ranked[]) => (r.length ? Math.round((r.reduce((a, x) => a + x.avg, 0) / r.length) * 100) / 100 : null);

export type Period = { key: string; label: string; from: string; to: string };
/** سال شروعِ سال تحصیلی (مثلاً «۱۴۰۵-۱۴۰۶» ← ۱۴۰۵)؛ اگر خوانده نشد، از تاریخ امروز (مهر = شروع) */
export function academicStartYear(label: string | null | undefined, todayIso: string): number {
  const m = (label ?? '').replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).match(/\d{4}/);
  if (m) return Number(m[0]);
  const j = isoToJalaliParts(todayIso); return j.m >= 7 ? j.y : j.y - 1;
}
const ORDER = [7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6];
export function monthPeriods(startYear: number): Period[] {
  return ORDER.map((m) => { const y = m >= 7 ? startYear : startYear + 1; return { key: `${y}-${String(m).padStart(2, '0')}`, label: JALALI_MONTHS[m - 1], from: jalaliToIso(y, m, 1), to: jalaliToIso(y, m, jalaliMonthLength(y, m)) }; });
}
export function yearPeriod(startYear: number): Period { return { key: 'year', label: 'کل سال', from: jalaliToIso(startYear, 7, 1), to: jalaliToIso(startYear + 1, 6, jalaliMonthLength(startYear + 1, 6)) }; }

/** رتبه‌ها و میانگین‌های یک بازه برای یک دانش‌آموز در کلاس و در پایه */
export function periodResult(rows: DatedGrade[], p: { from: string; to: string }, classIds: string[], gradeIds: string[], me: string, schoolIds: string[] = []) {
  const r = rows.filter((g) => g.date >= p.from && g.date <= p.to);
  const cls = rankAll(r, classIds); const grd = rankAll(r, gradeIds); const sch = rankAll(r, schoolIds);
  return { cls, grd, sch, classAvg: meanOf(cls), gradeAvg: meanOf(grd), schoolAvg: meanOf(sch), myClass: cls.find((x) => x.studentId === me) ?? null, myGrade: grd.find((x) => x.studentId === me) ?? null, mySchool: sch.find((x) => x.studentId === me) ?? null };
}
export const gradeLabel = (v: number) => (v >= 17 ? 'عالی' : v >= 15 ? 'خیلی خوب' : v >= 12 ? 'خوب' : v >= 10 ? 'قابل قبول' : 'نیاز به تلاش بیشتر');

export type SubjectRank = { subjectId: string; name: string; avg: number; count: number; classRank: number | null; classN: number; classAvg: number | null; gradeRank: number | null; gradeN: number; gradeAvg: number | null };
/** رتبه‌ی دانش‌آموز در «هر درس» به‌تفکیک کلاس و پایه (میانگین نمره‌های همان درس در بازه‌ی انتخاب‌شده) */
export function subjectRanks(rows: GradeRow[], classIds: string[], gradeIds: string[], me: string): SubjectRank[] {
  const inClass = new Set(classIds), inGrade = new Set(gradeIds);
  const acc = new Map<string, { name: string; per: Map<string, { sum: number; n: number }> }>();
  for (const g of rows) {
    if (!inGrade.has(g.studentId) && !inClass.has(g.studentId) && g.studentId !== me) continue;
    const e = acc.get(g.subjectId) ?? { name: g.subjectName, per: new Map() };
    const p = e.per.get(g.studentId) ?? { sum: 0, n: 0 }; p.sum += to20(g.score, g.maxScore); p.n += 1; e.per.set(g.studentId, p); acc.set(g.subjectId, e);
  }
  const rank = (avgs: { id: string; avg: number }[], id: string) => { const mine = avgs.find((x) => x.id === id); return mine ? 1 + avgs.filter((x) => x.avg > mine.avg).length : null; };
  const mean = (a: { avg: number }[]) => (a.length ? r2(a.reduce((t, x) => t + x.avg, 0) / a.length) : null);
  const out: SubjectRank[] = [];
  for (const [subjectId, e] of acc) {
    const mineP = e.per.get(me); if (!mineP) continue;
    const all = [...e.per].map(([id, p]) => ({ id, avg: r2(p.sum / p.n) }));
    const cls = all.filter((x) => inClass.has(x.id)); const grd = all.filter((x) => inGrade.has(x.id));
    out.push({ subjectId, name: e.name, avg: r2(mineP.sum / mineP.n), count: mineP.n, classRank: rank(cls, me), classN: cls.length, classAvg: mean(cls), gradeRank: rank(grd, me), gradeN: grd.length, gradeAvg: mean(grd) });
  }
  return out.sort((a, b) => b.avg - a.avg);
}
