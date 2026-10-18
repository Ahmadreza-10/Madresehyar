import Link from 'next/link';
import { and, desc, eq, gte, inArray, isNull, or, count } from 'drizzle-orm';
import { db } from '@/db';
import { announcements, assignments, attendance, classes, grades, messages, schools, subjects, users } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { isManager, isStaff, roleTitle, focusClassIds, focusStudentIds } from '@/lib/permissions';
import { getSchool, getStudyWindow } from '@/lib/settings';
import { flattenItems, loadReports } from '@/lib/study-data';
import { summarize } from '@/lib/study-stats';
import { addDays, minutesNowTehran, todayTehran } from '@/lib/time';
import { fa, formatDuration, formatJalali } from '@/lib/format';
import { Badge, Card, Empty, Tile } from '@/components/ui';
import { Mascot, type IllusName } from '@/components/Illus';
import { UserAvatar } from '@/components/UserAvatar';
import { activeSlot } from '@/lib/reminder-calc';
import { pendingChildren } from '@/lib/reminders';
import { Tabs } from '@/components/Interactive';
import { WeekChart } from '@/components/StudyCharts';

export const metadata = { title: 'صفحه‌ی اصلی' };
type T = { href: string; illus: IllusName; label: string; badge?: number };

export default async function Dashboard() {
  const u = await requireUser();
  const today = todayTehran();
  const [{ unread }] = await db.select({ unread: count() }).from(messages).where(and(eq(messages.recipientId, u.id), isNull(messages.readAt)));
  const hero = (chips: React.ReactNode, sub: string) => (
    <section className="hero">
      <UserAvatar user={u} size={88} className="hero-avatar" />
      <div><h1>سلام {u.firstName} 👋</h1><p>{sub}</p><div className="hero-chips">{unread > 0 && <Link href="/messages" className="hero-chip">✉️ {fa(unread)} پیام جدید</Link>}{chips}</div></div>
      <Mascot size={118} />
    </section>
  );
  const gentle = u.role === 'PARENT' && u.schoolId ? await (async () => { const w0 = await getStudyWindow(u.schoolId!); const kids = await pendingChildren(u.id, today); return !activeSlot(minutesNowTehran(), w0.startMin, w0.endMin) && minutesNowTehran() >= w0.startMin && minutesNowTehran() < w0.endMin ? kids : []; })() : [];
  const tiles = (list: T[], title?: string, start = 0) => (<>{title && <h2 className="section-title">{title}</h2>}<div className="tiles">{list.map((t, i) => <Tile key={t.href} i={start + i} {...t} badge={t.href === '/messages' ? unread : t.badge} />)}</div></>);

  // مدیرکل سامانه: فقط نمای کلیِ مدارس؛ داده‌ی درون مدرسه‌ها را نمی‌بیند
  if (u.role === 'ADMIN') {
    const sc = await db.select().from(schools).orderBy(schools.name);
    const per = await db.select({ schoolId: users.schoolId, role: users.role, n: count() }).from(users).groupBy(users.schoolId, users.role);
    const n = (id: string, role: string) => per.find((x) => x.schoolId === id && x.role === role)?.n ?? 0;
    return (<>
      {hero(<><span className="hero-chip">🏫 {fa(sc.length)} مدرسه</span><span className="hero-chip">✅ {fa(sc.filter((x) => x.status === 'active').length)} فعال</span></>, `${roleTitle(u)} • ${formatJalali(today, true)}`)}
      {tiles([{ href: '/admin/schools', illus: 'school', label: 'مدارس و مدیران' }, ...(u.isOwner ? [{ href: '/admin/audit', illus: 'log', label: 'گزارش فعالیت‌ها' } as T] : []), { href: '/messages', illus: 'messages', label: 'پیام‌ها' }, { href: '/admin/requests', illus: 'announcements', label: 'درخواست‌های ثبت‌نام' }, { href: '/admin/plans', illus: 'report', label: 'تعرفه‌ها' }, { href: '/admin/support', illus: 'messages', label: 'پشتیبانی' }, { href: '/admin/admins', illus: 'users', label: 'مدیران سامانه' }])}
      <div style={{ height: 22 }} />
      <Card title="مدارس ثبت‌شده">{sc.length ? <div className="table-wrap"><table><thead><tr><th>مدرسه</th><th>وضعیت</th><th>مدیر/معاون</th><th>معلم</th><th>دانش‌آموز</th><th>ولی</th></tr></thead><tbody>
        {sc.map((x) => <tr key={x.id}><td><b>{x.name}</b></td><td><Badge tone={x.status === 'active' ? 'ok' : 'danger'}>{x.status === 'active' ? 'فعال' : 'غیرفعال'}</Badge></td><td className="num">{fa(n(x.id, 'PRINCIPAL') + n(x.id, 'VICE'))}</td><td className="num">{fa(n(x.id, 'TEACHER'))}</td><td className="num">{fa(n(x.id, 'STUDENT'))}</td><td className="num">{fa(n(x.id, 'PARENT'))}</td></tr>)}
      </tbody></table></div> : <Empty text="هنوز مدرسه‌ای ساخته نشده است." icon="school" />}</Card>
    </>);
  }

  const scope = await focusStudentIds(u); const cls = await focusClassIds(u);
  const teacher = u.role === 'TEACHER'; const manager = isManager(u.role); const staff = isStaff(u.role);
  const school = await getSchool(u.schoolId);
  const reports = teacher ? [] : await loadReports({ studentIds: scope, from: addDays(today, -13), limit: 300 });
  const stats = summarize(flattenItems(reports), today);
  const w = await getStudyWindow(u.schoolId!);

  const annCond = and(eq(announcements.schoolId, u.schoolId!), cls.length ? or(isNull(announcements.classId), inArray(announcements.classId, cls)) : isNull(announcements.classId));
  const news = await db.select().from(announcements).where(annCond).orderBy(desc(announcements.pinned), desc(announcements.createdAt)).limit(4);
  const todo = cls.length && !manager ? await db.select({ a: assignments, subject: subjects.name, className: classes.name }).from(assignments).innerJoin(subjects, eq(subjects.id, assignments.subjectId)).innerJoin(classes, eq(classes.id, assignments.classId))
    .where(and(gte(assignments.dueDate, today), inArray(assignments.classId, cls))).orderBy(assignments.dueDate).limit(5) : [];

  let inactive: { id: string; name: string }[] = [];
  if (staff && !teacher) {
    const stu = !scope.length ? [] : await db.select({ id: users.id, f: users.firstName, l: users.lastName }).from(users).where(inArray(users.id, scope));
    const recent = new Set(reports.filter((r) => r.date >= addDays(today, -2)).map((r) => r.studentId));
    inactive = stu.filter((x) => !recent.has(x.id)).map((x) => ({ id: x.id, name: `${x.f} ${x.l}` }));
  }

  // خلاصه‌ی کوتاه به‌شکل چیپ‌های بنر (به‌جای کارت‌های شلوغ)
  let chips: React.ReactNode;
  if (staff) {
    const absentToday = scope.length ? (await db.select({ n: count() }).from(attendance).where(and(eq(attendance.date, today), inArray(attendance.studentId, scope)))).at(0)?.n ?? 0 : 0;
    chips = (<><span className="hero-chip">👥 {fa(scope.length)} دانش‌آموز</span><span className="hero-chip">🚪 {fa(absentToday)} غیبت/تأخیر امروز</span>{manager && <span className="hero-chip">🏫 {fa(cls.length)} کلاس</span>}</>);
  } else {
    const avg = scope.length ? await db.select({ s: grades.score, m: grades.maxScore }).from(grades).where(inArray(grades.studentId, scope)) : [];
    const pctAvg = avg.length ? Math.round((avg.reduce((a, g) => a + (g.s / g.m) * 20, 0) / avg.length) * 100) / 100 : null;
    chips = (<>{pctAvg !== null && <span className="hero-chip">🎯 میانگین نمرات {fa(pctAvg)}</span>}<span className="hero-chip">⏱️ مطالعه‌ی امروز {formatDuration(stats.todayMin)}</span><span className="hero-chip">🔥 {fa(stats.streak)} روز پیاپی</span>
      {u.role === 'PARENT' && <Link href="/study" className="hero-chip">📝 ثبت گزارش مطالعه تا {w.endLabel === '24:00' ? 'نیمه‌شب' : fa(w.endLabel)}</Link>}</>);
  }

  const common: T[] = [{ href: '/grades', illus: 'grades', label: 'نمرات' }, { href: '/report-card', illus: 'report', label: 'کارنامه و رتبه‌ها' }, { href: '/discipline', illus: 'discipline', label: 'مثبت‌ها و منفی‌ها' }, { href: '/attendance', illus: 'attendance', label: 'حضور و غیاب' }, { href: '/schedule', illus: 'schedule', label: 'برنامه‌ی هفتگی' }];
  const study: T = { href: '/study', illus: 'study', label: teacher ? 'مطالعه‌ی درس من' : 'گزارش مطالعه' };
  const tail: T[] = [{ href: '/messages', illus: 'messages', label: 'پیام‌ها' }, { href: '/announcements', illus: 'announcements', label: 'اطلاعیه‌ها' }, { href: '/help', illus: 'help', label: 'راهنما و پشتیبانی' }];
  const daily: T[] = manager ? [{ href: '/students', illus: 'students', label: 'دانش‌آموزان' }, ...common, study, { href: '/teacher-schedule', illus: 'teacher', label: 'برنامه‌ی معلمان' }, ...tail]
    : teacher ? [{ href: '/students', illus: 'students', label: 'دانش‌آموزان' }, ...common, { href: '/assignments', illus: 'assignments', label: 'تکالیف' }, study, { href: '/teacher-schedule', illus: 'teacher', label: 'برنامه‌ی من' }, ...tail]
    : [...common, { href: '/advisor', illus: 'advisor', label: 'مشاور تحصیلی' }, { href: '/assignments', illus: 'assignments', label: 'تکالیف' }, study, ...tail];
  const admin: T[] = [{ href: '/admin/users', illus: 'users', label: 'کاربران مدرسه' }, { href: '/admin/classes', illus: 'school', label: 'کلاس‌ها و درس‌ها' }, { href: '/admin/settings', illus: 'settings', label: 'تنظیمات مدرسه' }];

  const tabs = [
    { id: 'news', label: '📢 اطلاعیه‌ها', content: (<Card>{news.length ? <div className="list">{news.map((a) => <div className="list-item" key={a.id}><div><b>{a.pinned ? '📌 ' : ''}{a.title}</b><div className="muted small">{a.body.slice(0, 120)}{a.body.length > 120 ? '…' : ''}</div></div></div>)}</div> : <Empty text="اطلاعیه‌ای نیست." icon="mega" />}</Card>) },
    ...(!manager ? [{ id: 'todo', label: '📚 تکالیف پیش‌رو', content: (<Card>{todo.length ? <div className="list">{todo.map((t) => <div className="list-item" key={t.a.id}><div><b>{t.a.title}</b><div className="muted small">{t.subject} • {t.className}</div></div><Badge tone="warn">{t.a.dueDate ? formatJalali(t.a.dueDate) : ''}</Badge></div>)}</div> : <Empty text="تکلیف فعالی نیست." icon="assign" />}</Card>) }] : []),
    ...(!teacher ? [{ id: 'study', label: '⏱️ مطالعه', content: (<div className="grid g2"><Card title="مطالعه‌ی ۷ روز اخیر"><WeekChart data={stats.last7} /></Card><Card title="آخرین گزارش‌ها">{reports.length ? <div className="list">{reports.slice(0, 5).map((r) => <div className="list-item" key={r.id}><div><b>{u.role === 'STUDENT' ? r.items.map((x) => x.subjectName).join('، ') : r.studentName}</b><div className="muted small">{u.role === 'STUDENT' ? r.topic : `${r.items.map((x) => x.subjectName).join('، ')} • ${r.topic}`}</div></div><div style={{ textAlign: 'end' }}><Badge tone="primary">{formatDuration(r.durationMin)}</Badge><div className="muted small">{formatJalali(r.date)}</div></div></div>)}</div> : <Empty text="هنوز گزارشی ثبت نشده است." icon="study" />}</Card></div>) }] : []),
    ...(manager ? [{ id: 'alert', label: '⚠️ بدون گزارش', badge: inactive.length ? <Badge tone="warn">{fa(inactive.length)}</Badge> : undefined, content: (<Card title="بدون گزارش مطالعه در ۳ روز اخیر">{inactive.length ? <div className="chips">{inactive.map((s) => <Link key={s.id} href={`/students/${s.id}`} className="badge warn">{s.name}</Link>)}</div> : <div className="alert ok">همه‌ی دانش‌آموزان در ۳ روز اخیر گزارش داده‌اند. 👏</div>}</Card>) }] : []),
  ];

  return (
    <>
      {hero(chips, `${roleTitle(u)} • ${school?.name ?? ''} • ${formatJalali(today, true)}`)}
      {gentle.length > 0 && (<div className="alert warn" style={{ marginBottom: 18, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}><span style={{ fontSize: '1.4rem' }}>📝</span><div style={{ flex: 1, minWidth: 200 }}>گزارش مطالعه‌ی امروزِ <b>{gentle.map((k) => k.firstName).join('، ')}</b> هنوز ثبت نشده است. اگر مطالعه نداشته، «عدم مطالعه» را ثبت کنید.</div><Link href="/study" className="btn sm">ثبت گزارش</Link></div>)}
      {tiles(daily, manager ? 'کار روزانه' : undefined)}
      {manager && (<div style={{ marginTop: 24 }}>{tiles(admin, 'مدیریت مدرسه', daily.length)}</div>)}
      <div style={{ height: 26 }} />
      <Tabs tabs={tabs} />
    </>
  );
}
