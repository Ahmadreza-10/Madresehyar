
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { loadEnv } from './env';

loadEnv();

async function main() {
  const url = process.env.DATABASE_URL ?? '';
  const token = process.env.TURSO_AUTH_TOKEN;
  const password = process.env.SEED_PASSWORD;

  // فقط اجازه اتصال به دیتابیس ابری Turso
  if (!url.startsWith('libsql://') || !token) {
    throw new Error(
      'توقف: آدرس یا توکن دیتابیس ابری Turso تنظیم نشده است.'
    );
  }

  if (!password || password.length < 12) {
    throw new Error(
      'توقف: ابتدا SEED_PASSWORD را به یک رمز قوی با حداقل ۱۲ نویسه تغییر بده.'
    );
  }

  const { db } = await import('./index');
  const s = await import('./schema');
  const { eq } = await import('drizzle-orm');

  // اگر از قبل مدرسه یا کاربری وجود دارد، هیچ تغییری نده.
  const existingUsers = await db
    .select({ id: s.users.id })
    .from(s.users)
    .limit(1);

  const existingSchools = await db
    .select({ id: s.schools.id })
    .from(s.schools)
    .limit(1);

  if (existingUsers.length || existingSchools.length) {
    throw new Error(
      'توقف امن: دیتابیس خالی نیست؛ هیچ داده‌ای تغییر نکرد.'
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const schoolId = randomUUID();

  await db.insert(s.schools).values({
    id: schoolId,
    name: 'مدرسه آزمایشی مدرسه‌یار',
    status: 'active',
  });

  const accounts = [
    {
      username: 'admin',
      firstName: 'مدیرکل',
      lastName: 'سامانه',
      role: 'ADMIN',
      schoolId: null,
      isOwner: true,
    },
    {
      username: 'principal1',
      firstName: 'مدیر',
      lastName: 'مدرسه',
      role: 'PRINCIPAL',
      schoolId,
    },
    {
      username: 'vice1',
      firstName: 'معاون',
      lastName: 'مدرسه',
      role: 'VICE',
      schoolId,
    },
    {
      username: 'teacher1',
      firstName: 'معلم',
      lastName: 'آزمایشی',
      role: 'TEACHER',
      schoolId,
    },
    {
      username: 'student1',
      firstName: 'دانش‌آموز',
      lastName: 'آزمایشی',
      role: 'STUDENT',
      schoolId,
    },
  ] as const;

  for (const account of accounts) {
    await db.insert(s.users).values({
      id: randomUUID(),
      ...account,
      passwordHash,
      mustChangePassword: true,
      status: 'active',
    });
  }

  console.log('ساخت مدرسه و پنج حساب اولیه با موفقیت انجام شد.');
  console.log('نام مدرسه: مدرسه آزمایشی مدرسه‌یار');
  console.log('نام‌های کاربری:');
  for (const account of accounts) {
    console.log(`- ${account.username} (${account.role})`);
  }
  console.log('رمز اولیه از متغیر SEED_PASSWORD خوانده شد.');
}

main().catch((error) => {
  console.error('خطا:', error);
  process.exitCode = 1;
});
