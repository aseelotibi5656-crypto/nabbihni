import 'server-only';
import { db } from '../db/client';
import { dayKey, dayRangeUtc, todayKey } from '@/lib/datetime';
import { addDaysKey, diffDaysKeys } from '@/lib/recurrence-helpers';
import { WEEKDAYS_SHORT_AR, MONTHS_AR } from '@/lib/constants';
import { listHabits } from '../repos/habits';
import type { AnalyticsPayload, Priority } from '@/lib/types';

/**
 * خدمة الإحصائيات: تحسب كل الأرقام في استعلامات قليلة ثم تجمّعها في الذاكرة.
 * التجميع بمفتاح اليوم يتم بتوقيت المستخدم لا بتوقيت الخادم.
 */
export function buildAnalytics(userId: string, tz: string, days = 30): AnalyticsPayload {
  const today = todayKey(tz);
  const fromKey = addDaysKey(today, -(days - 1));
  const { from } = dayRangeUtc(fromKey, tz);
  const { to } = dayRangeUtc(today, tz);

  const created = db.all<{ created_at: string; due_at: string | null; status: string; priority: string; category_id: string | null; duration_min: number | null; completed_at: string | null }>(
    `SELECT created_at, due_at, status, priority, category_id, duration_min, completed_at
     FROM tasks WHERE user_id = ? AND created_at >= ?`,
    [userId, from],
  );

  const completed = db.all<{ completed_at: string; priority: string; category_id: string | null; duration_min: number | null }>(
    `SELECT completed_at, priority, category_id, duration_min
     FROM tasks WHERE user_id = ? AND status = 'completed' AND completed_at >= ? AND completed_at < ?`,
    [userId, from, to],
  );

  const overdueRow = db.get<{ n: number }>(
    `SELECT COUNT(*) AS n FROM tasks WHERE user_id = ? AND status = 'pending' AND due_at IS NOT NULL AND due_at < ?`,
    [userId, new Date().toISOString()],
  );
  const pendingRow = db.get<{ n: number }>(
    `SELECT COUNT(*) AS n FROM tasks WHERE user_id = ? AND status = 'pending'`,
    [userId],
  );

  // ------- سلسلة يومية -------
  const dailyMap = new Map<string, { completed: number; created: number }>();
  for (let i = 0; i < days; i++) {
    dailyMap.set(addDaysKey(fromKey, i), { completed: 0, created: 0 });
  }
  for (const row of completed) {
    const key = dayKey(row.completed_at, tz);
    const bucket = dailyMap.get(key);
    if (bucket) bucket.completed++;
  }
  for (const row of created) {
    const key = dayKey(row.created_at, tz);
    const bucket = dailyMap.get(key);
    if (bucket) bucket.created++;
  }
  const daily = [...dailyMap.entries()].map(([date, v]) => ({ date, ...v }));

  // ------- حسب يوم الأسبوع -------
  const weekdayTotals = new Array(7).fill(0);
  for (const row of completed) {
    const key = dayKey(row.completed_at, tz);
    const [y, m, d] = key.split('-').map(Number);
    weekdayTotals[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]++;
  }
  const byWeekday = weekdayTotals.map((completedCount, weekday) => ({
    weekday,
    label: WEEKDAYS_SHORT_AR[weekday],
    completed: completedCount,
  }));

  // ------- حسب التصنيف -------
  const categories = db.all<{ id: string; name: string; color: string }>(
    'SELECT id, name, color FROM categories WHERE user_id = ?',
    [userId],
  );
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const catAgg = new Map<string, { name: string; color: string; completed: number; total: number }>();
  const bump = (id: string | null, field: 'completed' | 'total') => {
    const cat = id ? catMap.get(id) : null;
    const key = cat?.id ?? '__none__';
    if (!catAgg.has(key)) {
      catAgg.set(key, { name: cat?.name ?? 'بدون تصنيف', color: cat?.color ?? 'slate', completed: 0, total: 0 });
    }
    catAgg.get(key)![field]++;
  };
  for (const row of created) bump(row.category_id, 'total');
  for (const row of completed) bump(row.category_id, 'completed');
  const byCategory = [...catAgg.values()].sort((a, b) => b.completed - a.completed).slice(0, 8);

  // ------- حسب الأولوية -------
  const priorityAgg: Record<Priority, number> = { low: 0, medium: 0, high: 0, urgent: 0 };
  for (const row of completed) priorityAgg[row.priority as Priority]++;
  const byPriority = (Object.keys(priorityAgg) as Priority[]).map((p) => ({
    priority: p,
    count: priorityAgg[p],
  }));

  // ------- العادات -------
  const habits = listHabits(userId, tz);
  const habitLogsRow = db.get<{ n: number }>(
    `SELECT COUNT(*) AS n FROM habit_logs WHERE user_id = ? AND completed = 1 AND date >= ?`,
    [userId, fromKey],
  );

  // ------- شهري (آخر ٦ أشهر) -------
  const monthlyRows = db.all<{ completed_at: string }>(
    `SELECT completed_at FROM tasks WHERE user_id = ? AND status = 'completed' AND completed_at IS NOT NULL`,
    [userId],
  );
  const monthAgg = new Map<string, number>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setUTCMonth(d.getUTCMonth() - i, 1);
    monthAgg.set(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`, 0);
  }
  for (const row of monthlyRows) {
    const key = dayKey(row.completed_at, tz).slice(0, 7);
    if (monthAgg.has(key)) monthAgg.set(key, monthAgg.get(key)! + 1);
  }
  const monthly = [...monthAgg.entries()].map(([key, value]) => ({
    month: MONTHS_AR[Number(key.split('-')[1]) - 1],
    completed: value,
  }));

  const focusMinutes = completed.reduce((sum, r) => sum + (r.duration_min ?? 0), 0);
  const totalCreated = created.length;
  const totalCompleted = completed.length;

  return {
    range: { from: fromKey, to: today, days },
    totals: {
      created: totalCreated,
      completed: totalCompleted,
      overdue: Number(overdueRow?.n ?? 0),
      pending: Number(pendingRow?.n ?? 0),
      completionRate: totalCreated ? Math.round((totalCompleted / totalCreated) * 100) : 0,
      focusMinutes,
      habitCompletions: Number(habitLogsRow?.n ?? 0),
      bestStreak: habits.reduce((m, h) => Math.max(m, h.stats.longestStreak), 0),
    },
    daily,
    byWeekday,
    byCategory,
    byPriority,
    habits: habits.map((h) => ({
      title: h.title,
      color: h.color,
      rate: h.stats.completionRate,
      streak: h.stats.currentStreak,
    })),
    monthly,
  };
}

export { diffDaysKeys };
