import 'server-only';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { chatGroups, chatMembers } from '@/db/schema';
import type { CurrentUser } from './auth';
import { isManager } from './permissions';

export type GroupAccess = { group: typeof chatGroups.$inferSelect; manager: boolean; admin: boolean; member: boolean; canView: boolean; canPost: boolean; canModerate: boolean };

/** دسترسی کاربر به یک گروه/کانال. مدیر و معاونِ همان مدرسه همیشه می‌بینند و مدیریت می‌کنند؛ بقیه فقط اگر عضو باشند. */
export async function groupAccess(u: CurrentUser, groupId: string): Promise<GroupAccess | null> {
  if (!u.schoolId) return null;
  const [group] = await db.select().from(chatGroups).where(and(eq(chatGroups.id, groupId), eq(chatGroups.schoolId, u.schoolId))).limit(1);
  if (!group) return null;
  const manager = isManager(u.role);
  const [m] = await db.select().from(chatMembers).where(and(eq(chatMembers.groupId, groupId), eq(chatMembers.userId, u.id))).limit(1);
  const admin = m?.role === 'admin'; const member = !!m;
  const canView = manager || member;
  if (!canView) return null;
  // کانال: فقط مدیرِ کانال/مدیر/معاون می‌نویسد | گروه: همه‌ی اعضا
  const canPost = manager || admin || (group.kind === 'group' && member);
  return { group, manager, admin, member, canView, canPost, canModerate: manager || admin };
}

/** گروه‌هایی که کاربر می‌بیند (مدیر/معاون: همه‌ی گروه‌های مدرسه) */
export async function myGroups(u: CurrentUser) {
  if (!u.schoolId) return [];
  if (isManager(u.role)) return db.select().from(chatGroups).where(eq(chatGroups.schoolId, u.schoolId)).orderBy(desc(chatGroups.createdAt));
  const ids = (await db.select({ g: chatMembers.groupId }).from(chatMembers).where(eq(chatMembers.userId, u.id))).map((r) => r.g);
  if (!ids.length) return [];
  return db.select().from(chatGroups).where(and(eq(chatGroups.schoolId, u.schoolId), inArray(chatGroups.id, ids))).orderBy(desc(chatGroups.createdAt));
}
