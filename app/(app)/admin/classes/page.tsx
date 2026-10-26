import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { classes, classSubjects, parentStudents, subjects, users } from '@/db/schema';
import { addParentToStudent, createClass, createSubjects, deleteClass, deleteSubject, moveStudentToClass, quickAddStudent, saveClassSubjects, setClassGrade, unlinkParent } from '@/app/actions/admin';
import { requireUser } from '@/lib/auth';
import { fa, fullName } from '@/lib/format';
import { GRADE_LEVELS, gradeTitle, isKnownGrade } from '@/lib/grades';
import ActionForm from '@/components/ActionForm';
import { Collapse } from '@/components/Interactive';
import { Badge, Card, Empty, PageHead } from '@/components/ui';

export const metadata = { title: 'کلاس‌ها' };

export default async function AdminClasses() {
  const me = await requireUser(['PRINCIPAL', 'VICE']); const school = me.schoolId!;
  const cls = await db.select().from(classes).where(eq(classes.schoolId, school)).orderBy(asc(classes.gradeLevel), asc(classes.name));
  const subs = await db.select().from(subjects).where(eq(subjects.schoolId, school)).orderBy(asc(subjects.name));
  const teachers = await db.select().from(users).where(and(eq(users.role, 'TEACHER'), eq(users.schoolId, school))).orderBy(asc(users.lastName));
  const classIds = cls.map((c) => c.id);
  const cs = classIds.length ? await db.select().from(classSubjects).where(inArray(classSubjects.classId, classIds)) : [];
  const students = await db.select().from(users).where(and(eq(users.role, 'STUDENT'), eq(users.schoolId, school))).orderBy(asc(users.lastName));
  const parents = await db.select().from(users).where(and(eq(users.role, 'PARENT'), eq(users.schoolId, school))).orderBy(asc(users.lastName));
  const sIds = students.map((x) => x.id);
  const links = sIds.length ? await db.select().from(parentStudents).where(inArray(parentStudents.studentId, sIds)) : [];
  const nm = new Map(parents.map((x) => [x.id, fullName(x)]));
  const unassigned = students.filter((s) => !s.classId);

  return (
    <>
      <PageHead illus="school" title="کلاس‌ها" sub="۱) یک‌بار همه‌ی درس‌های مدرسه را وارد کنید. ۲) کلاس‌ها را بسازید. ۳) داخل هر کلاس فقط درس‌ها را تیک بزنید." />

      <Collapse title="📚 درس‌های مدرسه" hint="همه‌ی درس‌ها را فقط یک‌بار اینجا وارد کنید" badge={<Badge tone="primary">{fa(subs.length)} درس</Badge>}>
        <ActionForm action={createSubjects} submit="افزودن درس‌ها">
          <div className="field"><label>نام درس‌ها</label><textarea name="names" rows={4} required placeholder={'ریاضی\nفیزیک\nشیمی\nادبیات'} /></div>
          <p className="hint-t">هر درس را در یک خط بنویسید (یا با ویرگول جدا کنید). می‌توانید چند درس را یک‌جا وارد کنید.</p>
        </ActionForm>
        <h4 className="cls-sec">درس‌هایی که تا حالا ثبت شده</h4>
        {subs.length ? <div className="chips">{subs.map((s) => (
          <span className="chip-x" key={s.id}>{s.name}
            <ActionForm action={deleteSubject} submit="×" small inline className="row" confirm={`درس «${s.name}» از فهرست مدرسه حذف شود؟`}><input type="hidden" name="id" value={s.id} /></ActionForm>
          </span>))}</div> : <p className="muted small">هنوز درسی ثبت نشده است.</p>}
      </Collapse>

      <div style={{ height: 16 }} />
      <Collapse title="➕ کلاس جدید" hint="نام و پایه‌ی کلاس را بنویسید">
        <ActionForm action={createClass} submit="ساخت کلاس">
          <div className="inline-fields"><div className="field"><label>نام کلاس</label><input name="name" required maxLength={60} placeholder="مثلاً: C1 یا دهم تجربی (ب)" /></div><div className="field"><label>پایه</label><select name="gradeLevel" required defaultValue=""><option value="" disabled>انتخاب پایه…</option>{GRADE_LEVELS.map((g) => <option key={g} value={g}>{gradeTitle(g)}</option>)}</select></div></div>
          <p className="hint-t">کلاس‌هایی که پایه‌ی یکسان دارند (مثلاً دو کلاس نهم) در رتبه‌بندی «پایه» با هم مقایسه می‌شوند.</p>
        </ActionForm>
      </Collapse>

      <h3 style={{ margin: '24px 0 12px' }}>کلاس‌های مدرسه <span className="muted small">(روی نام هر کلاس بزنید تا باز شود)</span></h3>
      <div className="stack">
        {cls.length === 0 && <Card><Empty text="هنوز کلاسی ساخته نشده است. از بخش «کلاس جدید» اولین کلاس را بسازید." icon="school" /></Card>}
        {cls.map((c) => {
          const rows = cs.filter((r) => r.classId === c.id); const cstu = students.filter((s) => s.classId === c.id);
          return (
            <Collapse key={c.id} title={`🏫 ${c.name}`} hint={`${gradeTitle(c.gradeLevel)} • ${fa(rows.length)} درس • ${fa(cstu.length)} دانش‌آموز`} badge={<Badge>{fa(cstu.length)} دانش‌آموز</Badge>}>
              <h4 className="cls-sec">۰. پایه‌ی این کلاس</h4>
              <ActionForm action={setClassGrade} submit="ذخیره‌ی پایه" resetOnSuccess={false} small>
                <input type="hidden" name="classId" value={c.id} />
                {!isKnownGrade(c.gradeLevel) && <div className="alert warn" style={{ marginBottom: 8 }}>پایه‌ی این کلاس هنوز مشخص نشده (الان «{c.gradeLevel}» ثبت شده). پایه را انتخاب کنید تا رتبه‌ها درست و با نام پایه نمایش داده شوند.</div>}
                <div className="field"><label>این کلاس مربوط به کدام پایه است؟</label><select name="gradeLevel" defaultValue={isKnownGrade(c.gradeLevel) ? c.gradeLevel : ''} required><option value="" disabled>انتخاب پایه…</option>{GRADE_LEVELS.map((g) => <option key={g} value={g}>{gradeTitle(g)}</option>)}</select></div>
              </ActionForm>

              <h4 className="cls-sec">۱. درس‌ها و معلم‌ها</h4>
              {subs.length ? (
                <ActionForm action={saveClassSubjects} submit="ذخیره‌ی درس‌های این کلاس" resetOnSuccess={false}>
                  <input type="hidden" name="classId" value={c.id} />
                  <p className="hint-t">درس‌هایی که در این کلاس تدریس می‌شود را تیک بزنید و معلمش را انتخاب کنید. با برداشتن تیک، درس از این کلاس برداشته می‌شود (نمره‌های ثبت‌شده پاک نمی‌شوند).</p>
                  <div className="list">{subs.map((s) => {
                    const r = rows.find((x) => x.subjectId === s.id);
                    return (
                      <div className="list-item subj-pick" key={s.id}>
                        <label className="subj-check"><input type="checkbox" name={`on_${s.id}`} defaultChecked={!!r} /><b>{s.name}</b></label>
                        <select name={`teacher_${s.id}`} defaultValue={r?.teacherId ?? ''} aria-label={`معلم درس ${s.name}`}><option value="">— بدون معلم —</option>{teachers.map((t) => <option key={t.id} value={t.id}>{fullName(t)}</option>)}</select>
                      </div>);
                  })}</div>
                </ActionForm>
              ) : <p className="muted small">اول در بخش «درس‌های مدرسه» (بالای صفحه) درس‌ها را وارد کنید؛ بعد اینجا فقط تیک می‌زنید.</p>}

              <h4 className="cls-sec">۲. دانش‌آموزان و ولی‌ها</h4>
              {cstu.length ? <div className="list">{cstu.map((s) => {
                const mine = links.filter((l) => l.studentId === s.id);
                return (
                  <div className="list-item cls-stu" key={s.id}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <b>{fullName(s)}</b>
                      <div className="chips" style={{ marginTop: 4 }}>{mine.length ? mine.map((l) => (
                        <span className="chip-x" key={l.parentId}>ولی: {nm.get(l.parentId) ?? '—'}
                          <ActionForm action={unlinkParent} submit="×" small inline className="row" confirm="این ولی از این دانش‌آموز جدا شود؟"><input type="hidden" name="parentId" value={l.parentId} /><input type="hidden" name="studentId" value={s.id} /></ActionForm></span>)) : <span className="muted small">ولی ثبت نشده</span>}</div>
                      <details style={{ marginTop: 6 }}><summary className="small" style={{ cursor: 'pointer', color: 'var(--primary)' }}>+ افزودن ولی</summary>
                        <ActionForm action={addParentToStudent} submit="ثبت ولی" small>
                          <input type="hidden" name="studentId" value={s.id} />
                          {parents.length > 0 && <div className="field"><label>ولیِ قبلاً ثبت‌شده</label><select name="parentId" defaultValue=""><option value="">— انتخاب نمی‌کنم —</option>{parents.map((p) => <option key={p.id} value={p.id}>{fullName(p)}</option>)}</select></div>}
                          <p className="hint-t">{parents.length > 0 ? 'یا ' : ''}ولیِ تازه را بنویسید:</p>
                          <div className="inline-fields"><div className="field"><label>نام</label><input name="firstName" maxLength={50} /></div><div className="field"><label>نام خانوادگی</label><input name="lastName" maxLength={50} /></div><div className="field"><label>موبایل <span className="muted">(اختیاری)</span></label><input name="phone" dir="ltr" inputMode="tel" /></div></div>
                        </ActionForm></details>
                    </div>
                    <ActionForm action={moveStudentToClass} submit="خروج از کلاس" small danger inline className="row" confirm={`${fullName(s)} از این کلاس خارج شود؟ (حذف نمی‌شود)`}><input type="hidden" name="studentId" value={s.id} /><input type="hidden" name="classId" value="" /></ActionForm>
                  </div>);
              })}</div> : <p className="muted small">هنوز دانش‌آموزی در این کلاس نیست.</p>}
              <details className="cls-add"><summary className="btn ghost sm" style={{ display: 'inline-flex' }}>+ دانش‌آموز جدید برای این کلاس</summary>
                <ActionForm action={quickAddStudent} submit="ساخت دانش‌آموز">
                  <input type="hidden" name="classId" value={c.id} />
                  <div className="inline-fields"><div className="field"><label>نام</label><input name="firstName" required maxLength={50} /></div><div className="field"><label>نام خانوادگی</label><input name="lastName" required maxLength={50} /></div></div>
                  <p className="hint-t">نام کاربری و رمز موقت خودکار ساخته و همین‌جا نشان داده می‌شود.</p>
                </ActionForm>
                {unassigned.length > 0 && <ActionForm action={moveStudentToClass} submit="افزودن به این کلاس">
                  <input type="hidden" name="classId" value={c.id} />
                  <div className="field"><label>یا یک دانش‌آموزِ بدون کلاس را اضافه کنید</label><select name="studentId" defaultValue="" required><option value="" disabled>انتخاب…</option>{unassigned.map((s) => <option key={s.id} value={s.id}>{fullName(s)}</option>)}</select></div>
                </ActionForm>}
              </details>

              <div style={{ marginTop: 14 }}><ActionForm action={deleteClass} submit="حذف این کلاس" danger small inline confirm="کلاس حذف می‌شود و دانش‌آموزانش بدون کلاس می‌مانند (حذف نمی‌شوند). ادامه می‌دهید؟"><input type="hidden" name="id" value={c.id} /></ActionForm></div>
            </Collapse>);
        })}
      </div>
    </>
  );
}
