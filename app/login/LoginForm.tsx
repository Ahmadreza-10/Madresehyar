'use client';
import { useActionState, useState, useTransition } from 'react';
import { loginAction } from '@/app/actions/auth';
import PasswordInput from '@/components/PasswordInput';

export default function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, null);
  const [, startTransition] = useTransition(); const [show, setShow] = useState(false);
  return (
    <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); startTransition(() => { action(fd); }); }} className="form" noValidate>
      <div className="field"><label htmlFor="username">نام کاربری</label><input id="username" name="username" dir="ltr" autoComplete="username" autoCapitalize="none" autoFocus required /></div>
      <div className="field"><label htmlFor="password">رمز عبور</label>
        <div className="pw-wrap"><input id="password" name="password" type={show ? 'text' : 'password'} dir="ltr" autoComplete="current-password" required />
          <button type="button" className="pw-eye" onClick={() => setShow((v) => !v)} aria-label={show ? 'پنهان کردن رمز' : 'نمایش رمز'} aria-pressed={show} title={show ? 'پنهان کردن رمز' : 'نمایش رمز'}>
            {show ? <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.2 4.2M9.9 5.2A10.6 10.6 0 0 1 12 5c6 0 9.5 7 9.5 7a17 17 0 0 1-3.2 4M6.2 6.7A17 17 0 0 0 2.5 12S6 19 12 19c1.4 0 2.6-.3 3.8-.8" /></svg>
              : <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7S2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3" /></svg>}
          </button></div></div>
      {state?.error && <div className="alert error" role="alert">{state.error}</div>}
      <button className="btn" disabled={pending}>{pending ? 'در حال ورود…' : 'ورود به سامانه'}</button>
    </form>
  );
}
