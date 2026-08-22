import 'server-only';
import { db, bool, int, nul, type SqlParam } from '../db/client';
import { newId, nowIso } from '../db/ids';
import { remindersFor, syncReminders, cancelRemindersFor } from './reminders';
import { parseRule, matchesRule } from '@/lib/recurrence';
import { addDaysKey } from '@/lib/recurrence-helpers';
import { dayKey, dayRangeUtc, todayKey, zonedToUtc } from '@/lib/datetime';
import { normalizeArabic } from '@/lib/utils';
import type { Task, Priority, TaskStatus, RecurrenceRule, Attachment } from '@/lib/types';
import type { TaskCreateInput, TaskUpdateInput } from '@/lib/validation';

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  notes: string | null;
  due_at: string | null;
  all_day: number;
  duration_min: number | null;
  priority: string;
  status: string;
  completed_at: string | null;
  reschedule_count: number;
  is_recurring: number;
  recurrence_rule: string | null;
  recurrence_parent_id: string | null;
  category_id: string | null;
  created_at: string;
  updated_at: string;
  cat_name?: string | null;
  cat_color?: string | null;
  cat_icon?: string | null;
}

const SELECT_TASK = `
  SELECT t.id, t.title, t.description, t.notes, t.due_at, t.all_day, t.duration_min,
         t.priority, t.status, t.completed_at, t.reschedule_count, t.is_recurring,
         t.recurrence_rule, t.recurrence_parent_id, t.category_id, t.created_at, t.updated_at,
         c.name AS cat_name, c.color AS cat_color, c.icon AS cat_icon
  FROM tasks t
  LEFT JOIN categories c ON c.id = t.category_id
`;

function mapTask(row: TaskRow, extras?: { reminders?: Task['reminders']; attachments?: Attachment[] }): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    notes: row.notes,
    dueAt: row.due_at,
    allDay: bool(row.all_day),
    durationMin: row.duration_min,
    priority: row.priority as Priority,
    status: row.status as TaskStatus,
    completedAt: row.completed_at,
    rescheduleCount: row.reschedule_count,
    isRecurring: bool(row.is_recurring),
    recurrenceRule: parseRule(row.recurrence_rule),
    recurrenceParentId: row.recurrence_parent_id,
    categoryId: row.category_id,
    category: row.cat_name
      ? { id: row.category_id!, name: row.cat_name, color: row.cat_color ?? 'indigo', icon: row.cat_icon ?? 'folder' }
      : null,
    reminders: extras?.reminders ?? [],
    attachments: extras?.attachments ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function hydrate(rows: TaskRow[]): Task[] {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const reminders = remindersFor('task_id', ids);
  const placeholders = ids.map(() => '?').join(',');
  const attachmentRows = db.all<{
    id: string;
    task_id: string;
    name: string;
    url: string;
    mime_type: string;
    size: number;
  }>(`SELECT id, task_id, name, url, mime_type, size FROM attachments WHERE task_id IN (${placeholders})`, ids);
  const attachments = new Map<string, Attachment[]>();
  for (const a of attachmentRows) {
    if (!attachments.has(a.task_id)) attachments.set(a.task_id, []);
    attachments.get(a.task_id)!.push({ id: a.id, name: a.name, url: a.url, mimeType: a.mime_type, size: a.size });
  }
  return rows.map((r) =>
    mapTask(r, { reminders: reminders.get(r.id) ?? [], attachments: attachments.get(r.id) ?? [] }),
  );
}

// ------------------------------- الاستعلامات -------------------------------

export interface TaskFilters {
  view?: 'today' | 'upcoming' | 'overdue' | 'completed' | 'all' | 'range';
  from?: string;
  to?: string;
  q?: string;
  priority?: string;
  categoryId?: string;
  status?: string;
  limit?: number;
}

