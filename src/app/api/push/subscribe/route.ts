import { pushSubscribeSchema } from '@/lib/validation';
import { saveSubscription, removeSubscription } from '@/server/services/push';
import { ok, parseBody, withAuth } from '@/server/api/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withAuth(async (auth, request: Request) => {
  const sub = await parseBody(request, pushSubscribeSchema);
  saveSubscription(auth.user.id, sub, request.headers.get('user-agent'));
  return ok({ success: true });
});

export const DELETE = withAuth(async (_auth, request: Request) => {
  const endpoint = new URL(request.url).searchParams.get('endpoint');
  if (endpoint) removeSubscription(endpoint);
  return ok({ success: true });
});
