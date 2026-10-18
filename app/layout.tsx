import '@fontsource-variable/vazirmatn/index.css';
import './globals.css';
import type { Metadata, Viewport } from 'next';
import { BOOT_SCRIPT } from '@/lib/prefs';

export const metadata: Metadata = { title: { default: 'مدرسه‌یار', template: '%s | مدرسه‌یار' }, description: 'سامانه‌ی مدیریت مدرسه، نمرات، حضور و غیاب و گزارش مطالعه‌ی روزانه' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="fa" dir="rtl" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} /></head><body>{children}</body></html>);
}
