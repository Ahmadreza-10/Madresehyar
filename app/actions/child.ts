'use server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { requireActionUser } from '@/lib/auth';
import { CHILD_COOKIE, canAccessStudent } from '@/lib/permissions';

/** ولی: انتخاب فرزندی که صفحه‌ها اطلاعاتش را نشان می‌دهند */
export async function setActiveChild(fd: FormData) {
  const user = await requireActionUser(['PARENT']);
  const id = String(fd.get('childId') ?? '');
  if (!(await canAccessStudent(user, id))) return;
  (await cookies()).set(CHILD_COOKIE, id, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 365 });
  revalidatePath('/', 'layout');
}
