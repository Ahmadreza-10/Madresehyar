import { describe, expect, it } from 'vitest';
import { MIN_RESPONSES, reviewSchema, starText, summarizeReviews, verdict, verdictTone } from '@/lib/survey';

const ok = { teacherId: 't1', subjectId: 's1', overall: '5', teaching: '4', mastery: '3', behavior: '5', comment: ' عالی بود ' };
describe('نظرسنجی معلم‌ها', () => {
  it('اعتبارسنجی فرم: امتیاز ۱ تا ۵ و متن اختیاری', () => {
    const r = reviewSchema.safeParse(ok); expect(r.success).toBe(true); if (r.success) { expect(r.data.overall).toBe(5); expect(r.data.comment).toBe('عالی بود'); }
    expect(reviewSchema.safeParse({ ...ok, overall: '0' }).success).toBe(false);
    expect(reviewSchema.safeParse({ ...ok, teaching: '6' }).success).toBe(false);
    expect(reviewSchema.safeParse({ ...ok, mastery: undefined }).success).toBe(false);
    expect(reviewSchema.safeParse({ ...ok, comment: undefined }).success).toBe(true);
    expect(reviewSchema.safeParse({ ...ok, comment: 'x'.repeat(501) }).success).toBe(false);
  });
  it('میانگین‌ها', () => {
    expect(summarizeReviews([])).toBeNull();
    const s = summarizeReviews([{ overall: 5, teaching: 4, mastery: 3, behavior: 5 }, { overall: 4, teaching: 4, mastery: 2, behavior: 5 }, { overall: 3, teaching: 3, mastery: 1, behavior: 4 }])!;
    expect(s.n).toBe(3); expect(s.overall).toBe(4); expect(s.teaching).toBe(3.67); expect(s.mastery).toBe(2); expect(s.behavior).toBe(4.67);
  });
  it('برچسب و ستاره', () => {
    expect(verdict(4.7)).toBe('عالی'); expect(verdict(3.6)).toBe('خوب'); expect(verdict(2.6)).toBe('متوسط'); expect(verdict(1.6)).toBe('ضعیف'); expect(verdict(1)).toBe('خیلی ضعیف');
    expect(verdictTone(4.2)).toBe('ok'); expect(verdictTone(1.5)).toBe('danger');
    expect(starText(4.4)).toBe('★★★★☆'); expect(starText(5)).toBe('★★★★★');
    expect(MIN_RESPONSES).toBeGreaterThanOrEqual(3);
  });
});
