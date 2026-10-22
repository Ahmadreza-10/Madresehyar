import 'server-only';
import fs from 'node:fs/promises';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';
import { deleteAttachmentRows, listAttachments, pathOf, readUploads, saveAttachments, type AttachKind } from './uploads';

export const clipText = (s: string, n = 90) => { const t = s.replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n) + '…' : t; };
export async function nameOf(userId: string | null): Promise<string> {
  if (!userId) return 'کاربر';
  const [x] = await db.select({ f: users.firstName, l: users.lastName }).from(users).where(eq(users.id, userId)).limit(1);
  return x ? `${x.f} ${x.l}` : 'کاربر';
}
/** متنِ خلاصه‌ی پیامی که به آن پاسخ داده می‌شود: خط اول نام نویسنده، بقیه متن */
export const snippetOf = (author: string, body: string, hasFiles: boolean) => `${author}\n${body ? clipText(body) : hasFiles ? '📎 پیوست' : ''}`;

/** ویرایش پیوست‌های یک پیام: حذف موارد انتخاب‌شده (`remove`) و افزودن فایل‌های تازه (`files`، شامل عکس‌های ویرایش‌شده) */
export async function planAttachmentEdit(kind: AttachKind, ownerId: string, fd: FormData) {
  const existing = await listAttachments(kind, [ownerId]);
  const rm = new Set(fd.getAll('remove').map(String)); const toRemove = existing.filter((a) => rm.has(a.id));
  const keep = existing.length - toRemove.length;
  const up = await readUploads(fd, 'files', keep);
  if (!up.ok) return { ok: false as const, error: up.error };
  return {
    ok: true as const, total: keep + up.files.length,
    apply: async (uploaderId: string) => { await deleteAttachmentRows(toRemove); await saveAttachments(kind, ownerId, uploaderId, up.files); },
  };
}

/** کپی پیوست‌های یک پیام برای پیامِ هدایت‌شده */
export async function copyAttachments(from: AttachKind, fromId: string, to: AttachKind, toId: string, uploaderId: string) {
  const list = await listAttachments(from, [fromId]); if (!list.length) return;
  const files = [];
  for (const a of list) { try { files.push({ name: a.name, mime: a.mime, size: a.size, data: await fs.readFile(pathOf(a.id)) }); } catch { /* فایل از روی دیسک رفته است */ } }
  await saveAttachments(to, toId, uploaderId, files);
}
