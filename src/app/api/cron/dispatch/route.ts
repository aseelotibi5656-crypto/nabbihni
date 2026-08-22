import { dispatchDueReminders, housekeeping } from '@/server/services/reminder-engine';
import { ok, fail, withGuard } from '@/server/api/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * نقطة المجدول الخارجي — تُستدعى كل دقيقة لإرسال التذكيرات المستحقة
 * حتى لو كان التطبيق مغلقاً لدى المستخدم.
 *
 * Vercel Cron (vercel.json):
 *   { "crons": [{ "path": "/api/cron/dispatch", "schedule": "* * * * *" }] }
 * أو من خادمك:
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://.../api/cron/dispatch
 */
async function handle(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const header = request.headers.get('authorization');
    if (header !== `Bearer ${secret}`) {
      return fail(401, 'unauthorized', 'رمز المجدول غير صحيح.');
    }
  }

  const dispatched = await dispatchDueReminders();
  housekeeping();

  return ok({
    dispatched: dispatched.length,
    at: new Date().toISOString(),
  });
}

export const GET = withGuard(handle);
export const POST = withGuard(handle);
