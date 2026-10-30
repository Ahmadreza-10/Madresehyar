import ExcelJS from 'exceljs';
import { isoToJalaliParts, WEEKDAYS_FA } from './jalali';
import { methodLabels } from './study';

/** شکل ورودی (زیرمجموعه‌ی خروجی loadReports) تا بدون دیتابیس قابل آزمون باشد */
export type ExportReport = {
  studentId: string; studentName: string; date: string; startTime: string; endTime: string; durationMin: number;
  items: { subjectName: string; studyMin: number; testMin: number; topic: string | null; methodList: string[]; pages: number | null; mastery: number | string | null;
    tests: { source: string | null; totalCount: number; correctCount: number; wrongCount: number; blankCount: number; percent: number }[] }[];
};

const pad = (n: number) => String(n).padStart(2, '0');
/** تاریخ شمسی با ارقام لاتین (مثل 1405/08/06) تا در اکسل درست مرتب شود */
export const jalaliSortable = (iso: string) => { const j = isoToJalaliParts(iso); return `${j.y}/${pad(j.m)}/${pad(j.d)}`; };
export const weekdayName = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return WEEKDAYS_FA[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]; };
export const hhmm = (min: number) => `${Math.floor(min / 60)}:${pad(Math.round(min % 60))}`;
/** درصدِ وزنی: هر آزمون به‌اندازه‌ی تعداد سؤالش اثر دارد */
export function weightedPercent(tests: { totalCount: number; percent: number }[]): number | null {
  const total = tests.reduce((a, t) => a + t.totalCount, 0); if (!total) return null;
  return Math.round((tests.reduce((a, t) => a + t.percent * t.totalCount, 0) / total) * 10) / 10;
}

const HEAD_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF312E81' } };
function styleSheet(ws: ExcelJS.Worksheet, widths: number[], numericCols: number[]) {
  ws.views = [{ rightToLeft: true, state: 'frozen', ySplit: 1, xSplit: 1 }];
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  const head = ws.getRow(1); head.height = 24;
  head.eachCell((c) => { c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }; c.fill = HEAD_FILL; c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }; });
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: widths.length } };
  ws.eachRow((row, n) => {
    if (n === 1) return;
    row.eachCell((c, col) => { c.alignment = { vertical: 'middle', horizontal: numericCols.includes(col) ? 'center' : 'right', wrapText: true }; c.border = { bottom: { style: 'hair', color: { argb: 'FFCBD5E1' } } }; });
    if (n % 2 === 0) row.eachCell((c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F5FB' } }; });
  });
}

/** فایل اکسل مرتب: برگه‌ی «خلاصه‌ی دانش‌آموزان» + برگه‌ی «گزارش‌ها» (هر درس یک ردیف) */
export async function buildStudyWorkbook(reports: ExportReport[], classOf: (studentId: string) => string): Promise<Buffer> {
  const wb = new ExcelJS.Workbook(); wb.creator = 'مدرسه‌یار'; wb.created = new Date();
  const sorted = [...reports].sort((a, b) => a.studentName.localeCompare(b.studentName, 'fa') || b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime));

  // ---- خلاصه
  const sum = wb.addWorksheet('خلاصه‌ی دانش‌آموزان');
  sum.addRow(['دانش‌آموز', 'کلاس', 'روزهای مطالعه', 'مجموع مطالعه (دقیقه)', 'مجموع مطالعه (ساعت:دقیقه)', 'میانگین هر روز فعال (دقیقه)', 'تعداد تست', 'میانگین درصد تست', 'آخرین گزارش']);
  const byStudent = new Map<string, ExportReport[]>();
  for (const r of sorted) byStudent.set(r.studentId, [...(byStudent.get(r.studentId) ?? []), r]);
  for (const [id, list] of byStudent) {
    const total = list.reduce((a, r) => a + r.durationMin, 0); const days = new Set(list.map((r) => r.date)).size;
    const tests = list.flatMap((r) => r.items.flatMap((i) => i.tests));
    sum.addRow([list[0].studentName, classOf(id), days, total, hhmm(total), days ? Math.round(total / days) : 0, tests.reduce((a, t) => a + t.totalCount, 0), weightedPercent(tests), `${weekdayName(list[0].date)} ${jalaliSortable(list[0].date)}`]);
  }
  styleSheet(sum, [24, 10, 12, 16, 18, 18, 12, 14, 22], [2, 3, 4, 5, 6, 7, 8, 9]);

  // ---- گزارش‌ها (هر درس یک ردیف؛ تست‌ها جمع‌شده)
  const ws = wb.addWorksheet('گزارش‌ها');
  ws.addRow(['دانش‌آموز', 'کلاس', 'روز', 'تاریخ', 'ساعت ثبت', 'درس', 'مطالعه (دقیقه)', 'تست (دقیقه)', 'مبحث', 'تعداد تست', 'صحیح', 'غلط', 'نزده', 'درصد تست', 'روش، صفحه و تسلط']);
  for (const r of sorted) for (const i of r.items) {
    const t = i.tests; const parts: string[] = [];
    if (i.methodList.length) parts.push(`روش: ${i.methodList.map((m) => methodLabels[m as keyof typeof methodLabels] ?? m).join('، ')}`);
    if (i.pages) parts.push(`صفحه: ${i.pages}`); if (i.mastery) parts.push(`تسلط: ${i.mastery}`);
    ws.addRow([r.studentName, classOf(r.studentId), weekdayName(r.date), jalaliSortable(r.date), r.endTime, i.subjectName, i.studyMin, i.testMin, i.topic ?? '',
      t.length ? t.reduce((a, x) => a + x.totalCount, 0) : null, t.length ? t.reduce((a, x) => a + x.correctCount, 0) : null, t.length ? t.reduce((a, x) => a + x.wrongCount, 0) : null, t.length ? t.reduce((a, x) => a + x.blankCount, 0) : null, weightedPercent(t), parts.join(' • ')]);
  }
  styleSheet(ws, [22, 9, 11, 12, 10, 16, 12, 11, 26, 10, 8, 8, 8, 11, 34], [2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14]);

  return Buffer.from(await wb.xlsx.writeBuffer());
}
