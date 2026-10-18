import { describe, it, expect } from 'vitest';
import { addMonths, daysLeft, extendedEnd, isExpired, trackingCode } from '@/lib/subscription';

describe('اشتراک', () => {
  it('افزودن ماه با کوتاه‌شدن روز (۳۱ → آخرِ ماهِ کوتاه‌تر)', () => {
    expect(addMonths(new Date('2026-01-31T00:00:00Z'), 1).toISOString().slice(0, 10)).toBe('2026-02-28');
    expect(addMonths(new Date('2026-03-15T00:00:00Z'), 12).toISOString().slice(0, 10)).toBe('2027-03-15');
  });
  it('تمدید از پایانِ فعلی اگر نگذشته، وگرنه از اکنون', () => {
    const now = new Date('2026-06-01T00:00:00Z');
    expect(extendedEnd(new Date('2026-07-01T00:00:00Z'), 3, now).toISOString().slice(0, 10)).toBe('2026-10-01');
    expect(extendedEnd(new Date('2026-05-01T00:00:00Z'), 3, now).toISOString().slice(0, 10)).toBe('2026-09-01');
    expect(extendedEnd(null, 1, now).toISOString().slice(0, 10)).toBe('2026-07-01');
  });
  it('روز مانده و انقضا', () => {
    const now = new Date('2026-06-01T00:00:00Z');
    expect(daysLeft(new Date('2026-06-11T00:00:00Z'), now)).toBe(10); expect(daysLeft(null, now)).toBeNull();
    expect(isExpired(new Date('2026-05-31T00:00:00Z'), now)).toBe(true); expect(isExpired(null, now)).toBe(false);
  });
  it('کد پیگیری ۱۰ نویسه بدون نویسه‌های مبهم', () => {
    const c = trackingCode((n) => Uint8Array.from({ length: n }, (_, i) => i * 17)); expect(c).toHaveLength(10); expect(c).toMatch(/^[2-9A-HJKMNP-Z]+$/);
  });
});
