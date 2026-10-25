import '@fontsource-variable/vazirmatn/index.css';
import './globals.css';
import type { Metadata, Viewport } from 'next';
import { BOOT_SCRIPT } from '@/lib/prefs';

/** رویداد «قابل نصب بودن» مرورگر یک بار و خیلی زود پخش می‌شود؛ اینجا نگه داشته می‌شود تا دکمه‌ی نصب بعداً به آن دسترسی داشته باشد */
const BIP_SCRIPT = "window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__bip=e;});";
import PwaRegister from '@/components/PwaRegister';

export const metadata: Metadata = { title: { default: 'مدرسه‌یار', template: '%s | مدرسه‌یار' }, description: 'سامانه‌ی مدیریت مدرسه، نمرات، حضور و غیاب و گزارش مطالعه‌ی روزانه',
  applicationName: 'مدرسه‌یار', icons: { icon: '/icons/icon-192.png', apple: '/icons/apple-touch-icon.png' },
  appleWebApp: { capable: true, title: 'مدرسه‌یار', statusBarStyle: 'default' }, formatDetection: { telephone: false } };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: [{ media: '(prefers-color-scheme: light)', color: '#4f46e5' }, { media: '(prefers-color-scheme: dark)', color: '#0b1020' }] };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="fa" dir="rtl" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} /><script dangerouslySetInnerHTML={{ __html: BIP_SCRIPT }} /></head><body>{children}<PwaRegister /></body></html>);
}
