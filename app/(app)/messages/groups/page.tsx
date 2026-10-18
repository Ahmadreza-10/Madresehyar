import Link from 'next/link';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { chatMembers, classes, users } from '@/db/schema';
import { createGroup } from '@/app/actions/groups';
import { requireSchoolUser } from '@/lib/auth';
import { myGroups } from '@/lib/groups';
import { isManager, schoolOf } from '@/lib/permissions';
import { fa, fullName } from '@/lib/format';
import ActionForm from '@/components/ActionForm';
import { Badge, Card, Empty, PageHead } from '@/components/ui';
import MsgTabs from '@/components/MsgTabs';

export const metadata = { title: 'گروه‌ها و کانال‌ها' };

export default async function GroupsPage() {
  const u = await requireSchoolUser(); const mgr = isManager(u.role);
  const groups = await myGroups(u);
  const counts = groups.length ? await db.select({ g: chatMembers.groupId }).from(chatMembers).where(inArray(chatMembers.groupId, groups.map((g) => g.id))) : [];
  const cnt = (id: string) => counts.filter((c) => c.g === id).length;
  const cls = mgr ? await db.select().from(classes).where(eq(classes.schoolId, schoolOf(u))).orderBy(asc(classes.gradeLevel), asc(classes.name)) : [];
  const teachers = mgr ? await db.select().from(users).where(and(eq(users.schoolId, schoolOf(u)), eq(users.role, 'TEACHER'), eq(users.status, 'active'))).orderBy(asc(users.lastName)) : [];
  const clsName = new Map((await db.select().from(classes).where(eq(classes.schoolId, schoolOf(u)))).map((c) => [c.id, c.name]));
  return (
    <>
      <PageHead illus="messages" title="گروه‌ها و کانال‌ها" sub="گروه: همه‌ی اعضا می‌نویسند. کانال: فقط مدیرانِ کانال می‌نویسند و بقیه می‌خوانند — مناسب ارسال محتوای درسی." />
      <MsgTabs on="groups" />
      <div className="grid g-main">
        <Card>{groups.length ? <div className="list">{groups.map((g) => (
          <Link key={g.id} href={`/messages/groups/${g.id}`} className="list-item" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="row" style={{ gap: 12, flex: 1, minWidth: 0 }}><div className="avatar">{g.kind === 'channel' ? '📢' : '👥'}</div>
              <div style={{ minWidth: 0 }}><b>{g.name}</b><div className="muted small">{g.classId && clsName.get(g.classId) ? `کلاس ${clsName.get(g.classId)} • ` : ''}{fa(cnt(g.id))} عضو</div></div></div>
            <Badge tone={g.kind === 'channel' ? 'warn' : 'primary'}>{g.kind === 'channel' ? 'کانال' : 'گروه'}</Badge>
          </Link>))}</div> : <Empty text={mgr ? 'هنوز گروه یا کانالی نساخته‌اید.' : 'شما عضو هیچ گروه یا کانالی نیستید.'} icon="mail" />}</Card>
        {mgr && (
          <Card title="گروه یا کانال جدید">
            <ActionForm action={createGroup} submit="ساخت">
              <div className="field"><label>نام</label><input name="name" required maxLength={80} placeholder="مثلاً: ریاضی دهم الف" /></div>
              <div className="field"><label>نوع</label><select name="kind" defaultValue="group"><option value="group">گروه (همه می‌نویسند)</option><option value="channel">کانال (فقط مدیران می‌نویسند)</option></select></div>
              <div className="field"><label>کلاس (اختیاری)</label><select name="classId" defaultValue=""><option value="">بدون کلاس</option>{cls.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select><span className="hint-t">با انتخاب کلاس، دانش‌آموزانش خودکار عضو می‌شوند.</span></div>
              <label className="row" style={{ gap: 8 }}><input type="checkbox" name="withParents" /> والدین دانش‌آموزان هم اضافه شوند</label>
              <div className="field"><label>مدیر گروه (معلم)</label><select name="adminId" defaultValue=""><option value="">فعلاً بدون معلم</option>{teachers.map((t) => <option key={t.id} value={t.id}>{fullName(t)}</option>)}</select><span className="hint-t">مدیرِ گروه می‌تواند محتوای درسی و فایل بفرستد.</span></div>
              <div className="field"><label>توضیح (اختیاری)</label><input name="description" maxLength={300} /></div>
            </ActionForm>
          </Card>)}
      </div>
    </>
  );
}
