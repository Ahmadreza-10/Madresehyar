'use client';
import { useActionState, useEffect, useRef, useState, useTransition, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { ActionState } from '@/lib/action';
import type { AttItem } from '@/components/AttachmentList';
import { useChat } from './ChatProvider';
import { AttachButton, FileChips } from './Attach';
import ImageEditor from './ImageEditor';

export type EditInfo = { action: (prev: ActionState, fd: FormData) => Promise<ActionState>; body: string; files: AttItem[] };

/** منوی ⋯ بالای هر پیام: پاسخ، هدایت، هدایت بدون نام، ویرایش و (از طرف صفحه) حذف/سنجاق */
export default function BubbleMenu({ kind, id, author, text, edit, children }: { kind: 'message' | 'post'; id: string; author: string; text: string; edit?: EditInfo; children?: ReactNode }) {
  const { setReply, forward } = useChat();
  const [open, setOpen] = useState(false); const [editing, setEditing] = useState(false);
  const btn = useRef<HTMLButtonElement>(null); const [pos, setPos] = useState({ top: 0, left: 0 });
  const toggle = () => {
    if (open) { setOpen(false); return; }
    const r = btn.current!.getBoundingClientRect(); const W = 236, H = 250;
    const left = Math.min(Math.max(r.right - W, 8), window.innerWidth - W - 8); let top = r.bottom + 6; if (top + H > window.innerHeight) top = Math.max(8, r.top - H - 6);
    setPos({ top, left }); setOpen(true);
  };
  useEffect(() => {
    if (!open) return; const close = () => setOpen(false); const key = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('scroll', close, true); window.addEventListener('resize', close); document.addEventListener('keydown', key);
    return () => { window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close); document.removeEventListener('keydown', key); };
  }, [open]);
  const doReply = () => { setReply({ id, kind, author, text }); setOpen(false); setTimeout(() => document.querySelector<HTMLTextAreaElement>('.msgr-composer textarea')?.focus(), 30); };

  return (
    <>
      <button ref={btn} type="button" className="bmenu-btn" aria-label="گزینه‌های پیام" aria-expanded={open} onClick={toggle}>⋯</button>
      {open && createPortal(<>
        <div className="bmenu-scrim" onClick={() => setOpen(false)} />
        <div className="bmenu-pop" style={{ top: pos.top, left: pos.left }} role="menu">
          <button type="button" role="menuitem" onClick={doReply}>↩️ پاسخ</button>
          <button type="button" role="menuitem" onClick={() => { forward({ kind, id, named: true, preview: text }); setOpen(false); }}>↪️ هدایت</button>
          <button type="button" role="menuitem" onClick={() => { forward({ kind, id, named: false, preview: text }); setOpen(false); }}>🕶️ هدایت بدون نام بردن</button>
          {edit && <button type="button" role="menuitem" onClick={() => { setEditing(true); setOpen(false); }}>✏️ ویرایش (متن و تصویر)</button>}
          {children}
        </div></>, document.body)}
      {editing && edit && <EditDialog id={id} edit={edit} onClose={() => setEditing(false)} />}
    </>
  );
}

/** فرم حذف با پرسش تأیید (برای قرار گرفتن داخل منو) */
export function ConfirmForm({ action, id, label, message }: { action: (fd: FormData) => void | Promise<void>; id: string; label: string; message: string }) {
  return (
    <form action={action} onSubmit={(e) => { if (!window.confirm(message)) e.preventDefault(); }}>
      <input type="hidden" name="id" value={id} /><button type="submit" role="menuitem" className="danger">{label}</button>
    </form>);
}
export function PlainForm({ action, id, label }: { action: (fd: FormData) => void | Promise<void>; id: string; label: string }) {
  return <form action={action}><input type="hidden" name="id" value={id} /><button type="submit" role="menuitem">{label}</button></form>;
}

function EditDialog({ id, edit, onClose }: { id: string; edit: EditInfo; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(edit.action, null); const [, start] = useTransition();
  const [body, setBody] = useState(edit.body); const [removed, setRemoved] = useState<string[]>([]); const [added, setAdded] = useState<File[]>([]);
  const [fix, setFix] = useState<{ file: File; id: string } | null>(null); const [loadErr, setLoadErr] = useState('');
  useEffect(() => { if (state?.ok) onClose(); }, [state, onClose]);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && !fix) onClose(); }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); }, [onClose, fix]);
  const keep = edit.files.filter((f) => !removed.includes(f.id));
  const openEditor = async (f: AttItem) => {
    setLoadErr('');
    try { const r = await fetch(`/api/attachment/${f.id}`); if (!r.ok) throw new Error(); const b = await r.blob(); setFix({ id: f.id, file: new File([b], f.name, { type: f.mime }) }); }
    catch { setLoadErr('باز کردن تصویر ممکن نشد.'); }
  };
  const save = () => {
    const fd = new FormData(); fd.set('id', id); fd.set('body', body); removed.forEach((r) => fd.append('remove', r)); added.forEach((f) => fd.append('files', f));
    start(() => { formAction(fd); });
  };
  return createPortal(
    <div className="cm-back" onClick={onClose}>
      <div className="cm-box" role="dialog" aria-label="ویرایش پیام" onClick={(e) => e.stopPropagation()}>
        <div className="cm-head"><b>✏️ ویرایش پیام</b><button type="button" className="fc-b" onClick={onClose} aria-label="بستن">✕</button></div>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000} placeholder="متن پیام…" style={{ minHeight: 90 }} />
        {keep.length > 0 && <div className="fchips">{keep.map((f) => (
          <div className="fchip" key={f.id}>
            {f.mime.startsWith('image/') ? <img src={`/api/attachment/${f.id}`} alt="" /> : <span className="fc-ico">📄</span>}
            <div className="fc-t"><span>{f.name}</span></div>
            {f.mime.startsWith('image/') && <button type="button" className="fc-b" onClick={() => openEditor(f)} title="ویرایش تصویر" aria-label="ویرایش تصویر">✏️</button>}
            <button type="button" className="fc-b" onClick={() => setRemoved((r) => [...r, f.id])} title="حذف" aria-label="حذف پیوست">🗑</button>
          </div>))}</div>}
        <FileChips files={added} onChange={setAdded} />
        <div className="row"><AttachButton onPick={(f) => setAdded((a) => [...a, ...f])} /><span className="muted small">افزودن عکس یا فایل تازه</span></div>
        {loadErr && <div className="alert error">{loadErr}</div>}{state?.error && <div className="alert error" role="alert">{state.error}</div>}
        <div className="row" style={{ justifyContent: 'flex-end' }}><button type="button" className="btn ghost" onClick={onClose}>انصراف</button><button type="button" className="btn" onClick={save} disabled={pending}>{pending ? 'در حال ذخیره…' : 'ذخیره'}</button></div>
      </div>
      {fix && <ImageEditor file={fix.file} onCancel={() => setFix(null)} onDone={(nf) => { setRemoved((r) => [...r, fix.id]); setAdded((a) => [...a, nf]); setFix(null); }} />}
    </div>, document.body);
}
