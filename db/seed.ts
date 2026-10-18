import bcrypt from 'bcryptjs';
import { loadEnv } from './env';
loadEnv();

async function main() {
  const { db } = await import('./index');
  const s = await import('./schema');
  const { and, eq } = await import('drizzle-orm');
  const { todayTehran, addDays } = await import('../lib/time');
  const { testPercent } = await import('../lib/study');

  const existing = await db.select().from(s.users).where(eq(s.users.username, 'admin')).limit(1);
  if (existing.length) { console.log('داده‌ی نمونه از قبل وجود دارد؛ چیزی تغییر نکرد.'); return; }

  const password = process.env.SEED_PASSWORD ?? 'ChangeMe123!';
  const passwordHash = await bcrypt.hash(password, 10);
  const mk = async (username: string, firstName: string, lastName: string, role: (typeof s.ROLES)[number], extra: Partial<typeof s.users.$inferInsert> = {}) => {
    const [u] = await db.insert(s.users).values({ username, firstName, lastName, role, passwordHash, ...extra }).returning();
    return u;
  };
  const today = todayTehran();
  let seed = 7; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;

  // ---- مدیرکل سامانه (بدون مدرسه) ----
  await mk('admin', 'مدیرکل', 'سامانه', 'ADMIN', { isOwner: true });
  // تعرفه‌های نمونه (قیمت‌ها فقط نمونه‌اند؛ از «تعرفه‌ها» در پنل مدیرکل تغییر دهید)
  await db.insert(s.plans).values([
    { name: 'سه‌ماهه', priceToman: 900000, months: 3, maxStudents: 300, sortOrder: 1, description: 'مناسب شروع و آزمایش' },
    { name: 'سالانه', priceToman: 2900000, months: 12, maxStudents: 800, sortOrder: 2, description: 'یک سال تحصیلی کامل' },
    { name: 'سالانه‌ی نامحدود', priceToman: 4900000, months: 12, maxStudents: 0, sortOrder: 3, description: 'برای مدارس بزرگ و مجتمع‌ها' },
  ]);

  const subjectNames = ['ریاضی', 'فیزیک', 'شیمی', 'زیست‌شناسی', 'ادبیات فارسی', 'زبان انگلیسی'];
  async function makeSchool(name: string) {
    const [sc] = await db.insert(s.schools).values({ name }).returning();
    await db.insert(s.settings).values([{ schoolId: sc.id, key: 'academicYear', value: '۱۴۰۵-۱۴۰۶' }, { schoolId: sc.id, key: 'studyWindowStart', value: '08:00' }, { schoolId: sc.id, key: 'studyWindowEnd', value: '24:00' }, { schoolId: sc.id, key: 'showRankLists', value: '1' }]);
    const subj: Record<string, string> = {};
    for (const n of subjectNames) { const [r] = await db.insert(s.subjects).values({ name: n, schoolId: sc.id }).returning(); subj[n] = r.id; }
    return { sc, subj };
  }
  const mkClass = async (schoolId: string, name: string, gradeLevel: string) => (await db.insert(s.classes).values({ schoolId, name, gradeLevel, academicYear: '۱۴۰۵-۱۴۰۶' }).returning())[0];

  // ================= مدرسه‌ی اول: دبیرستان نمونه =================
  const A = await makeSchool('دبیرستان نمونه'); const sa = A.sc.id;
  const principal = await mk('principal1', 'سمیرا', 'کریمی', 'PRINCIPAL', { schoolId: sa });
  await mk('vice1', 'فرهاد', 'نجفی', 'VICE', { schoolId: sa, viceTitle: 'معاون آموزشی' });
  await mk('vice_t', 'مهدی', 'پاکزاد', 'VICE', { schoolId: sa, viceTitle: 'معاون پرورشی' });
  const t1 = await mk('teacher1', 'مریم', 'احمدی', 'TEACHER', { schoolId: sa });
  const t2 = await mk('teacher2', 'رضا', 'نوری', 'TEACHER', { schoolId: sa });
  const t3 = await mk('teacher3', 'لیلا', 'صادقی', 'TEACHER', { schoolId: sa });
  const c10a = await mkClass(sa, 'دهم تجربی (الف)', 'دهم');
  const c10b = await mkClass(sa, 'دهم تجربی (ب)', 'دهم');   // هم‌پایه‌ی کلاس الف
  const c11 = await mkClass(sa, 'یازدهم ریاضی (الف)', 'یازدهم');
  const plan: [string, string, string][] = [];
  for (const c of [c10a.id, c10b.id]) for (const [sn, t] of [['ریاضی', t1], ['فیزیک', t2], ['شیمی', t2], ['زیست‌شناسی', t3], ['ادبیات فارسی', t3]] as const) plan.push([c, sn, t.id]);
  for (const [sn, t] of [['ریاضی', t1], ['فیزیک', t2], ['زبان انگلیسی', t3]] as const) plan.push([c11.id, sn, t.id]);
  for (const [classId, sn, teacherId] of plan) await db.insert(s.classSubjects).values({ classId, subjectId: A.subj[sn], teacherId });

  const defs: [string, string, string, string][] = [
    ['student1', 'احمدرضا', 'مسلمی', c10a.id], ['student2', 'سارا', 'رضایی', c10a.id], ['student3', 'علی', 'محمدی', c10a.id], ['student4', 'مهسا', 'حسینی', c10a.id],
    ['student5', 'امیر', 'کاظمی', c10b.id], ['student6', 'نگار', 'جعفری', c10b.id], ['student7', 'پارسا', 'یوسفی', c10b.id],
    ['student8', 'هانیه', 'سلیمانی', c11.id], ['student9', 'کیان', 'فرهادی', c11.id],
  ];
  const students: (typeof s.users.$inferSelect)[] = [];
  for (const [u, f, l, classId] of defs) students.push(await mk(u, f, l, 'STUDENT', { schoolId: sa, classId }));
  const parent = await mk('parent1', 'محمود', 'مسلمی', 'PARENT', { schoolId: sa, phone: '09121234567' });
  await db.insert(s.parentStudents).values([{ parentId: parent.id, studentId: students[0].id }, { parentId: parent.id, studentId: students[1].id }]);
  const parent2 = await mk('parent2', 'زهرا', 'کاظمی', 'PARENT', { schoolId: sa, phone: '09351112233' });
  await db.insert(s.parentStudents).values({ parentId: parent2.id, studentId: students[4].id });

  // گزارش مطالعه: ولی ثبت می‌کند (createdBy = ولی)
  const parentOf = new Map([[students[0].id, parent.id], [students[1].id, parent.id], [students[4].id, parent2.id]]);
  const topics: [string, string][] = [['ریاضی', 'معادلات درجه دوم'], ['فیزیک', 'سینماتیک'], ['شیمی', 'ساختار اتم'], ['زیست‌شناسی', 'گوارش'], ['ادبیات فارسی', 'آرایه‌های ادبی']];
  for (const st of [students[0], students[1], students[4]]) {
    for (let d = 1; d <= 10; d++) {
      if (rnd() < 0.25) continue;
      // هر گزارش یک یا دو درس دارد؛ برای هر درس زمان مطالعه و زمان تست جدا
      const first = Math.floor(rnd() * topics.length); const picks = rnd() > 0.5 ? [first, (first + 1 + Math.floor(rnd() * (topics.length - 1))) % topics.length] : [first];
      const mins = picks.map(() => ({ study: 20 + Math.floor(rnd() * 4) * 10, test: rnd() > 0.5 ? 15 + Math.floor(rnd() * 3) * 15 : 0 }));
      const total = mins.reduce((a, m) => a + m.study + m.test, 0);
      const startH = 16 + Math.floor(rnd() * 3); const endMin = startH * 60 + total + 10;
      const start = `${String(startH).padStart(2, '0')}:00`;
      const end = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;
      const [r] = await db.insert(s.studyReports).values({
        studentId: st.id, date: addDays(today, -d), startTime: start, endTime: end, durationMin: total,
        subjectId: A.subj[topics[picks[0]][0]], topic: picks.map((k) => topics[k][1]).join(' • '), methods: JSON.stringify(['reading', 'exercise']),
        pages: Math.floor(rnd() * 14), mastery: 2 + Math.floor(rnd() * 4), goal: 'مرور مبحث و حل تمرین‌های آخر فصل', goalAchieved: rnd() > 0.3, createdBy: parentOf.get(st.id),
      }).returning();
      for (const [pos, k] of picks.entries()) {
        const [sn, topic] = topics[k];
        await db.insert(s.studyReportItems).values({ reportId: r.id, subjectId: A.subj[sn], studyMin: mins[pos].study, testMin: mins[pos].test, topic, methods: JSON.stringify(mins[pos].test ? ['reading', 'testing'] : ['reading', 'exercise']), pages: Math.floor(rnd() * 14), mastery: 2 + Math.floor(rnd() * 4), position: pos });
        if (mins[pos].test) {
          const tot = 20 + Math.floor(rnd() * 20); const correct = Math.floor(tot * (0.5 + rnd() * 0.4)); const wrong = Math.floor((tot - correct) * 0.6); const blank = tot - correct - wrong;
          await db.insert(s.studyTests).values({ reportId: r.id, subjectId: A.subj[sn], source: 'کتاب کار و آزمون‌های گاج', totalCount: tot, correctCount: correct, wrongCount: wrong, blankCount: blank, durationMin: mins[pos].test, percent: testPercent(correct, wrong, tot) });
        }
      }
    }
  }

  // نمره‌ها برای همه‌ی دانش‌آموزانِ پایه‌ی دهم (دو کلاس) تا رتبه‌ی کلاس و پایه معنا داشته باشد
  const teacherFor: Record<string, string> = { 'ریاضی': t1.id, 'فیزیک': t2.id, 'شیمی': t2.id, 'زیست‌شناسی': t3.id, 'ادبیات فارسی': t3.id };
  for (const st of students.filter((x) => x.classId === c10a.id || x.classId === c10b.id)) {
    const strength = 0.3 + rnd() * 0.6;
    for (const sn of Object.keys(teacherFor)) for (const [title, back] of [['آزمون مستمر ۱', 12], ['آزمون مستمر ۲', 4]] as const)
      await db.insert(s.grades).values({ studentId: st.id, subjectId: A.subj[sn], title, type: 'quiz', score: Math.round((8 + strength * 12 + (rnd() - 0.5) * 3) * 4) / 4 > 20 ? 20 : Math.round((8 + strength * 12 + (rnd() - 0.5) * 3) * 4) / 4, maxScore: 20, date: addDays(today, -back), recordedBy: teacherFor[sn] });
  }
  await db.insert(s.attendance).values([
    { studentId: students[1].id, date: addDays(today, -3), status: 'absent', recordedBy: t1.id },
    { studentId: students[2].id, date: addDays(today, -2), status: 'late', note: '۱۵ دقیقه تأخیر', recordedBy: t1.id },
  ]);
  await db.insert(s.studentNotes).values([
    { studentId: students[0].id, type: 'praise', body: 'مشارکت فعال و دقیق در کلاس ریاضی.', date: addDays(today, -4), authorId: t1.id },
    { studentId: students[2].id, type: 'discipline', body: 'تأخیر بدون هماهنگی در زنگ اول.', date: addDays(today, -2), authorId: principal.id },
    { studentId: students[4].id, type: 'praise', body: 'کمک به همکلاسی‌ها در حل تمرین.', date: addDays(today, -6), authorId: t2.id },
    { studentId: students[5].id, type: 'praise', body: 'نظم و آمادگی کامل در کلاس.', date: addDays(today, -5), authorId: t3.id },
    { studentId: students[5].id, type: 'praise', body: 'شرکت در مسابقه‌ی علمی مدرسه.', date: addDays(today, -3), authorId: principal.id },
    { studentId: students[6].id, type: 'discipline', body: 'استفاده از گوشی در کلاس.', date: addDays(today, -4), authorId: t1.id },
    { studentId: students[1].id, type: 'praise', body: 'رتبه‌ی برتر آزمون آزمایشی.', date: addDays(today, -7), authorId: t2.id },
  ]);
  await db.insert(s.assignments).values({ classId: c10a.id, subjectId: A.subj['ریاضی'], title: 'تمرین‌های صفحه‌ی ۴۵ تا ۴۸', description: 'حل کامل تمرین‌ها با توضیح مراحل.', dueDate: addDays(today, 3), dueTime: '09:45', steps: JSON.stringify(['حل تمرین‌های صفحه‌ی ۴۵', 'حل تمرین‌های صفحه‌ی ۴۶ و ۴۷', 'حل تمرین‌های صفحه‌ی ۴۸ و بازبینی']), createdBy: t1.id });
  await db.insert(s.announcements).values({ schoolId: sa, title: 'به سامانه‌ی مدرسه خوش آمدید', body: 'ولیِ هر دانش‌آموز گزارش مطالعه‌ی روزانه را هر روز از ساعت ۸ صبح تا ۱۲ شب ثبت می‌کند.', authorId: principal.id });
  // ساعت هر زنگ (نمونه)
  const PT: Record<number, [string, string]> = { 1: ['08:00', '08:45'], 2: ['08:50', '09:35'], 3: ['09:50', '10:35'], 4: ['10:40', '11:25'], 5: ['11:40', '12:25'], 6: ['12:30', '13:15'] };
  const slotPlan: [number, number, string][] = [[0, 1, 'ریاضی'], [0, 2, 'فیزیک'], [0, 3, 'شیمی'], [1, 1, 'زیست‌شناسی'], [1, 2, 'ادبیات فارسی'], [2, 1, 'ریاضی'], [2, 2, 'شیمی'], [3, 1, 'فیزیک'], [3, 2, 'زیست‌شناسی'], [4, 1, 'ریاضی']];
  for (const [weekday, period, sn] of slotPlan) await db.insert(s.scheduleSlots).values({ classId: c10a.id, weekday, period, subjectId: A.subj[sn], room: 'کلاس ۱۰۲', startTime: PT[period][0], endTime: PT[period][1] });
  // برنامه‌ی کلاس‌های دیگر (معلم‌ها در یک زنگ دو کلاس ندارند؛ پنج‌شنبه برای معلم‌ها آزاد است)
  const more: [string, number, number, string][] = [[c10b.id, 0, 2, 'ریاضی'], [c10b.id, 0, 4, 'فیزیک'], [c10b.id, 1, 3, 'شیمی'], [c10b.id, 2, 3, 'ادبیات فارسی'], [c10b.id, 3, 3, 'زیست‌شناسی'], [c10b.id, 4, 2, 'ریاضی'], [c11.id, 1, 4, 'ریاضی'], [c11.id, 2, 4, 'فیزیک'], [c11.id, 4, 3, 'زبان انگلیسی'], [c11.id, 3, 4, 'ریاضی']];
  for (const [classId, weekday, period, sn] of more) await db.insert(s.scheduleSlots).values({ classId, weekday, period, subjectId: A.subj[sn], room: 'کلاس ۲۰۱', startTime: PT[period][0], endTime: PT[period][1] });
  // روزِ «عدم مطالعه» نباید هم‌زمان گزارش داشته باشد
  await db.delete(s.studyReports).where(and(eq(s.studyReports.studentId, students[1].id), eq(s.studyReports.date, addDays(today, -2))));
  await db.insert(s.studySkips).values({ studentId: students[1].id, date: addDays(today, -2), createdBy: parent.id });
  await db.insert(s.messages).values({ senderId: t1.id, recipientId: students[0].id, subject: 'تمرین‌های ریاضی', body: 'سلام؛ لطفاً مسئله‌های ۱۲ تا ۱۵ را هم برای جلسه‌ی بعد حل کن.' });

  // ================= مدرسه‌ی دوم: برای نمایش جداسازی داده‌ها =================
  const B = await makeSchool('دبیرستان دوم'); const sb = B.sc.id;
  await mk('principal2', 'حمید', 'امینی', 'PRINCIPAL', { schoolId: sb });
  await mk('vice2', 'الهام', 'توکلی', 'VICE', { schoolId: sb });
  const tb = await mk('teacher_b', 'سعید', 'قاسمی', 'TEACHER', { schoolId: sb });
  const cb = await mkClass(sb, 'دهم تجربی (الف)', 'دهم');
  await db.insert(s.classSubjects).values({ classId: cb.id, subjectId: B.subj['ریاضی'], teacherId: tb.id });
  const sb1 = await mk('student_b1', 'دانیال', 'شریفی', 'STUDENT', { schoolId: sb, classId: cb.id });
  const sb2 = await mk('student_b2', 'ریحانه', 'عباسی', 'STUDENT', { schoolId: sb, classId: cb.id });
  const pb = await mk('parent_b', 'کاظم', 'شریفی', 'PARENT', { schoolId: sb });
  await db.insert(s.parentStudents).values({ parentId: pb.id, studentId: sb1.id });
  for (const [st, sc] of [[sb1, 17], [sb2, 14]] as const) await db.insert(s.grades).values({ studentId: st.id, subjectId: B.subj['ریاضی'], title: 'آزمون ۱', type: 'quiz', score: sc, maxScore: 20, date: addDays(today, -5), recordedBy: tb.id });
  await db.insert(s.announcements).values({ schoolId: sb, title: 'اطلاعیه‌ی دبیرستان دوم', body: 'این پیام فقط برای مدرسه‌ی دوم است.' });

  console.log('✓ داده‌ی نمونه ساخته شد.');
  console.log(`  رمز همه‌ی حساب‌های نمونه: ${password}`);
  console.log('  مدیرکل سامانه: admin');
  console.log('  مدرسه‌ی اول: principal1, vice1, teacher1..3, student1..9, parent1, parent2');
  console.log('  مدرسه‌ی دوم: principal2, vice2, teacher_b, student_b1, student_b2, parent_b');
}
main().catch((e) => { console.error(e); process.exit(1); });
