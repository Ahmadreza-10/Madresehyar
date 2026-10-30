/** سیاست رمز عبور (بدون وابستگی به سرور تا بشود تست کرد) */
export const MIN_PASSWORD = 8;
export const MAX_PASSWORD = 100;
export const PASSWORD_HINT = 'حداقل ۸ نویسه (حرف، عدد یا هر نویسه‌ی دیگر). رمز می‌تواند با نام کاربری یکی باشد.';

/**
 * null = قابل قبول؛ وگرنه پیامِ فارسیِ مشکل.
 * عمداً فقط طول بررسی می‌شود: رمزِ ساده، رمز مشابه نام کاربری/موبایل و رمزهای رایج (مثل 12345678) مجازند.
 * پارامتر ctx برای سازگاری با فراخوان‌های قبلی نگه داشته شده و دیگر استفاده نمی‌شود.
 */
export function checkPassword(pw: string, _ctx: { username?: string | null; phone?: string | null } = {}): string | null {
  void _ctx;
  if (pw.length < MIN_PASSWORD) return `رمز عبور باید حداقل ${MIN_PASSWORD} نویسه باشد.`;
  if (pw.length > MAX_PASSWORD) return 'رمز عبور خیلی طولانی است.';
  return null;
}
