import { headers } from 'next/headers';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { auditLogs, users } from '@/db/schema';

export async function audit(actorId: string | null, action: string, entity: string, entityId?: string, detail?: string) {
  try {
    const h = await headers();
    const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? null;
    const schoolId = actorId ? (await db.select({ s: users.schoolId }).from(users).where(eq(users.id, actorId)).limit(1))[0]?.s ?? null : null;
    await db.insert(auditLogs).values({ actorId, schoolId, action, entity, entityId: entityId ?? null, detail: detail ?? null, ip });
  } catch (e) {
    console.error('audit failed', e); // ثبت لاگ نباید عملیات اصلی را خراب کند
  }
}
