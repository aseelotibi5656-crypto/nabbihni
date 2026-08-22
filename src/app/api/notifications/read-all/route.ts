import { markAllRead } from '@/server/repos/notifications';
import { ok, withAuth } from '@/server/api/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withAuth(async (auth) => ok({ updated: markAllRead(auth.user.id), unread: 0 }));
