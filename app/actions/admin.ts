'use server';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { and, eq, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/db';
import { classes, classSubjects, grades, parentStudents, passwordResets, ROLES, schools, sessions, subjects, users, type Role } from '@/db/schema';
import { audit } from '@/lib/audit';
import { fail, firstZodError, run, success, type ActionState } from '@/lib/action';
import type { CurrentUser } from '@/lib/auth';
import { classInSchool, isManager, schoolOf } from '@/lib/permissions';
import { checkPassword } from '@/lib/password-policy';
import { fullName } from '@/lib/format';
import { getSettings, setSetting } from '@/lib/settings';
import { parseHM } from '@/lib/time';

const MANAGERS = ['PRINCIPAL', 'VICE'] as const;
const faDigits = (s: string) => s.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
const tempPassword = () => crypto.randomBytes(6).toString('base64url').replace(/[-_]/g, 'x') + '7a';

/** مدیرکل سامانه فقط مدیر و معاونِ مدرسه می‌سازد؛ مدیر/معاون فقط معلم، دانش‌آموز و ولیِ مدرسه‌ی خودش را */
const creatableRoles = (a: CurrentUser): Role[] => (a.role === 'ADMIN' ? ['PRINCIPAL', 'VICE'] : isManager(a.role) ? ['TEACHER', 'STUDENT', 'PARENT'] : []);

/** آیا actor اجازه‌ی مدیریت (ویرایش/رمز/حذف) این کاربر را دارد؟ */
async function manageable(actor: CurrentUser, targetId: string) {
  if (targetId === actor.id) return null;
  const [t] = await db.select().from(users).where(eq(users.id, targetId)).limit(1);
  if (!t || !creatableRoles(actor).includes(t.role)) return null;
  if (actor.role !== 'ADMIN' && t.schoolId !== actor.schoolId) return null;
  return t;
}

const userSchema = z.object({
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,30}$/, 'نام کاربری فقط حروف انگلیسی، عدد و ._- (۳ تا ۳۰ نویسه) باشد.'),
  firstName: z.string().trim().min(1, 'نام را بنویسید.').max(50),
  lastName: z.string().trim().min(1, 'نام خانوادگی را بنویسید.').max(50),
  role: z.enum(ROLES),
  phone: z.string().trim().max(20).optional(),
  nationalCode: z.string().trim().max(15).optional(),
  classId: z.string().optional(),
  schoolId: z.string().optional(),
  viceTitle: z.string().trim().max(40).optional(),
});

export async function createSchool(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(['ADMIN'], async (admin) => {
    const name = String(fd.get('name') ?? '').trim();
    if (name.length < 2) return fail('نام مدرسه را بنویسید.');
    const [s] = await db.insert(schools).values({ name }).returning();
    await audit(admin.id, 'SCHOOL_CREATE', 'school', s.id, name);
    revalidatePath('/admin/schools');
    return success('مدرسه ساخته شد. حالا از همین صفحه مدیر و معاون آن را اضافه کنید.');
  });
}
export async function updateSchool(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(['ADMIN'], async (admin) => {
    const id = String(fd.get('id')); const name = String(fd.get('name') ?? '').trim(); const status = fd.get('status') === 'disabled' ? 'disabled' : 'active';
    if (name.length < 2) return fail('نام مدرسه را بنویسید.');
    await db.update(schools).set({ name, status }).where(eq(schools.id, id));
    if (status === 'disabled') { const ids = (await db.select({ id: users.id }).from(users).where(eq(users.schoolId, id))).map((x) => x.id); if (ids.length) await db.delete(sessions).where(inArray(sessions.userId, ids)); }
    await audit(admin.id, 'SCHOOL_UPDATE', 'school', id, `${name} • ${status}`);
    revalidatePath('/admin/schools');
    return success('ذخیره شد.');
  });
}

