'use client';
import { useEffect, useState } from 'react';
import { logoutAction } from '@/app/actions/auth';
import { applyPrefs, COLORS, DEFAULT_PREFS, haptic, loadPrefs, PREFS_EVENT, savePrefs, type Prefs } from '@/lib/prefs';

/** ترجیحات روی همین دستگاه ذخیره می‌شود؛ همه‌ی پنل‌ها یک منبع دارند و تغییرِ یکی فوراً اعمال می‌شود */
function usePrefs() {
  const [p, setP] = useState<Prefs>(DEFAULT_PREFS);
  useEffect(() => { const sync = () => setP(loadPrefs()); sync(); window.addEventListener(PREFS_EVENT, sync); return () => window.removeEventListener(PREFS_EVENT, sync); }, []);
  const set = (patch: Partial<Prefs>) => { const n = { ...p, ...patch }; setP(n); savePrefs(n); applyPrefs(n); haptic(); };
  const reset = () => { setP(DEFAULT_PREFS); savePrefs(DEFAULT_PREFS); applyPrefs(DEFAULT_PREFS); };
  return { p, set, reset };
}

const Switch = ({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) => (
  <button type="button" role="switch" aria-checked={on} aria-label={label} className={`switch${on ? ' on' : ''}`} onClick={() => onChange(!on)} />
);
const Row = ({ icon, title, sub, on, onChange, children }: { icon: string; title: string; sub?: string; on: boolean; onChange: (v: boolean) => void; children?: React.ReactNode }) => (
  <div className="pref-item">
    <div className="pref-row"><span className="pref-ico" aria-hidden>{icon}</span><div className="pt grow" style={{ textAlign: 'start' }}><b>{title}</b>{sub && <span className="muted small">{sub}</span>}</div><Switch on={on} onChange={onChange} label={title} /></div>
    {on && children && <div className="pref-extra">{children}</div>}
  </div>
);
const hours = Array.from({ length: 24 }, (_, i) => i);
const HourSelect = ({ value, onChange, label }: { value: number; onChange: (h: number) => void; label: string }) => (
  <label className="row small" style={{ gap: 8 }}>{label}<select value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ width: 96 }}>{hours.map((h) => <option key={h} value={h}>{h.toLocaleString('fa-IR')}:۰۰</option>)}</select></label>
);

const THEMES = [['system', 'مطابق سیستم'], ['light', 'روشن'], ['dark', 'تیره']] as const;

/** ظاهر: پوسته با پیش‌نمایش، رنگ اصلی، اندازه‌ی متن، حرکت و لرزش */
export function AppearancePanel() {
  const { p, set } = usePrefs();
  return (
    <div>
      <div className="pv" aria-label="پیش‌نمایش زنده">
        <div className="pv-bar"><b>پیش‌نمایش</b><span className="badge primary">تکلیف جدید</span></div>
        <div className="pv-body"><div><b>حل تمرین صفحه‌ی ۴۵</b><div className="muted small">ریاضی • فردا ۹:۴۵</div></div><span className="btn sm">✓ انجام شد</span></div>
      </div>

      <div className="pref-block"><h4>پوسته</h4>
        <div className="theme-tiles">{THEMES.map(([k, l]) => (
          <button type="button" key={k} className={`theme-tile ${k}${p.theme === k ? ' on' : ''}`} onClick={() => set({ theme: k })} aria-pressed={p.theme === k}>
            <span className="tt-art" aria-hidden><i /><i /><i /></span><span>{p.theme === k ? '✓ ' : ''}{l}</span></button>))}</div></div>

      <div className="pref-block"><h4>رنگ اصلی <span className="muted small">• {COLORS.find((c) => c.id === p.color)?.label}</span></h4>
        <div className="swatches">{COLORS.map((c) => <button type="button" key={c.id} className={`swatch${p.color === c.id ? ' on' : ''}`} style={{ background: c.hex }} onClick={() => set({ color: c.id })} aria-label={c.label} aria-pressed={p.color === c.id}>{p.color === c.id ? '✓' : ''}</button>)}</div></div>

      <div className="pref-block"><h4>اندازه‌ی متن</h4>
        <div className="size-steps">{([['small', 'کوچک', '.85rem'], ['normal', 'معمولی', '1rem'], ['large', 'درشت', '1.25rem']] as const).map(([k, l, fs]) => (
          <button type="button" key={k} className={p.size === k ? 'on' : ''} onClick={() => set({ size: k })} aria-pressed={p.size === k}><span style={{ fontSize: fs, fontWeight: 800 }}>آ</span><small>{l}</small></button>))}</div></div>

      <Row icon="✨" title="کاهش جلوه‌های حرکتی" sub="انیمیشن‌ها کوتاه و ساده می‌شوند (برای راحتیِ چشم یا گوشی‌های کند)" on={p.reduceMotion} onChange={(v) => set({ reduceMotion: v })} />
      <Row icon="📳" title="بازخورد لمسی" sub="لرزش کوتاه هنگام تیک‌زدن و انجام کارها (در دستگاه‌های پشتیبانی‌شده)" on={p.haptic} onChange={(v) => set({ haptic: v })} />
    </div>
  );
}

