import { logoutAction } from '@/app/actions/auth';
import type { CurrentUser } from '@/lib/auth';
import { roleTitle } from '@/lib/permissions';
import { AccentMain, BottomNav, SideNav, type NavItem } from './NavLinks';
import { Icon } from './Icons';
import { Mascot, type IllusName } from './Illus';
import { UserAvatar } from './UserAvatar';
import MobileTables from './MobileTables';

function navFor(user: CurrentUser): NavItem[] {
  const role = user.role;
  const help: NavItem = { href: '/help', label: 'راهنما و پشتیبانی', icon: 'note' };
  const home: NavItem = { href: '/dashboard', label: 'داشبورد', icon: 'home', group: 'اصلی' };
  const study: NavItem = { href: '/study', label: 'گزارش مطالعه', icon: 'study' };
  const school: NavItem[] = [
    { href: '/grades', label: 'نمرات', icon: 'grades', group: 'آموزش' }, { href: '/report-card', label: 'کارنامه و رتبه‌ها', icon: 'card' }, { href: '/discipline', label: 'مثبت‌ها و منفی‌ها', icon: 'note' }, { href: '/schedule', label: 'برنامه‌ی هفتگی', icon: 'calendar' }, { href: '/messages', label: 'پیام‌ها', icon: 'mail' }, { href: '/attendance', label: 'حضور و غیاب', icon: 'check' },
    { href: '/assignments', label: 'تکالیف', icon: 'assign' }, { href: '/announcements', label: 'اطلاعیه‌ها', icon: 'mega' },
  ];
  const staff: NavItem[] = [{ href: '/students', label: 'دانش‌آموزان', icon: 'users', group: 'مدیریت کلاس' }];
  const manage: NavItem[] = [
    { href: '/admin/users', label: 'کاربران مدرسه', icon: 'shield', group: 'مدیریت مدرسه' }, { href: '/admin/classes', label: 'کلاس‌ها', icon: 'school' },
    { href: '/admin/settings', label: 'تنظیمات مدرسه', icon: 'settings' },
  ];
  if (role === 'ADMIN') return [home, { href: '/admin/schools', label: 'مدارس و مدیران', icon: 'school', group: 'مدیریت سامانه' }, ...(user.isOwner ? [{ href: '/admin/audit', label: 'گزارش فعالیت‌ها', icon: 'log' } as NavItem] : []), { href: '/messages', label: 'پیام‌ها', icon: 'mail' }, { href: '/admin/requests', label: 'درخواست‌های ثبت‌نام', icon: 'check' }, { href: '/admin/plans', label: 'تعرفه‌ها', icon: 'settings' }, { href: '/admin/support', label: 'پشتیبانی', icon: 'mail' }, { href: '/admin/admins', label: 'مدیران سامانه', icon: 'shield' }];
  // مدیر و معاون بخش تکالیف را ندارند (تکلیف کار معلم و دانش‌آموز است)
  if (role === 'PRINCIPAL' || role === 'VICE') return [home, study, ...staff, ...school.filter((i) => i.href !== '/assignments'), { href: '/teacher-schedule', label: 'برنامه‌ی معلمان', icon: 'calendar' }, ...manage, help];
  if (role === 'TEACHER') return [home, study, ...staff, ...school, { href: '/teacher-schedule', label: 'برنامه‌ی من (معلم)', icon: 'calendar' }, help];
  const mates: NavItem[] = role === 'STUDENT' ? [{ href: '/classmates', label: 'هم‌کلاسی‌ها', icon: 'users' }] : [];
  return [home, study, ...school, ...mates, { href: '/advisor', label: 'مشاور تحصیلی', icon: 'target' }, help]; // دانش‌آموز و ولی
}

const ILLUS: Record<string, IllusName> = { '/dashboard': 'school', '/study': 'study', '/students': 'students', '/grades': 'grades', '/report-card': 'report', '/discipline': 'discipline', '/schedule': 'schedule', '/messages': 'messages', '/attendance': 'attendance', '/assignments': 'assignments', '/announcements': 'announcements', '/admin/users': 'users', '/admin/classes': 'school', '/admin/settings': 'settings', '/admin/audit': 'log', '/admin/schools': 'school', '/advisor': 'advisor', '/teacher-schedule': 'teacher', '/classmates': 'students', '/help': 'help', '/admin/support': 'messages', '/admin/requests': 'announcements', '/admin/plans': 'report', '/admin/admins': 'users' };

export default function Shell({ user, schoolName, unread = 0, pendingRequests = 0, pendingResets = 0, children }: { user: CurrentUser; schoolName: string; unread?: number; pendingRequests?: number; pendingResets?: number; children: React.ReactNode }) {
  const items = navFor(user).map((i) => ({ ...i, illus: ILLUS[i.href], ...(i.href === '/messages' ? { badge: unread } : {}), ...(i.href === '/admin/requests' ? { badge: pendingRequests } : {}), ...(i.href === '/admin/users' ? { badge: pendingResets } : {}) }));
  const name = `${user.firstName} ${user.lastName}`;
  const logout = (<form action={logoutAction}><button className="btn ghost sm" aria-label="خروج"><Icon name="logout" /> خروج</button></form>);
  const mobileItems = items.filter((i) => !i.href.startsWith('/admin') || i.href === '/admin/users' || i.href === '/admin/schools' || i.href === '/admin/support' || i.href === '/admin/requests' || i.href === '/admin/plans');
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand"><Mascot size={50} className="brand-mascot" /><div><b>مدرسه‌یار</b><span>{schoolName}</span></div></div>
        <SideNav items={items} />
        <div className="sidebar-foot">
          <div className="me"><UserAvatar user={user} size={42} /><div className="grow"><div style={{ fontWeight: 700, fontSize: '.9rem' }}>{name}</div><div className="muted small">{roleTitle(user)}</div></div></div>
          <div className="row" style={{ marginTop: 8 }}><a className="btn ghost sm grow" href="/profile">حساب من</a>{logout}</div>
        </div>
      </aside>
      <div>
        <div className="mobilebar"><div className="row"><UserAvatar user={user} size={36} /><b>{name}</b></div><div className="row"><a className="btn ghost sm" href="/profile">حساب</a>{logout}</div></div>
        <AccentMain>{children}</AccentMain>
        <BottomNav items={mobileItems} />
        <MobileTables />
      </div>
    </div>
  );
}