export async function createUser(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(['ADMIN', ...MANAGERS], async (actor) => {
    const p = userSchema.safeParse(Object.fromEntries(fd));
    if (!p.success) return fail(firstZodError(p.error));
    const d = p.data;
    if (!creatableRoles(actor).includes(d.role)) return fail(actor.role === 'ADMIN' ? 'مدیرکل فقط مدیر و معاونِ مدرسه را اضافه می‌کند؛ بقیه را مدیر یا معاونِ همان مدرسه اضافه می‌کند.' : 'شما فقط می‌توانید معلم، دانش‌آموز و ولی اضافه کنید.');
    const schoolId = actor.role === 'ADMIN' ? d.schoolId : schoolOf(actor);
    if (!schoolId || !(await db.select({ id: schools.id }).from(schools).where(eq(schools.id, schoolId)).limit(1)).length) return fail('مدرسه را انتخاب کنید.');
    if ((await db.select({ id: users.id }).from(users).where(eq(users.username, d.username)).limit(1)).length) return fail('این نام کاربری قبلاً استفاده شده است.');
    let classId: string | null = null;
    if (d.role === 'STUDENT' && d.classId) { const [c] = await db.select({ id: classes.id }).from(classes).where(and(eq(classes.id, d.classId), eq(classes.schoolId, schoolId))).limit(1); if (!c) return fail('کلاس انتخاب‌شده متعلق به این مدرسه نیست.'); classId = c.id; }
    const typed = String(fd.get('password') ?? '').trim();
    if (typed) { const bad = checkPassword(typed, { username: d.username, phone: d.phone }); if (bad) return fail(bad); }
    const password = typed || tempPassword();
    const [u] = await db.insert(users).values({
      username: d.username, firstName: d.firstName, lastName: d.lastName, role: d.role, schoolId, phone: d.phone || null, viceTitle: d.role === 'VICE' ? d.viceTitle || null : null,
      nationalCode: d.nationalCode ? faDigits(d.nationalCode) : null, classId, passwordHash: await bcrypt.hash(password, 10), mustChangePassword: true,
    }).returning();
    await audit(actor.id, 'USER_CREATE', 'user', u.id, `${d.username} • ${d.role}`);
    revalidatePath('/admin/users'); revalidatePath('/admin/schools');
    return success(`کاربر ساخته شد. رمز موقت: ${password} (کاربر در اولین ورود باید آن را عوض کند)`);
  });
}

export async function updateUser(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(['ADMIN', ...MANAGERS], async (actor) => {
    const t = await manageable(actor, String(fd.get('id')));
    if (!t) return fail('شما اجازه‌ی ویرایش این کاربر را ندارید.');
    const p = userSchema.omit({ username: true, schoolId: true }).extend({ status: z.enum(['active', 'disabled']) }).safeParse(Object.fromEntries(fd));
    if (!p.success) return fail(firstZodError(p.error));
    const d = p.data;
    if (!creatableRoles(actor).includes(d.role)) return fail('این نقش برای شما قابل تخصیص نیست.');
    let classId: string | null = null;
    if (d.role === 'STUDENT' && d.classId && t.schoolId) { const [c] = await db.select({ id: classes.id }).from(classes).where(and(eq(classes.id, d.classId), eq(classes.schoolId, t.schoolId))).limit(1); if (!c) return fail('کلاس انتخاب‌شده متعلق به این مدرسه نیست.'); classId = c.id; }
    await db.update(users).set({ firstName: d.firstName, lastName: d.lastName, role: d.role, status: d.status, phone: d.phone || null, nationalCode: d.nationalCode ? faDigits(d.nationalCode) : null, classId }).where(eq(users.id, t.id));
    if (d.status === 'disabled') await db.delete(sessions).where(eq(sessions.userId, t.id)); // قطع فوری دسترسی
    await audit(actor.id, 'USER_UPDATE', 'user', t.id, `${d.role} • ${d.status}`);
    revalidatePath('/admin/users');
    return success('اطلاعات کاربر ذخیره شد.');
  });
}

