import Link from 'next/link';
export default function NotFound() {
  return (<main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', textAlign: 'center', padding: 24 }}><div><h1 style={{ fontSize: '3rem' }}>۴۰۴</h1><p className="muted" style={{ margin: '8px 0 18px' }}>صفحه‌ی موردنظر پیدا نشد.</p><Link className="btn" href="/dashboard">بازگشت به داشبورد</Link></div></main>);
}
