import { describe, it, expect } from 'vitest';
import { isWithinWindow, windowFromSettings, testPercent, sessionDuration, studyReportSchema, overlaps, totalMinutes } from '@/lib/study';
import { tehranParts, todayTehran, weekStart, addDays, parseHM } from '@/lib/time';
import { toJalali, toGregorian, jalaliToIso } from '@/lib/jalali';

// Tehran = UTC+3:30
const at = (h: number, m: number) => new Date(Date.UTC(2026, 9, 7, h, m) - (3 * 60 + 30) * 60_000);
const w = windowFromSettings('08:00', '24:00');

describe('بازه‌ی مجاز ارسال گزارش', () => {
  it('قبل از ۸ صبح مجاز نیست', () => { expect(isWithinWindow(w, at(7, 59))).toBe(false); expect(isWithinWindow(w, at(0, 0))).toBe(false); });
  it('از ۸:۰۰ تا ۲۳:۵۹ مجاز است', () => { expect(isWithinWindow(w, at(8, 0))).toBe(true); expect(isWithinWindow(w, at(15, 30))).toBe(true); expect(isWithinWindow(w, at(23, 59))).toBe(true); });
  it('ساعت سرور اهمیتی ندارد، فقط وقت تهران', () => {
    const utc = new Date(Date.UTC(2026, 9, 7, 4, 30)); // = 08:00 تهران
    expect(isWithinWindow(w, utc)).toBe(true);
    expect(isWithinWindow(w, new Date(utc.getTime() - 60_000))).toBe(false);
  });
});

describe('زمان تهران', () => {
  it('تاریخ و ساعت درست محاسبه می‌شود', () => {
    const p = tehranParts(at(23, 30)); expect([p.h, p.min]).toEqual([23, 30]);
    expect(todayTehran(at(0, 10))).toBe('2026-10-07');
  });
  it('شروع هفته شنبه است', () => { expect(weekStart('2026-10-07')).toBe('2026-10-03'); expect(addDays('2026-10-31', 1)).toBe('2026-11-01'); });
  it('parseHM', () => { expect(parseHM('24:00')).toBe(1440); expect(parseHM('25:00')).toBeNull(); expect(parseHM('8:05')).toBe(485); });
});

describe('تست و مدت', () => {
  it('درصد با نمره‌ی منفی', () => { expect(testPercent(30, 0, 30)).toBe(100); expect(testPercent(25, 3, 30)).toBeCloseTo(((75 - 3) / 90) * 100, 1); expect(testPercent(0, 10, 10)).toBeLessThan(0); });
  it('مدت مطالعه', () => { expect(sessionDuration('18:00', '19:30')).toBe(90); expect(sessionDuration('19:00', '18:00')).toBeNull(); });
  it('همپوشانی', () => { expect(overlaps({ s: 60, e: 120 }, { s: 100, e: 150 })).toBe(true); expect(overlaps({ s: 60, e: 120 }, { s: 120, e: 150 })).toBe(false); });
});

describe('اعتبارسنجی گزارش چنددرسی', () => {
  const item = (o: object = {}) => ({ subjectId: 's1', studyMin: 30, testMin: 30, topic: 'درجه دوم', ...o });
  const base = (items: object[]) => ({ startTime: '18:00', endTime: '21:00', items });
  const t = (blank: number, dur = 30) => ({ source: 'گاج', totalCount: 30, correctCount: 20, wrongCount: 5, blankCount: blank, durationMin: dur });
  it('جمع تست‌ها باید برابر کل باشد', () => {
    expect(studyReportSchema.safeParse(base([item({ tests: [t(4)] })])).success).toBe(false);
    expect(studyReportSchema.safeParse(base([item({ tests: [t(5)] })])).success).toBe(true);
  });
  it('یک گزارش با دو درس و زمان‌های جدا', () => {
    const r = studyReportSchema.safeParse(base([item({ studyMin: 30, tests: [t(5, 30)] }), item({ subjectId: 's2', topic: 'آرایه‌ها', studyMin: 60, tests: [t(5, 60)] })]));
    expect(r.success).toBe(true);
    if (r.success) expect(totalMinutes(r.data.items)).toBe(180);
  });
  it('هر درس باید زمان داشته باشد', () => { expect(studyReportSchema.safeParse(base([item({ studyMin: 0, testMin: 0 })])).success).toBe(false); });
  it('درس تکراری یا گزارش بدون درس مجاز نیست', () => {
    expect(studyReportSchema.safeParse(base([item(), item()])).success).toBe(false);
    expect(studyReportSchema.safeParse(base([])).success).toBe(false);
  });
  it('شیوه‌ی مطالعه اختیاری است', () => { expect(studyReportSchema.safeParse(base([item({ methods: [] })])).success).toBe(true); });
});