export async function resetPassword(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(['ADMIN', ...MANAGERS], async (actor) => {
    const t = await manageable(actor, String(fd.get('id')));
    if (!t) return fail('شما اجازه‌ی این کار را ندارید.');
    const password = tempPassword();
    await db.update(users).set({ passwordHash: await bcrypt.hash(password, 10), mustChangePassword: true }).where(eq(users.id, t.id));
    await db.delete(sessions).where(eq(sessions.userId, t.id));
    await audit(actor.id, 'PASSWORD_RESET', 'user', t.id);
    return success(`رمز موقت جدید: ${password}`);
  });
}

/** ساخت رمز موقت برای کسی که «فراموشی رمز» زده؛ مدیر رمز را حضوری/تلفنی به خودِ فرد می‌دهد */
export async function fulfillPasswordReset(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(['ADMIN', ...MANAGERS], async (actor) => {
    const [r] = await db.select().from(passwordResets).where(eq(passwordResets.id, String(fd.get('id') ?? ''))).limit(1);
    if (!r || r.status !== 'pending') return fail('این درخواست دیگر در انتظار نیست.');
    const t = await manageable(actor, r.userId); if (!t) return fail('شما اجازه‌ی این کار را ندارید.');
    const password = tempPassword();
    await db.update(users).set({ passwordHash: await bcrypt.hash(password, 10), mustChangePassword: true }).where(eq(users.id, t.id));
    await db.delete(sessions).where(eq(sessions.userId, t.id));
    await db.update(passwordResets).set({ status: 'done', handledBy: actor.id, handledAt: new Date() }).where(eq(passwordResets.id, r.id));
    await audit(actor.id, 'PASSWORD_RESET', 'user', t.id, 'forgot-request');
    revalidatePath('/admin/users', 'layout');
    return success(`رمز موقت ${fullName(t)}: ${password} — آن را فقط به خودِ او بدهید؛ در اولین ورود رمز تازه می‌گذارد.`);
  });
}
export async function dismissPasswordReset(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(['ADMIN', ...MANAGERS], async (actor) => {
    const [r] = await db.select().from(passwordResets).where(eq(passwordResets.id, String(fd.get('id') ?? ''))).limit(1);
    if (!r || r.status !== 'pending') return fail('این درخواست دیگر در انتظار نیست.');
    if (!(await manageable(actor, r.userId))) return fail('شما اجازه‌ی این کار را ندارید.');
    await db.update(passwordResets).set({ status: 'dismissed', handledBy: actor.id, handledAt: new Date() }).where(eq(passwordResets.id, r.id));
    revalidatePath('/admin/users', 'layout');
    return success('درخواست نادیده گرفته شد.');
  });
}

export async function deleteUser(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(['ADMIN', ...MANAGERS], async (actor) => {
    const t = await manageable(actor, String(fd.get('id')));
    if (!t) return fail('شما اجازه‌ی حذف این کاربر را ندارید.');
    await db.delete(users).where(eq(users.id, t.id));
    await audit(actor.id, 'USER_DELETE', 'user', t.id);
    revalidatePath('/admin/users');
    return success('کاربر حذف شد.');
  });
}

