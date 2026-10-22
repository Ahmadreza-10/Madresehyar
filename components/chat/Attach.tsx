'use client';
import { useEffect, useMemo, useState } from 'react';
import ImageEditor from './ImageEditor';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,application/pdf,.docx,.xlsx,.pptx,.zip';
const kb = (n: number) => (n >= 1048576 ? `${(n / 1048576).toLocaleString('fa-IR', { maximumFractionDigits: 1 })} مگابایت` : `${Math.max(1, Math.round(n / 1024)).toLocaleString('fa-IR')} کیلوبایت`);

/** دکمه‌ی گیره برای انتخاب فایل */
export function AttachButton({ onPick }: { onPick: (f: File[]) => void }) {
  return (
    <label className="msgr-attach" title="پیوست (عکس، PDF، …)" aria-label="پیوست">📎
      <input type="file" multiple accept={ACCEPT} hidden onChange={(e) => { const f = [...(e.target.files ?? [])]; if (f.length) onPick(f); e.target.value = ''; }} />
    </label>
  );
}

function Thumb({ file }: { file: File }) {
  const url = useMemo(() => (file.type.startsWith('image/') ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  return url ? <img src={url} alt="" /> : <span className="fc-ico">📄</span>;
}

/** فهرست فایل‌های انتخاب‌شده با پیش‌نمایش، دکمه‌ی ویرایش تصویر و حذف */
export function FileChips({ files, onChange }: { files: File[]; onChange: (f: File[]) => void }) {
  const [editIdx, setEditIdx] = useState<number | null>(null);
  if (!files.length) return null;
  return (
    <>
      <div className="fchips">{files.map((f, i) => (
        <div className="fchip" key={`${f.name}-${i}-${f.size}`}>
          <Thumb file={f} />
          <div className="fc-t"><span>{f.name}</span><small>{kb(f.size)}</small></div>
          {f.type.startsWith('image/') && <button type="button" className="fc-b" onClick={() => setEditIdx(i)} aria-label="ویرایش تصویر" title="ویرایش تصویر">✏️</button>}
          <button type="button" className="fc-b" onClick={() => onChange(files.filter((_, j) => j !== i))} aria-label="برداشتن" title="برداشتن">✕</button>
        </div>))}</div>
      {editIdx !== null && files[editIdx] && <ImageEditor file={files[editIdx]} onCancel={() => setEditIdx(null)} onDone={(nf) => { onChange(files.map((x, j) => (j === editIdx ? nf : x))); setEditIdx(null); }} />}
    </>
  );
}
