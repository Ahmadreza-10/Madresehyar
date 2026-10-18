import { and, desc, eq, gt } from 'drizzle-orm';
import { db } from '@/db';
import { sessions } from '@/db/schema';
import { changePasswordAction, changeUsernameAction } from '@/app/actions/auth';
import { revokeSession, signOutOtherSessions, updatePhone } from '@/app/actions/profile';
import AvatarPicker from '@/components/AvatarPicker';
import PushToggle from '@/components/PushToggle';
import ActionForm from '@/components/ActionForm';
import { ActionButton } from '@/components/AssignmentControls';
import { AppearancePanel, AppPanel, NotificationsPanel } from '@/components/PrefsPanel';
import { Tabs } from '@/components/Interactive';
import { UserAvatar } from '@/components/UserAvatar';
import { Badge, Card, Stat } from '@/components/ui';
import { currentSessionHash, requireUser } from '@/lib/auth';
import { deviceLabel } from '@/lib/device';
import { fa, formatJalali } from '@/lib/format';
import { roleTitle } from '@/lib/permissions';
import { parentStudentsCount, profileStats } from '@/lib/profile-stats';
import { getSchool } from '@/lib/settings';
import { isoDate, tehranParts } from '@/lib/time';

export const metadata = { title: 'حساب من' };
const when = (d: Date | null | undefined) => { if (!d) return '—'; const p = tehranParts(d); return `${formatJalali(isoDate(p.y, p.m, p.d))} • ${fa(String(p.h).padStart(2, '0'))}:${fa(String(p.min).padStart(2, '0'))}`; };

