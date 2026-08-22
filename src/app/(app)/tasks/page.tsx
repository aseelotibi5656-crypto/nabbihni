import { Suspense } from 'react';
import type { Metadata } from 'next';
import { TasksView } from '@/components/app/tasks-view';
import { SkeletonList } from '@/components/ui/primitives';
import { requireUser } from '@/server/auth/current-user';
import { listTasks } from '@/server/repos/tasks';

export const metadata: Metadata = { title: 'المهام' };
export const dynamic = 'force-dynamic';

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; category?: string }>;
}) {
  const user = await requireUser('/tasks');
  const params = await searchParams;
  const tz = user.timezone;
  const view = (params.view as 'today' | 'upcoming' | 'overdue' | 'all' | 'completed') ?? 'today';

  const initialTasks = listTasks(user.id, tz, { view, categoryId: params.category });

  const counts = {
    today: listTasks(user.id, tz, { view: 'today' }).length,
    upcoming: listTasks(user.id, tz, { view: 'upcoming' }).length,
    overdue: listTasks(user.id, tz, { view: 'overdue' }).length,
    all: listTasks(user.id, tz, { view: 'all' }).length,
    completed: listTasks(user.id, tz, { view: 'completed' }).length,
  };

  return (
    <Suspense fallback={<SkeletonList rows={6} />}>
      <TasksView initialTasks={initialTasks} counts={counts} />
    </Suspense>
  );
}
