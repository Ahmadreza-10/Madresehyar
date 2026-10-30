'use client';
import { useActionState } from 'react';
import { createBackupAction } from '@/app/actions/backup';
import type { ActionState } from '@/lib/action';

export function BackupButton() {
  const [state, action, pending] = useActionState<ActionState, FormData>(async () => createBackupAction(), { ok: false } as ActionState);
  return (
    <form action={action} className="stack">
      <button className="btn" type="submit" disabled={pending}>{pending ? 'در حال ساخت…' : 'ساخت پشتیبان همین حالا'}</button>
      {(state?.error || state?.message) && <div className={`alert ${state.ok ? 'ok' : 'error'}`} role="status">{state.error ?? state.message}</div>}
    </form>
  );
}
