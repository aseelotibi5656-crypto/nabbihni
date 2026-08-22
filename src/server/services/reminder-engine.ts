import 'server-only';
import { db } from '../db/client';
import { dueReminders, markReminder } from '../repos/reminders';
import { createNotification } from '../repos/notifications';
import { sendPush, pushConfigured } from './push';
import { sendEmail } from './email';
import { humanizeUntil, formatTime, wallParts } from '@/lib/datetime';

/**
 * محرّك التذكيرات
 * ---------------------------------------------------------------------------
 * مسؤول عن تحويل التذكيرات المستحقة إلى إشعارات فعلية.
 * يعمل عبر مسارين متكاملين:
 *   • مسار الخادم: /api/cron/dispatch — يُستدعى من مجدول خارجي (Vercel Cron
 *     أو systemd timer) كل دقيقة، ويرسل Web Push حتى لو كان التطبيق مغلقاً.
 *   • مسار العميل: /api/notifications/due — يستدعيه التطبيق أثناء فتحه،
 *     فيظهر الإشعار فوراً حتى بدون إعداد مفاتيح VAPID.
 * كلا المسارين يستدعيان نفس الدالة، والتذكير لا يُرسل مرتين لأن حالته
 * تتغيّر إلى `sent` داخل نفس المعاملة.
 */

export interface DispatchedReminder {
  id: string;
  title: string;
  body: string;
  link: string;
  taskId?: string | null;
  eventId?: string | null;
  habitId?: string | null;
}

interface SubjectInfo {
  title: string;
  at: string | null;
  link: string;
  kind: 'task' | 'event' | 'habit';
}

function subjectOf(reminder: {
  task_id: string | null;
  event_id: string | null;
  habit_id: string | null;
}): SubjectInfo | null {
  if (reminder.task_id) {
    const row = db.get<{ title: string; due_at: string | null; status: string }>(
      'SELECT title, due_at, status FROM tasks WHERE id = ?',
      [reminder.task_id],
    );
    if (!row || row.status !== 'pending') return null;
    return { title: row.title, at: row.due_at, link: `/tasks?highlight=${reminder.task_id}`, kind: 'task' };
  }
  if (reminder.event_id) {
    const row = db.get<{ title: string; start_at: string }>(
      'SELECT title, start_at FROM events WHERE id = ?',
      [reminder.event_id],
    );
    if (!row) return null;
    return { title: row.title, at: row.start_at, link: `/calendar?highlight=${reminder.event_id}`, kind: 'event' };
  }
  if (reminder.habit_id) {
    const row = db.get<{ title: string; time_of_day: string | null }>(
      'SELECT title, time_of_day FROM habits WHERE id = ?',
      [reminder.habit_id],
    );
    if (!row) return null;
    return { title: row.title, at: null, link: `/habits?highlight=${reminder.habit_id}`, kind: 'habit' };
  }
  return null;
}

/** هل نحن داخل ساعات الهدوء لهذا المستخدم؟ */
function inQuietHours(userId: string): boolean {
  const s = db.get<{
    quiet_hours_enabled: number;
    quiet_hours_start: string;
    quiet_hours_end: string;
  }>('SELECT quiet_hours_enabled, quiet_hours_start, quiet_hours_end FROM user_settings WHERE user_id = ?', [
    userId,
  ]);
  if (!s || !s.quiet_hours_enabled) return false;
  const user = db.get<{ timezone: string }>('SELECT timezone FROM users WHERE id = ?', [userId]);
  const w = wallParts(new Date(), user?.timezone ?? 'Asia/Riyadh');
  const minutes = w.hour * 60 + w.minute;
  const [sh, sm] = s.quiet_hours_start.split(':').map(Number);
  const [eh, em] = s.quiet_hours_end.split(':').map(Number);
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  return start <= end ? minutes >= start && minutes < end : minutes >= start || minutes < end;
}

/**
 * معالجة كل التذكيرات المستحقة.
 * @param userId عند تمريره تُعالَج تذكيرات هذا المستخدم فقط (مسار العميل).
 */
export async function dispatchDueReminders(userId?: string): Promise<DispatchedReminder[]> {
  const all = dueReminders(200).filter((r) => !userId || r.user_id === userId);
  const dispatched: DispatchedReminder[] = [];

  for (const reminder of all) {
    const subject = subjectOf(reminder);
    if (!subject) {
      markReminder(reminder.id, 'cancelled');
      continue;
    }
    if (inQuietHours(reminder.user_id)) continue;

    const user = db.get<{ timezone: string; email: string; name: string }>(
      'SELECT timezone, email, name FROM users WHERE id = ?',
      [reminder.user_id],
    );
    const tz = user?.timezone ?? 'Asia/Riyadh';

    const when = subject.at ? humanizeUntil(subject.at) : 'الآن';
    const title =
      subject.kind === 'habit'
        ? '🌱 وقت عادتك اليومية'
        : reminder.offset_minutes === 0
          ? '🔔 حان وقت المهمة الآن'
          : `🔔 ${subject.kind === 'event' ? 'لديك موعد' : 'لديك مهمة'} ${when}`;
    const body = subject.at
      ? `${subject.title} — ${formatTime(subject.at, tz)}`
      : subject.title;

    const notification = createNotification({
      userId: reminder.user_id,
      type: 'reminder',
      title,
      body,
      link: subject.link,
      data: {
        reminderId: reminder.id,
        taskId: reminder.task_id,
        eventId: reminder.event_id,
        habitId: reminder.habit_id,
      },
    });

    if (pushConfigured()) {
      await sendPush(reminder.user_id, {
        title,
        body,
        url: subject.link,
        tag: `reminder-${reminder.id}`,
        data: { notificationId: notification.id },
      });
    }

    if (reminder.channel === 'email' && user) {
      await sendEmail({
        to: user.email,
        subject: title,
        html: `<p>مرحبًا ${user.name},</p><p>${body}</p>`,
      });
    }

    markReminder(reminder.id, 'sent');
    dispatched.push({
      id: reminder.id,
      title,
      body,
      link: subject.link,
      taskId: reminder.task_id,
      eventId: reminder.event_id,
      habitId: reminder.habit_id,
    });
  }

  return dispatched;
}

/** تنظيف دوري: حذف الجلسات المنتهية والتذكيرات القديمة المرسلة */
export function housekeeping() {
  const cutoff = new Date(Date.now() - 60 * 86_400_000).toISOString();
  db.run('DELETE FROM sessions WHERE expires_at < ?', [new Date().toISOString()]);
  db.run("DELETE FROM reminders WHERE status IN ('sent','cancelled','failed') AND trigger_at < ?", [cutoff]);
  db.run('DELETE FROM rate_limits WHERE window_start < ?', [
    new Date(Date.now() - 86_400_000).toISOString(),
  ]);
}