describe('تقویم شمسی', () => {
  it('تبدیل‌ها', () => {
    expect(toJalali(2026, 10, 7)).toEqual({ y: 1405, m: 7, d: 15 });
    expect(toGregorian(1405, 1, 1)).toEqual({ y: 2026, m: 3, d: 21 });
    expect(jalaliToIso(1404, 12, 29)).toBe('2026-03-20');
  });
});

import { subjectAverages, overall, classRank } from '@/lib/report-card';
describe('کارنامه', () => {
  const g = (s: string, sub: string, sc: number, max = 20) => ({ studentId: s, subjectId: sub, subjectName: sub, score: sc, maxScore: max });
  const rows = [g('a', 'math', 18), g('a', 'math', 16), g('a', 'phys', 10), g('b', 'math', 12), g('b', 'phys', 14), g('c', 'math', 9, 10), g('c', 'phys', 14)];
  it('میانگین درس و معدل (مقیاس ۲۰)', () => { const a = subjectAverages(rows.filter((r) => r.studentId === 'a')); expect(a.get('math')!.avg).toBe(17); expect(overall(a)).toBe(13.5); expect(subjectAverages([g('c', 'm', 9, 10)]).get('m')!.avg).toBe(18); });
  it('رتبه و میانگین کلاس', () => { const r = classRank(rows, 'b', ['a', 'b', 'c']); expect(r!.of).toBe(3); expect(r!.rank).toBe(3); expect(classRank(rows, 'c', ['a', 'b', 'c'])!.rank).toBe(1); });
});

import { rankAll, meanOf, academicStartYear, monthPeriods, yearPeriod, periodResult } from '@/lib/report-card';
describe('رتبه‌بندی ماهانه و سالانه', () => {
  const g = (s: string, sub: string, sc: number, date: string) => ({ studentId: s, subjectId: sub, subjectName: sub, score: sc, maxScore: 20, date });
  it('رتبه‌ی رقابتی و میانگین گروه', () => {
    const r = rankAll([g('a', 'm', 18, ''), g('b', 'm', 18, ''), g('c', 'm', 10, '')], ['a', 'b', 'c', 'd']);
    expect(r.map((x) => x.rank)).toEqual([1, 1, 3]);           // d نمره ندارد → رتبه ندارد
    expect(meanOf(r)).toBe(15.33);
  });
  it('سال تحصیلی و ماه‌ها', () => {
    expect(academicStartYear('۱۴۰۵-۱۴۰۶', '2026-10-08')).toBe(1405);
    expect(academicStartYear('', '2026-10-08')).toBe(1405);
    const m = monthPeriods(1405); expect(m).toHaveLength(12); expect(m[0].label).toBe('مهر'); expect(m[0].from).toBe('2026-09-23'); expect(m[0].to).toBe('2026-10-22');
    expect(yearPeriod(1405).from).toBe('2026-09-23'); expect(yearPeriod(1405).to).toBe('2027-09-22');
  });
  it('نمره‌ی هر ماه فقط در همان ماه حساب می‌شود', () => {
    const rows = [g('a', 'm', 20, '2026-10-01'), g('a', 'm', 10, '2026-11-05'), g('b', 'm', 15, '2026-10-02'), g('b', 'm', 15, '2026-11-06')];
    const mehr = periodResult(rows, monthPeriods(1405)[0], ['a', 'b'], ['a', 'b'], 'a'); expect(mehr.myClass!.rank).toBe(1);
    const aban = periodResult(rows, monthPeriods(1405)[1], ['a', 'b'], ['a', 'b'], 'a'); expect(aban.myClass!.rank).toBe(2);
    const year = periodResult(rows, yearPeriod(1405), ['a', 'b'], ['a', 'b'], 'a'); expect(year.myClass!.rank).toBe(1); expect(year.myClass!.avg).toBe(15); expect(year.classAvg).toBe(15);
  });
});

