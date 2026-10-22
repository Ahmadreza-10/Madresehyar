'use client';
import { useEffect, useRef, useState, type PointerEvent as RPE } from 'react';
import { createPortal } from 'react-dom';

const COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#ffffff', '#111827'];
type Sel = { x0: number; y0: number; x1: number; y1: number };

/** ویرایشگر ساده‌ی تصویر پیش از ارسال: نقاشی با قلم، برش، چرخاندن و بازگشت */
export default function ImageEditor({ file, onCancel, onDone }: { file: File; onCancel: () => void; onDone: (f: File) => void }) {
  const cv = useRef<HTMLCanvasElement>(null); const wrap = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<'draw' | 'crop'>('draw'); const [color, setColor] = useState(COLORS[0]); const [size, setSize] = useState(6);
  const hist = useRef<ImageData[]>([]); const [canUndo, setCanUndo] = useState(false); const [sel, setSel] = useState<Sel | null>(null);
  const [ready, setReady] = useState(false); const [failed, setFailed] = useState(false);
  const last = useRef<{ x: number; y: number } | null>(null); const dragging = useRef(false);

  useEffect(() => {
    const url = URL.createObjectURL(file); const img = new Image();
    img.onload = () => { const c = cv.current; if (!c) return; const s = Math.min(1, 1600 / Math.max(img.width, img.height)); c.width = Math.max(1, Math.round(img.width * s)); c.height = Math.max(1, Math.round(img.height * s)); c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height); setReady(true); };
    img.onerror = () => setFailed(true); img.src = url; return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); }, [onCancel]);

  const ctx = () => cv.current!.getContext('2d')!;
  const snap = () => { const c = cv.current!; hist.current.push(ctx().getImageData(0, 0, c.width, c.height)); if (hist.current.length > 12) hist.current.shift(); setCanUndo(true); };
  const undo = () => { const d = hist.current.pop(); if (!d) return; const c = cv.current!; c.width = d.width; c.height = d.height; ctx().putImageData(d, 0, 0); setCanUndo(hist.current.length > 0); setSel(null); };
  const pt = (e: RPE) => { const c = cv.current!; const r = c.getBoundingClientRect(); const cx = Math.min(Math.max(e.clientX - r.left, 0), r.width); const cy = Math.min(Math.max(e.clientY - r.top, 0), r.height); return { x: cx * (c.width / r.width), y: cy * (c.height / r.height), cx, cy, k: c.width / r.width }; };

  const down = (e: RPE) => {
    if (!ready) return; (e.target as Element).setPointerCapture(e.pointerId); const p = pt(e); dragging.current = true;
    if (tool === 'draw') { snap(); last.current = { x: p.x, y: p.y }; const g = ctx(); g.fillStyle = color; g.beginPath(); g.arc(p.x, p.y, (size * p.k) / 2, 0, Math.PI * 2); g.fill(); }
    else setSel({ x0: p.cx, y0: p.cy, x1: p.cx, y1: p.cy });
  };
  const move = (e: RPE) => {
    if (!dragging.current) return; const p = pt(e);
    if (tool === 'draw' && last.current) { const g = ctx(); g.strokeStyle = color; g.lineWidth = size * p.k; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(last.current.x, last.current.y); g.lineTo(p.x, p.y); g.stroke(); last.current = { x: p.x, y: p.y }; }
    else if (tool === 'crop') setSel((s) => (s ? { ...s, x1: p.cx, y1: p.cy } : s));
  };
  const up = () => { dragging.current = false; last.current = null; };

  const applyCrop = () => {
    if (!sel) return; const c = cv.current!; const r = c.getBoundingClientRect(); const k = c.width / r.width;
    const x = Math.round(Math.min(sel.x0, sel.x1) * k), y = Math.round(Math.min(sel.y0, sel.y1) * k), w = Math.round(Math.abs(sel.x1 - sel.x0) * k), h = Math.round(Math.abs(sel.y1 - sel.y0) * k);
    if (w < 12 || h < 12) { setSel(null); return; }
    snap(); const d = ctx().getImageData(x, y, w, h); c.width = w; c.height = h; ctx().putImageData(d, 0, 0); setSel(null);
  };
  const rotate = () => {
    const c = cv.current!; snap(); const t = document.createElement('canvas'); t.width = c.height; t.height = c.width; const tg = t.getContext('2d')!; tg.translate(t.width, 0); tg.rotate(Math.PI / 2); tg.drawImage(c, 0, 0);
    c.width = t.width; c.height = t.height; ctx().drawImage(t, 0, 0); setSel(null);
  };
  const done = () => {
    const type = /png|gif|webp/.test(file.type) ? 'image/png' : 'image/jpeg';
    cv.current!.toBlob((b) => { if (!b) return; const base = file.name.replace(/\.[^.]+$/, '') || 'image'; onDone(new File([b], `${base}.${type === 'image/png' ? 'png' : 'jpg'}`, { type })); }, type, 0.92);
  };
  const box = sel ? { left: Math.min(sel.x0, sel.x1), top: Math.min(sel.y0, sel.y1), width: Math.abs(sel.x1 - sel.x0), height: Math.abs(sel.y1 - sel.y0) } : null;

  return createPortal(
    <div className="cm-back ie-back" onClick={onCancel}>
      <div className="cm-box ie-box" role="dialog" aria-label="ویرایش تصویر" onClick={(e) => e.stopPropagation()}>
        <div className="ie-bar">
          <button type="button" className={`ie-t${tool === 'draw' ? ' on' : ''}`} onClick={() => { setTool('draw'); setSel(null); }}>✏️ قلم</button>
          <button type="button" className={`ie-t${tool === 'crop' ? ' on' : ''}`} onClick={() => setTool('crop')}>✂️ برش</button>
          <button type="button" className="ie-t" onClick={rotate}>↻ چرخش</button>
          <button type="button" className="ie-t" onClick={undo} disabled={!canUndo}>↩ برگرداندن</button>
        </div>
        {tool === 'draw' && <div className="ie-bar">{COLORS.map((c) => <button type="button" key={c} className={`ie-dot${color === c ? ' on' : ''}`} style={{ background: c }} onClick={() => setColor(c)} aria-label="رنگ قلم" />)}<input type="range" min={2} max={28} value={size} onChange={(e) => setSize(+e.target.value)} aria-label="ضخامت قلم" style={{ width: 120, minHeight: 0 }} /></div>}
        {tool === 'crop' && <div className="ie-bar"><span className="muted small">روی عکس بکشید تا ناحیه‌ی مورد نظر مشخص شود.</span><button type="button" className="btn sm" onClick={applyCrop} disabled={!box || box.width < 8}>اعمال برش</button></div>}
        <div className="ie-stage"><div className="ie-wrap" ref={wrap}>
          <canvas ref={cv} className="ie-canvas" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
          {box && <div className="ie-sel" style={box} />}
        </div>{failed && <div className="alert error">این تصویر باز نشد.</div>}</div>
        <div className="ie-bar" style={{ justifyContent: 'flex-end' }}><button type="button" className="btn ghost" onClick={onCancel}>انصراف</button><button type="button" className="btn" onClick={done} disabled={!ready}>تأیید و استفاده</button></div>
      </div>
    </div>, document.body);
}
