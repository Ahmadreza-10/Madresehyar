import { z } from 'zod';

/** معیارهای نظرسنجی از معلم (هر کدام ۱ تا ۵) */
export const CRITERIA = [
  { key: 'overall', label: 'نظر کلی', hint: 'در کل، این معلم چطور است؟' },
  { key: 'teaching', label: 'شیوه‌ی تدریس', hint: 'درس را واضح و قابل‌فهم توضیح می‌دهد؟' },
  { key: 'mastery', label: 'تسلط و پاسخگویی', hint: 'به سؤال‌ها خوب پاسخ می‌دهد؟' },
  { key: 'behavior', label: 'برخورد و نظم کلاس', hint: 'محترمانه و منصفانه رفتار می‌کند؟' },
] as const;
export type CriterionKey = (typeof CRITERIA)[number]['key'];

/** برای حفظ ناشناس‌ماندن، نتیجه به معلم فقط وقتی نشان داده می‌شود که حداقل این تعداد دانش‌آموز نظر داده باشند */
export const MIN_RESPONSES = 3;

const rating = (label: string) => z.coerce.number({ message: `«${label}» را انتخاب کنید.` }).int().min(1, `«${label}» را انتخاب کنید.`).max(5, `«${label}» را انتخاب کنید.`);
export const reviewSchema = z.object({
  teacherId: z.string().min(1), subjectId: z.string().min(1),
  overall: rating('نظر کلی'), teaching: rating('شیوه‌ی تدریس'), mastery: rating('تسلط و پاسخگویی'), behavior: rating('برخورد و نظم کلاس'),
  comment: z.string().trim().max(500, 'متن نظر حداکثر ۵۰۰ نویسه است.').optional(),
});

export type ReviewRow = { overall: number; teaching: number; mastery: number; behavior: number };
export type ReviewSummary = { n: number } & Record<CriterionKey, number>;
const r2 = (n: number) => Math.round(n * 100) / 100;
export function summarizeReviews(rows: ReviewRow[]): ReviewSummary | null {
  if (!rows.length) return null;
  const avg = (k: CriterionKey) => r2(rows.reduce((a, r) => a + r[k], 0) / rows.length);
  return { n: rows.length, overall: avg('overall'), teaching: avg('teaching'), mastery: avg('mastery'), behavior: avg('behavior') };
}
export const verdict = (avg: number) => (avg >= 4.5 ? 'عالی' : avg >= 3.5 ? 'خوب' : avg >= 2.5 ? 'متوسط' : avg >= 1.5 ? 'ضعیف' : 'خیلی ضعیف');
export const verdictTone = (avg: number) => (avg >= 4 ? 'ok' : avg >= 3 ? 'primary' : avg >= 2 ? 'warn' : 'danger') as 'ok' | 'primary' | 'warn' | 'danger';
export const starText = (avg: number) => { const f = Math.round(avg); return '★'.repeat(f) + '☆'.repeat(5 - f); };
