export async function startNode() {
  try {
    const path = await import('node:path');
    const { migrate } = await import('drizzle-orm/libsql/migrator');
    const { db } = await import('./db');
    await migrate(db, { migrationsFolder: path.resolve(/* turbopackIgnore: true */ process.cwd(), 'drizzle') });
  } catch (e) { console.error('[db] migration failed — run "npm run db:migrate":', e); }
  try {
    const { deactivateExpiredSchools } = await import('./lib/expiry');
    const tick = () => deactivateExpiredSchools().catch((e) => console.error('expiry tick failed:', e));
    await tick(); const t = setInterval(tick, 10 * 60_000); t.unref?.();
  } catch (e) { console.error('[expiry] scheduler failed:', e); }
  try { // پشتیبان‌گیری خودکار روزانه از دیتابیس (در data/backups؛ ۱۴ نسخه‌ی آخر نگه داشته می‌شود)
    const { ensureDailyBackup } = await import('./lib/backup');
    const tick = () => ensureDailyBackup().then((b) => { if (b) console.log('[backup] created', b.name); }).catch((e) => console.error('[backup] failed:', e));
    await tick(); const t = setInterval(tick, 60 * 60_000); t.unref?.();
  } catch (e) { console.error('[backup] scheduler failed:', e); }
  try { // منفی خودکارِ «عدم ارسال گزارش مطالعه» (فقط برای مدرسه‌هایی که روشن کرده‌اند؛ هر ساعت بررسی می‌شود و تکراری ثبت نمی‌کند)
    const { runAutoStudyNegatives } = await import('./lib/study-auto-data');
    const tick2 = () => runAutoStudyNegatives().then((n) => { if (n) console.log('[study-auto] negatives created:', n); }).catch((e) => console.error('[study-auto] failed:', e));
    await tick2(); const t2 = setInterval(tick2, 30 * 60_000); t2.unref?.();
  } catch (e) { console.error('[study-auto] scheduler failed:', e); }
  const g = globalThis as unknown as { __reminderTimer?: NodeJS.Timeout };
  if (g.__reminderTimer) return;
  const { runReminderTick } = await import('./lib/reminders');
  const every = Number(process.env.REMINDER_TICK_MS) || 60_000;
  const debug = !!process.env.REMINDER_DEBUG;
  g.__reminderTimer = setInterval(() => { runReminderTick().then((r) => { if (debug) console.log('[reminders] tick', JSON.stringify(r)); }).catch((e) => console.error('reminder tick failed:', e)); }, every);
  if (debug) console.log('[reminders] scheduler started, every', every, 'ms');
  g.__reminderTimer.unref?.();
}