export async function createClass(_: ActionState, fd: FormData): Promise<ActionState> {
  return run([...MANAGERS], async (u) => {
    const p = z.object({ name: z.string().trim().min(2, 'نام کلاس را بنویسید.').max(60), gradeLevel: z.string().trim().max(30).optional(), academicYear: z.string().trim().max(20).optional() }).safeParse(Object.fromEntries(fd));
    if (!p.success) return fail(firstZodError(p.error));
    const school = schoolOf(u);
    const gradeLevel = p.data.gradeLevel || p.data.name.split(/\s+/)[0]; // «دهم تجربی (ب)» ← «دهم»
    const academicYear = p.data.academicYear || (await getSettings(school)).academicYear || '۱۴۰۵-۱۴۰۶';
    const [c] = await db.insert(classes).values({ name: p.data.name, gradeLevel, academicYear, schoolId: school }).returning();
    await audit(u.id, 'CLASS_CREATE', 'class', c.id, c.name);
    revalidatePath('/admin/classes');
    return success('کلاس ساخته شد. حالا همین‌جا درس‌ها و دانش‌آموزانش را اضافه کنید.');
  });
}
export async function deleteClass(_: ActionState, fd: FormData): Promise<ActionState> {
  return run([...MANAGERS], async (u) => {
    const id = String(fd.get('id'));
    if (!(await classInSchool(u, id))) return fail('این کلاس در مدرسه‌ی شما نیست.');
    await db.update(users).set({ classId: null }).where(eq(users.classId, id));
    await db.delete(classes).where(eq(classes.id, id));
    await audit(u.id, 'CLASS_DELETE', 'class', id);
    revalidatePath('/admin/classes');
    return success('کلاس حذف شد.');
  });
}
export async function createSubject(_: ActionState, fd: FormData): Promise<ActionState> {
  return run([...MANAGERS], async (u) => {
    const name = String(fd.get('name') ?? '').trim(); const school = schoolOf(u);
    if (name.length < 2) return fail('نام درس را بنویسید.');
    if ((await db.select().from(subjects).where(and(eq(subjects.schoolId, school), eq(subjects.name, name))).limit(1)).length) return fail('این درس قبلاً ثبت شده است.');
    const [s] = await db.insert(subjects).values({ name, schoolId: school }).returning();
    await audit(u.id, 'SUBJECT_CREATE', 'subject', s.id, name);
    revalidatePath('/admin/classes');
    return success('درس اضافه شد.');
  });
}
/** افزودن چند درس یک‌جا به فهرست درس‌های مدرسه (هر درس در یک خط، یا جداشده با ویرگول) */
export async function createSubjects(_: ActionState, fd: FormData): Promise<ActionState> {
  return run([...MANAGERS], async (u) => {
    const school = schoolOf(u);
    const names = [...new Set(String(fd.get('names') ?? '').split(/[\n\r,،;؛]+/).map((x) => x.replace(/\s+/g, ' ').trim().slice(0, 60)).filter((x) => x.length >= 2))];
    if (!names.length) return fail('نام حداقل یک درس را بنویسید.');
    if (names.length > 60) return fail('در هر بار حداکثر ۶۰ درس وارد کنید.');
    const have = new Set((await db.select({ name: subjects.name }).from(subjects).where(eq(subjects.schoolId, school))).map((x) => x.name));
    const fresh = names.filter((n) => !have.has(n));
    for (const name of fresh) { const [s] = await db.insert(subjects).values({ name, schoolId: school }).returning(); await audit(u.id, 'SUBJECT_CREATE', 'subject', s.id, name); }
    revalidatePath('/admin/classes');
    if (!fresh.length) return fail('همه‌ی این درس‌ها از قبل ثبت شده‌اند.');
    const skipped = names.length - fresh.length;
    return success(`${fresh.length} درس اضافه شد.${skipped ? ` (${skipped} درس از قبل بود)` : ''}`);
  });
}
/** حذف یک درس از فهرست مدرسه؛ فقط اگر در هیچ کلاسی استفاده نشده و نمره‌ای ندارد */
export async function deleteSubject(_: ActionState, fd: FormData): Promise<ActionState> {
  return run([...MANAGERS], async (u) => {
    const id = String(fd.get('id') ?? ''); const school = schoolOf(u);
    const [sub] = await db.select().from(subjects).where(and(eq(subjects.id, id), eq(subjects.schoolId, school))).limit(1);
    if (!sub) return fail('این درس در مدرسه‌ی شما نیست.');
    if ((await db.select({ id: classSubjects.id }).from(classSubjects).where(eq(classSubjects.subjectId, id)).limit(1)).length) return fail(`«${sub.name}» هنوز در یک کلاس استفاده می‌شود؛ اول تیکش را از آن کلاس بردارید.`);
    if ((await db.select({ id: grades.id }).from(grades).where(eq(grades.subjectId, id)).limit(1)).length) return fail(`برای «${sub.name}» نمره ثبت شده و حذف نمی‌شود.`);
    try { await db.delete(subjects).where(eq(subjects.id, id)); }
    catch { return fail(`«${sub.name}» در بخش‌های دیگر (مثل گزارش مطالعه) استفاده شده و حذف نمی‌شود.`); }
    await audit(u.id, 'SUBJECT_DELETE', 'subject', id, sub.name);
    revalidatePath('/admin/classes');
    return success('درس حذف شد.');
  });
}
/** ذخیره‌ی درس‌های یک کلاس: تیک‌خورده‌ها (با معلمشان) در کلاس می‌مانند، بقیه برداشته می‌شوند */
export async function saveClassSubjects(_: ActionState, fd: FormData): Promise<ActionState> {
  return run([...MANAGERS], async (u) => {
    const classId = String(fd.get('classId') ?? ''); const school = schoolOf(u);
    if (!(await classInSchool(u, classId))) return fail('این کلاس در مدرسه‌ی شما نیست.');
    const subs = await db.select().from(subjects).where(eq(subjects.schoolId, school));
    const okTeacher = new Set((await db.select({ id: users.id }).from(users).where(and(eq(users.role, 'TEACHER'), eq(users.schoolId, school)))).map((t) => t.id));
    const existing = new Map((await db.select().from(classSubjects).where(eq(classSubjects.classId, classId))).map((r) => [r.subjectId, r]));
    let added = 0, removed = 0, changed = 0;
    for (const s of subs) {
      const on = fd.get(`on_${s.id}`) !== null; const t = String(fd.get(`teacher_${s.id}`) ?? ''); const teacherId = t && okTeacher.has(t) ? t : null; const ex = existing.get(s.id);
      if (on && !ex) { await db.insert(classSubjects).values({ classId, subjectId: s.id, teacherId }); added++; }
      else if (on && ex && (ex.teacherId ?? null) !== teacherId) { await db.update(classSubjects).set({ teacherId }).where(eq(classSubjects.id, ex.id)); changed++; }
      else if (!on && ex) { await db.delete(classSubjects).where(eq(classSubjects.id, ex.id)); removed++; }
    }
    await audit(u.id, 'CLASS_SUBJECTS_SAVE', 'class', classId, `+${added} -${removed} ~${changed}`);
    revalidatePath('/admin/classes');
    if (!added && !removed && !changed) return success('تغییری نبود؛ همه‌چیز ذخیره است.');
    return success(`ذخیره شد${added ? ` • ${added} درس اضافه` : ''}${removed ? ` • ${removed} درس برداشته` : ''}${changed ? ` • معلمِ ${changed} درس عوض شد` : ''}.`);
  });
}
/** تعیین معلمِ یک درس در یک کلاس (اگر قبلاً ثبت شده باشد، معلم عوض می‌شود) */
export async function assignTeacher(_: ActionState, fd: FormData): Promise<ActionState> {
  return run([...MANAGERS], async (u) => {
    const p = z.object({ classId: z.string().min(1), subjectId: z.string().min(1, 'درس را انتخاب کنید.'), teacherId: z.string().optional() }).safeParse(Object.fromEntries(fd));
    if (!p.success) return fail(firstZodError(p.error));
    const school = schoolOf(u);
    if (!(await classInSchool(u, p.data.classId))) return fail('این کلاس در مدرسه‌ی شما نیست.');
    if (!(await db.select({ id: subjects.id }).from(subjects).where(and(eq(subjects.id, p.data.subjectId), eq(subjects.schoolId, school))).limit(1)).length) return fail('این درس در مدرسه‌ی شما نیست.');
    const teacherId = p.data.teacherId || null;
    if (teacherId) { const [t] = await db.select().from(users).where(eq(users.id, teacherId)).limit(1); if (!t || t.role !== 'TEACHER' || t.schoolId !== school) return fail('کاربر انتخاب‌شده معلمِ این مدرسه نیست.'); }
    const ex = await db.select().from(classSubjects).where(and(eq(classSubjects.classId, p.data.classId), eq(classSubjects.subjectId, p.data.subjectId))).limit(1);
    if (ex.length) await db.update(classSubjects).set({ teacherId }).where(eq(classSubjects.id, ex[0].id));
    else await db.insert(classSubjects).values({ classId: p.data.classId, subjectId: p.data.subjectId, teacherId });
    await audit(u.id, 'ASSIGN_TEACHER', 'class', p.data.classId);
    revalidatePath('/admin/classes');
    return success('ذخیره شد.');
  });
}
/** افزودن درس به کلاس: اسم درس را بنویسید یا از فهرست انتخاب کنید؛ اگر درس نبود خودکار ساخته می‌شود */
export async function addSubjectToClass(_: ActionState, fd: FormData): Promise<ActionState> {
  return run([...MANAGERS], async (u) => {
    const classId = String(fd.get('classId') ?? ''); const name = String(fd.get('subjectName') ?? '').trim().slice(0, 60); const school = schoolOf(u);
    if (name.length < 2) return fail('نام درس را بنویسید.');
    if (!(await classInSchool(u, classId))) return fail('این کلاس در مدرسه‌ی شما نیست.');
    let [sub] = await db.select().from(subjects).where(and(eq(subjects.schoolId, school), eq(subjects.name, name))).limit(1);
    if (!sub) [sub] = await db.insert(subjects).values({ name, schoolId: school }).returning();
    const teacherId = String(fd.get('teacherId') ?? '') || null;
    if (teacherId) { const [t] = await db.select().from(users).where(eq(users.id, teacherId)).limit(1); if (!t || t.role !== 'TEACHER' || t.schoolId !== school) return fail('معلم انتخاب‌شده در این مدرسه نیست.'); }
    const ex = await db.select().from(classSubjects).where(and(eq(classSubjects.classId, classId), eq(classSubjects.subjectId, sub.id))).limit(1);
    if (ex.length) await db.update(classSubjects).set({ teacherId }).where(eq(classSubjects.id, ex[0].id));
    else await db.insert(classSubjects).values({ classId, subjectId: sub.id, teacherId });
    await audit(u.id, 'ASSIGN_TEACHER', 'class', classId, name);
    revalidatePath('/admin/classes');
    return success(`«${name}» اضافه شد.`);
  });
}

