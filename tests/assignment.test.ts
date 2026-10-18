import { describe, it, expect } from 'vitest';
import { agoText, dueInfo, parseSteps, readSteps, readStepsDone, daysBetween } from '@/lib/assignment-calc';

describe('مراحل تکلیف', () => {
  it('هر خط یک مرحله و حذف نشانه‌ی ابتدای خط', () => { expect(parseSteps('- رسم مدل کربن\n۲. رسم مدل اکسیژن\n\n  پاسخ به فکر کنید ')).toEqual(['رسم مدل کربن', 'رسم مدل اکسیژن', 'پاسخ به فکر کنید']); });
  it('حداکثر ۱۲ مرحله', () => { expect(parseSteps(Array.from({ length: 20 }, (_, i) => `m${i}`).join('\n'))).toHaveLength(12); });
  it('خواندن JSON خراب امن است', () => { expect(readSteps('xx')).toEqual([]); expect(readStepsDone('[1,"a",2]')).toEqual([1, 2]); });
});
describe('مهلت تکلیف', () => {
  it('اختلاف روز', () => { expect(daysBetween('2026-10-11', '2026-10-14')).toBe(3); expect(daysBetween('2026-10-14', '2026-10-11')).toBe(-3); });
  it('گذشته', () => { expect(dueInfo('2026-10-10', null, '2026-10-11', 600).over).toBe(true); });
  it('امروز بدون ساعت هنوز تمام نشده؛ با ساعتِ گذشته تمام شده', () => {
    expect(dueInfo('2026-10-11', null, '2026-10-11', 1400).over).toBe(false);
    expect(dueInfo('2026-10-11', '09:45', '2026-10-11', 9 * 60 + 45).over).toBe(true);
    expect(dueInfo('2026-10-11', '09:45', '2026-10-11', 9 * 60 + 44).over).toBe(false);
  });
  it('فوری = تا پس‌فردا', () => { expect(dueInfo('2026-10-13', null, '2026-10-11', 0)).toMatchObject({ urgent: true, word: 'dayAfter' }); expect(dueInfo('2026-10-14', null, '2026-10-11', 0)).toMatchObject({ urgent: false, word: 'later', days: 3 }); });
  it('متن تاریخ ارائه', () => { expect(agoText('2026-10-11', '2026-10-11', String)).toBe('امروز'); expect(agoText('2026-10-06', '2026-10-11', String)).toBe('5 روز پیش'); });
});
