import fs from 'node:fs';
import path from 'node:path';
import { loadEnv } from './env';
loadEnv();
const url = process.env.DATABASE_URL ?? 'file:./data/school.db';
if (url.startsWith('file:')) {
  const f = path.resolve(process.cwd(), url.slice(5));
  for (const suffix of ['', '-shm', '-wal', '-journal']) if (fs.existsSync(f + suffix)) fs.rmSync(f + suffix);
  console.log('✓ دیتابیس حذف شد. حالا «npm run db:setup» را اجرا کنید.');
}
