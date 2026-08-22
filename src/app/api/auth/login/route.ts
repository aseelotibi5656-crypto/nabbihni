import type { NextResponse } from 'next/server';
import { loginSchema } from '@/lib/validation';
import { findUserByEmail, touchLogin, getUserById, ensureSettings } from '@/server/repos/users';
import { verifyPassword } from '@/server/auth/password';
import { createSession, cookieOptions } from '@/server/auth/session';
import { parseBody, ok, fail, withGuard, clientIp, rateLimit, HttpError } from '@/server/api/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withGuard(async (request: Request) => {
  const input = await parseBody(request, loginSchema);

  /**
   * حماية من التخمين على مستويين:
   *  • ١٠ محاولات لكل (عنوان IP + بريد) خلال ١٥ دقيقة — تمنع تخمين حساب بعينه.
   *  • ٥٠ محاولة لكل عنوان IP خلال الساعة — تمنع مسح عدة حسابات من نفس المصدر.
   * الفصل بينهما يمنع أن يقفل مهاجمٌ واحدٌ الدخولَ على بقية المستخدمين.
   */
  const ip = clientIp(request);
  const identity = input.email.toLowerCase().trim();
  if (!rateLimit(`login:${ip}:${identity}`, 10, 900) || !rateLimit(`login-ip:${ip}`, 50, 3600)) {
    throw new HttpError(429, 'rate_limited', 'محاولات كثيرة خلال وقت قصير. انتظر قليلاً ثم أعد المحاولة.');
  }

  const row = findUserByEmail(input.email);

  // رسالة موحّدة لا تكشف إن كان البريد مسجّلاً أم لا
  const invalid = () => fail(401, 'invalid_credentials', 'البريد الإلكتروني أو كلمة المرور غير صحيحة.');
  if (!row) {
    // تأخير مماثل لعملية التحقق لمنع تحليل التوقيت
    await verifyPassword(input.password, '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva');
    return invalid();
  }

  const valid = await verifyPassword(input.password, row.password_hash);
  if (!valid) return invalid();

  ensureSettings(row.id);
  touchLogin(row.id);
  const user = getUserById(row.id)!;

  const { token, expiresAt } = await createSession(user.id, user.email, {
    userAgent: request.headers.get('user-agent'),
    ip: clientIp(request),
  });

  const response = ok({ user });
  response.cookies.set('nabbihni_session', token, cookieOptions(expiresAt));
  return response as NextResponse;
});
