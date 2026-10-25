import { NextResponse, type NextRequest } from 'next/server';

/**
 * دروازه‌ی همه‌ی درخواست‌ها (Next.js Proxy، همان Middleware):
 *  ۱) بدون نشست (کوکی ورود) فقط صفحات عمومی باز می‌شود؛ بقیه به ورود می‌روند. اعتبار واقعیِ نشست و نقش و مدرسه در هر صفحه/عمل سمت سرور هم بررسی می‌شود.
 *  ۲) هدرهای امنیتی روی همه‌ی پاسخ‌ها.
 */
const PUBLIC_PREFIXES = ['/login', '/register', '/features', '/avatars', '/icons', '/_next'];
const PUBLIC_EXACT = new Set(['/', '/manifest.webmanifest', '/sw.js', '/offline.html', '/favicon.ico', '/robots.txt', '/forgot']);

const dev = process.env.NODE_ENV !== 'production';
const CSP = [
  "default-src 'self'", `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''}`, "style-src 'self' 'unsafe-inline'", "img-src 'self' data: blob:", "font-src 'self' data:",
  `connect-src 'self'${dev ? ' ws: wss:' : ''}`, "worker-src 'self'", "manifest-src 'self'", "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'",
].join('; ');

function isPublic(path: string) {
  return PUBLIC_EXACT.has(path) || PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(p + '/')) || /\.(?:png|jpe?g|webp|svg|ico|css|js|map|woff2?|txt)$/.test(path);
}

function secure(res: NextResponse, https: boolean, path = '') {
  // مسیرهای دانلود پیوست، CSP سخت‌گیرانه‌ی (sandbox) خودشان را دارند و نباید بازنویسی شود
  if (!path.startsWith('/api/attachment/') && !path.startsWith('/api/assignment-file/')) res.headers.set('Content-Security-Policy', CSP);
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  res.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  res.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  if (https) res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  return res;
}

export function proxy(req: NextRequest) {
  const https = req.nextUrl.protocol === 'https:' || req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() === 'https';
  const path = req.nextUrl.pathname;
  if (!isPublic(path) && !req.cookies.get('school_session')?.value) {
    if (path.startsWith('/api/')) return secure(new NextResponse('unauthorized', { status: 401 }), https);
    return secure(NextResponse.redirect(new URL('/login', req.url)), https);
  }
  return secure(NextResponse.next(), https, path);
}

export const config = { matcher: ['/((?!_next/static|_next/image).*)'] };
