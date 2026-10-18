import { and, eq, inArray } from 'drizzle-orm';
import webpush from 'web-push';
import { db } from '@/db';
import { appConfig, parentStudents, pushSubscriptions, reminderLog, schools, settings, studyReports, studySkips, users } from '@/db/schema';
import { getStudyWindow } from './settings';
import { planSend, slotText } from './reminder-calc';
import { minutesNowTehran, todayTehran } from './time';

/** کلیدهای VAPID برای Web Push؛ بار اول ساخته و در دیتابیس نگه داشته می‌شوند */
export async function getVapid(): Promise<{ publicKey: string; privateKey: string }> {
  const rows = await db.select().from(appConfig).where(inArray(appConfig.key, ['vapidPublic', 'vapidPrivate']));
  const pub = rows.find((r) => r.key === 'vapidPublic')?.value; const priv = rows.find((r) => r.key === 'vapidPrivate')?.value;
  if (pub && priv) return { publicKey: pub, privateKey: priv };
  const k = webpush.generateVAPIDKeys();
  await db.insert(appConfig).values([{ key: 'vapidPublic', value: k.publicKey }, { key: 'vapidPrivate', value: k.privateKey }]).onConflictDoNothing();
  return k;
}
let vapidReady = false;
async function ensureVapid() {
  if (vapidReady) return; const k = await getVapid();
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? 'mailto:admin@example.com', k.publicKey, k.privateKey); vapidReady = true;
}

export type Payload = { title: string; body: string; url: string; tag: string };
export type Sender = (sub: { endpoint: string; keys: { p256dh: string; auth: string } }, payload: Payload) => Promise<void>;
const realSender: Sender = async (sub, payload) => { await ensureVapid(); await webpush.sendNotification(sub, JSON.stringify(payload), { TTL: 3600, urgency: 'high' }); };

/** فرزندانِ یک ولی که امروز نه گزارش دارند و نه «عدم مطالعه» ثبت شده */
export async function pendingChildren(parentId: string, today: string): Promise<{ id: string; firstName: string; lastName: string }[]> {
  const kids = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName }).from(parentStudents).innerJoin(users, eq(users.id, parentStudents.studentId)).where(and(eq(parentStudents.parentId, parentId), eq(users.status, 'active')));
  if (!kids.length) return [];
  const ids = kids.map((k) => k.id);
  const done = new Set([
    ...(await db.select({ s: studyReports.studentId }).from(studyReports).where(and(eq(studyReports.date, today), inArray(studyReports.studentId, ids)))).map((r) => r.s),
    ...(await db.select({ s: studySkips.studentId }).from(studySkips).where(and(eq(studySkips.date, today), inArray(studySkips.studentId, ids)))).map((r) => r.s),
  ]);
  return kids.filter((k) => !done.has(k.id));
}

export async function remindersEnabled(schoolId: string) {
  const [r] = await db.select().from(settings).where(and(eq(settings.schoolId, schoolId), eq(settings.key, 'remindersEnabled'))).limit(1);
  return r?.value !== '0';
}
const names = (k: { firstName: string }[]) => (k.length <= 2 ? k.map((x) => x.firstName).join(' و ') : `${k[0].firstName} و ${k.length - 1} فرزند دیگر`);

/** هر دقیقه اجرا می‌شود: برای ولی‌هایی که گزارش/«عدم مطالعه»ی امروزِ فرزندشان ثبت نشده، در ساعت ۹ شب و یک ساعت مانده به پایان، اعلان می‌فرستد. */
export async function runReminderTick(opts: { nowMin?: number; today?: string; send?: Sender } = {}) {
  const nowMin = opts.nowMin ?? minutesNowTehran(); const today = opts.today ?? todayTehran(); const send = opts.send ?? realSender;
  const out = { parents: 0, sent: 0, skipped: 0, failed: 0 };
  const sch = await db.select().from(schools).where(eq(schools.status, 'active'));
  for (const sc of sch) {
    if (!(await remindersEnabled(sc.id))) continue;
    const w = await getStudyWindow(sc.id);
    if (planSend(nowMin, w.startMin, w.endMin, []).send === null) continue; // الان نوبتی نیست
    const parents = await db.select().from(users).where(and(eq(users.schoolId, sc.id), eq(users.role, 'PARENT'), eq(users.status, 'active')));
    for (const p of parents) {
      const logged = (await db.select({ slot: reminderLog.slot }).from(reminderLog).where(and(eq(reminderLog.userId, p.id), eq(reminderLog.date, today)))).map((r) => r.slot);
      const plan = planSend(nowMin, w.startMin, w.endMin, logged);
      if (!plan.send) continue;
      const kids = await pendingChildren(p.id, today);
      for (const m of plan.mark) await db.insert(reminderLog).values({ userId: p.id, date: today, slot: m }).onConflictDoNothing();
      if (!kids.length) { await db.insert(reminderLog).values({ userId: p.id, date: today, slot: plan.send }).onConflictDoNothing(); continue; } // همه ثبت شده‌اند؛ مزاحمت لازم نیست
      out.parents++;
      await db.insert(reminderLog).values({ userId: p.id, date: today, slot: plan.send }).onConflictDoNothing();
      const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, p.id));
      if (!subs.length) { out.skipped++; continue; }
      const payload: Payload = { title: '⏰ یادآور گزارش مطالعه', body: `${slotText(plan.send, w.endLabel === '24:00' ? 'نیمه‌شب' : w.endLabel)}؛ گزارش مطالعه‌ی امروزِ ${names(kids)} هنوز ثبت نشده است. اگر مطالعه نداشته، «عدم مطالعه» را ثبت کنید.`, url: '/study', tag: `study-${today}` };
      for (const s of subs) {
        try { await send({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload); out.sent++; }
        catch (e) { out.failed++; const code = (e as { statusCode?: number }).statusCode; if (code === 404 || code === 410) await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, s.id)); else console.error('push failed', code ?? e); }
      }
    }
  }
  return out;
}
