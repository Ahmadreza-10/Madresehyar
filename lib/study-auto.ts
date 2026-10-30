import { addDays } from './time';

/** متن یادداشت‌های خودکار (در بخش مثبت‌ها و منفی‌ها دیده می‌شود) */
export const AUTO_PRAISE_BODY = 'ارسال گزارش مطالعه (ثبت خودکار)';
export const AUTO_NEGATIVE_BODY = 'عدم ارسال گزارش مطالعه (ثبت خودکار)';

/**
 * روزهایی که «تمام شده‌اند» و می‌توان درباره‌شان قضاوت کرد: همیشه دیروز؛ و امروز فقط اگر بازه‌ی ثبت گزارش
 * (که پایانش پیش از نیمه‌شب است) تمام شده باشد. مثلاً پایان ۲۴:۰۰ => فقط دیروز، پایان ۲۲:۰۰ => دیروز و (بعد از ۲۲) امروز.
 */
export function datesToProcess(today: string, nowMin: number, endMin: number): string[] {
  const out = [addDays(today, -1)];
  if (endMin < 1440 && nowMin >= endMin) out.push(today);
  return out;
}

export type PenaltyInput = {
  date: string; since: string | null; hasParent: boolean; hasReport: boolean; hasDeclaredNoStudy: boolean; alreadyMarked: boolean;
};
/**
 * آیا برای این دانش‌آموز در این روز «۱ منفی» ثبت شود؟
 * فقط وقتی: قابلیت از روزِ since یا بعدتر فعال بوده، ولی/والدی به دانش‌آموز وصل است (وگرنه کسی نبود که گزارش بدهد)،
 * گزارشی ثبت نشده، ولی «عدم مطالعه» هم اعلام نکرده، و قبلاً برایش ثبت نشده است.
 */
export function shouldPenalize(i: PenaltyInput): boolean {
  if (!i.since || i.date < i.since) return false;
  return i.hasParent && !i.hasReport && !i.hasDeclaredNoStudy && !i.alreadyMarked;
}
