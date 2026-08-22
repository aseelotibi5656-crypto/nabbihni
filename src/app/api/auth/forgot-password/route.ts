import { forgotPasswordSchema } from '@/lib/validation';
import { findUserByEmail } from '@/server/repos/users';
import { issueVerificationToken } from '@/server/auth/tokens';
import { sendEmail, resetPasswordEmail } from '@/server/services/email';
import { parseBody, ok, withGuard, enforceRateLimit } from '@/server/api/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withGuard(async (request: Request) => {
  enforceRateLimit(request, 'forgot', 5, 900);

  const { email } = await parseBody(request, forgotPasswordSchema);
  const row = findUserByEmail(email);

  // نُرجع نفس الرد دائماً حتى لا نكشف البريد المسجّل من غيره
  if (row) {
    const { url } = issueVerificationToken(row.id, 'password_reset');
    const template = resetPasswordEmail(row.name, url);
    await sendEmail({ ...template, to: row.email });
  }

  return ok({
    success: true,
    message: 'إذا كان البريد مسجّلاً لدينا فستصلك رسالة بخطوات إعادة التعيين.',
  });
});
