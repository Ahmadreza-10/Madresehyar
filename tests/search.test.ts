import { describe, it, expect } from 'vitest';
import { cleanQuery, matchesQuery, normalizeQuery } from '@/lib/search';

describe('جستجوی فارسی', () => {
  it('ی و ک عربی با فارسی یکی می‌شوند', () => { expect(matchesQuery('علی کریمی', 'علي كريمي')).toBe(true); });
  it('ارقام فارسی و انگلیسی یکی‌اند', () => { expect(matchesQuery('کلاس 9الف', '۹الف')).toBe(true); expect(matchesQuery('کلاس ۹الف', '9الف')).toBe(true); });
  it('ترتیب کلمه‌ها مهم نیست', () => { expect(matchesQuery('رضا محمدی', 'محمدی رضا')).toBe(true); });
  it('همه‌ی کلمه‌ها باید پیدا شوند', () => { expect(matchesQuery('رضا محمدی', 'رضا احمدی')).toBe(false); });
  it('نیم‌فاصله و فاصله‌ی اضافه مشکلی نمی‌سازند', () => { expect(normalizeQuery('  احمد‌رضا   مسلمی ')).toBe('احمد رضا مسلمی'); });
  it('جستجوی خالی هیچ‌چیز را پیدا نمی‌کند', () => { expect(matchesQuery('هر نامی', '   ')).toBe(false); });
  it('طول عبارت محدود می‌شود', () => { expect(cleanQuery('ا'.repeat(500))).toHaveLength(60); expect(cleanQuery(undefined)).toBe(''); });
});
