import { describe, it, expect } from 'vitest';
import { checkPassword } from '@/lib/password-policy';

describe('سیاست رمز عبور (فقط حداقل ۸ نویسه)', () => {
  it('رمز کمتر از ۸ نویسه رد می‌شود', () => { expect(checkPassword('1234567')).toBeTruthy(); expect(checkPassword('abc')).toBeTruthy(); expect(checkPassword('')).toBeTruthy(); });
  it('رمز ۸ نویسه یا بیشتر پذیرفته می‌شود، حتی ساده', () => { expect(checkPassword('12345678')).toBeNull(); expect(checkPassword('abcdefgh')).toBeNull(); expect(checkPassword('password')).toBeNull(); });
  it('رمز می‌تواند با نام کاربری یکی باشد', () => {
    expect(checkPassword('7400010492', { username: '7400010492' })).toBeNull(); expect(checkPassword('moslemi99', { username: 'moslemi99' })).toBeNull();
  });
  it('رمز می‌تواند شامل شماره‌ی موبایل باشد', () => { expect(checkPassword('09123456789', { phone: '09123456789' })).toBeNull(); });
  it('رمز فارسی هم قبول است', () => { expect(checkPassword('مدرسه‌ی-من-1405')).toBeNull(); });
  it('رمز خیلی طولانی رد می‌شود', () => { expect(checkPassword('a'.repeat(101))).toBeTruthy(); });
});
