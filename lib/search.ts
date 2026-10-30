/** نرمال‌سازی برای جستجوی فارسی: ی/ک عربی، ارقام فارسی/عربی، فاصله و نیم‌فاصله، حروف بزرگ و کوچک */
export function normalizeQuery(s: string): string {
  return s.normalize('NFKC').replace(/ي/g, 'ی').replace(/ك/g, 'ک')
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[\u200c\u200f\u200e\s]+/g, ' ').trim().toLowerCase();
}
/** همه‌ی کلمه‌های جستجو باید در متن باشند (ترتیب مهم نیست): «رضا محمدی» با «محمدی رضا» هم پیدا می‌شود */
export function matchesQuery(text: string, q: string): boolean {
  const words = normalizeQuery(q).split(' ').filter(Boolean); if (!words.length) return false;
  const hay = normalizeQuery(text); return words.every((w) => hay.includes(w));
}
export const MAX_QUERY = 60;
export const cleanQuery = (q: unknown): string => String(q ?? '').slice(0, MAX_QUERY).trim();
