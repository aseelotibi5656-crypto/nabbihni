import { z } from 'zod';
import { eventCreateSchema } from '@/lib/validation';
import { listEvents, createEvent } from '@/server/repos/events';
import { personalWorkspaceId } from '@/server/repos/users';
import { getUserSettings } from '@/server/auth/current-user';
import { ok, created, parseBody, parseQuery, withAuth } from '@/server/api/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const querySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  q: z.string().optional(),
});

export const GET = withAuth(async (auth, request: Request) => {
  const query = parseQuery(request, querySchema);
  const events = listEvents(auth.user.id, auth.user.timezone, query);
  return ok({ events, count: events.length });
});

export const POST = withAuth(async (auth, request: Request) => {
  const input = await parseBody(request, eventCreateSchema);
  const settings = await getUserSettings(auth.user.id);
  const event = createEvent(auth.user.id, auth.user.timezone, input, {
    workspaceId: personalWorkspaceId(auth.user.id),
    reminderOffsets: settings?.defaultReminderOffsets ?? [10],
  });
  return created({ event });
});
