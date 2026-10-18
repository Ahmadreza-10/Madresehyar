import { removeAttachment } from '@/app/actions/attachments';
import { fa } from '@/lib/format';

export type AttItem = { id: string; name: string; mime: string; size: number };
const sizeText = (n: number) => (n >= 1048576 ? `${fa((n / 1048576).toFixed(1))} مگابایت` : `${fa(Math.max(1, Math.round(n / 1024)))} کیلوبایت`);
const icon = (m: string) => (m.startsWith('image/') ? '🖼️' : m === 'application/pdf' ? '📕' : m.includes('word') ? '📘' : m.includes('sheet') ? '📗' : m.includes('presentation') ? '📙' : '🗜️');

/** فهرست پیوست‌ها: عکس‌ها با پیش‌نمایش؛ در حالت ویرایش دکمه‌ی حذف هم دارد */
export default function AttachmentList({ items, canRemove }: { items: AttItem[]; canRemove?: boolean }) {
  if (!items.length) return null;
  return (
    <div className="att-files">{items.map((f) => (
      <div className="att-file" key={f.id}>
        {f.mime.startsWith('image/') && <a href={`/api/attachment/${f.id}`} target="_blank" rel="noopener"><img src={`/api/attachment/${f.id}`} alt={f.name} loading="lazy" /></a>}
        <div className="row" style={{ gap: 8 }}>
          <span>{icon(f.mime)}</span><div className="grow" style={{ minWidth: 0 }}><div className="small" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div><div className="muted small">{sizeText(f.size)}</div></div>
          <a className="btn ghost sm" href={`/api/attachment/${f.id}`} target="_blank" rel="noopener">{f.mime.startsWith('image/') || f.mime === 'application/pdf' ? 'مشاهده' : 'دانلود'}</a>
          {canRemove && <form action={removeAttachment}><input type="hidden" name="id" value={f.id} /><button className="btn danger sm">حذف</button></form>}
        </div>
      </div>))}</div>
  );
}
