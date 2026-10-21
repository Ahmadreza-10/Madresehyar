import { notFound } from 'next/navigation';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { chatMembers, chatPosts, classes, users } from '@/db/schema';
import { addMembers, deleteGroup, deletePost, postToGroup, removeMember, setMemberRole, togglePinPost, updatePost } from '@/app/actions/groups';
import { requireSchoolUser } from '@/lib/auth';
import { groupAccess } from '@/lib/groups';
import { roleTitle, schoolOf } from '@/lib/permissions';
import { listAttachments } from '@/lib/uploads';
import { fullName } from '@/lib/format';
import ActionForm from '@/components/ActionForm';
import { UserAvatar } from '@/components/UserAvatar';
import { Badge } from '@/components/ui';
import { ChatShell, ChatThread } from '@/components/chat/ChatShell';
import ChatComposer from '@/components/chat/ChatComposer';
import type { Bubble } from '@/components/chat/Bubbles';

export const metadata = { title: 'گروه' };
export const dynamic = 'force-dynamic';

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const u = await requireSchoolUser(); const { id } = await params;
  const a = await groupAccess(u, id); if (!a) notFound();
  const g = a.group;
  const latest = await db.select().from(chatPosts).where(eq(chatPosts.groupId, id)).orderBy(desc(chatPosts.createdAt)).limit(200);
  const posts = [...latest].reverse();
  const files = await listAttachments('group_post', posts.map((p) => p.id));
  const mem = await db.select({ m: chatMembers, u: users }).from(chatMembers).innerJoin(users, eq(users.id, chatMembers.userId)).where(eq(chatMembers.groupId, id)).orderBy(asc(users.role), asc(users.lastName));
  const authorIds = [...new Set(posts.map((p) => p.authorId).filter((x): x is string => !!x))];
  const authors = authorIds.length ? await db.select().from(users).where(inArray(users.id, authorIds)) : [];
  const au = new Map(authors.map((x) => [x.id, x]));
  const roleOf = new Map(mem.map((x) => [x.m.userId, x.m.role]));
  const school = schoolOf(u);
  const cls = a.manager ? await db.select().from(classes).where(eq(classes.schoolId, school)).orderBy(asc(classes.name)) : [];
  const staff = a.manager ? await db.select().from(users).where(and(eq(users.schoolId, school), eq(users.status, 'active'), inArray(users.role, ['TEACHER', 'STUDENT', 'PARENT']))).orderBy(asc(users.role), asc(users.lastName)) : [];
  const memberIds = new Set(mem.map((x) => x.m.userId));
  const addable = staff.filter((s) => !memberIds.has(s.id));

  const bubbles: Bubble[] = posts.map((p) => {
    const mine = p.authorId === u.id; const canDel = mine || a.canModerate; const au1 = p.authorId ? au.get(p.authorId) : undefined;
    const menu = (mine || a.manager || a.canModerate) ? (<>
      {(mine || a.manager) && <details className="bmenu-edit"><summary className="btn ghost sm" style={{ display: 'inline-flex' }}>ویرایش</summary>
        <div style={{ marginTop: 8 }}><ActionForm action={updatePost} submit="ذخیره" resetOnSuccess={false} small><input type="hidden" name="id" value={p.id} /><textarea name="body" defaultValue={p.body} required maxLength={4000} style={{ minHeight: 70 }} /></ActionForm></div></details>}
      {a.canModerate && <form action={togglePinPost}><input type="hidden" name="id" value={p.id} /><button className="btn ghost sm">{p.pinned ? '📌 برداشتن سنجاق' : '📌 سنجاق'}</button></form>}
      {canDel && <form action={deletePost}><input type="hidden" name="id" value={p.id} /><button className="btn danger sm">حذف پیام</button></form>}</>) : undefined;
    return {
      id: p.id, mine, author: au1 ? `${fullName(au1)} • ${roleTitle(au1)}${roleOf.get(au1.id) === 'admin' ? ' • مدیر گروه' : ''}` : 'کاربر حذف‌شده',
      avatar: au1 ? <UserAvatar user={au1} size={34} /> : undefined, body: p.body, at: p.createdAt, edited: !!p.editedAt, pinned: p.pinned, files: files.filter((f) => f.ownerId === p.id), canRemoveFiles: canDel, menu,
    };
  });
  const pinned = posts.filter((p) => p.pinned);
  const pins = pinned.length ? (
    <details className="msgr-pins"><summary>📌 {pinned.length.toLocaleString('fa-IR')} پیام سنجاق‌شده</summary>
      <div className="msgr-pins-body">{pinned.map((p) => <div key={p.id} className="msgr-pin">{p.body ? (p.body.length > 140 ? p.body.slice(0, 140) + '…' : p.body) : '📎 پیوست'}</div>)}</div></details>) : undefined;

  const info = (
    <details className="msgr-info"><summary aria-label="اطلاعات گروه">ℹ️</summary>
      <div className="msgr-info-body">
        {g.description && <p className="muted small" style={{ margin: 0 }}>{g.description}</p>}
        <div className="row"><Badge tone={g.kind === 'channel' ? 'warn' : 'primary'}>{g.kind === 'channel' ? 'کانال: فقط مدیران می‌نویسند' : 'گروه: همه‌ی اعضا می‌نویسند'}</Badge></div>
        <b className="small">اعضا ({mem.length.toLocaleString('fa-IR')})</b>
        <div className="list">{mem.map(({ m, u: x }) => (
          <div className="list-item" key={m.id} style={{ flexWrap: 'wrap', padding: '8px 10px' }}>
            <div><b className="small">{fullName(x)}</b> <span className="muted small">{roleTitle(x)}</span> {m.role === 'admin' && <Badge tone="primary">مدیر گروه</Badge>}</div>
            {a.manager && <div className="row" style={{ gap: 6 }}>
              {x.role === 'TEACHER' && <form action={setMemberRole}><input type="hidden" name="groupId" value={id} /><input type="hidden" name="userId" value={x.id} /><input type="hidden" name="role" value={m.role === 'admin' ? 'member' : 'admin'} /><button className="btn ghost sm">{m.role === 'admin' ? 'برداشتن مدیریت' : 'مدیر گروه کن'}</button></form>}
              <form action={removeMember}><input type="hidden" name="groupId" value={id} /><input type="hidden" name="userId" value={x.id} /><button className="btn danger sm">حذف</button></form></div>}
          </div>))}</div>
        {a.manager && (<>
          <details><summary className="btn ghost sm" style={{ display: 'inline-flex' }}>+ افزودن عضو</summary>
            <div style={{ marginTop: 10 }}><ActionForm action={addMembers} submit="افزودن" small><input type="hidden" name="groupId" value={id} />
              <div className="field"><label>یک کاربر</label><select name="userId" defaultValue=""><option value="">—</option>{addable.map((s) => <option key={s.id} value={s.id}>{fullName(s)} — {roleTitle(s)}</option>)}</select></div>
              <label className="row" style={{ gap: 8 }}><input type="checkbox" name="asAdmin" style={{ width: 'auto', minHeight: 0 }} /> به‌عنوان مدیر گروه (فقط معلم)</label>
              <div className="field"><label>یا همه‌ی یک کلاس</label><select name="classId" defaultValue=""><option value="">—</option>{cls.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <label className="row" style={{ gap: 8 }}><input type="checkbox" name="withParents" style={{ width: 'auto', minHeight: 0 }} /> والدین هم اضافه شوند</label>
            </ActionForm></div></details>
          <form action={deleteGroup}><input type="hidden" name="id" value={id} /><button className="btn danger sm">حذف کامل گروه و پیام‌ها</button></form></>)}
      </div>
    </details>);

  return (
    <ChatShell activeKey={`g:${id}`}>
      <ChatThread name={g.name} sub={`${g.kind === 'channel' ? 'کانال' : 'گروه'} • ${mem.length.toLocaleString('fa-IR')} عضو`} avatar={<div className="avatar" style={{ width: 42, height: 42, fontSize: '1.2rem' }}>{g.kind === 'channel' ? '📢' : '👥'}</div>}
        bubbles={bubbles} showAuthor count={posts.length} headExtra={info} pins={pins} emptyText="هنوز پیامی در این گفتگو نیست."
        composer={a.canPost ? <ChatComposer action={postToGroup} hidden={{ groupId: id }} placeholder={g.kind === 'channel' ? 'پیام برای کانال…' : 'پیام برای گروه…'} /> : <div className="msgr-closed">در این کانال فقط مدیران می‌نویسند.</div>} />
    </ChatShell>
  );
}
