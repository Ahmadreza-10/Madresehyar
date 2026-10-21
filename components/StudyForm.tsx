'use client';
import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import { submitStudyReport } from '@/app/actions/study';
import { testPercent } from '@/lib/study';
import { fa } from '@/lib/format';

type Opt = { id: string; name: string };
export type StudyInitial = { id: string; studentId: string; startTime: string; endTime: string; notes: string; items: { subjectId: string; studyMin: number; topic: string; methods: string[]; pages: number; mastery: number; goal: string; goalAchieved: boolean | null; tests: { source: string; totalCount: number; correctCount: number; wrongCount: number; blankCount: number; durationMin: number | null; note: string }[] }[] };
type Book = { subjectId: string; studyMin: string };
type TestRow = { subjectId: string; source: string; totalCount: string; correctCount: string; wrongCount: string; blankCount: string; durationMin: string; note: string };
type Extra = { topic: string; methods: string[]; pages: number; mastery: number; goal: string; goalAchieved: boolean | null };
const emptyTest = (subjectId = ''): TestRow => ({ subjectId, source: '', totalCount: '', correctCount: '', wrongCount: '', blankCount: '', durationMin: '', note: '' });
const QUICK = [15, 30, 45, 60, 90];

function tehranMinutes() {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tehran', hourCycle: 'h23', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date());
  const g = (t: string) => +(p.find((x) => x.type === t)?.value ?? 0);
  return (g('hour') % 24) * 60 + g('minute');
}