import { subjectRanks } from '@/lib/report-card';
describe('رتبه‌ی هر درس', () => {
  const g = (s: string, sub: string, sc: number) => ({ studentId: s, subjectId: sub, subjectName: sub, score: sc, maxScore: 20 });
  it('رتبه‌ی کلاس و پایه برای هر درس جدا حساب می‌شود', () => {
    const rows = [g('a', 'math', 18), g('b', 'math', 16), g('c', 'math', 12), g('a', 'phys', 10), g('b', 'phys', 15), g('c', 'phys', 15), g('d', 'math', 20)];
    const r = subjectRanks(rows, ['a', 'b'], ['a', 'b', 'c', 'd'], 'a');
    const math = r.find((x) => x.subjectId === 'math')!; const phys = r.find((x) => x.subjectId === 'phys')!;
    expect(math.classRank).toBe(1); expect(math.classN).toBe(2); expect(math.gradeRank).toBe(2); expect(math.gradeN).toBe(4); expect(math.gradeAvg).toBe(16.5);
    expect(phys.classRank).toBe(2); expect(phys.gradeRank).toBe(3); expect(phys.classAvg).toBe(12.5);
  });
});

import { netByStudent, rankNet, classDiscipline, tally } from '@/lib/discipline-calc';
import { GRADE_LEVELS, gradeTitle, isKnownGrade } from '@/lib/grades';
describe('انضباط', () => {
  const n = (s: string, type: 'praise' | 'discipline' | 'note', date: string) => ({ studentId: s, type, date });
  const notes = [n('a', 'praise', '2026-10-01'), n('a', 'praise', '2026-10-02'), n('b', 'discipline', '2026-10-03'), n('c', 'note', '2026-10-03'), n('d', 'praise', '2026-11-30')];
  const p = { from: '2026-09-23', to: '2026-10-22' };
  it('امتیاز خالص و رتبه', () => {
    const net = netByStudent(notes, p); expect(net.get('a')).toBe(2); expect(net.get('b')).toBe(-1); expect(net.has('d')).toBe(false);
    expect(rankNet(net, ['a', 'b', 'c'], 'a')).toEqual({ rank: 1, of: 3 }); expect(rankNet(net, ['a', 'b', 'c'], 'c')).toEqual({ rank: 2, of: 3 }); expect(rankNet(net, ['a', 'b', 'c'], 'b')).toEqual({ rank: 3, of: 3 });
  });
  it('بهترین کلاس از نظر انضباط (میانگین به‌ازای هر نفر)', () => {
    const cls = [{ id: 'x', name: 'X', gradeLevel: 'دهم' }, { id: 'y', name: 'Y', gradeLevel: 'دهم' }, { id: 'z', name: 'Z', gradeLevel: 'دهم' }];
    const r = classDiscipline(notes, cls, new Map([['x', ['a', 'c']], ['y', ['b']], ['z', []]]), p);
    expect(r.map((x) => x.classId)).toEqual(['x', 'y']); expect(r[0].avgNet).toBe(1); expect(r[0].rank).toBe(1); expect(r[1].avgNet).toBe(-1);
  });
});

