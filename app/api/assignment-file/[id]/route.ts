import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { assignmentFiles, assignments } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { visibleClassIds } from '@/lib/permissions';

/** دانلود/نمایش پیوند تکلیف؛ فقط برای کسانی که کلاسِ آن تکلیف را می‌بینند (معلم، دانش‌آموز و ولیِ همان کلاس) */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getCurrentUser();
  if (!viewer) return new Response('unauthorized', { status: 401 });
  const [f] = await db.select().from(assignmentFiles).where(eq(assignmentFiles.id, id)).limit(1);
  if (!f) return new Response('not found', { status: 404 });
  const [a] = await db.select({ classId: assignments.classId }).from(assignments).where(eq(assignments.id, f.assignmentId)).limit(1);
  if (!a || !(await visibleClassIds(viewer)).includes(a.classId)) return new Response('not found', { status: 404 });
  const safeName = encodeURIComponent(f.name);
  return new Response(new Uint8Array(f.data), { headers: { 'content-type': f.mime, 'x-content-type-options': 'nosniff', 'cache-control': 'private, max-age=3600', 'content-disposition': `inline; filename*=UTF-8''${safeName}` } });
}