/** اعلان‌ها: مجوز مرورگر، دسته‌ها، زمان‌بندی و ساعت سکوت */
export function NotificationsPanel() {
  const { p, set } = usePrefs(); const [perm, setPerm] = useState<'unsupported' | 'default' | 'granted' | 'denied'>('default'); const [msg, setMsg] = useState('');
  useEffect(() => { setPerm('Notification' in window ? Notification.permission : 'unsupported'); }, []);
  const ask = async () => {
    try {
      if (!('Notification' in window)) return;
      const r = await Notification.requestPermission(); setPerm(r);
      if (r === 'granted' && window.isSecureContext && 'serviceWorker' in navigator) await navigator.serviceWorker.register('/sw.js');
    } catch { /* ignore */ }
  };
  const test = async () => {
    setMsg('');
    try {
      if (perm !== 'granted') { setMsg('اعلان آزمایشی داخل صفحه: یادآورها همین‌طور نشان داده می‌شوند. برای اعلان سیستمی، «اجازه‌ی اعلان» را بزنید.'); return; }
      const reg = await navigator.serviceWorker?.getRegistration('/sw.js');
      const opts = { body: 'اگر این پیام را می‌بینید، اعلان‌ها روی این دستگاه کار می‌کنند.', dir: 'rtl' as const, lang: 'fa', icon: '/icons/icon-192.png' };
      if (reg) await reg.showNotification('✅ اعلان آزمایشی مدرسه‌یار', opts); else new Notification('✅ اعلان آزمایشی مدرسه‌یار', opts);
      setMsg('اعلان آزمایشی فرستاده شد.');
    } catch { setMsg('فرستادن اعلان ناموفق بود.'); }
  };
  const on = (patch: Partial<Prefs>) => { set(patch); if (perm === 'default' && Object.values(patch).some((v) => v === true)) ask(); };
  return (
    <div>
      <div className={`perm-card ${perm}`}>
        <span className="pref-ico" aria-hidden>{perm === 'granted' ? '🔔' : perm === 'denied' ? '🔕' : '🔔'}</span>
        <div className="grow"><b>{perm === 'granted' ? 'اعلان‌های مرورگر فعال است' : perm === 'denied' ? 'اعلان مرورگر بسته است' : perm === 'unsupported' ? 'این مرورگر اعلان سیستمی ندارد' : 'اعلان سیستمی هنوز فعال نشده'}</b>
          <div className="muted small">{perm === 'denied' ? 'از تنظیمات مرورگر (قفل کنار آدرس) آن را باز کنید. تا آن موقع یادآورها فقط داخل صفحه نشان داده می‌شوند.' : 'یادآورها وقتی سایت یا برنامه باز است نشان داده می‌شوند.'}</div></div>
        {perm === 'default' && <button type="button" className="btn sm" onClick={ask}>اجازه‌ی اعلان</button>}
        {perm !== 'unsupported' && <button type="button" className="btn ghost sm" onClick={test}>آزمایش</button>}
      </div>
      {msg && <div className="alert ok" style={{ marginTop: 8 }}>{msg}</div>}

      <Row icon="📝" title="مهلت تکلیف‌ها" sub="عصرِ روز پیش از مهلت، اگر هنوز انجام نشده باشد" on={p.remAssign} onChange={(v) => on({ remAssign: v })}>
        <HourSelect label="از ساعت" value={p.remAssignHour} onChange={(h) => set({ remAssignHour: h })} /></Row>
      <Row icon="🔔" title="شروع کلاس" sub="چند دقیقه پیش از هر زنگ (از روی ساعتِ ثبت‌شده در برنامه)" on={p.remClass} onChange={(v) => on({ remClass: v })}>
        <div className="pseg">{([5, 10, 15] as const).map((m) => <button type="button" key={m} className={p.remClassMin === m ? 'on' : ''} onClick={() => set({ remClassMin: m })}>{m.toLocaleString('fa-IR')} دقیقه</button>)}</div></Row>
      <Row icon="✉️" title="پیام‌ها" sub="وقتی پیام تازه‌ای می‌رسد" on={p.notifMsg} onChange={(v) => on({ notifMsg: v })} />
      <Row icon="📣" title="اطلاعیه‌های مدرسه" sub="وقتی اطلاعیه‌ی تازه‌ای منتشر می‌شود" on={p.notifAnn} onChange={(v) => on({ notifAnn: v })} />
      <Row icon="🌙" title="ساعت سکوت" sub="در این بازه هیچ یادآوری‌ای نشان داده نمی‌شود" on={p.quiet} onChange={(v) => set({ quiet: v })}>
        <div className="row"><HourSelect label="از" value={p.quietFrom} onChange={(h) => set({ quietFrom: h })} /><HourSelect label="تا" value={p.quietTo} onChange={(h) => set({ quietTo: h })} /></div></Row>
      <p className="muted small" style={{ marginTop: 10 }}>این تنظیمات فقط روی همین دستگاه ذخیره می‌شود. برای هر گوشی یا رایانه جداگانه تنظیم کنید.</p>
    </div>
  );
}

