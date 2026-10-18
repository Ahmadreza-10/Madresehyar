import { asc, desc, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { studentNotes, users } from '@/db/schema';
import { addNote } from '@/app/actions/school';
import { updateNote } from '@/app/actions/edit';
import { requireSchoolUser } from '@/lib/auth';
import { isManager, isStaff, focusStudentIds } from '@/lib/permissions';
import { loadRankContext, resultFor } from '@/lib/ranking';
import { classDiscipline, netByStudent, rankNet } from '@/lib/discipline-calc';
import { disciplineTrend } from '@/lib/trends';
import { fa, formatJalali, fullName } from '@/lib/format';
import ActionForm from '@/components/ActionForm';
import TrendChart from '@/components/TrendChart';
import { PeriodPicker, Tabs } from '@/components/Interactive';
import { Badge, Card, Empty, PageHead } from '@/components/ui';

export const metadata = { title: 'مثبت‌ها و منفی‌ها' };
const noteTone = { note: '', praise: 'ok', discipline: 'danger' } as const;
const noteLabel = { note: 'یادداشت', praise: 'تشویق', discipline: 'انضباطی' } as const;
const of = (rank: number | undefined, n: number) => (rank ? `${fa(rank)} از ${fa(n)}` : '—');

export default async function DisciplinePage({ searchParams }: { searchParams: Promise<{ student?: string; p?: string }> }) {
  const u = await requireSchoolUser(); const sp = await searchParams; const staff = isStaff(u.role);
  const scope = await focusStudentIds(u);
  const list = scope.length ? await db.select().from(users).where(inArray(users.id, scope)).orderBy(asc(users.lastName)) : [];
  const st = list.find((s) => s.id === sp.student) ?? list[0];
  if (!st) return (<><PageHead title="مثبت‌ها و منفی‌ها" illus="discipline" /><Card><Empty text="دانش‌آموزی برای نمایش وجود ندارد." icon="note" /></Card></>);
  const ctx = (await loadRankContext(st.id))!; const d = ctx.data;
  const period = [...ctx.months, ctx.year].find((x) => x.key === sp.p) ?? ctx.year;
  const res = resultFor(ctx, period);

  // امتیاز انضباطی (تشویق +۱ ، منفی −۱) و رتبه‌ی انضباطی فقط در کلاس و پایه
  const net = netByStudent(d.notes, period);
  const dc = { cls: rankNet(net, ctx.classIds, st.id), grd: rankNet(net, ctx.gradeIds, st.id) };
  const byClass = new Map<string, string[]>(); for (const s of d.students) if (s.classId) byClass.set(s.classId, [...(byClass.get(s.classId) ?? []), s.id]);
  const clsRank = classDiscipline(d.notes, d.classes, byClass, period);
  const best = clsRank[0];
  const trend = ctx.cls ? disciplineTrend(d, { studentId: st.id, classId: ctx.cls.id }) : { labels: [], mine: [], classAvg: [] };

  const notes = await db.select().from(studentNotes).where(eq(studentNotes.studentId, st.id)).orderBy(desc(studentNotes.date), desc(studentNotes.createdAt)).limit(60);
  const inPeriod = notes.filter((n) => n.date >= period.from && n.date <= period.to);
  const praise = inPeriod.filter((n) => n.type === 'praise').length; const disc = inPeriod.filter((n) => n.type === 'discipline').length;

  // نفرات برتر «پایه‌ی» این دانش‌آموز (برای معلم/معاون/مدیر): بر اساس معدل و بر اساس انضباط
  const nm = new Map(d.students.map((s) => [s.id, fullName(s)])); const clsName = new Map(d.classes.map((c) => [c.id, c.name]));
  const clsOf = new Map(d.students.map((s) => [s.id, s.classId]));
  const topGpa = res.grd.slice(0, 8);
  const topDisc = ctx.gradeIds.map((id) => ({ id, net: net.get(id) ?? 0 })).sort((a, b) => b.net - a.net).map((x, _i, arr) => ({ ...x, rank: 1 + arr.filter((y) => y.net > x.net).length })).slice(0, 8);

  const href = (p: string) => { const q = new URLSearchParams(); q.set('student', st.id); if (p !== 'year') q.set('p', p); return `/discipline?${q}`; };
  const options = [{ key: 'year', label: 'کل سال', href: href('year') }, ...ctx.months.map((m) => ({ key: m.key, label: m.label, href: href(m.key) }))];

  const tabs = [
    { id: 'notes', label: '📝 مثبت‌ها و منفی‌ها', badge: inPeriod.length ? <Badge tone="primary">{fa(inPeriod.length)}</Badge> : undefined, content: (
      <Card title={`یادداشت‌های ثبت‌شده (${period.label})`}>
        {staff && (<div style={{ marginBottom: 14 }}><ActionForm action={addNote} submit="ثبت یادداشت" small><input type="hidden" name="studentId" value={st.id} />
          <div className="inline-fields"><select name="type" defaultValue="praise"><option value="praise">تشویق (+۱)</option><option value="discipline">انضباطی / منفی (−۱)</option><option value="note">یادداشت ساده</option></select></div><textarea name="body" required maxLength={500} placeholder="متن…" style={{ minHeight: 64 }} /></ActionForm></div>)}
        {inPeriod.length ? <div className="list">{inPeriod.map((n) => <div className="list-item" key={n.id} style={{ alignItems: 'flex-start' }}><div className="small">{n.body}<div className="muted">{formatJalali(n.date)}{n.editedAt && <span className="edited"> • ویرایش‌شده</span>}</div>
          {staff && (isManager(u.role) || n.authorId === u.id) && (<details style={{ marginTop: 6 }}><summary className="btn ghost sm" style={{ display: 'inline-flex' }}>ویرایش</summary>
            <div style={{ marginTop: 8, minWidth: 260 }}><ActionForm action={updateNote} submit="ذخیره" resetOnSuccess={false} small><input type="hidden" name="id" value={n.id} />
              <select name="type" defaultValue={n.type}><option value="praise">تشویق (+۱)</option><option value="discipline">انضباطی / منفی (−۱)</option><option value="note">یادداشت ساده</option></select>
              <textarea name="body" defaultValue={n.body} required maxLength={500} style={{ minHeight: 64 }} /></ActionForm></div></details>)}</div><Badge tone={noteTone[n.type]}>{noteLabel[n.type]}</Badge></div>)}</div> : <Empty text="در این بازه یادداشتی ثبت نشده است." icon="note" />}
      </Card>) },
    { id: 'best', label: '🏆 بهترین کلاس', content: (
      <Card title="بهترین کلاس از نظر انضباط" action={best ? <Badge tone="ok">🏆 {best.name}</Badge> : undefined}>
        {clsRank.length ? <div className="table-wrap"><table><thead><tr><th>رتبه</th><th>کلاس</th><th>تشویق</th><th>منفی</th><th>میانگین هر نفر</th></tr></thead><tbody>
          {clsRank.map((c) => <tr key={c.classId} className={c.classId === ctx.cls?.id ? 'me-row' : ''}><td className="num"><b>{fa(c.rank)}</b></td><td>{c.name}</td><td className="num">{fa(c.praise)}</td><td className="num">{fa(c.violations)}</td><td className="num">{fa(c.avgNet)}</td></tr>)}
        </tbody></table></div> : <Empty text="هنوز کلاسی برای مقایسه وجود ندارد." icon="note" />}
        <p className="muted small" style={{ marginTop: 10 }}>رتبه‌ی کلاس‌ها بر اساس میانگین امتیاز به‌ازای هر دانش‌آموز است تا کلاس شلوغ‌تر امتیاز بیشتری نگیرد.</p>
      </Card>) },
    { id: 'trend', label: '📈 روند', content: (
      <Card title="روند انضباط: دانش‌آموز و کلاس">
        <TrendChart labels={trend.labels} series={[{ name: fullName(st), color: 'var(--primary)', values: trend.mine }, { name: 'میانگین کلاس (به‌ازای هر نفر)', color: 'var(--warn)', values: trend.classAvg }]} />
      </Card>) },
    ...(staff ? [{ id: 'top', label: '⭐ نفرات برتر', content: (
      <div className="grid g2">
        <Card title={`بر اساس معدل — پایه‌ی ${ctx.cls?.gradeLevel ?? ''}`}>{topGpa.length ? <div className="list">{topGpa.map((x) => <div className="list-item" key={x.studentId}><div><b>{nm.get(x.studentId)}</b><div className="muted small">{clsName.get(clsOf.get(x.studentId) ?? '') ?? '—'}</div></div><div className="row" style={{ gap: 6 }}><Badge tone="primary">معدل {fa(x.avg)}</Badge><Badge tone="ok">رتبه {fa(x.rank)}</Badge></div></div>)}</div> : <Empty text="در این بازه نمره‌ای ثبت نشده است." icon="grades" />}</Card>
        <Card title={`بر اساس انضباط — پایه‌ی ${ctx.cls?.gradeLevel ?? ''}`}><div className="list">{topDisc.map((x) => <div className="list-item" key={x.id}><div><b>{nm.get(x.id)}</b><div className="muted small">{clsName.get(clsOf.get(x.id) ?? '') ?? '—'}</div></div><div className="row" style={{ gap: 6 }}><Badge tone="primary">امتیاز {fa(x.net)}</Badge><Badge tone="ok">رتبه {fa(x.rank)}</Badge></div></div>)}</div></Card>
      </div>) }] : []),
  ];

  return (
    <>
      <PageHead title={`مثبت‌ها و منفی‌ها — ${fullName(st)}`} sub={`${ctx.cls?.name ?? 'بدون کلاس'} • بازه: ${period.label}`} illus="discipline">
        {list.length > 1 && <form className="row" action="/discipline">{period.key !== 'year' && <input type="hidden" name="p" value={period.key} />}<select name="student" defaultValue={st.id} style={{ width: 200 }}>{list.map((s) => <option key={s.id} value={s.id}>{fullName(s)}</option>)}</select><button className="btn ghost sm">نمایش</button></form>}
        <PeriodPicker current={period.key} options={options} />
      </PageHead>

      <div className="grid g2">
        <section className="soft-panel" style={{ '--pc': '#3b82f6' } as React.CSSProperties}>
          <h3>🎓 رتبه‌ی تحصیلی</h3>
          <div className="rank-strip">
            <div><span>رتبه در کلاس</span><b className="num">{of(res.myClass?.rank, res.cls.length)}</b></div>
            <div><span>رتبه در پایه ({ctx.cls?.gradeLevel ?? '—'})</span><b className="num">{of(res.myGrade?.rank, res.grd.length)}</b></div>
            <div><span>معدل کل</span><b className="num">{res.myClass ? fa(res.myClass.avg) : '—'}</b></div>
          </div>
        </section>
        <section className="soft-panel" style={{ '--pc': '#eab308' } as React.CSSProperties}>
          <h3>⭐ انضباط</h3>
          <div className="rank-strip">
            <div><span>رتبه در کلاس</span><b className="num">{of(dc.cls?.rank, dc.cls?.of ?? 0)}</b></div>
            <div><span>رتبه در پایه</span><b className="num">{of(dc.grd?.rank, dc.grd?.of ?? 0)}</b></div>
            <div><span>تشویق / منفی</span><b className="num">{fa(praise)} / {fa(disc)}</b></div>
          </div>
        </section>
      </div>
      <p className="muted small" style={{ margin: '10px 4px 20px' }}>امتیاز انضباطی: هر تشویق ۱+ و هر مورد منفی ۱− حساب می‌شود.</p>
      <Tabs tabs={tabs} />
    </>
  );
}
