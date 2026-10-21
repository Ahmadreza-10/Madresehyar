import Link from 'next/link';
import { asc, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { attendance, users } from '@/db/schema';
import { requireSchoolUser } from '@/lib/auth';
import { isStaff, schoolOf, focusStudentIds, subjectNames, teacherSubjectIds } from '@/lib/permissions';
import { loadRankContext, resultFor } from '@/lib/ranking';
import { getSchool, getSettings } from '@/lib/settings';
import { gradeLabel, subjectRanks, type Ranked } from '@/lib/report-card';
import { flattenItems, loadReports } from '@/lib/study-data';
import { summarize } from '@/lib/study-stats';
import { addDays, todayTehran } from '@/lib/time';
import { fa, formatDuration, formatJalali, fullName } from '@/lib/format';
import PrintButton from '@/components/PrintButton';
import { Collapse, PeriodPicker } from '@/components/Interactive';
import { Badge, Card, Empty, PageHead, Stat } from '@/components/ui';

export const metadata = { title: 'کارنامه و رتبه‌ها' };
const tone = (v: number) => (v >= 17 ? 'ok' : v >= 12 ? 'primary' : v >= 10 ? 'warn' : 'danger') as 'ok' | 'primary' | 'warn' | 'danger';
const val = (v: number | null | undefined) => (v === null || v === undefined ? '—' : fa(v));

export default async function ReportCardPage({ searchParams }: { searchParams: Promise<{ student?: string; p?: string }> }) {
  const u = await requireSchoolUser(); const sp = await searchParams;
  const scope = await focusStudentIds(u);
  const list = scope.length ? await db.select().from(users).where(inArray(users.id, scope)).orderBy(asc(users.lastName)) : [];
  const st = list.find((s) => s.id === sp.student) ?? list[0];
  if (!st) return (<><PageHead illus="report" title="کارنامه" /><Card><Empty text="دانش‌آموزی برای نمایش کارنامه وجود ندارد." icon="card" /></Card></>);

  // معلم: فقط درس‌هایی که خودش در کلاس این دانش‌آموز تدریس می‌کند (نمره، میانگین و رتبه فقط بر پایه‌ی همین درس‌ها)
  const mySubjects = await teacherSubjectIds(u, st.classId);
  const onlyMine = mySubjects !== null; const scope2 = onlyMine ? (await subjectNames(mySubjects)).join('، ') : '';
  const avgWord = onlyMine ? `میانگین درس ${scope2 || '—'}` : 'معدل کل';
  const ctx = (await loadRankContext(st.id, mySubjects))!;
  const settings = await getSettings(schoolOf(u));
  const showLists = isStaff(u.role) || settings.showRankLists === '1';
  const period = [...ctx.months, ctx.year].find((x) => x.key === sp.p) ?? ctx.year;
  const res = resultFor(ctx, period);
  const monthRows = ctx.months.map((m) => ({ m, r: resultFor(ctx, m) }));
  const yearRes = resultFor(ctx, ctx.year);
  const hasData = (r: ReturnType<typeof resultFor>) => r.cls.length > 0 || r.grd.length > 0;
  // مهر تا خرداد همیشه نمایش داده می‌شود؛ تیر تا شهریور فقط اگر نمره‌ای داشته باشد
  const shownMonths = monthRows.filter(({ r }, i) => i < 9 || hasData(r));
  const school = await getSchool(u.schoolId);

  // رتبه‌ی هر درس در کلاس و پایه، در همین بازه
  const inP = ctx.rows.filter((g) => g.date >= period.from && g.date <= period.to);
  const subj = subjectRanks(inP, ctx.classIds, ctx.gradeIds, st.id);

  const absences = (await db.select().from(attendance).where(eq(attendance.studentId, st.id))).length;
  const today = todayTehran();
  const study = summarize(flattenItems(await loadReports({ studentIds: [st.id], from: addDays(today, -29) })), today);

  const nameOf = new Map(ctx.gradeStudents.map((s) => [s.id, fullName(s)]));
  const classNameOf = new Map(ctx.gradeClasses.map((c) => [c.id, c.name]));
  const clsOf = new Map(ctx.gradeStudents.map((s) => [s.id, s.classId]));
  const href = (o: { student?: string; p?: string }) => { const q = new URLSearchParams(); const s = o.student ?? st.id; q.set('student', s); const p = o.p ?? period.key; if (p !== 'year') q.set('p', p); return `/report-card?${q}`; };
  const rankTable = (rows: Ranked[], withClass: boolean) => (
    <div className="table-wrap"><table><thead><tr><th>رتبه</th><th>نام</th>{withClass && <th>کلاس</th>}<th>{onlyMine ? 'میانگین درس' : 'معدل کل'}</th></tr></thead><tbody>
      {rows.map((x) => (<tr key={x.studentId} className={x.studentId === st.id ? 'me-row' : ''}><td className="num"><b>{fa(x.rank)}</b></td><td>{nameOf.get(x.studentId)}{x.studentId === st.id && <> <Badge tone="primary">{st.id === u.id ? 'شما' : 'این دانش‌آموز'}</Badge></>}</td>{withClass && <td>{classNameOf.get(clsOf.get(x.studentId) ?? '') ?? '—'}</td>}<td className="num">{fa(x.avg)}</td></tr>))}
    </tbody></table></div>
  );

  return (
    <div className="rc-page">
      <div className="print-only report-head">
        <div className="rh-school">{school?.name}</div><div className="rh-title">کارنامه‌ی تحصیلی</div>
        <div className="rh-meta"><div><span>نام و نام خانوادگی: </span><b>{fullName(st)}</b></div><div><span>کلاس: </span><b>{ctx.cls?.name ?? '—'}</b></div><div><span>پایه: </span><b>{ctx.cls?.gradeLevel ?? '—'}</b></div><div><span>سال تحصیلی: </span><b>{ctx.cls?.academicYear ?? '—'}</b></div><div><span>بازه: </span><b>{period.label}</b></div><div><span>تاریخ صدور: </span><b>{formatJalali(today)}</b></div></div>
      </div>
      <PageHead illus="report" title={`کارنامه‌ی ${fullName(st)}`} sub={`${ctx.cls?.name ?? 'بدون کلاس'} • سال تحصیلی ${ctx.cls?.academicYear ?? ''} • بازه: ${period.label} • تاریخ صدور: ${formatJalali(today)} • ${fa(absences)} غیبت/تأخیر`}>
        {list.length > 1 && <form className="row no-print" action="/report-card">{period.key !== 'year' && <input type="hidden" name="p" value={period.key} />}<select name="student" defaultValue={st.id} style={{ width: 220 }}>{list.map((s) => <option key={s.id} value={s.id}>{fullName(s)}</option>)}</select><button className="btn ghost sm">نمایش</button></form>}
        <PeriodPicker current={period.key} options={[{ key: 'year', label: 'کل سال', href: href({ p: 'year' }) }, ...ctx.months.map((m) => ({ key: m.key, label: m.label, href: href({ p: m.key }) }))]} />
        <PrintButton />
      </PageHead>

      <div className="grid g4">
        <Card><div className="muted small">{avgWord} ({period.label})</div><div className="big-num num">{val(res.myClass?.avg)}</div>{res.myClass && <Badge tone={tone(res.myClass.avg)}>{gradeLabel(res.myClass.avg)}</Badge>}</Card>
        <Card><div className="muted small">رتبه در کلاس</div><div className="big-num num">{val(res.myClass?.rank)}</div><span className="muted small">از {fa(res.cls.length)} نفر • میانگین معدل کلاس: {val(res.classAvg)}</span></Card>
        <Card><div className="muted small">رتبه در پایه ({ctx.cls?.gradeLevel ?? '—'})</div><div className="big-num num">{val(res.myGrade?.rank)}</div><span className="muted small">از {fa(res.grd.length)} نفر • میانگین معدل پایه: {val(res.gradeAvg)}</span></Card>
        {onlyMine ? <Card><div className="muted small">درس‌های شما در این کلاس</div><div style={{ fontWeight: 800, marginTop: 6 }}>{scope2 || '—'}</div><span className="muted small">فقط نمره و رتبه‌ی همین درس‌ها نمایش داده می‌شود.</span></Card> : <div className="no-print"><Stat label="مطالعه در ۳۰ روز اخیر" value={formatDuration(study.totalMin)} hint={`${fa(study.activeDays)} روز فعال`} icon="study" tone="accent" /></div>}
      </div>

      <div style={{ height: 16 }} />
      <Collapse title={onlyMine ? 'میانگین و رتبه‌ی درس شما، ماه‌به‌ماه و کل سال' : 'معدل و رتبه‌ی ماه‌به‌ماه و کل سال'} hint="برای دیدن یک ماه، روی نام آن بزنید">
        {shownMonths.length ? <div className="table-wrap"><table><thead><tr><th>بازه</th><th>{onlyMine ? 'میانگین' : 'معدل'}</th><th>رتبه در کلاس</th><th>میانگین کلاس</th><th>رتبه در پایه</th><th>میانگین پایه</th></tr></thead><tbody>
          {[...shownMonths.map(({ m, r }) => ({ key: m.key, label: m.label, r })), { key: 'year', label: 'کل سال', r: yearRes }].map(({ key, label, r }) => (
            <tr key={key} className={key === period.key ? 'me-row' : ''} style={key === 'year' ? { fontWeight: 800 } : undefined}>
              <td><Link href={href({ p: key })}>{label}</Link></td><td className="num">{val(r.myClass?.avg)}</td>
              <td className="num">{r.myClass ? `${fa(r.myClass.rank)} از ${fa(r.cls.length)}` : '—'}</td><td className="num">{val(r.classAvg)}</td>
              <td className="num">{r.myGrade ? `${fa(r.myGrade.rank)} از ${fa(r.grd.length)}` : '—'}</td><td className="num">{val(r.gradeAvg)}</td></tr>))}
        </tbody></table></div> : <Empty text="هنوز نمره‌ای در این سال تحصیلی ثبت نشده است." icon="grades" />}
      </Collapse>

      <div style={{ height: 16 }} />
      <Collapse title={`نمرات و رتبه‌ی هر درس (${period.label})`} hint="رتبه در کلاس و پایه برای هر درس">
        {subj.length ? <div className="table-wrap"><table><thead><tr><th>درس</th><th>نمره‌ی دانش‌آموز</th><th>نمودار</th><th>رتبه در کلاس</th><th>میانگین کلاس</th><th>رتبه در پایه</th><th>میانگین پایه</th></tr></thead><tbody>
          {subj.map((m) => (<tr key={m.subjectId}><td><b>{m.name}</b><div className="muted small">{fa(m.count)} نمره</div></td><td><Badge tone={tone(m.avg)}>{fa(m.avg)}</Badge></td>
            <td style={{ minWidth: 110 }}><div className="cmp-bar"><span style={{ width: `${Math.min(100, (m.avg / 20) * 100)}%` }} /><b style={{ insetInlineStart: `${Math.min(100, ((m.classAvg ?? 0) / 20) * 100)}%` }} /></div></td>
            <td className="num">{m.classRank ? `${fa(m.classRank)} از ${fa(m.classN)}` : '—'}</td><td className="num">{val(m.classAvg)}</td>
            <td className="num">{m.gradeRank ? `${fa(m.gradeRank)} از ${fa(m.gradeN)}` : '—'}</td><td className="num">{val(m.gradeAvg)}</td></tr>))}
        </tbody></table></div> : <Empty text="در این بازه نمره‌ای ثبت نشده است." icon="grades" />}
        {subj.length > 0 && <div className="muted small" style={{ marginTop: 8 }}>در نمودار، نوار رنگی نمره‌ی دانش‌آموز و خط نارنجی میانگین کلاس است.</div>}
      </Collapse>

      <div style={{ height: 16 }} />
      {showLists ? (
        <div className="stack">
          <Collapse title={`رتبه‌بندی کلاس ${ctx.cls?.name ?? ''} (${period.label})`} badge={<span className="badge primary">{onlyMine ? 'میانگین نمرات کلاس' : 'میانگین معدل کل کلاس'}: <b>{val(res.classAvg)}</b></span>}>
            {res.cls.length ? rankTable(res.cls, false) : <Empty text="در این بازه نمره‌ای برای کلاس ثبت نشده است." icon="grades" />}
          </Collapse>
          <Collapse title={`رتبه‌بندی پایه‌ی ${ctx.cls?.gradeLevel ?? ''} (${period.label})`} badge={<span className="badge primary">{onlyMine ? 'میانگین نمرات پایه' : 'میانگین معدل کل پایه'}: <b>{val(res.gradeAvg)}</b></span>}>
            {res.grd.length ? rankTable(res.grd, true) : <Empty text="در این بازه نمره‌ای برای پایه ثبت نشده است." icon="grades" />}
          </Collapse>
        </div>
      ) : <div className="alert warn">نمایش فهرست کامل رتبه‌ها برای دانش‌آموزان و اولیا توسط مدرسه غیرفعال شده است؛ فقط رتبه و معدل خودتان نمایش داده می‌شود.</div>}
      <div className="print-only report-foot">این کارنامه توسط سامانه‌ی مدرسه‌یار صادر شده است • {school?.name} • {formatJalali(today)}</div>
    </div>
  );
}
