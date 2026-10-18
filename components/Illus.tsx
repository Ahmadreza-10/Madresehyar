import { useId, type ReactNode } from 'react';

/** تصویرسازی‌های اورجینال سایت (SVG): هر بخش یک تصویر رنگی دارد. بدون وابستگی به اینترنت. */
export type IllusName =
  | 'grades' | 'report' | 'attendance' | 'messages' | 'schedule' | 'assignments' | 'study' | 'discipline'
  | 'announcements' | 'students' | 'users' | 'school' | 'settings' | 'log' | 'note' | 'empty' | 'advisor' | 'teacher' | 'help';

/** رنگ شاخص هر بخش (برای کاشی‌ها، آیکن منو و سربرگ صفحه) */
export const ACCENT: Record<IllusName, string> = {
  grades: '#3b82f6', report: '#6366f1', attendance: '#f97316', messages: '#14b8a6', schedule: '#a855f7', assignments: '#ec4899',
  study: '#22c55e', discipline: '#eab308', announcements: '#ef4444', students: '#0ea5e9', users: '#64748b', school: '#84cc16',
  settings: '#6b7280', log: '#d97706', note: '#eab308', empty: '#94a3b8', advisor: '#8b5cf6', teacher: '#10b981', help: '#0891b2',
};

const g = (id: string, a: string, b: string) => (
  <linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={a} /><stop offset="1" stopColor={b} /></linearGradient>
);
const Shadow = () => <ellipse cx="50" cy="92" rx="27" ry="4" fill="#0f172a" opacity=".12" />;
const star = (cx: number, cy: number, ro: number, ri: number) =>
  Array.from({ length: 10 }, (_, i) => { const a = (-90 + i * 36) * (Math.PI / 180); const r = i % 2 ? ri : ro; return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`; }).join(' ');

const makeArt = (P: string): Record<IllusName, ReactNode> => ({
  grades: (<>
    <defs>{g(`${P}-ig-g`, '#60a5fa', '#2563eb')}</defs><Shadow />
    <rect x="22" y="12" width="56" height="76" rx="9" fill={`url(#${P}-ig-g)`} />
    <rect x="29" y="22" width="42" height="60" rx="5" fill="#fff" />
    <rect x="38" y="7" width="24" height="13" rx="6" fill="#1e3a8a" /><circle cx="50" cy="11" r="3" fill="#bfdbfe" />
    {[34, 46, 58].map((y) => (<g key={y}><path d={`M34 ${y} l3 3 l6 -6`} stroke="#16a34a" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" /><path d={`M50 ${y} h14`} stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" /></g>))}
    <g transform="rotate(-14 60 72)"><circle cx="60" cy="72" r="11" fill="#fff" stroke="#ef4444" strokeWidth="2.2" /><text x="60" y="76.5" textAnchor="middle" fontSize="12" fontWeight="800" fill="#ef4444" fontFamily="inherit">۲۰</text></g>
  </>),
  report: (<>
    <defs>{g(`${P}-ig-r`, '#a78bfa', '#6d28d9')}{g(`${P}-ig-r2`, '#fcd34d', '#f59e0b')}</defs><Shadow />
    <rect x="12" y="18" width="76" height="56" rx="9" fill={`url(#${P}-ig-r)`} /><rect x="19" y="25" width="62" height="42" rx="5" fill="#fff" />
    <rect x="27" y="33" width="34" height="4.5" rx="2.2" fill="#c4b5fd" /><rect x="27" y="43" width="26" height="3.5" rx="1.8" fill="#e5e7eb" /><rect x="27" y="51" width="30" height="3.5" rx="1.8" fill="#e5e7eb" />
    <path d="M59 74 L54 93 L64 87 L67 76z" fill="#ef4444" /><path d="M69 76 L72 87 L82 93 L77 74z" fill="#f87171" />
    <circle cx="68" cy="64" r="14" fill={`url(#${P}-ig-r2)`} stroke="#fff" strokeWidth="2.5" />
    <polygon points={star(68, 64, 8, 3.6)} fill="#fff" />
  </>),
  attendance: (<>
    <defs>{g(`${P}-ig-a`, '#fbbf24', '#f97316')}</defs><Shadow />
    <circle cx="50" cy="50" r="38" fill={`url(#${P}-ig-a)`} /><circle cx="50" cy="50" r="30" fill="#fff" />
    {[[50, 27], [73, 50], [50, 73], [27, 50]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="2.2" fill="#fdba74" />)}
    <path d="M50 50 V33" stroke="#1f2937" strokeWidth="3.4" strokeLinecap="round" /><path d="M50 50 L63 57" stroke="#f97316" strokeWidth="3.4" strokeLinecap="round" />
    <circle cx="50" cy="50" r="3.6" fill="#1f2937" />
    <circle cx="77" cy="77" r="14" fill="#22c55e" stroke="#fff" strokeWidth="3" /><path d="M70 77 l5 5 l9 -10" stroke="#fff" strokeWidth="3.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </>),
  messages: (<>
    <defs>{g(`${P}-ig-m`, '#2dd4bf', '#0d9488')}{g(`${P}-ig-m2`, '#fde68a', '#fbbf24')}</defs><Shadow />
    <rect x="8" y="14" width="56" height="40" rx="13" fill={`url(#${P}-ig-m)`} /><path d="M22 54 L18 69 L38 54z" fill="#0d9488" />
    {[25, 36, 47].map((x) => <circle key={x} cx={x} cy="34" r="3.4" fill="#fff" />)}
    <rect x="36" y="42" width="56" height="38" rx="13" fill={`url(#${P}-ig-m2)`} /><path d="M76 80 L84 92 L64 80z" fill="#fbbf24" />
    <rect x="47" y="54" width="34" height="4.5" rx="2.2" fill="#fff" opacity=".95" /><rect x="47" y="64" width="22" height="4.5" rx="2.2" fill="#fff" opacity=".95" />
  </>),
  schedule: (<>
    <defs>{g(`${P}-ig-s`, '#c084fc', '#7e22ce')}</defs><Shadow />
    <rect x="12" y="18" width="76" height="70" rx="13" fill="#fff" stroke="#e9d5ff" strokeWidth="2" />
    <path d="M12 42 V31 A13 13 0 0 1 25 18 H75 A13 13 0 0 1 88 31 V42 Z" fill={`url(#${P}-ig-s)`} />
    <rect x="30" y="9" width="7" height="17" rx="3.5" fill="#581c87" /><rect x="63" y="9" width="7" height="17" rx="3.5" fill="#581c87" />
    {[0, 1, 2].flatMap((r) => [0, 1, 2, 3].map((c) => <rect key={`${r}${c}`} x={20 + c * 17} y={50 + r * 12} width="11" height="8" rx="2.5" fill={r === 1 && c === 1 ? '#f97316' : r === 0 && c === 3 ? '#a855f7' : '#f3e8ff'} />))}
  </>),
  assignments: (<>
    <defs>{g(`${P}-ig-t`, '#f9a8d4', '#db2777')}{g(`${P}-ig-t2`, '#fde047', '#f59e0b')}</defs><Shadow />
    <rect x="18" y="12" width="54" height="78" rx="9" fill={`url(#${P}-ig-t)`} /><rect x="27" y="18" width="40" height="66" rx="4" fill="#fff" />
    {[24, 38, 52, 66, 80].map((y) => <rect key={y} x="13" y={y - 3} width="14" height="6" rx="3" fill="#831843" />)}
    {[30, 42, 54, 66].map((y) => <rect key={y} x="33" y={y} width="28" height="3.6" rx="1.8" fill="#fbcfe8" />)}
    <g transform="rotate(32 72 60)"><rect x="66" y="28" width="12" height="46" rx="2.5" fill={`url(#${P}-ig-t2)`} /><rect x="66" y="23" width="12" height="8" rx="3" fill="#f472b6" /><path d="M66 74 L72 90 L78 74z" fill="#fcd9a8" /><path d="M69.8 85 L72 90 L74.2 85z" fill="#1f2937" /></g>
  </>),
  study: (<>
    <defs>{g(`${P}-ig-b`, '#4ade80', '#16a34a')}</defs><Shadow />
    <path d="M8 38 L50 49 L92 38 V80 L50 91 L8 80Z" fill={`url(#${P}-ig-b)`} />
    <path d="M14 33 Q33 28 50 40 V84 Q33 73 14 78Z" fill="#fff" /><path d="M86 33 Q67 28 50 40 V84 Q67 73 86 78Z" fill="#f0fdf4" />
    {[48, 58, 68].map((y, i) => (<g key={y}><path d={`M21 ${y} Q31 ${y - 3} ${41 - i * 2} ${y + 4}`} stroke="#bbf7d0" strokeWidth="3" fill="none" strokeLinecap="round" /><path d={`M79 ${y} Q69 ${y - 3} ${59 + i * 2} ${y + 4}`} stroke="#dcfce7" strokeWidth="3" fill="none" strokeLinecap="round" /></g>))}
    <circle cx="50" cy="19" r="10" fill="#fde047" /><rect x="45.5" y="28" width="9" height="5" rx="2" fill="#a3a3a3" />
    <path d="M50 3 V6 M35 9 L37 11.5 M65 9 L63 11.5 M30 22 H33 M67 22 H70" stroke="#fbbf24" strokeWidth="2.2" strokeLinecap="round" />
  </>),
  discipline: (<>
    <defs>{g(`${P}-ig-d`, '#fde047', '#f59e0b')}</defs><Shadow />
    <circle cx="50" cy="46" r="40" fill="#fef3c7" />
    <polygon points={star(50, 46, 29, 12.5)} fill={`url(#${P}-ig-d)`} stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
    <circle cx="20" cy="80" r="12" fill="#22c55e" stroke="#fff" strokeWidth="3" /><path d="M14.5 80 h11 M20 74.5 v11" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" />
    <circle cx="80" cy="80" r="12" fill="#ef4444" stroke="#fff" strokeWidth="3" /><path d="M74.5 80 h11" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" />
  </>),
  announcements: (<>
    <defs>{g(`${P}-ig-n`, '#fb7185', '#e11d48')}</defs><Shadow />
    <rect x="8" y="38" width="16" height="24" rx="6" fill="#9f1239" /><path d="M20 38 L60 20 V80 L20 62Z" fill={`url(#${P}-ig-n)`} />
    <ellipse cx="60" cy="50" rx="7" ry="30" fill="#fda4af" /><path d="M26 62 L32 82 H43 L38 67Z" fill="#fbbf24" />
    <path d="M76 36 Q86 50 76 64" stroke="#f97316" strokeWidth="4" fill="none" strokeLinecap="round" /><path d="M84 26 Q99 50 84 74" stroke="#fbbf24" strokeWidth="4" fill="none" strokeLinecap="round" />
  </>),
  students: (<>
    <Shadow />
    <rect x="8" y="56" width="40" height="36" rx="16" fill="#38bdf8" /><circle cx="28" cy="42" r="16" fill="#fcd9b6" />
    <path d="M12 41 Q13 22 28 23 Q43 22 44 41 Q36 31 28 32 Q20 31 12 41Z" fill="#1f2937" />
    <circle cx="22.5" cy="45" r="2" fill="#1f2937" /><circle cx="33.5" cy="45" r="2" fill="#1f2937" /><path d="M23.5 51 Q28 55.5 32.5 51" stroke="#b45309" strokeWidth="2" fill="none" strokeLinecap="round" />
    <rect x="52" y="62" width="40" height="30" rx="15" fill="#f472b6" /><circle cx="72" cy="48" r="15" fill="#fde2c8" />
    <circle cx="56" cy="44" r="7" fill="#92400e" /><circle cx="88" cy="44" r="7" fill="#92400e" />
    <path d="M57 46 Q58 30 72 31 Q86 30 87 46 Q79 40 72 40 Q65 40 57 46Z" fill="#92400e" />
    <circle cx="66.5" cy="50" r="2" fill="#1f2937" /><circle cx="77.5" cy="50" r="2" fill="#1f2937" /><path d="M67.5 56 Q72 60 76.5 56" stroke="#b45309" strokeWidth="2" fill="none" strokeLinecap="round" />
  </>),
  users: (<>
    <defs>{g(`${P}-ig-u`, '#94a3b8', '#475569')}</defs><Shadow />
    <path d="M50 8 L86 21 V48 C86 69 69 83 50 91 C31 83 14 69 14 48 V21Z" fill={`url(#${P}-ig-u)`} />
    <path d="M50 17 L78 27 V48 C78 63 66 74 50 81 C34 74 22 63 22 48 V27Z" fill="#e2e8f0" />
    <circle cx="50" cy="42" r="9.5" fill="#475569" /><path d="M32 67 C32 53 68 53 68 67Z" fill="#475569" />
  </>),
  school: (<>
    <Shadow />
    <path d="M50 14 V3" stroke="#475569" strokeWidth="2.2" /><path d="M50 3 L66 8 L50 13z" fill="#22c55e" />
    <path d="M8 42 L50 14 L92 42Z" fill="#ef4444" /><rect x="16" y="42" width="68" height="46" rx="4" fill="#fff7ed" stroke="#fed7aa" strokeWidth="2" />
    <circle cx="50" cy="34" r="6" fill="#fff" stroke="#475569" strokeWidth="1.6" /><path d="M50 34 V30.5 M50 34 L52.5 35.5" stroke="#475569" strokeWidth="1.4" strokeLinecap="round" />
    <rect x="24" y="52" width="14" height="14" rx="3" fill="#7dd3fc" /><rect x="62" y="52" width="14" height="14" rx="3" fill="#7dd3fc" />
    <rect x="42" y="60" width="16" height="28" rx="4" fill="#92400e" /><circle cx="54" cy="75" r="1.4" fill="#fde68a" />
  </>),
  settings: (<>
    <defs>{g(`${P}-ig-x`, '#cbd5e1', '#64748b')}</defs><Shadow />
    {[0, 45, 90, 135].map((a) => <rect key={a} x="43" y="8" width="14" height="76" rx="6" fill={`url(#${P}-ig-x)`} transform={`rotate(${a} 50 46)`} />)}
    <circle cx="50" cy="46" r="29" fill={`url(#${P}-ig-x)`} /><circle cx="50" cy="46" r="13" fill="#f1f5f9" /><circle cx="50" cy="46" r="5" fill="#94a3b8" />
  </>),
  log: (<>
    <defs>{g(`${P}-ig-l`, '#fcd34d', '#d97706')}</defs><Shadow />
    <rect x="16" y="9" width="52" height="72" rx="8" fill="#fff" stroke={`url(#${P}-ig-l)`} strokeWidth="4" />
    {[24, 36, 48, 60].map((y) => <rect key={y} x="26" y={y} width={y === 60 ? 20 : 32} height="4" rx="2" fill="#fde68a" />)}
    <circle cx="66" cy="64" r="15" fill="#e0f2fe" fillOpacity=".85" stroke="#d97706" strokeWidth="5" /><path d="M77 76 L90 89" stroke="#92400e" strokeWidth="7" strokeLinecap="round" />
  </>),
  note: (<>
    <Shadow />
    <g transform="rotate(-6 50 50)"><rect x="16" y="12" width="68" height="72" rx="8" fill="#fde047" /><path d="M84 62 V76 A8 8 0 0 1 76 84 H62 Z" fill="#facc15" />
      {[28, 40, 52].map((y) => <rect key={y} x="26" y={y} width={y === 52 ? 24 : 44} height="4.5" rx="2.2" fill="#ca8a04" opacity=".55" />)}</g>
    <circle cx="50" cy="12" r="6" fill="#ef4444" stroke="#fff" strokeWidth="2" />
  </>),
  advisor: (<>
    <defs>{g(`${P}-ig-v`, '#fde68a', '#f59e0b')}{g(`${P}-ig-v2`, '#a78bfa', '#6d28d9')}</defs><Shadow />
    <circle cx="46" cy="40" r="30" fill={`url(#${P}-ig-v)`} /><circle cx="46" cy="40" r="22" fill="#fffbeb" />
    <path d="M36 42 Q40 30 46 42 Q52 54 56 38" stroke="#f59e0b" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="35" y="66" width="22" height="9" rx="4" fill="#94a3b8" /><rect x="39" y="75" width="14" height="6" rx="3" fill="#64748b" />
    <path d="M46 4 V9 M20 14 L24 18 M72 14 L68 18 M10 40 H15 M77 40 H82" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" />
    <rect x="58" y="58" width="36" height="26" rx="10" fill={`url(#${P}-ig-v2)`} /><path d="M68 84 L66 93 L78 84z" fill="#6d28d9" />
    {[67, 76, 85].map((x) => <circle key={x} cx={x} cy="71" r="2.6" fill="#fff" />)}
  </>),
  teacher: (<>
    <defs>{g(`${P}-ig-te`, '#34d399', '#047857')}</defs><Shadow />
    <rect x="8" y="12" width="84" height="56" rx="7" fill="#a16207" /><rect x="14" y="18" width="72" height="44" rx="4" fill={`url(#${P}-ig-te)`} />
    <path d="M22 30 H52 M22 40 H44 M22 50 H58" stroke="#ecfdf5" strokeWidth="3" strokeLinecap="round" opacity=".9" /><path d="M62 28 L76 42 M76 28 L62 42" stroke="#fde68a" strokeWidth="3.4" strokeLinecap="round" />
    <rect x="8" y="68" width="84" height="5" rx="2.5" fill="#854d0e" /><rect x="70" y="62" width="14" height="6" rx="3" fill="#fff" />
    <circle cx="24" cy="84" r="8" fill="#ef4444" /><path d="M24 76 Q27 72 30 74" stroke="#15803d" strokeWidth="2.2" fill="none" strokeLinecap="round" />
  </>),
  help: (<>
    <defs>{g(`${P}-ig-h`, '#22d3ee', '#0e7490')}</defs><Shadow />
    <path d="M20 56 V46 Q20 18 50 18 Q80 18 80 46 V56" fill="none" stroke="#334155" strokeWidth="7" strokeLinecap="round" />
    <rect x="12" y="46" width="18" height="28" rx="9" fill={`url(#${P}-ig-h)`} /><rect x="70" y="46" width="18" height="28" rx="9" fill={`url(#${P}-ig-h)`} />
    <path d="M79 72 Q79 86 62 86" fill="none" stroke="#334155" strokeWidth="4.5" strokeLinecap="round" /><rect x="50" y="81" width="16" height="9" rx="4.5" fill="#f59e0b" />
    <circle cx="50" cy="48" r="13" fill="#fff" /><text x="50" y="55" textAnchor="middle" fontSize="19" fontWeight="800" fill="#0e7490">?</text>
  </>),
  empty: (<>
    <Shadow />
    <path d="M14 44 L50 30 L86 44 L50 58Z" fill="#fde68a" /><path d="M14 44 V72 L50 88 V58Z" fill="#fbbf24" /><path d="M86 44 V72 L50 88 V58Z" fill="#f59e0b" />
    <path d="M50 30 L40 14 M50 30 L50 10 M50 30 L62 16" stroke="#94a3b8" strokeWidth="2.6" strokeLinecap="round" /><circle cx="40" cy="13" r="3" fill="#a78bfa" /><circle cx="50" cy="9" r="3" fill="#34d399" /><circle cx="62" cy="15" r="3" fill="#fb7185" />
  </>),
});

export function Illus({ name, size = 72, className = '' }: { name: IllusName; size?: number; className?: string }) {
  const P = 'i' + useId().replace(/[^a-zA-Z0-9]/g, ''); // شناسه‌ی یکتا برای هر نمونه (وگرنه نمونه‌های مخفی گرادیان نمونه‌های دیده‌شده را خراب می‌کنند)
  return <svg viewBox="0 0 100 100" width={size} height={size} className={`illus ${className}`} aria-hidden="true" focusable="false">{makeArt(P)[name]}</svg>;
}

/** «هوشی»، جغد فارغ‌التحصیلِ سایت */
export function Mascot({ size = 140, className = '' }: { size?: number; className?: string }) {
  const P = 'm' + useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className={`mascot ${className}`} aria-hidden="true" focusable="false">
      <defs>{g(`${P}-b`, '#818cf8', '#4f46e5')}</defs>
      <ellipse cx="60" cy="111" rx="32" ry="5" fill="#0f172a" opacity=".12" />
      <g className="mascot-wing"><path d="M91 68 Q110 60 108 84 Q98 88 91 82Z" fill="#6366f1" /></g>
      <path d="M29 70 Q10 62 12 86 Q22 90 29 84Z" fill="#6366f1" />
      <ellipse cx="60" cy="72" rx="37" ry="38" fill={`url(#${P}-b)`} /><ellipse cx="60" cy="82" rx="24" ry="25" fill="#e0e7ff" />
      <path d="M44 74 q3 4 6 0 M54 74 q3 4 6 0 M64 74 q3 4 6 0 M49 84 q3 4 6 0 M59 84 q3 4 6 0" stroke="#c7d2fe" strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="46" cy="58" r="14" fill="#fff" /><circle cx="74" cy="58" r="14" fill="#fff" />
      <g className="mascot-eyes"><circle cx="48" cy="60" r="6.5" fill="#1e1b4b" /><circle cx="72" cy="60" r="6.5" fill="#1e1b4b" /><circle cx="50" cy="57.5" r="2.2" fill="#fff" /><circle cx="74" cy="57.5" r="2.2" fill="#fff" /></g>
      <path d="M54.5 66 L65.5 66 L60 75Z" fill="#fbbf24" /><circle cx="33" cy="70" r="5" fill="#fda4af" opacity=".7" /><circle cx="87" cy="70" r="5" fill="#fda4af" opacity=".7" />
      <path d="M26 33 L60 17 L94 33 L60 47Z" fill="#1e1b4b" /><path d="M42 40 V52 Q60 60 78 52 V40" fill="#312e81" />
      <path d="M94 33 L99 50" stroke="#fbbf24" strokeWidth="2.6" strokeLinecap="round" /><circle cx="99.5" cy="52" r="3.8" fill="#fbbf24" />
      <ellipse cx="48" cy="109" rx="9" ry="4" fill="#fbbf24" /><ellipse cx="72" cy="109" rx="9" ry="4" fill="#fbbf24" />
    </svg>
  );
}

