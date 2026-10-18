import { getCurrentUser } from '@/lib/auth';
import { isManager, visibleStudentIds } from '@/lib/permissions';
import { loadReports } from '@/lib/study-data';
import { methodLabels } from '@/lib/study';
import { formatJalaliShort } from '@/lib/format';
import { addDays, todayTehran } from '@/lib/time';

const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

/** خروجی CSV (قابل باز شدن در اکسل) از گزارش‌های مطالعه؛ فقط معلم/مدیر، فقط در محدوده‌ی دسترسی */
export async function GET(req: Request) {
  const u = await getCurrentUser();
  if (!u || !u.schoolId || !isManager(u.role)) return new Response('forbidden', { status: 403 });
  const url = new URL(req.url); const range = url.searchParams.get('range'); const student = url.searchParams.get('student');
  const scope = await visibleStudentIds(u);
  const ids = student ? (scope.includes(student) ? [student] : []) : scope;
  const from = range === 'all' ? undefined : addDays(todayTehran(), range === '7' ? -6 : -29);
  const reports = await loadReports({ studentIds: ids, from, limit: 5000 });
  const head = ['دانش‌آموز', 'تاریخ', 'شروع', 'پایان', 'مدت کل (دقیقه)', 'درس', 'دقیقه‌ی مطالعه', 'دقیقه‌ی تست', 'مبحث', 'شیوه‌ها', 'صفحه', 'تسلط', 'منبع تست', 'کل تست', 'صحیح', 'غلط', 'نزده', 'درصد'];
  const lines = [head.map(esc).join(',')];
  for (const r of reports) for (const i of r.items) {
    const base = [r.studentName, formatJalaliShort(r.date), r.startTime, r.endTime, r.durationMin, i.subjectName, i.studyMin, i.testMin, i.topic, i.methodList.map((m) => methodLabels[m as keyof typeof methodLabels] ?? m).join(' + '), i.pages, i.mastery];
    if (!i.tests.length) lines.push([...base, '', '', '', '', '', ''].map(esc).join(','));
    for (const t of i.tests) lines.push([...base, t.source, t.totalCount, t.correctCount, t.wrongCount, t.blankCount, t.percent].map(esc).join(','));
  }
  return new Response('\uFEFF' + lines.join('\r\n'), { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="study-reports.csv"', 'cache-control': 'no-store' } });
}
