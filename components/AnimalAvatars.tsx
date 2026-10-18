import type { ReactNode } from 'react';

/** ۱۸ آواتار حیوان و شخصیت (طراحی اختصاصی، SVG ۶۴×۶۴). */
export const ANIMAL_COUNT = 18;
const BG: [string, string][] = [['#fed7aa', '#fb923c'], ['#fde68a', '#f59e0b'], ['#bfdbfe', '#60a5fa'], ['#e9d5ff', '#a78bfa'], ['#bbf7d0', '#4ade80'], ['#fbcfe8', '#f472b6'], ['#a5f3fc', '#22d3ee'], ['#fecaca', '#f87171'], ['#ddd6fe', '#818cf8']];
const Eyes = ({ y = 33, dx = 6, r = 2, c = '#1f2937' }: { y?: number; dx?: number; r?: number; c?: string }) => <><circle cx={32 - dx} cy={y} r={r} fill={c} /><circle cx={32 + dx} cy={y} r={r} fill={c} /><circle cx={32 - dx + 0.7} cy={y - 0.8} r={r * 0.35} fill="#fff" /><circle cx={32 + dx + 0.7} cy={y - 0.8} r={r * 0.35} fill="#fff" /></>;
const Smile = ({ y = 42 }: { y?: number }) => <path d={`M28 ${y} Q32 ${y + 3.5} 36 ${y}`} stroke="#7c2d12" strokeWidth="1.6" fill="none" strokeLinecap="round" />;
const Cheeks = ({ y = 39 }: { y?: number }) => <><circle cx="22" cy={y} r="2.4" fill="#fb7185" opacity=".45" /><circle cx="42" cy={y} r="2.4" fill="#fb7185" opacity=".45" /></>;
const Whisk = () => <path d="M10 36 H20 M10 40 L20 39 M54 36 H44 M54 40 L44 39" stroke="#78350f" strokeWidth="1" strokeLinecap="round" opacity=".6" />;