export function listTasks(userId: string, tz: string, filters: TaskFilters = {}): Task[] {
  const where: string[] = ['t.user_id = ?'];
  const params: SqlParam[] = [userId];
  const now = nowIso();
  const today = todayKey(tz);

  switch (filters.view) {
    case 'today': {
      const { from, to } = dayRangeUtc(today, tz);
      where.push('t.due_at >= ? AND t.due_at < ?', "t.status != 'archived'");
      params.push(from, to);
      break;
    }
    case 'upcoming': {
      const { to } = dayRangeUtc(today, tz);
      where.push('t.due_at >= ?', "t.status = 'pending'");
      params.push(to);
      break;
    }
    case 'overdue': {
      where.push('t.due_at < ?', "t.status = 'pending'");
      params.push(now);
      break;
    }
    case 'completed':
      where.push("t.status = 'completed'");
      break;
    case 'range': {
      if (filters.from && filters.to) {
        const start = dayRangeUtc(filters.from, tz).from;
        const end = dayRangeUtc(filters.to, tz).to;
        where.push('t.due_at >= ? AND t.due_at < ?', "t.status != 'archived'");
        params.push(start, end);
      }
      break;
    }
    default:
      where.push("t.status != 'archived'");
  }

  if (filters.status && filters.view !== 'completed') {
    const statuses = filters.status.split(',').filter(Boolean);
    if (statuses.length) {
      where.push(`t.status IN (${statuses.map(() => '?').join(',')})`);
      params.push(...statuses);
    }
  }
  if (filters.priority) {
    const list = filters.priority.split(',').filter(Boolean);
    if (list.length) {
      where.push(`t.priority IN (${list.map(() => '?').join(',')})`);
      params.push(...list);
    }
  }
  if (filters.categoryId) {
    where.push('t.category_id = ?');
    params.push(filters.categoryId);
  }

  const limit = filters.limit ?? 300;
  const rows = db.all<TaskRow>(
    `${SELECT_TASK} WHERE ${where.join(' AND ')}
     ORDER BY (t.due_at IS NULL) ASC, t.due_at ASC, t.sort_order ASC, t.created_at DESC
     LIMIT ?`,
    [...params, limit],
  );

  let tasks = hydrate(rows);

  // البحث النصي يتم بعد الجلب مع تطبيع الحروف العربية (همزات/تاء مربوطة/تشكيل)
  if (filters.q?.trim()) {
    const needle = normalizeArabic(filters.q);
    tasks = tasks.filter(
      (t) =>
        normalizeArabic(t.title).includes(needle) ||
        normalizeArabic(t.description ?? '').includes(needle) ||
        normalizeArabic(t.notes ?? '').includes(needle) ||
        normalizeArabic(t.category?.name ?? '').includes(needle),
    );
  }
  return tasks;
}

export function getTask(userId: string, id: string): Task | null {
  const row = db.get<TaskRow>(`${SELECT_TASK} WHERE t.id = ? AND t.user_id = ?`, [id, userId]);
  if (!row) return null;
  return hydrate([row])[0];
}

/** المهام المستحقة في يوم معيّن مع توسعة المهام المتكررة */
export function tasksForRange(userId: string, tz: string, fromKey: string, toKey: string): Task[] {
  return listTasks(userId, tz, { view: 'range', from: fromKey, to: toKey, limit: 1000 });
}

// ------------------------------- الكتابة -------------------------------

function computeDueAt(date: string | null | undefined, time: string | null | undefined, tz: string) {
  if (!date) return null;
  return zonedToUtc(date, time ?? '00:00', tz).toISOString();
}

export function createTask(
  userId: string,
  tz: string,
  input: TaskCreateInput,
  defaults: { workspaceId?: string | null; reminderOffsets?: number[] } = {},
): Task {
  const id = newId('tsk_');
  const now = nowIso();
  const dueAt = computeDueAt(input.date, input.time, tz);
  const rule = input.recurrence ?? null;

  db.transaction(() => {
    db.run(
      `INSERT INTO tasks (id, user_id, workspace_id, category_id, title, description, notes,
        due_at, all_day, duration_min, priority, status, is_recurring, recurrence_rule,
        occurrence_date, sort_order, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,'pending',?,?,?,0,?,?)`,
      [
        id,
        userId,
        nul(defaults.workspaceId ?? null),
        nul(input.categoryId ?? null),
        input.title.trim(),
        nul(input.description ?? null),
        nul(input.notes ?? null),
        dueAt,
        int(input.allDay ?? !input.time),
        nul(input.durationMin ?? null),
        input.priority ?? 'medium',
        int(Boolean(rule)),
        rule ? JSON.stringify(rule) : null,
        input.date ?? null,
        now,
        now,
      ],
    );

    for (const att of input.attachments ?? []) {
      db.run(
        `INSERT INTO attachments (id, task_id, name, url, mime_type, size, created_at) VALUES (?,?,?,?,?,?,?)`,
        [newId('att_'), id, att.name, att.url, att.mimeType, att.size, now],
      );
    }

    const offsets = input.reminderOffsets ?? defaults.reminderOffsets ?? [];
    syncReminders({ userId, offsets, baseAt: dueAt, taskId: id });
  });

  return getTask(userId, id)!;
}

