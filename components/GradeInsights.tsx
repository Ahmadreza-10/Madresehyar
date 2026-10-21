import { db } from '@/db';
import { loadSchoolData } from '@/lib/school-stats';
import { classGpaRanking, gpaTrend } from '@/lib/trends';
import { fa, fullName } from '@/lib/format';
import TrendChart from './TrendChart';
import { PeriodPicker } from './Interactive';
import { Badge, Card, Empty } from './ui';

/** «بهترین کلاس پایه» + نمودار روند معدل؛ سه قطعه‌ی جدا برمی‌گرداند تا صفحه آن‌ها را در تب‌ها بگذارد. */
export async function gradeInsights({ schoolId, classId, studentId, periodKey, hrefFor, subjectIds, scopeName }: { schoolId: string; classId: string; studentId?: string; periodKey: string; hrefFor: (p: string) => string; subjectIds?: string[] | null; scopeName?: string }) {
  const cls0 = await db.query.classes.findFirst({ where: (c, { eq }) => eq(c.id, classId) });
  if (!cls0) return null;
  const d = await loadSchoolData(schoolId, cls0.academicYear, subjectIds);
  const cls = d.classes.find((c) => c.id === classId)!;
  const period = [...d.months, d.year].find((x) => x.key === periodKey) ?? d.year;
  const ranking = classGpaRanking(d, cls.gradeLevel, period);
  const t = gpaTrend(d, { studentId, classId, gradeLevel: cls.gradeLevel });
  const me = studentId ? d.students.find((s) => s.id === studentId) : undefined;
  const series = [
    ...(studentId ? [{ name: me ? fullName(me) : 'دانش‌آموز', color: 'var(--primary)', values: t.mine }] : []),
    { name: `میانگین کلاس ${cls.name}`, color: 'var(--warn)', values: t.classAvg },
    { name: `میانگین پایه‌ی ${cls.gradeLevel}`, color: 'var(--accent)', values: t.gradeAvg },
  ];
  return {
    picker: <PeriodPicker current={period.key} options={[{ key: 'year', label: 'کل سال', href: hrefFor('year') }, ...d.months.map((m) => ({ key: m.key, label: m.label, href: hrefFor(m.key) }))]} />,
    ranking: (
      <Card title={`بهترین کلاس پایه‌ی ${cls.gradeLevel} از نظر نمرات${scopeName ? ` درس ${scopeName}` : ''} (${period.label})`} action={ranking[0] ? <Badge tone="ok">🏆 {ranking[0].name}</Badge> : undefined}>
        {ranking.length ? <div className="table-wrap"><table><thead><tr><th>رتبه</th><th>کلاس</th><th>{scopeName ? 'میانگین نمرات درس' : 'میانگین معدل دانش‌آموزان'}</th><th>تعداد</th></tr></thead><tbody>
          {ranking.map((c) => <tr key={c.classId} className={c.classId === classId ? 'me-row' : ''}><td className="num"><b>{fa(c.rank)}</b></td><td>{c.name}</td><td className="num">{fa(c.avg)}</td><td className="num">{fa(c.n)}</td></tr>)}
        </tbody></table></div> : <Empty text="در این بازه نمره‌ای برای کلاس‌های این پایه ثبت نشده است." icon="grades" />}
      </Card>
    ),
    trend: (<Card title={scopeName ? `روند میانگین نمرات درس ${scopeName}: افت و بهبود ماه‌به‌ماه` : 'روند معدل: افت و بهبود ماه‌به‌ماه'}><TrendChart labels={t.labels} series={series} min={0} max={20} /></Card>),
  };
}
