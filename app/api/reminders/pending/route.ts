import { getCurrentUser } from '@/lib/auth';
import { activeSlot, slotText } from '@/lib/reminder-calc';
import { pendingChildren, remindersEnabled } from '@/lib/reminders';
import { getStudyWindow } from '@/lib/settings';
import { minutesNowTehran, todayTehran } from '@/lib/time';

/** وضعیت یادآور برای ولیِ واردشده (صفحه‌ی باز هر دقیقه می‌پرسد): فرزندان بدون گزارش + نوبتِ فعال */
export async function GET() {
  const u = await getCurrentUser(); if (!u || u.role !== 'PARENT' || !u.schoolId) return Response.json({ slot: null, pending: [] });
  const today = todayTehran(); const w = await getStudyWindow(u.schoolId);
  const slot = (await remindersEnabled(u.schoolId)) ? activeSlot(minutesNowTehran(), w.startMin, w.endMin) : null;
  const pending = slot ? await pendingChildren(u.id, today) : [];
  const endLabel = w.endLabel === '24:00' ? 'نیمه‌شب' : w.endLabel;
  return Response.json({ slot: pending.length ? slot : null, date: today, pending: pending.map((k) => ({ id: k.id, name: `${k.firstName} ${k.lastName}` })), text: slot ? slotText(slot, endLabel) : '' }, { headers: { 'cache-control': 'no-store' } });
}
