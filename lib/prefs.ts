/** ترجیحات ظاهر و تجربه‌ی برنامه؛ فقط روی همین دستگاه (localStorage) ذخیره می‌شود */
export type Prefs = {
  theme: 'system' | 'light' | 'dark'; color: ColorId; size: 'small' | 'normal' | 'large';
  reduceMotion: boolean; haptic: boolean; remAssign: boolean; remClass: boolean; quiet: boolean; notifMsg: boolean; notifAnn: boolean;
  /** ساعت سکوت (ساعتِ شروع و پایان، ۰ تا ۲۳) */ quietFrom: number; quietTo: number;
  /** چند دقیقه پیش از شروع کلاس یادآوری شود */ remClassMin: 5 | 10 | 15;
  /** از چه ساعتی «عصرِ روز قبل از مهلت» یادآوری شود */ remAssignHour: number;
};
export type ColorId = 'indigo' | 'blue' | 'teal' | 'green' | 'pink' | 'orange';
export const COLORS: { id: ColorId; label: string; hex: string }[] = [
  { id: 'indigo', label: 'آبی نیلی', hex: '#6366f1' }, { id: 'blue', label: 'آبی', hex: '#3b82f6' }, { id: 'teal', label: 'فیروزه‌ای', hex: '#14b8a6' },
  { id: 'green', label: 'سبز', hex: '#22c55e' }, { id: 'pink', label: 'صورتی', hex: '#ec4899' }, { id: 'orange', label: 'نارنجی', hex: '#f97316' },
];
export const PREFS_KEY = 'mdy-prefs';
export const DEFAULT_PREFS: Prefs = { theme: 'light', color: 'indigo', size: 'normal', reduceMotion: false, haptic: true, remAssign: true, remClass: false, quiet: true, notifMsg: true, notifAnn: true, quietFrom: 22, quietTo: 7, remClassMin: 10, remAssignHour: 17 };

export function loadPrefs(): Prefs {
  try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') }; } catch { return DEFAULT_PREFS; }
}
/** ذخیره + خبر‌دادن به بقیه‌ی پنل‌های باز تا همه با هم هماهنگ بمانند */
export const PREFS_EVENT = 'mdy-prefs';
export function savePrefs(p: Prefs) { try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch { /* حالت خصوصی مرورگر */ } try { window.dispatchEvent(new Event(PREFS_EVENT)); } catch { /* ignore */ } }
export function applyPrefs(p: Prefs) {
  const r = document.documentElement;
  if (p.theme === 'system') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', p.theme);
  if (p.color === 'indigo') r.removeAttribute('data-color'); else r.setAttribute('data-color', p.color);
  if (p.size === 'large' || p.size === 'small') r.setAttribute('data-size', p.size); else r.removeAttribute('data-size');
  if (p.reduceMotion) r.setAttribute('data-motion', 'reduce'); else r.removeAttribute('data-motion');
}
/** لرزش کوتاه هنگام انجام کارها (اگر دستگاه پشتیبانی کند و کاربر خاموش نکرده باشد) */
export function haptic(ms = 15) { try { if (loadPrefs().haptic && 'vibrate' in navigator) navigator.vibrate(ms); } catch { /* ignore */ } }
/** آیا «دقیقه‌ی روز» در ساعت سکوت است؟ (بازه می‌تواند از نیمه‌شب رد شود، مثل ۲۲ تا ۷) */
export function inQuiet(p: Pick<Prefs, 'quiet' | 'quietFrom' | 'quietTo'>, nowMin: number): boolean {
  if (!p.quiet) return false; const a = p.quietFrom * 60, b = p.quietTo * 60;
  if (a === b) return false; return a < b ? nowMin >= a && nowMin < b : nowMin >= a || nowMin < b;
}

/** اسکریپتِ کوچکی که قبل از نمایش صفحه اجرا می‌شود تا ظاهر انتخاب‌شده بدون پرش اعمال شود */
export const BOOT_SCRIPT = `(function(){try{var p=JSON.parse(localStorage.getItem('${PREFS_KEY}')||'{}'),r=document.documentElement;if(p.theme==='system'&&!localStorage.getItem('mdy-theme-v2')){p.theme='light';localStorage.setItem('${PREFS_KEY}',JSON.stringify(p))}localStorage.setItem('mdy-theme-v2','1');var t=p.theme||'light';if(t==='light'||t==='dark')r.setAttribute('data-theme',t);if(p.color&&p.color!=='indigo')r.setAttribute('data-color',p.color);if(p.size==='large'||p.size==='small')r.setAttribute('data-size',p.size);if(p.reduceMotion)r.setAttribute('data-motion','reduce')}catch(e){}})();`;