const randDigits = (n: number) => Array.from(crypto.randomBytes(n), (b) => b % 10).join('');
async function freeUsername(prefix: string) { for (let i = 0; i < 8; i++) { const name = prefix + randDigits(6); if (!(await db.select({ id: users.id }).from(users).where(eq(users.username, name)).limit(1)).length) return name; } return prefix + randDigits(10); }

/** ساخت سریع دانش‌آموز داخل یک کلاس: نام کاربری و رمز موقت خودکار ساخته می‌شود */
export async function quickAddStudent(_: ActionState, fd: FormData): Promise<ActionState> {
  return run([...MANAGERS], async (u) => {
    const classId = String(fd.get('classId') ?? ''); const firstName = String(fd.get('firstName') ?? '').trim().slice(0, 50); const lastName = String(fd.get('lastName') ?? '').trim().slice(0, 50);
    if (!firstName || !lastName) return fail('نام و نام خانوادگی دانش‌آموز را بنویسید.');
    if (!(await classInSchool(u, classId))) return fail('این کلاس در مدرسه‌ی شما نیست.');
    const username = await freeUsername('s'); const password = tempPassword();
    const [st] = await db.insert(users).values({ username, firstName, lastName, role: 'STUDENT', schoolId: schoolOf(u), classId, passwordHash: await bcrypt.hash(password, 10), mustChangePassword: true }).returning({ id: users.id });
    await audit(u.id, 'USER_CREATE', 'user', st.id, `${username} • STUDENT`);
    revalidatePath('/admin/classes'); revalidatePath('/admin/users');
    return success(`${firstName} ${lastName} اضافه شد. نام کاربری: ${username} — رمز موقت: ${password} (آن را یادداشت کنید و به دانش‌آموز بدهید)`);
  });
}

