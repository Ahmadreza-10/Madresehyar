import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createClient } from '@libsql/client';
import { BACKUP_RE, createBackup, listBackups, pruneBackups, stamp } from '@/lib/backup';

let tmp: string; let dbUrl: string;
beforeAll(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bk-'));
  dbUrl = `file:${path.join(tmp, 'src.db')}`;
  const c = createClient({ url: dbUrl });
  await c.execute('CREATE TABLE t (id INTEGER PRIMARY KEY, v TEXT)');
  await c.execute("INSERT INTO t (v) VALUES ('نمره'), ('غیبت')");
  c.close();
});
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

describe('پشتیبان‌گیری', () => {
  it('نام فایل با الگوی سخت‌گیرانه ساخته می‌شود', () => {
    expect(BACKUP_RE.test(`school-${stamp(new Date('2026-10-27T10:20:30Z'))}.db`)).toBe(true);
    expect(stamp(new Date('2026-10-27T10:20:30Z'))).toBe('2026-10-27-102030');
  });
  it('الگو مسیرهای خطرناک را رد می‌کند', () => {
    for (const bad of ['../school.db', 'school-2026-10-27-102030.db/../x', 'school.db', '/etc/passwd', 'school-2026-10-27-102030.db.exe']) expect(BACKUP_RE.test(bad)).toBe(false);
  });
  it('یک نسخه‌ی کامل و قابل‌خواندن می‌سازد', async () => {
    const dir = path.join(tmp, 'out');
    const b = await createBackup({ dir, url: dbUrl, now: new Date('2026-10-27T10:00:00Z') });
    expect(b.size).toBeGreaterThan(0);
    const c = createClient({ url: `file:${path.join(dir, b.name)}` });
    const r = await c.execute('SELECT v FROM t ORDER BY id'); c.close();
    expect(r.rows.map((x) => x.v)).toEqual(['نمره', 'غیبت']);
  });
  it('دو بار در یک ثانیه فایل تکراری نمی‌سازد', async () => {
    const dir = path.join(tmp, 'dup'); const now = new Date('2026-10-27T10:00:00Z');
    await createBackup({ dir, url: dbUrl, now }); await createBackup({ dir, url: dbUrl, now });
    expect(listBackups(dir)).toHaveLength(1);
  });
  it('فقط نسخه‌های آخر را نگه می‌دارد و فایل‌های غیرمرتبط را دست نمی‌زند', async () => {
    const dir = path.join(tmp, 'prune');
    for (const d of ['2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23']) await createBackup({ dir, url: dbUrl, now: new Date(`${d}T08:00:00Z`) });
    fs.writeFileSync(path.join(dir, 'notes.txt'), 'x');
    expect(pruneBackups(2, dir)).toBe(2);
    expect(listBackups(dir).map((b) => b.name.slice(7, 17))).toEqual(['2026-10-23', '2026-10-22']);
    expect(fs.existsSync(path.join(dir, 'notes.txt'))).toBe(true);
  });
  it('برای دیتابیس غیرفایلی خطا می‌دهد', async () => {
    await expect(createBackup({ dir: tmp, url: 'libsql://remote.example' })).rejects.toThrow();
  });
});
