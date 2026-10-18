import { z } from 'zod';
import { STUDY_METHODS } from '@/db/schema';
import { parseHM, minutesNowTehran } from './time';

export const methodLabels: Record<(typeof STUDY_METHODS)[number], string> = {
  reading: 'مطالعه‌ی درسنامه', testing: 'تست‌زنی', review: 'مرور و جمع‌بندی', summarizing: 'خلاصه‌نویسی',
  exercise: 'حل تمرین و مسئله', video: 'دیدن فیلم آموزشی', class_notes: 'مرور جزوه‌ی کلاس',
};

export type StudyWindow = { startMin: number; endMin: number };
export const DEFAULT_WINDOW = { start: '08:00', end: '24:00' };

/** بازه‌ی مجاز ارسال گزارش: از startMin (شامل) تا endMin (غیرشامل). «24:00» یعنی تا پایان روز. */
export function windowFromSettings(start: string, end: string): StudyWindow {
  return { startMin: parseHM(start) ?? 8 * 60, endMin: parseHM(end) ?? 1440 };
}
export function isWithinWindow(w: StudyWindow, now: Date = new Date()): boolean {
  const m = minutesNowTehran(now);
  return m >= w.startMin && m < w.endMin;
}

/** درصد تست با نمره‌ی منفی (روش کنکور سراسری): هر غلط یک‌سوم نمره‌ی یک صحیح کم می‌کند */
export function testPercent(correct: number, wrong: number, total: number): number {
  if (total <= 0) return 0;
  const p = ((3 * correct - wrong) / (3 * total)) * 100;
  return Math.round(p * 100) / 100;
}

export function sessionDuration(startTime: string, endTime: string): number | null {
  const s = parseHM(startTime), e = parseHM(endTime);
  if (s === null || e === null || e <= s) return null;
  return e - s;
}

const int = (min: number, max: number, msg?: string) => z.coerce.number({ message: msg }).int(msg).min(min, msg).max(max, msg);

export const testSchema = z.object({
  source: z.string().trim().min(1, 'نام منبع/آزمون را بنویسید.').max(100),
  totalCount: int(1, 1000),
  correctCount: int(0, 1000),
  wrongCount: int(0, 1000),
  blankCount: int(0, 1000),
  durationMin: z.preprocess((v) => (v === '' || v === null || v === undefined ? undefined : v), int(1, 600, 'زمان هر دسته تست را (به دقیقه) بنویسید.')),
  note: z.string().trim().max(300).optional(),
}).refine((t) => t.correctCount + t.wrongCount + t.blankCount === t.totalCount, {
  message: 'مجموع صحیح، غلط و نزده باید برابر تعداد کل تست‌ها باشد.',
});

/** یک درس در گزارش: زمان مطالعه و زمان تست جدا؛ تست‌های همین درس زیر همین درس می‌آید */
export const studyItemSchema = z.object({
  subjectId: z.string().min(1, 'درس را انتخاب کنید.'),
  studyMin: int(0, 720).default(0),
  topic: z.string().trim().min(2, 'مبحث هر درس را بنویسید.').max(200),
  methods: z.array(z.enum(STUDY_METHODS)).default([]),
  pages: int(0, 2000).default(0),
  mastery: int(1, 5).default(3),
  goal: z.string().trim().max(300).optional(),
  goalAchieved: z.boolean().optional(),
  tests: z.array(testSchema).max(10).default([]),
}).refine((i) => i.studyMin + i.tests.reduce((a, t) => a + t.durationMin, 0) > 0, { message: 'برای هر درس زمان مطالعه یا دسته تست (با زمانش) را وارد کنید.' })
  // زمان تست جداگانه وارد نمی‌شود؛ مجموع زمانِ دسته‌های تستِ همان درس است
  .transform((i) => ({ ...i, testMin: i.tests.reduce((a, t) => a + t.durationMin, 0) }));

export const studyReportSchema = z.object({
  studentId: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  /** بازه‌ی کلِ نشست (شروع تا پایان)؛ مجموع زمانِ درس‌ها نباید از آن بیشتر باشد */
  startTime: z.string().refine((v) => parseHM(v) !== null, 'ساعت شروع معتبر نیست.'),
  endTime: z.string().refine((v) => parseHM(v) !== null, 'ساعت پایان معتبر نیست.'),
  items: z.array(studyItemSchema).min(1, 'حداقل یک درس اضافه کنید.').max(10, 'حداکثر ۱۰ درس در یک گزارش.'),
  notes: z.string().trim().max(1000).optional(),
}).refine((r) => new Set(r.items.map((i) => i.subjectId)).size === r.items.length, { message: 'یک درس را فقط یک بار در گزارش بیاورید.' });
export type StudyReportInput = z.infer<typeof studyReportSchema>;

/** مجموع دقیقه‌ی مطالعه و تست همه‌ی درس‌ها */
export const itemMinutes = (i: { studyMin: number; testMin: number }) => i.studyMin + i.testMin;
export const totalMinutes = (items: { studyMin: number; testMin: number }[]) => items.reduce((a, i) => a + itemMinutes(i), 0);

export function overlaps(a: { s: number; e: number }, b: { s: number; e: number }) { return a.s < b.e && b.s < a.e; }
