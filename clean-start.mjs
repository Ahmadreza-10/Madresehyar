/**
 * شروع تمیز برای آزمایش: همه‌ی اطلاعات پاک می‌شود و فقط یک مدرسه و ۵ کاربر (از جمله مدیرکل سامانه) ساخته می‌شود.
 * قبل از پاک کردن، از دیتابیس و فایل‌های آپلودشده در data/backup-... نسخه‌ی پشتیبان گرفته می‌شود.
 *
 * اجرا (بعد از خاموش کردن سایت):   node db/clean-start.mjs --yes
 * بعد از اجرا، همین فایل را پاک کنید (رمزها داخلش نوشته شده است).
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';

// ---------------- تنظیمات ----------------
const SCHOOL_NAME = 'مدرسه‌ی آزمایشی';
const ACADEMIC_YEAR = '۱۴۰۵-۱۴۰۶';
/** true = هر کاربر در اولین ورود مجبور می‌شود رمز تازه‌ی خودش را انتخاب کند (رمزهای زیر تصادفی و قوی‌اند، پس لازم نیست؛ برای تحویل به افراد واقعی true کنید) */
const FORCE_CHANGE = false;
const USERS = [
  { username: 'madreseh.admin', password: 'AjuR3S643LfwgF', firstName: 'مدیرکل', lastName: 'سامانه', role: 'ADMIN', noSchool: true, isOwner: true },
  { username: 'rezapour', password: '8DWKzSvYsggs72', firstName: 'قهرمان', lastName: 'رضاپور', role: 'PRINCIPAL' },
  { username: 'mehdizade', password: 'PR88PpgCmP4Pv2', firstName: 'جواد', lastName: 'مهدی‌زاده', role: 'VICE', viceTitle: 'معاون' },
  { username: 'abazari', password: '43c6r7hjm6Y4ke', firstName: 'علی', lastName: 'اباذری', role: 'TEACHER' },
  { username: 'moslemi', password: '8pP7HQb83yWkMH', firstName: 'احمدرضا', lastName: 'مسلمی', role: 'STUDENT' },
];
// -----------------------------------------

if (!process.argv.includes('--yes')) {
  console.log('این دستور همه‌ی اطلاعات سایت را پاک می‌کند (با پشتیبان).\nبرای اجرا بنویسید:  node db/clean-start.mjs --yes');
  process.exit(0);
}

// خواندن ساده‌ی .env (مثل بقیه‌ی اسکریپت‌های پروژه)
const envFile = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envFile)) for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i); if (!m || line.trim().startsWith('#')) continue;
  if (process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const url = process.env.DATABASE_URL ?? 'file:./data/school.db';
if (!url.startsWith('file:')) { console.error('✗ DATABASE_URL به یک فایل محلی اشاره نمی‌کند؛ برای امنیت متوقف شد.'); process.exit(1); }
const dbFile = path.resolve(process.cwd(), url.slice(5));
const uploads = path.resolve(process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'data', 'uploads'));
const SUF = ['', '-shm', '-wal', '-journal'];

// ۱) پشتیبان
const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
const bak = path.join(path.dirname(dbFile), `backup-${stamp}`);
fs.mkdirSync(bak, { recursive: true });
for (const s of SUF) if (fs.existsSync(dbFile + s)) fs.copyFileSync(dbFile + s, path.join(bak, path.basename(dbFile) + s));
if (fs.existsSync(uploads)) fs.cpSync(uploads, path.join(bak, 'uploads'), { recursive: true });
console.log(`✓ پشتیبان گرفته شد: ${bak}`);

// ۲) پاک کردن دیتابیس و فایل‌های آپلودشده
try {
  for (const s of SUF) if (fs.existsSync(dbFile + s)) fs.rmSync(dbFile + s);
  fs.rmSync(uploads, { recursive: true, force: true }); fs.mkdirSync(uploads, { recursive: true });
} catch (e) { console.error('✗ پاک کردن ممکن نشد. احتمالاً سایت هنوز روشن است؛ آن را با Ctrl+C خاموش کنید و دوباره امتحان کنید.\n', e.message); process.exit(1); }

// ۳) ساخت جدول‌ها
fs.mkdirSync(path.dirname(dbFile), { recursive: true });
const client = createClient({ url });
await migrate(drizzle(client), { migrationsFolder: path.resolve(process.cwd(), 'drizzle') });
console.log('✓ جدول‌ها ساخته شد.');

// ۴) مدرسه و کاربران
const now = Math.floor(Date.now() / 1000); const schoolId = crypto.randomUUID();
await client.execute({ sql: 'INSERT INTO schools (id, name, created_at) VALUES (?, ?, ?)', args: [schoolId, SCHOOL_NAME, now] });
for (const [k, v] of [['academicYear', ACADEMIC_YEAR], ['studyWindowStart', '08:00'], ['studyWindowEnd', '24:00'], ['showRankLists', '1']])
  await client.execute({ sql: 'INSERT INTO settings (school_id, key, value) VALUES (?, ?, ?)', args: [schoolId, k, v] });
for (const u of USERS) {
  const hash = await bcrypt.hash(u.password, 10);
  await client.execute({
    sql: 'INSERT INTO users (id, username, password_hash, first_name, last_name, role, school_id, vice_title, is_owner, must_change_password, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    args: [crypto.randomUUID(), u.username.toLowerCase(), hash, u.firstName, u.lastName, u.role, u.noSchool ? null : schoolId, u.viceTitle ?? null, u.isOwner ? 1 : 0, FORCE_CHANGE ? 1 : 0, now],
  });
}
console.log(`✓ ${USERS.length} کاربر ساخته شد: ${USERS.map((u) => `${u.firstName} ${u.lastName} (${u.username})`).join('، ')}`);
console.log(FORCE_CHANGE ? '✓ هر کاربر در اولین ورود باید رمز تازه انتخاب کند.' : '! تغییر رمز اجباری نیست.');
console.log('حالا سایت را اجرا کنید. بعد از اطمینان، این فایل و پوشه‌ی backup-... را پاک کنید.');
client.close();
