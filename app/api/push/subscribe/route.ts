import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { pushSubscriptions } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';

const sub = z.object({ endpoint: z.string().url().max(1000), keys: z.object({ p256dh: z.string().min(10).max(300), auth: z.string().min(4).max(200) }) });
/** ثبت اشتراک اعلانِ این دستگاه (فقط برای اولیا) */
export async function POST(req: Request) {
  const u = await getCurrentUser(); if (!u || u.role !== 'PARENT') return new Response('forbidden', { status: 403 });
  const p = sub.safeParse(await req.json().catch(() => null)); if (!p.success) return new Response('bad request', { status: 400 });
  await db.insert(pushSubscriptions).values({ userId: u.id, endpoint: p.data.endpoint, p256dh: p.data.keys.p256dh, auth: p.data.keys.auth })
    .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: { userId: u.id, p256dh: p.data.keys.p256dh, auth: p.data.keys.auth } });
  return Response.json({ ok: true });
}
export async function DELETE(req: Request) {
  const u = await getCurrentUser(); if (!u) return new Response('unauthorized', { status: 401 });
  const b = z.object({ endpoint: z.string().max(1000) }).safeParse(await req.json().catch(() => null)); if (!b.success) return new Response('bad request', { status: 400 });
  await db.delete(pushSubscriptions).where(and(eq(pushSubscriptions.userId, u.id), eq(pushSubscriptions.endpoint, b.data.endpoint)));
  return Response.json({ ok: true });
}
