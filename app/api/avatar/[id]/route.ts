import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { userAvatars, users } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { isStaff, visibleStudentIds } from '@/lib/permissions';

/** نمایش عکس پروفایل؛ فقط به کسانی که اجازه دارند: خودِ کاربر، کادر مدرسه، ولیِ همان دانش‌آموز و هم‌کلاسی‌ها */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getCurrentUser();
  if (!viewer) return new Response('unauthorized', { status: 401 });
  const [target] = await db.select({ id: users.id, role: users.role, schoolId: users.schoolId, classId: users.classId }).from(users).where(eq(users.id, id)).limit(1);
  if (!target) return new Response('not found', { status: 404 });
  let allowed = viewer.id === id || viewer.role === 'ADMIN';
  if (!allowed && viewer.schoolId && viewer.schoolId === target.schoolId) {
    const classmates = viewer.role === 'STUDENT' && target.role === 'STUDENT' && !!viewer.classId && viewer.classId === target.classId;
    allowed = classmates || isStaff(viewer.role) || isStaff(target.role) || (viewer.role === 'PARENT' && (await visibleStudentIds(viewer)).includes(id));
  }
  if (!allowed) return new Response('not found', { status: 404 });
  const [a] = await db.select().from(userAvatars).where(eq(userAvatars.userId, id)).limit(1);
  if (!a) return new Response('not found', { status: 404 });
  return new Response(new Uint8Array(a.data), { headers: { 'content-type': a.mime, 'x-content-type-options': 'nosniff', 'cache-control': 'private, max-age=31536000, immutable', 'content-disposition': 'inline' } });
}
