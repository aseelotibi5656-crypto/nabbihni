import { taskCreateSchema, taskQuerySchema } from '@/lib/validation';
import { listTasks, createTask } from '@/server/repos/tasks';
import { personalWorkspaceId } from '@/server/repos/users';
import { getUserSettings } from '@/server/auth/current-user';
import { ok, created, parseBody, parseQuery, withAuth } from '@/server/api/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/tasks — قائمة المهام مع الفلاتر والبحث */
export const GET = withAuth(async (auth, request: Request) => {
  const filters = parseQuery(request, taskQuerySchema);
  const tasks = listTasks(auth.user.id, auth.user.timezone, filters);
  return ok({ tasks, count: tasks.length });
});

/** POST /api/tasks — إنشاء مهمة */
export const POST = withAuth(async (auth, request: Request) => {
  const input = await parseBody(request, taskCreateSchema);
  const settings = await getUserSettings(auth.user.id);
  const task = createTask(auth.user.id, auth.user.timezone, input, {
    workspaceId: personalWorkspaceId(auth.user.id),
    reminderOffsets: settings?.defaultReminderOffsets ?? [10],
  });
  return created({ task });
});
