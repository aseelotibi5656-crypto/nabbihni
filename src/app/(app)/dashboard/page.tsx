import type { Metadata } from 'next';
import { DashboardView } from '@/components/app/dashboard-view';
import { requireUser } from '@/server/auth/current-user';
import { dashboardSummary, todayAgenda } from '@/server/services/agenda';
import { listTasks, overdueTasks } from '@/server/repos/tasks';
import { listHabits, isScheduledDay } from '@/server/repos/habits';
import { todayKey } from '@/lib/datetime';

export const metadata: Metadata = { title: 'لوحة التحكم' };
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await requireUser('/dashboard');
  const tz = user.timezone;
  const today = todayKey(tz);

  const [summary, agenda, tasks, habits, overdue] = [
    dashboardSummary(user.id, tz),
    todayAgenda(user.id, tz),
    listTasks(user.id, tz, { view: 'today' }),
    listHabits(user.id, tz).filter((h) => isScheduledDay(h.frequency, h.targetDays, today)),
    overdueTasks(user.id, 10),
  ];

  return (
    <DashboardView
      summary={summary}
      agenda={agenda}
      tasks={tasks}
      habits={habits}
      overdue={overdue}
    />
  );
}
