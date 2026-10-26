/** پایه‌های تحصیلی؛ «پایه» همان چیزی است که چند کلاس را برای رتبه‌بندی در یک گروه قرار می‌دهد (مثلاً C1 و C2 هر دو «نهم») */
export const GRADE_LEVELS = ['اول', 'دوم', 'سوم', 'چهارم', 'پنجم', 'ششم', 'هفتم', 'هشتم', 'نهم', 'دهم', 'یازدهم', 'دوازدهم'] as const;
export const isKnownGrade = (g?: string | null): boolean => !!g && (GRADE_LEVELS as readonly string[]).includes(g);
/** «پایه‌ی نهم»؛ اگر پایه هنوز انتخاب نشده باشد (فقط نام کلاسِ مثل C1 ثبت شده) فقط «پایه» نوشته می‌شود تا نام کلاس به‌جای پایه نمایش داده نشود */
export const gradeTitle = (g?: string | null) => (isKnownGrade(g) ? `پایه‌ی ${g}` : 'پایه');