/** فرم ساده‌ی گزارش مطالعه: ۱) کتاب‌هایی که خوانده شد + دقیقه‌ی هر کدام ۲) اگر تست زده شد، بخش تست ۳) ثبت. برای ولی و برای خودِ دانش‌آموز. */
export default function StudyForm({ subjects, students, windowStart, windowEnd, startLabel, endLabel, initial, self = false }: {
  subjects: Opt[]; students: Opt[]; windowStart: number; windowEnd: number; startLabel: string; endLabel: string; initial?: StudyInitial; self?: boolean;
}) {
  const [state, action, pending] = useActionState(submitStudyReport, null);
  const [, startTransition] = useTransition();
  const [books, setBooks] = useState<Book[]>(initial ? initial.items.filter((i) => i.studyMin > 0).map((i) => ({ subjectId: i.subjectId, studyMin: String(i.studyMin) })) : []);
  const [tests, setTests] = useState<TestRow[]>(initial ? initial.items.flatMap((i) => i.tests.map((t) => ({ subjectId: i.subjectId, source: t.source === 'تست' ? '' : t.source, totalCount: String(t.totalCount), correctCount: String(t.correctCount), wrongCount: String(t.wrongCount), blankCount: String(t.blankCount), durationMin: t.durationMin ? String(t.durationMin) : '', note: t.note }))) : []);
  // در ویرایش، فیلدهای قدیمی (مبحث، شیوه و …) پنهان نگه داشته می‌شوند تا از بین نروند
  const extras = useRef<Record<string, Extra>>(Object.fromEntries((initial?.items ?? []).map((i) => [i.subjectId, { topic: i.topic, methods: i.methods, pages: i.pages, mastery: i.mastery, goal: i.goal, goalAchieved: i.goalAchieved }])));
  const [nowMin, setNowMin] = useState<number | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => { setNowMin(tehranMinutes()); const t = setInterval(() => setNowMin(tehranMinutes()), 20_000); return () => clearInterval(t); }, []);
  const open = nowMin === null || (nowMin >= windowStart && nowMin < windowEnd);
  useEffect(() => { if (state?.ok && initial) { window.location.assign('/study?tab=list'); return; } if (state?.ok) { formRef.current?.reset(); setBooks([]); setTests([]); } }, [state, initial]);

  const picked = new Set(books.map((b) => b.subjectId));
  const nameOf = (id: string) => subjects.find((s) => s.id === id)?.name ?? '';
  const toggleBook = (id: string) => setBooks((p) => (p.some((b) => b.subjectId === id) ? p.filter((b) => b.subjectId !== id) : [...p, { subjectId: id, studyMin: '' }]));
  const setMin = (id: string, v: string) => setBooks((p) => p.map((b) => (b.subjectId === id ? { ...b, studyMin: v } : b)));
  const setT = (i: number, k: keyof TestRow, v: string) => setTests((p) => p.map((t, x) => (x === i ? { ...t, [k]: v } : t)));
  const rest = (t: TestRow) => { const r = +t.totalCount - +t.correctCount - +t.wrongCount; return t.totalCount && Number.isFinite(r) ? r : null; };
  const pct = (t: TestRow) => { const tot = +t.totalCount; return tot > 0 ? testPercent(+t.correctCount || 0, +t.wrongCount || 0, tot) : null; };

  const total = books.reduce((a, b) => a + (+b.studyMin || 0), 0) + tests.reduce((a, t) => a + (+t.durationMin || 0), 0);
  const ready = total > 0 && books.every((b) => +b.studyMin > 0 || tests.some((t) => t.subjectId === b.subjectId)) && tests.every((t) => t.subjectId && +t.totalCount > 0 && +t.durationMin > 0);

  function buildPayload(fd: FormData) {
    const ids = [...new Set([...books.map((b) => b.subjectId), ...tests.map((t) => t.subjectId)])];
    return JSON.stringify({
      studentId: fd.get('studentId') || initial?.studentId || undefined, notes: fd.get('notes') || undefined,
      items: ids.map((id) => {
        const ex = extras.current[id];
        return {
          subjectId: id, studyMin: books.find((b) => b.subjectId === id)?.studyMin || '0', topic: ex?.topic ?? '', methods: ex?.methods ?? [], pages: ex?.pages ?? 0, mastery: ex?.mastery ?? 3,
          goal: ex?.goal || undefined, goalAchieved: ex?.goalAchieved ?? undefined,
          tests: tests.filter((t) => t.subjectId === id).map((t) => ({ source: t.source, totalCount: t.totalCount, correctCount: t.correctCount || '0', wrongCount: t.wrongCount || '0', blankCount: t.blankCount || String(rest(t) ?? 0), durationMin: t.durationMin, note: t.note || undefined })),
        };
      }),
    });
  }

  return (
    <form ref={formRef} className="form" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); fd.set('payload', buildPayload(fd)); if (initial) fd.set('editId', initial.id); startTransition(() => { action(fd); }); }}>
      <div className={`window-banner ${open ? 'open' : 'closed'}`}>
        <span style={{ fontSize: '1.4rem' }}>{open ? '✅' : '⏰'}</span>
        <div><b>{open ? 'ثبت گزارش اکنون باز است' : 'ثبت گزارش اکنون بسته است'}</b><div className="small">ثبت گزارش فقط از ساعت {fa(startLabel)} تا {endLabel === '24:00' ? 'نیمه‌شب (۲۴:۰۰)' : fa(endLabel)} ممکن است.</div></div>
      </div>
      <input type="hidden" name="payload" />
      <fieldset disabled={!open || pending} style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 18 }}>
        {!self && <div className="field"><label>گزارش مطالعه‌ی کدام فرزند؟</label><select name="studentId" required defaultValue={initial?.studentId ?? (students.length === 1 ? students[0].id : '')} disabled={!!initial}>{students.length !== 1 && <option value="" disabled>انتخاب کنید…</option>}{students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>}

        <section className="sf-step">
          <h4>📚 {self ? 'کتاب‌هایی که امروز خواندی' : 'کتاب‌هایی که امروز خوانده'}</h4>
          <p className="hint-t">روی هر کتاب بزنید تا انتخاب شود؛ بعد زمان مطالعه‌اش را بنویسید. کتاب‌هایی که نخوانده را انتخاب نکنید.</p>
          {subjects.length ? <div className="book-grid">{subjects.map((s) => (
            <button type="button" key={s.id} className={`book${picked.has(s.id) ? ' on' : ''}`} aria-pressed={picked.has(s.id)} onClick={() => toggleBook(s.id)}>{picked.has(s.id) ? '✓ ' : ''}{s.name}</button>))}</div>
            : <p className="muted small">هنوز درسی در مدرسه ثبت نشده است. از مدیر مدرسه بخواهید درس‌ها را وارد کند.</p>}
          {books.length > 0 && <div className="book-rows">{books.map((b) => (
            <div className="book-row" key={b.subjectId}>
              <b>{nameOf(b.subjectId)}</b>
              <div className="field"><label>چند دقیقه؟</label><input type="number" min={0} max={720} inputMode="numeric" value={b.studyMin} onChange={(e) => setMin(b.subjectId, e.target.value)} placeholder="مثلاً ۳۰" />
                <div className="quick-min">{QUICK.map((m) => <button type="button" key={m} onClick={() => setMin(b.subjectId, String(m))}>{fa(m)}</button>)}</div></div>
            </div>))}</div>}
        </section>

        <section className="sf-step">
          <div className="row between"><h4>📝 تست</h4>{subjects.length > 0 && <button type="button" className="btn ghost sm" onClick={() => setTests((p) => [...p, emptyTest(books.length === 1 ? books[0].subjectId : '')])}>+ {tests.length ? 'یک تست دیگر' : 'تست زدم'}</button>}</div>
          {tests.length === 0 ? <p className="hint-t">اگر تست زده‌اید، دکمه‌ی «تست زدم» را بزنید. اگر نه، این بخش را خالی بگذارید.</p> : tests.map((t, i) => { const p = pct(t); const r = rest(t); return (
            <div className="test-row" key={i}>
              <div className="row between"><b className="small">تست {fa(i + 1)}</b><button type="button" className="btn danger sm" onClick={() => setTests((x) => x.filter((_, j) => j !== i))}>حذف</button></div>
              <div className="field"><label>تست کدام کتاب؟</label><select value={t.subjectId} onChange={(e) => setT(i, 'subjectId', e.target.value)} required><option value="" disabled>انتخاب کنید…</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
              <div className="inline-fields">
                <div className="field"><label>تعداد کل تست</label><input type="number" min={1} inputMode="numeric" value={t.totalCount} onChange={(e) => setT(i, 'totalCount', e.target.value)} required /></div>
                <div className="field"><label>صحیح</label><input type="number" min={0} inputMode="numeric" value={t.correctCount} onChange={(e) => setT(i, 'correctCount', e.target.value)} placeholder="0" /></div>
                <div className="field"><label>غلط</label><input type="number" min={0} inputMode="numeric" value={t.wrongCount} onChange={(e) => setT(i, 'wrongCount', e.target.value)} placeholder="0" /></div>
                <div className="field"><label>زمان (دقیقه)</label><input type="number" min={1} inputMode="numeric" value={t.durationMin} onChange={(e) => setT(i, 'durationMin', e.target.value)} required /></div>
              </div>
              <div className="small muted">{r !== null && r >= 0 ? <>نزده: <b className="num">{fa(r)}</b> (خودکار حساب می‌شود)</> : r !== null ? <span style={{ color: 'var(--danger)' }}>مجموع صحیح و غلط از تعداد کل بیشتر است.</span> : null}{p !== null && r !== null && r >= 0 && <> • درصد با نمره‌ی منفی: <b className="num">{fa(p)}٪</b></>}</div>
              <input value={t.source} onChange={(e) => setT(i, 'source', e.target.value)} placeholder="نام کتاب تست یا آزمون (اختیاری)" maxLength={100} />
            </div>); })}
        </section>

        <div className="field"><label>توضیحات <span className="muted">(اختیاری)</span></label><textarea name="notes" defaultValue={initial?.notes ?? ''} maxLength={1000} placeholder="اگر چیزی هست که باید بدانیم بنویسید…" /></div>
        <div className="sf-total">مجموع امروز: <b className="num">{fa(total)} دقیقه</b></div>
      </fieldset>
      {state?.error && <div className="alert error" role="alert">{state.error}</div>}
      {state?.ok && <div className="alert ok" role="status">{state.message}</div>}
      <div><button className="btn" disabled={!open || pending || !ready}>{pending ? 'در حال ثبت…' : initial ? 'ذخیره‌ی ویرایش' : 'ثبت گزارش مطالعه'}</button>{initial && <a className="btn ghost" href="/study?tab=list" style={{ marginInlineStart: 8 }}>انصراف</a>}</div>
      {!ready && total === 0 && open && <p className="hint-t">برای ثبت، حداقل یک کتاب را انتخاب کنید و زمانش را بنویسید (یا یک تست وارد کنید).</p>}
    </form>
  );
}
