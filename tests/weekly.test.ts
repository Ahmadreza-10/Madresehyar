import { describe, it, expect } from 'vitest';
import { dayOfWeekIndex, weekSummary } from '@/lib/weekly';

// ۲۰۲۶-۱۰-۲۴ شنبه است و ۲۰۲۶-۱۰-۳۰ جمعه
describe('هفته‌ی ایرانی', () => {
  it('شنبه روز اول و جمعه روز آخر است', () => { expect(dayOfWeekIndex('2026-10-24')).toBe(0); expect(dayOfWeekIndex('2026-10-30')).toBe(6); });
});
describe('خلاصه‌ی هفته', () => {
  const base = { today: '2026-10-27', studyMin: 0, studyDays: 0, absences: 0, lates: 0, gradeCount: 0 };
  it('هفته‌ی بدون مطالعه', () => { expect(weekSummary(base).headline).toContain('هنوز مطالعه‌ای'); });
  it('مطالعه‌ی چند روز از روزهای گذشته', () => { expect(weekSummary({ ...base, studyMin: 90, studyDays: 2 }).headline).toContain('2 روز از 4'); });
  it('هر روز مطالعه شده', () => { expect(weekSummary({ ...base, studyMin: 400, studyDays: 4 }).headline).toContain('آفرین'); });
  it('شروع هفته شنبه است', () => { expect(weekSummary(base).from).toBe('2026-10-24'); });
});
