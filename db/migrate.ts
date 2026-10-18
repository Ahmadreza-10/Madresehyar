import fs from 'node:fs';
import path from 'node:path';
import { loadEnv } from './env';
loadEnv();

async function main() {
  fs.mkdirSync(path.resolve(process.cwd(), 'data'), { recursive: true });
  const { migrate } = await import('drizzle-orm/libsql/migrator');
  const { db } = await import('./index');
  await migrate(db, { migrationsFolder: path.resolve(process.cwd(), 'drizzle') });
  console.log('✓ جدول‌های دیتابیس آماده شد.');
}
main().catch((e) => { console.error(e); process.exit(1); });
