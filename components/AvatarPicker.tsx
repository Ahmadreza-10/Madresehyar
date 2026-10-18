'use client';
import { useRef, useState, useTransition } from 'react';
import { setAvatarPreset, removeAvatarPhoto, uploadAvatar } from '@/app/actions/profile';
import { Avatar, AVATAR_COUNT, AVATAR_TOTAL, AVATAR_ALL } from './Illus';

/** گروه‌های آواتار: [برچسب، شروع، پایان) */
const GROUPS: [string, number, number][] = [['تصویرسازی', AVATAR_TOTAL, AVATAR_ALL], ['حیوانات', AVATAR_COUNT, AVATAR_TOTAL], ['آدمک‌ها', 0, AVATAR_COUNT]];

/** کوچک و برش مربعیِ عکس در مرورگر (حجم کم، حذف اطلاعات مکانی/EXIF)، سپس آپلود */
async function toSquareJpeg(file: File, side = 256): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const s = Math.min(bmp.width, bmp.height); const c = document.createElement('canvas'); c.width = c.height = side;
  const ctx = c.getContext('2d')!; ctx.drawImage(bmp, (bmp.width - s) / 2, (bmp.height - s) / 2, s, s, 0, 0, side, side);
  return await new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('تبدیل عکس ناموفق بود'))), 'image/jpeg', 0.86));
}

export default function AvatarPicker({ name, current, photoSrc }: { name: string; current: number | null; photoSrc?: string }) {
  const [pending, start] = useTransition(); const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [preview, setPreview] = useState<string | undefined>(photoSrc); const [preset, setPreset] = useState<number | null>(current); const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [grp, setGrp] = useState(current !== null ? Math.max(0, GROUPS.findIndex(([, a, b]) => current >= a && current < b)) : 0);
  const done = (r: { ok?: boolean; error?: string; message?: string } | null) => setMsg({ ok: !!r?.ok, text: r?.ok ? r.message ?? 'ذخیره شد.' : r?.error ?? 'خطا' });
  const pick = (n: number | null) => start(async () => { done(await setAvatarPreset(n)); setPreset(n); setPreview(undefined); });
  const onFile = (f: File | undefined) => {
    if (!f) return;
    start(async () => {
      try {
        const blob = await toSquareJpeg(f); const fd = new FormData(); fd.set('photo', blob, 'avatar.jpg');
        const r = await uploadAvatar(fd); done(r); if (r?.ok) setPreview(URL.createObjectURL(blob));
      } catch { setMsg({ ok: false, text: 'این فایل عکس معتبر نیست.' }); }
      if (fileRef.current) fileRef.current.value = '';
    });
  };
  return (
    <div className="avatar-picker">
      <div className="ap-current"><Avatar name={name} size={96} variant={preset ?? undefined} photoSrc={preview} className="ap-big" /><div className="stack" style={{ gap: 8 }}>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => onFile(e.target.files?.[0])} />
        <button type="button" className="btn sm" disabled={pending} onClick={() => fileRef.current?.click()}>📷 انتخاب عکس از دستگاه</button>
        {preview && <button type="button" className="btn ghost sm" disabled={pending} onClick={() => start(async () => { done(await removeAvatarPhoto()); setPreview(undefined); })}>حذف عکس</button>}
        <span className="muted small">JPEG، PNG یا WebP؛ عکس به‌صورت خودکار مربع و کوچک می‌شود.</span></div></div>
      <button type="button" className={`btn${open ? ' ghost' : ''} sm`} style={{ marginTop: 14 }} aria-expanded={open} onClick={() => setOpen((o) => !o)}>{open ? '✕ بستن انتخاب آواتار' : '🎨 انتخاب آواتار'}</button>
      {open && (<div className="ap-panel">
        <div className="seg ap-tabs" role="tablist">{GROUPS.map(([label], k) => <a key={label} role="tab" aria-selected={k === grp} className={k === grp ? 'on' : ''} onClick={() => setGrp(k)}>{label}</a>)}</div>
        <div className="ap-grid" role="radiogroup" aria-label="آواتار">
          {grp === 2 && <button type="button" className={`ap-item${preset === null && !preview ? ' on' : ''}`} disabled={pending} onClick={() => pick(null)} title="خودکار"><Avatar name={name} size={52} /><small>خودکار</small></button>}
          {Array.from({ length: GROUPS[grp][2] - GROUPS[grp][1] }, (_, k) => GROUPS[grp][1] + k).map((i) => (<button key={i} type="button" role="radio" aria-checked={preset === i && !preview} className={`ap-item${preset === i && !preview ? ' on' : ''}`} disabled={pending} onClick={() => pick(i)}><Avatar name={name} size={52} variant={i} /></button>))}
        </div>
      </div>)}
      {msg && <div className={`alert ${msg.ok ? 'ok' : 'error'}`} style={{ marginTop: 12 }}>{msg.text}</div>}
    </div>
  );
}
