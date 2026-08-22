import { z } from 'zod';
import { taskCreateSchema, eventCreateSchema, habitCreateSchema } from '@/lib/validation';
import { createTask } from '@/server/repos/tasks';
import { createEvent } from '@/server/repos/events';
import { createHabit } from '@/server/repos/habits';
import { listCategories, createCategory } from '@/server/repos/categories';
import { personalWorkspaceId } from '@/server/repos/users';
import { created, badRequest, parseBody, withAuth } from '@/server/api/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  kind: z.enum(['task', 'event', 'habit']).default('task'),
  categoryName: z.string().max(40).nullable().optional(),
  payload: z.record(z.string(), z.unknown()),
});

/** إنشاء العنصر بعد موافقة المستخدم على مسودّة المساعد الذكي */
export const POST = withAuth(async (auth, request: Request) => {
  const { kind, categoryName, payload } = await parseBody(request, schema);
  const workspaceId = personalWorkspaceId(auth.user.id);

  // ربط اسم التصنيف المقترح بمعرّف حقيقي، وإنشاؤه إن لم يوجد
  let categoryId = (payload.categoryId as string | null) ?? null;
  if (!categoryId && categoryName) {
    const existing = listCategories(auth.user.id).find((c) => c.name === categoryName);
    categoryId = existing?.id ?? createCategory(auth.user.id, { name: categoryName }).id;
  }

  if (kind === 'task') {
    const input = taskCreateSchema.parse({ ...payload, categoryId });
    return created({ kind, task: createTask(auth.user.id, auth.user.timezone, input, { workspaceId }) });
  }
  if (kind === 'event') {
    const input = eventCreateSchema.parse({ ...payload, categoryId });
    return created({ kind, event: createEvent(auth.user.id, auth.user.timezone, input, { workspaceId }) });
  }
  if (kind === 'habit') {
    const input = habitCreateSchema.parse({ ...payload, categoryId });
    return created({ kind, habit: createHabit(auth.user.id, auth.user.timezone, input) });
  }

  return badRequest('نوع العنصر غير مدعوم.');
});
