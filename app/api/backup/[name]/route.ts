import fs from 'node:fs';
import path from 'node:path';
import { getCurrentUser } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { BACKUP_RE, backupDir } from '@/lib/backup';

/** دانلود یک فایل پشتیبان؛ فقط «ادمین اصلی». نام فایل با الگوی سخت‌گیرانه بررسی می‌شود (جلوگیری از خروج از پوشه). */
export async function GET(_: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const u = await getCurrentUser();
  if (!u || u.role !== 'ADMIN' || !u.isOwner) return new Response('not found', { status: 404 });
  if (!BACKUP_RE.test(name)) return new Response('not found', { status: 404 });
  const file = path.join(backupDir(), name);
  if (!fs.existsSync(file)) return new Response('not found', { status: 404 });
  await audit(u.id, 'BACKUP_DOWNLOAD', 'backup', name);
  return new Response(new Uint8Array(fs.readFileSync(file)), { headers: { 'content-type': 'application/octet-stream', 'content-disposition': `attachment; filename="${name}"`, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
}
