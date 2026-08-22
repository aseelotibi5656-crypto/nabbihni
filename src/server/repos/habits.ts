import 'server-only';
import { db, bool, int, nul, type SqlParam } from '../db/client';
import { newId, nowIso } from '../db/ids';
import { syncReminders, cancelRemindersFor } from './reminders';
import { addDaysKey, diffDaysKeys, weekdayOfKey } from '@/lib/recurrence-helpers';
import { todayKey, zonedToUtc } from '@/lib/datetime';
import type { Habit, HabitStats, HabitFrequency } from '@/lib/types';
import type { HabitCreateInput } from '@/lib/validation';

interface HabitRow {
  id: string;
  title: string;
  description: string | null;
  icon: string;
  color: string;
  frequency: string;
  target_days: string;
  target_per_period: number;
  unit: string;
  time_of_day: string | null;
  is_archived: number;
  start_date: string;
  category_id: string | null;
  created_at: string;
}

const LOOKBACK_DAYS = 120;

export function listHabits(userId: string, tz: string, includeArchived = false): Habit[] {
  const rows = db.all<HabitRow>(
    `SELECT id, title, description, icon, color, frequency, target_days, target_per_period, unit,
            time_of_day, is_archived, start_date, category_id, created_at
     FROM habits WHERE user_id = ? ${includeArchived ? '' : 'AND is_archived = 0'}
     ORDER BY created_at ASC`,
    [userId],
  );
  if (!rows.length) return [];

  const since = addDaysKey(todayKey(tz), -LOOKBACK_DAYS);
  const logRows = db.all<{ habit_id: string; date: string; completed: number }>(
    `SELECT habit_id, date, completed FROM habit_logs WHERE user_id = ? AND date >= ? ORDER BY date ASC`,
    [userId, since],
  );
  const logsByHabit = new Map<string, string[]>();
  for (const l of logRows) {
    if (!l.completed) continue;
    if (!logsByHabit.has(l.habit_id)) logsByHabit.set(l.habit_id, []);
    logsByHabit.get(l.habit_id)!.push(l.date);
  }

  return rows.map((row) => mapHabit(row, logsByHabit.get(row.id) ?? [], tz));
}

export function getHabit(userId: string, tz: string, id: string): Habit | null {
  const row = db.get<HabitRow>(
    `SELECT id, title, description, icon, color, frequency, target_days, target_per_period, unit,
            time_of_day, is_archived, start_date, category_id, created_at
     FROM habits WHERE id = ? AND user_id = ?`,
    [id, userId],
  );
  if (!row) return null;
  const logs = db
    .all<{ date: string }>(
      `SELECT date FROM habit_logs WHERE habit_id = ? AND completed = 1 ORDER BY date ASC`,
      [id],
    )
    .map((l) => l.date);
  return mapHabit(row, logs, tz);
}

function mapHabit(row: HabitRow, logs: string[], tz: string): Habit {
  const targetDays = row.target_days.split(',').filter(Boolean).map(Number);
  const stats = computeStats(logs, targetDays, row.frequency as HabitFrequency, row.start_date.slice(0, 10), tz);
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    icon: row.icon,
    color: row.color,
    frequency: row.frequency as HabitFrequency,
    targetDays,
    targetPerPeriod: row.target_per_period,
    unit: row.unit,
    timeOfDay: row.time_of_day,
    isArchived: bool(row.is_archived),
    startDate: row.start_date,
    categoryId: row.category_id,
    stats,
    logs,
    createdAt: row.created_at,
  };
}

/** هل هذا اليوم مستهدف لهذه العادة؟ */
export function isScheduledDay(frequency: HabitFrequency, targetDays: number[], key: string): boolean {
  if (frequency === 'daily') return true;
  if (frequency === 'custom_days') return targetDays.includes(weekdayOfKey(key));
  return true; // times_per_week: أي يوم مقبول
}

/**
 * حساب السلاسل ونسبة الالتزام.
 * السلسلة الحالية تُحتسب بالرجوع من اليوم (أو أمس إن لم يُنجز اليوم بعد)
 * مع تجاهل الأيام غير المستهدفة حتى لا تنكسر السلسلة في يوم راحة.
 */
export function computeStats(
  logs: string[],
  targetDays: number[],
  frequency: HabitFrequency,
  startDate: string,
  tz: string,
): HabitStats {
  const set = new Set(logs);
  const today = todayKey(tz);
  const doneToday = set.has(today);

  // أقدم تاريخ معتبر: بداية العادة أو أقدم سجل إن كان المستخدم قد سجّل أيامًا سابقة
  const earliestLog = logs.length ? logs.reduce((a, b) => (a < b ? a : b)) : startDate;
  const effectiveStart = diffDaysKeys(earliestLog, startDate) < 0 ? earliestLog : startDate;

  let current = 0;
  let cursor = doneToday ? today : addDaysKey(today, -1);
  for (let i = 0; i < 365; i++) {
    if (diffDaysKeys(cursor, effectiveStart) < 0) break;
    if (!isScheduledDay(frequency, targetDays, cursor)) {
      cursor = addDaysKey(cursor, -1);
      continue;
    }
    if (set.has(cursor)) {
      current++;
      cursor = addDaysKey(cursor, -1);
    } else break;
  }

  // أطول سلسلة عبر كل السجل
  const sorted = [...set].sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const day of sorted) {
    if (prev) {
      let gapOk = true;
      let probe = addDaysKey(prev, 1);
      while (diffDaysKeys(day, probe) > 0) {
        if (isScheduledDay(frequency, targetDays, probe)) {
          gapOk = false;
          break;
        }
        probe = addDaysKey(probe, 1);
      }
      run = gapOk ? run + 1 : 1;
    } else run = 1;
    longest = Math.max(longest, run);
    prev = day;
  }

  // نسبة الالتزام على آخر ٣٠ يوماً من الأيام المستهدفة
  let scheduled = 0;
  let done = 0;
  for (let i = 0; i < 30; i++) {
    const key = addDaysKey(today, -i);
    if (diffDaysKeys(key, effectiveStart) < 0) break;
    if (!isScheduledDay(frequency, targetDays, key)) continue;
    scheduled++;
    if (set.has(key)) done++;
  }

  const weekProgress = Array.from({ length: 7 }, (_, i) => {
    const key = addDaysKey(today, -(6 - i));
    return {
      date: key,
      done: set.has(key),
      scheduled: isScheduledDay(frequency, targetDays, key),
    };
  });

  return {
    currentStreak: current,
    longestStreak: Math.max(longest, current),
    completionRate: scheduled ? Math.round((done / scheduled) * 100) : 0,
    totalCompletions: set.size,
    weekProgress,
    doneToday,
  };
}

