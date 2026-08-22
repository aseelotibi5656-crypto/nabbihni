import { habitUpdateSchema } from '@/lib/validation';
import { getHabit, updateHabit, deleteHabit } from '@/server/repos/habits';
import { ok, notFound, parseBody, withAuth } from '@/server/api/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export const GET = withAuth(async (auth, _request: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const habit = getHabit(auth.user.id, auth.user.timezone, id);
  return habit ? ok({ habit }) : notFound('العادة غير موجودة.');
});

export const PATCH = withAuth(async (auth, request: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const input = await parseBody(request, habitUpdateSchema);
  const habit = updateHabit(auth.user.id, auth.user.timezone, id, input);
  return habit ? ok({ habit }) : notFound('العادة غير موجودة.');
});

export const DELETE = withAuth(async (auth, _request: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  return deleteHabit(auth.user.id, id) ? ok({ success: true }) : notFound('العادة غير موجودة.');
});
