import { Avatar } from './Illus';

type U = { id: string; firstName: string; lastName: string; avatarPreset?: number | null; avatarPhotoAt?: Date | null };
/** آواتار یک کاربر: عکس آپلودشده، یا آواتار انتخابی، یا آواتار خودکار */
export function UserAvatar({ user, size = 40, className = '' }: { user: U; size?: number; className?: string }) {
  const photo = user.avatarPhotoAt ? `/api/avatar/${user.id}?v=${user.avatarPhotoAt.getTime()}` : undefined;
  return <Avatar name={user.firstName + user.lastName} size={size} className={className} variant={user.avatarPreset ?? undefined} photoSrc={photo} />;
}
