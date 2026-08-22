import { verifyEmailSchema } from '@/lib/validation';
import { consumeToken, issueVerificationToken } from '@/server/auth/tokens';
import { markEmailVerified } from '@/server/repos/users';
import { sendEmail, verificationEmail } from '@/server/services/email';
import { getAuth } from '@/server/auth/current-user';
import { parseBody, ok, fail, withGuard, unauthorized, enforceRateLimit } from '@/server/api/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** تأكيد البريد عبر الرمز */
export const POST = withGuard(async (request: Request) => {
  enforceRateLimit(request, 'verify', 20, 900);
  const { token } = await parseBody(request, verifyEmailSchema);
  const userId = consumeToken(token, 'email_verification');
  if (!userId) return fail(400, 'invalid_token', 'رابط التفعيل غير صالح أو انتهت صلاحيته.');
  markEmailVerified(userId);
  return ok({ success: true, message: 'تم تفعيل بريدك الإلكتروني بنجاح.' });
});

/** إعادة إرسال رسالة التفعيل للمستخدم الحالي */
export const PUT = withGuard(async (request: Request) => {
  enforceRateLimit(request, 'verify-resend', 5, 900);
  const auth = await getAuth();
  if (!auth) return unauthorized();
  if (auth.user.emailVerified) return ok({ success: true, message: 'بريدك مفعّل بالفعل.' });

  const { url } = issueVerificationToken(auth.user.id, 'email_verification');
  const template = verificationEmail(auth.user.name, url);
  await sendEmail({ ...template, to: auth.user.email });
  return ok({ success: true, message: 'أرسلنا رابط تفعيل جديد إلى بريدك.' });
});
