import { describe, it, expect } from 'vitest';
import { parseSlotTimes, slotConflict, timeRangeText } from '@/lib/teacher-schedule';

describe('ساعت زنگ', () => {
  it('هر دو خالی مجاز است', () => { expect(parseSlotTimes('', '')).toEqual({ ok: true, start: null, end: null }); });
  it('فقط یکی پر باشد خطا می‌دهد', () => { expect(parseSlotTimes('09:20', '').ok).toBe(false); expect(parseSlotTimes('', '10:30').ok).toBe(false); });
  it('پایان باید بعد از شروع باشد', () => { expect(parseSlotTimes('10:30', '09:20').ok).toBe(false); expect(parseSlotTimes('09:20', '09:20').ok).toBe(false); });
  it('ساعت معتبر و صفر ابتدایی', () => { expect(parseSlotTimes('9:20', '10:30')).toEqual({ ok: true, start: '09:20', end: '10:30' }); expect(parseSlotTimes('25:00', '26:00').ok).toBe(false); });
  it('متن بازه', () => { expect(timeRangeText({ startTime: '09:20', endTime: '10:30' }, String)).toBe('09:20 تا 10:30'); expect(timeRangeText({ startTime: null, endTime: null }, String)).toBe(''); });
});

describe('تداخل برنامه‌ی معلم', () => {
  const ex = [{ weekday: 0, period: 2, classId: 'A', startTime: '09:20', endTime: '10:30' }, { weekday: 1, period: 1, classId: 'A', startTime: null, endTime: null }];
  it('همان روز و همان زنگ در کلاس دیگر = تداخل', () => { expect(slotConflict(ex, { weekday: 0, period: 2, classId: 'B', startTime: null, endTime: null })).toBe(ex[0]); });
  it('جایگزینیِ همان کلاس و همان زنگ تداخل نیست', () => { expect(slotConflict(ex, { weekday: 0, period: 2, classId: 'A', startTime: '09:20', endTime: '10:30' })).toBeNull(); });
  it('ساعت‌های هم‌پوشان در زنگ متفاوت = تداخل', () => { expect(slotConflict(ex, { weekday: 0, period: 3, classId: 'B', startTime: '10:00', endTime: '11:00' })).toBe(ex[0]); });
  it('ساعت‌های پشت‌سرهم تداخل نیست', () => { expect(slotConflict(ex, { weekday: 0, period: 3, classId: 'B', startTime: '10:30', endTime: '11:30' })).toBeNull(); });
  it('روز دیگر تداخل نیست', () => { expect(slotConflict(ex, { weekday: 2, period: 2, classId: 'B', startTime: '09:20', endTime: '10:30' })).toBeNull(); });
});

import { deviceLabel } from '@/lib/device';
import { inQuiet } from '@/lib/prefs';
describe('دستگاه و ساعت سکوت', () => {
  it('تشخیص مرورگر و سیستم‌عامل', () => {
    expect(deviceLabel('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36 Edg/120').name).toBe('Edge روی ویندوز');
    expect(deviceLabel('Mozilla/5.0 (Linux; Android 14; Pixel) AppleWebKit Chrome/120 Mobile Safari/537.36')).toEqual({ name: 'Chrome روی اندروید', icon: '📱' });
    expect(deviceLabel(null).name).toBe('دستگاه ناشناس');
  });
  it('ساعت سکوتِ رد‌شونده از نیمه‌شب', () => {
    const q = { quiet: true, quietFrom: 22, quietTo: 7 };
    expect(inQuiet(q, 23 * 60)).toBe(true); expect(inQuiet(q, 3 * 60)).toBe(true); expect(inQuiet(q, 7 * 60)).toBe(false); expect(inQuiet(q, 12 * 60)).toBe(false);
    expect(inQuiet({ ...q, quiet: false }, 23 * 60)).toBe(false); expect(inQuiet({ quiet: true, quietFrom: 13, quietTo: 15 }, 14 * 60)).toBe(true);
  });
});
