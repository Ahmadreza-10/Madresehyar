/** زمان‌بندی یادآور گزارش مطالعه (همه‌چیز به «دقیقه‌ی روز» به وقت تهران) */
export type Slot = 'evening' | 'last-hour';
export const EVENING_MIN = 21 * 60; // ساعت ۹ شب

/** دو نوبت یادآوری: ساعت ۹ شب، و یک ساعت مانده به پایانِ بازه‌ی ثبت. اگر این دو یکی/نزدیک شوند، فقط «یک ساعت مانده» می‌ماند. */
export function slotTimes(startMin: number, endMin: number): { slot: Slot; atMin: number }[] {
  const last = endMin - 60; const out: { slot: Slot; atMin: number }[] = [];
  if (EVENING_MIN >= startMin && EVENING_MIN < last) out.push({ slot: 'evening', atMin: EVENING_MIN });
  if (last > startMin) out.push({ slot: 'last-hour', atMin: last });
  return out;
}
/** نوبتی که «الان» فعال است (آخرین نوبتِ رسیده که بازه هنوز تمام نشده) */
export function activeSlot(nowMin: number, startMin: number, endMin: number): Slot | null {
  if (nowMin >= endMin || nowMin < startMin) return null;
  const reached = slotTimes(startMin, endMin).filter((s) => s.atMin <= nowMin);
  return reached.length ? reached[reached.length - 1].slot : null;
}
/** برای زمان‌بند سرور: اگر نوبت فعال قبلاً فرستاده نشده، همان را بفرست و نوبت‌های قدیمیِ ازدست‌رفته را هم «انجام‌شده» علامت بزن */
export function planSend(nowMin: number, startMin: number, endMin: number, alreadySent: string[]): { send: Slot | null; mark: Slot[] } {
  const active = activeSlot(nowMin, startMin, endMin);
  if (!active || alreadySent.includes(active)) return { send: null, mark: [] };
  const older = slotTimes(startMin, endMin).filter((s) => s.atMin <= nowMin && s.slot !== active && !alreadySent.includes(s.slot)).map((s) => s.slot);
  return { send: active, mark: older };
}
export const slotText = (slot: Slot, endLabel: string) => (slot === 'evening' ? 'ساعت ۹ شب است' : `یک ساعت تا پایان زمان ثبت (${endLabel}) مانده است`);
