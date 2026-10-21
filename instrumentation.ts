/** با روشن شدن سرور: به‌روزرسانی دیتابیس، غیرفعال‌سازی مدارس منقضی و زمان‌بندِ یادآور (کدهای نودی در فایل جدا) */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { startNode } = await import('./instrumentation-node');
  await startNode();
}
