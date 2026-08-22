import 'server-only';
import { listTasks, countsForUser, overdueTasks } from '../repos/tasks';
import { listEvents } from '../repos/events';
import { habitsDueToday } from '../repos/habits';
import { todayKey } from '@/lib/datetime';
import { colorOf } from '@/lib/constants';
import type { AgendaItem, DashboardSummary } from '@/lib/types';

/**
 * خدمة الجدول الزمني: تدمج المهام والمواعيد والعادات في تدفّق واحد
 * مرتّب حسب الوقت — وهو ما تعرضه لوحة التحكم والتقويم.
 */

export function buildAgenda(userId: string, tz: string, fromKey: string, toKey: string): AgendaItem[] {
  const tasks = listTasks(userId, tz, { view: 'range', from: fromKey, to: toKey, limit: 1000 });
  const events = listEvents(userId, tz, { from: fromKey, to: toKey });
  const now = Date.now();

  const items: AgendaItem[] = [
    ...tasks.map((t) => ({
      id: t.id,
      kind: 'task' as const,
      title: t.title,
      at: t.dueAt,
      allDay: t.allDay,
      done: t.status === 'completed',
      priority: t.priority,
      color: t.category?.color ?? 'indigo',
      categoryName: t.category?.name ?? null,
      overdue: t.status === 'pending' && !!t.dueAt && new Date(t.dueAt).getTime() < now,
    })),
    ...events.map((e) => ({
      id: e.id,
      kind: 'event' as const,
      title: e.title,
      at: e.startAt,
      endAt: e.endAt,
      allDay: e.allDay,
      done: false,
      color: e.color,
      categoryName: e.category?.name ?? null,
      location: e.location,
      overdue: false,
    })),
  ];

  return items.sort((a, b) => {
    if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
    if (!a.at) return 1;
    if (!b.at) return -1;
    return new Date(a.at).getTime() - new Date(b.at).getTime();
  });
}

export function todayAgenda(userId: string, tz: string): AgendaItem[] {
  const key = todayKey(tz);
  return buildAgenda(userId, tz, key, key);
}

export function dashboardSummary(userId: string, tz: string): DashboardSummary {
  const counts = countsForUser(userId, tz);
  const habits = habitsDueToday(userId, tz);
  const agenda = todayAgenda(userId, tz);
  const now = Date.now();

  const nextUp =
    agenda.find((i) => !i.done && i.at && new Date(i.at).getTime() >= now) ??
    agenda.find((i) => !i.done) ??
    null;

  const totalTracked = counts.todayTotal + habits.dueCount;
  const totalDone = counts.todayCompleted + habits.doneCount;

  return {
    todayTotal: counts.todayTotal,
    todayCompleted: counts.todayCompleted,
    overdue: counts.overdue,
    completionRate: totalTracked ? Math.round((totalDone / totalTracked) * 100) : 0,
    nextUp,
    habitsDueToday: habits.dueCount,
    habitsDoneToday: habits.doneCount,
    streak: habits.bestStreak,
  };
}

/**
 * اقتراحات إعادة الجدولة الذكية للمهام المتأخرة.
 * المنطق: نقترح ثلاثة أوقات واقعية — قريبة اليوم، مساء الغد، وصباح بعد غد —
 * مع تجنّب الأوقات المزدحمة بالفعل في جدول المستخدم.
 */
export function rescheduleSuggestions(userId: string, tz: string) {
  const overdue = overdueTasks(userId, 10);
  if (!overdue.length) return { tasks: [], suggestions: [] };

  const today = todayKey(tz);
  const tomorrow = addDays(today, 1);
  const dayAfter = addDays(today, 2);

  const busy = new Set(
    buildAgenda(userId, tz, today, dayAfter)
      .filter((i) => i.at && !i.allDay)
      .map((i) => `${i.at!.slice(0, 13)}`),
  );

  const candidates = [
    { date: today, time: '20:00', label: 'اليوم ٨:٠٠ مساءً' },
    { date: tomorrow, time: '09:00', label: 'غدًا ٩:٠٠ صباحًا' },
    { date: tomorrow, time: '19:00', label: 'غدًا ٧:٠٠ مساءً' },
    { date: tomorrow, time: '21:00', label: 'غدًا ٩:٠٠ مساءً' },
    { date: dayAfter, time: '10:00', label: 'بعد غد ١٠:٠٠ صباحًا' },
  ];

  const free = candidates.filter((c) => !busy.has(`${c.date}T${c.time.slice(0, 2)}`)).slice(0, 3);
  return {
    tasks: overdue,
    suggestions: free.length ? free : candidates.slice(0, 3),
  };
}

function addDays(key: string, days: number) {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${dt.getUTCFullYear()}-${p(dt.getUTCMonth() + 1)}-${p(dt.getUTCDate())}`;
}

export { colorOf };
