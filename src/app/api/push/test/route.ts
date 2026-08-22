import { sendPush, pushConfigured } from '@/server/services/push';
import { createNotification } from '@/server/repos/notifications';
import { ok, withAuth, enforceRateLimit } from '@/server/api/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** إشعار تجريبي — يتيح للمستخدم التأكد أن الإشعارات تعمل على جهازه */
export const POST = withAuth(async (auth, request: Request) => {
  enforceRateLimit(request, 'push-test', 10, 300);

  createNotification({
    userId: auth.user.id,
    type: 'system',
    title: '🔔 إشعار تجريبي',
    body: 'ممتاز! الإشعارات تعمل على هذا الجهاز.',
    link: '/notifications',
  });

  const delivered = pushConfigured()
    ? await sendPush(auth.user.id, {
        title: '🔔 إشعار تجريبي من نَبّهني',
        body: 'ممتاز! الإشعارات تعمل على هذا الجهاز.',
        url: '/notifications',
        tag: 'test',
      })
    : 0;

  return ok({
    success: true,
    pushConfigured: pushConfigured(),
    devices: delivered,
    message: pushConfigured()
      ? `تم إرسال الإشعار إلى ${delivered} جهاز.`
      : 'سيظهر الإشعار محليًا في المتصفح. لتفعيل الإشعارات على الأجهزة المغلقة أضف مفاتيح VAPID.',
  });
});