const ART: ((u: string) => ReactNode)[] = [
  // ۰ گربه
  () => <><path d="M15 30 L17 10 L28 21Z M49 30 L47 10 L36 21Z" fill="#f59e0b" /><path d="M18 26 L19 15 L25 21Z M46 26 L45 15 L39 21Z" fill="#fda4af" /><circle cx="32" cy="36" r="17" fill="#fbbf24" /><path d="M27 20 V25 M32 19 V25 M37 20 V25" stroke="#b45309" strokeWidth="2" strokeLinecap="round" /><Eyes y={34} /><path d="M30 39 H34 L32 41.5Z" fill="#f472b6" /><path d="M32 41.5 Q29 45 26 43 M32 41.5 Q35 45 38 43" stroke="#7c2d12" strokeWidth="1.4" fill="none" strokeLinecap="round" /><Whisk /></>,
  // ۱ سگ
  () => <><ellipse cx="15" cy="34" rx="7" ry="13" fill="#78350f" transform="rotate(12 15 34)" /><ellipse cx="49" cy="34" rx="7" ry="13" fill="#78350f" transform="rotate(-12 49 34)" /><circle cx="32" cy="34" r="16" fill="#d6a269" /><ellipse cx="32" cy="42" rx="9" ry="7" fill="#f5deb3" /><Eyes y={31} dx={7} /><ellipse cx="32" cy="38.5" rx="3.4" ry="2.4" fill="#1f2937" /><path d="M32 41 V43.5 M28.5 44 Q32 47 35.5 44" stroke="#1f2937" strokeWidth="1.4" fill="none" strokeLinecap="round" /><path d="M25 22 Q32 17 39 22" stroke="#b9854a" strokeWidth="3" fill="none" strokeLinecap="round" /></>,
  // ۲ خرس
  () => <><circle cx="18" cy="20" r="7" fill="#92400e" /><circle cx="46" cy="20" r="7" fill="#92400e" /><circle cx="18" cy="20" r="3.4" fill="#d6a269" /><circle cx="46" cy="20" r="3.4" fill="#d6a269" /><circle cx="32" cy="35" r="17" fill="#a16207" /><ellipse cx="32" cy="41" rx="8.5" ry="6.5" fill="#fde7c3" /><Eyes y={31} /><ellipse cx="32" cy="38" rx="3" ry="2.2" fill="#1f2937" /><Smile y={42.5} /></>,
  // ۳ پاندا
  () => <><circle cx="18" cy="20" r="7.5" fill="#111827" /><circle cx="46" cy="20" r="7.5" fill="#111827" /><circle cx="32" cy="35" r="17" fill="#fff" /><ellipse cx="25" cy="32" rx="5" ry="6.4" fill="#111827" transform="rotate(20 25 32)" /><ellipse cx="39" cy="32" rx="5" ry="6.4" fill="#111827" transform="rotate(-20 39 32)" /><circle cx="25.5" cy="32" r="2.1" fill="#fff" /><circle cx="38.5" cy="32" r="2.1" fill="#fff" /><circle cx="25.8" cy="32" r="1" fill="#111827" /><circle cx="38.2" cy="32" r="1" fill="#111827" /><ellipse cx="32" cy="39.5" rx="3" ry="2.2" fill="#111827" /><Smile y={43} /></>,
  // ۴ خرگوش
  () => <><ellipse cx="23" cy="14" rx="5" ry="13" fill="#f3f4f6" /><ellipse cx="41" cy="14" rx="5" ry="13" fill="#f3f4f6" /><ellipse cx="23" cy="15" rx="2.4" ry="9" fill="#fda4af" /><ellipse cx="41" cy="15" rx="2.4" ry="9" fill="#fda4af" /><circle cx="32" cy="38" r="16" fill="#f9fafb" /><Eyes y={36} /><path d="M30 41 H34 L32 43Z" fill="#f472b6" /><path d="M32 43 V45 M29 46 Q32 48 35 46" stroke="#9ca3af" strokeWidth="1.3" fill="none" strokeLinecap="round" /><Cheeks y={42} /></>,
  // ۵ روباه
  () => <><path d="M14 32 L15 10 L29 22Z M50 32 L49 10 L35 22Z" fill="#ea580c" /><path d="M18 26 L18.5 16 L25 22Z M46 26 L45.5 16 L39 22Z" fill="#1f2937" /><path d="M32 52 L15 36 Q14 24 32 24 Q50 24 49 36Z" fill="#f97316" /><path d="M15 36 Q24 50 32 52 Q40 50 49 36 Q40 42 32 42 Q24 42 15 36Z" fill="#fff" /><Eyes y={33} dx={7} /><circle cx="32" cy="46" r="2.2" fill="#1f2937" /></>,
  // ۶ شیر
  () => <><circle cx="32" cy="34" r="25" fill="#b45309" /><circle cx="32" cy="35" r="16" fill="#fbbf24" /><circle cx="20" cy="22" r="4.5" fill="#fbbf24" /><circle cx="44" cy="22" r="4.5" fill="#fbbf24" /><ellipse cx="32" cy="41" rx="7.5" ry="5.6" fill="#fde7c3" /><Eyes y={32} /><path d="M30 38 H34 L32 40Z" fill="#7c2d12" /><Smile y={42} /></>,
  // ۷ قورباغه
  () => <><circle cx="21" cy="21" r="8" fill="#4ade80" /><circle cx="43" cy="21" r="8" fill="#4ade80" /><ellipse cx="32" cy="38" rx="19" ry="15" fill="#22c55e" /><circle cx="21" cy="21" r="5" fill="#fff" /><circle cx="43" cy="21" r="5" fill="#fff" /><circle cx="21.5" cy="21.5" r="2.4" fill="#1f2937" /><circle cx="42.5" cy="21.5" r="2.4" fill="#1f2937" /><path d="M20 40 Q32 49 44 40" stroke="#14532d" strokeWidth="2" fill="none" strokeLinecap="round" /><circle cx="28" cy="33" r="1" fill="#14532d" /><circle cx="36" cy="33" r="1" fill="#14532d" /><Cheeks y={40} /></>,
  // ۸ پنگوئن
  () => <><ellipse cx="32" cy="38" rx="18" ry="19" fill="#1e293b" /><ellipse cx="32" cy="42" rx="12.5" ry="13.5" fill="#fff" /><circle cx="25" cy="31" r="5" fill="#fff" /><circle cx="39" cy="31" r="5" fill="#fff" /><circle cx="25.5" cy="31.5" r="2" fill="#111827" /><circle cx="38.5" cy="31.5" r="2" fill="#111827" /><path d="M27.5 37 H36.5 L32 43Z" fill="#fb923c" /><Cheeks y={38} /></>,
  // ۹ جغد
  () => <><path d="M16 26 L14 12 L26 20Z M48 26 L50 12 L38 20Z" fill="#92400e" /><ellipse cx="32" cy="36" rx="18" ry="17" fill="#b45309" /><circle cx="24" cy="32" r="8" fill="#fef3c7" /><circle cx="40" cy="32" r="8" fill="#fef3c7" /><circle cx="24" cy="32" r="3.6" fill="#1f2937" /><circle cx="40" cy="32" r="3.6" fill="#1f2937" /><circle cx="25" cy="31" r="1.2" fill="#fff" /><circle cx="41" cy="31" r="1.2" fill="#fff" /><path d="M29 38 H35 L32 44Z" fill="#fbbf24" /><path d="M24 48 Q32 53 40 48" stroke="#fde68a" strokeWidth="2" fill="none" strokeLinecap="round" /></>,
  // ۱۰ ربات
  () => <><path d="M32 12 V20" stroke="#64748b" strokeWidth="2.4" strokeLinecap="round" /><circle cx="32" cy="11" r="3.2" fill="#f43f5e" /><rect x="14" y="20" width="36" height="30" rx="9" fill="#cbd5e1" /><rect x="18" y="26" width="28" height="14" rx="6" fill="#0f172a" /><circle cx="26" cy="33" r="3.4" fill="#22d3ee" /><circle cx="38" cy="33" r="3.4" fill="#22d3ee" /><path d="M26 45 H38" stroke="#64748b" strokeWidth="2.4" strokeLinecap="round" /><rect x="9" y="30" width="5" height="10" rx="2.5" fill="#94a3b8" /><rect x="50" y="30" width="5" height="10" rx="2.5" fill="#94a3b8" /></>,
  // ۱۱ فضانورد
  () => <><circle cx="32" cy="34" r="20" fill="#f1f5f9" /><circle cx="32" cy="34" r="20" fill="none" stroke="#cbd5e1" strokeWidth="2" /><rect x="17" y="24" width="30" height="21" rx="10.5" fill="#1e3a8a" /><path d="M21 29 Q26 25 33 27" stroke="#93c5fd" strokeWidth="2.2" fill="none" strokeLinecap="round" /><circle cx="28" cy="36" r="1.8" fill="#fff" /><circle cx="37" cy="36" r="1.8" fill="#fff" /><path d="M29.5 40 Q32.5 42 35.5 40" stroke="#fff" strokeWidth="1.4" fill="none" strokeLinecap="round" /><rect x="29" y="52" width="6" height="4" rx="1.5" fill="#f43f5e" /></>,
  // ۱۲ کوالا
  () => <><circle cx="14" cy="26" r="10" fill="#94a3b8" /><circle cx="50" cy="26" r="10" fill="#94a3b8" /><circle cx="14" cy="26" r="5.5" fill="#e2e8f0" /><circle cx="50" cy="26" r="5.5" fill="#e2e8f0" /><circle cx="32" cy="36" r="16" fill="#cbd5e1" /><Eyes y={33} dx={7} /><ellipse cx="32" cy="39.5" rx="4.2" ry="5.2" fill="#334155" /><Smile y={46} /></>,
  // ۱۳ خوک
  () => <><path d="M16 26 L15 14 L27 20Z M48 26 L49 14 L37 20Z" fill="#f9a8d4" /><circle cx="32" cy="35" r="17" fill="#fbcfe8" /><ellipse cx="32" cy="40" rx="8" ry="6" fill="#f472b6" /><circle cx="29" cy="40" r="1.5" fill="#9d174d" /><circle cx="35" cy="40" r="1.5" fill="#9d174d" /><Eyes y={31} dx={7} /><Cheeks y={37} /></>,
  // ۱۴ میمون
  () => <><circle cx="13" cy="34" r="7" fill="#92400e" /><circle cx="51" cy="34" r="7" fill="#92400e" /><circle cx="13" cy="34" r="3.5" fill="#fcd5a5" /><circle cx="51" cy="34" r="3.5" fill="#fcd5a5" /><circle cx="32" cy="33" r="17" fill="#92400e" /><path d="M20 30 Q24 24 32 30 Q40 24 44 30 Q46 42 32 46 Q18 42 20 30Z" fill="#fcd5a5" /><Eyes y={33} dx={5.5} /><ellipse cx="29.5" cy="40" rx="1" ry="1.4" fill="#92400e" /><ellipse cx="34.5" cy="40" rx="1" ry="1.4" fill="#92400e" /><Smile y={43} /></>,
  // ۱۵ ببر
  () => <><circle cx="17" cy="21" r="6.5" fill="#f97316" /><circle cx="47" cy="21" r="6.5" fill="#f97316" /><circle cx="32" cy="35" r="17" fill="#fb923c" /><path d="M32 19 V25 M26 20 L27.5 25 M38 20 L36.5 25 M16 32 H21 M16 38 H21 M48 32 H43 M48 38 H43" stroke="#7c2d12" strokeWidth="2.2" strokeLinecap="round" /><ellipse cx="32" cy="42" rx="8" ry="5.5" fill="#fff7ed" /><Eyes y={32} /><path d="M30 38 H34 L32 40.5Z" fill="#7c2d12" /><Smile y={43} /></>,
  // ۱۶ دایناسور
  () => <><path d="M22 20 L26 12 L30 19 L34 11 L38 19 L42 12 L44 21Z" fill="#16a34a" /><rect x="14" y="19" width="36" height="32" rx="16" fill="#4ade80" /><circle cx="25" cy="32" r="3.6" fill="#fff" /><circle cx="39" cy="32" r="3.6" fill="#fff" /><circle cx="25.6" cy="32.4" r="1.7" fill="#1f2937" /><circle cx="38.4" cy="32.4" r="1.7" fill="#1f2937" /><circle cx="29" cy="40" r="1" fill="#15803d" /><circle cx="35" cy="40" r="1" fill="#15803d" /><path d="M24 44 Q32 50 40 44" stroke="#14532d" strokeWidth="1.8" fill="none" strokeLinecap="round" /><circle cx="19" cy="40" r="2.6" fill="#86efac" /><circle cx="45" cy="40" r="2.6" fill="#86efac" /></>,
  // ۱۷ تک‌شاخ
  () => <><path d="M32 4 L36 20 L28 20Z" fill="#fbbf24" /><path d="M16 30 L15 14 L27 22Z M48 30 L49 14 L37 22Z" fill="#f3f4f6" /><path d="M14 30 Q8 40 14 52 Q20 48 20 38Z M50 30 Q56 40 50 52 Q44 48 44 38Z" fill="#c084fc" /><circle cx="32" cy="36" r="16" fill="#fff" /><path d="M22 24 Q32 18 42 24 Q36 28 32 27 Q28 28 22 24Z" fill="#e879f9" /><Eyes y={35} /><Cheeks y={41} /><Smile y={42} /></>,
];

export function animalAvatar(i: number, uid: string): ReactNode {
  const [a, b] = BG[i % BG.length];
  return (<>
    <defs><linearGradient id={uid} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={a} /><stop offset="1" stopColor={b} /></linearGradient></defs>
    <circle cx="32" cy="32" r="32" fill={`url(#${uid})`} />
    {ART[i % ART.length](uid)}
  </>);
}
