import { listNotifications, unreadCount, clearAll } from '@/server/repos/notifications';
import { ok, withAuth } from '@/server/api/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withAuth(async (auth) =>
  ok({
    notifications: listNotifications(auth.user.id),
    unread: unreadCount(auth.user.id),
  }),
);

export const DELETE = withAuth(async (auth) => ok({ deleted: clearAll(auth.user.id) }));
