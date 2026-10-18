import { and, desc, eq, inArray, isNull, or } from 'drizzle-orm';
import { db } from '@/db';
import { announcements, classes } from '@/db/schema';
import { createAnnouncement, deleteAnnouncement } from '@/app/actions/school';
import { togglePinAnnouncement, updateAnnouncement } from '@/app/actions/edit';
import { ACCEPT, HINT, listAttachments } from '@/lib/uploads';
import AttachmentList from '@/components/AttachmentList';
import { requireSchoolUser } from '@/lib/auth';
import { isManager, isStaff, visibleClassIds } from '@/lib/permissions';
import { classesFor } from '@/lib/school-data';
import { formatJalali } from '@/lib/format';
import ActionForm from '@/components/ActionForm';
import { Badge, Card, Empty, PageHead } from '@/components/ui';

export const metadata = { title: 'اطلاعیه‌ها' };

export default async function AnnouncementsPage() {
  const u = await requireSchoolUser(); const cls = await visibleClassIds(u);
  const cond = and(eq(announcements.schoolId, u.schoolId!), cls.length ? or(isNull(announcements.classId), inArray(announcements.classId, cls)) : isNull(announcements.classId));
  const rows = await db.select({ a: announcements, className: classes.name }).from(announcements).leftJoin(classes, eq(classes.id, announcements.classId)).where(cond).orderBy(desc(announcements.pinned), desc(announcements.createdAt)).limit(60);
  const files = await listAttachments('announcement', rows.map((r) => r.a.id));
  const canEdit = (a: { authorId: string | null }) => isStaff(u.role) && (isManager(u.role) || a.authorId === u.id);
  const myClasses = isStaff(u.role) ? await classesFor(u) : [];
  return (
    <>
      <PageHead illus="announcements" title="اطلاعیه‌ها" sub="اخبار و پیام‌های مدرسه و کلاس‌ها" />
      <div className="grid g-main">
        <Card title="آخرین اطلاعیه‌ها">{rows.length ? <div className="list">{rows.map(({ a, className }) => (
          <article className="list-item" key={a.id} style={{ alignItems: 'flex-start', ...(a.pinned ? { borderInlineStart: '4px solid var(--warn)' } : {}) }}>
            <div style={{ flex: 1, minWidth: 0 }}><div className="row" style={{ gap: 8 }}>{a.pinned && <span className="pin-badge" title="سنجاق‌شده">📌</span>}<b>{a.title}</b><Badge tone={className ? 'accent' : 'primary'}>{className ?? 'همه'}</Badge></div><p className="small" style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{a.body}</p>
              <AttachmentList items={files.filter((f) => f.ownerId === a.id)} canRemove={canEdit(a)} />
              <div className="muted small" style={{ marginTop: 4 }}>{formatJalali(a.createdAt.toISOString().slice(0, 10))}{a.editedAt && <span className="edited"> • ویرایش‌شده</span>}</div>
              {canEdit(a) && (<details style={{ marginTop: 8 }}><summary className="btn ghost sm" style={{ display: 'inline-flex' }}>ویرایش</summary>
                <div style={{ marginTop: 10, maxWidth: 520 }}><ActionForm action={updateAnnouncement} submit="ذخیره‌ی تغییرات" resetOnSuccess={false} small><input type="hidden" name="id" value={a.id} />
                  <div className="field"><label>عنوان</label><input name="title" defaultValue={a.title} required maxLength={150} /></div>
                  <div className="field"><label>متن</label><textarea name="body" defaultValue={a.body} required maxLength={2000} /></div>
                  <div className="field"><label>افزودن پیوست</label><input type="file" name="files" multiple accept={ACCEPT} /><span className="hint-t">{HINT}</span></div></ActionForm></div></details>)}</div>
            {canEdit(a) && <div className="row" style={{ gap: 6 }}><form action={togglePinAnnouncement}><input type="hidden" name="id" value={a.id} /><button className="btn ghost sm" title={a.pinned ? 'برداشتن سنجاق' : 'سنجاق کردن'}>{a.pinned ? '📌 برداشتن' : '📌 سنجاق'}</button></form><form action={deleteAnnouncement}><input type="hidden" name="id" value={a.id} /><button className="btn danger sm">حذف</button></form></div>}
          </article>))}</div> : <Empty text="اطلاعیه‌ای نیست." icon="mega" />}</Card>
        {isStaff(u.role) && (
          <Card title="انتشار اطلاعیه">
            <ActionForm action={createAnnouncement} submit="انتشار">
              <div className="field"><label>مخاطب</label><select name="classId">{isManager(u.role) && <option value="">همه‌ی مدرسه</option>}{myClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div className="field"><label>عنوان</label><input name="title" required maxLength={150} /></div>
              <div className="field"><label>متن</label><textarea name="body" required maxLength={2000} /></div>
              <div className="field"><label>پیوست (اختیاری)</label><input type="file" name="files" multiple accept={ACCEPT} /><span className="hint-t">{HINT}</span></div>
            </ActionForm>
          </Card>)}
      </div>
    </>
  );
}
