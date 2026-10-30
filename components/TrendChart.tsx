'use client';
import { useEffect, useId, useRef, useState } from 'react';

type Series = { name: string; color: string; values: (number | null)[] };
const nf = (d: number) => new Intl.NumberFormat('fa-IR', { maximumFractionDigits: d });
const niceStep = (span: number) => { for (const s of [0.5, 1, 2, 2.5, 5, 10, 20]) if (span / s <= 6) return s; return 20; };

/** نمودار خطی روند ماهانه:
 *  ۱) کارت‌های بزرگِ «آخرین مقدار + تغییر نسبت به ماه قبل» برای هر خط
 *  ۲) نمودار با محور عمودیِ بزرگ‌نمایی‌شده روی بازه‌ی واقعیِ داده‌ها، نقطه‌های درشت و عدد روی همه‌ی نقطه‌ها
 *  ۳) جدول مقدارها برای ماه‌هایی که داده دارند */
function TrendChartInner({ labels, series, min, max, unit = '' }: { labels: string[]; series: Series[]; min?: number; max?: number; unit?: string }) {
  const box = useRef<HTMLDivElement>(null); const gid = useId().replace(/:/g, '');
  const [w, setW] = useState(640); const [hi, setHi] = useState<number | null>(null);
  useEffect(() => { const el = box.current; if (!el) return; const upd = () => setW(Math.max(280, Math.round(el.clientWidth))); upd(); const ro = new ResizeObserver(upd); ro.observe(el); return () => ro.disconnect(); }, []);

  const all = series.flatMap((s) => s.values).filter((v): v is number => v !== null);
  if (!labels.length || !all.length) return <div className="empty"><div>برای رسم نمودار هنوز داده‌ی کافی ثبت نشده است.</div></div>;

  // بازه‌ی عمودی: روی داده‌ها زوم می‌شود تا تفاوت‌ها دیده شود (در محدوده‌ی مجاز min..max)
  const dMin = Math.min(...all), dMax = Math.max(...all); const pad = Math.max((dMax - dMin) * 0.35, 1.2);
  let lo = Math.floor(dMin - pad), top = Math.ceil(dMax + pad);
  if (min !== undefined) lo = Math.max(lo, min); if (max !== undefined) top = Math.min(top, max);
  if (top - lo < 4) { const need = 4 - (top - lo); lo -= Math.ceil(need / 2); top += Math.floor(need / 2); if (min !== undefined && lo < min) { top += min - lo; lo = min; } if (max !== undefined && top > max) { lo -= top - max; top = max; } }
  const step = niceStep(top - lo); lo = Math.floor(lo / step) * step; top = Math.ceil(top / step) * step;
  const tickVals: number[] = []; for (let v = lo; v <= top + 1e-9; v += step) tickVals.push(v);

  const n = labels.length; const padR = 54, padL = 16, inner = 18, padT = 34;
  const colW = n > 1 ? (w - padL - padR - 2 * inner) / (n - 1) : 0; const rotate = colW < 52;
  const padB = rotate ? 70 : 46; const H = (w < 480 ? 300 : 340) + (rotate ? 14 : 0);
  const x = (i: number) => (n > 1 ? w - padR - inner - i * colW : (padL + w - padR) / 2);
  const y = (v: number) => padT + (1 - (v - lo) / (top - lo)) * (H - padT - padB);
  const base = H - padB; const f2 = (v: number) => nf(2).format(v) + unit; const fa1 = (v: number) => nf(1).format(v) + unit;
  const hasData = labels.map((_, i) => series.some((s) => s.values[i] !== null));
  const dash = (k: number) => (k === 0 ? undefined : k === 1 ? '9 6' : '2 7');
  const withData = labels.map((_, i) => i).filter((i) => hasData[i]);

  const info = series.map((s) => { const idx = s.values.map((v, i) => (v === null ? -1 : i)).filter((i) => i >= 0); const l = idx.length ? idx[idx.length - 1] : -1; const p = idx.length > 1 ? idx[idx.length - 2] : -1; return { s, l, p, delta: l >= 0 && p >= 0 ? (s.values[l] as number) - (s.values[p] as number) : null }; });
  const tipW = 200; const hx = hi !== null ? x(hi) : 0; const tipLeft = Math.min(Math.max(hx - tipW / 2, 4), Math.max(4, w - tipW - 4));

  return (
    <div className="lc">
      <div className="lc-cards">{info.map(({ s, l, p, delta }, k) => (
        <div className="lc-card" key={s.name} style={{ borderColor: s.color }}>
          <div className="lc-card-n"><svg width="30" height="10" aria-hidden="true"><line x1="2" x2="28" y1="5" y2="5" strokeWidth={k === 0 ? 4 : 3} strokeLinecap="round" strokeDasharray={dash(k)} style={{ stroke: s.color }} /></svg><span>{s.name}</span></div>
          {l >= 0 ? <><div className="lc-card-v num">{f2(s.values[l] as number)}</div><div className="lc-card-s">{labels[l]}{delta !== null && <span className={`lc-delta ${delta > 0 ? 'up' : delta < 0 ? 'down' : ''}`}>{delta > 0 ? '▲' : delta < 0 ? '▼' : '＝'} {delta !== 0 ? f2(Math.abs(delta)) : 'بدون تغییر'} <small>نسبت به {labels[p]}</small></span>}</div></> : <div className="lc-card-s">هنوز داده‌ای نیست</div>}
        </div>))}
      </div>

      <div className="lc-box" ref={box} onPointerLeave={() => setHi(null)}>
        <svg width={w} height={H} viewBox={`0 0 ${w} ${H}`} role="img" aria-label="نمودار خطی روند ماهانه">
          <defs><linearGradient id={`lg${gid}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" style={{ stopColor: series[0].color }} stopOpacity=".30" /><stop offset="100%" style={{ stopColor: series[0].color }} stopOpacity="0" /></linearGradient></defs>
          {hi !== null && <rect x={x(hi) - Math.max(colW, 44) / 2} y={padT - 12} width={Math.max(colW, 44)} height={base - padT + 12} rx="10" style={{ fill: 'var(--primary)' }} opacity=".08" />}
          {tickVals.map((v, k) => (<g key={k}><line x1={padL} x2={w - padR} y1={y(v)} y2={y(v)} strokeWidth={k === 0 ? 1.6 : 1} style={{ stroke: k === 0 ? 'var(--muted)' : 'var(--border)' }} /><text x={w - padR + 10} y={y(v) + 4.5} fontSize="13" fontWeight="600" style={{ fill: 'var(--muted)' }}>{fa1(v)}</text></g>))}
          {labels.map((l, i) => (
            <g key={l + i}>
              <line x1={x(i)} x2={x(i)} y1={padT - 6} y2={base} strokeWidth="1" strokeDasharray="2 6" style={{ stroke: 'var(--border)' }} opacity={hasData[i] ? 1 : .5} />
              <text x={x(i)} y={base + 22} fontSize="13" textAnchor={rotate ? 'end' : 'middle'} transform={rotate ? `rotate(-38 ${x(i)} ${base + 22})` : undefined} fontWeight={hasData[i] || i === hi ? 800 : 500} style={{ fill: hasData[i] || i === hi ? 'var(--text)' : 'var(--muted)' }} opacity={hasData[i] || i === hi ? 1 : .6}>{l}</text>
            </g>))}
          {series.map((s, k) => {
            const pts = s.values.map((v, i) => (v === null ? null : ([x(i), y(v)] as const)));
            const segs: (readonly [number, number])[][] = []; let cur: (readonly [number, number])[] = [];
            for (const q of pts) { if (q) cur.push(q); else { if (cur.length) segs.push(cur); cur = []; } } if (cur.length) segs.push(cur);
            return (
              <g key={s.name}>
                {k === 0 && segs.map((sg, q) => sg.length > 1 && <path key={`a${q}`} d={`M${sg[0][0]},${base} ${sg.map((c) => `L${c[0]},${c[1]}`).join(' ')} L${sg[sg.length - 1][0]},${base} Z`} fill={`url(#lg${gid})`} />)}
                {segs.map((sg, q) => sg.length > 1 && <polyline key={q} points={sg.map((c) => c.join(',')).join(' ')} fill="none" strokeWidth={k === 0 ? 4 : 3} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={dash(k)} style={{ stroke: s.color }} />)}
                {pts.map((c, i) => c && <circle key={i} cx={c[0]} cy={c[1]} r={(k === 0 ? 7 : 7 + k * 3.5) + (i === hi ? 2 : 0)} strokeWidth="3.5" style={{ fill: k === 0 ? s.color : 'none', stroke: k === 0 ? 'var(--surface)' : s.color }} />)}
                {pts.map((c, i) => c && <text key={`t${i}`} x={c[0]} y={k % 2 === 0 ? c[1] - 16 - (k > 1 ? 16 : 0) : c[1] + 26 + (k > 2 ? 16 : 0)} fontSize="14" fontWeight="800" textAnchor="middle" style={{ fill: s.color, paintOrder: 'stroke', stroke: 'var(--surface)', strokeWidth: 5, strokeLinejoin: 'round' }}>{f2(s.values[i] as number)}</text>)}
              </g>);
          })}
          {labels.map((l, i) => <rect key={`h${l}${i}`} x={x(i) - Math.max(colW, 40) / 2} y={0} width={Math.max(colW, 40)} height={H} fill="transparent" onPointerEnter={() => setHi(i)} onPointerMove={() => setHi(i)} onPointerDown={() => setHi(i)} />)}
        </svg>
        {hi !== null && hasData[hi] && (
          <div className="lc-tip" style={{ left: tipLeft, width: tipW }}>
            <b>{labels[hi]}</b>
            {series.map((s, k) => <div key={s.name} className="lc-tip-row"><i style={{ background: s.color, opacity: k === 0 ? 1 : .85 }} /><span>{s.name}</span><b className="num">{s.values[hi] === null ? '—' : f2(s.values[hi] as number)}</b></div>)}
          </div>)}
      </div>
      {withData.length < 2 && <div className="lc-note">ℹ️ فعلاً فقط داده‌ی {withData.length === 1 ? `ماه ${labels[withData[0]]}` : 'یک ماه'} ثبت شده است؛ از ماه بعد، خط روند (افت و بهبود) بین نقطه‌ها کشیده می‌شود.</div>}

      <div className="table-wrap lc-table"><table>
        <thead><tr><th>ماه</th>{series.map((s) => <th key={s.name}><span className="lc-dot" style={{ background: s.color }} />{s.name}</th>)}</tr></thead>
        <tbody>{withData.slice().reverse().map((i) => (
          <tr key={labels[i]}><td><b>{labels[i]}</b></td>{series.map((s, k) => { const v = s.values[i]; const pi = withData[withData.indexOf(i) - 1]; const pv = pi !== undefined ? s.values[pi] : null; const d = v !== null && pv !== null && pv !== undefined ? v - pv : null; return <td key={s.name} className="num">{v === null ? '—' : f2(v)}{k === 0 && d !== null && d !== 0 && <span className={`lc-delta ${d > 0 ? 'up' : 'down'}`}> {d > 0 ? '▲' : '▼'} {f2(Math.abs(d))}</span>}</td>; })}</tr>))}</tbody>
      </table></div>
    </div>
  );
}

/** ماه‌های خالیِ ابتدا و انتهای بازه نمایش داده نمی‌شوند (محور فقط از اولین تا آخرین ماهِ دارای داده)؛ ماه‌های خالیِ میانه می‌مانند تا شکاف دیده شود */
export function trimEmptyEdges(labels: string[], series: Series[]): { labels: string[]; series: Series[] } {
  const has = labels.map((_, i) => series.some((s) => s.values[i] !== null && s.values[i] !== undefined));
  const first = has.indexOf(true); const last = has.lastIndexOf(true);
  if (first < 0) return { labels, series };
  return { labels: labels.slice(first, last + 1), series: series.map((s) => ({ ...s, values: s.values.slice(first, last + 1) })) };
}

export default function TrendChart(props: { labels: string[]; series: Series[]; min?: number; max?: number; unit?: string }) {
  const t = trimEmptyEdges(props.labels, props.series);
  return <TrendChartInner {...props} labels={t.labels} series={t.series} />;
}
