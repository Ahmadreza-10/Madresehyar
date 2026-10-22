'use client';
import { createContext, useContext, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { forwardMessage } from '@/app/actions/messages';

export type Target = { key: string; name: string; sub: string; avatar: ReactNode };
export type ReplyRef = { id: string; kind: 'message' | 'post'; author: string; text: string };
export type FwdSrc = { kind: 'message' | 'post'; id: string; named: boolean; preview: string };
type Ctx = { reply: ReplyRef | null; setReply: (r: ReplyRef | null) => void; forward: (s: FwdSrc) => void };
const C = createContext<Ctx>({ reply: null, setReply: () => {}, forward: () => {} });
export const useChat = () => useContext(C);

/** وضعیت مشترک پیام‌رسان: پاسخ در حال نوشتن و پنجره‌ی «هدایت» */
export default function ChatProvider({ targets, children }: { targets: Target[]; children: ReactNode }) {
  const [reply, setReply] = useState<ReplyRef | null>(null); const [src, setSrc] = useState<FwdSrc | null>(null);
  return <C.Provider value={{ reply, setReply, forward: setSrc }}>{children}{src && <ForwardDialog src={src} targets={targets} onClose={() => setSrc(null)} />}</C.Provider>;
}

function ForwardDialog({ src, targets, onClose }: { src: FwdSrc; targets: Target[]; onClose: () => void }) {
  const [q, setQ] = useState(''); const [busy, setBusy] = useState<string | null>(null); const [res, setRes] = useState<{ ok: boolean; text: string } | null>(null);
  const list = targets.filter((t) => !q.trim() || t.name.includes(q.trim()));
  async function go(key: string) {
    setBusy(key); setRes(null);
    const fd = new FormData(); fd.set('kind', src.kind); fd.set('id', src.id); fd.set('target', key); fd.set('named', src.named ? '1' : '0');
    try { const r = await forwardMessage(null, fd); if (r?.ok) { setRes({ ok: true, text: 'هدایت شد ✓' }); setTimeout(onClose, 900); } else setRes({ ok: false, text: r?.error ?? 'هدایت انجام نشد.' }); }
    catch { setRes({ ok: false, text: 'هدایت انجام نشد.' }); }
    setBusy(null);
  }
  return createPortal(
    <div className="cm-back" onClick={onClose}>
      <div className="cm-box" role="dialog" aria-label="هدایت پیام" onClick={(e) => e.stopPropagation()}>
        <div className="cm-head"><b>{src.named ? '↪️ هدایت پیام' : '🕶️ هدایت بدون نام بردن'}</b><button type="button" className="fc-b" onClick={onClose} aria-label="بستن">✕</button></div>
        <div className="cm-quote">{src.preview || '📎 پیوست'}</div>
        <p className="muted small" style={{ margin: 0 }}>{src.named ? 'نام نویسنده‌ی اصلی بالای پیام نوشته می‌شود.' : 'نام نویسنده‌ی اصلی نوشته نمی‌شود.'} پیام را برای چه کسی بفرستم؟</p>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="جست‌وجوی نام…" aria-label="جست‌وجو" />
        <div className="cm-list">{list.length ? list.map((t) => (
          <button type="button" key={t.key} className="msgr-item" disabled={!!busy} onClick={() => go(t.key)}>
            {t.avatar}<div className="msgr-item-body"><div className="msgr-item-top"><b>{t.name}</b></div><div className="msgr-item-bot"><span className="msgr-prev">{busy === t.key ? 'در حال ارسال…' : t.sub}</span></div></div>
          </button>)) : <div className="msgr-empty">کسی پیدا نشد.</div>}</div>
        {res && <div className={`alert ${res.ok ? 'ok' : 'error'}`} role="status">{res.text}</div>}
      </div>
    </div>, document.body);
}
