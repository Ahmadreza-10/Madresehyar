'use client';
import { useState } from 'react';

/** فیلد رمز عبور با دکمه‌ی چشم برای نمایش/پنهان کردن رمز */
export default function PasswordInput({ id, name, autoComplete, required }: { id: string; name: string; autoComplete?: string; required?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <div className="pw-wrap">
      <input id={id} name={name} type={show ? 'text' : 'password'} dir="ltr" autoComplete={autoComplete} autoCapitalize="none" autoCorrect="off" spellCheck={false} required={required} />
      <button type="button" className="pw-eye" onClick={() => setShow((s) => !s)} aria-label={show ? 'پنهان کردن رمز' : 'نمایش رمز'} aria-pressed={show} title={show ? 'پنهان کردن رمز' : 'نمایش رمز'}>
        {show ? (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 3l18 18" /><path d="M10.6 6.1A9.7 9.7 0 0 1 12 6c5 0 8.5 4.2 9.6 6-.5.9-1.5 2.3-3 3.6M6.7 7.7C4.6 9.1 3.3 11 2.4 12c1.1 1.8 4.6 6 9.6 6 1.5 0 2.8-.4 4-.9" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2.4 12C3.6 10 7 6 12 6s8.4 4 9.6 6c-1.2 2-4.6 6-9.6 6S3.6 14 2.4 12z" /><circle cx="12" cy="12" r="3" /></svg>
        )}
      </button>
    </div>
  );
}