export function createHabit(userId: string, tz: string, input: HabitCreateInput): Habit {
  const id = newId('hab_');
  const now = nowIso();
  const targetDays = (input.targetDays?.length ? input.targetDays : [0, 1, 2, 3, 4, 5, 6]).join(',');

  db.transaction(() => {
    db.run(
      `INSERT INTO habits (id, user_id, category_id, title, description, icon, color, frequency,
        target_days, target_per_period, unit, time_of_day, is_archived, start_date, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,0,?,?,?)`,
      [
        id,
        userId,
        nul(input.categoryId ?? null),
        input.title.trim(),
        nul(input.description ?? null),
        input.icon ?? 'sparkles',
        input.color ?? 'emerald',
        input.frequency ?? 'daily',
        targetDays,
        input.targetPerPeriod ?? 1,
        input.unit ?? 'مرة',
        nul(input.timeOfDay ?? null),
        todayKey(tz),
        now,
        now,
      ],
    );
    if (input.reminderEnabled && input.timeOfDay) {
      syncReminders({
        userId,
        offsets: [0],
        baseAt: zonedToUtc(todayKey(tz), input.timeOfDay, tz).toISOString(),
        habitId: id,
      });
    }
  });

  return getHabit(userId, tz, id)!;
}

export function updateHabit(
  userId: string,
  tz: string,
  id: string,
  input: Partial<HabitCreateInput> & { isArchived?: boolean },
): Habit | null {
  const existing = getHabit(userId, tz, id);
  if (!existing) return null;

  const sets: string[] = [];
  const params: SqlParam[] = [];
  const push = (c: string, v: SqlParam) => {
    sets.push(`${c} = ?`);
    params.push(v);
  };

  if (input.title !== undefined) push('title', input.title.trim());
  if (input.description !== undefined) push('description', nul(input.description));
  if (input.icon !== undefined) push('icon', input.icon);
  if (input.color !== undefined) push('color', input.color);
  if (input.frequency !== undefined) push('frequency', input.frequency);
  if (input.targetDays !== undefined) push('target_days', input.targetDays.join(','));
  if (input.targetPerPeriod !== undefined) push('target_per_period', input.targetPerPeriod);
  if (input.unit !== undefined) push('unit', input.unit);
  if (input.timeOfDay !== undefined) push('time_of_day', nul(input.timeOfDay));
  if (input.categoryId !== undefined) push('category_id', nul(input.categoryId));
  if (input.isArchived !== undefined) push('is_archived', int(input.isArchived));
  push('updated_at', nowIso());

  db.run(`UPDATE habits SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`, [...params, id, userId]);

  if (input.timeOfDay !== undefined) {
    if (input.timeOfDay) {
      syncReminders({
        userId,
        offsets: [0],
        baseAt: zonedToUtc(todayKey(tz), input.timeOfDay, tz).toISOString(),
        habitId: id,
      });
    } else cancelRemindersFor('habit_id', id);
  }

  return getHabit(userId, tz, id);
}

export function deleteHabit(userId: string, id: string): boolean {
  return Number(db.run('DELETE FROM habits WHERE id = ? AND user_id = ?', [id, userId]).changes) > 0;
}

/** تسجيل/إلغاء إنجاز عادة في يوم محدد */
export function logHabit(
  userId: string,
  tz: string,
  habitId: string,
  date: string,
  completed: boolean,
  value = 1,
  note?: string | null,
): Habit | null {
  const habit = db.get<{ id: string }>('SELECT id FROM habits WHERE id = ? AND user_id = ?', [
    habitId,
    userId,
  ]);
  if (!habit) return null;

  if (completed) {
    db.run(
      `INSERT INTO habit_logs (id, habit_id, user_id, date, value, completed, note, created_at)
       VALUES (?,?,?,?,?,1,?,?)
       ON CONFLICT(habit_id, date) DO UPDATE SET completed = 1, value = excluded.value, note = excluded.note`,
      [newId('hlg_'), habitId, userId, date, value, nul(note ?? null), nowIso()],
    );
  } else {
    db.run('DELETE FROM habit_logs WHERE habit_id = ? AND date = ?', [habitId, date]);
  }

  return getHabit(userId, tz, habitId);
}

export function habitsDueToday(userId: string, tz: string) {
  const habits = listHabits(userId, tz);
  const today = todayKey(tz);
  const due = habits.filter((h) => isScheduledDay(h.frequency, h.targetDays, today));
  return {
    due,
    dueCount: due.length,
    doneCount: due.filter((h) => h.stats.doneToday).length,
    bestStreak: habits.reduce((m, h) => Math.max(m, h.stats.currentStreak), 0),
  };
}