/** انتقال دانش‌آموزِ بدون کلاس به یک کلاس، یا خارج‌کردن از کلاس (classId خالی) */
export async function moveStudentToClass(_: ActionState, fd: FormData): Promise<ActionState> {
  return run([...MANAGERS], async (u) => {
    const studentId = String(fd.get('studentId') ?? ''); const classId = String(fd.get('classId') ?? '') || null;
    const [st] = await db.select().from(users).where(eq(users.id, studentId)).limit(1);
    if (!st || st.role !== 'STUDENT' || st.schoolId !== schoolOf(u)) return fail('دانش‌آموز را انتخاب کنید.');
    if (classId && !(await classInSchool(u, classId))) return fail('این کلاس در مدرسه‌ی شما نیست.');
    await db.update(users).set({ classId }).where(eq(users.id, st.id));
    await audit(u.id, 'STUDENT_MOVE', 'user', st.id);
    revalidatePath('/admin/classes'); revalidatePath('/admin/users');
    return success(classId ? 'به کلاس اضافه شد.' : 'از کلاس خارج شد.');
  });
}

/** افزودن ولی به یک دانش‌آموز: یا ولیِ ثبت‌شده را انتخاب کنید یا ولیِ تازه بسازید (نام کاربری و رمز موقت خودکار) */
export async function addParentToStudent(_: ActionState, fd: FormData): Promise<ActionState> {
  return run([...MANAGERS], async (u) => {
    const school = schoolOf(u); const studentId = String(fd.get('studentId') ?? ''); const existing = String(fd.get('parentId') ?? '');
    const [stu] = await db.select().from(users).where(eq(users.id, studentId)).limit(1);
    if (!stu || stu.role !== 'STUDENT' || stu.schoolId !== school) return fail('دانش‌آموز پیدا نشد.');
    if (existing) {
      const [par] = await db.select().from(users).where(eq(users.id, existing)).limit(1);
      if (!par || par.role !== 'PARENT' || par.schoolId !== school) return fail('ولی را درست انتخاب کنید.');
      await db.insert(parentStudents).values({ parentId: par.id, studentId }).onConflictDoNothing();
      await audit(u.id, 'PARENT_LINK', 'user', studentId); revalidatePath('/admin/classes');
      return success(`${fullName(par)} به‌عنوان ولیِ ${fullName(stu)} ثبت شد.`);
    }
    const firstName = String(fd.get('firstName') ?? '').trim().slice(0, 50); const lastName = String(fd.get('lastName') ?? '').trim().slice(0, 50);
    if (!firstName || !lastName) return fail('یا یک ولیِ ثبت‌شده را انتخاب کنید، یا نام و نام خانوادگی ولیِ تازه را بنویسید.');
    const username = await freeUsername('p'); const password = tempPassword();
    const [par] = await db.insert(users).values({ username, firstName, lastName, role: 'PARENT', schoolId: school, phone: String(fd.get('phone') ?? '').trim().slice(0, 20) || null, passwordHash: await bcrypt.hash(password, 10), mustChangePassword: true }).returning({ id: users.id });
    await db.insert(parentStudents).values({ parentId: par.id, studentId });
    await audit(u.id, 'USER_CREATE', 'user', par.id, `${username} • PARENT`); await audit(u.id, 'PARENT_LINK', 'user', studentId);
    revalidatePath('/admin/classes'); revalidatePath('/admin/users');
    return success(`ولیِ ${fullName(stu)} ساخته شد. نام کاربری: ${username} — رمز موقت: ${password} (آن را یادداشت کنید و به ولی بدهید)`);
  });
}

