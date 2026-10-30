/**
 * ورود دانش‌آموزان یک کلاس از فایل CSV (ستون‌ها: firstName,lastName,nationalCode).
 *   نام کاربری = کد ملی، رمز = ‏12345678 (قابل‌تغییر با --password)
 *
 * اجرا از پوشه‌ی پروژه:
 *   node db/import-students.mjs --file c1.csv --class C1 --grade 9            ← فقط گزارش می‌دهد، چیزی تغییر نمی‌کند
 *   node db/import-students.mjs --file c1.csv --class C1 --grade 9 --apply    ← واقعاً ثبت می‌کند
 * (پایه را می‌توان عدد داد: 7 تا 12؛ در ویندوز بهتر است از حروف فارسی در دستور استفاده نشود)
 * گزینه‌ها: --school "بخشی از نام مدرسه" یا --school-num شماره  --password 12345678  --force-change (اولین ورود رمز عوض شود)  --out accounts.csv
 *           --link نام‌کاربریِ‌قدیمی=کدملی   (چند بار قابل تکرار) یعنی «این حساب موجود همان این دانش‌آموزِ فایل است»؛ برای نام‌هایی که املایشان فرق دارد
 *
 * قوانین:
 *  - دانش‌آموزی که نام کاربری‌اش همین کد ملی است «قبلاً وارد شده» حساب می‌شود و دست نمی‌خورد (اجرای دوباره بی‌خطر است).
 *  - دانش‌آموز موجودِ هم‌نام (با یکسان‌سازی ی/ک و فاصله) در همان مدرسه، به‌جای ساخت حساب تکراری به‌روز می‌شود:
 *    نام کاربری = کد ملی، رمز = رمز تعیین‌شده، کلاس = کلاس انتخابی؛ نمره‌ها و گزارش‌هایش می‌ماند.
 *  - اگر دانش‌آموز موجودی «شبیه» باشد ولی دقیقاً هم‌نام نباشد، در گزارش با علامت ⚠ می‌آید و حساب جدید ساخته می‌شود؛
 *    پیش از --apply بررسی کنید و در صورت لزوم همان حساب قدیمی را از «کاربران مدرسه» پاک کنید.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { createClient } from '@libsql/client';

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(`--${name}`); return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : def; };
const flag = (name) => args.includes(`--${name}`);
const LINKS = new Map(); args.forEach((a, i) => { if (a === '--link' && args[i + 1]?.includes('=')) { const [u, c] = args[i + 1].split('='); const d = c.replace(/\D/g, ''); LINKS.set(d.padStart(10, '0'), u.trim()); } });
const GRADES = { 7: 'هفتم', 8: 'هشتم', 9: 'نهم', 10: 'دهم', 11: 'یازدهم', 12: 'دوازدهم' };
const FILE = opt('file'), CLASS = opt('class'), GRADE = GRADES[opt('grade')] ?? opt('grade'), SCHOOL = opt('school'), SCHOOL_NUM = Number(opt('school-num', 0)), PASSWORD = opt('password', '12345678'), OUT = opt('out', 'accounts.csv'), APPLY = flag('apply'), FORCE = flag('force-change');
if (!FILE || !CLASS || !GRADE) { console.error('نمونه: node db/import-students.mjs --file c1.csv --class C1 --grade 9 [--apply]'); process.exit(1); }
if (PASSWORD.length < 8) { console.error('رمز باید حداقل ۸ نویسه باشد.'); process.exit(1); }

const norm = (s) => String(s ?? '').normalize('NFKC').replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/ئ/g, 'ی').replace(/[ۀة]/g, 'ه').replace(/[\u200c\u200f\u200e]/g, '').replace(/\s+/g, '').toLowerCase();
const normCode = (v) => { const d = String(v ?? '').replace(/[۰-۹]/g, (x) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(x)).replace(/\D/g, ''); return d ? d.padStart(10, '0') : ''; };
const validCode = (c) => { if (!/^\d{10}$/.test(c) || /^(\d)\1{9}$/.test(c)) return false; const s = [...c.slice(0, 9)].reduce((a, ch, i) => a + Number(ch) * (10 - i), 0); const r = s % 11; return r < 2 ? Number(c[9]) === r : Number(c[9]) === 11 - r; };
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

// --- خواندن CSV ساده (UTF-8، جداکننده‌ی ویرگول)
const text = fs.readFileSync(FILE, 'utf8').replace(/^\uFEFF/, '');
const lines = text.split(/\r?\n/).filter((l) => l.trim());
const split = (l) => { const out = []; let cur = '', q = false; for (let i = 0; i < l.length; i++) { const ch = l[i]; if (ch === '"') { if (q && l[i + 1] === '"') { cur += '"'; i++; } else q = !q; } else if (ch === ',' && !q) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out.map((x) => x.trim()); };
const head = split(lines[0]); const col = (n) => head.indexOf(n);
if ([col('firstName'), col('lastName'), col('nationalCode')].some((i) => i < 0)) { console.error('سطر اول فایل باید این ستون‌ها را داشته باشد: firstName,lastName,nationalCode'); process.exit(1); }
const people = lines.slice(1).map(split).map((r) => ({ first: r[col('firstName')].trim(), last: r[col('lastName')].trim(), code: normCode(r[col('nationalCode')]) }));

const db = createClient({ url: process.env.DATABASE_URL ?? 'file:./data/school.db' });
const q = async (sql, a = []) => (await db.execute({ sql, args: a })).rows;

// --- مدرسه (اگر --school نباشد: تنها مدرسه، یا تنها مدرسه‌ای که کلاسِ خواسته را دارد؛ وگرنه فهرست شماره‌دار)
let schools = await q('SELECT id, name FROM schools ORDER BY name');
if (SCHOOL) schools = schools.filter((s) => norm(s.name).includes(norm(SCHOOL)));
else if (SCHOOL_NUM) schools = schools[SCHOOL_NUM - 1] ? [schools[SCHOOL_NUM - 1]] : [];
else if (schools.length > 1) {
  const have = [];
  for (const sc of schools) if ((await q('SELECT 1 FROM classes WHERE school_id = ? AND name = ?', [sc.id, CLASS])).length) have.push(sc);
  if (have.length === 1) schools = have;
}
if (schools.length !== 1) {
  const all = await q('SELECT id, name FROM schools ORDER BY name');
  console.error(schools.length ? 'چند مدرسه پیدا شد؛ با --school-num شماره را بدهید (یا --school با نام دقیق‌تر):' : 'مدرسه‌ای پیدا نشد؛ یکی را با --school-num انتخاب کنید:');
  all.forEach((s, i) => console.error(`  ${i + 1}) ${s.name}`)); process.exit(1);
}
const school = schools[0]; console.log(`مدرسه: ${school.name}`);

// --- کلاس
let cls = (await q('SELECT id, name, grade_level, academic_year FROM classes WHERE school_id = ?', [school.id])).filter((c) => norm(c.name) === norm(CLASS));
if (cls.length > 1) cls = cls.filter((c) => norm(c.grade_level) === norm(GRADE));
let classId = cls[0]?.id; let createClass = false;
if (!classId) { createClass = true; console.log(`کلاس «${CLASS}» (پایه‌ی ${GRADE}) وجود ندارد و ساخته می‌شود.`); } else console.log(`کلاس: ${cls[0].name} (پایه‌ی ${cls[0].grade_level})`);

// --- دانش‌آموزان موجود مدرسه
const existing = await q("SELECT id, username, first_name, last_name, class_id FROM users WHERE school_id = ? AND role = 'STUDENT'", [school.id]);
const byUsername = new Map((await q('SELECT id, username FROM users')).map((u) => [u.username, u.id]));

const plan = []; const problems = [];
const seen = new Set();
for (const p of people) {
  const who = `${p.first} ${p.last}`;
  if (!p.first || !p.last) { problems.push(`ردیف ناقص (نام یا نام خانوادگی خالی): ${who || '—'}`); continue; }
  if (!validCode(p.code)) { problems.push(`کد ملی نامعتبر: ${who} → «${p.code}»`); continue; }
  if (seen.has(p.code)) { problems.push(`کد ملی تکراری در فایل: ${who} → ${p.code}`); continue; }
  seen.add(p.code);
  const owner = byUsername.get(p.code);
  const sameUser = existing.find((e) => e.username === p.code);
  if (owner && !sameUser) { problems.push(`نام کاربری ${p.code} (${who}) قبلاً برای حساب دیگری (غیر دانش‌آموزِ این مدرسه) گرفته شده؛ رد شد.`); continue; }
  if (sameUser) { plan.push({ ...p, action: 'skip', note: 'قبلاً با همین کد ملی وارد شده' }); continue; }
  const linkedUser = LINKS.get(p.code) && existing.find((e) => e.username === LINKS.get(p.code));
  if (LINKS.has(p.code) && !linkedUser) { problems.push(`--link: حساب «${LINKS.get(p.code)}» در دانش‌آموزان این مدرسه پیدا نشد (${who}).`); continue; }
  if (linkedUser) { plan.push({ ...p, action: 'update', id: linkedUser.id, oldUsername: linkedUser.username, note: `حساب موجود «${linkedUser.first_name} ${linkedUser.last_name}» (${linkedUser.username}) با --link به‌روز می‌شود` }); continue; }
  const full = norm(p.first + p.last);
  const exact = existing.filter((e) => norm(e.first_name + e.last_name) === full);
  if (exact.length === 1) { plan.push({ ...p, action: 'update', id: exact[0].id, oldUsername: exact[0].username, note: `حساب موجود «${exact[0].first_name} ${exact[0].last_name}» (${exact[0].username}) به‌روز می‌شود` }); continue; }
  if (exact.length > 1) { problems.push(`چند دانش‌آموز موجود با نام «${who}» هست؛ دستی بررسی کنید.`); continue; }
  const near = existing.filter((e) => norm(e.last_name).slice(0, 3) === norm(p.last).slice(0, 3) && norm(e.first_name).slice(0, 3) === norm(p.first).slice(0, 3));
  plan.push({ ...p, action: 'create', warn: near.length ? `⚠ شبیه: ${near.map((e) => `«${e.first_name} ${e.last_name}» (${e.username})`).join('، ')}` : '' });
}

const count = (a) => plan.filter((p) => p.action === a).length;
console.log(`\nدر فایل: ${people.length} نفر | ساخته می‌شود: ${count('create')} | به‌روز می‌شود (حساب موجود): ${count('update')} | قبلاً وارد شده: ${count('skip')} | مشکل‌دار: ${problems.length}`);
for (const p of plan.filter((x) => x.action === 'update')) console.log(`  ↻ ${p.first} ${p.last} ← ${p.note}`);
for (const p of plan.filter((x) => x.warn)) console.log(`  ${p.first} ${p.last}: ${p.warn}`);
for (const m of problems) console.log('  ✗ ' + m);

if (!APPLY) { console.log('\nاین فقط «گزارش» بود و چیزی تغییر نکرد. برای ثبت واقعی همین دستور را با --apply اجرا کنید.'); process.exit(0); }
if (problems.length) console.log('\nتوجه: موارد مشکل‌دار بالا ثبت نمی‌شوند.');

// --- ثبت
const hash = await bcrypt.hash(PASSWORD, 10);
const nowSec = Math.floor(Date.now() / 1000);
if (createClass) { classId = crypto.randomUUID(); const year = (await q("SELECT value FROM settings WHERE school_id = ? AND key = 'academicYear'", [school.id]))[0]?.value ?? ''; await q('INSERT INTO classes (id, school_id, name, grade_level, academic_year, created_at) VALUES (?,?,?,?,?,?)', [classId, school.id, CLASS, GRADE, year || '', nowSec]); }
const result = [];
for (const p of plan) {
  if (p.action === 'skip') { result.push({ ...p, status: 'قبلاً وارد شده (بدون تغییر)' }); continue; }
  if (p.action === 'update') { await q('UPDATE users SET username = ?, password_hash = ?, national_code = ?, class_id = ?, must_change_password = ? WHERE id = ?', [p.code, hash, p.code, classId, FORCE ? 1 : 0, p.id]); result.push({ ...p, status: 'حساب موجود به‌روز شد' }); continue; }
  await q("INSERT INTO users (id, username, password_hash, first_name, last_name, role, school_id, class_id, status, national_code, must_change_password, is_owner, created_at) VALUES (?,?,?,?,?, 'STUDENT', ?, ?, 'active', ?, ?, 0, ?)", [crypto.randomUUID(), p.code, hash, p.first, p.last, school.id, classId, p.code, FORCE ? 1 : 0, nowSec]);
  result.push({ ...p, status: 'ساخته شد' });
}
const csv = '\uFEFF' + ['نام,نام خانوادگی,نام کاربری,رمز عبور,وضعیت', ...result.map((r) => [r.first, r.last, `="${r.code}"`, PASSWORD, r.status].map(csvCell).join(','))].join('\r\n');
fs.writeFileSync(OUT, csv);
console.log(`\n✓ تمام شد. ساخته‌شده: ${result.filter((r) => r.status === 'ساخته شد').length} | به‌روزشده: ${result.filter((r) => r.status.startsWith('حساب')).length}`);
console.log(`فهرست نام کاربری و رمز در فایل ${OUT} ذخیره شد (پس از تحویل به دانش‌آموزان، آن را پاک کنید).`);
