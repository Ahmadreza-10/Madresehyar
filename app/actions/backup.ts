'use server';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { createBackup, pruneBackups } from '@/lib/backup';
import { fail, success, type ActionState } from '@/lib/action';

/** گرفتن پشتیبان دستی؛ فقط «ادمین اصلی» سامانه */
export async function createBackupAction(): Promise<ActionState> {
  const u = await getCurrentUser();
  if (!u || u.role !== 'ADMIN' || !u.isOwner) return fail('اجازه‌ی این کار را ندارید.');
  try {
    const b = await createBackup({ now: new Date() }); pruneBackups();
    await audit(u.id, 'BACKUP_CREATE', 'backup', b.name);
    revalidatePath('/admin/backups');
    return success(`پشتیبان ساخته شد: ${b.name}`);
  } catch (e) { console.error('[backup] manual failed', e); return fail('ساخت پشتیبان ناموفق بود. جزئیات در گزارش سرور است.'); }
}
