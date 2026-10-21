'use client';
import { useEffect, useId, useRef, useState } from 'react';

type Series = { name: string; color: string; values: (number | null)[] };
const nf = (d: number) => new Intl.NumberFormat('fa-IR', { maximumFractionDigits: d });

/** نمودار خطی تعاملی (SVG): اولین ماه سمت راست؛ خط اول پررنگ و با سایه، خط‌های مقایسه (میانگین) خط‌چین.
 *  با لمس/نگه‌داشتن موس روی هر ماه، مقدار همه‌ی خطوط در یک کادر نشان داده می‌شود. */
export default function TrendChart({ labels, series, min, max, unit = '' }: { labels: string[]; series: Series[]; min?: number; max?: number; unit?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const gid = useId().replace(/:/g, '');
  const [w, setW] = useState(640);
  const [hi, setHi] = useState<number | null>(null);
  useEffect(() => {
    const el = box.current; if (!el) return;
    const upd = () => setW(Math.max(280, Math.round(el.clientWidth)));
    upd(); const ro = new ResizeObserver(upd); ro.observe(el); return () => ro.disconnect();
  }, []);

  const all = series.flatMap((s) => s.values).filter((v): v is number => v !== null);
  if (!labels.length || !all.length) return <div className="empty"><div>برای رسم نمودار هنوز داده‌ی کافی ثبت نشده است.</div></div>;

  const H = w < 480 ? 270 : 330; const padT = 30, padB = 42, padR = 50, padL = 14, inner = 14;
  let lo = min ?? Math.min(...all), top = max ?? Math.max(...all);
  if (min === undefined) lo = Math.floor(lo - 0.5);
  if (max === undefined) top = Math.ceil(top + 0.5);
  if (top === lo) { top += 1; lo -= 1; }
  const ticks = 4;
  const n = labels.length; const step = n > 1 ? (w - padL - padR - 2 * inner) / (n - 1) : 0;
  const x = (i: number) => (n > 1 ? w - padR - inner - i * step : (padL + w - padR) / 2);
  const y = (v: number) => padT + (1 - (v - lo) / (top - lo)) * (H - padT - padB);
  const base = H - padB;
  const f1 = (v: number) => nf(1).format(v) + unit; const f2 = (v: number) => nf(2).format(v) + unit;
  const every = step > 0 && step < 46 ? Math.ceil(46 / step) : 1;

  // خلاصه: آخرین مقدار و تغییر نسبت به ماه قبل (برای خط اول)
  const main = series[0]; const idx = main.values.map((v, i) => (v === null ? -1 : i)).filter((i) => i >= 0);
  const last = idx.length ? idx[idx.length - 1] : -1; const prev = idx.length > 1 ? idx[idx.length - 2] : -1;
  const delta = last >= 0 && prev >= 0 ? (main.values[last] as number) - (main.values[prev] as number) : null;

  const tipW = 190; const hx = hi !== null ? x(hi) : 0;
  const tipLeft = Math.min(Math.max(hx - tipW / 2, 4), Math.max(4, w - tipW - 4));
  const dash = (k: number) => (k === 0 ? undefined : k === 1 ? '8 6' : '2 6');

  return (
    <div className="lc">
      <div className="lc-legend">{series.map((s, k) => (
        <span key={s.name} className="lc-chip"><svg width="26" height="8" aria-hidden="true"><line x1="1" x2="25" y1="4" y2="4" strokeWidth={k === 0 ? 3.5 : 2.5} strokeLinecap="round" strokeDasharray={dash(k)} style={{ stroke: s.color }} /></svg>{s.name}</span>))}
      </div>
      {last >= 0 && (
        <div className="lc-sum">
          <span>آخرین مقدار «{main.name}» ({labels[last]}): <b className="num">{f2(main.values[last] as number)}</b></span>
          {delta !== null && <span className={`lc-delta ${delta > 0 ? 'up' : delta < 0 ? 'down' : ''}`}>{delta > 0 ? '▲ بهبود' : delta < 0 ? '▼ افت' : '＝ بدون تغییر'} {delta !== 0 && <b className="num">{f2(Math.abs(delta))}</b>} نسبت به {labels[prev]}</span>}
        </div>)}
      <div className="lc-box" ref={box} onPointerLeave={() => setHi(null)}>
        <svg width={w} height={H} viewBox={`0 0 ${w} ${H}`} role="img" aria-label="نمودار خطی روند ماهانه">
          <defs><linearGradient id={`lg${gid}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" style={{ stopColor: main.color }} stopOpacity=".28" /><stop offset="100%" style={{ stopColor: main.color }} stopOpacity="0" /></linearGradient></defs>
          {Array.from({ length: ticks + 1 }, (_, k) => { const v = lo + ((top - lo) * k) / ticks; return (<g key={k}><line x1={padL} x2={w - padR} y1={y(v)} y2={y(v)} style={{ stroke: 'var(--border)' }} strokeWidth={k === 0 ? 1.5 : 1} strokeDasharray={k === 0 ? undefined : '2 5'} /><text x={w - padR + 8} y={y(v) + 4} fontSize="12" style={{ fill: 'var(--muted)' }}>{f1(v)}</text></g>); })}
          {labels.map((l, i) => (i % every === 0 || i === hi) && <text key={l + i} x={x(i)} y={H - 14} fontSize="12.5" textAnchor="middle" fontWeight={i === hi ? 800 : 500} style={{ fill: i === hi ? 'var(--text)' : 'var(--muted)' }}>{l}</text>)}
          {hi !== null && <line x1={hx} x2={hx} y1={padT - 8} y2={base} strokeWidth="1.5" strokeDasharray="4 4" style={{ stroke: 'var(--muted)' }} />}
          {series.map((s, k) => {
            const pts = s.values.map((v, i) => (v === null ? null : ([x(i), y(v)] as const)));
            const segs: (readonly [number, number])[][] = []; let cur: (readonly [number, number])[] = [];
            for (const p of pts) { if (p) cur.push(p); else { if (cur.length) segs.push(cur); cur = []; } } if (cur.length) segs.push(cur);
            return (
              <g key={s.name}>
                {k === 0 && segs.map((sg, q) => sg.length > 1 && <path key={`a${q}`} d={`M${sg[0][0]},${base} ${sg.map((p) => `L${p[0]},${p[1]}`).join(' ')} L${sg[sg.length - 1][0]},${base} Z`} fill={`url(#lg${gid})`} />)}
                {segs.map((sg, q) => sg.length > 1 && <polyline key={q} points={sg.map((p) => p.join(',')).join(' ')} fill="none" strokeWidth={k === 0 ? 3.4 : 2.4} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={dash(k)} style={{ stroke: s.color }} />)}
                {pts.map((p, i) => p && <circle key={i} cx={p[0]} cy={p[1]} r={i === hi ? 7 : k === 0 ? 5 : 3.6} strokeWidth="2" style={{ fill: k === 0 || i === hi ? s.color : 'var(--surface)', stroke: i === hi || k === 0 ? 'var(--surface)' : s.color }} />)}
                {k === 0 && pts.map((p, i) => p && (n <= 8 || i === last || i === hi) && <text key={`t${i}`} x={p[0]} y={p[1] - 12} fontSize="12.5" fontWeight="800" textAnchor="middle" style={{ fill: s.color, paintOrder: 'stroke', stroke: 'var(--surface)', strokeWidth: 4 }}>{f2(s.values[i] as number)}</text>)}
              </g>);
          })}
          {labels.map((l, i) => <rect key={`h${l}${i}`} x={x(i) - Math.max(step, 40) / 2} y={0} width={Math.max(step, 40)} height={H} fill="transparent" onPointerEnter={() => setHi(i)} onPointerMove={() => setHi(i)} onPointerDown={() => setHi(i)} style={{ cursor: 'crosshair' }} />)}
        </svg>
        {hi !== null && (
          <div className="lc-tip" style={{ left: tipLeft, width: tipW }}>
            <b>{labels[hi]}</b>
            {series.map((s, k) => <div key={s.name} className="lc-tip-row"><i style={{ background: s.color, opacity: k === 0 ? 1 : .85 }} /><span>{s.name}</span><b className="num">{s.values[hi] === null ? '—' : f2(s.values[hi] as number)}</b></div>)}
          </div>)}
      </div>
      {n < 3 && <div className="muted small" style={{ marginTop: 4 }}>با ثبت نمره و یادداشت در ماه‌های بعد، روند افت و بهبود در اینجا کامل‌تر می‌شود.</div>}
    </div>
  );
}
