import Link from 'next/link';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { classes, users } from '@/db/schema';
import { requireSchoolUser } from '@/lib/auth';
import { isManager, focusStudentIds, roleTitle, schoolOf } from '@/lib/permissions';
import { classesFor } from '@/lib/school-data';
import { cleanQuery, matchesQuery } from '@/lib/search';
import { UserAvatar } from '@/components/UserAvatar';
import { fa, fullName } from '@/lib/format';
import { Card, Empty, PageHead } from '@/components/ui';

export const metadata = { title: 'جستجو' };

/** جستجوی سریع برای مدیر، معاون و معلم؛ فقط داخل محدوده‌ی دسترسی همان کاربر (مدرسه‌ی خودش) */
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const u = await requireSchoolUser(['PRINCIPAL', 'VICE', 'TEACHER']);
  const q = cleanQuery((await searchParams).q);
  let students: { s: typeof users.$inferSelect; className: string | null }[] = []; let people: (typeof users.$inferSelect)[] = []; let cls: { id: string; name: string }[] = [];
  if (q) {
    const scope = await focusStudentIds(u);
    const rows = scope.length ? await db.select({ s: users, className: classes.name }).from(users).leftJoin(classes, eq(classes.id, users.classId)).where(inArray(users.id, scope)).orderBy(asc(users.lastName)) : [];
    students = rows.filter((r) => matchesQuery(`${fullName(r.s)} ${r.s.username} ${r.className ?? ''}`, q)).slice(0, 30);
    cls = (await classesFor(u)).filter((c) => matchesQuery(c.name, q)).slice(0, 10);
    if (isManager(u.role)) { // مدیر و معاون: معلم‌ها و اولیای مدرسه‌ی خودشان
      const rest = await db.select().from(users).where(and(eq(users.schoolId, schoolOf(u)), inArray(users.role, ['TEACHER', 'PARENT', 'VICE', 'PRINCIPAL']))).orderBy(asc(users.lastName));
      people = rest.filter((p) => matchesQuery(`${fullName(p)} ${p.username}`, q)).slice(0, 30);
    }
  }
  const total = students.length + people.length + cls.length;
  return (
    <>
      <PageHead illus="students" title="جستجو" sub="نام دانش‌آموز، کلاس یا (برای مدیر) معلم و ولی را بنویسید">
        <form className="row" action="/search" role="search" style={{ flexWrap: 'wrap' }}>
          <input name="q" defaultValue={q} placeholder="مثلاً: رضایی یا ۹الف" aria-label="عبارت جستجو" maxLength={60} autoFocus style={{ width: 240 }} /><button className="btn sm">جستجو</button>
        </form>
      </PageHead>
      {!q ? <Card><Empty text="چیزی بنویسید و جستجو را بزنید." icon="users" /></Card> : total === 0 ? <Card><Empty text="موردی پیدا نشد. املای دیگری را امتحان کنید." icon="users" /></Card> : (
        <>
          {students.length > 0 && <Card title={`دانش‌آموزان (${fa(students.length)})`}><div className="srch-list">{students.map(({ s, className }) => (
            <Link key={s.id} href={`/students/${s.id}`} className="stu-row"><UserAvatar user={s} size={42} /><div className="stu-main"><b>{fullName(s)}</b><div className="muted small">{className ?? '—'} • {s.username}</div></div><span className="stu-go" aria-hidden="true">‹</span></Link>))}</div></Card>}
          {cls.length > 0 && <Card title={`کلاس‌ها (${fa(cls.length)})`}><div className="chips">{cls.map((c) => <Link key={c.id} className="btn ghost sm" href={`/students?class=${c.id}`}>{c.name}</Link>)}</div></Card>}
          {people.length > 0 && <Card title={`کادر و اولیا (${fa(people.length)})`}><div className="srch-list">{people.map((p) => (
            <div key={p.id} className="stu-row"><UserAvatar user={p} size={42} /><div className="stu-main"><b>{fullName(p)}</b><div className="muted small">{roleTitle(p)} • {p.username}</div></div></div>))}</div></Card>}
        </>)}
    </>
  );
}
