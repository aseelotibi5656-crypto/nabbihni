import { resetPasswordSchema } from '@/lib/validation';
import { consumeToken } from '@/server/auth/tokens';
import { changePassword, getUserById } from '@/server/repos/users';
import { destroyAllSessions } from '@/server/auth/session';
import { createNotification } from '@/server/repos/notifications';
import { parseBody, ok, fail, withGuard, enforceRateLimit } from '@/server/api/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withGuard(async (request: Request) => {
  enforceRateLimit(request, 'reset', 10, 900);

  const { token, password } = await parseBody(request, resetPasswordSchema);
  const userId = consumeToken(token, 'password_reset');
  if (!userId) {
    return fail(400, 'invalid_token', 'الرابط غير صالح أو انتهت صلاحيته. اطلب رابطًا جديدًا.');
  }

  await changePassword(userId, password);
  // إبطال كل الجلسات القديمة بعد تغيير كلمة المرور — ممارسة أمنية أساسية
  destroyAllSessions(userId);

  const user = getUserById(userId);
  if (user) {
    createNotification({
      userId,
      type: 'system',
      title: 'تم تغيير كلمة المرور',
      body: 'تم تحديث كلمة مرور حسابك بنجاح، وتم تسجيل الخروج من جميع الأجهزة.',
      link: '/settings',
    });
  }

  return ok({ success: true, message: 'تم تعيين كلمة مرور جديدة. يمكنك تسجيل الدخول الآن.' });
});
