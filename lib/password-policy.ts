/** سیاست رمز عبور (بدون وابستگی به سرور تا بشود تست کرد) */
export const MIN_PASSWORD = 10;
export const PASSWORD_HINT = 'حداقل ۱۰ نویسه، شامل حرف و عدد؛ ساده و رایج (مثل 123456 یا password) و شماره‌ی موبایل/نام کاربری نباشد. یک جمله‌ی کوتاه و ناآشنا بهترین انتخاب است.';

const COMMON = new Set([
  '123456', '1234567', '12345678', '123456789', '1234567890', '0123456789', '1q2w3e4r', '1qaz2wsx', 'qwerty', 'qwerty123', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm', 'abc123', 'abcd1234', 'abcdef',
  'password', 'password1', 'password123', 'passw0rd', 'p@ssw0rd', 'p@ssword', 'admin', 'admin123', 'admin1234', 'administrator', 'welcome', 'welcome1', 'letmein', 'iloveyou', 'monkey', 'dragon', 'football',
  'master', 'login', 'school', 'school123', 'madreseh', 'madrese', 'madrasehyar', 'student', 'teacher', 'principal', 'iran', 'iran1234', 'tehran', 'tehran123', 'test', 'test1234', 'changeme', 'default',
  '11111111', '00000000', '12121212', '11223344', '987654321', '0987654321', 'aaaaaaaa', 'a1b2c3d4', 'mohammad', 'ali1234', 'reza1234', 'hamid1234', 'qazwsx', 'zaq12wsx', 'q1w2e3r4', 'q1w2e3r4t5',
]);

/** null = قابل قبول؛ وگرنه پیامِ فارسیِ مشکل */
export function checkPassword(pw: string, ctx: { username?: string | null; phone?: string | null } = {}): string | null {
  if (pw.length < MIN_PASSWORD) return `رمز عبور باید حداقل ${MIN_PASSWORD} نویسه باشد.`;
  if (pw.length > 100) return 'رمز عبور خیلی طولانی است.';
  const low = pw.toLowerCase();
  if (!/\p{L}/u.test(pw) || !/[0-9۰-۹]/.test(pw)) return 'رمز عبور باید هم حرف و هم عدد داشته باشد.';
  if (COMMON.has(low) || COMMON.has(low.replace(/[^a-z0-9]/g, ''))) return 'این رمز بسیار رایج است و به‌راحتی حدس زده می‌شود؛ رمز دیگری انتخاب کنید.';
  if (/^(.)\1+$/.test(pw) || new Set(pw).size < 4) return 'رمز عبور نباید تکراری یا خیلی ساده باشد.';
  const digits = low.replace(/\D/g, ''); const seq = '01234567890123456789'; const rev = '98765432109876543210';
  if (digits.length >= 6 && digits.length >= pw.length - 3 && (seq.includes(digits) || rev.includes(digits))) return 'رمز عبور نباید دنباله‌ی ساده‌ی اعداد باشد.';
  const u = (ctx.username ?? '').toLowerCase(); if (u.length >= 3 && low.includes(u)) return 'رمز عبور نباید شامل نام کاربری باشد.';
  const ph = (ctx.phone ?? '').replace(/\D/g, '').replace(/^0/, ''); if (ph.length >= 7 && digits.includes(ph)) return 'رمز عبور نباید شامل شماره‌ی موبایل باشد.';
  return null;
}
