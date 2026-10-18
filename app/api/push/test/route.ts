import { eq } from 'drizzle-orm';
import webpush from 'web-push';
import { db } from '@/db';
import { pushSubscriptions } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { getVapid } from '@/lib/reminders';

/** اعلان آزمایشی به همه‌ی دستگاه‌های ثبت‌شده‌ی همین کاربر */
export async function POST() {
  const u = await getCurrentUser(); if (!u || u.role !== 'PARENT') return new Response('forbidden', { status: 403 });
  const k = await getVapid(); webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? 'mailto:admin@example.com', k.publicKey, k.privateKey);
  const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, u.id));
  let sent = 0, failed = 0;
  for (const s of subs) {
    try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify({ title: '✅ یادآور فعال است', body: 'اعلان آزمایشی مدرسه‌یار؛ یادآورها به همین شکل می‌رسند.', url: '/study', tag: 'test' }), { TTL: 60 }); sent++; }
    catch (e) { failed++; const code = (e as { statusCode?: number }).statusCode; if (code === 404 || code === 410) await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, s.id)); }
  }
  return Response.json({ devices: subs.length, sent, failed });
}
