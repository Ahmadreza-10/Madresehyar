'use client';
import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import type { ActionState } from '@/lib/action';

/** نوار نوشتن پیام: Enter = ارسال، Shift+Enter = خط جدید؛ دکمه‌ی گیره برای پیوست */
export default function ChatComposer({ action, hidden, placeholder = 'پیام بنویسید…' }: { action: (prev: ActionState, fd: FormData) => Promise<ActionState>; hidden: Record<string, string>; placeholder?: string }) {
  const [state, formAction, pending] = useActionState(action, null);
  const [, startTransition] = useTransition();
  const [text, setText] = useState(''); const [files, setFiles] = useState<string[]>([]);
  const form = useRef<HTMLFormElement>(null); const ta = useRef<HTMLTextAreaElement>(null); const fileIn = useRef<HTMLInputElement>(null);

  useEffect(() => { if (state?.ok) { setText(''); setFiles([]); if (fileIn.current) fileIn.current.value = ''; } }, [state]);
  useEffect(() => { const el = ta.current; if (!el) return; el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 140)}px`; }, [text]);

  const canSend = !pending && (text.trim().length > 0 || files.length > 0);
  const send = () => { if (!canSend || !form.current) return; const fd = new FormData(form.current); fd.set('body', text); startTransition(() => { formAction(fd); }); };
  return (
    <form ref={form} className="msgr-composer" onSubmit={(e) => { e.preventDefault(); send(); }}>
      {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {state?.error && <div className="alert error" role="alert" style={{ margin: '0 0 8px' }}>{state.error}</div>}
      {files.length > 0 && <div className="msgr-files">{files.map((f, i) => <span key={i} className="badge">📎 {f}</span>)}<button type="button" className="btn ghost sm" onClick={() => { setFiles([]); if (fileIn.current) fileIn.current.value = ''; }}>برداشتن</button></div>}
      <div className="msgr-composer-row">
        <label className="msgr-attach" title="پیوست (عکس، PDF، …)" aria-label="پیوست">📎
          <input ref={fileIn} type="file" name="files" multiple accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,.docx,.xlsx,.pptx,.zip" onChange={(e) => setFiles([...(e.target.files ?? [])].map((f) => f.name))} hidden />
        </label>
        <textarea ref={ta} rows={1} value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} maxLength={4000} aria-label="متن پیام"
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }} />
        <button type="submit" className="msgr-send" disabled={!canSend} aria-label="ارسال">{pending ? '…' : '➤'}</button>
      </div>
    </form>
  );
}
