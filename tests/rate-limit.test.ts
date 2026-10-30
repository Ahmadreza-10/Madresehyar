import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { checkLogin, recordFailure, recordSuccess, resetRateLimits } from '@/lib/rate-limit';

beforeEach(() => resetRateLimits());
afterEach(() => vi.useRealTimers());

describe('محدودیت تلاش ورود', () => {
  it('تا پیش از سقف مجاز است', () => {
    for (let i = 0; i < 5; i++) recordFailure('u|1.1.1.1');
    expect(checkLogin('u|1.1.1.1').ok).toBe(true);
  });
  it('بعد از ۶ تلاش ناموفق قفل می‌شود', () => {
    for (let i = 0; i < 6; i++) recordFailure('u|1.1.1.1');
    const g = checkLogin('u|1.1.1.1'); expect(g.ok).toBe(false);
    if (!g.ok) expect(g.retryMin).toBeGreaterThanOrEqual(1);
  });
  it('قفل یک کاربر روی کاربر دیگر اثر ندارد', () => {
    for (let i = 0; i < 6; i++) recordFailure('a|1.1.1.1');
    expect(checkLogin('b|1.1.1.1').ok).toBe(true);
  });
  it('ورود موفق شمارنده را پاک می‌کند', () => {
    for (let i = 0; i < 5; i++) recordFailure('u|x'); recordSuccess('u|x'); recordFailure('u|x');
    expect(checkLogin('u|x').ok).toBe(true);
  });
  it('بعد از ۱۰ دقیقه قفل باز می‌شود', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-27T10:00:00Z'));
    for (let i = 0; i < 6; i++) recordFailure('u|y'); expect(checkLogin('u|y').ok).toBe(false);
    vi.setSystemTime(new Date('2026-10-27T10:11:00Z')); expect(checkLogin('u|y').ok).toBe(true);
  });
});
