import { ok, withAuth } from '@/server/api/http';
import { getUserSettings } from '@/server/auth/current-user';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withAuth(async (auth) => {
  const settings = await getUserSettings(auth.user.id);
  return ok({ user: auth.user, settings });
});
