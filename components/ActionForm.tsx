'use client';
import { useActionState, useEffect, useRef, useTransition, type ReactNode } from 'react';
import type { ActionState } from '@/lib/action';

type Props = {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  children: ReactNode; submit: string; className?: string; resetOnSuccess?: boolean; danger?: boolean; small?: boolean; confirm?: string; inline?: boolean;
};
/** فرم عمومی: پیام موفقیت/خطا را نشان می‌دهد و هنگام ارسال دکمه را قفل می‌کند */
export default function ActionForm({ action, children, submit, className = 'form', resetOnSuccess = true, danger, small, confirm, inline }: Props) {
  const [state, formAction, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  const [, startTransition] = useTransition();
  useEffect(() => { if (state?.ok && resetOnSuccess) ref.current?.reset(); }, [state, resetOnSuccess]);
  // ارسال با onSubmit (نه action): React 19 فرمِ action را بعد از هر ارسال، حتی با خطا، خالی می‌کند؛ اینجا فقط بعد از موفقیت پاک می‌شود
  return (
    <form ref={ref} className={className} onSubmit={(e) => { e.preventDefault(); if (confirm && !window.confirm(confirm)) return; const fd = new FormData(e.currentTarget); startTransition(() => { formAction(fd); }); }}>
      {children}
      {state?.error && <div className="alert error" role="alert">{state.error}</div>}
      {state?.ok && state.message && <div className="alert ok" role="status">{state.message}</div>}
      <div className={inline ? '' : 'row'}><button className={`btn${danger ? ' danger' : ''}${small ? ' sm' : ''}`} disabled={pending}>{pending ? 'در حال ذخیره…' : submit}</button></div>
    </form>
  );
}
