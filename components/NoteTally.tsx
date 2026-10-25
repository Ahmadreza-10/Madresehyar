import { fa } from '@/lib/format';

/** جمع کل مثبت‌ها و منفی‌ها و نتیجه‌ی نهایی (هر منفی یک مثبت را پاک می‌کند) */
export default function NoteTally({ praise, negative, label }: { praise: number; negative: number; label?: string }) {
  const left = praise - negative;
  return (
    <div className="tally" aria-label="جمع مثبت و منفی">
      {label && <div className="muted small">{label}</div>}
      <div className="tally-row"><span>تعداد کل مثبت‌ها</span><b className="num pos">{fa(praise)}</b></div>
      <div className="tally-row"><span>تعداد کل منفی‌ها</span><b className="num neg">{fa(negative)}</b></div>
      <div className="tally-note">هر منفی یک مثبت را پاک می‌کند: {fa(praise)} − {fa(negative)} = {fa(Math.abs(left))}</div>
      <div className={`tally-final ${left > 0 ? 'pos' : left < 0 ? 'neg' : ''}`}>{left > 0 ? `✅ در پایان: ${fa(left)} مثبت باقی می‌ماند` : left < 0 ? `⚠️ در پایان: ${fa(-left)} منفی باقی می‌ماند` : '⚖️ در پایان: مثبت و منفی برابر است (صفر)'}</div>
    </div>
  );
}
