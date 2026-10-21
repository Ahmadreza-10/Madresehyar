import Link from 'next/link';
import { and, asc, eq, gte, inArray, sql } from 'drizzle-orm';
import { db } from '@/db';
import { attendance, classSubjects, studySkips, subjects, users } from '@/db/schema';
import { requireSchoolUser } from '@/lib/auth';
import { focusStudentIds } from '@/lib/permissions';
import { loadRankContext, resultFor } from '@/lib/ranking';
import { subjectRanks, to20 } from '@/lib/report-card';
import { flattenItems, loadReports } from '@/lib/study-data';
import { analyze, type Insight, type Level } from '@/lib/advisor';
import { addDays } from '@/lib/time';
import { fa, fullName } from '@/lib/format';
import { Tabs } from '@/components/Interactive';
import { Badge, Card, Empty, PageHead } from '@/components/ui';

export const metadata = { title: 'مشاور تحصیلی' };
const LV: Record<Level, { label: string; tone: 'ok' | 'primary' | 'warn' | 'danger'; emoji: string; color: string }> = {
  excellent: { label: 'عالی', tone: 'ok', emoji: '🌟', color: '#22c55e' }, good: { label: 'خوب', tone: 'primary', emoji: '👍', color: '#3b82f6' },
  attention: { label: 'نیازمند توجه', tone: 'warn', emoji: '⚠️', color: '#f59e0b' }, alert: { label: 'هشدار', tone: 'danger', emoji: '🚨', color: '#ef4444' },
};
const arrow = (d: number | null) => (d === null ? '—' : d > 0.4 ? `▲ ${fa(d)}` : d < -0.4 ? `▼ ${fa(Math.abs(d))}` : '■');
const dtone = (d: number | null) => (d === null ? '' : d > 0.4 ? 'ok' : d < -0.4 ? 'danger' : '');
const fmtMin = (m: number) => (m >= 60 ? `${fa(Math.floor(m / 60))} ساعت${m % 60 ? ` و ${fa(m % 60)} دقیقه` : ''}` : `${fa(Math.round(m))} دقیقه`);

