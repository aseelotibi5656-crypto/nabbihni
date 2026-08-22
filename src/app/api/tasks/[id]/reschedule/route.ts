import { rescheduleSchema } from '@/lib/validation';
import { rescheduleTask } from '@/server/repos/tasks';
import { createNotification } from '@/server/repos/notifications';
import { formatKeyShort } from '@/lib/datetime';
import { ok, notFound, parseBody, withAuth } from '@/server/api/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/** إعادة جدولة مهمة متأخرة إلى وقت جديد (الجدولة الذكية) */
export const POST = withAuth(async (auth, request: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const { date, time } = await parseBody(request, rescheduleSchema);
  const task = rescheduleTask(auth.user.id, auth.user.timezone, id, date, time ?? null);
  if (!task) return notFound('المهمة غير موجودة.');

  createNotification({
    userId: auth.user.id,
    type: 'reschedule',
    title: 'تم نقل المهمة',
    body: `«${task.title}» أصبحت في ${formatKeyShort(date)}${time ? ` الساعة ${time}` : ''}.`,
    link: `/tasks?highlight=${task.id}`,
    data: { taskId: task.id },
  });

  return ok({ task });
});
