import { aiParseSchema } from '@/lib/validation';
import { aiProvider, aiStatus } from '@/server/services/ai';
import { listCategories } from '@/server/repos/categories';
import { getUserSettings } from '@/server/auth/current-user';
import { ok, parseBody, withAuth, enforceRateLimit } from '@/server/api/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** تحويل نص حر إلى مسودّة مهمة قابلة للمراجعة قبل الحفظ */
export const POST = withAuth(async (auth, request: Request) => {
  enforceRateLimit(request, 'ai-parse', 60, 300);

  const { text } = await parseBody(request, aiParseSchema);
  const settings = await getUserSettings(auth.user.id);
  const categories = listCategories(auth.user.id).map((c) => c.name);

  const result = await aiProvider().parseIntent(text, {
    timezone: auth.user.timezone,
    defaultReminderOffsets: settings?.defaultReminderOffsets ?? [10],
    categories,
    userName: auth.user.name,
  });

  return ok({ result, provider: aiStatus() });
});