import { classGpaRanking, gpaTrend, disciplineTrend, buildPeriods } from '@/lib/trends';
describe('روندها و بهترین کلاس', () => {
  const g = (s: string, sc: number, date: string) => ({ studentId: s, subjectId: 'm', subjectName: 'm', score: sc, maxScore: 20, date });
  const per = buildPeriods('۱۴۰۵-۱۴۰۶', '2026-11-10'); // آبان ۱۴۰۵
  const d = {
    classes: [{ id: 'A', name: 'A', gradeLevel: 'دهم', academicYear: '' }, { id: 'B', name: 'B', gradeLevel: 'دهم', academicYear: '' }, { id: 'C', name: 'C', gradeLevel: 'یازدهم', academicYear: '' }],
    students: [{ id: 'a1', firstName: '', lastName: '', classId: 'A' }, { id: 'a2', firstName: '', lastName: '', classId: 'A' }, { id: 'b1', firstName: '', lastName: '', classId: 'B' }, { id: 'c1', firstName: '', lastName: '', classId: 'C' }],
    rows: [g('a1', 18, '2026-10-05'), g('a2', 14, '2026-10-05'), g('b1', 19, '2026-10-06'), g('c1', 20, '2026-10-06'), g('a1', 12, '2026-11-02'), g('b1', 18, '2026-11-02')],
    notes: [{ studentId: 'a1', type: 'praise' as const, date: '2026-10-07' }, { studentId: 'a1', type: 'discipline' as const, date: '2026-11-03' }, { studentId: 'a2', type: 'discipline' as const, date: '2026-11-03' }],
    today: '2026-11-10', ...per,
  };
  it('بهترین کلاس پایه (فقط کلاس‌های همان پایه)', () => {
    const r = classGpaRanking(d, 'دهم', d.year); expect(r.map((x) => x.classId)).toEqual(['B', 'A']); expect(r[0].avg).toBe(18.5); expect(r[1].avg).toBe(14.5); expect(r[1].rank).toBe(2);
  });
  it('روند معدل: محور همه‌ی ماه‌های سال تحصیلی؛ ماه‌های نیامده بدون مقدار', () => {
    const t = gpaTrend(d, { studentId: 'a1', classId: 'A', gradeLevel: 'دهم' });
    expect(t.labels.slice(0, 2)).toEqual(['مهر', 'آبان']); expect(t.labels).toHaveLength(9);
    expect(t.mine.slice(0, 2)).toEqual([18, 12]); expect(t.classAvg.slice(0, 2)).toEqual([16, 12]); expect(t.gradeAvg.slice(0, 2)).toEqual([17, 15]);
    expect(t.mine.slice(2).every((v) => v === null)).toBe(true);
  });
  it('روند انضباط', () => {
    const t = disciplineTrend(d, { studentId: 'a1', classId: 'A' }); expect(t.mine.slice(0, 2)).toEqual([1, -1]); expect(t.classAvg.slice(0, 2)).toEqual([0.5, -1]);
    expect(t.mine.slice(2).every((v) => v === null)).toBe(true);
  });
  it('نام پایه: فقط پایه‌های شناخته‌شده؛ نام کلاس مثل C1 هرگز به‌جای پایه نمایش داده نمی‌شود', () => {
    expect(gradeTitle('نهم')).toBe('پایه‌ی نهم'); expect(gradeTitle('C1')).toBe('پایه'); expect(gradeTitle(undefined)).toBe('پایه');
    expect(isKnownGrade('دوازدهم')).toBe(true); expect(isKnownGrade('C2')).toBe(false); expect(GRADE_LEVELS).toHaveLength(12);
  });
  it('جمع مثبت و منفی و باقی‌مانده: هر منفی یک مثبت را پاک می‌کند', () => {
    const t = tally([{ type: 'praise', count: 20 }, { type: 'discipline', count: 10 }, { type: 'note' }, { type: 'praise' }]);
    expect(t).toEqual({ praise: 21, negative: 10, left: 11 });
    expect(tally([{ type: 'praise', count: 2 }, { type: 'discipline', count: 5 }]).left).toBe(-3);
    expect(tally([]).left).toBe(0);
  });
  it('تعداد مثبت/منفی: هر یادداشت با تعدادش حساب می‌شود', () => {
    const notes = [{ studentId: 'x', type: 'praise' as const, date: '2026-10-01', count: 20 }, { studentId: 'x', type: 'discipline' as const, date: '2026-10-02', count: 10 }, { studentId: 'x', type: 'praise' as const, date: '2026-10-03' }];
    expect(netByStudent(notes, { from: '2026-10-01', to: '2026-10-31' }).get('x')).toBe(11);
  });
});

