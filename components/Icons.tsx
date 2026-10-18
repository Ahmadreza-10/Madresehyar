import type { ReactNode } from 'react';
const P = ({ children }: { children: ReactNode }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
export const icons = {
  home: <P><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></P>,
  study: <P><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" /><path d="M4 19V5" /><path d="M9 8h6M9 12h4" /></P>,
  users: <P><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" /><circle cx="17" cy="9" r="2.4" /><path d="M16.5 14.6c2.6.2 4.5 2 4.5 4.9" /></P>,
  check: <P><rect x="4" y="4" width="16" height="17" rx="3" /><path d="M8 3v3M16 3v3" /><path d="M8.5 13l2.5 2.5 4.5-5" /></P>,
  grades: <P><path d="M5 20V10M12 20V4M19 20v-7" /></P>,
  assign: <P><path d="M7 3h8l4 4v14H7z" /><path d="M15 3v4h4" /><path d="M10 12h6M10 16h6" /></P>,
  mega: <P><path d="M4 10v4l12 5V5z" /><path d="M16 9a3 3 0 0 1 0 6" /><path d="M7 15v4" /></P>,
  shield: <P><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="M9 12l2 2 4-4" /></P>,
  logout: <P><path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" /><path d="M16 8l4 4-4 4M20 12H9" /></P>,
  clock: <P><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></P>,
  school: <P><path d="M3 10l9-6 9 6" /><path d="M5 10v9h14v-9" /><path d="M9 19v-5h6v5" /></P>,
  settings: <P><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1.3l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2.2-1.3L14 3h-4l-.4 2.4a7 7 0 0 0-2.2 1.3l-2.3-.9-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .9.1 1.3l-2 1.5 2 3.4 2.3-.9c.7.6 1.4 1 2.2 1.3L10 21h4l.4-2.4c.8-.3 1.5-.7 2.2-1.3l2.3.9 2-3.4-2-1.5c.1-.4.1-.9.1-1.3z" /></P>,
  log: <P><path d="M5 4h14v16H5z" /><path d="M9 9h6M9 13h6M9 17h3" /></P>,
  plus: <P><path d="M12 5v14M5 12h14" /></P>,
  empty: <P><path d="M3 7l9-4 9 4-9 4z" /><path d="M3 7v10l9 4 9-4V7" /></P>,
  note: <P><path d="M5 4h14v12l-4 4H5z" /><path d="M15 20v-4h4" /></P>,
  fire: <P><path d="M12 3c1 3 4 4.5 4 8.5A4 4 0 0 1 12 16a4 4 0 0 1-4-4c0-1.6.8-2.6 1.6-3.6C10.4 7.4 11.6 6 12 3z" /><path d="M10 20a3 3 0 0 0 4 0" /></P>,
  target: <P><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.2" /></P>,
  mail: <P><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M4 7l8 6 8-6" /></P>,
  calendar: <P><rect x="4" y="5" width="16" height="15" rx="3" /><path d="M8 3v4M16 3v4M4 10h16" /></P>,
  card: <P><path d="M6 3h12v18l-6-3-6 3z" /><path d="M9 8h6M9 12h4" /></P>,
  user: <P><circle cx="12" cy="8" r="3.5" /><path d="M5 20c0-3.6 3-6 7-6s7 2.4 7 6" /></P>,
} as const;
export type IconName = keyof typeof icons;
export const Icon = ({ name }: { name: IconName }) => icons[name];