type BIP = Event & { prompt: () => Promise<void> };
/** برنامه: نصب، درباره، بازنشانی و خروج */
export function AppPanel() {
  const { reset } = usePrefs(); const [install, setInstall] = useState<BIP | null>(null);
  useEffect(() => { const h = (e: Event) => { e.preventDefault(); setInstall(e as BIP); }; window.addEventListener('beforeinstallprompt', h); return () => window.removeEventListener('beforeinstallprompt', h); }, []);
  return (
    <div>
      <div className="pref-row"><span className="pref-ico" aria-hidden>📲</span><div className="pt grow"><b>نصب مدرسه‌یار</b><span className="muted small">مثل یک برنامه روی صفحه‌ی اصلی؛ سریع‌تر باز می‌شود</span></div>
        {install ? <button type="button" className="btn sm" onClick={async () => { await install.prompt(); setInstall(null); }}>نصب</button> : <span className="muted small" style={{ maxWidth: 210, textAlign: 'end' }}>از منوی مرورگر «افزودن به صفحه‌ی اصلی» (آیفون: دکمه‌ی اشتراک‌گذاری)</span>}</div>
      <div className="pref-row"><span className="pref-ico" aria-hidden>↺</span><div className="pt grow"><b>بازنشانی ظاهر و اعلان‌ها</b><span className="muted small">به نمرات و تکالیف دست نمی‌زند</span></div>
        <button type="button" className="btn ghost sm" onClick={() => { if (window.confirm('تنظیمات ظاهر و اعلان‌ها به حالت اول برمی‌گردد. ادامه می‌دهید؟')) reset(); }}>بازنشانی</button></div>
      <details className="pref-row" style={{ display: 'block' }}><summary><span className="pref-ico" aria-hidden>ℹ️</span> <b>درباره‌ی مدرسه‌یار</b> <span className="muted small">• نسخه‌ی ۲٫۱</span></summary>
        <p className="muted small" style={{ marginTop: 8 }}>سامانه‌ی مدرسه برای نمرات، حضور و غیاب، تکالیف، برنامه‌ی هفتگی و گزارش مطالعه. اطلاعات مدرسه روی سرور مدرسه می‌ماند؛ فقط ترجیحات ظاهر و اعلان روی همین دستگاه ذخیره می‌شود.</p></details>
      <form action={logoutAction} style={{ marginTop: 18 }}><button className="btn danger" style={{ width: '100%' }}>خروج از حساب</button></form>
    </div>
  );
}
