import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { buildStudyWorkbook, hhmm, jalaliSortable, weekdayName, weightedPercent, type ExportReport } from '@/lib/study-export';

const R: ExportReport[] = [
  { studentId: 'a', studentName: 'سارا رضایی', date: '2026-10-26', startTime: '17:00', endTime: '18:30', durationMin: 90,
    items: [{ subjectName: 'ریاضی', studyMin: 60, testMin: 30, topic: 'مثلثات', methodList: ['test'], pages: 12, mastery: 4, tests: [{ source: 'کتاب', totalCount: 20, correctCount: 14, wrongCount: 4, blankCount: 2, percent: 60 }, { source: 'آزمون', totalCount: 10, correctCount: 9, wrongCount: 1, blankCount: 0, percent: 90 }] }] },
  { studentId: 'a', studentName: 'سارا رضایی', date: '2026-10-27', startTime: '17:00', endTime: '17:45', durationMin: 45, items: [{ subjectName: 'شیمی', studyMin: 45, testMin: 0, topic: null, methodList: [], pages: null, mastery: null, tests: [] }] },
  { studentId: 'b', studentName: 'امیر کاظمی', date: '2026-10-27', startTime: '18:00', endTime: '19:00', durationMin: 60, items: [{ subjectName: 'فیزیک', studyMin: 60, testMin: 0, topic: '', methodList: [], pages: null, mastery: null, tests: [] }] },
];
async function load() { const buf = await buildStudyWorkbook(R, (id) => (id === 'a' ? 'C1' : 'C2')); const wb = new ExcelJS.Workbook(); await wb.xlsx.load(buf as unknown as ArrayBuffer); return wb; }

describe('خروجی اکسل مطالعه', () => {
  it('تاریخ شمسی قابل‌مرتب‌سازی و روز هفته', () => { expect(jalaliSortable('2026-10-26')).toBe('1405/08/04'); expect(weekdayName('2026-10-26')).toBe('دوشنبه'); expect(hhmm(125)).toBe('2:05'); });
  it('درصد وزنیِ تست‌ها', () => { expect(weightedPercent([{ totalCount: 20, percent: 60 }, { totalCount: 10, percent: 90 }])).toBe(70); expect(weightedPercent([])).toBeNull(); });
  it('دو برگه با راست‌به‌چپ و سطر سربرگ ثابت', async () => {
    const wb = await load(); expect(wb.worksheets.map((w) => w.name)).toEqual(['خلاصه‌ی دانش‌آموزان', 'گزارش‌ها']);
    for (const w of wb.worksheets) { expect(w.views[0].rightToLeft).toBe(true); expect((w.views[0] as { ySplit?: number }).ySplit).toBe(1); }
  });
  it('برگه‌ی گزارش‌ها: هر درس یک ردیف و اعداد واقعاً عدد هستند', async () => {
    const ws = (await load()).getWorksheet('گزارش‌ها')!; expect(ws.rowCount).toBe(1 + 3);
    const first = ws.getRow(2); // مرتب: «امیر» قبل از «سارا»
    expect(first.getCell(1).value).toBe('امیر کاظمی'); expect(first.getCell(2).value).toBe('C2'); expect(typeof first.getCell(7).value).toBe('number');
    const math = ws.getRow(4); expect(math.getCell(6).value).toBe('ریاضی'); expect(math.getCell(10).value).toBe(30); expect(math.getCell(11).value).toBe(23); expect(math.getCell(14).value).toBe(70);
    expect(String(math.getCell(15).value)).toContain('صفحه: 12');
  });
  it('برگه‌ی خلاصه: جمع و میانگین هر دانش‌آموز', async () => {
    const ws = (await load()).getWorksheet('خلاصه‌ی دانش‌آموزان')!; expect(ws.rowCount).toBe(1 + 2);
    const sara = ws.getRow(3); expect(sara.getCell(1).value).toBe('سارا رضایی'); expect(sara.getCell(3).value).toBe(2); expect(sara.getCell(4).value).toBe(135); expect(sara.getCell(5).value).toBe('2:15'); expect(sara.getCell(6).value).toBe(68);
  });
});
