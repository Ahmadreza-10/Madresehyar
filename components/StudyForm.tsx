'use client';
import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import { submitStudyReport } from '@/app/actions/study';
import { STUDY_METHODS } from '@/db/schema';
import { methodLabels, testPercent } from '@/lib/study';
import { fa } from '@/lib/format';

type Opt = { id: string; name: string };
export type StudyInitial = { id: string; studentId: string; startTime: string; endTime: string; notes: string; items: { subjectId: string; studyMin: number; topic: string; methods: string[]; pages: number; mastery: number; goal: string; goalAchieved: boolean | null; tests: { source: string; totalCount: number; correctCount: number; wrongCount: number; blankCount: number; durationMin: number | null; note: string }[] }[] };
type TestRow = { source: string; totalCount: string; correctCount: string; wrongCount: string; blankCount: string; durationMin: string; note: string };
type Block = { subjectId: string; studyMin: string; topic: string; methods: string[]; pages: string; mastery: number; goal: string; achieved: '' | 'yes' | 'no'; tests: TestRow[] };
const emptyTest = (): TestRow => ({ source: '', totalCount: '', correctCount: '', wrongCount: '', blankCount: '', durationMin: '', note: '' });
const emptyBlock = (): Block => ({ subjectId: '', studyMin: '', topic: '', methods: [], pages: '', mastery: 3, goal: '', achieved: '', tests: [] });
const toMin = (v: string) => { const m = /^(\d{1,2}):(\d{2})$/.exec(v); return m ? +m[1] * 60 + +m[2] : null; };
const QUICK = [15, 30, 45, 60, 90, 120];

function tehranMinutes() {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tehran', hourCycle: 'h23', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date());
  const g = (t: string) => +(p.find((x) => x.type === t)?.value ?? 0);
  return (g('hour') % 24) * 60 + g('minute');
}