import { slotTimes, activeSlot, planSend } from '@/lib/reminder-calc';
describe('یادآور گزارش مطالعه', () => {
  const S = 8 * 60, E = 24 * 60;
  it('نوبت‌ها: ۹ شب و یک ساعت مانده به پایان', () => { expect(slotTimes(S, E)).toEqual([{ slot: 'evening', atMin: 1260 }, { slot: 'last-hour', atMin: 1380 }]); });
  it('پایان زودتر: ۹ شب حذف می‌شود اگر بعد از «یک ساعت مانده» باشد', () => { expect(slotTimes(S, 21 * 60 + 30)).toEqual([{ slot: 'last-hour', atMin: 20 * 60 + 30 }]); });
  it('نوبت فعال', () => { expect(activeSlot(20 * 60, S, E)).toBeNull(); expect(activeSlot(1260, S, E)).toBe('evening'); expect(activeSlot(1379, S, E)).toBe('evening'); expect(activeSlot(1380, S, E)).toBe('last-hour'); expect(activeSlot(1439, S, E)).toBe('last-hour'); expect(activeSlot(1440, S, E)).toBeNull(); expect(activeSlot(7 * 60, S, E)).toBeNull(); });
  it('زمان‌بند: هر نوبت یک‌بار؛ نوبت ازدست‌رفته علامت می‌خورد', () => {
    expect(planSend(1270, S, E, [])).toEqual({ send: 'evening', mark: [] });
    expect(planSend(1270, S, E, ['evening'])).toEqual({ send: null, mark: [] });
    expect(planSend(1385, S, E, [])).toEqual({ send: 'last-hour', mark: ['evening'] }); // سرور دیر بالا آمد: فقط یک اعلان
    expect(planSend(1385, S, E, ['evening'])).toEqual({ send: 'last-hour', mark: [] });
    expect(planSend(1385, S, E, ['evening', 'last-hour'])).toEqual({ send: null, mark: [] });
  });
});

import { dayBreakdown, rangeSummary } from '@/lib/no-study';
describe('عدم مطالعه', () => {
  const S = (id: string, r: string[], k: string[]) => ({ id, reportDays: new Set(r), skipDays: new Set(k) });
  const st = [S('a', ['d1', 'd2'], []), S('b', ['d1'], ['d2']), S('c', [], [])];
  it('وضعیت یک روز', () => { expect(dayBreakdown(st, 'd2')).toEqual({ studied: ['a'], declared: ['b'], unreported: ['c'] }); });
  it('خلاصه‌ی چند روز', () => { const r = rangeSummary(st, ['d1', 'd2']); expect(r.map((x) => x.id)).toEqual(['c', 'b']); expect(r[0].unreported).toEqual(['d1', 'd2']); expect(r[1].declared).toEqual(['d2']); });
});

