import type { NextConfig } from 'next';
import path from 'node:path';

/**
 * Server Actionها (از جمله «ورود») فقط وقتی اجرا می‌شوند که آدرس مرورگر (Origin) با آدرسی که سرور دریافت می‌کند یکی باشد.
 * پشت بعضی تونل‌ها (Pinggy، localhost.run، …) سرور آدرس عمومی را نمی‌بیند؛ نتیجه: با زدن «ورود» صفحه فقط رفرش می‌شود.
 * این فهرست آدرس‌های رایجِ تونل را مجاز می‌کند. آدرس‌های دیگر (مثل دامنه‌ی خودتان پشت پروکسی) را در ALLOWED_ORIGINS
 * بنویسید (با ویرگول جدا کنید). روی سرور نهایی بهتر است تونل‌ها را با ALLOW_TUNNEL_ORIGINS=0 (هنگام build) خاموش کنید.
 */
const TUNNEL_ORIGINS = [
  '*.trycloudflare.com', '*.pinggy.link', '**.pinggy.link', '*.pinggy.io', '**.pinggy.io', '*.pinggy-free.link', '**.pinggy-free.link',
  '*.lhr.life', '*.localhost.run', '*.loca.lt', '*.ngrok-free.app', '*.ngrok.app', '*.ngrok.io', '*.serveousercontent.com', '*.tunnelmole.net',
];
const extraOrigins = (process.env.ALLOWED_ORIGINS ?? '').split(',').map((x) => x.trim()).filter(Boolean);
const allowedOrigins = [...extraOrigins, ...(process.env.ALLOW_TUNNEL_ORIGINS === '0' ? [] : TUNNEL_ORIGINS)];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // پیوست‌ها (اطلاعیه، پیام، تکلیف): تا ۵ فایل، هرکدام ۲۵ مگابایت و جمعاً ۵۰ مگابایت
  experimental: { serverActions: { bodySizeLimit: '55mb', allowedOrigins } },
  reactStrictMode: true,
  // باز کردن سایتِ در حال توسعه از گوشی در همان شبکه (مثلاً http://192.168.1.20:3000)
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*', '172.16.*.*', '*.local'],
  // جلوگیری از هشدار «lockfile در پوشه‌ی بالاتر» روی ویندوز
  turbopack: { root: path.resolve(__dirname) },
  serverExternalPackages: ['@libsql/client', 'libsql', 'bcryptjs', 'exceljs'],
};
export default nextConfig;
