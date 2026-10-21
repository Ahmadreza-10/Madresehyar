import 'server-only';
import { and, eq, inArray, isNotNull, lte } from 'drizzle-orm';
import { db } from '@/db';
import { schools, sessions, users } from '@/db/schema';

/** مدرسه‌هایی که اشتراکشان تمام شده «غیرفعال» می‌شوند و نشست اعضایشان بسته می‌شود (با تمدید دوباره فعال می‌شوند) */
export async function deactivateExpiredSchools(now = new Date()): Promise<number> {
  const rows = await db.update(schools).set({ status: 'disabled' }).where(and(eq(schools.status, 'active'), isNotNull(schools.subscriptionEndsAt), lte(schools.subscriptionEndsAt, now))).returning({ id: schools.id });
  if (!rows.length) return 0;
  const ids = (await db.select({ id: users.id }).from(users).where(inArray(users.schoolId, rows.map((r) => r.id)))).map((x) => x.id);
  if (ids.length) await db.delete(sessions).where(inArray(sessions.userId, ids));
  return rows.length;
}
