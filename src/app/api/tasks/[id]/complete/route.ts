import { z } from 'zod';
import { completeTask } from '@/server/repos/tasks';
import { ok, notFound, parseBody, withAuth } from '@/server/api/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({ completed: z.boolean().default(true) });
type Ctx = { params: Promise<{ id: string }> };

/** إكمال أو إلغاء إكمال مهمة — ينشئ النسخة التالية تلقائياً للمهام المتكررة */
export const POST = withAuth(async (auth, request: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const { completed } = await parseBody(request, schema);
  const task = completeTask(auth.user.id, auth.user.timezone, id, completed);
  return task ? ok({ task }) : notFound('المهمة غير موجودة.');
});
