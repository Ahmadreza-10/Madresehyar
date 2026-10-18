'use client';
export default function PrintButton({ label = 'چاپ / ذخیره PDF' }: { label?: string }) {
  return <button type="button" className="btn ghost sm" onClick={() => window.print()}>{label}</button>;
}
