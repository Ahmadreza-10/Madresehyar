'use server';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { announcements, assignments, attachments, chatPosts, messages } from '@/db/schema';
import { groupAccess } from '@/lib/groups';
import { requireActionUser } from '@/lib/auth';
import { canGradeSubject, isManager } from '@/lib/permissions';
import { deleteAttachmentRows } from '@/lib/uploads';

/** حذف یک پیوست توسط صاحبِ آن مورد (نویسنده‌ی اطلاعیه/پیام یا معلمِ تکلیف) */
export async function removeAttachment(fd: FormData) {
  const u = await requireActionUser();
  const [a] = await db.select().from(attachments).where(eq(attachments.id, String(fd.get('id')))).limit(1);
  if (!a) return;
  let ok = false;
  if (a.kind === 'message') ok = (await db.select().from(messages).where(eq(messages.id, a.ownerId)).limit(1))[0]?.senderId === u.id;
  else if (a.kind === 'announcement') { const [n] = await db.select().from(announcements).where(eq(announcements.id, a.ownerId)).limit(1); ok = !!n && n.schoolId === u.schoolId && (isManager(u.role) || n.authorId === u.id); }
  else if (a.kind === 'group_post') { const [gp] = await db.select().from(chatPosts).where(eq(chatPosts.id, a.ownerId)).limit(1); const ga = gp ? await groupAccess(u, gp.groupId) : null; ok = !!gp && !!ga && (gp.authorId === u.id || ga.canModerate); }
  else { const [t] = await db.select().from(assignments).where(eq(assignments.id, a.ownerId)).limit(1); ok = !!t && u.role === 'TEACHER' && (await canGradeSubject(u, t.classId, t.subjectId)); }
  if (!ok) return;
  await deleteAttachmentRows([a]);
  revalidatePath('/announcements'); revalidatePath('/messages'); revalidatePath('/assignments'); revalidatePath('/messages/groups', 'layout');
}
