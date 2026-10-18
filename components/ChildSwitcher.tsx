import { setActiveChild } from '@/app/actions/child';
import { fa } from '@/lib/format';

/** نوار بالای صفحه برای ولیِ چند فرزند: با یک کلیک بین فرزندان جابه‌جا می‌شود */
export default function ChildSwitcher({ kids, activeId }: { kids: { id: string; name: string; className?: string | null }[]; activeId: string | null }) {
  if (kids.length < 2) return null;
  return (
    <div className="child-switch" role="group" aria-label="انتخاب فرزند">
      <span className="muted small">اطلاعات کدام فرزند؟</span>
      {kids.map((k) => (
        <form action={setActiveChild} key={k.id}>
          <input type="hidden" name="childId" value={k.id} />
          <button className={`child-chip${k.id === activeId ? ' on' : ''}`} aria-pressed={k.id === activeId}>
            <span className="av">{k.name[0]}</span>{k.name}{k.className ? <small>{fa(k.className)}</small> : null}
          </button>
        </form>))}
    </div>
  );
}
