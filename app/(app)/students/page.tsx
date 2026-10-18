import Link from 'next/link';
import { asc, eq, inArray, count } from 'drizzle-orm';
import { db } from '@/db';
import { attendance, classes, users } from '@/db/schema';
import { requireSchoolUser } from '@/lib/auth';
import { isManager, focusStudentIds } from '@/lib/permissions';
import { classesFor } from '@/lib/school-data';
import { UserAvatar } from '@/components/UserAvatar';
import { loadReports } from '@/lib/study-data';
import { todayTehran, weekStart } from '@/lib/time';
import { fa, formatDuration, fullName } from '@/lib/format';
import { Badge, Card, Empty, PageHead } from '@/components/ui';

export const metadata = { title: 'دانش‌آموزان' };

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ q?: string; class?: string }> }) {
  const u = await requireSchoolUser(['PRINCIPAL', 'VICE', 'TEACHER']); const sp = await searchParams;
  const scope = await focusStudentIds(u); const today = todayTehran();
  const rows = !scope.length ? [] : await db.select({ s: users, className: classes.name }).from(users).leftJoin(classes, eq(classes.id, users.classId))
    .where(inArray(users.id, scope)).orderBy(asc(users.lastName));
  const classOpts = await classesFor(u); const chosen = classOpts.find((c) => c.id === sp.class);
  const q = (sp.q ?? '').trim();
  const list = rows.filter((r) => (!chosen || r.s.classId === chosen.id) && (!q || fullName(r.s).includes(q) || r.s.username.includes(q.toLowerCase())));
  const showStudy = isManager(u.role); // معلم مجموع مطالعه‌ی دانش‌آموز را نمی‌بیند (فقط درس خودش در صفحه‌ی «گزارش مطالعه»)
  const reports = showStudy ? await loadReports({ studentIds: scope, from: weekStart(today), limit: 1000 }) : [];
  const weekMin = new Map<string, number>(); for (const r of reports) weekMin.set(r.studentId, (weekMin.get(r.studentId) ?? 0) + r.durationMin);
  const abs = rows.length ? await db.select({ id: attendance.studentId, n: count() }).from(attendance).where(inArray(attendance.studentId, rows.map((r) => r.s.id))).groupBy(attendance.studentId) : [];
  const absMap = new Map(abs.map((a) => [a.id, a.n]));
  return (
    <>
      <PageHead illus="students" title="دانش‌آموزان" sub={chosen ? `${fa(list.length)} دانش‌آموز در کلاس ${chosen.name}` : `${fa(rows.length)} دانش‌آموز در محدوده‌ی شما`}>
        <form className="row stu-filter" action="/students" style={{ flexWrap: 'wrap' }}>
          <select name="class" defaultValue={chosen?.id ?? ''} style={{ width: 200 }}><option value="">همه‌ی کلاس‌ها</option>{classOpts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <input name="q" defaultValue={q} placeholder="جستجوی نام…" style={{ width: 200 }} /><button className="btn ghost sm">اعمال فیلتر</button>{(chosen || q) && <a className="btn ghost sm" href="/students">پاک کردن</a>}
        </form>
      </PageHead>
      {list.length === 0 ? <Card><Empty text="دانش‌آموزی پیدا نشد." icon="users" /></Card> : (
        <div className="table-wrap stu-table"><table><thead><tr><th>دانش‌آموز</th><th>کلاس</th>{showStudy && <th>مطالعه‌ی این هفته</th>}<th>غیبت/تأخیر</th><th /></tr></thead><tbody>
          {list.map(({ s, className }) => (<tr key={s.id}>
            <td><div className="row"><UserAvatar user={s} size={40} /><div><b>{fullName(s)}</b><div className="muted small">{s.username}</div></div></div></td>
            <td>{className ?? '—'}</td>
            {showStudy && <td className="num">{weekMin.get(s.id) ? <Badge tone="primary">{formatDuration(weekMin.get(s.id)!)}</Badge> : <Badge>بدون گزارش</Badge>}</td>}
            <td className="num">{fa(absMap.get(s.id) ?? 0)}</td>
            <td><Link className="btn ghost sm" href={`/students/${s.id}`}>پروفایل</Link></td></tr>))}
        </tbody></table></div>)}
      {list.length > 0 && <div className="stu-list">{list.map(({ s, className }) => (
        <Link key={s.id} href={`/students/${s.id}`} className="stu-row">
          <UserAvatar user={s} size={42} />
          <div className="stu-main"><b>{fullName(s)}</b><div className="muted small">{className ?? '—'} • {s.username}</div>
            <div className="stu-chips">{showStudy && (weekMin.get(s.id) ? <Badge tone="primary">📖 {formatDuration(weekMin.get(s.id)!)}</Badge> : <Badge>بدون گزارش</Badge>)}{(absMap.get(s.id) ?? 0) > 0 && <Badge tone="warn">غیبت/تأخیر {fa(absMap.get(s.id) ?? 0)}</Badge>}</div></div>
          <span className="stu-go" aria-hidden="true">‹</span></Link>))}</div>}
    </>
  );
}
