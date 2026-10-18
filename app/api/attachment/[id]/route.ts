import fs from 'node:fs/promises';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { announcements, assignments, attachments, chatPosts, messages } from '@/db/schema';
import { groupAccess } from '@/lib/groups';
import { getCurrentUser } from '@/lib/auth';
import { visibleClassIds } from '@/lib/permissions';
import { pathOf } from '@/lib/uploads';

const INLINE = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']);

/** دانلود پیوستِ اطلاعیه/پیام/تکلیف؛ فقط برای کسی که خودِ آن مورد را می‌تواند ببیند */
export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const u = await getCurrentUser(); if (!u) return new Response('unauthorized', { status: 401 });
  const { id } = await ctx.params;
  const [a] = await db.select().from(attachments).where(eq(attachments.id, id)).limit(1);
  if (!a) return new Response('not found', { status: 404 });
  let ok = false;
  if (a.kind === 'message') {
    const [m] = await db.select().from(messages).where(eq(messages.id, a.ownerId)).limit(1);
    ok = !!m && (m.senderId === u.id || m.recipientId === u.id);
  } else if (a.kind === 'announcement') {
    const [n] = await db.select().from(announcements).where(eq(announcements.id, a.ownerId)).limit(1);
    ok = !!n && !!u.schoolId && n.schoolId === u.schoolId && (!n.classId || (await visibleClassIds(u)).includes(n.classId));
  } else if (a.kind === 'group_post') {
    const [gp] = await db.select().from(chatPosts).where(eq(chatPosts.id, a.ownerId)).limit(1);
    ok = !!gp && !!(await groupAccess(u, gp.groupId));
  } else {
    const [t] = await db.select().from(assignments).where(eq(assignments.id, a.ownerId)).limit(1);
    ok = !!t && (await visibleClassIds(u)).includes(t.classId);
  }
  if (!ok) return new Response('not found', { status: 404 });
  let data: Buffer; try { data = await fs.readFile(pathOf(a.id)); } catch { return new Response('not found', { status: 404 }); }
  const inline = INLINE.has(a.mime);
  return new Response(new Uint8Array(data), { headers: {
    'content-type': a.mime, 'content-length': String(data.length), 'x-content-type-options': 'nosniff', 'cache-control': 'private, max-age=3600',
    'content-disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(a.name)}`,
    'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
  } });
}
