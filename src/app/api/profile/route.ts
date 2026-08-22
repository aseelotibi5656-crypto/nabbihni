import { profileSchema } from '@/lib/validation';
import { updateProfile, deleteUser } from '@/server/repos/users';
import { destroyAllSessions, cookieOptions } from '@/server/auth/session';
import { ok, parseBody, withAuth } from '@/server/api/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withAuth(async (auth) => ok({ user: auth.user }));

export const PATCH = withAuth(async (auth, request: Request) => {
  const input = await parseBody(request, profileSchema);
  const user = updateProfile(auth.user.id, input);
  return ok({ user });
});

/** حذف الحساب نهائياً — كل البيانات المرتبطة تُحذف تلقائياً (ON DELETE CASCADE) */
export const DELETE = withAuth(async (auth) => {
  destroyAllSessions(auth.user.id);
  deleteUser(auth.user.id);
  const response = ok({ success: true });
  response.cookies.set('nabbihni_session', '', cookieOptions(new Date(0)));
  return response;
});
