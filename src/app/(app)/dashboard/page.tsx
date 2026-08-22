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
  const tz = user?.timezone || 'UTC';
  const today = todayKey(tz);

  let summary = { completed: 0, total: 0, percentage: 0 };
  let agenda = [];
  let tasks = [];
  let habits = [];
  let overdue = [];

  try {
    summary = dashboardSummary(user.id, tz) || summary;
    agenda = todayAgenda(user.id, tz) || agenda;
    tasks = listTasks(user.id, tz, { view: 'today' }) || tasks;
    const allHabits = listHabits(user.id, tz) || [];
    habits = allHabits.filter((h) => isScheduledDay(h.frequency, h.targetDays, today));
    overdue = overdueTasks(user.id, 10) || overdue;
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error);
  }

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