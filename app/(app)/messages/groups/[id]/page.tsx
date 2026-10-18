import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { chatMembers, chatPosts, classes, users } from '@/db/schema';
import { addMembers, deleteGroup, deletePost, postToGroup, removeMember, setMemberRole, togglePinPost, updatePost } from '@/app/actions/groups';
import { requireSchoolUser } from '@/lib/auth';
import { groupAccess } from '@/lib/groups';
import { roleTitle, schoolOf } from '@/lib/permissions';
import { ACCEPT, HINT, listAttachments } from '@/lib/uploads';
import { fullName } from '@/lib/format';
import ActionForm from '@/components/ActionForm';
import AttachmentList from '@/components/AttachmentList';
import { Badge, Card, Empty, PageHead } from '@/components/ui';

export const metadata = { title: 'گروه' };
const fmt = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Tehran' });

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const u = await requireSchoolUser(); const { id } = await params;
  const a = await groupAccess(u, id); if (!a) notFound();
  const g = a.group;
  const posts = await db.select().from(chatPosts).where(eq(chatPosts.groupId, id)).orderBy(desc(chatPosts.pinned), desc(chatPosts.createdAt)).limit(100);
  const files = await listAttachments('group_post', posts.map((p) => p.id));
  const mem = await db.select({ m: chatMembers, u: users }).from(chatMembers).innerJoin(users, eq(users.id, chatMembers.userId)).where(eq(chatMembers.groupId, id)).orderBy(asc(users.role), asc(users.lastName));
  const authorIds = [...new Set(posts.map((p) => p.authorId).filter((x): x is string => !!x))];
  const authors = authorIds.length ? await db.select().from(users).where(inArray(users.id, authorIds)) : [];
  const an = new Map(authors.map((x) => [x.id, `${fullName(x)} (${roleTitle(x)})`]));
  const roleOf = new Map(mem.map((x) => [x.m.userId, x.m.role]));
  const school = schoolOf(u);
  const cls = a.manager ? await db.select().from(classes).where(eq(classes.schoolId, school)).orderBy(asc(classes.name)) : [];
  const staff = a.manager ? await db.select().from(users).where(and(eq(users.schoolId, school), eq(users.status, 'active'), inArray(users.role, ['TEACHER', 'STUDENT', 'PARENT']))).orderBy(asc(users.role), asc(users.lastName)) : [];
  const memberIds = new Set(mem.map((x) => x.m.userId));
  const addable = staff.filter((s) => !memberIds.has(s.id));
  return (
    <>
      <PageHead illus="messages" title={`${g.kind === 'channel' ? '📢' : '👥'} ${g.name}`} sub={g.description || (g.kind === 'channel' ? 'کانال: فقط مدیران می‌نویسند.' : 'گروه: همه‌ی اعضا می‌نویسند.')} />
      <div className="row" style={{ marginBottom: 12 }}><Link className="btn ghost sm" href="/messages/groups">← همه‌ی گروه‌ها</Link><Badge tone={g.kind === 'channel' ? 'warn' : 'primary'}>{g.kind === 'channel' ? 'کانال' : 'گروه'}</Badge></div>
      <div className="grid g-main">
        <div className="stack">
          {a.canPost && (
            <Card title={g.kind === 'channel' ? 'ارسال در کانال' : 'پیام جدید'}>
              <ActionForm action={postToGroup} submit="ارسال"><input type="hidden" name="groupId" value={id} />
                <div className="field"><label>متن</label><textarea name="body" maxLength={4000} placeholder="درس امروز، تکلیف، توضیح…" /></div>
                <div className="field"><label>پیوست (اختیاری)</label><input type="file" name="files" multiple accept={ACCEPT} /><span className="hint-t">{HINT}</span></div>
              </ActionForm>
            </Card>)}
          <Card>{posts.length ? <div className="list">{posts.map((p) => { const mine = p.authorId === u.id; const canDel = mine || a.canModerate; return (
            <article className="list-item" key={p.id} style={{ alignItems: 'flex-start', ...(p.pinned ? { borderInlineStart: '4px solid var(--warn)' } : {}) }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row" style={{ gap: 8 }}>{p.pinned && <span className="pin-badge">📌</span>}<b>{p.authorId ? an.get(p.authorId) : 'کاربر حذف‌شده'}</b>{roleOf.get(p.authorId ?? '') === 'admin' && <Badge tone="primary">مدیر گروه</Badge>}</div>
                <div className="muted small">{fmt.format(p.createdAt)}{p.editedAt && <span className="edited"> • ویرایش‌شده</span>}</div>
                {p.body && <p style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{p.body}</p>}
                <AttachmentList items={files.filter((f) => f.ownerId === p.id)} canRemove={canDel} />
                {(mine || a.manager) && (<details style={{ marginTop: 8 }}><summary className="btn ghost sm" style={{ display: 'inline-flex' }}>ویرایش</summary>
                  <div style={{ marginTop: 10, maxWidth: 520 }}><ActionForm action={updatePost} submit="ذخیره" resetOnSuccess={false} small><input type="hidden" name="id" value={p.id} /><div className="field"><textarea name="body" defaultValue={p.body} required maxLength={4000} /></div></ActionForm></div></details>)}
              </div>
              <div className="row" style={{ gap: 6 }}>
                {a.canModerate && <form action={togglePinPost}><input type="hidden" name="id" value={p.id} /><button className="btn ghost sm">{p.pinned ? '📌 برداشتن' : '📌 سنجاق'}</button></form>}
                {canDel && <form action={deletePost}><input type="hidden" name="id" value={p.id} /><button className="btn danger sm">حذف</button></form>}
              </div>
            </article>); })}</div> : <Empty text="هنوز پیامی نیست." icon="mail" />}</Card>
        </div>
        <div className="stack">
          <Card title={`اعضا (${mem.length})`}>
            <div className="list">{mem.map(({ m, u: x }) => (
              <div className="list-item" key={m.id} style={{ flexWrap: 'wrap' }}>
                <div><b>{fullName(x)}</b> <span className="muted small">{roleTitle(x)}</span> {m.role === 'admin' && <Badge tone="primary">مدیر گروه</Badge>}</div>
                {a.manager && <div className="row" style={{ gap: 6 }}>
                  {x.role === 'TEACHER' && <form action={setMemberRole}><input type="hidden" name="groupId" value={id} /><input type="hidden" name="userId" value={x.id} /><input type="hidden" name="role" value={m.role === 'admin' ? 'member' : 'admin'} /><button className="btn ghost sm">{m.role === 'admin' ? 'برداشتن مدیریت' : 'مدیر گروه کن'}</button></form>}
                  <form action={removeMember}><input type="hidden" name="groupId" value={id} /><input type="hidden" name="userId" value={x.id} /><button className="btn danger sm">حذف</button></form></div>}
              </div>))}</div>
            {!mem.length && <Empty text="عضوی نیست." icon="users" />}
          </Card>
          {a.manager && (<>
            <Card title="افزودن عضو">
              <ActionForm action={addMembers} submit="افزودن" small><input type="hidden" name="groupId" value={id} />
                <div className="field"><label>یک کاربر</label><select name="userId" defaultValue=""><option value="">—</option>{addable.map((s) => <option key={s.id} value={s.id}>{fullName(s)} — {roleTitle(s)}</option>)}</select></div>
                <label className="row" style={{ gap: 8 }}><input type="checkbox" name="asAdmin" /> به‌عنوان مدیر گروه (فقط معلم)</label>
                <div className="field"><label>یا همه‌ی یک کلاس</label><select name="classId" defaultValue=""><option value="">—</option>{cls.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                <label className="row" style={{ gap: 8 }}><input type="checkbox" name="withParents" /> والدین هم اضافه شوند</label>
              </ActionForm>
            </Card>
            <Card title="حذف گروه"><form action={deleteGroup}><input type="hidden" name="id" value={id} /><button className="btn danger sm">حذف کامل گروه و پیام‌ها</button></form></Card></>)}
        </div>
      </div>
    </>
  );
}
