import { addDays, weekStart } from './time';

export type ReportLite = { date: string; durationMin: number; subjectName: string; tests?: { totalCount: number; correctCount: number; wrongCount: number; percent: number }[] };

export function summarize(reports: ReportLite[], today: string) {
  const byDate = new Map<string, number>();
  for (const r of reports) byDate.set(r.date, (byDate.get(r.date) ?? 0) + r.durationMin);
  const ws = weekStart(today);
  const todayMin = byDate.get(today) ?? 0;
  let weekMin = 0; for (const [d, m] of byDate) if (d >= ws && d <= today) weekMin += m;
  // روزهای متوالیِ دارای مطالعه؛ اگر امروز هنوز گزارشی نیست از دیروز می‌شمارد
  let streak = 0; let cur = byDate.has(today) ? today : addDays(today, -1);
  while (byDate.has(cur)) { streak += 1; cur = addDays(cur, -1); }
  const last7 = Array.from({ length: 7 }, (_, i) => { const d = addDays(today, i - 6); return { date: d, min: byDate.get(d) ?? 0 }; });
  const sub = new Map<string, number>(); for (const r of reports) sub.set(r.subjectName, (sub.get(r.subjectName) ?? 0) + r.durationMin);
  const bySubject = [...sub.entries()].map(([name, min]) => ({ name, min })).sort((a, b) => b.min - a.min);
  const tests = reports.flatMap((r) => r.tests ?? []);
  const totalTests = tests.reduce((a, t) => a + t.totalCount, 0);
  const avgPercent = tests.length ? Math.round((tests.reduce((a, t) => a + t.percent * t.totalCount, 0) / Math.max(1, totalTests)) * 10) / 10 : null;
  return { todayMin, weekMin, streak, last7, bySubject, totalTests, avgPercent, totalMin: reports.reduce((a, r) => a + r.durationMin, 0), activeDays: byDate.size };
}
