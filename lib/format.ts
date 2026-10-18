import { isoToJalaliParts, JALALI_MONTHS, WEEKDAYS_FA } from './jalali';

const nf = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 2, useGrouping: false });
export const fa = (n: number | string) => (typeof n === 'number' ? nf.format(n) : String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]));

export function formatDuration(min: number): string {
  const h = Math.floor(min / 60); const m = min % 60;
  if (h && m) return `${fa(h)} ساعت و ${fa(m)} دقیقه`;
  if (h) return `${fa(h)} ساعت`;
  return `${fa(m)} دقیقه`;
}
export function formatDurationShort(min: number): string {
  const h = Math.floor(min / 60); const m = min % 60;
  return `${fa(h)}:${fa(String(m).padStart(2, '0'))}`;
}
/** 2026-10-07 → ۱۵ مهر ۱۴۰۵ */
export function formatJalali(iso: string, withWeekday = false): string {
  const j = isoToJalaliParts(iso);
  const base = `${fa(j.d)} ${JALALI_MONTHS[j.m - 1]} ${fa(j.y)}`;
  if (!withWeekday) return base;
  const [y, m, d] = iso.split('-').map(Number);
  return `${WEEKDAYS_FA[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]} ${base}`;
}
export function formatJalaliShort(iso: string): string {
  const j = isoToJalaliParts(iso);
  return `${fa(j.y)}/${fa(String(j.m).padStart(2, '0'))}/${fa(String(j.d).padStart(2, '0'))}`;
}
export const fullName = (u: { firstName: string; lastName: string }) => `${u.firstName} ${u.lastName}`;

/** قیمت به تومان با جداکننده‌ی هزارگان فارسی؛ صفر = رایگان */
export const toman = (n: number) => (n === 0 ? 'رایگان' : `${fa(n.toLocaleString('en-US')).replace(/,/g, '٬')} تومان`);
