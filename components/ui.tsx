import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
import { Icon, type IconName } from './Icons';
import { ACCENT, Avatar, Illus, type IllusName } from './Illus';

export function PageHead({ title, sub, children, illus }: { title: string; sub?: string; children?: ReactNode; illus?: IllusName }) {
  return (<div className="page-head"><div className="ph-title">{illus && <span className="ph-ico" style={{ '--ac': ACCENT[illus] } as CSSProperties}><Illus name={illus} size={50} /></span>}<div><h1>{title}</h1>{sub && <p>{sub}</p>}</div></div>{children && <div className="row">{children}</div>}</div>);
}
/** کاشی رنگیِ تصویری برای صفحه‌ی اصلی (مثل اپ‌های موبایل) */
export function Tile({ href, illus, label, badge, i = 0 }: { href: string; illus: IllusName; label: string; badge?: number; i?: number }) {
  return (<Link href={href} className="tile" style={{ '--ac': ACCENT[illus], '--i': i } as CSSProperties}>{badge ? <span className="badge danger tile-badge">{badge}</span> : null}<Illus name={illus} size={74} /><span>{label}</span></Link>);
}
export function Card({ title, children, action, className = '' }: { title?: string; children: ReactNode; action?: ReactNode; className?: string }) {
  return (<section className={`card ${className}`}>{(title || action) && <div className="row between" style={{ marginBottom: 14 }}>{title && <h3>{title}</h3>}{action}</div>}{children}</section>);
}
export function Stat({ label, value, hint, icon, tone = 'primary' }: { label: string; value: ReactNode; hint?: string; icon: IconName; tone?: 'primary' | 'accent' | 'warn' | 'ok' | 'danger' }) {
  return (<div className="card stat"><div className={`stat-icon tone-${tone}`}><Icon name={icon} /></div><div><div className="label">{label}</div><div className="value num">{value}</div>{hint && <div className="hint">{hint}</div>}</div></div>);
}
const EMPTY_ILLUS: Partial<Record<IconName, IllusName>> = { study: 'study', grades: 'grades', mail: 'messages', check: 'attendance', note: 'note', users: 'students', school: 'school', assign: 'assignments', card: 'report', calendar: 'schedule', mega: 'announcements', log: 'log', shield: 'users', settings: 'settings' };
export function Empty({ text, icon = 'empty' }: { text: string; icon?: IconName }) {
  return (<div className="empty"><Illus name={EMPTY_ILLUS[icon] ?? 'empty'} size={84} className="empty-illus" /><div>{text}</div></div>);
}
export function Badge({ children, tone = '' }: { children: ReactNode; tone?: '' | 'primary' | 'ok' | 'warn' | 'danger' | 'accent' }) { return <span className={`badge ${tone}`}>{children}</span>; }
export function Progress({ value }: { value: number }) { return <div className="progress"><span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>; }
export const Initial = ({ name }: { name: string }) => <Avatar name={name} size={38} />;
