import { ok, withGuard } from '@/server/api/http';
import { getAuth } from '@/server/auth/current-user';
import { destroySession, cookieOptions } from '@/server/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withGuard(async () => {
  const auth = await getAuth();
  if (auth) destroySession(auth.sessionId);

  const response = ok({ success: true });
  response.cookies.set('nabbihni_session', '', { ...cookieOptions(new Date(0)) });
  return response;
});
