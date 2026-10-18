/** با روشن شدن سرور، زمان‌بندِ یادآور (هر دقیقه) شروع می‌شود. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const g = globalThis as unknown as { __reminderTimer?: NodeJS.Timeout };
  if (g.__reminderTimer) return;
  const { runReminderTick } = await import('./lib/reminders');
  const every = Number(process.env.REMINDER_TICK_MS) || 60_000;
  const debug = !!process.env.REMINDER_DEBUG;
  g.__reminderTimer = setInterval(() => { runReminderTick().then((r) => { if (debug) console.log('[reminders] tick', JSON.stringify(r)); }).catch((e) => console.error('reminder tick failed:', e)); }, every);
  if (debug) console.log('[reminders] scheduler started, every', every, 'ms');
  g.__reminderTimer.unref?.();
}