export default async function AdvisorPage({ searchParams }: { searchParams: Promise<{ student?: string }> }) {
  const u = await requireSchoolUser(['STUDENT', 'PARENT']); const sp = await searchParams;
  const scope = await focusStudentIds(u);
  const kids = scope.length ? await db.select().from(users).where(inArray(users.id, scope)).orderBy(asc(users.lastName)) : [];
  const st = kids.find((k) => k.id === sp.student) ?? kids[0];
  if (!st) return (<><PageHead illus="advisor" title="مشاور تحصیلی" /><Card><Empty text="دانش‌آموزی برای تحلیل وجود ندارد." icon="users" /></Card></>);
  const ctx = (await loadRankContext(st.id))!; const today = ctx.today;

  // ---- جمع‌آوری داده‌ها ----
  const inYear = ctx.rows.filter((g) => g.date >= ctx.year.from && g.date <= ctx.year.to);
  const ranks = subjectRanks(inYear, ctx.classIds, ctx.gradeIds, st.id);
  const cs = ctx.cls ? await db.select({ id: subjects.id, name: subjects.name, teacherId: classSubjects.teacherId, tf: users.firstName, tl: users.lastName }).from(classSubjects).innerJoin(subjects, eq(subjects.id, classSubjects.subjectId)).leftJoin(users, eq(users.id, classSubjects.teacherId)).where(eq(classSubjects.classId, ctx.cls.id)) : [];
  const advSubjects = cs.map((c) => { const r = ranks.find((x) => x.subjectId === c.id); return { subjectId: c.id, name: c.name, classAvg: r?.classAvg ?? null, gradeAvg: r?.gradeAvg ?? null, classRank: r?.classRank ?? null, classN: r?.classN ?? 0, teacherId: c.teacherId, teacherName: c.tf ? `${c.tf} ${c.tl}` : null }; });
  const myGrades = inYear.filter((g) => g.studentId === st.id).map((g) => ({ subjectId: g.subjectId, score20: to20(g.score, g.maxScore), date: g.date }));
  const yearRes = resultFor(ctx, ctx.year);
  const monthlyGpa = ctx.months.filter((m) => m.from <= today).map((m) => resultFor(ctx, m).myClass?.avg ?? null);
  const reps = await loadReports({ studentIds: [st.id], from: addDays(today, -29), limit: 400 });
  const skips = await db.select({ d: studySkips.date }).from(studySkips).where(and(eq(studySkips.studentId, st.id), gte(studySkips.date, addDays(today, -30))));
  const [{ n: absences }] = await db.select({ n: sql<number>`count(*)` }).from(attendance).where(and(eq(attendance.studentId, st.id), inArray(attendance.status, ['absent', 'late'])));
  const audience = u.role === 'PARENT' ? 'parent' : 'student';

  const a = analyze({
    audience, firstName: st.firstName, today, grades: myGrades, subjects: advSubjects,
    gpa: yearRes.myClass?.avg ?? null, classAvgGpa: yearRes.classAvg, gpaRank: yearRes.myClass ? { rank: yearRes.myClass.rank, of: yearRes.cls.length } : null, monthlyGpa,
    reports: flattenItems(reps).map((r) => ({ date: r.date, startTime: r.startTime, endTime: r.endTime, durationMin: r.durationMin, subjectId: r.subjectId, mastery: r.mastery, goalAchieved: r.goalAchieved ?? null, tests: r.tests.map((t) => ({ total: t.totalCount, correct: t.correctCount, wrong: t.wrongCount, blank: t.blankCount, percent: t.percent })) })),
    skipDays: skips.map((x) => x.d), absences: Number(absences),
  });
  const lv = LV[a.level];
  const risks = a.insights.filter((i) => i.kind === 'risk' || i.kind === 'action'); const strengths = a.insights.filter((i) => i.kind === 'strength'); const infos = a.insights.filter((i) => i.kind === 'info');

  const card = (i: Insight, n?: number) => (
    <div className={`adv-card ${i.kind}`} key={i.id}>
      <div className="adv-head">{n !== undefined && <span className="adv-n">{fa(n)}</span>}<b>{i.title}</b></div>
      <p>{i.detail}</p>
      {i.evidence && <div className="adv-ev">📊 {i.evidence}</div>}
      {i.teacher && <Link className="btn ghost sm" href={`/messages?to=${i.teacher.id}`} style={{ marginTop: 8 }}>✉️ پیام به {i.teacher.name}</Link>}
    </div>);
  const metric = (label: string, value: string, hint?: string) => (<div><span>{label}</span><b className="num">{value}</b>{hint && <small className="muted">{hint}</small>}</div>);
  const s = a.study; const t = s.tests;

  const tabs = [
    { id: 'priorities', label: '📌 اولویت‌ها', badge: risks.length ? <Badge tone="warn">{fa(risks.length)}</Badge> : undefined, content: (
      <div className="stack">
        {risks.length ? <Card title={audience === 'parent' ? 'مهم‌ترین نکات برای اقدام' : 'مهم‌ترین کارهای این هفته'}><div className="adv-list">{risks.slice(0, 7).map((i, k) => card(i, k + 1))}</div></Card> : <Card><Empty text="نکته‌ی هشداری پیدا نشد؛ عالی پیش می‌روید! 🎉" icon="check" /></Card>}
        {strengths.length > 0 && <Card title="✅ نقاط قوت"><div className="adv-list">{strengths.map((i) => card(i))}</div></Card>}
        {infos.length > 0 && <Card title="ℹ️ نکته‌های تکمیلی"><div className="adv-list">{infos.map((i) => card(i))}</div></Card>}
      </div>) },
    { id: 'subjects', label: '📚 درس‌ها', content: (
      <Card title="تحلیل هر درس">
        {a.subjects.length ? <div className="table-wrap"><table><thead><tr><th>درس</th><th>میانگین</th><th>آخرین نمره</th><th>روند</th><th>نسبت به کلاس</th><th>رتبه در کلاس</th><th>مطالعه ۳۰ روز</th><th>وضعیت</th></tr></thead><tbody>
          {a.subjects.map((x) => (<tr key={x.subjectId}><td><b>{x.name}</b>{x.volatile && <div className="muted small">نوسان زیاد</div>}</td><td className="num">{fa(x.avg)}</td><td className="num">{fa(x.last)}</td>
            <td><Badge tone={dtone(x.delta) as '' | 'ok' | 'danger'}>{arrow(x.delta)}</Badge></td><td className="num">{x.classGap === null ? '—' : x.classGap > 0 ? `+${fa(x.classGap)}` : fa(x.classGap)}</td><td className="num">{x.classRank ? `${fa(x.classRank)} از ${fa(x.classN)}` : '—'}</td>
            <td className="num">{fmtMin(x.study.min)}{x.study.mastery !== null && <div className="muted small">تسلط {fa(x.study.mastery)}/۵</div>}</td>
            <td><Badge tone={x.status === 'weak' ? 'danger' : x.status === 'strong' ? 'ok' : 'primary'}>{x.status === 'weak' ? 'نیاز به توجه' : x.status === 'strong' ? 'قوی' : 'متوسط'}</Badge></td></tr>))}
        </tbody></table></div> : <Empty text="هنوز نمره‌ای ثبت نشده است." icon="grades" />}
        <p className="muted small" style={{ marginTop: 10 }}>«نسبت به کلاس» تفاوت میانگین شما با میانگین کلاس در همان درس است. «روند» مقایسه‌ی آخرین نمره با میانگین نمره‌های قبلی است.</p>
      </Card>) },
    { id: 'study', label: '⏱️ مطالعه', content: (
      <div className="stack">
        <Card title="شاخص ثبات مطالعه">
          <div className="row between" style={{ marginBottom: 6 }}><b className="num" style={{ fontSize: '1.6rem' }}>{fa(s.consistency)} <small className="muted">از ۱۰۰</small></b><Badge tone={s.consistency >= 70 ? 'ok' : s.consistency >= 40 ? 'warn' : 'danger'}>{s.consistency >= 70 ? 'منظم' : s.consistency >= 40 ? 'متوسط' : 'نامنظم'}</Badge></div>
          <div className="progress"><span style={{ width: `${s.consistency}%` }} /></div>
          <p className="muted small" style={{ marginTop: 8 }}>ترکیب «چند روز از ۱۴ روز اخیر مطالعه شده» (۶۰٪) و «میانگین زمان روزانه» (۴۰٪).</p>
        </Card>
        <Card title="آمار ۳۰ روز اخیر"><div className="rank-strip">
          {metric('مجموع مطالعه', fmtMin(s.totalMin))}{metric('روزهای فعال (۱۴ روز)', `${fa(s.activeDays14)} از ۱۴`)}{metric('روزهای فعال (۳۰ روز)', `${fa(s.activeDays30)} از ۳۰`)}
          {metric('میانگین روزانه', fmtMin(s.avgDaily14), 'در ۱۴ روز اخیر')}{metric('روزهای پیاپی', `${fa(s.streak)} روز`)}{metric('طولانی‌ترین وقفه', `${fa(s.longestGap)} روز`, 'در ۱۴ روز اخیر')}
          {metric('روزهای «عدم مطالعه»', fa(s.skipDays))}{metric('مطالعه‌ی بعد از ۲۳', `${fa(s.lateNightDays)} روز`)}{metric('تحقق هدف‌ها', s.goalRate === null ? '—' : `${fa(Math.round(s.goalRate * 100))}٪`)}
        </div></Card>
        <Card title="تست‌ها">{t.count ? <div className="rank-strip">{metric('تعداد تست', fa(t.count))}{metric('تعداد سؤال', fa(t.questions))}{metric('میانگین درصد', t.avgPercent === null ? '—' : `${fa(t.avgPercent)}٪`)}{metric('سؤال غلط', t.wrongRate === null ? '—' : `${fa(Math.round(t.wrongRate * 100))}٪`)}{metric('سؤال نزده', t.blankRate === null ? '—' : `${fa(Math.round(t.blankRate * 100))}٪`)}{metric('روند درصد', t.trend === null ? '—' : arrow(t.trend))}</div> : <Empty text="در ۳۰ روز اخیر تستی ثبت نشده است." icon="study" />}</Card>
      </div>) },
    { id: 'plan', label: '🗓️ برنامه‌ی پیشنهادی', content: (
      <div className="stack">
        <Card title="برنامه‌ی هفته‌ی آینده">
          <div className="hero-chips" style={{ marginBottom: 12 }}><span className="badge primary">روزانه ≈ {fmtMin(a.plan.dailyMin)}</span><span className="badge primary">هفتگی ≈ {fmtMin(a.plan.weeklyMin)} ({fa(a.plan.studyDays)} روز مطالعه + ۱ روز استراحت)</span></div>
          <div className="table-wrap"><table><thead><tr><th>درس</th><th>جلسه در هفته</th><th>مجموع</th><th>دلیل</th></tr></thead><tbody>{a.plan.rows.map((r) => <tr key={r.subjectId}><td><b>{r.name}</b></td><td className="num">{fa(r.sessions)} × ۴۵ دقیقه</td><td className="num">{fmtMin(r.weeklyMin)}</td><td className="muted small">{r.reason}</td></tr>)}</tbody></table></div>
          <p className="muted small" style={{ marginTop: 8 }}>زمان کل بر اساس مطالعه‌ی فعلی (کمی بیشتر) تنظیم شده و بین درس‌ها بر اساس «میزان ضعف» تقسیم می‌شود.</p>
        </Card>
        <div className="grid g2">
          <Card title="🎯 هدف‌های پیشنهادی">
            {a.goals.gpaTarget !== null ? <div className="stack"><div className="soft-panel" style={{ '--pc': '#8b5cf6' } as React.CSSProperties}>معدل هدف: <b className="num">{fa(a.goals.gpaTarget)}</b>{a.gpa !== null && <span className="muted"> (اکنون {fa(a.gpa)})</span>}</div>
              {a.goals.subjects.map((g) => <div key={g.name} className="list-item"><b>{g.name}</b><span className="num">{fa(g.from)} ← <b>{fa(g.to)}</b></span></div>)}</div> : <Empty text="با ثبت نمره‌ها، هدف‌ها پیشنهاد می‌شود." icon="grades" />}
          </Card>
          <Card title="💡 نکته‌های اجرای برنامه"><ul className="adv-tips">{a.plan.tips.map((x) => <li key={x}>{x}</li>)}</ul></Card>
        </div>
      </div>) },
    { id: 'guide', label: audience === 'parent' ? '👨‍👩‍👧 راهنمای والدین' : '💬 راهنما', content: (
      <div className="grid g2">
        <Card title={a.guide.title}><ul className="adv-tips">{a.guide.points.map((x) => <li key={x}>{x}</li>)}</ul></Card>
        {a.questions.length > 0 && <Card title="سؤال‌های پیشنهادی برای گفتگو"><ul className="adv-tips">{a.questions.map((x) => <li key={x}>{x}</li>)}</ul><p className="muted small" style={{ marginTop: 10 }}>گفتگو را در فضایی آرام و بدون عجله شروع کنید؛ هدف شنیدن است، نه بازجویی.</p></Card>}
      </div>) },
  ];

  return (
    <div className="compact">
      <PageHead illus="advisor" title="مشاور تحصیلی" sub={`تحلیل خودکار نمرات و مطالعه‌ی ${fullName(st)}`}>
        {kids.length > 1 && <form className="row" action="/advisor"><select name="student" defaultValue={st.id} style={{ width: 200 }}>{kids.map((k) => <option key={k.id} value={k.id}>{fullName(k)}</option>)}</select><button className="btn ghost sm">نمایش</button></form>}
      </PageHead>
      <section className="adv-hero" style={{ '--lv': lv.color } as React.CSSProperties}>
        <div className="adv-badge"><span aria-hidden="true">{lv.emoji}</span><b>{lv.label}</b></div>
        <div className="adv-hero-text"><h2>{a.headline}</h2>
          <div className="hero-chips">{a.gpa !== null && <span className="adv-chip">معدل {fa(a.gpa)}</span>}<span className="adv-chip">روند: {a.trend.dir === 'up' ? '▲ بهبود' : a.trend.dir === 'down' ? '▼ کاهش' : a.trend.dir === 'flat' ? '■ ثابت' : 'نامشخص'}</span><span className="adv-chip">ثبات مطالعه {fa(a.study.consistency)}/۱۰۰</span><span className="adv-chip">{fa(a.study.activeDays14)} روز مطالعه از ۱۴</span></div></div>
      </section>
      <Tabs tabs={tabs} />
      <p className="muted small" style={{ margin: '18px 4px 0' }}>این تحلیل به‌صورت خودکار از روی نمره‌ها و گزارش‌های مطالعه‌ی ثبت‌شده ساخته می‌شود، فقط برای راهنمایی است و جایگزین مشاور انسانی نیست. برای مسائل جدی (افت طولانی، بی‌انگیزگی شدید، اضطراب) با معلم یا مشاور مدرسه صحبت کنید.</p>
    </div>
  );
}
