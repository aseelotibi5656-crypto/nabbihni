import { rescheduleSuggestions } from '@/server/services/agenda';
import { getUserSettings } from '@/server/auth/current-user';
import { ok, withAuth } from '@/server/api/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** المهام المتأخرة + أوقات مقترحة لإعادة جدولتها (الجدولة الذكية) */
export const GET = withAuth(async (auth) => {
  const settings = await getUserSettings(auth.user.id);
  if (settings && !settings.smartRescheduleEnabled) {
    return ok({ tasks: [], suggestions: [], enabled: false });
  }
  const data = rescheduleSuggestions(auth.user.id, auth.user.timezone);
  return ok({ ...data, enabled: true });
});
