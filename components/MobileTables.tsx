'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/** برای نمایش «کارتیِ» جدول‌ها روی گوشی: عنوانِ ستون را به هر سلول می‌دهد (data-label). فقط ویژگی HTML اضافه می‌کند. */
function label(root: ParentNode) {
  root.querySelectorAll<HTMLTableElement>('table').forEach((t) => {
    const hr = t.tHead?.rows[0] ?? t.querySelector('tr'); if (!hr) return;
    const heads = [...hr.children].map((c) => (c.textContent ?? '').trim());
    t.querySelectorAll('tr').forEach((tr) => {
      if (tr === hr) return;
      let i = 0;
      [...tr.children].forEach((c) => {
        if (c.tagName === 'TD') {
          const el = c as HTMLElement; const txt = (el.textContent ?? '').trim();
          if (el.dataset.label === undefined) el.dataset.label = i === 0 ? '' : heads[i] ?? '';
          el.dataset.empty = txt === '' || txt === '—' || txt === '-' ? '1' : '0';
        }
        i += (c as HTMLTableCellElement).colSpan || 1;
      });
    });
  });
}

export default function MobileTables() {
  const path = usePathname();
  useEffect(() => {
    label(document); let raf = 0;
    const mo = new MutationObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => label(document)); });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { mo.disconnect(); cancelAnimationFrame(raf); };
  }, [path]);
  return null;
}
