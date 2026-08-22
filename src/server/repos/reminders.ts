import 'server-only';
import { db, nul } from '../db/client';
import { newId, nowIso } from '../db/ids';
import type { Reminder, ReminderChannel } from '@/lib/types';

interface ReminderRow {
  id: string;
  offset_minutes: number;
  trigger_at: string;
  channel: string;
  status: string;
  task_id: string | null;
  event_id: string | null;
  habit_id: string | null;
}

export function mapReminder(r: ReminderRow): Reminder {
  return {
    id: r.id,
    offsetMinutes: r.offset_minutes,
    triggerAt: r.trigger_at,
    channel: r.channel as ReminderChannel,
    status: r.status as Reminder['status'],
    taskId: r.task_id,
    eventId: r.event_id,
    habitId: r.habit_id,
  };
}

/**
 * إعادة بناء تذكيرات عنصر: نحذف المجدولة غير المرسلة ثم ننشئ الجديدة.
 * التذكيرات المرسلة تبقى كسجل تاريخي.
 */
export function syncReminders(params: {
  userId: string;
  offsets: number[];
  baseAt: string | null;
  taskId?: string | null;
  eventId?: string | null;
  habitId?: string | null;
  channel?: ReminderChannel;
}) {
  const { userId, offsets, baseAt, taskId, eventId, habitId, channel = 'push' } = params;
  const owner = taskId ? 'task_id' : eventId ? 'event_id' : 'habit_id';
  const ownerId = taskId ?? eventId ?? habitId;
  if (!ownerId) return;

  db.run(`DELETE FROM reminders WHERE ${owner} = ? AND status = 'scheduled'`, [ownerId]);
  if (!baseAt || !offsets.length) return;

  const base = new Date(baseAt).getTime();
  const unique = Array.from(new Set(offsets)).sort((a, b) => b - a);
  for (const offset of unique) {
    const triggerAt = new Date(base - offset * 60_000).toISOString();
    db.run(
      `INSERT INTO reminders (id, user_id, task_id, event_id, habit_id, offset_minutes, trigger_at, channel, status, created_at)
       VALUES (?,?,?,?,?,?,?,?,'scheduled',?)`,
      [
        newId('rem_'),
        userId,
        nul(taskId ?? null),
        nul(eventId ?? null),
        nul(habitId ?? null),
        offset,
        triggerAt,
        channel,
        nowIso(),
      ],
    );
  }
}

export function remindersFor(column: 'task_id' | 'event_id' | 'habit_id', ids: string[]) {
  if (!ids.length) return new Map<string, Reminder[]>();
  const placeholders = ids.map(() => '?').join(',');
  const rows = db.all<ReminderRow>(
    `SELECT id, offset_minutes, trigger_at, channel, status, task_id, event_id, habit_id
     FROM reminders WHERE ${column} IN (${placeholders}) ORDER BY offset_minutes DESC`,
    ids,
  );
  const map = new Map<string, Reminder[]>();
  for (const row of rows) {
    const key = (row as unknown as Record<string, string>)[column];
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(mapReminder(row));
  }
  return map;
}

/** التذكيرات المستحقة للإرسال الآن */
export function dueReminders(limit = 100) {
  return db.all<{
    id: string;
    user_id: string;
    task_id: string | null;
    event_id: string | null;
    habit_id: string | null;
    offset_minutes: number;
    trigger_at: string;
    channel: string;
  }>(
    `SELECT id, user_id, task_id, event_id, habit_id, offset_minutes, trigger_at, channel
     FROM reminders
     WHERE status = 'scheduled' AND trigger_at <= ?
     ORDER BY trigger_at ASC LIMIT ?`,
    [nowIso(), limit],
  );
}

export function markReminder(id: string, status: 'sent' | 'failed' | 'cancelled' | 'dismissed', error?: string) {
  db.run(
    `UPDATE reminders SET status = ?, sent_at = ?, attempts = attempts + 1, last_error = ? WHERE id = ?`,
    [status, status === 'sent' ? nowIso() : null, nul(error ?? null), id],
  );
}

export function cancelRemindersFor(column: 'task_id' | 'event_id' | 'habit_id', id: string) {
  db.run(`UPDATE reminders SET status = 'cancelled' WHERE ${column} = ? AND status = 'scheduled'`, [id]);
}