import { ANIMAL_COUNT, animalAvatar } from './AnimalAvatars';
export const AVATAR_COUNT = 18; // ۶ پالت رنگی × ۳ مدل مو (آواتارِ خودکار فقط از همین‌ها انتخاب می‌شود)
export const AVATAR_TOTAL = AVATAR_COUNT + ANIMAL_COUNT; // ۱۸ آدمک + ۱۸ حیوان/شخصیت
export const PORTRAIT_COUNT = 20; // تصویرسازی‌ها: /public/avatars/pNN.webp
export const AVATAR_ALL = AVATAR_TOTAL + PORTRAIT_COUNT;
const PALETTES = [['#a5b4fc', '#6366f1', '#1f2937', '#fb7185'], ['#99f6e4', '#14b8a6', '#7c2d12', '#6366f1'], ['#fde68a', '#f59e0b', '#1f2937', '#14b8a6'], ['#fbcfe8', '#ec4899', '#451a03', '#6366f1'], ['#bae6fd', '#0ea5e9', '#3b0764', '#f97316'], ['#bbf7d0', '#22c55e', '#1f2937', '#a855f7']];
/** آواتار: عکس پروفایل (photoSrc)، یا آواتار آماده‌ی شماره‌دار (variant)، یا آواتار خودکار بر اساس نام */
export function Avatar({ name, size = 40, className = '', variant, photoSrc }: { name: string; size?: number; className?: string; variant?: number; photoSrc?: string }) {
  const uid = 'a' + useId().replace(/[^a-zA-Z0-9]/g, '');
  if (photoSrc) return <img src={photoSrc} alt="" width={size} height={size} className={`avatar-svg avatar-photo ${className}`} style={{ borderRadius: '50%', objectFit: 'cover', flex: 'none', width: size, height: size }} />;
  let h = 0; for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  if (variant !== undefined && variant >= AVATAR_TOTAL && variant < AVATAR_ALL) return <img src={`/avatars/p${String(variant - AVATAR_TOTAL).padStart(2, '0')}.webp`} alt="" width={size} height={size} loading="lazy" className={`avatar-svg avatar-photo ${className}`} style={{ borderRadius: '50%', objectFit: 'cover', flex: 'none', width: size, height: size }} />;
  if (variant !== undefined && variant >= AVATAR_COUNT && variant < AVATAR_TOTAL) return <svg viewBox="0 0 64 64" width={size} height={size} className={`avatar-svg ${className}`} aria-hidden="true" focusable="false" style={{ borderRadius: '50%', flex: 'none' }}>{animalAvatar(variant - AVATAR_COUNT, uid)}</svg>;
  const idx = variant !== undefined && variant >= 0 ? variant % AVATAR_COUNT : h % AVATAR_COUNT;
  const [bg1, bg2, hair, shirt] = PALETTES[idx % 6]; const v = Math.floor(idx / 6) % 3;
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={`avatar-svg ${className}`} aria-hidden="true" focusable="false" style={{ borderRadius: '50%', flex: 'none' }}>
      <defs><linearGradient id={uid} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={bg1} /><stop offset="1" stopColor={bg2} /></linearGradient></defs>
      <circle cx="32" cy="32" r="32" fill={`url(#${uid})`} />
      <path d="M10 66 Q12 46 32 46 Q52 46 54 66Z" fill={shirt} />
      {v === 1 && <><rect x="15" y="26" width="8" height="22" rx="4" fill={hair} /><rect x="41" y="26" width="8" height="22" rx="4" fill={hair} /></>}
      <circle cx="32" cy="30" r="14" fill="#fde2c8" />
      {v === 2 ? <><circle cx="21" cy="21" r="7" fill={hair} /><circle cx="32" cy="16" r="8" fill={hair} /><circle cx="43" cy="21" r="7" fill={hair} /></> : <path d="M18 29 Q17 14 32 14 Q47 14 46 29 Q40 21 32 22 Q24 21 18 29Z" fill={hair} />}
      <circle cx="26.5" cy="32" r="1.9" fill="#1f2937" /><circle cx="37.5" cy="32" r="1.9" fill="#1f2937" />
      <path d="M27 37.5 Q32 42 37 37.5" stroke="#b45309" strokeWidth="2" fill="none" strokeLinecap="round" /><circle cx="22.5" cy="36.5" r="2.2" fill="#fda4af" opacity=".6" /><circle cx="41.5" cy="36.5" r="2.2" fill="#fda4af" opacity=".6" />
    </svg>
  );
}

