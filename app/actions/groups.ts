'use server';
import { and, eq, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/db';
import { chatGroups, chatMembers, chatPosts, parentStudents, users } from '@/db/schema';
import { nameOf, planAttachmentEdit, snippetOf } from '@/lib/chat-ops';
import { audit } from '@/lib/audit';
import { groupAccess } from '@/lib/groups';
import { classInSchool, schoolOf } from '@/lib/permissions';
import { deleteAttachmentRows, listAttachments, readUploads, saveAttachments } from '@/lib/uploads';
import { fail, firstZodError, run, success, type ActionState } from '@/lib/action';
import { redirect } from 'next/navigation';

const ALL = ['PRINCIPAL', 'VICE', 'TEACHER', 'STUDENT', 'PARENT'] as const;
const MGR = ['PRINCIPAL', 'VICE'] as const;
const bump = (id?: string) => { revalidatePath('/messages/groups'); if (id) revalidatePath(`/messages/groups/${id}`); };

/** افزودن کاربران به گروه (فقط کاربرانِ فعالِ همین مدرسه) */
async function addUsers(groupId: string, schoolId: string, ids: string[], role: 'admin' | 'member') {
  if (!ids.length) return 0;
  const ok = await db.select({ id: users.id }).from(users).where(and(eq(users.schoolId, schoolId), eq(users.status, 'active'), inArray(users.id, ids)));
  for (const r of ok) {
    await db.insert(chatMembers).values({ groupId, userId: r.id, role }).onConflictDoUpdate({ target: [chatMembers.groupId, chatMembers.userId], set: role === 'admin' ? { role: 'admin' } : { role: chatMembers.role } });
  }
  return ok.length;
}
/** دانش‌آموزان یک کلاس (و در صورت درخواست والدینشان) */
async function classPeople(classId: string, schoolId: string, withParents: boolean) {
  const st = (await db.select({ id: users.id }).from(users).where(and(eq(users.role, 'STUDENT'), eq(users.classId, classId), eq(users.schoolId, schoolId)))).map((r) => r.id);
  let pa: string[] = [];
  if (withParents && st.length) pa = (await db.select({ id: parentStudents.parentId }).from(parentStudents).where(inArray(parentStudents.studentId, st))).map((r) => r.id);
  return [...new Set([...st, ...pa])];
}

export async function createGroup(_: ActionState, fd: FormData): Promise<ActionState> {
  let newId = '';
  const res = await run([...MGR], async (u) => {
    const p = z.object({ name: z.string().trim().min(2, 'نام گروه را بنویسید.').max(80), kind: z.enum(['group', 'channel']), description: z.string().trim().max(300).optional(), classId: z.string().optional(), adminId: z.string().optional(), withParents: z.string().optional() }).safeParse(Object.fromEntries(fd));
    if (!p.success) return fail(firstZodError(p.error));
    const d = p.data; const sid = schoolOf(u);
    const classId = d.classId || null;
    if (classId && !(await classInSchool(u, classId))) return fail('این کلاس در مدرسه‌ی شما نیست.');
    if (d.adminId) { const [t] = await db.select({ id: users.id }).from(users).where(and(eq(users.id, d.adminId), eq(users.role, 'TEACHER'), eq(users.schoolId, sid), eq(users.status, 'active'))).limit(1); if (!t) return fail('مدیر گروه باید معلمِ همین مدرسه باشد.'); }
    const [g] = await db.insert(chatGroups).values({ schoolId: sid, name: d.name, kind: d.kind, description: d.description || null, classId, createdBy: u.id }).returning({ id: chatGroups.id });
    if (classId) await addUsers(g.id, sid, await classPeople(classId, sid, !!d.withParents), 'member');
    if (d.adminId) await addUsers(g.id, sid, [d.adminId], 'admin');
    await audit(u.id, 'GROUP_CREATE', 'group', g.id, d.name);
    newId = g.id; bump();
    return success('ساخته شد.');
  });
  if (res?.ok && newId) redirect(`/messages/groups/${newId}`);
  return res;
}

export async function deleteGroup(fd: FormData) {
  const id = String(fd.get('id') ?? '');
  let done = false;
  await run([...MGR], async (u) => {
    const a = await groupAccess(u, id); if (!a?.manager) return fail('اجازه ندارید.');
    const posts = await db.select({ id: chatPosts.id }).from(chatPosts).where(eq(chatPosts.groupId, id));
    for (const p of posts) await deleteAttachmentRows(await listAttachments('group_post', [p.id]));
    await db.delete(chatGroups).where(eq(chatGroups.id, id));
    await audit(u.id, 'GROUP_DELETE', 'group', id, a.group.name); bump(); done = true;
    return success();
  });
  if (done) redirect('/messages/groups');
}

/** افزودن عضو: تکی (userId) یا همه‌ی یک کلاس (classId) */
export async function addMembers(_: ActionState, fd: FormData): Promise<ActionState> {
  return run([...MGR], async (u) => {
    const gid = String(fd.get('groupId') ?? ''); const a = await groupAccess(u, gid); if (!a?.manager) return fail('اجازه ندارید.');
    const sid = schoolOf(u); const classId = String(fd.get('classId') ?? ''); const userId = String(fd.get('userId') ?? '');
    const asAdmin = fd.get('asAdmin') === 'on';
    let n = 0;
    if (classId) { if (!(await classInSchool(u, classId))) return fail('این کلاس در مدرسه‌ی شما نیست.'); n += await addUsers(gid, sid, await classPeople(classId, sid, fd.get('withParents') === 'on'), 'member'); }
    if (userId) n += await addUsers(gid, sid, [userId], asAdmin ? 'admin' : 'member');
    if (!classId && !userId) return fail('یک کاربر یا یک کلاس را انتخاب کنید.');
    if (!n) return fail('کسی اضافه نشد (کاربر در مدرسه‌ی شما نیست یا غیرفعال است).');
    await audit(u.id, 'GROUP_ADD', 'group', gid, `${n}`); bump(gid);
    return success(`${n} نفر اضافه یا به‌روز شد.`);
  });
}

export async function removeMember(fd: FormData) {
  await run([...MGR], async (u) => {
    const gid = String(fd.get('groupId') ?? ''); const a = await groupAccess(u, gid); if (!a?.manager) return fail('اجازه ندارید.');
    await db.delete(chatMembers).where(and(eq(chatMembers.groupId, gid), eq(chatMembers.userId, String(fd.get('userId') ?? ''))));
    await audit(u.id, 'GROUP_REMOVE', 'group', gid); bump(gid); return success();
  });
}

/** تعیین/برداشتن «مدیر گروه» (فقط معلم می‌تواند مدیر گروه شود) */
export async function setMemberRole(fd: FormData) {
  await run([...MGR], async (u) => {
    const gid = String(fd.get('groupId') ?? ''); const uid = String(fd.get('userId') ?? ''); const a = await groupAccess(u, gid); if (!a?.manager) return fail('اجازه ندارید.');
    const role = fd.get('role') === 'admin' ? 'admin' : 'member';
    if (role === 'admin') { const [t] = await db.select({ id: users.id }).from(users).where(and(eq(users.id, uid), eq(users.role, 'TEACHER'), eq(users.schoolId, schoolOf(u)))).limit(1); if (!t) return fail('فقط معلم می‌تواند مدیر گروه شود.'); }
    await db.update(chatMembers).set({ role }).where(and(eq(chatMembers.groupId, gid), eq(chatMembers.userId, uid)));
    await audit(u.id, 'GROUP_ROLE', 'group', gid, `${uid}:${role}`); bump(gid); return success();
  });
}

export async function postToGroup(_: ActionState, fd: FormData): Promise<ActionState> {
  return run([...ALL], async (u) => {
    const gid = String(fd.get('groupId') ?? ''); const a = await groupAccess(u, gid);
    if (!a) return fail('این گروه پیدا نشد.'); if (!a.canPost) return fail('در این کانال فقط مدیران می‌توانند پیام بگذارند.');
    const body = String(fd.get('body') ?? '').trim();
    const up = await readUploads(fd); if (!up.ok) return fail(up.error);
    if (body.length < 1 && !up.files.length) return fail('متن یا فایل بگذارید.'); if (body.length > 4000) return fail('متن بیش از ۴۰۰۰ نویسه است.');
    let replyToId: string | null = null; let replySnippet: string | null = null; const rid = String(fd.get('replyToId') ?? '');
    if (rid) { const [r] = await db.select().from(chatPosts).where(eq(chatPosts.id, rid)).limit(1); if (r && r.groupId === gid) { replyToId = r.id; replySnippet = snippetOf(await nameOf(r.authorId), r.body, (await listAttachments('group_post', [r.id])).length > 0); } }
    const [p] = await db.insert(chatPosts).values({ groupId: gid, authorId: u.id, body, replyToId, replySnippet }).returning({ id: chatPosts.id });
    await saveAttachments('group_post', p.id, u.id, up.files);
    bump(gid); return success('ارسال شد.');
  });
}

export async function updatePost(_: ActionState, fd: FormData): Promise<ActionState> {
  return run([...ALL], async (u) => {
    const [p] = await db.select().from(chatPosts).where(eq(chatPosts.id, String(fd.get('id') ?? ''))).limit(1); if (!p) return fail('پیدا نشد.');
    const a = await groupAccess(u, p.groupId); if (!a || !(p.authorId === u.id || a.manager)) return fail('اجازه ندارید.');
    const body = String(fd.get('body') ?? '').trim(); if (body.length > 4000) return fail('متن بیش از ۴۰۰۰ نویسه است.');
    const plan = await planAttachmentEdit('group_post', p.id, fd); if (!plan.ok) return fail(plan.error);
    if (!body && plan.total === 0) return fail('پیام نمی‌تواند خالی باشد.');
    await plan.apply(u.id);
    await db.update(chatPosts).set({ body, editedAt: new Date() }).where(eq(chatPosts.id, p.id)); bump(p.groupId); return success('ذخیره شد.');
  });
}

export async function deletePost(fd: FormData) {
  await run([...ALL], async (u) => {
    const [p] = await db.select().from(chatPosts).where(eq(chatPosts.id, String(fd.get('id') ?? ''))).limit(1); if (!p) return fail('پیدا نشد.');
    const a = await groupAccess(u, p.groupId); if (!a || !(p.authorId === u.id || a.canModerate)) return fail('اجازه ندارید.');
    await deleteAttachmentRows(await listAttachments('group_post', [p.id]));
    await db.delete(chatPosts).where(eq(chatPosts.id, p.id)); bump(p.groupId); return success();
  });
}

export async function togglePinPost(fd: FormData) {
  await run([...ALL], async (u) => {
    const [p] = await db.select().from(chatPosts).where(eq(chatPosts.id, String(fd.get('id') ?? ''))).limit(1); if (!p) return fail('پیدا نشد.');
    const a = await groupAccess(u, p.groupId); if (!a?.canModerate) return fail('اجازه ندارید.');
    await db.update(chatPosts).set({ pinned: !p.pinned }).where(eq(chatPosts.id, p.id)); bump(p.groupId); return success();
  });
}
