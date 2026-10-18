import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

// صفحه‌ی اصلی: بر اساس وضعیت ورود به داشبورد یا صفحه‌ی ورود می‌رود (نبودِ این فایل باعث خطای 404 در آدرس / می‌شد)
export default async function Home() {
  redirect((await getCurrentUser()) ? '/dashboard' : '/login');
}
