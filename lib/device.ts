/** توضیح کوتاه و خوانا از «مرورگر و سیستم‌عامل» روی نشست‌ها (از روی User-Agent)؛ دقیق نیست و فقط برای تشخیص دستگاه است */
export function deviceLabel(ua: string | null | undefined): { name: string; icon: string } {
  const s = ua ?? '';
  if (!s) return { name: 'دستگاه ناشناس', icon: '💻' };
  const os = /iPhone|iPad|iPod/.test(s) ? 'iOS' : /Android/.test(s) ? 'اندروید' : /Windows/.test(s) ? 'ویندوز' : /Mac OS X|Macintosh/.test(s) ? 'مک' : /Linux/.test(s) ? 'لینوکس' : '';
  const br = /Edg\//.test(s) ? 'Edge' : /OPR\/|Opera/.test(s) ? 'Opera' : /SamsungBrowser/.test(s) ? 'Samsung Internet' : /Firefox\//.test(s) ? 'Firefox' : /Chrome\/|CriOS/.test(s) ? 'Chrome' : /Safari\//.test(s) ? 'Safari' : '';
  const mobile = /iPhone|Android.*Mobile|Mobile/.test(s) || os === 'iOS';
  return { name: [br, os].filter(Boolean).join(' روی ') || 'دستگاه ناشناس', icon: mobile ? '📱' : '💻' };
}
