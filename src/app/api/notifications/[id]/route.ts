import { markRead, deleteNotification, unreadCount } from '@/server/repos/notifications';
import { ok, notFound, withAuth } from '@/server/api/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/** تعليم إشعار كمقروء */
export const POST = withAuth(async (auth, _request: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  markRead(auth.user.id, id);
  return ok({ success: true, unread: unreadCount(auth.user.id) });
});

export const DELETE = withAuth(async (auth, _request: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  return deleteNotification(auth.user.id, id)
    ? ok({ success: true, unread: unreadCount(auth.user.id) })
    : notFound('الإشعار غير موجود.');
});
