/** محاسبه‌ی امتیاز انضباطی: هر «تشویق» +۱ و هر «انضباطی (منفی)» −۱؛ «یادداشت» ساده امتیازی ندارد */
export type NoteRow = { studentId: string; type: 'note' | 'praise' | 'discipline'; date: string };
export const noteScore = (t: NoteRow['type']) => (t === 'praise' ? 1 : t === 'discipline' ? -1 : 0);
const r2 = (n: number) => Math.round(n * 100) / 100;
type P = { from: string; to: string };

export function netByStudent(notes: NoteRow[], p: P): Map<string, number> {
  const m = new Map<string, number>();
  for (const n of notes) if (n.date >= p.from && n.date <= p.to) m.set(n.studentId, (m.get(n.studentId) ?? 0) + noteScore(n.type));
  return m;
}
/** رتبه‌ی رقابتی بر اساس امتیاز خالص؛ همه‌ی ids حساب می‌شوند (کسی که یادداشتی ندارد امتیازش صفر است) */
export function rankNet(net: Map<string, number>, ids: string[], me: string): { rank: number; of: number } | null {
  if (!ids.includes(me)) return null;
  const mine = net.get(me) ?? 0;
  return { rank: 1 + ids.filter((id) => (net.get(id) ?? 0) > mine).length, of: ids.length };
}
export type ClassDiscipline = { classId: string; name: string; gradeLevel: string; students: number; praise: number; violations: number; avgNet: number; rank: number };
/** رتبه‌ی کلاس‌ها از نظر انضباط: میانگین امتیاز خالص به‌ازای هر دانش‌آموز (تا کلاس‌های شلوغ‌تر ناعادلانه نبرند) */
export function classDiscipline(notes: NoteRow[], classes: { id: string; name: string; gradeLevel: string }[], studentsByClass: Map<string, string[]>, p: P): ClassDiscipline[] {
  const rows = classes.map((c) => {
    const ids = new Set(studentsByClass.get(c.id) ?? []);
    let praise = 0, violations = 0;
    for (const n of notes) if (ids.has(n.studentId) && n.date >= p.from && n.date <= p.to) { if (n.type === 'praise') praise++; else if (n.type === 'discipline') violations++; }
    return { classId: c.id, name: c.name, gradeLevel: c.gradeLevel, students: ids.size, praise, violations, avgNet: ids.size ? r2((praise - violations) / ids.size) : 0 };
  }).filter((x) => x.students > 0).sort((a, b) => b.avgNet - a.avgNet);
  return rows.map((x) => ({ ...x, rank: 1 + rows.filter((y) => y.avgNet > x.avgNet).length }));
}