import { analyze, type AdvInput, type AdvReport } from '@/lib/advisor';
describe('مشاور تحصیلی', () => {
  const subj = (id: string, name: string, classAvg: number) => ({ subjectId: id, name, classAvg, gradeAvg: classAvg, classRank: 3, classN: 20, teacherId: 't' + id, teacherName: 'معلم ' + name });
  const g = (id: string, v: number, date: string) => ({ subjectId: id, score20: v, date });
  const rep = (date: string, subjectId: string, min: number, extra: Partial<AdvReport> = {}): AdvReport => ({ date, startTime: '17:00', endTime: '18:00', durationMin: min, subjectId, mastery: 3, goalAchieved: null, tests: [], ...extra });
  const base = (o: Partial<AdvInput> = {}): AdvInput => ({ audience: 'student', firstName: 'سارا', today: '2026-10-10',
    grades: [g('m', 10, '2026-09-28'), g('m', 9, '2026-10-05'), g('p', 19, '2026-09-28'), g('p', 16, '2026-10-05'), g('c', 16, '2026-09-28'), g('c', 11, '2026-10-05')],
    subjects: [subj('m', 'ریاضی', 15), subj('p', 'فیزیک', 15), subj('c', 'شیمی', 15)], gpa: 13.8, classAvgGpa: 15, gpaRank: { rank: 12, of: 20 }, monthlyGpa: [14.5, 12.2],
    reports: [rep('2026-10-09', 'p', 90), rep('2026-10-08', 'p', 80)], skipDays: [], absences: 0, ...o });
  it('ضعف + مطالعه‌ی کم = توصیه‌ی افزایش زمان؛ افت = هشدار؛ نقطه‌ی قوت', () => {
    const a = analyze(base()); const ids = a.insights.map((i) => i.id);
    expect(ids).toContain('weak:m'); expect(ids).toContain('weak:c'); expect(ids).toContain('drop:p'); expect(ids).toContain('strong:p'); // شیمی: افت شدید زیر ۱۵ = ضعیف؛ فیزیک: افت متوسط ولی هنوز قوی
    const weak = a.insights.find((i) => i.id === 'weak:m')!; expect(weak.detail).toContain('حداقل ۳ جلسه'); expect(weak.teacher?.id).toBe('tm');
    expect(a.subjects.find((s) => s.subjectId === 'm')!.status).toBe('weak'); expect(a.trend.dir).toBe('down'); expect(ids).toContain('trend-down');
    expect(a.insights[0].priority).toBeGreaterThanOrEqual(a.insights[a.insights.length - 1].priority);
  });
  it('زمان زیاد ولی نمره‌ی پایین = مشکل روش', () => {
    const a = analyze(base({ reports: [rep('2026-10-09', 'm', 100), rep('2026-10-08', 'm', 100), rep('2026-10-07', 'm', 90), rep('2026-10-06', 'p', 30)] }));
    expect(a.insights.find((i) => i.id === 'weak:m')!.detail).toContain('روش');
  });
  it('برنامه: درس ضعیف جلسه‌ی بیشتر از درس قوی می‌گیرد', () => {
    const a = analyze(base()); const m = a.plan.rows.find((r) => r.subjectId === 'm')!; const p = a.plan.rows.find((r) => r.subjectId === 'p')!;
    expect(m.sessions).toBeGreaterThan(p.sessions); expect(a.plan.dailyMin).toBeGreaterThanOrEqual(60); expect(a.plan.dailyMin).toBeLessThanOrEqual(180);
    expect(a.goals.gpaTarget).toBeGreaterThan(13.8); expect(a.goals.subjects[0].name).toBe('ریاضی'); expect(a.goals.subjects[0].to).toBeGreaterThan(a.goals.subjects[0].from);
  });
  it('الگوها: مطالعه‌ی دیروقت، جلسه‌ی طولانی، تست‌های پر از غلط', () => {
    const t = { total: 20, correct: 8, wrong: 8, blank: 4, percent: 20 };
    const late = [1, 2, 3].map((d) => rep(`2026-10-0${d}`, 'p', 150, { endTime: '23:40', tests: [t] }));
    const a = analyze(base({ reports: late })); const ids = a.insights.map((i) => i.id);
    expect(ids).toContain('late-night'); expect(ids).toContain('long-sessions'); expect(ids).toContain('tests-wrong');
  });
  it('پایداری کم → هشدار؛ پایداری بالا → نقطه‌ی قوت', () => {
    expect(analyze(base()).insights.map((i) => i.id)).toContain('consistency-low');
    const many = Array.from({ length: 12 }, (_, i) => rep(`2026-09-${String(29 - (i < 6 ? 0 : 0)).padStart(2, '0')}`, 'p', 60));
    const days = ['2026-10-10', '2026-10-09', '2026-10-08', '2026-10-07', '2026-10-06', '2026-10-05', '2026-10-04', '2026-10-03', '2026-10-02', '2026-10-01', '2026-09-30', '2026-09-29'];
    expect(many.length).toBe(12); expect(analyze(base({ reports: days.map((d) => rep(d, 'p', 60)) })).insights.map((i) => i.id)).toContain('consistency-high');
  });
  it('خطاب: دانش‌آموز «تو»، ولی «فرزندتان/نام»؛ سؤال‌های گفتگو فقط برای ولی', () => {
    const s = analyze(base()); const p = analyze(base({ audience: 'parent' }));
    expect(s.headline).toContain('کنی'); expect(p.headline).toContain('سارا'); expect(s.questions).toHaveLength(0); expect(p.questions.length).toBe(3); expect(p.questions[0]).toContain('ریاضی'); expect(p.guide.title).toContain('والدین');
  });
  it('بدون هیچ گزارش مطالعه: حدس نمی‌زند «نامنظم است» و سطح را هشدار نمی‌کند', () => {
    const a = analyze(base({ reports: [], monthlyGpa: [14.2, 13.9] })); const ids = a.insights.map((i) => i.id);
    expect(ids).toContain('no-study-data'); expect(ids).not.toContain('consistency-low'); expect(ids).not.toContain('gap'); expect(a.level).not.toBe('alert');
    expect(a.trend.dir).toBe('flat'); // ۰٫۳ نمره تغییر = نوسان عادی
    expect(analyze(base({ reports: [], skipDays: ['2026-10-09'] })).insights.map((i) => i.id)).not.toContain('no-study-data'); // ولی «عدم مطالعه» ثبت کرده = داده دارد
  });
  it('داده‌ی ناکافی صادقانه گفته می‌شود', () => {
    const a = analyze(base({ grades: [], subjects: [], gpa: null, gpaRank: null, monthlyGpa: [], reports: [] }));
    expect(a.dataQuality).toBe('minimal'); expect(a.insights.map((i) => i.id)).toContain('data-min'); expect(a.insights.some((i) => i.id.startsWith('weak:'))).toBe(false);
  });
});

