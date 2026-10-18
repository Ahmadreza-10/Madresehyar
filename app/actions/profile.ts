'use server';
import { and, eq, ne } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { sessions, userAvatars, users } from '@/db/schema';
import { currentSessionHash } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { fail, run, success, type ActionState } from '@/lib/action';
import { AVATAR_COUNT_MAX } from '@/lib/avatar-const';
import { MAX_AVATAR_BYTES, normalizeMobile, sniffImage } from '@/lib/image-check';

const ALL = ['ADMIN', 'PRINCIPAL', 'VICE', 'TEACHER', 'STUDENT', 'PARENT'] as const;

/** انتخاب آواتار آماده (شماره‌ی ۰ تا ۱۷) یا «خودکار»؛ عکس قبلی حذف می‌شود */
export async function setAvatarPreset(preset: number | null): Promise<ActionState> {
  return run([...ALL], async (u) => {
    if (preset !== null && (!Number.isInteger(preset) || preset < 0 || preset >= AVATAR_COUNT_MAX)) return fail('آواتار نامعتبر است.');
    await db.delete(userAvatars).where(eq(userAvatars.userId, u.id));
    await db.update(users).set({ avatarPreset: preset, avatarPhotoAt: null }).where(eq(users.id, u.id));
    revalidatePath('/', 'layout');
    return success('آواتار شما تغییر کرد.');
  });
}

/** آپلود عکس پروفایل: فقط JPEG/PNG/WebP تا ۴۰۰ کیلوبایت؛ نوع فایل از روی محتوا بررسی می‌شود */
export async function uploadAvatar(fd: FormData): Promise<ActionState> {
  return run([...ALL], async (u) => {
    const f = fd.get('photo');
    if (!(f instanceof File) || f.size === 0) return fail('فایلی انتخاب نشده است.');
    if (f.size > MAX_AVATAR_BYTES) return fail('حجم عکس باید کمتر از ۴۰۰ کیلوبایت باشد.');
    const buf = new Uint8Array(await f.arrayBuffer());
    const mime = sniffImage(buf);
    if (!mime) return fail('فقط عکس JPEG، PNG یا WebP پذیرفته می‌شود.');
    await db.insert(userAvatars).values({ userId: u.id, mime, data: Buffer.from(buf) }).onConflictDoUpdate({ target: userAvatars.userId, set: { mime, data: Buffer.from(buf), updatedAt: new Date() } });
    await db.update(users).set({ avatarPhotoAt: new Date() }).where(eq(users.id, u.id));
    await audit(u.id, 'AVATAR_UPLOAD', 'user', u.id);
    revalidatePath('/', 'layout');
    return success('عکس پروفایل ذخیره شد.');
  });
}

export async function removeAvatarPhoto(): Promise<ActionState> {
  return run([...ALL], async (u) => {
    await db.delete(userAvatars).where(eq(userAvatars.userId, u.id));
    await db.update(users).set({ avatarPhotoAt: null }).where(eq(users.id, u.id));
    revalidatePath('/', 'layout');
    return success('عکس پروفایل حذف شد.');
  });
}

/** شماره‌ی موبایل خودِ کاربر (برای اولیا: تا مدیر مدرسه بتواند تماس بگیرد) */
export async function updatePhone(_: ActionState, fd: FormData): Promise<ActionState> {
  return run([...ALL], async (u) => {
    const raw = String(fd.get('phone') ?? '').trim();
    if (!raw) { await db.update(users).set({ phone: null }).where(eq(users.id, u.id)); revalidatePath('/profile'); return success('شماره‌ی موبایل پاک شد.'); }
    const phone = normalizeMobile(raw);
    if (!phone) return fail('شماره‌ی موبایل معتبر نیست (مثلاً ۰۹۱۲۳۴۵۶۷۸۹).');
    await db.update(users).set({ phone }).where(eq(users.id, u.id));
    await audit(u.id, 'PHONE_UPDATE', 'user', u.id);
    revalidatePath('/profile'); revalidatePath('/students');
    return success(`شماره‌ی موبایل ذخیره شد: ${phone}`);
  });
}


/** خروج از یک دستگاهِ مشخص (نشستِ خودِ کاربر) */
export async function revokeSession(fd: FormData): Promise<ActionState> {
  return run([...ALL], async (u) => {
    const id = String(fd.get('id')); const cur = await currentSessionHash();
    const [row] = await db.select({ id: sessions.id, hash: sessions.tokenHash }).from(sessions).where(and(eq(sessions.id, id), eq(sessions.userId, u.id))).limit(1);
    if (!row) return fail('این نشست پیدا نشد.');
    if (row.hash === cur) return fail('این همان دستگاهی است که الان با آن وارد شده‌اید؛ برای خروج از دکمه‌ی «خروج» استفاده کنید.');
    await db.delete(sessions).where(eq(sessions.id, id));
    await audit(u.id, 'SESSION_REVOKE', 'user', u.id);
    revalidatePath('/profile');
    return success('از آن دستگاه خارج شد.');
  });
}

/** خروج از همه‌ی دستگاه‌ها به‌جز همین یکی (مثلاً وقتی گوشی گم شده یا رمز را به کسی داده‌اید) */
export async function signOutOtherSessions(): Promise<ActionState> {
  return run([...ALL], async (u) => {
    const cur = await currentSessionHash(); if (!cur) return fail('نشست شما منقضی شده است.');
    await db.delete(sessions).where(and(eq(sessions.userId, u.id), ne(sessions.tokenHash, cur)));
    await audit(u.id, 'SESSION_REVOKE_OTHERS', 'user', u.id);
    revalidatePath('/profile');
    return success('از بقیه‌ی دستگاه‌ها خارج شدید.');
  });
}
