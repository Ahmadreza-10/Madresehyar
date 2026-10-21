export default function MsgTabs({ on }: { on: 'chats' | 'groups' }) {
  return <div className="seg" style={{ marginBottom: 12 }}><a href="/messages" className={on === 'chats' ? 'on' : ''}>💬 گفتگوها</a><a href="/messages/groups" className={on === 'groups' ? 'on' : ''}>👥 گروه‌ها و کانال‌ها</a></div>;
}