import { teacherWeek, teacherMatrix, periodsText, iranWeekday } from '@/lib/teacher-schedule';
describe('برنامه‌ی معلم', () => {
  const sl = (weekday: number, period: number, teacherId: string | null) => ({ weekday, period, classId: 'c', className: 'C', subject: 'ریاضی', room: null, teacherId });
  const slots = [sl(0, 1, 't1'), sl(0, 2, 't1'), sl(0, 3, 't1'), sl(2, 4, 't1'), sl(1, 1, 't2'), sl(3, 2, null)];
  it('روزهای حضور و بدون کلاس', () => { const w = teacherWeek(slots, 't1'); expect(w.presentDays).toEqual([0, 2]); expect(w.freeDays).toEqual([1, 3, 4, 5]); expect(w.totalPeriods).toBe(4); expect(w.days[2].periods[0].period).toBe(4); });
  it('ماتریس و متن زنگ‌ها', () => { const m = teacherMatrix(slots, ['t1', 't2']); expect(m[0].days[0]).toEqual([1, 2, 3]); expect(m[1].days[1]).toEqual([1]); expect(periodsText([1, 2, 3, 5], String)).toBe('1 تا 3 و 5'); expect(periodsText([2, 4], String)).toBe('2 و 4'); });
  it('روز هفته‌ی ایرانی', () => { expect(iranWeekday('2026-10-10')).toBe(0); /* شنبه */ expect(iranWeekday('2026-10-12')).toBe(2); /* دوشنبه */ expect(iranWeekday('2026-10-09')).toBe(6); /* جمعه */ });
});

import { sniffImage, normalizeMobile } from '@/lib/image-check';
describe('آپلود امن عکس و شماره‌ی موبایل', () => {
  const bytes = (...a: number[]) => new Uint8Array([...a, ...new Array(Math.max(0, 16 - a.length)).fill(0)]);
  it('نوع تصویر از روی محتوا تشخیص داده می‌شود', () => {
    expect(sniffImage(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe('image/jpeg');
    expect(sniffImage(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe('image/png');
    expect(sniffImage(new Uint8Array([...'RIFF'].map((c) => c.charCodeAt(0)).concat([0, 0, 0, 0], [...'WEBP'].map((c) => c.charCodeAt(0)))))).toBe('image/webp');
  });
  it('فایل‌های خطرناک/غیرتصویری رد می‌شوند (حتی با پسوند jpg)', () => {
    expect(sniffImage(new TextEncoder().encode('<script>alert(1)</script>....'))).toBeNull();
    expect(sniffImage(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>'))).toBeNull();
    expect(sniffImage(new TextEncoder().encode('GIF89a......'))).toBeNull(); expect(sniffImage(new Uint8Array(3))).toBeNull();
  });
  it('شماره‌ی موبایل ایران نرمال می‌شود', () => {
    expect(normalizeMobile('۰۹۱۲۳۴۵۶۷۸۹')).toBe('09123456789'); expect(normalizeMobile('+98 912 345 6789')).toBe('09123456789'); expect(normalizeMobile('0912-345-6789')).toBe('09123456789'); expect(normalizeMobile('9123456789')).toBe('09123456789');
    expect(normalizeMobile('0212345678')).toBeNull(); expect(normalizeMobile('091234')).toBeNull(); expect(normalizeMobile('abc')).toBeNull();
  });
});
