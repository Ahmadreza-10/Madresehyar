import { describe, it, expect } from 'vitest';
import { trimEmptyEdges } from '@/components/TrendChart';

const L = ['مهر', 'آبان', 'آذر', 'دی', 'بهمن'];
describe('کوتاه‌کردن ماه‌های خالیِ نمودار', () => {
  it('ماه‌های خالی بعد از آخرین داده حذف می‌شوند', () => {
    const r = trimEmptyEdges(L, [{ name: 'a', color: 'x', values: [16, 17, null, null, null] }]);
    expect(r.labels).toEqual(['مهر', 'آبان']); expect(r.series[0].values).toEqual([16, 17]);
  });
  it('ماه‌های خالی قبل از اولین داده هم حذف می‌شوند', () => {
    const r = trimEmptyEdges(L, [{ name: 'a', color: 'x', values: [null, null, 15, 18, null] }]);
    expect(r.labels).toEqual(['آذر', 'دی']);
  });
  it('شکاف میانی حفظ می‌شود', () => {
    const r = trimEmptyEdges(L, [{ name: 'a', color: 'x', values: [10, null, 12, null, null] }]);
    expect(r.labels).toEqual(['مهر', 'آبان', 'آذر']); expect(r.series[0].values).toEqual([10, null, 12]);
  });
  it('چند سری: بازه بر اساس هر سری که داده دارد', () => {
    const r = trimEmptyEdges(L, [{ name: 'a', color: 'x', values: [null, 14, null, null, null] }, { name: 'b', color: 'y', values: [null, null, null, 13, null] }]);
    expect(r.labels).toEqual(['آبان', 'آذر', 'دی']);
  });
  it('بدون هیچ داده‌ای دست نمی‌زند', () => {
    const r = trimEmptyEdges(L, [{ name: 'a', color: 'x', values: [null, null, null, null, null] }]); expect(r.labels).toEqual(L);
  });
});
