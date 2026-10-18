import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { classes, users } from '@/db/schema';
import { requireSchoolUser } from '@/lib/auth';
import { fa, fullName } from '@/lib/format';
import { UserAvatar } from '@/components/UserAvatar';
import { Badge, Card, Empty, PageHead } from '@/components/ui';

export const metadata = { title: 'هم‌کلاسی‌ها' };

/** فهرست هم‌کلاسی‌ها با عکس پروفایل؛ فقط نام و تصویر نشان داده می‌شود (نه نمره، غیبت یا اطلاعات تماس) */
export default async function ClassmatesPage() {
  const u = await requireSchoolUser(['STUDENT']);
  const [cls] = u.classId ? await db.select().from(classes).where(and(eq(classes.id, u.classId), eq(classes.schoolId, u.schoolId!))).limit(1) : [];
  const mates = cls ? await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName, avatarPreset: users.avatarPreset, avatarPhotoAt: users.avatarPhotoAt })
    .from(users).where(and(eq(users.role, 'STUDENT'), eq(users.classId, cls.id), eq(users.schoolId, u.schoolId!), eq(users.status, 'active'))).orderBy(asc(users.lastName), asc(users.firstName)) : [];
  return (
    <>
      <PageHead illus="students" title="هم‌کلاسی‌ها" sub={cls ? `${fa(mates.length)} دانش‌آموز در کلاس ${cls.name}` : undefined} />
      {!cls ? <Card><Empty text="هنوز به کلاسی اضافه نشده‌اید." icon="users" /></Card> : (
        <Card>
          <div className="mates">{mates.map((m) => (
            <div className="mate" key={m.id}><UserAvatar user={m} size={72} /><b>{fullName(m)}</b>{m.id === u.id && <Badge tone="primary">شما</Badge>}</div>))}</div>
        </Card>)}
    </>
  );
}
