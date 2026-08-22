import type { Metadata } from 'next';
import { CalendarView } from '@/components/app/calendar-view';
import { requireUser } from '@/server/auth/current-user';
import { listTasks } from '@/server/repos/tasks';
import { listEvents } from '@/server/repos/events';
import { listHabits } from '@/server/repos/habits';
import { todayKey, monthGrid } from '@/lib/datetime';

export const metadata: Metadata = { title: 'التقويم' };
export const dynamic = 'force-dynamic';

export default async function CalendarPage() {
  const user = await requireUser('/calendar');
  const tz = user.timezone;
  const today = todayKey(tz);
  const [year, month] = today.split('-').map(Number);
  const grid = monthGrid(year, month, 0);
  const from = grid[0];
  const to = grid[grid.length - 1];

  return (
    <CalendarView
      initialTasks={listTasks(user.id, tz, { view: 'range', from, to, limit: 500 })}
      initialEvents={listEvents(user.id, tz, { from, to })}
      habits={listHabits(user.id, tz)}
    />
  );
}
