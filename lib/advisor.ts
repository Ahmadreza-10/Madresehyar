import { fa } from './format';
import { addDays } from './time';

/**
 * مشاور تحصیلی (تحلیل خودکار قاعده‌محور): نمرات + روند + زمان و روش مطالعه + تست‌ها + پایداری را کنار هم می‌سنجد
 * و توصیه‌های عددی و اولویت‌دار می‌دهد. هیچ داده‌ای به بیرون فرستاده نمی‌شود و نتیجه همیشه قابل توضیح است
 * (هر توصیه «شواهد» عددی‌اش را دارد). جایگزین مشاور انسانی نیست.
 */
export type Audience = 'student' | 'parent';
export type AdvGrade = { subjectId: string; score20: number; date: string };
export type AdvSubject = { subjectId: string; name: string; classAvg: number | null; gradeAvg: number | null; classRank: number | null; classN: number; teacherId?: string | null; teacherName?: string | null };
export type AdvTest = { total: number; correct: number; wrong: number; blank: number; percent: number };
export type AdvReport = { date: string; startTime: string; endTime: string; durationMin: number; subjectId: string; mastery: number; goalAchieved: boolean | null; tests: AdvTest[] };
export type AdvInput = {
  audience: Audience; firstName: string; today: string;
  grades: AdvGrade[]; subjects: AdvSubject[];
  gpa: number | null; classAvgGpa: number | null; gpaRank: { rank: number; of: number } | null;
  monthlyGpa: (number | null)[]; reports: AdvReport[]; skipDays: string[]; absences: number;
};

export type Level = 'excellent' | 'good' | 'attention' | 'alert';
export type Insight = { id: string; kind: 'strength' | 'risk' | 'action' | 'info'; title: string; detail: string; evidence?: string; priority: number; subjectId?: string; teacher?: { id: string; name: string } };
export type SubjectView = { subjectId: string; name: string; avg: number; last: number; delta: number | null; classGap: number | null; classRank: number | null; classN: number; status: 'weak' | 'ok' | 'strong'; volatile: boolean; study: { min: number; days: number; mastery: number | null } };
export type Analysis = {
  level: Level; headline: string; dataQuality: 'rich' | 'limited' | 'minimal';
  gpa: number | null; trend: { dir: 'up' | 'down' | 'flat' | 'unknown'; delta: number | null };
  study: { totalMin: number; activeDays14: number; activeDays30: number; avgDaily14: number; streak: number; longestGap: number; skipDays: number; consistency: number; lateNightDays: number; longSessions: number; goalRate: number | null; mastery: number | null; tests: { count: number; questions: number; avgPercent: number | null; wrongRate: number | null; blankRate: number | null; trend: number | null } };
  subjects: SubjectView[]; insights: Insight[];
  plan: { dailyMin: number; weeklyMin: number; studyDays: number; rows: { subjectId: string; name: string; weeklyMin: number; sessions: number; reason: string }[]; tips: string[] };
  goals: { gpaTarget: number | null; subjects: { name: string; from: number; to: number }[] };
  guide: { title: string; points: string[] }; questions: string[];
};

const r1 = (n: number) => Math.round(n * 10) / 10; const r2 = (n: number) => Math.round(n * 100) / 100;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const sd = (a: number[]) => { if (a.length < 2) return 0; const m = mean(a); return Math.sqrt(mean(a.map((x) => (x - m) ** 2))); };
const hm = (v: string) => { const [h, m] = v.split(':').map(Number); return h * 60 + (m || 0); };
const round5 = (n: number) => Math.round(n / 5) * 5;
const fmtMin = (m: number) => (m >= 60 ? `${fa(Math.floor(m / 60))} ساعت${m % 60 ? ` و ${fa(m % 60)} دقیقه` : ''}` : `${fa(Math.round(m))} دقیقه`);

