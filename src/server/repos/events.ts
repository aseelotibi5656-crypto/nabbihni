import 'server-only';
import { db, bool, int, nul, type SqlParam } from '../db/client';
import { newId, nowIso } from '../db/ids';
import { remindersFor, syncReminders } from './reminders';
import { dayRangeUtc, zonedToUtc } from '@/lib/datetime';
import { normalizeArabic } from '@/lib/utils';
import type { CalendarEvent } from '@/lib/types';
import type { EventCreateInput } from '@/lib/validation';

interface EventRow {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_at: string;
  end_at: string;
  all_day: number;
  color: string;
  category_id: string | null;
  created_at: string;
  cat_name?: string | null;
  cat_color?: string | null;
}

const SELECT_EVENT = `
  SELECT e.id, e.title, e.description, e.location, e.start_at, e.end_at, e.all_day, e.color,
         e.category_id, e.created_at, c.name AS cat_name, c.color AS cat_color
  FROM events e
  LEFT JOIN categories c ON c.id = e.category_id
`;

function mapEvent(row: EventRow, reminders: CalendarEvent['reminders'] = []): CalendarEvent {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    location: row.location,
    startAt: row.start_at,
    endAt: row.end_at,
    allDay: bool(row.all_day),
    color: row.color,
    categoryId: row.category_id,
    category: row.cat_name
      ? { id: row.category_id!, name: row.cat_name, color: row.cat_color ?? 'indigo' }
      : null,
    reminders,
    createdAt: row.created_at,
  };
}

function hydrate(rows: EventRow[]): CalendarEvent[] {
  if (!rows.length) return [];
  const map = remindersFor('event_id', rows.map((r) => r.id));
  return rows.map((r) => mapEvent(r, map.get(r.id) ?? []));
}

export function listEvents(
  userId: string,
  tz: string,
  opts: { from?: string; to?: string; q?: string; limit?: number } = {},
): CalendarEvent[] {
  const where = ['e.user_id = ?'];
  const params: SqlParam[] = [userId];
  if (opts.from && opts.to) {
    where.push('e.end_at >= ? AND e.start_at < ?');
    params.push(dayRangeUtc(opts.from, tz).from, dayRangeUtc(opts.to, tz).to);
  }
  const rows = db.all<EventRow>(
    `${SELECT_EVENT} WHERE ${where.join(' AND ')} ORDER BY e.start_at ASC LIMIT ?`,
    [...params, opts.limit ?? 500],
  );
  let events = hydrate(rows);
  if (opts.q?.trim()) {
    const needle = normalizeArabic(opts.q);
    events = events.filter(
      (e) =>
        normalizeArabic(e.title).includes(needle) ||
        normalizeArabic(e.location ?? '').includes(needle) ||
        normalizeArabic(e.description ?? '').includes(needle),
    );
  }
  return events;
}

export function getEvent(userId: string, id: string): CalendarEvent | null {
  const row = db.get<EventRow>(`${SELECT_EVENT} WHERE e.id = ? AND e.user_id = ?`, [id, userId]);
  return row ? hydrate([row])[0] : null;
}

export function createEvent(
  userId: string,
  tz: string,
  input: EventCreateInput,
  defaults: { workspaceId?: string | null; reminderOffsets?: number[] } = {},
): CalendarEvent {
  const id = newId('evt_');
  const now = nowIso();
  const allDay = input.allDay ?? !input.startTime;
  const startAt = zonedToUtc(input.date, allDay ? '00:00' : (input.startTime ?? '09:00'), tz);
  const endAt = allDay
    ? zonedToUtc(input.date, '23:59', tz)
    : zonedToUtc(input.date, input.endTime ?? addHour(input.startTime ?? '09:00'), tz);

  db.transaction(() => {
    db.run(
      `INSERT INTO events (id, user_id, workspace_id, category_id, title, description, location,
        start_at, end_at, all_day, color, is_recurring, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,0,?,?)`,
      [
        id,
        userId,
        nul(defaults.workspaceId ?? null),
        nul(input.categoryId ?? null),
        input.title.trim(),
        nul(input.description ?? null),
        nul(input.location ?? null),
        startAt.toISOString(),
        endAt.toISOString(),
        int(allDay),
        input.color ?? 'indigo',
        now,
        now,
      ],
    );
    syncReminders({
      userId,
      offsets: input.reminderOffsets ?? defaults.reminderOffsets ?? [],
      baseAt: startAt.toISOString(),
      eventId: id,
    });
  });

  return getEvent(userId, id)!;
}

export function updateEvent(
  userId: string,
  tz: string,
  id: string,
  input: Partial<EventCreateInput>,
): CalendarEvent | null {
  const existing = getEvent(userId, id);
  if (!existing) return null;

  const sets: string[] = [];
  const params: SqlParam[] = [];
  const push = (col: string, v: SqlParam) => {
    sets.push(`${col} = ?`);
    params.push(v);
  };

  if (input.title !== undefined) push('title', input.title.trim());
  if (input.description !== undefined) push('description', nul(input.description));
  if (input.location !== undefined) push('location', nul(input.location));
  if (input.color !== undefined) push('color', input.color);
  if (input.categoryId !== undefined) push('category_id', nul(input.categoryId));

  let startIso = existing.startAt;
  if (input.date !== undefined || input.startTime !== undefined || input.endTime !== undefined) {
    const date = input.date ?? existing.startAt.slice(0, 10);
    const allDay = input.allDay ?? existing.allDay;
    const start = zonedToUtc(date, allDay ? '00:00' : (input.startTime ?? '09:00'), tz);
    const end = allDay
      ? zonedToUtc(date, '23:59', tz)
      : zonedToUtc(date, input.endTime ?? addHour(input.startTime ?? '09:00'), tz);
    startIso = start.toISOString();
    push('start_at', startIso);
    push('end_at', end.toISOString());
    push('all_day', int(allDay));
  }
  push('updated_at', nowIso());

  db.transaction(() => {
    db.run(`UPDATE events SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`, [...params, id, userId]);
    if (input.reminderOffsets !== undefined || input.date !== undefined || input.startTime !== undefined) {
      syncReminders({
        userId,
        offsets: input.reminderOffsets ?? existing.reminders.map((r) => r.offsetMinutes),
        baseAt: startIso,
        eventId: id,
      });
    }
  });

  return getEvent(userId, id);
}

export function deleteEvent(userId: string, id: string): boolean {
  return Number(db.run('DELETE FROM events WHERE id = ? AND user_id = ?', [id, userId]).changes) > 0;
}

function addHour(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const total = Math.min(23 * 60 + 59, h * 60 + m + 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
