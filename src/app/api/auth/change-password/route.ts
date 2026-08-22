import { changePasswordSchema } from '@/lib/validation';
import { db } from '@/server/db/client';
import { verifyPassword } from '@/server/auth/password';
import { changePassword } from '@/server/repos/users';
import { destroyAllSessions, createSession, cookieOptions } from '@/server/auth/session';
import { parseBody, ok, fail, withAuth, enforceRateLimit } from '@/server/api/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withAuth(async (auth, request: Request) => {
  enforceRateLimit(request, 'change-password', 10, 900);
  const input = await parseBody(request, changePasswordSchema);

  const row = db.get<{ password_hash: string }>('SELECT password_hash FROM users WHERE id = ?', [
    auth.user.id,
  ]);
  if (!row || !(await verifyPassword(input.currentPassword, row.password_hash))) {
    return fail(400, 'invalid_password', 'كلمة المرور الحالية غير صحيحة.');
  }

  await changePassword(auth.user.id, input.newPassword);
  destroyAllSessions(auth.user.id);

  // نعيد إنشاء جلسة للجهاز الحالي حتى لا يخرج المستخدم من تحت يديه
  const { token, expiresAt } = await createSession(auth.user.id, auth.user.email, {
    userAgent: request.headers.get('user-agent'),
  });
  const response = ok({ success: true, message: 'تم تحديث كلمة المرور.' });
  response.cookies.set('nabbihni_session', token, cookieOptions(expiresAt));
  return response;
});
