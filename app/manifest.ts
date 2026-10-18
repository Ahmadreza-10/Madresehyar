import type { MetadataRoute } from 'next';
/** برای نصب سایت روی گوشی/لپ‌تاپ (PWA)؛ روی iOS دریافت اعلان فقط بعد از «افزودن به صفحه‌ی اصلی» ممکن است */
export default function manifest(): MetadataRoute.Manifest {
  return { name: 'مدرسه‌یار', short_name: 'مدرسه‌یار', description: 'سامانه‌ی مدرسه: نمرات، حضور و غیاب، گزارش مطالعه', start_url: '/dashboard', scope: '/', display: 'standalone', dir: 'rtl', lang: 'fa', background_color: '#f4f6fb', theme_color: '#4f46e5',
    icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }, { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }] };
}
