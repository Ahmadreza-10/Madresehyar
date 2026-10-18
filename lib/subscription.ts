/** منطق ساده‌ی اشتراک مدرسه‌ها (بدون وابستگی به سرور تا بشود تست کرد) */
export const DAY = 86_400_000;
export function addMonths(from: Date, months: number): Date {
  const d = new Date(from.getTime()); const day = d.getUTCDate();
  d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last)); return d;
}
/** تمدید از «پایانِ اشتراکِ فعلی» (اگر هنوز نگذشته) وگرنه از همین لحظه؛ تا مدت باقی‌مانده از بین نرود */
export function extendedEnd(current: Date | null | undefined, months: number, now = new Date()): Date {
  return addMonths(current && current.getTime() > now.getTime() ? current : now, months);
}
export const daysLeft = (end: Date | null | undefined, now = new Date()) => (end ? Math.ceil((end.getTime() - now.getTime()) / DAY) : null);
export const isExpired = (end: Date | null | undefined, now = new Date()) => !!end && end.getTime() <= now.getTime();
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; // بدون نویسه‌های شبیه (0/O، 1/I/L)
export function trackingCode(rand: (n: number) => Uint8Array): string {
  const b = rand(10); return Array.from(b, (x) => ALPHABET[x % ALPHABET.length]).join('');
}
