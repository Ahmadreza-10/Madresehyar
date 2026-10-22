import { Fragment, type ReactNode } from 'react';
import AttachmentList, { type AttItem } from '@/components/AttachmentList';
import { clock, dayKey, dayLabel } from '@/lib/chat';
import BubbleMenu, { type EditInfo } from './BubbleMenu';

export type Bubble = {
  id: string; kind: 'message' | 'post'; mine: boolean; author?: string; authorName: string; body: string; at: Date; read?: boolean; pinned?: boolean;
  files: AttItem[]; canRemoveFiles?: boolean; avatar?: ReactNode; subject?: string;
  replyToId?: string | null; replySnippet?: string | null; forwardedFrom?: string | null;
  edit?: EditInfo; menuExtra?: ReactNode;
};

/** حباب‌های پیام با جداکننده‌ی روز؛ پیام‌های من سمت راست (رنگی) و پیام‌های دیگران سمت چپ */
export default function Bubbles({ items, showAuthor = false }: { items: Bubble[]; showAuthor?: boolean }) {
  const now = new Date(); let last = '';
  return (
    <>{items.map((b) => {
      const k = dayKey(b.at); const sep = k !== last; last = k;
      const [qa, ...qt] = (b.replySnippet ?? '').split('\n');
      return (
        <Fragment key={b.id}>
          {sep && <div className="msgr-day"><span>{dayLabel(b.at, now)}</span></div>}
          <article id={`m-${b.id}`} className={`bubble-row ${b.mine ? 'mine' : 'theirs'}`}>
            {!b.mine && showAuthor && <div className="bubble-av">{b.avatar}</div>}
            <div className={`bubble${b.pinned ? ' pinned' : ''}`}>
              <BubbleMenu kind={b.kind} id={b.id} author={b.authorName} text={b.body} edit={b.edit}>{b.menuExtra}</BubbleMenu>
              {!b.mine && showAuthor && b.author && <div className="bubble-author">{b.author}</div>}
              {b.forwardedFrom && <div className="bubble-fwd">↪️ هدایت‌شده از {b.forwardedFrom}</div>}
              {b.replySnippet && <a className="bubble-quote" href={b.replyToId ? `#m-${b.replyToId}` : undefined}><b>{qa}</b><span>{qt.join(' ')}</span></a>}
              {b.subject && <div className="bubble-subject">{b.subject}</div>}
              {b.body && <div className="bubble-text">{b.body}</div>}
              <AttachmentList items={b.files} canRemove={b.canRemoveFiles} />
              <div className="bubble-meta">{b.pinned && <span title="سنجاق‌شده">📌</span>}<span>{clock.format(b.at)}</span>{b.mine && b.read !== undefined && <span className={`ticks${b.read ? ' seen' : ''}`} title={b.read ? 'خوانده شد' : 'ارسال شد'}>{b.read ? '✓✓' : '✓'}</span>}</div>
            </div>
          </article>
        </Fragment>);
    })}</>
  );
}
