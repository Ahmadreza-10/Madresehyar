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
  const g = globalThis as unknown as { __reminderTimer?: NodeJS.Timeout };
  if (g.__reminderTimer) return;
  const { runReminderTick } = await import('./lib/reminders');
  const every = Number(process.env.REMINDER_TICK_MS) || 60_000;
  const debug = !!process.env.REMINDER_DEBUG;
  g.__reminderTimer = setInterval(() => { runReminderTick().then((r) => { if (debug) console.log('[reminders] tick', JSON.stringify(r)); }).catch((e) => console.error('reminder tick failed:', e)); }, every);
  if (debug) console.log('[reminders] scheduler started, every', every, 'ms');
  g.__reminderTimer.unref?.();
}