export default async function Profile({ searchParams }: { searchParams: Promise<{ force?: string; tab?: string }> }) {
  const u = await requireUser(); const sp = await searchParams;
  const school = await getSchool(u.schoolId); const { stats, subtitle } = await profileStats(u);
  const cur = await currentSessionHash();
  const sess = await db.select().from(sessions).where(and(eq(sessions.userId, u.id), gt(sessions.expiresAt, new Date()))).orderBy(desc(sessions.createdAt));
  const kids = u.role === 'PARENT' ? await parentStudentsCount(u.id) : 0;

  // میزان تکمیل پروفایل: چند کارِ ساده برای امن‌تر و کامل‌تر شدن حساب
  const todo = [
    { label: 'عکس یا آواتار', done: !!u.avatarPhotoAt || u.avatarPreset !== null },
    { label: 'شماره‌ی موبایل', done: !!u.phone },
    { label: 'رمز شخصی', done: !u.mustChangePassword },
    ...(u.role === 'PARENT' ? [{ label: 'اتصال فرزند', done: kids > 0 }] : []),
  ];
  const pct = Math.round((todo.filter((t) => t.done).length / todo.length) * 100);
  const mustChange = !!(sp.force || u.mustChangePassword);

  const info = (
    <div className="stack">
      {pct < 100 && <Card title="برای کامل‌شدن پروفایل"><div className="todo-chips">{todo.map((t) => <span key={t.label} className={`todo-chip${t.done ? ' done' : ''}`}>{t.done ? '✓' : '○'} {t.label}</span>)}</div></Card>}
      <Card title="تصویر پروفایل"><AvatarPicker name={u.firstName + u.lastName} current={u.avatarPreset} photoSrc={u.avatarPhotoAt ? `/api/avatar/${u.id}?v=${u.avatarPhotoAt.getTime()}` : undefined} />
        {u.role === 'STUDENT' && <p className="muted small" style={{ marginTop: 10 }}>عکس شما را هم‌کلاسی‌هایتان در صفحه‌ی «هم‌کلاسی‌ها» می‌بینند.</p>}</Card>
      <Card title="اطلاعات تماس">
        <div style={{ maxWidth: 420 }}>
          <ActionForm action={updatePhone} submit="ذخیره‌ی شماره" resetOnSuccess={false}>
            <div className="field"><label>شماره‌ی موبایل</label><input name="phone" dir="ltr" inputMode="tel" defaultValue={u.phone ?? ''} placeholder="09123456789" maxLength={20} /><span className="hint-t">{u.role === 'PARENT' ? 'مدیر و معاون مدرسه برای تماس با شما از این شماره استفاده می‌کنند.' : 'برای تماس مدرسه با شما.'} خالی گذاشتن = حذف شماره.</span></div>
          </ActionForm>
        </div>
      </Card>
    </div>);

  const security = (
    <div className="stack">
      {mustChange && <div className="alert warn">برای امنیت بیشتر، لطفاً رمز عبور موقت خود را تغییر دهید.</div>}
      <div className="grid g2">
        <Card title="تغییر رمز عبور">
          <ActionForm action={changePasswordAction} submit="ذخیره‌ی رمز جدید">
            <div className="field"><label>رمز فعلی</label><input name="current" type="password" dir="ltr" autoComplete="current-password" required /></div>
            <div className="field"><label>رمز جدید</label><input name="next" type="password" dir="ltr" autoComplete="new-password" minLength={8} required /><span className="hint-t">حداقل ۸ نویسه</span></div>
            <div className="field"><label>تکرار رمز جدید</label><input name="again" type="password" dir="ltr" autoComplete="new-password" required /></div>
          </ActionForm>
        </Card>
        <Card title="تغییر نام کاربری">
          <ActionForm action={changeUsernameAction} submit="ذخیره‌ی نام کاربری" resetOnSuccess={false}>
            <div className="field"><label>نام کاربری جدید</label><input name="username" dir="ltr" defaultValue={u.username} autoComplete="username" pattern="[a-zA-Z0-9._\-]{3,30}" required /><span className="hint-t">حروف انگلیسی، عدد و ._- (۳ تا ۳۰ نویسه)</span></div>
            <div className="field"><label>رمز عبور فعلی (برای تأیید)</label><input name="password" type="password" dir="ltr" autoComplete="current-password" required /></div>
          </ActionForm>
        </Card>
      </div>
      <Card title="دستگاه‌های واردشده" action={sess.length > 1 ? <ActionButton action={signOutOtherSessions} fields={{}} tone="danger" label="خروج از بقیه‌ی دستگاه‌ها" confirm="از همه‌ی دستگاه‌ها به‌جز همین یکی خارج می‌شوید. ادامه می‌دهید؟" /> : undefined}>
        <p className="muted small" style={{ marginBottom: 6 }}>اگر دستگاهی را نمی‌شناسید یا گوشی‌تان گم شده، از آن خارج شوید و رمزتان را عوض کنید. آخرین ورود موفق شما: {when(u.lastLoginAt)}</p>
        {sess.map((s) => { const d = deviceLabel(s.userAgent); const me = s.tokenHash === cur; return (
          <div className="sess" key={s.id}><span className="ico" aria-hidden>{d.icon}</span>
            <div className="grow"><b>{d.name}</b> {me && <Badge tone="ok">این دستگاه</Badge>}<div className="muted small">ورود: {when(s.createdAt)}{s.ip ? ` • IP ${s.ip}` : ''}</div></div>
            {!me && <ActionButton action={revokeSession} fields={{ id: s.id }} tone="ghost" label="خروج" />}</div>); })}
      </Card>
    </div>);

  const notifications = (
    <div className="stack">
      <Card title="یادآورها و اعلان‌ها"><NotificationsPanel /></Card>
      {u.role === 'PARENT' && <Card title="یادآور گزارش مطالعه (حتی وقتی سایت بسته است)"><PushToggle /></Card>}
    </div>);

  const look = (<div className="grid g2" style={{ alignItems: 'start' }}><Card title="ظاهر برنامه"><AppearancePanel /></Card><Card title="برنامه و حساب"><AppPanel /></Card></div>);

  return (
    <>
      <section className="prof">
        <UserAvatar user={u} size={92} className="hero-avatar" />
        <div>
          <h1>{u.firstName} {u.lastName}</h1>
          <div className="hero-chips">
            <span className="hero-chip">{roleTitle(u)}</span>{school && <span className="hero-chip">🏫 {school.name}</span>}
            {subtitle.map((x) => <span className="hero-chip" key={x}>{x}</span>)}
            <span className="hero-chip" dir="ltr">@{u.username}</span>{u.phone && <span className="hero-chip" dir="ltr">{u.phone}</span>}
          </div>
        </div>
        <div className="prof-meter" title="میزان تکمیل پروفایل"><div className="ring" style={{ '--p': pct } as React.CSSProperties}><span>{fa(pct)}٪</span></div><small>تکمیل پروفایل</small></div>
      </section>
      {stats.length > 0 && <div className={`grid ${stats.length >= 4 ? 'g4' : stats.length === 3 ? 'g3' : 'g2'}`} style={{ marginBottom: 20 }}>{stats.map((s) => <Stat key={s.label} label={s.label} value={s.value} hint={s.hint} icon={s.icon} tone={s.tone} />)}</div>}
      <Tabs initialId={sp.tab ?? (mustChange ? 'security' : 'info')} tabs={[
        { id: 'info', label: '👤 اطلاعات من', content: info },
        { id: 'security', label: '🔐 امنیت', badge: mustChange ? <Badge tone="warn">!</Badge> : undefined, content: security },
        { id: 'notifications', label: '🔔 اعلان‌ها', content: notifications },
        { id: 'appearance', label: '🎨 ظاهر و برنامه', content: look },
      ]} />
    </>
  );
}
