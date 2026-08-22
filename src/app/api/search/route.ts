import { searchQuerySchema } from '@/lib/validation';
import { listTasks } from '@/server/repos/tasks';
import { listEvents } from '@/server/repos/events';
import { listHabits } from '@/server/repos/habits';
import { listCategories } from '@/server/repos/categories';
import { normalizeArabic } from '@/lib/utils';
import { ok, parseQuery, withAuth } from '@/server/api/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** بحث شامل عبر المهام والمواعيد والعادات والتصنيفات مع فلاتر */
export const GET = withAuth(async (auth, request: Request) => {
  const query = parseQuery(request, searchQuerySchema);
  const types = (query.types ?? 'task,event,habit,category').split(',');
  const needle = normalizeArabic(query.q ?? '');
  const tz = auth.user.timezone;

  const tasks = types.includes('task')
    ? listTasks(auth.user.id, tz, {
        view: query.from && query.to ? 'range' : 'all',
        from: query.from,
        to: query.to,
        q: query.q,
        priority: query.priority,
        categoryId: query.categoryId,
        status: query.status,
        limit: 100,
      })
    : [];

  const events = types.includes('event')
    ? listEvents(auth.user.id, tz, { from: query.from, to: query.to, q: query.q, limit: 60 })
    : [];

  const habits = types.includes('habit')
    ? listHabits(auth.user.id, tz).filter((h) => !needle || normalizeArabic(h.title).includes(needle))
    : [];

  const categories = types.includes('category')
    ? listCategories(auth.user.id).filter((c) => !needle || normalizeArabic(c.name).includes(needle))
    : [];

  return ok({
    tasks,
    events,
    habits,
    categories,
    total: tasks.length + events.length + habits.length + categories.length,
  });
});
