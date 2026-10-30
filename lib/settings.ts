import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { schools, settings } from '@/db/schema';
import { DEFAULT_WINDOW, windowFromSettings } from './study';

const DEFAULTS: Record<string, string> = {
  academicYear: '۱۴۰۵-۱۴۰۶',
  studyWindowStart: DEFAULT_WINDOW.start,
  studyWindowEnd: DEFAULT_WINDOW.end,
  /** نمایش فهرست رتبه‌ی همکلاسی‌ها/هم‌پایه‌ها به دانش‌آموز و ولی */
  showRankLists: '1',
  /** یادآور گزارش مطالعه برای اولیا (ساعت ۹ شب و یک ساعت مانده به پایان) */
  remindersEnabled: '1',
  /** تعداد زنگ‌های هر روز در برنامه‌ی هفتگی */
  periodsPerDay: '4',
  /** نظرسنجی دانش‌آموزان از معلم‌ها باز است؟ */
  teacherSurveyOpen: '1',
  /** اختیاری: ۱ مثبت خودکار برای هر روزی که گزارش مطالعه ارسال شد */
  autoStudyPraise: '0',
  /** اختیاری: ۱ منفی خودکار برای هر روزِ تمام‌شده که گزارش مطالعه ارسال نشد (از روز فعال‌سازی به بعد) */
  autoStudyNegative: '0',
  autoStudyNegativeSince: '',
};

export async function getSchool(schoolId: string | null) {
  if (!schoolId) return null;
  return (await db.select().from(schools).where(eq(schools.id, schoolId)).limit(1))[0] ?? null;
}
export async function getSettings(schoolId: string): Promise<Record<string, string>> {
  const rows = await db.select().from(settings).where(eq(settings.schoolId, schoolId));
  const school = await getSchool(schoolId);
  return { ...DEFAULTS, schoolName: school?.name ?? '', ...Object.fromEntries(rows.map((r) => [r.key, r.value])) };
}
export async function setSetting(schoolId: string, key: string, value: string) {
  await db.insert(settings).values({ schoolId, key, value }).onConflictDoUpdate({ target: [settings.schoolId, settings.key], set: { value } });
}
export async function getStudyWindow(schoolId: string) {
  const s = await getSettings(schoolId);
  return { ...windowFromSettings(s.studyWindowStart, s.studyWindowEnd), startLabel: s.studyWindowStart, endLabel: s.studyWindowEnd };
}
