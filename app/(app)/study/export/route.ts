import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { classes, users } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { isManager, visibleStudentIds } from '@/lib/permissions';
import { loadReports } from '@/lib/study-data';
import { buildStudyWorkbook, jalaliSortable } from '@/lib/study-export';
import { addDays, todayTehran } from '@/lib/time';

/** خروجی اکسل (.xlsx) از گزارش‌های مطالعه؛ فقط مدیر/معاون/معلم، فقط در محدوده‌ی دسترسی. هر درس یک ردیف و یک برگه‌ی خلاصه‌ی دانش‌آموزان. */
export async function GET(req: Request) {
  const u = await getCurrentUser();
  if (!u || !u.schoolId || !isManager(u.role)) return new Response('forbidden', { status: 403 });
  const url = new URL(req.url); const range = url.searchParams.get('range'); const student = url.searchParams.get('student'); const classId = url.searchParams.get('class');
  const scope = await visibleStudentIds(u);
  let ids = student ? (scope.includes(student) ? [student] : []) : scope;
  if (classId && !student && ids.length) ids = (await db.select({ id: users.id }).from(users).where(and(eq(users.classId, classId), inArray(users.id, ids)))).map((r) => r.id); // فقط دانش‌آموزان همان کلاس
  const today = todayTehran();
  const from = range === 'all' ? undefined : addDays(today, range === '7' ? -6 : -29);
  const reports = await loadReports({ studentIds: ids, from, limit: 5000 });
  const rows = ids.length ? await db.select({ id: users.id, cls: classes.name }).from(users).leftJoin(classes, eq(classes.id, users.classId)).where(inArray(users.id, ids)) : [];
  const clsMap = new Map(rows.map((r) => [r.id, r.cls ?? '']));
  const buf = await buildStudyWorkbook(reports, (id) => clsMap.get(id) ?? '');
  const name = `study-reports-${jalaliSortable(today).replace(/\//g, '-')}.xlsx`;
  return new Response(new Uint8Array(buf), { headers: { 'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'content-disposition': `attachment; filename="${name}"`, 'cache-control': 'no-store' } });
}