/** صحنه‌ی مدرسه برای صفحه‌ی ورود (ابرها و خورشید متحرک) */
export function SchoolScene({ className = '' }: { className?: string }) {
  const P = 's' + useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <svg viewBox="0 0 480 300" className={`scene ${className}`} aria-hidden="true" focusable="false">
      <defs><linearGradient id={`${P}-h`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#86efac" /><stop offset="1" stopColor="#22c55e" /></linearGradient></defs>
      <g className="scene-sun"><circle cx="400" cy="62" r="28" fill="#fde047" />{Array.from({ length: 10 }, (_, i) => <rect key={i} x="398" y="18" width="4" height="12" rx="2" fill="#fbbf24" transform={`rotate(${i * 36} 400 62)`} />)}</g>
      <g className="scene-cloud c1" fill="#fff" opacity=".95"><ellipse cx="90" cy="70" rx="38" ry="14" /><ellipse cx="116" cy="60" rx="26" ry="15" /><ellipse cx="68" cy="62" rx="22" ry="12" /></g>
      <g className="scene-cloud c2" fill="#fff" opacity=".8"><ellipse cx="290" cy="40" rx="30" ry="11" /><ellipse cx="310" cy="33" rx="20" ry="11" /></g>
      <ellipse cx="240" cy="310" rx="330" ry="78" fill={`url(#${P}-h)`} /><ellipse cx="90" cy="300" rx="150" ry="46" fill="#4ade80" opacity=".8" />
      <path d="M240 78 V42" stroke="#475569" strokeWidth="3" /><path className="scene-flag" d="M240 42 L270 51 L240 60z" fill="#ef4444" />
      <path d="M122 130 L240 76 L358 130Z" fill="#ef4444" /><path d="M86 176 L120 150 L160 176Z" fill="#f87171" /><path d="M320 176 L360 150 L394 176Z" fill="#f87171" />
      <rect x="140" y="130" width="200" height="124" rx="6" fill="#fff7ed" stroke="#fed7aa" strokeWidth="3" /><rect x="90" y="176" width="64" height="78" rx="5" fill="#ffedd5" /><rect x="326" y="176" width="64" height="78" rx="5" fill="#ffedd5" />
      <circle cx="240" cy="108" r="15" fill="#fff" stroke="#475569" strokeWidth="2.5" /><path d="M240 108 V98 M240 108 L247 112" stroke="#475569" strokeWidth="2.4" strokeLinecap="round" />
      {[162, 288].map((x) => <g key={x}><rect x={x} y="150" width="30" height="30" rx="5" fill="#7dd3fc" /><path d={`M${x + 15} 150 V180 M${x} 165 H${x + 30}`} stroke="#fff" strokeWidth="2" /><rect x={x} y="196" width="30" height="30" rx="5" fill="#7dd3fc" /><path d={`M${x + 15} 196 V226 M${x} 211 H${x + 30}`} stroke="#fff" strokeWidth="2" /></g>)}
      {[100, 342].map((x) => <g key={x}><rect x={x} y="194" width="22" height="26" rx="4" fill="#7dd3fc" /><path d={`M${x + 11} 194 V220`} stroke="#fff" strokeWidth="2" /></g>)}
      <rect x="216" y="188" width="48" height="66" rx="6" fill="#92400e" /><path d="M240 188 V254" stroke="#78350f" strokeWidth="2" /><circle cx="231" cy="224" r="2.4" fill="#fde68a" /><circle cx="249" cy="224" r="2.4" fill="#fde68a" />
      <rect x="204" y="252" width="72" height="8" rx="3" fill="#fdba74" /><rect x="196" y="259" width="88" height="8" rx="3" fill="#fb923c" />
      {[[48, 232], [436, 236]].map(([x, y]) => <g key={x}><rect x={x - 5} y={y} width="10" height="38" rx="4" fill="#92400e" /><circle cx={x} cy={y - 8} r="30" fill="#16a34a" /><circle cx={x - 16} cy={y + 2} r="20" fill="#22c55e" /><circle cx={x + 16} cy={y + 2} r="20" fill="#22c55e" /></g>)}
      {[[170, 276, '#f472b6'], [200, 282, '#fbbf24'], [282, 281, '#60a5fa'], [312, 275, '#f472b6']].map(([x, y, c]) => <g key={String(x)}><path d={`M${x} ${y} v10`} stroke="#15803d" strokeWidth="2" /><circle cx={x as number} cy={y as number} r="5" fill={c as string} /><circle cx={x as number} cy={y as number} r="1.8" fill="#fff" /></g>)}
    </svg>
  );
}

