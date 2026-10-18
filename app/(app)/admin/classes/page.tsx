import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { classes, classSubjects, parentStudents, subjects, users } from '@/db/schema';
import { assignTeacher, createClass, createSubject, deleteClass, linkParent, removeClassSubject, unlinkParent } from '@/app/actions/admin';
import { requireUser } from '@/lib/auth';
import { fa, fullName } from '@/lib/format';
import ActionForm from '@/components/ActionForm';
import { Badge, Card, Empty, PageHead } from '@/components/ui';

export const metadata = { title: 'کلاس‌ها و درس‌ها' };

export default async function AdminClasses() {
  const me = await requireUser(['PRINCIPAL', 'VICE']); const school = me.schoolId!;
  const cls = await db.select().from(classes).where(eq(classes.schoolId, school)).orderBy(asc(classes.gradeLevel), asc(classes.name));
  const subs = await db.select().from(subjects).where(eq(subjects.schoolId, school)).orderBy(asc(subjects.name));
  const teachers = await db.select().from(users).where(and(eq(users.role, 'TEACHER'), eq(users.schoolId, school))).orderBy(asc(users.lastName));
  const classIds = cls.map((c) => c.id);
  const cs = classIds.length ? await db.select({ cs: classSubjects, subject: subjects.name, tf: users.firstName, tl: users.lastName }).from(classSubjects).innerJoin(subjects, eq(subjects.id, classSubjects.subjectId)).leftJoin(users, eq(users.id, classSubjects.teacherId)).where(inArray(classSubjects.classId, classIds)) : [];
  const students = await db.select().from(users).where(and(eq(users.role, 'STUDENT'), eq(users.schoolId, school))).orderBy(asc(users.lastName));
  const parents = await db.select().from(users).where(and(eq(users.role, 'PARENT'), eq(users.schoolId, school))).orderBy(asc(users.lastName));
  const sIds = students.map((x) => x.id);
  const links = sIds.length ? await db.select().from(parentStudents).where(inArray(parentStudents.studentId, sIds)) : [];
  const nm = new Map([...students, ...parents].map((x) => [x.id, fullName(x)]));

  return (
    <>
      <PageHead illus="school" title="کلاس‌ها، درس‌ها و معلم‌ها" sub="تعیین کنید هر معلم در کدام کلاس چه درسی را تدریس می‌کند. معلم فقط به دانش‌آموزان همین کلاس‌ها دسترسی دارد. دانش‌آموزان را از بخش «کاربران مدرسه» به کلاس اضافه کنید. «پایه» را برای کلاس‌های هم‌سطح یکسان بنویسید (مثلاً «دهم»)؛ رتبه‌ی پایه بر اساس همین فیلد حساب می‌شود." />
      <div className="grid g2">
        <Card title="کلاس جدید"><ActionForm action={createClass} submit="ساخت کلاس"><div className="inline-fields">
          <div className="field"><label>نام کلاس</label><input name="name" required placeholder="مثلاً: دهم تجربی (ب)" /></div><div className="field"><label>پایه</label><input name="gradeLevel" required placeholder="دهم" /></div><div className="field"><label>سال تحصیلی</label><input name="academicYear" defaultValue="۱۴۰۵-۱۴۰۶" required /></div></div></ActionForm></Card>
        <Card title="درس جدید"><ActionForm action={createSubject} submit="افزودن درس"><div className="field"><label>نام درس</label><input name="name" required placeholder="مثلاً: عربی" /></div></ActionForm>
          <div className="chips" style={{ marginTop: 12 }}>{subs.map((s) => <Badge key={s.id}>{s.name}</Badge>)}</div></Card>
      </div>
      <div className="stack" style={{ marginTop: 16 }}>
        {cls.length === 0 && <Card><Empty text="هنوز کلاسی ساخته نشده است." icon="school" /></Card>}
        {cls.map((c) => { const rows = cs.filter((r) => r.cs.classId === c.id); const cstu = students.filter((s) => s.classId === c.id); return (
          <Card key={c.id} title={`${c.name} • ${c.academicYear}`} action={<ActionForm action={deleteClass} submit="حذف کلاس" danger small inline confirm="کلاس حذف می‌شود و دانش‌آموزانش بدون کلاس می‌مانند. ادامه می‌دهید؟"><input type="hidden" name="id" value={c.id} /></ActionForm>}>
            <div className="muted small" style={{ marginBottom: 10 }}>{fa(cstu.length)} دانش‌آموز: {cstu.map(fullName).join('، ') || '—'}</div>
            <div className="table-wrap"><table><thead><tr><th>درس</th><th>معلم</th><th /></tr></thead><tbody>
              {rows.map((r) => (<tr key={r.cs.id}><td><b>{r.subject}</b></td><td>{r.tf ? `${r.tf} ${r.tl}` : <Badge tone="warn">بدون معلم</Badge>}</td>
                <td><ActionForm action={removeClassSubject} submit="حذف" danger small inline><input type="hidden" name="id" value={r.cs.id} /></ActionForm></td></tr>))}
              {!rows.length && <tr><td colSpan={3} className="muted">درسی ثبت نشده.</td></tr>}</tbody></table></div>
            <div style={{ marginTop: 14 }}><ActionForm action={assignTeacher} submit="ذخیره" resetOnSuccess={false}><input type="hidden" name="classId" value={c.id} />
              <div className="inline-fields"><div className="field"><label>درس</label><select name="subjectId" defaultValue=""><option value="" disabled>انتخاب…</option>{subs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                <div className="field"><label>معلم</label><select name="teacherId" defaultValue=""><option value="">— بدون معلم —</option>{teachers.map((t) => <option key={t.id} value={t.id}>{fullName(t)}</option>)}</select></div></div>
              <span className="hint-t">اگر درس قبلاً برای این کلاس ثبت شده باشد، فقط معلمش تغییر می‌کند.</span></ActionForm></div>
          </Card>); })}
      </div>
      <div style={{ height: 16 }} />
      <Card title="پیوند ولی و دانش‌آموز">
        <p className="muted small" style={{ marginBottom: 12 }}>اینجا مشخص می‌شود هر ولی، ولیِ کدام دانش‌آموز است؛ ولی فقط اطلاعات فرزند (یا فرزندان) پیوندخورده را می‌بیند. یک ولی می‌تواند چند فرزند و یک دانش‌آموز می‌تواند چند ولی (مثلاً پدر و مادر) داشته باشد. ابتدا ولی را از «کاربران مدرسه» با نقش «ولی» بسازید، سپس اینجا به دانش‌آموز وصل کنید. مدیر و معاون هر دو می‌توانند این کار را انجام دهند.</p>
        <div className="grid g2">
          <ActionForm action={linkParent} submit="ثبت پیوند"><div className="field"><label>ولی</label><select name="parentId" defaultValue=""><option value="" disabled>انتخاب…</option>{parents.map((p) => <option key={p.id} value={p.id}>{fullName(p)}</option>)}</select></div>
            <div className="field"><label>دانش‌آموز</label><select name="studentId" defaultValue=""><option value="" disabled>انتخاب…</option>{students.map((s) => <option key={s.id} value={s.id}>{fullName(s)}</option>)}</select></div></ActionForm>
          <div className="list">{links.length ? links.map((l) => (<div className="list-item" key={l.parentId + l.studentId}><span>{nm.get(l.parentId)} ← {nm.get(l.studentId)}</span>
            <ActionForm action={unlinkParent} submit="حذف" small danger inline><input type="hidden" name="parentId" value={l.parentId} /><input type="hidden" name="studentId" value={l.studentId} /></ActionForm></div>)) : <Empty text="پیوندی ثبت نشده." icon="users" />}</div>
        </div>
      </Card>
    </>
  );
}
