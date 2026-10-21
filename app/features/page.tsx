import Link from 'next/link';
import { Illus, LogoMark, type IllusName } from '@/components/Illus';

export const metadata = { title: 'امکانات سامانه' };

type F = { icon: IllusName; t: string; d: string };
const ROLES: { title: string; icon: IllusName; items: F[] }[] = [
  { title: 'مدیر و معاون', icon: 'school', items: [
    { icon: 'users', t: 'مدیریت کاربران', d: 'ساخت حساب معلم، دانش‌آموز و ولی، ورود گروهی، فعال/غیرفعال‌سازی و بازنشانی رمز.' },
    { icon: 'students', t: 'کلاس‌ها و دانش‌آموزان', d: 'تعریف کلاس و درس، تخصیص معلم، فهرست دانش‌آموزان و اتصال ولی.' },
    { icon: 'schedule', t: 'برنامه‌ی هفتگی', d: 'برنامه‌ی هر کلاس و معلم با تعداد زنگ قابل‌تنظیم، مناسب چاپ و موبایل.' },
    { icon: 'grades', t: 'نمرات و رتبه‌بندی', d: 'نمایش آمار کلاس، نفرات برتر، میانگین‌ها و نمودار پیشرفت.' },
    { icon: 'attendance', t: 'حضور و غیاب', d: 'تقویم حضور و غیاب، گزارش غیبت و تأخیر هر دانش‌آموز.' },
    { icon: 'announcements', t: 'اطلاعیه‌ها', d: 'ارسال اطلاعیه برای همه یا یک کلاس، همراه با پیوست.' },
    { icon: 'discipline', t: 'انضباطی و گزارش‌ها', d: 'ثبت موارد انضباطی و کارنامه‌ی قابل‌چاپ.' },
    { icon: 'settings', t: 'اشتراک و تنظیمات', d: 'مشاهده‌ی تاریخ پایان اشتراک و درخواست تمدید، تنظیم تعداد زنگ‌ها.' },
  ] },
  { title: 'معلم', icon: 'teacher', items: [
    { icon: 'grades', t: 'ثبت نمره', d: 'ثبت سریع نمره‌ی آزمون و تکلیف و محاسبه‌ی خودکار میانگین.' },
    { icon: 'attendance', t: 'حضور و غیاب کلاس', d: 'ثبت حضور هر جلسه با چند کلیک.' },
    { icon: 'assignments', t: 'تکلیف', d: 'تعریف تکلیف با مهلت و پیوست، مشاهده‌ی وضعیت انجام.' },
    { icon: 'study', t: 'گزارش مطالعه', d: 'پیگیری مطالعه‌ی روزانه‌ی دانش‌آموزان و بازخورد به آن‌ها.' },
    { icon: 'schedule', t: 'برنامه‌ی من', d: 'برنامه‌ی هفتگی شخصی معلم.' },
  ] },
  { title: 'دانش‌آموز', icon: 'study', items: [
    { icon: 'report', t: 'کارنامه و نمودار', d: 'نمرات، میانگین، رتبه و روند پیشرفت در طول سال.' },
    { icon: 'study', t: 'گزارش مطالعه‌ی روزانه', d: 'ثبت ساده‌ی مطالعه و دیدن آمار هفته و ماه.' },
    { icon: 'assignments', t: 'تکالیف و یادآور', d: 'فهرست تکالیف با مهلت، یادآوری و ارسال پاسخ.' },
    { icon: 'schedule', t: 'برنامه‌ی هفتگی', d: 'برنامه‌ی کلاس، مناسب موبایل.' },
    { icon: 'messages', t: 'پیام‌رسان و گروه‌ها', d: 'گفت‌وگو با معلم‌ها و عضویت در گروه‌ها و کانال‌های کلاس.' },
  ] },
  { title: 'ولی', icon: 'users', items: [
    { icon: 'report', t: 'پیگیری فرزند', d: 'نمرات، حضور و غیاب، تکالیف و گزارش مطالعه‌ی فرزند (یا چند فرزند).' },
    { icon: 'announcements', t: 'اطلاعیه‌ها', d: 'دریافت اطلاعیه‌ی مدرسه و کلاس.' },
    { icon: 'messages', t: 'ارتباط با مدرسه', d: 'پیام مستقیم به معلم و مدیر.' },
  ] },
];
const COMMON: F[] = [
  { icon: 'help', t: 'مناسب موبایل', d: 'همه‌ی صفحات برای گوشی بهینه است؛ منوی پایین و فهرست‌های کارتی.' },
  { icon: 'log', t: 'امنیت و جداسازی', d: 'هر مدرسه فقط داده‌های خودش را می‌بیند؛ دسترسی هر نقش جداست.' },
  { icon: 'note', t: 'پیوست و فایل', d: 'ارسال عکس، PDF و فایل‌های آفیس در اطلاعیه، پیام و تکلیف.' },
  { icon: 'settings', t: 'آواتار و ظاهر', d: 'پروفایل با آواتار، حالت روشن/تیره و ارقام فارسی.' },
];

export default function FeaturesPage() {
  return (
    <main className="reg-page">
      <header className="reg-head"><LogoMark size={44} /><div><b>مدرسه‌یار</b><span>امکانات سامانه</span></div><Link href="/login" className="btn ghost sm">ورود</Link></header>
      <section className="feat-hero"><h1>هر آنچه مدرسه‌ی شما لازم دارد</h1><p className="muted">امکانات هر نقش را ببینید و اگر مناسب بود، تعرفه را انتخاب کنید.</p></section>
      {ROLES.map((r) => (
        <section key={r.title} className="feat-role card">
          <h2><Illus name={r.icon} size={36} /> {r.title}</h2>
          <div className="feat-grid">{r.items.map((f) => <div className="feat" key={f.t}><Illus name={f.icon} size={34} /><b>{f.t}</b><p>{f.d}</p></div>)}</div>
        </section>))}
      <section className="feat-role card"><h2>برای همه</h2><div className="feat-grid">{COMMON.map((f) => <div className="feat" key={f.t}><Illus name={f.icon} size={34} /><b>{f.t}</b><p>{f.d}</p></div>)}</div></section>
      <section className="card feat-cta"><h2>آماده‌اید؟</h2><p className="muted">تعرفه را انتخاب کنید و درخواست بدهید؛ پس از تأیید و پرداخت، مدیر مدرسه می‌شوید.</p><Link href="/register" className="btn">مشاهده‌ی تعرفه‌ها</Link></section>
    </main>
  );
}
