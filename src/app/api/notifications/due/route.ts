import { dispatchDueReminders } from '@/server/services/reminder-engine';
import { unreadCount } from '@/server/repos/notifications';
import { ok, withAuth } from '@/server/api/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * يستدعيه التطبيق دورياً أثناء فتحه (كل ٣٠ ثانية).
 * يعالج تذكيرات هذا المستخدم فقط ويعيد ما استُحق الآن ليعرضه المتصفح فوراً،
 * وهذا يجعل التذكيرات تعمل حتى قبل إعداد مفاتيح Web Push.
 */
export const GET = withAuth(async (auth) => {
  const dispatched = await dispatchDueReminders(auth.user.id);
  return ok({ reminders: dispatched, unread: unreadCount(auth.user.id) });
});
