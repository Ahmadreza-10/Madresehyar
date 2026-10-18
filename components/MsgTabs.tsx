export default function MsgTabs({ on }: { on: 'inbox' | 'sent' | 'groups' }) {
  return <div className="seg" style={{ marginBottom: 12 }}><a href="/messages" className={on === 'inbox' ? 'on' : ''}>دریافتی</a><a href="/messages?box=sent" className={on === 'sent' ? 'on' : ''}>ارسالی</a><a href="/messages/groups" className={on === 'groups' ? 'on' : ''}>گروه‌ها و کانال‌ها</a></div>;
}
