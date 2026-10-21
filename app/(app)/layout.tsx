import { requireUser } from '@/lib/auth';
import { getSchool } from '@/lib/settings';
import Shell from '@/components/Shell';
import ReminderWatcher from '@/components/ReminderWatcher';
import UserReminders from '@/components/UserReminders';
import { and, count, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { classes, messages, parentStudents, passwordResets, purchaseRequests, users, type Role } from '@/db/schema';
import { activeChildId } from '@/lib/permissions';
import ChildSwitcher from '@/components/ChildSwitcher';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const school = await getSchool(user.schoolId);
  const [{ n }] = await db.select({ n: count() }).from(messages).where(and(eq(messages.recipientId, user.id), isNull(messages.readAt)));
  const pendingRequests = user.role === 'ADMIN' ? (await db.select({ n: count() }).from(purchaseRequests).where(inArray(purchaseRequests.status, ['pending', 'payment_review'])))[0].n : 0;
  const mgrRoles: Role[] = user.role === 'ADMIN' ? ['PRINCIPAL', 'VICE'] : ['TEACHER', 'STUDENT', 'PARENT'];
  const pendingResets = ['ADMIN', 'PRINCIPAL', 'VICE'].includes(user.role)
    ? (await db.select({ n: count() }).from(passwordResets).innerJoin(users, eq(users.id, passwordResets.userId)).where(and(eq(passwordResets.status, 'pending'), inArray(users.role, mgrRoles), user.role === 'ADMIN' ? undefined : eq(users.schoolId, user.schoolId!))))[0].n : 0;
  let switcher = null;
  if (user.role === 'PARENT' && user.schoolId) {
    const kids = await db.select({ id: users.id, f: users.firstName, l: users.lastName, c: classes.name }).from(parentStudents).innerJoin(users, eq(users.id, parentStudents.studentId)).leftJoin(classes, eq(classes.id, users.classId))
      .where(and(eq(parentStudents.parentId, user.id), eq(users.schoolId, user.schoolId))).orderBy(users.firstName, users.lastName);
    switcher = <ChildSwitcher kids={kids.map((k) => ({ id: k.id, name: `${k.f} ${k.l}`, className: k.c }))} activeId={await activeChildId(user)} />;
  }
  return <Shell user={user} schoolName={school?.name ?? 'مدیریت سامانه'} unread={n} pendingRequests={pendingRequests} pendingResets={pendingResets}>
      {user.role === 'PARENT' && <ReminderWatcher />}{user.schoolId && <UserReminders />}{switcher}{children}</Shell>;
}
