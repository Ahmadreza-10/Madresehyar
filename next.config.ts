import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // پیوست‌ها (اطلاعیه، پیام، تکلیف): تا ۵ فایل، هرکدام ۲۵ مگابایت و جمعاً ۵۰ مگابایت
  experimental: { serverActions: { bodySizeLimit: '55mb' } },
  reactStrictMode: true,
  // باز کردن سایتِ در حال توسعه از گوشی در همان شبکه (مثلاً http://192.168.1.20:3000)
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*', '172.16.*.*', '*.local'],
  // جلوگیری از هشدار «lockfile در پوشه‌ی بالاتر» روی ویندوز
  turbopack: { root: path.resolve(__dirname) },
  serverExternalPackages: ['@libsql/client', 'libsql', 'bcryptjs'],
};
export default nextConfig;
