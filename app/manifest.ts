import type { MetadataRoute } from 'next';
/** مشخصات نصب برنامه (PWA) */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/', name: 'مدرسه‌یار', short_name: 'مدرسه‌یار', description: 'سامانه‌ی مدرسه: نمرات، حضور و غیاب، گزارش مطالعه، پیام‌ها و تکالیف',
    start_url: '/dashboard', scope: '/', display: 'standalone', display_override: ['standalone', 'minimal-ui'], dir: 'rtl', lang: 'fa',
    background_color: '#f4f6fb', theme_color: '#4f46e5', categories: ['education', 'productivity'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'پیام‌ها', short_name: 'پیام‌ها', url: '/messages', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'گزارش مطالعه', short_name: 'مطالعه', url: '/study', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'نمرات', short_name: 'نمرات', url: '/grades', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
    ],
  };
}
