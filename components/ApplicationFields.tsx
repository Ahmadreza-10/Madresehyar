import type { purchaseRequests } from '@/db/schema';

export const SCHOOL_TYPES = ['ابتدایی', 'متوسطه‌ی اول', 'متوسطه‌ی دوم', 'هنرستان', 'پیش‌دبستانی', 'آموزشگاه / مرکز آموزشی', 'سایر'];
type V = Partial<typeof purchaseRequests.$inferSelect>;

/** فیلدهای اطلاعات مدرسه و مدیر؛ هم در فرم ثبت درخواست و هم در فرم ویرایشِ خریدار استفاده می‌شود */
export default function ApplicationFields({ v = {}, maxStudents = 0 }: { v?: V; maxStudents?: number }) {
  return (
    <>
      <h3 className="reg-sec">اطلاعات مدرسه</h3>
      <div className="field"><label>نام مدرسه</label><input name="schoolName" required maxLength={80} defaultValue={v.schoolName ?? ''} /></div>
      <div className="inline-fields">
        <div className="field"><label>مقطع / نوع مرکز</label><select name="schoolType" defaultValue={v.schoolType ?? ''}><option value="">انتخاب کنید</option>{SCHOOL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
        <div className="field"><label>تعداد دانش‌آموزان</label><input name="studentCount" type="number" min={1} max={maxStudents > 0 ? maxStudents : 50000} required inputMode="numeric" defaultValue={v.studentCount || ''} /></div>
        <div className="field"><label>تعداد معلمان <span className="muted">(اختیاری)</span></label><input name="teacherCount" type="number" min={0} max={5000} inputMode="numeric" defaultValue={v.teacherCount || ''} /></div>
      </div>
      <div className="inline-fields">
        <div className="field"><label>استان</label><input name="province" maxLength={60} defaultValue={v.province ?? ''} /></div>
        <div className="field"><label>شهر</label><input name="city" maxLength={60} defaultValue={v.city ?? ''} /></div>
      </div>
      <div className="field"><label>نشانی <span className="muted">(اختیاری)</span></label><input name="address" maxLength={250} defaultValue={v.address ?? ''} /></div>
      <h3 className="reg-sec">اطلاعات مدیر</h3>
      <div className="field"><label>نام و نام خانوادگی مدیر</label><input name="managerName" required maxLength={60} autoComplete="name" defaultValue={v.managerName ?? ''} /></div>
      <div className="inline-fields">
        <div className="field"><label>شماره‌ی موبایل <span className="muted">(نام کاربری پیگیری)</span></label><input name="phone" required dir="ltr" inputMode="tel" placeholder="09123456789" autoComplete="tel" defaultValue={v.phone ?? ''} /></div>
        <div className="field"><label>ایمیل <span className="muted">(اختیاری)</span></label><input name="email" type="email" dir="ltr" maxLength={100} autoComplete="email" defaultValue={v.email ?? ''} /></div>
      </div>
      <div className="field"><label>توضیحات <span className="muted">(اختیاری)</span></label><textarea name="note" maxLength={500} defaultValue={v.note ?? ''} /></div>
    </>
  );
}