export function analyze(inp: AdvInput): Analysis {
  const stu = inp.audience === 'student'; const T = (s: string, p: string) => (stu ? s : p); // «تو» یا «فرزندتان»
  const today = inp.today; const d14 = addDays(today, -13);

  // ---------- مطالعه (۳۰ روز اخیر) ----------
  const reps = inp.reports; const dates30 = new Set(reps.map((r) => r.date)); const dates14 = new Set(reps.filter((r) => r.date >= d14).map((r) => r.date));
  const min14 = reps.filter((r) => r.date >= d14).reduce((a, r) => a + r.durationMin, 0);
  const totalMin = reps.reduce((a, r) => a + r.durationMin, 0);
  const avgDaily14 = min14 / 14; let streak = 0; { let d = dates30.has(today) ? today : addDays(today, -1); while (dates30.has(d)) { streak++; d = addDays(d, -1); } }
  let longestGap = 0, gap = 0; for (let i = 13; i >= 0; i--) { if (dates30.has(addDays(today, -i))) gap = 0; else { gap++; longestGap = Math.max(longestGap, gap); } }
  const skipDays = inp.skipDays.filter((d) => d >= addDays(today, -29)).length;
  const consistency = Math.round(clamp((dates14.size / 14) * 60 + Math.min(avgDaily14 / 90, 1) * 40, 0, 100));
  const lateNight = new Set(reps.filter((r) => hm(r.endTime) >= 23 * 60).map((r) => r.date)).size; const longSessions = reps.filter((r) => r.durationMin > 120).length;
  const goalVals = reps.filter((r) => r.goalAchieved !== null); const goalRate = goalVals.length >= 3 ? goalVals.filter((r) => r.goalAchieved).length / goalVals.length : null;
  const mastery = reps.length ? mean(reps.map((r) => r.mastery)) : null;
  const tests = reps.flatMap((r) => r.tests.map((t) => ({ ...t, date: r.date })));
  const q = tests.reduce((a, t) => a + t.total, 0);
  const testSorted = [...tests].sort((a, b) => (a.date < b.date ? -1 : 1)); const half = Math.floor(testSorted.length / 2);
  const testTrend = testSorted.length >= 4 ? mean(testSorted.slice(half).map((t) => t.percent)) - mean(testSorted.slice(0, half).map((t) => t.percent)) : null;
  const tstat = { count: tests.length, questions: q, avgPercent: tests.length ? r1(mean(tests.map((t) => t.percent))) : null, wrongRate: q ? tests.reduce((a, t) => a + t.wrong, 0) / q : null, blankRate: q ? tests.reduce((a, t) => a + t.blank, 0) / q : null, trend: testTrend === null ? null : r1(testTrend) };

  // ---------- درس‌ها ----------
  const subjects: SubjectView[] = [];
  for (const s of inp.subjects) {
    const g = inp.grades.filter((x) => x.subjectId === s.subjectId).sort((a, b) => (a.date < b.date ? -1 : 1)); if (!g.length) continue;
    const vals = g.map((x) => x.score20); const avg = r2(mean(vals)); const last = vals[vals.length - 1];
    const delta = vals.length >= 2 ? r1(last - mean(vals.slice(0, -1))) : null; const classGap = s.classAvg === null ? null : r1(avg - s.classAvg);
    const rs = reps.filter((r) => r.subjectId === s.subjectId);
    const status: SubjectView['status'] = avg < 12 || (avg < 15 && classGap !== null && classGap <= -2) || (delta !== null && delta <= -3 && last < 15) ? 'weak' : avg >= 17 && (classGap === null || classGap >= -0.5) ? 'strong' : 'ok';
    subjects.push({ subjectId: s.subjectId, name: s.name, avg, last, delta, classGap, classRank: s.classRank, classN: s.classN, status, volatile: vals.length >= 3 && sd(vals) >= 3, study: { min: rs.reduce((a, r) => a + r.durationMin, 0), days: new Set(rs.map((r) => r.date)).size, mastery: rs.length ? r1(mean(rs.map((r) => r.mastery))) : null } });
  }
  const sinfo = new Map(inp.subjects.map((s) => [s.subjectId, s])); const medianStudy = [...subjects.map((s) => s.study.min)].sort((a, b) => a - b)[Math.floor(subjects.length / 2)] ?? 0;

  // ---------- روند معدل ----------
  const mv = inp.monthlyGpa.filter((x): x is number => x !== null); let trendDelta: number | null = null;
  if (mv.length >= 2) trendDelta = r1(mv[mv.length - 1] - mv[mv.length - 2]);
  else if (inp.grades.length >= 6) { const sorted = [...inp.grades].sort((a, b) => (a.date < b.date ? -1 : 1)); const h = Math.floor(sorted.length / 2); trendDelta = r1(mean(sorted.slice(h).map((x) => x.score20)) - mean(sorted.slice(0, h).map((x) => x.score20))); }
  const trendDir: Analysis['trend']['dir'] = trendDelta === null ? 'unknown' : trendDelta >= 1 ? 'up' : trendDelta <= -1 ? 'down' : 'flat'; // تغییر کمتر از ۱ نمره نوسان عادی است

  const dataQuality: Analysis['dataQuality'] = inp.grades.length >= 6 && dates30.size >= 6 ? 'rich' : inp.grades.length >= 3 || dates30.size >= 3 ? 'limited' : 'minimal';

  // ---------- سطح کلی ----------
  const g0 = inp.gpa; let pts = g0 === null ? 1 : g0 >= 17 ? 3 : g0 >= 15 ? 2 : g0 >= 12 ? 1 : 0;
  pts += trendDir === 'up' ? 0.5 : trendDir === 'down' ? -1 : 0;
  const hasStudy = reps.length > 0 || skipDays > 0; // بدون هیچ گزارش مطالعه، «ثبات» را قضاوت نمی‌کنیم (شاید فقط گزارش ثبت نشده)
  if (hasStudy) pts += consistency < 35 ? -1 : consistency >= 70 ? 0.5 : 0;
  const level: Level = pts >= 3 ? 'excellent' : pts >= 1.5 ? 'good' : pts >= 0.5 ? 'attention' : 'alert';
  const headline = ({
    excellent: T('عملکردت عالی است؛ حالا هدف «حفظ و ارتقا»ی همین سطح است.', `عملکرد ${inp.firstName} عالی است؛ هدف حالا «حفظ و ارتقا»ی همین سطح است.`),
    good: T('وضعیتت خوب است و جای پیشرفت جدی دارد؛ با چند اصلاح هدفمند می‌توانی یک پله بالاتر بروی.', `وضعیت ${inp.firstName} خوب است و جای پیشرفت جدی دارد؛ با چند اصلاح هدفمند می‌تواند یک پله بالاتر برود.`),
    attention: T('چند نکته‌ی مهم هست که اگر همین حالا اصلاح شوند، نتیجه‌ات به‌سرعت بهتر می‌شود.', `چند نکته‌ی مهم هست که اگر همین حالا اصلاح شوند، نتیجه‌ی ${inp.firstName} به‌سرعت بهتر می‌شود.`),
    alert: T('الان لازم است جدی برنامه‌ریزی کنی؛ خبر خوب این است که با چند گام کوچک و منظم می‌شود مسیر را عوض کرد.', `الان لازم است با ${inp.firstName} جدی برنامه‌ریزی کنید؛ خبر خوب این است که با چند گام کوچک و منظم می‌شود مسیر را عوض کرد.`),
  } as const)[level];

  // ---------- توصیه‌ها ----------
  const ins: Insight[] = []; const add = (i: Insight) => ins.push(i);
  const teacherOf = (id: string) => { const s = sinfo.get(id); return s?.teacherId ? { id: s.teacherId, name: s.teacherName ?? 'معلم درس' } : undefined; };
  const weak = subjects.filter((s) => s.status === 'weak').sort((a, b) => a.avg - b.avg);
  const shareMin = (s: SubjectView) => (totalMin ? s.study.min / totalMin : 0);

  weak.forEach((s, i) => {
    const ev = `میانگین ${fa(s.avg)}${s.classGap !== null ? ` (${s.classGap < 0 ? `${fa(Math.abs(s.classGap))} کمتر` : `${fa(s.classGap)} بیشتر`} از میانگین کلاس)` : ''}${s.delta !== null ? `؛ آخرین نمره ${fa(s.last)} در برابر میانگین قبلی ${fa(r1(s.last - s.delta))}` : ''}`;
    const lowStudy = s.study.min < 60 || (shareMin(s) < 0.1 && s.study.min < medianStudy);
    const highStudy = s.study.min >= Math.max(150, medianStudy) && !lowStudy;
    const testsHere = reps.filter((r) => r.subjectId === s.subjectId).flatMap((r) => r.tests); const tp = testsHere.length ? mean(testsHere.map((t) => t.percent)) : null;
    let detail: string;
    const little = s.study.min === 0 ? `هیچ مطالعه‌ای برای ${s.name} ثبت نشده` : `فقط ${fmtMin(s.study.min)} برای ${s.name} مطالعه ثبت شده`;
    if (lowStudy) detail = T(`در ۳۰ روز اخیر ${little}؛ این با نمره‌ی پایین‌ات هماهنگ است. حداقل ۳ جلسه‌ی ۴۰ تا ۴۵ دقیقه‌ای در هفته برایش بگذار و اولین جلسه را به مرور مبحثی ببر که نمره‌ی اخیرت را پایین آورده.`, `در ۳۰ روز اخیر ${little}؛ این با نمره‌ی پایین هماهنگ است. پیشنهاد: حداقل ۳ جلسه‌ی ۴۰ تا ۴۵ دقیقه‌ای در هفته برای این درس، که جلسه‌ی اول صرف مرور مبحثی شود که نمره‌ی اخیر را پایین آورده.`);
    else if (highStudy) detail = T(`زمان مطالعه‌ی ${s.name} کم نیست (${fmtMin(s.study.min)} در ۳۰ روز) ولی نمره بالا نمی‌رود؛ یعنی مشکل «روش» است نه «مقدار». به‌جای دوباره‌خوانی، بعد از هر مبحث ۱۰ تا ۱۵ سؤال بدون نگاه به جزوه حل کن، اشتباه‌ها را در یک دفتر «خطا» بنویس و هر هفته همان‌ها را دوباره بزن.`, `زمان مطالعه‌ی ${s.name} کم نیست (${fmtMin(s.study.min)} در ۳۰ روز) ولی نمره بالا نمی‌رود؛ یعنی مشکل «روش» است نه «مقدار». پیشنهاد: به‌جای دوباره‌خوانی، بعد از هر مبحث ۱۰ تا ۱۵ سؤال بدون نگاه به جزوه، دفتر «خطا» برای اشتباه‌ها و تکرار هفتگی همان‌ها.`);
    else detail = T(`برای ${s.name} روی «مبحث‌های ضعیف» تمرکز کن: فهرست سرفصل‌ها را بنویس، کنار هر کدام یک نمره‌ی ۱ تا ۵ برای تسلطت بگذار و از پایین‌ترین‌ها شروع کن.`, `برای ${s.name} روی «مبحث‌های ضعیف» تمرکز کنید: با ${inp.firstName} فهرست سرفصل‌ها را بنویسید، تسلط هر کدام را از ۱ تا ۵ نمره بدهید و از پایین‌ترین‌ها شروع کنید.`);
    if (tp !== null && tp < 35) detail += T(` درصد تست‌هایت در این درس هم پایین است (${fa(r1(tp))}٪)؛ قبل از تست‌ زدنِ بیشتر، درس‌نامه را با مثال‌های حل‌شده مرور کن تا مفهوم جا بیفتد.`, ` درصد تست‌ها در این درس هم پایین است (${fa(r1(tp))}٪)؛ پیش از تست‌ زدن بیشتر، مرور درس‌نامه با مثال‌های حل‌شده لازم است.`);
    if (s.study.mastery !== null && s.study.mastery >= 4 && s.avg < 13) detail += T(` نکته: خودت تسلطت را حدود ${fa(s.study.mastery)} از ۵ ثبت کرده‌ای ولی نتیجه پایین‌تر است؛ اعتماد‌به‌نفس را با آزمون‌های واقعی بسنج.`, ` نکته: تسلط ثبت‌شده حدود ${fa(s.study.mastery)} از ۵ است ولی نتیجه پایین‌تر؛ بهتر است با آزمون‌های واقعی سنجیده شود.`);
    add({ id: `weak:${s.subjectId}`, kind: 'risk', title: `${s.name}: نیاز به توجه ${i === 0 ? 'ویژه' : ''}`.trim(), detail, evidence: ev, priority: 100 - i * 6 - Math.max(0, s.avg), subjectId: s.subjectId, teacher: teacherOf(s.subjectId) });
  });
  for (const s of subjects.filter((x) => x.status !== 'weak' && x.delta !== null && x.delta <= -2.5)) {
    add({ id: `drop:${s.subjectId}`, kind: 'risk', title: `افت اخیر در ${s.name}`, detail: T(`آخرین نمره‌ات ${fa(s.last)} بوده در حالی که معمولاً حدود ${fa(r1(s.last - (s.delta as number)))} می‌گرفتی. همین امروز پیدا کن کدام مبحث یا چه اشتباهی باعثش شد و یک جلسه‌ی مرور برایش بگذار؛ افت‌های کوچک وقتی زود گرفته شوند راحت جبران می‌شوند.`, `آخرین نمره ${fa(s.last)} بوده در حالی که معمولاً حدود ${fa(r1(s.last - (s.delta as number)))} بوده. بهتر است با ${inp.firstName} (و در صورت نیاز با معلم) بررسی شود کدام مبحث یا چه اشتباهی باعثش شد؛ افت‌های کوچک وقتی زود گرفته شوند راحت جبران می‌شوند.`), evidence: `افت ${fa(Math.abs(s.delta as number))} نمره نسبت به میانگین قبلی`, priority: 70 + Math.abs(s.delta as number), subjectId: s.subjectId, teacher: teacherOf(s.subjectId) });
  }
  for (const s of subjects.filter((x) => x.volatile && x.status !== 'weak')) add({ id: `volatile:${s.subjectId}`, kind: 'info', title: `نوسان نمره در ${s.name}`, detail: T('نمره‌هایت در این درس بالا و پایین می‌شود؛ معمولاً یعنی مبحث‌ها را یکنواخت مرور نمی‌کنی. مرور هفتگی کوتاه (۲۰ تا ۳۰ دقیقه) همه‌ی مباحث گذشته را یکنواخت‌تر می‌کند.', 'نمره‌ها در این درس بالا و پایین می‌شود؛ معمولاً یعنی مباحث یکنواخت مرور نمی‌شوند. مرور هفتگی کوتاه (۲۰ تا ۳۰ دقیقه) از همه‌ی مباحث گذشته کمک می‌کند.'), priority: 30, subjectId: s.subjectId });

  // پایداری مطالعه
  if (!hasStudy) add({ id: 'no-study-data', kind: 'action', title: 'گزارش مطالعه‌ای ثبت نشده است', detail: T('در ۳۰ روز اخیر هیچ گزارش مطالعه‌ای برایت ثبت نشده؛ برای همین نمی‌توانم زمان و روش مطالعه‌ات را تحلیل کنم. اگر مطالعه می‌کنی، از ولی‌ات بخواه هر شب گزارش را ثبت کند (حتی ۲۰ دقیقه)؛ اگر مطالعه نداشتی، همان را هم ثبت کنند. با چند روز گزارش، توصیه‌ها خیلی دقیق‌تر می‌شود.', `در ۳۰ روز اخیر هیچ گزارش مطالعه‌ای برای ${inp.firstName} ثبت نشده؛ برای همین امکان تحلیل زمان و روش مطالعه نیست. لطفاً گزارش روزانه را ثبت کنید (حتی ۲۰ دقیقه)؛ و اگر مطالعه نداشته، «عدم مطالعه» را ثبت کنید. با چند روز گزارش، توصیه‌ها بسیار دقیق‌تر می‌شود.`), priority: 88 });
  if (hasStudy) {
    if (dates14.size <= 5) add({ id: 'consistency-low', kind: 'risk', title: 'مطالعه منظم نیست', detail: T(`در ۱۴ روز اخیر فقط ${fa(dates14.size)} روز مطالعه ثبت شده. «ثبات» از «مقدار» مهم‌تر است: ۴۵ دقیقه‌ی هر روز بهتر از ۳ ساعت در هفته است. یک ساعت ثابت (مثلاً بعد از شام) انتخاب کن و حتی در روزهای شلوغ، حداقل ۲۰ دقیقه بخوان.`, `در ۱۴ روز اخیر فقط ${fa(dates14.size)} روز مطالعه ثبت شده. «ثبات» از «مقدار» مهم‌تر است: ۴۵ دقیقه‌ی هر روز بهتر از ۳ ساعت در هفته است. پیشنهاد: یک ساعت ثابت (مثلاً بعد از شام) و حداقل ۲۰ دقیقه حتی در روزهای شلوغ.`), evidence: `${fa(dates14.size)} روز از ۱۴ روز • شاخص ثبات ${fa(consistency)} از ۱۰۰`, priority: 90 });
    if (longestGap >= 3) add({ id: 'gap', kind: 'risk', title: `وقفه‌ی ${fa(longestGap)} روزه در مطالعه`, detail: T('وقفه‌های چندروزه یادگیری را «صفر» می‌کنند و برگشتن سخت می‌شود. قانون ساده: هیچ‌وقت دو روز پشت‌سرهم مطالعه را کامل رها نکن.', 'وقفه‌های چندروزه یادگیری را عملاً صفر می‌کنند و برگشتن سخت می‌شود. قانون ساده: هیچ‌وقت دو روز پشت‌سرهم مطالعه کاملاً رها نشود.'), priority: 55 });
    if (skipDays >= 3) add({ id: 'skips', kind: 'info', title: `${fa(skipDays)} روز «عدم مطالعه» در ۳۰ روز اخیر`, detail: T('اگر دلیلش خستگی یا برنامه‌ی شلوغ است، به‌جای حذف کامل، یک جلسه‌ی ۲۰ دقیقه‌ای سبک بگذار؛ نمی‌گذارد زنجیره بشکند.', 'اگر دلیلش خستگی یا برنامه‌ی شلوغ است، به‌جای حذف کامل، یک جلسه‌ی سبک ۲۰ دقیقه‌ای پیشنهاد دهید؛ زنجیره‌ی مطالعه را نگه می‌دارد.'), priority: 40 });
  }
  if (lateNight >= 3) add({ id: 'late-night', kind: 'risk', title: 'مطالعه‌ی دیروقت (بعد از ساعت ۲۳)', detail: T(`در ${fa(lateNight)} روز مطالعه‌ات بعد از ساعت ۲۳ تمام شده. خواب کافی (برای نوجوانان معمولاً حدود ۸ تا ۱۰ ساعت) خودش بخشی از یادگیری است؛ مطالعه‌ی دیروقت معمولاً بازده کمی دارد. سعی کن مطالعه‌ی سخت را زودتر در عصر انجام بدهی.`, `در ${fa(lateNight)} روز مطالعه بعد از ساعت ۲۳ تمام شده. خواب کافی (برای نوجوانان معمولاً حدود ۸ تا ۱۰ ساعت) بخشی از یادگیری است و مطالعه‌ی دیروقت بازده کمی دارد. بهتر است مطالعه‌ی سخت به عصر منتقل شود.`), evidence: `${fa(lateNight)} روز`, priority: 60 });
  if (longSessions >= 2) add({ id: 'long-sessions', kind: 'action', title: 'جلسه‌های خیلی طولانی', detail: T(`${fa(longSessions)} جلسه‌ی بیش از ۲ ساعت پیوسته داشته‌ای. تمرکز بعد از حدود ۴۵ تا ۵۰ دقیقه افت می‌کند؛ جلسه‌ها را به بلوک‌های ۴۵ دقیقه‌ای با ۱۰ دقیقه استراحت تقسیم کن و در استراحت از گوشی دور باش.`, `${fa(longSessions)} جلسه‌ی بیش از ۲ ساعت پیوسته ثبت شده. تمرکز بعد از حدود ۴۵ تا ۵۰ دقیقه افت می‌کند؛ پیشنهاد: بلوک‌های ۴۵ دقیقه‌ای با ۱۰ دقیقه استراحت (بدون گوشی).`), priority: 35 });
  if (tstat.count >= 3 && tstat.wrongRate !== null && tstat.blankRate !== null) {
    if (tstat.wrongRate >= 0.25 && tstat.wrongRate > tstat.blankRate) add({ id: 'tests-wrong', kind: 'risk', title: 'پاسخ‌های غلط در تست‌ها زیاد است', detail: T(`حدود ${fa(Math.round(tstat.wrongRate * 100))}٪ سؤال‌های تست‌هایت غلط بوده. با نمره‌ی منفی، حدس‌های بی‌پشتوانه درصدت را پایین می‌آورد. فقط وقتی حدود ۷۰٪ مطمئنی جواب بده، سؤال مشکوک را علامت بزن و در پایان اگر وقت ماند برگرد.`, `حدود ${fa(Math.round(tstat.wrongRate * 100))}٪ سؤال‌های تست‌ها غلط بوده. با نمره‌ی منفی، حدس‌های بی‌پشتوانه درصد را پایین می‌آورد. پیشنهاد: فقط در صورت اطمینان تقریبی ۷۰٪ پاسخ دادن و علامت‌گذاری سؤال‌های مشکوک.`), evidence: `${fa(tstat.questions)} سؤال در ${fa(tstat.count)} تست`, priority: 65 });
    if (tstat.blankRate >= 0.4) add({ id: 'tests-blank', kind: 'risk', title: 'سؤال‌های نزده زیاد است', detail: T(`${fa(Math.round(tstat.blankRate * 100))}٪ سؤال‌ها بی‌پاسخ مانده؛ یا زمان‌بندی مشکل دارد یا مباحثی هنوز جا نیفتاده‌اند. بعد از هر آزمون، سؤال‌های نزده را بدون محدودیت زمان حل کن و دلیل نزدنشان را بنویس («بلد نبودم» یا «وقت نشد»).`, `${fa(Math.round(tstat.blankRate * 100))}٪ سؤال‌ها بی‌پاسخ مانده؛ یا مدیریت زمان مشکل دارد یا مباحثی هنوز جا نیفتاده‌اند. پیشنهاد: بعد از هر آزمون، سؤال‌های نزده بدون محدودیت زمان حل شوند و دلیل نزدنشان نوشته شود («بلد نبود» یا «وقت نشد»).`), priority: 50 });
    if (tstat.avgPercent !== null && tstat.avgPercent < 30 && tstat.count >= 5) add({ id: 'tests-low', kind: 'action', title: 'تعداد تست زیاد، درصد پایین', detail: T('تست‌ها فقط وقتی کمک می‌کنند که بعدشان «تحلیل خطا» باشد. تعداد را کم کن و روی تحلیل هر غلط وقت بگذار: چرا غلط شد؟ مفهوم؟ محاسبه؟ دقت؟', 'تست‌ها وقتی کمک می‌کنند که بعدشان «تحلیل خطا» باشد. بهتر است تعداد کم شود و روی تحلیل هر غلط وقت گذاشته شود: مفهوم؟ محاسبه؟ دقت؟'), evidence: `میانگین درصد ${fa(tstat.avgPercent)}٪`, priority: 45 });
    if (tstat.trend !== null && tstat.trend >= 5) add({ id: 'tests-up', kind: 'strength', title: 'درصد تست‌ها رو به بهبود است', detail: T(`درصد تست‌هایت در این مدت حدود ${fa(Math.round(tstat.trend))} واحد بالا رفته. روش فعلی‌ات جواب می‌دهد؛ همین را ادامه بده.`, `درصد تست‌ها در این مدت حدود ${fa(Math.round(tstat.trend))} واحد بالا رفته؛ روش فعلی جواب می‌دهد و ارزش حفظ دارد.`), priority: 25 });
  }
  if (goalRate !== null && goalRate < 0.5) add({ id: 'goals-low', kind: 'action', title: 'هدف‌های مطالعه کم‌تر از نیمی محقق می‌شود', detail: T('هدف‌هایت احتمالاً بزرگ یا مبهم‌اند. هدف را کوچک و قابل‌اندازه‌گیری بنویس: «۱۵ سؤال فصل ۲ را حل می‌کنم» به‌جای «فصل ۲ را می‌خوانم».', 'هدف‌ها احتمالاً بزرگ یا مبهم‌اند. بهتر است کوچک و قابل‌اندازه‌گیری نوشته شوند: «۱۵ سؤال فصل ۲» به‌جای «خواندن فصل ۲».'), evidence: `${fa(Math.round(goalRate * 100))}٪ هدف‌ها محقق شده`, priority: 38 });
  if (inp.absences >= 5) add({ id: 'absences', kind: 'info', title: `${fa(inp.absences)} غیبت/تأخیر ثبت شده`, detail: T('مطالب جلسه‌هایی که نبوده‌ای را از هم‌کلاسی‌ها یا معلم بگیر و یک جلسه برای جبرانشان بگذار.', 'مطالب جلسه‌هایی که غایب بوده، باید از هم‌کلاسی‌ها یا معلم گرفته و یک جلسه برای جبرانشان گذاشته شود.'), priority: 33 });

  // نقاط قوت
  for (const s of subjects.filter((x) => x.status === 'strong').sort((a, b) => b.avg - a.avg).slice(0, 3)) add({ id: `strong:${s.subjectId}`, kind: 'strength', title: `${s.name}: نقطه‌ی قوت`, detail: T(`میانگینت ${fa(s.avg)} است${s.classRank ? ` و رتبه‌ی ${fa(s.classRank)} از ${fa(s.classN)} را در کلاس داری` : ''}. برای حفظ آن، هفته‌ای یک مرور کوتاه کافی است؛ وقت اضافه را به درس‌های ضعیف‌تر بده.`, `میانگین ${fa(s.avg)} است${s.classRank ? ` و رتبه‌ی ${fa(s.classRank)} از ${fa(s.classN)} در کلاس` : ''}. برای حفظ آن، هفته‌ای یک مرور کوتاه کافی است و وقت اضافه را می‌شود به درس‌های ضعیف‌تر داد.`), priority: 20, subjectId: s.subjectId });
  for (const s of subjects.filter((x) => x.delta !== null && x.delta >= 2 && x.status !== 'weak').slice(0, 2)) add({ id: `up:${s.subjectId}`, kind: 'strength', title: `پیشرفت در ${s.name}`, detail: T(`آخرین نمره‌ات (${fa(s.last)}) از میانگین قبلی‌ات بالاتر است. ببین در این درس چه کار متفاوتی کردی و در درس‌های دیگر هم تکرارش کن.`, `آخرین نمره (${fa(s.last)}) از میانگین قبلی بالاتر است؛ ارزش دارد بپرسید چه کار متفاوتی کرده تا در درس‌های دیگر هم تکرار شود.`), priority: 18, subjectId: s.subjectId });
  if (dates14.size >= 11) add({ id: 'consistency-high', kind: 'strength', title: 'ثبات مطالعه عالی است', detail: T(`در ${fa(dates14.size)} روز از ۱۴ روز اخیر مطالعه کرده‌ای؛ همین عادت، بیشترین سهم را در موفقیت بلندمدت دارد.`, `در ${fa(dates14.size)} روز از ۱۴ روز اخیر مطالعه ثبت شده؛ همین عادت بیشترین سهم را در موفقیت بلندمدت دارد و باید تشویق شود.`), priority: 22 });
  if (inp.gpaRank && inp.gpaRank.of >= 5 && inp.gpaRank.rank <= Math.ceil(inp.gpaRank.of * 0.1)) add({ id: 'rank-top', kind: 'strength', title: 'در میان برترین‌های کلاس', detail: T(`رتبه‌ی ${fa(inp.gpaRank.rank)} از ${fa(inp.gpaRank.of)} در کلاس.`, `رتبه‌ی ${fa(inp.gpaRank.rank)} از ${fa(inp.gpaRank.of)} در کلاس.`), priority: 21 });
  if (trendDir === 'down') add({ id: 'trend-down', kind: 'risk', title: 'روند معدل رو به کاهش است', detail: T(`معدلت نسبت به دوره‌ی قبل حدود ${fa(Math.abs(trendDelta as number))} نمره پایین آمده. قبل از اینکه ادامه پیدا کند، دلیلش را پیدا کن: کم‌شدن زمان مطالعه؟ درس خاصی؟ کم‌خوابی؟ مسائل بیرون از درس؟ اگر نمی‌دانی، از معلم یا مشاور مدرسه کمک بگیر.`, `معدل نسبت به دوره‌ی قبل حدود ${fa(Math.abs(trendDelta as number))} نمره پایین آمده. بهتر است قبل از ادامه‌ی این روند دلیلش بررسی شود: کم‌شدن زمان مطالعه؟ درس خاص؟ کم‌خوابی؟ مسائل بیرون از درس؟ در صورت نیاز با معلم یا مشاور مدرسه صحبت کنید.`), evidence: `تغییر معدل: ${fa(trendDelta as number)}`, priority: 85 });
  if (trendDir === 'up') add({ id: 'trend-up', kind: 'strength', title: 'روند معدل رو به بهبود است', detail: T(`معدلت حدود ${fa(trendDelta as number)} نمره بالا رفته؛ ادامه بده و مطالعه‌ات را همین‌قدر منظم نگه دار.`, `معدل حدود ${fa(trendDelta as number)} نمره بالا رفته؛ تشویق و حفظ نظم فعلی مهم است.`), priority: 24 });
  if (dataQuality === 'minimal') add({ id: 'data-min', kind: 'info', title: 'داده‌ی کافی برای تحلیل دقیق نیست', detail: T('هنوز نمره یا گزارش مطالعه‌ی کافی ثبت نشده. هر چه گزارش‌ها منظم‌تر ثبت شود (حتی ۲۰ دقیقه)، تحلیل دقیق‌تر می‌شود. فعلاً روی ساختن عادت روزانه تمرکز کن.', 'هنوز نمره یا گزارش مطالعه‌ی کافی ثبت نشده. هر چه گزارش‌ها منظم‌تر ثبت شوند (حتی ۲۰ دقیقه)، تحلیل دقیق‌تر می‌شود. فعلاً روی ساختن عادت روزانه تمرکز کنید.'), priority: 95 });
  else if (dataQuality === 'limited') add({ id: 'data-limited', kind: 'info', title: 'تحلیل بر اساس داده‌ی محدود است', detail: 'برای نتیجه‌ی دقیق‌تر، چند هفته‌ی دیگر گزارش و نمره جمع شود؛ این توصیه‌ها را «جهت‌نما» ببینید، نه حکم قطعی.', priority: 15 });
  ins.sort((a, b) => b.priority - a.priority);

  // ---------- برنامه‌ی پیشنهادی ----------
  const studyDays = 6;
  const dailyMin = avgDaily14 > 0 ? clamp(round5(avgDaily14 * 1.15), 60, 180) : 90;
  const weeklyMin = dailyMin * studyDays;
  const pool = subjects.length ? subjects : inp.subjects.map((s) => ({ subjectId: s.subjectId, name: s.name, avg: 14, last: 14, delta: null, classGap: null, classRank: null, classN: 0, status: 'ok' as const, volatile: false, study: { min: 0, days: 0, mastery: null } }));
  const weights = pool.map((s) => clamp(18 - s.avg, 1, 9) + (s.status === 'weak' ? 2 : 0) + (s.delta !== null && s.delta <= -3 ? 1.5 : 0) + (s.classGap !== null && s.classGap < -1.5 ? 1 : 0));
  const wsum = weights.reduce((a, b) => a + b, 0) || 1;
  const rows = pool.map((s, i) => { const raw = (weeklyMin * weights[i]) / wsum; const sessions = Math.max(1, Math.round(raw / 45)); return { subjectId: s.subjectId, name: s.name, sessions, weeklyMin: sessions * 45, reason: s.status === 'weak' ? 'درس ضعیف: اولویت بالا' : s.status === 'strong' ? 'درس قوی: مرور نگهدارنده' : 'درس متوسط: تمرین منظم' }; }).sort((a, b) => b.sessions - a.sessions);
  const planTips = [
    T('درس سخت‌تر را در ساعت‌هایی بخوان که تمرکزت بیشتر است (معمولاً اول جلسه)، و درس سبک‌تر را آخر.', 'درس سخت‌تر در ساعت‌هایی که تمرکز بیشتر است (اول جلسه) و درس سبک‌تر آخر مطالعه شود.'),
    'هر جلسه ۴۵ دقیقه + ۱۰ دقیقه استراحت بدون گوشی.',
    'در هر هفته یک روز کامل استراحت بگذارید (مثلاً جمعه) و آخر هفته ۳۰ دقیقه برای مرور اشتباه‌های هفته کنار بگذارید.',
    T('گزارش مطالعه را هر شب ثبت کن؛ دیدن زنجیره‌ی روزها خودش انگیزه می‌دهد.', 'ثبت گزارش مطالعه هر شب انجام شود؛ دیدن زنجیره‌ی روزها انگیزه می‌دهد.'),
  ];

  // ---------- هدف‌گذاری ----------
  const gpaTarget = g0 === null ? null : g0 >= 19 ? 20 : Math.min(20, Math.round((g0 + (g0 < 12 ? 1.5 : g0 < 15 ? 1 : g0 < 17 ? 0.75 : 0.5)) * 4) / 4);
  const subjectTargets = [...subjects].filter((s) => s.avg < 17).sort((a, b) => a.avg - b.avg).slice(0, 3).map((s) => ({ name: s.name, from: s.avg, to: Math.min(20, r1(s.avg + (s.avg < 13 ? 2 : s.avg < 16 ? 1.5 : 1))) }));

  // ---------- راهنما و سؤال‌های گفتگو ----------
  const wk = weak[0]?.name; const best = [...subjects].sort((a, b) => b.avg - a.avg)[0]?.name;
  const guide = stu
    ? { title: 'راهنمای عملی برای تو', points: ['هر شب ۵ دقیقه برنامه‌ی فردا را بنویس: «چه درسی، چه مبحثی، چند سؤال».', 'قانون ۲ دقیقه: وقتی حال شروع نداری، فقط ۲ دقیقه شروع کن؛ معمولاً ادامه پیدا می‌کند.', 'یادگیری فعال را جایگزین دوباره‌خوانی کن: خودآزمایی، توضیح دادن برای یک دوست، حل سؤال بدون جزوه.', 'گوشی را در حین مطالعه در اتاق دیگر بگذار؛ حتی دیدنش تمرکز را کم می‌کند.', 'اگر موضوعی را بعد از دو بار تلاش نفهمیدی، سؤالت را بنویس و از معلم بپرس؛ پرسیدن نشانه‌ی قدرت است.']}
    : { title: 'راهنمای والدین', points: ['گفتگو را با نقطه‌های قوت شروع کنید و مقایسه با دیگران را کنار بگذارید؛ مقایسه انگیزه را کم می‌کند.', 'به‌جای «چرا درس نمی‌خوانی؟» بپرسید «کدام قسمت سخت‌تر است و چطور می‌توانم کمکت کنم؟».', 'یک ساعت و مکان ثابت و آرام برای مطالعه و دور بودن گوشی کمک زیادی می‌کند.', 'تلاش و ثبات را تشویق کنید، نه فقط نمره را؛ هدف‌های کوچک هفتگی تعیین کنید.', 'خواب کافی و تغذیه‌ی منظم را جدی بگیرید؛ کم‌خوابی مستقیماً تمرکز و حافظه را کم می‌کند.', 'اگر افت چند هفته ادامه یافت یا فرزندتان خیلی بی‌انگیزه/مضطرب بود، با معلم یا مشاور مدرسه صحبت کنید.']};
  const questions = stu ? [] : [
    wk ? `«در درس ${wk} کدام قسمت برایت از همه سخت‌تر است؟»` : '«این هفته کدام درس برایت از همه سخت‌تر بود؟»',
    best ? `«چه کاری باعث شد در ${best} این‌قدر خوب شوی؟ می‌شود همین را در بقیه‌ی درس‌ها هم امتحان کنی؟»` : '«چه چیزی باعث می‌شود مطالعه برایت راحت‌تر شود؟»',
    '«این هفته چه کاری از من کمک می‌کند تا بهتر درس بخوانی؟»',
  ];

  return {
    level, headline, dataQuality, gpa: g0, trend: { dir: trendDir, delta: trendDelta },
    study: { totalMin, activeDays14: dates14.size, activeDays30: dates30.size, avgDaily14: Math.round(avgDaily14), streak, longestGap, skipDays, consistency, lateNightDays: lateNight, longSessions, goalRate, mastery: mastery === null ? null : r1(mastery), tests: tstat },
    subjects, insights: ins, plan: { dailyMin, weeklyMin, studyDays, rows, tips: planTips }, goals: { gpaTarget, subjects: subjectTargets }, guide, questions,
  };
}
