/** نوع پاسخ استاندارد Server Actionها */
export type ActionState = { ok?: boolean; error?: string; message?: string } | null;
export const fail = (error: string): ActionState => ({ ok: false, error });
export const success = (message?: string): ActionState => ({ ok: true, message });
import { z } from 'zod';
export function firstZodError(e: z.ZodError): string { return e.issues[0]?.message ?? 'اطلاعات واردشده معتبر نیست.'; }
import { AuthError, requireActionUser } from './auth';
import type { CurrentUser } from './auth';
import type { Role } from '@/db/schema';
/** اجرای امن یک عملیات با بررسی نقش و تبدیل خطاها به پیام خوانا */
export async function run(roles: Role[], fn: (u: CurrentUser) => Promise<ActionState>): Promise<ActionState> {
  try { return await fn(await requireActionUser(roles)); }
  catch (e) { if (e instanceof AuthError) return fail(e.message); console.error(e); return fail('خطای غیرمنتظره؛ دوباره تلاش کنید.'); }
}
