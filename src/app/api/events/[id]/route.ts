import { eventUpdateSchema } from '@/lib/validation';
import { getEvent, updateEvent, deleteEvent } from '@/server/repos/events';
import { ok, notFound, parseBody, withAuth } from '@/server/api/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export const GET = withAuth(async (auth, _request: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const event = getEvent(auth.user.id, id);
  return event ? ok({ event }) : notFound('الموعد غير موجود.');
});

export const PATCH = withAuth(async (auth, request: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const input = await parseBody(request, eventUpdateSchema);
  const event = updateEvent(auth.user.id, auth.user.timezone, id, input);
  return event ? ok({ event }) : notFound('الموعد غير موجود.');
});

export const DELETE = withAuth(async (auth, _request: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  return deleteEvent(auth.user.id, id) ? ok({ success: true }) : notFound('الموعد غير موجود.');
});
