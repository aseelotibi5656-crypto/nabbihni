import 'server-only';
import { db, nul } from '../db/client';
import { newId, nowIso } from '../db/ids';
import type { AppNotification, NotificationType } from '@/lib/types';

interface Row {
  id: string;
  type: string;
  title: string;
  body: string;
  data: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

function map(row: Row): AppNotification {
  let data: Record<string, unknown> | null = null;
  if (row.data) {
    try {
      data = JSON.parse(row.data);
    } catch {
      data = null;
    }
  }
  return {
    id: row.id,
    type: row.type as NotificationType,
    title: row.title,
    body: row.body,
    data,
    link: row.link,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

export function listNotifications(userId: string, limit = 60): AppNotification[] {
  return db
    .all<Row>(
      `SELECT id, type, title, body, data, link, read_at, created_at
       FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
      [userId, limit],
    )
    .map(map);
}

export function unreadCount(userId: string): number {
  const row = db.get<{ n: number }>(
    'SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL',
    [userId],
  );
  return Number(row?.n ?? 0);
}

export function createNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown> | null;
  link?: string | null;
}): AppNotification {
  const id = newId('ntf_');
  db.run(
    `INSERT INTO notifications (id, user_id, type, title, body, data, link, created_at)
     VALUES (?,?,?,?,?,?,?,?)`,
    [
      id,
      params.userId,
      params.type,
      params.title,
      params.body,
      params.data ? JSON.stringify(params.data) : null,
      nul(params.link ?? null),
      nowIso(),
    ],
  );
  return listNotifications(params.userId, 1)[0];
}

export function markRead(userId: string, id: string): boolean {
  return (
    Number(
      db.run('UPDATE notifications SET read_at = ? WHERE id = ? AND user_id = ? AND read_at IS NULL', [
        nowIso(),
        id,
        userId,
      ]).changes,
    ) > 0
  );
}

export function markAllRead(userId: string): number {
  return Number(
    db.run('UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL', [
      nowIso(),
      userId,
    ]).changes,
  );
}

export function deleteNotification(userId: string, id: string): boolean {
  return Number(db.run('DELETE FROM notifications WHERE id = ? AND user_id = ?', [id, userId]).changes) > 0;
}

export function clearAll(userId: string): number {
  return Number(db.run('DELETE FROM notifications WHERE user_id = ?', [userId]).changes);
}
