import { Fragment, type ReactNode } from 'react';
import AttachmentList, { type AttItem } from '@/components/AttachmentList';
import { clock, dayKey, dayLabel } from '@/lib/chat';

export type Bubble = { id: string; mine: boolean; author?: string; subject?: string; body: string; at: Date; edited: boolean; read?: boolean; pinned?: boolean; files: AttItem[]; canRemoveFiles?: boolean; menu?: ReactNode; avatar?: ReactNode };

/** حباب‌های پیام با جداکننده‌ی روز؛ پیام‌های من سمت راست (رنگی) و پیام‌های دیگران سمت چپ */
export default function Bubbles({ items, showAuthor = false }: { items: Bubble[]; showAuthor?: boolean }) {
  const now = new Date(); let last = '';
  return (
    <>{items.map((b) => {
      const k = dayKey(b.at); const sep = k !== last; last = k;
      return (
        <Fragment key={b.id}>
          {sep && <div className="msgr-day"><span>{dayLabel(b.at, now)}</span></div>}
          <article className={`bubble-row ${b.mine ? 'mine' : 'theirs'}`}>
            {!b.mine && showAuthor && <div className="bubble-av">{b.avatar}</div>}
            <div className={`bubble${b.pinned ? ' pinned' : ''}`}>
              {b.menu && <details className="bmenu"><summary aria-label="گزینه‌های پیام">⋯</summary><div className="bmenu-body">{b.menu}</div></details>}
              {!b.mine && showAuthor && b.author && <div className="bubble-author">{b.author}</div>}
              {b.subject && <div className="bubble-subject">{b.subject}</div>}
              {b.body && <div className="bubble-text">{b.body}</div>}
              <AttachmentList items={b.files} canRemove={b.canRemoveFiles} />
              <div className="bubble-meta">{b.pinned && <span title="سنجاق‌شده">📌</span>}{b.edited && <span>ویرایش‌شده</span>}<span>{clock.format(b.at)}</span>{b.mine && b.read !== undefined && <span className={`ticks${b.read ? ' seen' : ''}`} title={b.read ? 'خوانده شد' : 'ارسال شد'}>{b.read ? '✓✓' : '✓'}</span>}</div>
            </div>
          </article>
        </Fragment>);
    })}</>
  );
}
