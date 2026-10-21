import { describe, it, expect } from 'vitest';
import { checkPassword } from '@/lib/password-policy';

describe('سیاست رمز عبور', () => {
  it('رمزهای کوتاه یا رایج رد می‌شوند', () => {
    expect(checkPassword('abc123')).toBeTruthy(); expect(checkPassword('password123')).toBeTruthy(); expect(checkPassword('1234567890')).toBeTruthy(); expect(checkPassword('aaaaaaaaaa1')).toBeTruthy();
  });
  it('نیاز به حرف و عدد', () => { expect(checkPassword('onlyletterspass')).toBeTruthy(); expect(checkPassword('9182736450192')).toBeTruthy(); });
  it('شامل نام کاربری یا موبایل نباشد', () => {
    expect(checkPassword('ali.rezaei-2024x', { username: 'ali.rezaei' })).toBeTruthy(); expect(checkPassword('x09123456789xx', { phone: '09123456789' })).toBeTruthy();
  });
  it('رمز خوب پذیرفته می‌شود', () => { expect(checkPassword('khane-sabz-47-darya')).toBeNull(); expect(checkPassword('مدرسه‌ی-من-1405-قشنگ')).toBeNull(); });
});
