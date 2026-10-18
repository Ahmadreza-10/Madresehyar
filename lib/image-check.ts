/** تشخیص نوع تصویر از روی «بایت‌های ابتدایی» (نه نام فایل و نه نوع اعلام‌شده‌ی کاربر) */
export function sniffImage(buf: Uint8Array): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 && buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a) return 'image/png';
  const tag = (o: number, t: string) => [...t].every((c, i) => buf[o + i] === c.charCodeAt(0));
  if (tag(0, 'RIFF') && tag(8, 'WEBP')) return 'image/webp';
  return null;
}
export const MAX_AVATAR_BYTES = 400 * 1024;
/** شماره‌ی موبایل ایران را به شکل ۰۹xxxxxxxxx نرمال می‌کند؛ نامعتبر = null */
export function normalizeMobile(raw: string): string | null {
  const d = raw.replace(/[۰-۹]/g, (c) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/[٠-٩]/g, (c) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace(/[\s\-()]/g, '');
  const m = d.match(/^(?:\+98|0098|98|0)?(9\d{9})$/);
  return m ? '0' + m[1] : null;
}

/** پیوست تکلیف: عکس یا PDF (از روی بایت‌های ابتدایی) */
export function sniffAttachment(buf: Uint8Array): 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf' | null {
  const img = sniffImage(buf); if (img) return img;
  if (buf.length >= 5 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46 && buf[4] === 0x2d) return 'application/pdf';
  return null;
}
export const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;
export const MAX_ATTACHMENTS = 3;
