import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@libsql/client';

/**
 * پشتیبان‌گیری از دیتابیس SQLite.
 * از دستور VACUUM INTO استفاده می‌شود: یک نسخه‌ی کامل و سازگار (حتی وقتی سایت در حال کار است) در یک فایل تازه می‌نویسد.
 * پوشه‌ی پیش‌فرض: data/backups  (با BACKUP_DIR عوض می‌شود).  تعداد نسخه‌های نگه‌داشته‌شده: BACKUP_KEEP (پیش‌فرض ۱۴).
 */
export const BACKUP_PREFIX = 'school-';
export const BACKUP_RE = /^school-\d{4}-\d{2}-\d{2}-\d{6}\.db$/;

export function backupDir(): string {
  return path.resolve(/* turbopackIgnore: true */ process.env.BACKUP_DIR ?? path.join(/* turbopackIgnore: true */ process.cwd(), 'data', 'backups'));
}
function dbFilePath(): string | null {
  const url = process.env.DATABASE_URL ?? 'file:./data/school.db';
  return url.startsWith('file:') ? path.resolve(/* turbopackIgnore: true */ process.cwd(), url.slice(5)) : null;
}
export function backupKeep(): number { const n = Number(process.env.BACKUP_KEEP); return Number.isInteger(n) && n >= 1 ? n : 14; }

export function stamp(d = new Date()): string {
  const p = (n: number, l = 2) => String(n).padStart(l, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}-${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`;
}

export type BackupInfo = { name: string; size: number; createdAt: Date };

export function listBackups(dir = backupDir()): BackupInfo[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((n) => BACKUP_RE.test(n)).map((name) => { const st = fs.statSync(path.join(dir, name)); return { name, size: st.size, createdAt: st.mtime }; })
    .sort((a, b) => b.name.localeCompare(a.name));
}

/** نسخه‌های قدیمی‌تر از سقف را پاک می‌کند (فقط فایل‌هایی که با الگوی پشتیبان می‌خوانند) */
export function pruneBackups(keep = backupKeep(), dir = backupDir()): number {
  const old = listBackups(dir).slice(keep);
  for (const b of old) { try { fs.rmSync(path.join(dir, b.name)); } catch { /* ignore */ } }
  return old.length;
}

export async function createBackup(opts: { dir?: string; url?: string; now?: Date } = {}): Promise<BackupInfo> {
  const dir = opts.dir ?? backupDir(); const url = opts.url ?? process.env.DATABASE_URL ?? 'file:./data/school.db';
  if (!url.startsWith('file:')) throw new Error('پشتیبان‌گیری فقط برای دیتابیس فایلی (SQLite) پشتیبانی می‌شود.');
  fs.mkdirSync(dir, { recursive: true });
  const name = `${BACKUP_PREFIX}${stamp(opts.now)}.db`; const target = path.join(dir, name);
  if (fs.existsSync(target)) return { name, size: fs.statSync(target).size, createdAt: fs.statSync(target).mtime };
  const client = createClient({ url });
  try {
    // مسیر داخل رشته‌ی SQL است؛ نام فایل را خودمان می‌سازیم (فقط ارقام و خط تیره) و آپوستروف را برای اطمینان دو برابر می‌کنیم
    await client.execute(`VACUUM INTO '${target.replace(/'/g, "''")}'`);
  } finally { client.close(); }
  return { name, size: fs.statSync(target).size, createdAt: fs.statSync(target).mtime };
}

/** اگر امروز (به وقت UTC) هنوز پشتیبانی گرفته نشده بود، می‌گیرد و قدیمی‌ها را پاک می‌کند */
export async function ensureDailyBackup(): Promise<BackupInfo | null> {
  if (!dbFilePath() || !fs.existsSync(dbFilePath()!)) return null;
  const today = stamp().slice(0, 10);
  if (listBackups().some((b) => b.name.startsWith(`${BACKUP_PREFIX}${today}`))) return null;
  const b = await createBackup(); pruneBackups(); return b;
}
