'use client';
import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import type { ActionState } from '@/lib/action';
import { AttachButton, FileChips } from './Attach';
import { useChat } from './ChatProvider';

/** نوار نوشتن پیام: Enter = ارسال، Shift+Enter = خط جدید؛ گیره برای پیوست (با ویرایش تصویر)؛ نوار «پاسخ به …» */
export default function ChatComposer({ action, hidden, placeholder = 'پیام بنویسید…' }: { action: (prev: ActionState, fd: FormData) => Promise<ActionState>; hidden: Record<string, string>; placeholder?: string }) {
  const [state, formAction, pending] = useActionState(action, null);
  const [, startTransition] = useTransition();
  const { reply, setReply } = useChat();
  const [text, setText] = useState(''); const [files, setFiles] = useState<File[]>([]);
  const form = useRef<HTMLFormElement>(null); const ta = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (state?.ok) { setText(''); setFiles([]); setReply(null); } }, [state, setReply]);
  useEffect(() => {
    const el = ta.current; if (!el) return; el.style.height = 'auto';
    const h = Math.min(el.scrollHeight, 140); el.style.height = `${h}px`; el.style.overflowY = el.scrollHeight > 140 ? 'auto' : 'hidden';
  }, [text]);

  const canSend = !pending && (text.trim().length > 0 || files.length > 0);
  const send = () => {
    if (!canSend || !form.current) return; const fd = new FormData(form.current);
    fd.set('body', text); fd.delete('files'); files.forEach((f) => fd.append('files', f)); if (reply) fd.set('replyToId', reply.id);
    startTransition(() => { formAction(fd); });
  };
  return (
    <form ref={form} className="msgr-composer" onSubmit={(e) => { e.preventDefault(); send(); }}>
      {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {state?.error && <div className="alert error" role="alert" style={{ margin: '0 0 8px' }}>{state.error}</div>}
      {reply && <div className="reply-bar"><div className="rb-t"><b>پاسخ به {reply.author}</b><span>{reply.text || '📎 پیوست'}</span></div><button type="button" className="fc-b" onClick={() => setReply(null)} aria-label="لغو پاسخ">✕</button></div>}
      <FileChips files={files} onChange={setFiles} />
      <div className="msgr-composer-row">
        <AttachButton onPick={(f) => setFiles((p) => [...p, ...f])} />
        <textarea ref={ta} rows={1} value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} maxLength={4000} aria-label="متن پیام"
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }} />
        <button type="submit" className="msgr-send" disabled={!canSend} aria-label="ارسال">{pending ? '…' : '➤'}</button>
      </div>
    </form>
  );
}
