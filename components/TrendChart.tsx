/** نمودار خطی ساده (SVG) برای روند ماهانه؛ ماه اول سمت راست (راست‌به‌چپ) */
type Series = { name: string; color: string; values: (number | null)[] };
export default function TrendChart({ labels, series, min, max, unit = '' }: { labels: string[]; series: Series[]; min?: number; max?: number; unit?: string }) {
  const W = 400, H = 240, padR = 38, padL = 16, padT = 22, padB = 34;
  const all = series.flatMap((s) => s.values).filter((v): v is number => v !== null);
  if (!labels.length || !all.length) return <div className="empty"><div>برای رسم نمودار هنوز داده‌ی کافی ثبت نشده است.</div></div>;
  let lo = min ?? Math.min(...all), hi = max ?? Math.max(...all);
  if (min === undefined) lo = Math.floor(lo - 0.5); if (max === undefined) hi = Math.ceil(hi + 0.5);
  if (hi === lo) { hi += 1; lo -= 1; }
  const n = labels.length; const plotW = W - padL - padR; const step = n > 1 ? plotW / (n - 1) : 0;
  const x = (i: number) => (n > 1 ? W - padR - i * step : W - padR - plotW / 2);
  const y = (v: number) => padT + (1 - (v - lo) / (hi - lo)) * (H - padT - padB);
  const ticks = 4; const fmt = (v: number) => new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 }).format(v) + unit;
  return (
    <div>
      <div className="row" style={{ gap: 14, flexWrap: 'wrap', marginBottom: 6 }}>{series.map((s) => <span key={s.name} className="small row" style={{ gap: 6 }}><i style={{ width: 18, height: 4, borderRadius: 4, background: s.color, display: 'inline-block' }} />{s.name}</span>)}</div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', maxHeight: 300 }} role="img" aria-label="نمودار روند ماهانه">
        {Array.from({ length: ticks + 1 }, (_, k) => { const v = lo + ((hi - lo) * k) / ticks; return (<g key={k}><line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} style={{ stroke: 'var(--border)' }} strokeDasharray="3 4" /><text x={W - padR + 6} y={y(v) + 4} fontSize="13" style={{ fill: 'var(--muted)' }}>{fmt(v)}</text></g>); })}
        {labels.map((l, i) => <text key={l} x={x(i)} y={H - 10} fontSize="13" textAnchor="middle" style={{ fill: 'var(--muted)' }}>{l}</text>)}
        {series.map((s) => {
          const pts = s.values.map((v, i) => (v === null ? null : [x(i), y(v)] as const));
          const segs: (readonly [number, number])[][] = []; let cur: (readonly [number, number])[] = [];
          for (const p of pts) { if (p) cur.push(p); else { if (cur.length) segs.push(cur); cur = []; } } if (cur.length) segs.push(cur);
          return (<g key={s.name}>{segs.map((sg, k) => sg.length > 1 && <polyline key={k} className="trend-line" pathLength="1" points={sg.map((p) => p.join(',')).join(' ')} fill="none" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" style={{ stroke: s.color }} />)}
            {pts.map((p, i) => p && <circle key={i} className="trend-dot" cx={p[0]} cy={p[1]} r="5" style={{ fill: s.color, stroke: 'var(--surface)' }} strokeWidth="1.5"><title>{`${s.name} • ${labels[i]}: ${fmt(s.values[i] as number)}`}</title></circle>)}
            {n <= 4 && pts.map((p, i) => p && <text key={`t${i}`} x={p[0]} y={p[1] - 10} fontSize="12" fontWeight="700" textAnchor="middle" style={{ fill: s.color }}>{fmt(s.values[i] as number)}</text>)}</g>);
        })}
      </svg>
      {n < 3 && <div className="muted small" style={{ marginTop: 4 }}>با ثبت نمره و یادداشت در ماه‌های بعد، روند افت و بهبود در اینجا کامل‌تر می‌شود.</div>}
    </div>
  );
}