export async function removeClassSubject(_: ActionState, fd: FormData): Promise<ActionState> {
  return run([...MANAGERS], async (u) => {
    const id = String(fd.get('id'));
    const [row] = await db.select({ classId: classSubjects.classId }).from(classSubjects).where(eq(classSubjects.id, id)).limit(1);
    if (!row || !(await classInSchool(u, row.classId))) return fail('دسترسی ندارید.');
    await db.delete(classSubjects).where(eq(classSubjects.id, id));
    await audit(u.id, 'CLASS_SUBJECT_REMOVE', 'class_subject', id);
    revalidatePath('/admin/classes');
    return success('حذف شد.');
  });
}

/** تعیین «ولیِ کدام دانش‌آموز»: مدیر و معاونِ مدرسه (معلم دسترسی ندارد) */
export async function linkParent(_: ActionState, fd: FormData): Promise<ActionState> {
  return run([...MANAGERS], async (u) => {
    const school = schoolOf(u); const parentId = String(fd.get('parentId')); const studentId = String(fd.get('studentId'));
    const [par] = await db.select().from(users).where(eq(users.id, parentId)).limit(1);
    const [stu] = await db.select().from(users).where(eq(users.id, studentId)).limit(1);
    if (!par || par.role !== 'PARENT' || par.schoolId !== school) return fail('ولی را انتخاب کنید.');
    if (!stu || stu.role !== 'STUDENT' || stu.schoolId !== school) return fail('دانش‌آموز را انتخاب کنید.');
    await db.insert(parentStudents).values({ parentId, studentId }).onConflictDoNothing();
    await audit(u.id, 'PARENT_LINK', 'user', studentId);
    revalidatePath('/admin/classes');
    return success('پیوند ولی و دانش‌آموز ثبت شد.');
  });
}
export async function unlinkParent(_: ActionState, fd: FormData): Promise<ActionState> {
  return run([...MANAGERS], async (u) => {
    const parentId = String(fd.get('parentId'));
    const [par] = await db.select().from(users).where(eq(users.id, parentId)).limit(1);
    if (!par || par.schoolId !== schoolOf(u)) return fail('دسترسی ندارید.');
    await db.delete(parentStudents).where(and(eq(parentStudents.parentId, parentId), eq(parentStudents.studentId, String(fd.get('studentId')))));
    await audit(u.id, 'PARENT_UNLINK', 'user', String(fd.get('studentId')));
    revalidatePath('/admin/classes');
    return success('پیوند حذف شد.');
  });
}

