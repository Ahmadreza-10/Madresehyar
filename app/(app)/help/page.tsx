import { redirect } from 'next/navigation';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { supportTickets } from '@/db/schema';
import { closeTicket, createTicket } from '@/app/actions/support';
import { updateTicket } from '@/app/actions/edit';
import { requireUser } from '@/lib/auth';
import { faqFor } from '@/lib/faq';
import { fa, formatJalali } from '@/lib/format';
import ActionForm from '@/components/ActionForm';
import { Tabs } from '@/components/Interactive';
import { Badge, Card, Empty, PageHead } from '@/components/ui';

export const metadata = { title: 'راهنما و پشتیبانی' };
const statusTone = { open: 'warn', answered: 'ok', closed: '' } as const;
const statusLabel = { open: 'در انتظار پاسخ', answered: 'پاسخ داده شد', closed: 'بسته' } as const;

export default async function HelpPage() {
  const u = await requireUser();
  if (u.role === 'ADMIN') redirect('/admin/support');
  const faqs = faqFor(u.role); const groups = [...new Set(faqs.map((f) => f.group))];
  const mine = await db.select().from(supportTickets).where(eq(supportTickets.userId, u.id)).orderBy(desc(supportTickets.createdAt)).limit(30);
  const unanswered = mine.filter((t) => t.status === 'answered').length;

  const faq = (
    <div className="stack">{groups.map((g) => (
      <Card key={g} title={g}><div className="faq">{faqs.filter((f) => f.group === g).map((f) => (
        <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>))}</div></Card>))}
      <p className="muted small">جوابتان را پیدا نکردید؟ از تب «پیام به پشتیبانی» برای ما بنویسید.</p></div>);

  const support = (
    <div className="stack">
      <Card title="پیام به پشتیبانی">
        <p className="muted small" style={{ marginBottom: 10 }}>مشکل یا پیشنهادتان را بنویسید؛ مدیران سامانه پاسخ می‌دهند و جواب را همین‌جا می‌بینید. لطفاً رمز عبور یا اطلاعات محرمانه ننویسید.</p>
        <ActionForm action={createTicket} submit="ارسال به پشتیبانی">
          <div className="field"><label>موضوع</label><input name="subject" required minLength={3} maxLength={100} placeholder="مثلاً: فرزندم در حساب من دیده نمی‌شود" /></div>
          <div className="field"><label>توضیح</label><textarea name="body" required minLength={10} maxLength={2000} placeholder="هرچه دقیق‌تر بنویسید، سریع‌تر کمک می‌گیرید…" /></div>
        </ActionForm>
      </Card>
      <Card title="پیام‌های من">{mine.length ? <div className="list">{mine.map((t) => (
        <div className="list-item" key={t.id} style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220 }}><b>{t.subject}</b><div className="muted small">{formatJalali(t.createdAt.toISOString().slice(0, 10))}</div>
            <div className="small" style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{t.body}</div>
            {t.editedAt && <div className="edited">ویرایش‌شده</div>}
            {t.status === 'open' && (<details style={{ marginTop: 8 }}><summary className="btn ghost sm" style={{ display: 'inline-flex' }}>ویرایش</summary>
              <div style={{ marginTop: 10, maxWidth: 520 }}><ActionForm action={updateTicket} submit="ذخیره‌ی تغییرات" resetOnSuccess={false} small><input type="hidden" name="id" value={t.id} />
                <div className="field"><label>موضوع</label><input name="subject" defaultValue={t.subject} required minLength={3} maxLength={100} /></div>
                <div className="field"><label>توضیح</label><textarea name="body" defaultValue={t.body} required minLength={10} maxLength={2000} /></div></ActionForm></div></details>)}
            {t.reply && <div className="feedback" style={{ marginTop: 8 }}><b>پاسخ پشتیبانی:</b> <span style={{ whiteSpace: 'pre-wrap' }}>{t.reply}</span></div>}</div>
          <div className="row" style={{ gap: 6 }}><Badge tone={statusTone[t.status]}>{statusLabel[t.status]}</Badge>
            {t.status !== 'closed' && <form action={closeTicket}><input type="hidden" name="id" value={t.id} /><button className="btn ghost sm">بستن</button></form>}</div>
        </div>))}</div> : <Empty text="هنوز پیامی نفرستاده‌اید." icon="mail" />}</Card>
    </div>);

  return (
    <>
      <PageHead illus="help" title="راهنما و پشتیبانی" sub="پاسخ پرسش‌های رایج و ارتباط با پشتیبانی (مدیران سامانه)" />
      <Tabs tabs={[
        { id: 'faq', label: '❓ سوالات متداول', content: faq },
        { id: 'support', label: '💬 پیام به پشتیبانی', badge: unanswered ? <Badge tone="ok">{fa(unanswered)}</Badge> : undefined, content: support },
      ]} />
    </>
  );
}
