import { getCurrentUser } from '@/lib/auth';
import { getVapid } from '@/lib/reminders';
export async function GET() {
  const u = await getCurrentUser(); if (!u) return new Response('unauthorized', { status: 401 });
  return Response.json({ publicKey: (await getVapid()).publicKey }, { headers: { 'cache-control': 'no-store' } });
}