/** نشان (لوگو) رسمی‌تر برای صفحه‌ی ورود */
export function LogoMark({ size = 48 }: { size?: number }) {
  const P = 'lg' + useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" focusable="false">
      <defs><linearGradient id={`${P}-b`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#6366f1" /><stop offset="1" stopColor="#8b5cf6" /></linearGradient><linearGradient id={`${P}-y`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fde047" /><stop offset="1" stopColor="#f59e0b" /></linearGradient></defs>
      <rect width="64" height="64" rx="16" fill={`url(#${P}-b)`} />
      <path d="M32 15 L54 25 L32 35 L10 25Z" fill="#fff" /><path d="M19 30 V40 Q32 48 45 40 V30 L32 36Z" fill="#e0e7ff" />
      <path d="M54 25 V37" stroke={`url(#${P}-y)`} strokeWidth="2.4" strokeLinecap="round" /><circle cx="54" cy="39" r="2.6" fill={`url(#${P}-y)`} />
    </svg>
  );
}

/** تصویر صفحه‌ی ورود: کارت‌های شیشه‌ای داشبورد (نمودار، رتبه، یادآور) روی زمینه‌ی گرادیانی با طرح خطیِ ساختمان */
export function LoginArt({ className = '' }: { className?: string }) {
  const P = 'la' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const glass = { fill: '#fff', fillOpacity: 0.1, stroke: '#fff', strokeOpacity: 0.22 } as const;
  return (
    <svg viewBox="0 0 520 390" className={`login-art ${className}`} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${P}-a`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#a5b4fc" /><stop offset="1" stopColor="#67e8f9" /></linearGradient>
        <linearGradient id={`${P}-ar`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#a5b4fc" stopOpacity=".45" /><stop offset="1" stopColor="#a5b4fc" stopOpacity="0" /></linearGradient>
        <linearGradient id={`${P}-g`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fde047" /><stop offset="1" stopColor="#f59e0b" /></linearGradient>
        <pattern id={`${P}-p`} width="26" height="26" patternUnits="userSpaceOnUse"><path d="M26 0H0V26" fill="none" stroke="#fff" strokeOpacity=".07" /></pattern>
        <filter id={`${P}-bl`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="34" /></filter>
      </defs>
      <rect width="520" height="390" fill={`url(#${P}-p)`} />
      <circle cx="440" cy="70" r="80" fill="#7c3aed" opacity=".5" filter={`url(#${P}-bl)`} /><circle cx="70" cy="330" r="90" fill="#06b6d4" opacity=".35" filter={`url(#${P}-bl)`} />
      {/* طرح خطیِ ساختمان مدرسه */}
      <g stroke="#fff" strokeOpacity=".16" strokeWidth="2" fill="none" strokeLinejoin="round"><path d="M150 372 V300 H370 V372 M130 300 L260 236 L390 300 M190 300 V372 M230 300 V372 M290 300 V372 M330 300 V372 M120 372 H400" /><circle cx="260" cy="272" r="11" /></g>
      {/* کارت اصلی */}
      <g>
        <rect x="64" y="52" width="392" height="246" rx="24" {...glass} />
        {[92, 108, 124].map((x) => <circle key={x} cx={x} cy="78" r="4.5" fill="#fff" fillOpacity=".5" />)}
        <text x="400" y="82" textAnchor="end" fontSize="13" fontWeight="700" fill="#fff" fillOpacity=".9" fontFamily="inherit">کارنامه‌ی هوشمند</text>
        <path d="M92 250 H300" stroke="#fff" strokeOpacity=".18" />
        <path d="M92 226 L128 208 L164 218 L200 172 L236 156 L272 124 L300 114 V250 H92Z" fill={`url(#${P}-ar)`} />
        <polyline className="trend-line" pathLength="1" points="92,226 128,208 164,218 200,172 236,156 272,124 300,114" fill="none" stroke={`url(#${P}-a)`} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {[[92, 226], [164, 218], [236, 156], [300, 114]].map(([x, y]) => <circle key={x} className="trend-dot" cx={x} cy={y} r="5" fill="#fff" />)}
        <g transform="translate(376 168)"><circle r="46" fill="none" stroke="#fff" strokeOpacity=".16" strokeWidth="12" /><circle className="art-ring" r="46" fill="none" stroke={`url(#${P}-a)`} strokeWidth="12" strokeLinecap="round" pathLength="100" strokeDasharray="91 100" transform="rotate(-90)" />
          <text y="6" textAnchor="middle" fontSize="26" fontWeight="800" fill="#fff" fontFamily="inherit">۱۸٫۲</text><text y="26" textAnchor="middle" fontSize="11" fill="#fff" fillOpacity=".7" fontFamily="inherit">معدل کل</text></g>
        {[[92, 270, 0.75], [92, 281, 0.55], [92, 292, 0.4]].map(([x, y, w], i) => <g key={i}><circle cx={x + 5} cy={y - 1} r="3" fill="#fff" fillOpacity=".55" /><rect x={x + 16} y={y - 5} width={w * 200} height="8" rx="4" fill="#fff" fillOpacity=".2" /></g>)}
        <g transform="translate(330 262)">{[0, 1, 2].map((i) => <rect key={i} x={i * 26} y={22 - [10, 20, 14][i]} width="16" height={[10, 20, 14][i]} rx="4" fill="#fff" fillOpacity={0.3 + i * 0.15} />)}</g>
      </g>
      {/* کارت‌های شناور */}
      <g className="art-float a"><rect x="14" y="20" width="120" height="68" rx="18" {...glass} /><circle cx="44" cy="54" r="16" fill={`url(#${P}-g)`} /><polygon points="44,44 47,51 54,52 49,57 50,64 44,60 38,64 39,57 34,52 41,51" fill="#fff" /><text x="122" y="50" textAnchor="end" fontSize="11" fill="#fff" fillOpacity=".75" fontFamily="inherit">رتبه در کلاس</text><text x="122" y="72" textAnchor="end" fontSize="20" fontWeight="800" fill="#fff" fontFamily="inherit">۱ از ۲۸</text></g>
      <g className="art-float b"><rect x="392" y="304" width="118" height="70" rx="18" {...glass} /><text x="500" y="332" textAnchor="end" fontSize="13" fontWeight="700" fill="#fff" fontFamily="inherit">یادآور مطالعه</text><text x="500" y="352" textAnchor="end" fontSize="10.5" fill="#fff" fillOpacity=".7" fontFamily="inherit">ساعت ۹ شب</text><g transform="translate(420 346)"><path d="M0 -13 a9 9 0 0 1 9 9 v6 l4 5 h-26 l4 -5 v-6 a9 9 0 0 1 9 -9z" fill="#fde047" /><circle cy="9" r="3.4" fill="#f59e0b" /></g></g>
      <g className="art-float c"><rect x="20" y="304" width="132" height="70" rx="18" {...glass} />{[0, 1, 2].map((i) => <g key={i}><circle cx="42" cy={324 + i * 16} r="6" fill="#34d399" /><path d={`M39 ${324 + i * 16} l2 2.4 l4 -4.4`} stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /><rect x="56" y={321 + i * 16} width={[70, 54, 62][i]} height="6" rx="3" fill="#fff" fillOpacity=".4" /></g>)}</g>
      <g className="art-float d"><rect x="404" y="6" width="106" height="52" rx="18" {...glass} /><text x="498" y="28" textAnchor="end" fontSize="10.5" fill="#fff" fillOpacity=".75" fontFamily="inherit">مطالعه‌ی امروز</text><text x="498" y="48" textAnchor="end" fontSize="17" fontWeight="800" fill="#fff" fontFamily="inherit">۱:۴۰</text></g>
    </svg>
  );
}