export function updateTask(userId: string, tz: string, id: string, input: TaskUpdateInput): Task | null {
  const existing = getTask(userId, id);
  if (!existing) return null;

  const sets: string[] = [];
  const params: SqlParam[] = [];
  const push = (col: string, value: SqlParam) => {
    sets.push(`${col} = ?`);
    params.push(value);
  };

  if (input.title !== undefined) push('title', input.title.trim());
  if (input.description !== undefined) push('description', nul(input.description));
  if (input.notes !== undefined) push('notes', nul(input.notes));
  if (input.priority !== undefined) push('priority', input.priority);
  if (input.categoryId !== undefined) push('category_id', nul(input.categoryId));
  if (input.durationMin !== undefined) push('duration_min', nul(input.durationMin));
  if (input.allDay !== undefined) push('all_day', int(input.allDay));

  let dueAt = existing.dueAt;
  if (input.date !== undefined || input.time !== undefined) {
    const date = input.date !== undefined ? input.date : existing.dueAt ? dayKey(existing.dueAt, tz) : null;
    const time =
      input.time !== undefined
        ? input.time
        : existing.dueAt && !existing.allDay
          ? new Date(existing.dueAt).toISOString().slice(11, 16)
          : null;
    dueAt = computeDueAt(date, input.time !== undefined ? input.time : time, tz);
    push('due_at', dueAt);
    if (input.allDay === undefined) push('all_day', int(!input.time && !time));
  }

  if (input.recurrence !== undefined) {
    const rule = input.recurrence as RecurrenceRule | null;
    push('is_recurring', int(Boolean(rule)));
    push('recurrence_rule', rule ? JSON.stringify(rule) : null);
  }

  if (input.status !== undefined) {
    push('status', input.status);
    push('completed_at', input.status === 'completed' ? nowIso() : null);
    if (input.status === 'completed') cancelRemindersFor('task_id', id);
  }

  push('updated_at', nowIso());

  db.transaction(() => {
    if (sets.length) {
      db.run(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`, [...params, id, userId]);
    }
    if (input.reminderOffsets !== undefined || input.date !== undefined || input.time !== undefined) {
      const offsets =
        input.reminderOffsets ?? existing.reminders.map((r) => r.offsetMinutes);
      syncReminders({ userId, offsets, baseAt: dueAt, taskId: id });
    }
    if (input.attachments !== undefined) {
      db.run('DELETE FROM attachments WHERE task_id = ?', [id]);
      for (const att of input.attachments) {
        db.run(
          `INSERT INTO attachments (id, task_id, name, url, mime_type, size, created_at) VALUES (?,?,?,?,?,?,?)`,
          [newId('att_'), id, att.name, att.url, att.mimeType, att.size, nowIso()],
        );
      }
    }
  });

  return getTask(userId, id);
}

export function deleteTask(userId: string, id: string): boolean {
  const result = db.run('DELETE FROM tasks WHERE id = ? AND user_id = ?', [id, userId]);
  return Number(result.changes) > 0;
}

/**
 * إكمال مهمة. إذا كانت متكرّرة، تُنشأ النسخة التالية تلقائياً
 * بدل تعطيل السلسلة — وهذا سلوك تطبيقات المهام الاحترافية.
 */
export function completeTask(userId: string, tz: string, id: string, completed: boolean): Task | null {
  const task = getTask(userId, id);
  if (!task) return null;

  db.transaction(() => {
    db.run('UPDATE tasks SET status = ?, completed_at = ?, updated_at = ? WHERE id = ? AND user_id = ?', [
      completed ? 'completed' : 'pending',
      completed ? nowIso() : null,
      nowIso(),
      id,
      userId,
    ]);

    if (completed) {
      cancelRemindersFor('task_id', id);
      if (task.isRecurring && task.recurrenceRule && task.dueAt) {
        spawnNextOccurrence(userId, tz, task);
      }
    } else if (task.dueAt) {
      syncReminders({
        userId,
        offsets: task.reminders.map((r) => r.offsetMinutes),
        baseAt: task.dueAt,
        taskId: id,
      });
    }
  });

  return getTask(userId, id);
}

/** إنشاء النسخة التالية من مهمة متكررة */
function spawnNextOccurrence(userId: string, tz: string, task: Task) {
  const rule = task.recurrenceRule!;
  const currentKey = dayKey(task.dueAt!, tz);
  const time = task.allDay ? null : timeOfIso(task.dueAt!, tz);

  // نبحث عن أول يوم تالٍ مطابق للقاعدة (حتى سنة كحد أقصى)
  const anchor = currentKey;
  let cursor = addDaysKey(currentKey, 1);
  let found: string | null = null;
  for (let i = 0; i < 400; i++) {
    if (matchesRule(rule, anchor, cursor)) {
      found = cursor;
      break;
    }
    cursor = addDaysKey(cursor, 1);
  }
  if (!found) return;

  const nextId = newId('tsk_');
  const now = nowIso();
  const nextDue = zonedToUtc(found, time, tz).toISOString();
  db.run(
    `INSERT INTO tasks (id, user_id, workspace_id, category_id, title, description, notes,
      due_at, all_day, duration_min, priority, status, is_recurring, recurrence_rule,
      recurrence_parent_id, occurrence_date, sort_order, created_at, updated_at)
     SELECT ?, user_id, workspace_id, category_id, title, description, notes,
       ?, all_day, duration_min, priority, 'pending', is_recurring, recurrence_rule,
       COALESCE(recurrence_parent_id, id), ?, sort_order, ?, ?
     FROM tasks WHERE id = ?`,
    [nextId, nextDue, found, now, now, task.id],
  );
  syncReminders({
    userId,
    offsets: task.reminders.map((r) => r.offsetMinutes),
    baseAt: nextDue,
    taskId: nextId,
  });
}

function timeOfIso(iso: string, tz: string): string {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(d);
  const h = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const m = parts.find((p) => p.type === 'minute')?.value ?? '00';
  return `${h === '24' ? '00' : h}:${m}`;
}

/** إعادة جدولة مهمة إلى وقت جديد */
export function rescheduleTask(
  userId: string,
  tz: string,
  id: string,
  date: string,
  time: string | null,
): Task | null {
  const task = getTask(userId, id);
  if (!task) return null;
  const newDue = zonedToUtc(date, time ?? '09:00', tz).toISOString();

  db.transaction(() => {
    db.run(
      `UPDATE tasks SET due_at = ?, all_day = ?, status = 'pending', completed_at = NULL,
        rescheduled_from = ?, reschedule_count = reschedule_count + 1, updated_at = ?
       WHERE id = ? AND user_id = ?`,
      [newDue, int(!time), task.dueAt, nowIso(), id, userId],
    );
    syncReminders({
      userId,
      offsets: task.reminders.length ? task.reminders.map((r) => r.offsetMinutes) : [10],
      baseAt: newDue,
      taskId: id,
    });
  });

  return getTask(userId, id);
}

/** المهام المتأخرة التي تستحق اقتراح إعادة جدولة */
export function overdueTasks(userId: string, limit = 20): Task[] {
  const rows = db.all<TaskRow>(
    `${SELECT_TASK} WHERE t.user_id = ? AND t.status = 'pending' AND t.due_at IS NOT NULL AND t.due_at < ?
     ORDER BY t.due_at ASC LIMIT ?`,
    [userId, nowIso(), limit],
  );
  return hydrate(rows);
}

export function countsForUser(userId: string, tz: string) {
  const today = todayKey(tz);
  const { from, to } = dayRangeUtc(today, tz);
  const now = nowIso();
  const row = db.get<{
    today_total: number;
    today_done: number;
    overdue: number;
    all_pending: number;
  }>(
    `SELECT
      SUM(CASE WHEN due_at >= ? AND due_at < ? AND status != 'archived' THEN 1 ELSE 0 END) AS today_total,
      SUM(CASE WHEN due_at >= ? AND due_at < ? AND status = 'completed' THEN 1 ELSE 0 END) AS today_done,
      SUM(CASE WHEN due_at < ? AND status = 'pending' THEN 1 ELSE 0 END) AS overdue,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS all_pending
     FROM tasks WHERE user_id = ?`,
    [from, to, from, to, now, userId],
  );
  return {
    todayTotal: Number(row?.today_total ?? 0),
    todayCompleted: Number(row?.today_done ?? 0),
    overdue: Number(row?.overdue ?? 0),
    pending: Number(row?.all_pending ?? 0),
  };
}
