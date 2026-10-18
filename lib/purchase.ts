import 'server-only';
import { and, eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { db } from '@/db';
import { plans, purchaseRequests } from '@/db/schema';
import { normalizeMobile } from './image-check';
import { checkLogin, recordFailure } from './rate-limit';

const ip = async () => (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';

/** مشاهده‌ی وضعیت (فقط خواندنی) با کد پیگیری و شماره‌ی موبایل */
export async function lookupRequest(code: string, phoneRaw: string) {
  const key = `reqlook|${await ip()}`; if (!checkLogin(key).ok) return { error: 'تلاش‌های زیاد؛ چند دقیقه بعد دوباره امتحان کنید.' } as const;
  const phone = normalizeMobile(phoneRaw); const c = code.trim().toUpperCase();
  const [r] = phone && c ? await db.select().from(purchaseRequests).where(and(eq(purchaseRequests.trackingCode, c), eq(purchaseRequests.phone, phone))).limit(1) : [];
  if (!r) { recordFailure(key); return { error: 'درخواستی با این کد و شماره پیدا نشد.' } as const; }
  const [plan] = r.planId ? await db.select().from(plans).where(eq(plans.id, r.planId)).limit(1) : [];
  return { r, planName: plan?.name ?? null } as const;
}