/** فرم ثبت گزارش مطالعه؛ فقط برای ولی. فرزندان (students) در منو می‌آیند و ثبت فقط برای امروز و داخل بازه‌ی مدرسه است. */
export default function StudyForm({ subjects, students, windowStart, windowEnd, startLabel, endLabel, initial }: {
  subjects: Opt[]; students: Opt[]; windowStart: number; windowEnd: number; startLabel: string; endLabel: string; initial?: StudyInitial;
}) {
  const [state, action, pending] = useActionState(submitStudyReport, null);
  const [, startTransition] = useTransition();
  const [blocks, setBlocks] = useState<Block[]>(initial ? initial.items.map((i) => ({ subjectId: i.subjectId, studyMin: String(i.studyMin || ''), topic: i.topic, methods: i.methods, pages: i.pages ? String(i.pages) : '', mastery: i.mastery, goal: i.goal, achieved: (i.goalAchieved === null ? '' : i.goalAchieved ? 'yes' : 'no') as Block['achieved'], tests: i.tests.map((t) => ({ source: t.source, totalCount: String(t.totalCount), correctCount: String(t.correctCount), wrongCount: String(t.wrongCount), blankCount: String(t.blankCount), durationMin: t.durationMin ? String(t.durationMin) : '', note: t.note })) })) : [emptyBlock()]);
  const [startT, setStartT] = useState(initial?.startTime ?? ''); const [endT, setEndT] = useState(initial?.endTime ?? '');
  const [nowMin, setNowMin] = useState<number | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // وضعیت باز/بسته بودن بازه برای راهنمایی کاربر؛ تصمیم نهایی همیشه با سرور است
  useEffect(() => { setNowMin(tehranMinutes()); const t = setInterval(() => setNowMin(tehranMinutes()), 20_000); return () => clearInterval(t); }, []);
  const open = nowMin === null || (nowMin >= windowStart && nowMin < windowEnd);

  useEffect(() => { if (state?.ok && initial) { window.location.assign('/study?tab=list'); return; } if (state?.ok) { formRef.current?.reset(); setBlocks([emptyBlock()]); setStartT(''); setEndT(''); } }, [state]);

  const setB = (i: number, patch: Partial<Block>) => setBlocks((p) => p.map((b, j) => (j === i ? { ...b, ...patch } : b)));
  const toggle = (i: number, m: string) => setBlocks((p) => p.map((b, j) => (j === i ? { ...b, methods: b.methods.includes(m) ? b.methods.filter((x) => x !== m) : [...b.methods, m] } : b)));
  const setT = (i: number, ti: number, k: keyof TestRow, v: string) => setBlocks((p) => p.map((b, j) => (j === i ? { ...b, tests: b.tests.map((t, x) => (x === ti ? { ...t, [k]: v } : t)) } : b)));
  const pct = (t: TestRow) => { const tot = +t.totalCount, c = +t.correctCount, w = +t.wrongCount; return tot > 0 ? testPercent(c, w, tot) : null; };
  const blankHint = (t: TestRow) => { const rest = +t.totalCount - +t.correctCount - +t.wrongCount; return Number.isFinite(rest) && t.totalCount ? rest : null; };
  const used = new Set(blocks.map((b) => b.subjectId).filter(Boolean));

  const testSum = (b: Block) => b.tests.reduce((a, t) => a + (+t.durationMin || 0), 0);
  const total = blocks.reduce((a, b) => a + (+b.studyMin || 0) + testSum(b), 0);
  const sMin = toMin(startT), eMin = toMin(endT); const span = sMin !== null && eMin !== null && eMin > sMin ? eMin - sMin : null;
  const over = span !== null && total > span;

  function buildPayload(fd: FormData) {
    return JSON.stringify({
      studentId: fd.get('studentId') || initial?.studentId || undefined, startTime: startT, endTime: endT, notes: fd.get('notes') || undefined,
      items: blocks.map((b) => ({
        subjectId: b.subjectId, studyMin: b.studyMin || '0', topic: b.topic, methods: b.methods, pages: b.pages || '0', mastery: b.mastery,
        goal: b.goal || undefined, goalAchieved: b.achieved === '' ? undefined : b.achieved === 'yes',
        tests: b.tests.map((t) => ({ source: t.source, totalCount: t.totalCount, correctCount: t.correctCount || '0', wrongCount: t.wrongCount || '0', blankCount: t.blankCount || (blankHint(t) ?? '0'), durationMin: t.durationMin, note: t.note || undefined })),
      })),
    });
  }

  return (
    <form ref={formRef} className="form" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); fd.set('payload', buildPayload(fd)); if (initial) fd.set('editId', initial.id); startTransition(() => { action(fd); }); }}>
      {(
        <div className={`window-banner ${open ? 'open' : 'closed'}`}>
          <span style={{ fontSize: '1.4rem' }}>{open ? '✅' : '⏰'}</span>
          <div><b>{open ? 'ثبت گزارش اکنون باز است' : 'ثبت گزارش اکنون بسته است'}</b><div className="small">ثبت گزارش مطالعه فقط از ساعت {fa(startLabel)} تا {endLabel === '24:00' ? 'نیمه‌شب (۲۴:۰۰)' : fa(endLabel)} به وقت تهران ممکن است.</div></div>
        </div>
      )}
      <input type="hidden" name="payload" />
      <fieldset disabled={!open || pending} style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 14 }}>
        <div className="field"><label>گزارش مطالعه‌ی کدام فرزند؟</label><select name="studentId" required defaultValue={initial?.studentId ?? (students.length === 1 ? students[0].id : '')} disabled={!!initial}>{students.length !== 1 && <option value="" disabled>انتخاب کنید…</option>}{students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
        <div className="inline-fields">
          <div className="field"><label>ساعت شروع</label><input type="time" value={startT} onChange={(e) => setStartT(e.target.value)} required /></div>
          <div className="field"><label>ساعت پایان</label><input type="time" value={endT} onChange={(e) => setEndT(e.target.value)} required /></div>
        </div>
        <div className="muted small" style={{ marginTop: -6 }}>بازه‌ی کلِ مطالعه‌ی امروز (مثلاً ۱۷:۰۰ تا ۲۰:۰۰). سپس برای هر درس، زمان مطالعه و زمان تست را جدا بنویسید؛ استراحت‌ها لازم نیست حساب شوند.</div>

        {blocks.map((b, i) => (
          <div className="sub-block" key={i}>
            <div className="row between"><b>درس {fa(i + 1)}</b>{blocks.length > 1 && <button type="button" className="btn danger sm" onClick={() => setBlocks((p) => p.filter((_, j) => j !== i))}>حذف این درس</button>}</div>
            <div className="field"><label>درس</label><select value={b.subjectId} onChange={(e) => setB(i, { subjectId: e.target.value })} required><option value="" disabled>انتخاب کنید…</option>{subjects.filter((s) => s.id === b.subjectId || !used.has(s.id)).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <div className="minutes one">
              <div className="field"><label>📖 زمان مطالعه (دقیقه)</label><input type="number" min={0} max={720} inputMode="numeric" value={b.studyMin} onChange={(e) => setB(i, { studyMin: e.target.value })} placeholder="0" />
                <div className="quick-min">{QUICK.map((m) => <button type="button" key={m} onClick={() => setB(i, { studyMin: String(m) })}>{fa(m)}</button>)}</div></div>
              {testSum(b) > 0 && <div className="small muted">📝 زمان تست این درس: <b className="num">{fa(testSum(b))} دقیقه</b> (جمع زمان دسته‌های تست پایین)</div>}
            </div>
            <div className="field"><label>مبحث مطالعه‌شده</label><input value={b.topic} onChange={(e) => setB(i, { topic: e.target.value })} placeholder="مثلاً: معادلات درجه دوم، فصل ۳" maxLength={200} required /></div>
            <div style={{ display: 'grid', gap: 12 }}>
                <div className="field"><span className="label-t">شیوه‌ی مطالعه <span className="muted">(یک یا چند مورد)</span></span>
                  <div className="chips">{STUDY_METHODS.map((m) => (<label className="chip" key={m}><input type="checkbox" checked={b.methods.includes(m)} onChange={() => toggle(i, m)} /><span>{methodLabels[m]}</span></label>))}</div></div>
              </div>

            <div className="field">
              <div className="row between"><span className="label-t">جزئیات تست‌های این درس <span className="muted">(اگر تست زده)</span></span>
                <button type="button" className="btn ghost sm" onClick={() => setB(i, { tests: [...b.tests, emptyTest()] })}>+ دسته تست</button></div>
              {b.tests.map((t, ti) => { const p = pct(t); const rest = blankHint(t); return (
                <div className="test-row" key={ti}>
                  <div className="row between"><b className="small">دسته تست {fa(ti + 1)}</b><button type="button" className="btn danger sm" onClick={() => setB(i, { tests: b.tests.filter((_, x) => x !== ti) })}>حذف</button></div>
                  <div className="field"><label>منبع / نام آزمون</label><input value={t.source} onChange={(e) => setT(i, ti, 'source', e.target.value)} placeholder="مثلاً: کتاب آبی ریاضی، آزمون قلمچی" maxLength={100} /></div>
                  <div className="inline-fields">
                    <div className="field"><label>تعداد کل</label><input type="number" min={1} value={t.totalCount} onChange={(e) => setT(i, ti, 'totalCount', e.target.value)} /></div>
                    <div className="field"><label>صحیح</label><input type="number" min={0} value={t.correctCount} onChange={(e) => setT(i, ti, 'correctCount', e.target.value)} /></div>
                    <div className="field"><label>غلط</label><input type="number" min={0} value={t.wrongCount} onChange={(e) => setT(i, ti, 'wrongCount', e.target.value)} /></div>
                    <div className="field"><label>نزده</label><input type="number" min={0} value={t.blankCount} placeholder={rest !== null && rest >= 0 ? String(rest) : ''} onChange={(e) => setT(i, ti, 'blankCount', e.target.value)} /></div>
                    <div className="field"><label>زمان (دقیقه)</label><input type="number" min={1} required value={t.durationMin} onChange={(e) => setT(i, ti, 'durationMin', e.target.value)} /></div>
                  </div>
                  <input value={t.note} onChange={(e) => setT(i, ti, 'note', e.target.value)} placeholder="توضیح (اختیاری)" maxLength={300} />
                  {p !== null && <div className="small">درصد با نمره‌ی منفی: <b className="num">{fa(p)}٪</b> <span className="muted">(هر غلط، یک‌سوم نمره‌ی یک پاسخ صحیح را کم می‌کند)</span></div>}
                </div>); })}
            </div>
          </div>
        ))}
        {blocks.length < 10 && blocks.length < subjects.length && <div><button type="button" className="btn ghost" onClick={() => setBlocks((p) => [...p, emptyBlock()])}>+ افزودن درس دیگر</button></div>}

        <div className={`time-meter${over ? ' over' : ''}`}>
          <div className="row between small"><span>مجموع زمان درس‌ها: <b className="num">{fa(total)} دقیقه</b></span>{span !== null && <span className={over ? '' : 'muted'} style={over ? { color: 'var(--danger)' } : undefined}>{over ? `از بازه‌ی انتخابی (${fa(span)} دقیقه) بیشتر است` : `بازه: ${fa(span)} دقیقه`}</span>}</div>
          {span !== null && <div className="bar"><span style={{ width: `${Math.min(100, (total / span) * 100)}%` }} /></div>}
        </div>
        <div className="field"><label>توضیحات <span className="muted">(اختیاری)</span></label><textarea name="notes" defaultValue={initial?.notes ?? ''} maxLength={1000} placeholder="چه چیزی سخت بود؟ چه چیزی را باید دوباره مرور کند؟" /></div>
      </fieldset>
      {state?.error && <div className="alert error" role="alert">{state.error}</div>}
      {state?.ok && <div className="alert ok" role="status">{state.message}</div>}
      <div><button className="btn" disabled={!open || pending || over}>{pending ? 'در حال ثبت…' : initial ? 'ذخیره‌ی ویرایش' : 'ثبت گزارش مطالعه'}</button>{initial && <a className="btn ghost" href="/study?tab=list" style={{ marginInlineStart: 8 }}>انصراف</a>}</div>
    </form>
  );
}
