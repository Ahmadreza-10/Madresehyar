import 'server-only';
import fs from 'node:fs/promises';
import path from 'node:path';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { attachments, type ATTACHMENT_KINDS } from '@/db/schema';
import { sniffImage } from './image-check';

export const MAX_FILE_BYTES = 25 * 1024 * 1024;   // هر فایل
export const MAX_TOTAL_BYTES = 50 * 1024 * 1024;  // مجموع فایل‌های یک ارسال
export const MAX_FILES = 5;
export const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,application/pdf,.docx,.xlsx,.pptx,.zip';
export const HINT = `حداکثر ${MAX_FILES} فایل؛ هر فایل تا ۲۵ مگابایت (جمعاً ۵۰). عکس، PDF، Word/Excel/PowerPoint و ZIP`;

const OFFICE: Record<string, string> = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  zip: 'application/zip',
};
export type AttachKind = (typeof ATTACHMENT_KINDS)[number];
export type Prepared = { name: string; mime: string; size: number; data: Buffer };

/** نوع فایل از روی «بایت‌های ابتدایی» (نه نام و نه نوعِ اعلام‌شده) تشخیص داده می‌شود؛ فایل‌های اجرایی/اسکریپت/SVG/HTML پذیرفته نمی‌شوند */
function sniff(buf: Uint8Array, name: string): string | null {
  const img = sniffImage(buf); if (img) return img;
  if (buf.length >= 6 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return 'image/gif';
  if (buf.length >= 5 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46 && buf[4] === 0x2d) return 'application/pdf';
  if (buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04) { const ext = name.toLowerCase().split('.').pop() ?? ''; return OFFICE[ext] ?? null; }
  return null;
}
const safeName = (n: string) => n.replace(/[\\/\0\r\n]/g, '_').slice(0, 120) || 'file';

/** فایل‌های فیلد `files` یک فرم را می‌خواند و اعتبارسنجی می‌کند */
export async function readUploads(fd: FormData, field = 'files', already = 0): Promise<{ ok: true; files: Prepared[] } | { ok: false; error: string }> {
  const files = fd.getAll(field).filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length + already > MAX_FILES) return { ok: false, error: `حداکثر ${MAX_FILES} پیوست مجاز است.` };
  let total = 0; const out: Prepared[] = [];
  for (const f of files) {
    if (f.size > MAX_FILE_BYTES) return { ok: false, error: `حجم «${f.name}» بیشتر از ۲۵ مگابایت است.` };
    total += f.size; if (total > MAX_TOTAL_BYTES) return { ok: false, error: 'مجموع حجم فایل‌ها بیشتر از ۵۰ مگابایت است.' };
    const buf = new Uint8Array(await f.arrayBuffer()); const mime = sniff(buf, f.name);
    if (!mime) return { ok: false, error: `«${f.name}» پذیرفته نشد؛ فقط عکس، PDF، Word/Excel/PowerPoint و ZIP مجاز است.` };
    out.push({ name: safeName(f.name), mime, size: f.size, data: Buffer.from(buf) });
  }
  return { ok: true, files: out };
}

const dir = () => path.resolve(/* turbopackIgnore: true */ process.env.UPLOAD_DIR ?? path.join(/* turbopackIgnore: true */ process.cwd(), 'data', 'uploads'));
export const pathOf = (id: string) => path.join(/* turbopackIgnore: true */ dir(), id);

export async function saveAttachments(kind: AttachKind, ownerId: string, uploaderId: string, files: Prepared[]) {
  if (!files.length) return;
  await fs.mkdir(dir(), { recursive: true });
  for (const f of files) {
    const [row] = await db.insert(attachments).values({ kind, ownerId, name: f.name, mime: f.mime, size: f.size, uploaderId }).returning({ id: attachments.id });
    await fs.writeFile(pathOf(row.id), f.data);
  }
}
export async function listAttachments(kind: AttachKind, ownerIds: string[]) {
  if (!ownerIds.length) return [];
  return db.select({ id: attachments.id, ownerId: attachments.ownerId, name: attachments.name, mime: attachments.mime, size: attachments.size }).from(attachments).where(and(eq(attachments.kind, kind), inArray(attachments.ownerId, ownerIds)));
}
export async function deleteAttachmentRows(rows: { id: string }[]) {
  for (const r of rows) await fs.rm(pathOf(r.id), { force: true });
  if (rows.length) await db.delete(attachments).where(inArray(attachments.id, rows.map((r) => r.id)));
}
export async function deleteAttachmentsOf(kind: AttachKind, ownerId: string) {
  await deleteAttachmentRows(await listAttachments(kind, [ownerId]));
}
