import { habitLogSchema } from '@/lib/validation';
import { logHabit } from '@/server/repos/habits';
import { createNotification } from '@/server/repos/notifications';
import { ok, notFound, parseBody, withAuth } from '@/server/api/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/** تسجيل إنجاز عادة في يوم محدد (أو التراجع عنه) */
export const POST = withAuth(async (auth, request: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const input = await parseBody(request, habitLogSchema);
  const habit = logHabit(
    auth.user.id,
    auth.user.timezone,
    id,
    input.date,
    input.completed,
    input.value ?? 1,
    input.note,
  );
  if (!habit) return notFound('العادة غير موجودة.');

  // تهنئة عند بلوغ سلسلة مميزة
  const streak = habit.stats.currentStreak;
  if (input.completed && [7, 14, 21, 30, 50, 100].includes(streak)) {
    createNotification({
      userId: auth.user.id,
      type: 'streak',
      title: `🔥 سلسلة ${streak} يومًا!`,
      body: `واصلت «${habit.title}» ${streak} يومًا متتاليًا. استمر!`,
      link: '/habits',
      data: { habitId: habit.id, streak },
    });
  }

  return ok({ habit });
});