export async function saveSettings(_: ActionState, fd: FormData): Promise<ActionState> {
  return run([...MANAGERS], async (u) => {
    const school = schoolOf(u);
    const schoolName = String(fd.get('schoolName') ?? '').trim(); const academicYear = String(fd.get('academicYear') ?? '').trim();
    const start = String(fd.get('studyWindowStart') ?? ''); const end = String(fd.get('studyWindowEnd') ?? '');
    const s = parseHM(start), e = parseHM(end);
    if (schoolName.length < 2) return fail('نام مدرسه را بنویسید.');
    if (s === null || e === null || e <= s || s >= 1440) return fail('بازه‌ی ارسال گزارش مطالعه معتبر نیست (پایان باید بعد از شروع باشد).');
    await db.update(schools).set({ name: schoolName }).where(eq(schools.id, school));
    await setSetting(school, 'academicYear', academicYear || '۱۴۰۵-۱۴۰۶');
    await setSetting(school, 'studyWindowStart', start); await setSetting(school, 'studyWindowEnd', end);
    await setSetting(school, 'showRankLists', fd.get('showRankLists') ? '1' : '0');
    await setSetting(school, 'remindersEnabled', fd.get('remindersEnabled') ? '1' : '0');
    await audit(u.id, 'SETTINGS_SAVE', 'settings', undefined, `${start}–${end}`);
    revalidatePath('/', 'layout');
    return success('تنظیمات ذخیره شد.');
  });
}

/** مدیر مدرسه (یا مدیرکل) تعیین می‌کند هر معاون «معاون چه کاری» است: آموزشی، پرورشی، اجرایی، … */
export async function setViceTitle(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(['ADMIN', 'PRINCIPAL'], async (actor) => {
    const [t] = await db.select().from(users).where(eq(users.id, String(fd.get('id')))).limit(1);
    if (!t || t.role !== 'VICE') return fail('این کاربر معاون نیست.');
    if (actor.role !== 'ADMIN' && t.schoolId !== actor.schoolId) return fail('این معاون در مدرسه‌ی شما نیست.');
    const title = String(fd.get('viceTitle') ?? '').trim().slice(0, 40);
    await db.update(users).set({ viceTitle: title || null }).where(eq(users.id, t.id));
    await audit(actor.id, 'VICE_TITLE', 'user', t.id, title);
    revalidatePath('/admin/users'); revalidatePath('/', 'layout');
    return success(title ? `عنوان «${title}» ذخیره شد.` : 'عنوان پاک شد.');
  });
}
