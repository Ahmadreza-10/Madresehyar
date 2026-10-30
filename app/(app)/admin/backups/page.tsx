import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { backupDir, backupKeep, listBackups } from '@/lib/backup';
import { Card, Empty, PageHead } from '@/components/ui';
import { BackupButton } from '@/components/BackupButton';

export const metadata = { title: 'پشتیبان‌گیری' };
const fmtSize = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} مگابایت` : `${Math.max(1, Math.round(n / 1024))} کیلوبایت`);

export default async function BackupsPage() {
  const me = await requireUser(['ADMIN']);
  if (!me.isOwner) redirect('/dashboard'); // فقط «ادمین اصلی»؛ پشتیبان شامل داده‌ی همه‌ی مدرسه‌هاست
  const rows = listBackups();
  const fmt = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Tehran' });
  return (
    <>
      <PageHead illus="settings" title="پشتیبان‌گیری" sub={`هر روز خودکار یک نسخه از دیتابیس گرفته می‌شود و ${backupKeep().toLocaleString('fa-IR')} نسخه‌ی آخر می‌ماند.`} />
      <Card title="ساخت پشتیبان">
        <p className="muted small">فایل‌ها در پوشه‌ی <code dir="ltr">{backupDir()}</code> ذخیره می‌شوند. پیشنهاد می‌شود هر چند وقت یک‌بار یکی را دانلود کنید و جای دیگری (فلش یا فضای ابری) نگه دارید.</p>
        <BackupButton />
      </Card>
      <Card title="نسخه‌های موجود">
        {!rows.length ? <Empty text="هنوز پشتیبانی ساخته نشده است." icon="settings" /> : (
          <div className="table-wrap"><table><thead><tr><th>زمان</th><th>حجم</th><th>فایل</th></tr></thead><tbody>
            {rows.map((b) => <tr key={b.name}><td className="num small" data-label="زمان">{fmt.format(b.createdAt)}</td><td className="small" data-label="حجم">{fmtSize(b.size)}</td><td data-label="فایل"><a className="btn ghost sm" href={`/api/backup/${b.name}`} download>دانلود</a></td></tr>)}
          </tbody></table></div>)}
      </Card>
      <Card title="بازگردانی (در صورت خرابی)">
        <ol className="muted small">
          <li>سایت را خاموش کنید.</li>
          <li>فایل <code dir="ltr">data/school.db</code> (و فایل‌های <code dir="ltr">-wal</code> و <code dir="ltr">-shm</code> کنارش، اگر هست) را کنار بگذارید.</li>
          <li>فایل پشتیبانِ دلخواه را به <code dir="ltr">data/school.db</code> تغییر نام بدهید و جای آن بگذارید.</li>
          <li>سایت را دوباره روشن کنید.</li>
        </ol>
        <p className="muted small">توجه: پشتیبان فقط دیتابیس است. فایل‌های آپلودشده (پیوست‌ها) در <code dir="ltr">data/uploads</code> جدا هستند و لازم است آن پوشه را هم کپی کنید.</p>
      </Card>
    </>
  );
}
