'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type CSSProperties } from 'react';
import { Icon, type IconName } from './Icons';
import { ACCENT, Illus, type IllusName } from './Illus';

export type NavItem = { href: string; label: string; icon: IconName; group?: string; badge?: number; illus?: IllusName };
const active = (path: string, href: string) => path === href || (href !== '/dashboard' && path.startsWith(href + '/')) || (href === '/dashboard' && path === '/dashboard');

export function SideNav({ items }: { items: NavItem[] }) {
  const path = usePathname(); let last = '';
  return (<nav aria-label="منوی اصلی">{items.map((i) => {
    const head = i.group && i.group !== last ? <div className="nav-group" key={`g-${i.group}`}>{i.group}</div> : null; if (i.group) last = i.group;
    return [head, <Link key={i.href} href={i.href} className={`nav-link${active(path, i.href) ? ' active' : ''}`}><span className="nav-ico" style={{ '--ac': i.illus ? ACCENT[i.illus] : undefined } as CSSProperties}>{i.illus ? <Illus name={i.illus} size={30} /> : <Icon name={i.icon} />}</span>{i.label}{i.badge ? <span className="badge danger" style={{ marginInlineStart: 'auto' }}>{i.badge}</span> : null}</Link>];
  })}</nav>);
}
export function BottomNav({ items }: { items: NavItem[] }) {
  const path = usePathname(); const [more, setMore] = useState(false);
  useEffect(() => { setMore(false); }, [path]);
  // ۴ بخش اصلی در نوار پایین؛ بقیه در برگه‌ی «بیشتر» (فهرست عمودی، بدون کشیدن افقی)
  const main = items.slice(0, 4); const rest = items.slice(4);
  const activeInRest = rest.some((i) => active(path, i.href));
  const link = (i: NavItem, sheet = false) => (<Link key={i.href} href={i.href} className={active(path, i.href) ? 'active' : ''} style={{ '--ac': i.illus ? ACCENT[i.illus] : undefined } as CSSProperties}>{i.illus ? <Illus name={i.illus} size={sheet ? 30 : 26} /> : <Icon name={i.icon} />}<span>{i.label}</span>{i.badge ? <i className="bn-badge">{i.badge}</i> : null}</Link>);
  return (<>
    {more && <div className="more-back" onClick={() => setMore(false)} />}
    {more && <div className="more-sheet" role="dialog" aria-label="همه‌ی بخش‌ها">{rest.map((i) => link(i, true))}</div>}
    <nav className="bottomnav" aria-label="منوی پایین">{main.map((i) => link(i))}
      {rest.length > 0 && <button type="button" className={`bn-more${more || activeInRest ? ' active' : ''}`} onClick={() => setMore((m) => !m)} aria-expanded={more}><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="5" cy="12" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="19" cy="12" r="1.2" /></svg><span>بیشتر</span></button>}
    </nav></>);
}

const PATH_ILLUS: [string, IllusName][] = [['/surveys', 'survey'], ['/grades', 'grades'], ['/report-card', 'report'], ['/discipline', 'discipline'], ['/schedule', 'schedule'], ['/messages', 'messages'], ['/attendance', 'attendance'], ['/assignments', 'assignments'], ['/announcements', 'announcements'], ['/study', 'study'], ['/students', 'students'], ['/admin/users', 'users'], ['/admin/classes', 'school'], ['/admin/schools', 'school'], ['/admin/settings', 'settings'], ['/admin/audit', 'log'], ['/advisor', 'advisor'], ['/teacher-schedule', 'teacher'], ['/classmates', 'students'], ['/profile', 'users'], ['/help', 'help'], ['/admin/support', 'messages'], ['/admin/requests', 'announcements'], ['/admin/plans', 'report'], ['/admin/admins', 'users']];
/** محتوای صفحه؛ رنگ شاخصِ بخش جاری (برای دکمه‌ها، تیترها و تب‌ها) از روی آدرس تعیین می‌شود */
export function AccentMain({ children }: { children: React.ReactNode }) {
  const path = usePathname(); const hit = PATH_ILLUS.find(([p]) => path === p || path.startsWith(p + '/'));
  return <main className="main" style={{ '--ac': hit ? ACCENT[hit[1]] : 'var(--primary)' } as CSSProperties}>{children}</main>;
}
