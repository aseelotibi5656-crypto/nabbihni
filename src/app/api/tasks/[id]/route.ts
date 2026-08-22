import { taskUpdateSchema } from '@/lib/validation';
import { getTask, updateTask, deleteTask } from '@/server/repos/tasks';
import { ok, notFound, parseBody, withAuth } from '@/server/api/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export const GET = withAuth(async (auth, _request: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const task = getTask(auth.user.id, id);
  return task ? ok({ task }) : notFound('المهمة غير موجودة.');
});

export const PATCH = withAuth(async (auth, request: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const input = await parseBody(request, taskUpdateSchema);
  const task = updateTask(auth.user.id, auth.user.timezone, id, input);
  return task ? ok({ task }) : notFound('المهمة غير موجودة.');
});

export const DELETE = withAuth(async (auth, _request: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  return deleteTask(auth.user.id, id) ? ok({ success: true }) : notFound('المهمة غير موجودة.');
});
