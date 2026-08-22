import { NextResponse } from 'next/server';
import { registerSchema } from '@/lib/validation';
import { createUser } from '@/server/repos/users';
import { createSession, cookieOptions } from '@/server/auth/session';
import { createNotification } from '@/server/repos/notifications';
import { issueVerificationToken } from '@/server/auth/tokens';
import { sendEmail, verificationEmail } from '@/server/services/email';
import { parseBody, created, withGuard, enforceRateLimit, clientIp } from '@/server/api/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withGuard(async (request: Request) => {
  enforceRateLimit(request, 'register', 8, 3600);

  const input = await parseBody(request, registerSchema);
  const user = await createUser(input);

  // رسالة ترحيب داخل التطبيق
  createNotification({
    userId: user.id,
    type: 'system',
    title: `أهلاً بك في نَبّهني، ${user.name} 👋`,
    body: 'ابدأ بإضافة أول مهمة، وسنتكفّل بتذكيرك في وقتها.',
    link: '/dashboard',
  });

  // بريد التفعيل — يعمل في وضع التطوير بطباعة الرابط في الطرفية
  const { url } = issueVerificationToken(user.id, 'email_verification');
  const template = verificationEmail(user.name, url);
  await sendEmail({ ...template, to: user.email });

  const { token, expiresAt } = await createSession(user.id, user.email, {
    userAgent: request.headers.get('user-agent'),
    ip: clientIp(request),
  });

  const response = created({ user, verificationSent: true });
  response.cookies.set('nabbihni_session', token, cookieOptions(expiresAt));
  return response as NextResponse;
});
