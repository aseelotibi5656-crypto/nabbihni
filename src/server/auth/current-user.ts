import 'server-only';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { db, bool } from '../db/client';
import { readSession, SESSION_COOKIE } from './session';
import type { PublicUser, Plan } from '@/lib/types';

export interface AuthContext {
  user: PublicUser;
  sessionId: string;
}

interface UserRow {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  email_verified: string | null;
  locale: string;
  timezone: string;
  plan: string;
  created_at: string;
}

export function mapUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatar_url,
    emailVerified: Boolean(row.email_verified),
    locale: row.locale,
    timezone: row.timezone,
    plan: row.plan as Plan,
    createdAt: row.created_at,
  };
}

/**
 * قراءة المستخدم الحالي من الكوكي.
 * مغلّفة بـ React cache: استدعاء واحد لكل طلب مهما تكرّر النداء.
 */
export const getAuth = cache(async (): Promise<AuthContext | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await readSession(token);
  if (!session) return null;

  const row = db.get<UserRow>(
    `SELECT id, email, name, avatar_url, email_verified, locale, timezone, plan, created_at
     FROM users WHERE id = ?`,
    [session.sub],
  );
  if (!row) return null;

  return { user: mapUser(row), sessionId: session.sid };
});

export async function getCurrentUser(): Promise<PublicUser | null> {
  return (await getAuth())?.user ?? null;
}

/** للصفحات المحميّة — يحوّل إلى تسجيل الدخول عند غياب الجلسة */
export async function requireUser(returnTo?: string): Promise<PublicUser> {
  const auth = await getAuth();
  if (!auth) {
    redirect(returnTo ? `/login?next=${encodeURIComponent(returnTo)}` : '/login');
  }
  return auth.user;
}

/** إعدادات المستخدم مع القيم الافتراضية */
export const getUserSettings = cache(async (userId: string) => {
  const row = db.get<Record<string, unknown>>('SELECT * FROM user_settings WHERE user_id = ?', [
    userId,
  ]);
  if (!row) return null;
  return {
    theme: row.theme as 'light' | 'dark' | 'system',
    accentColor: row.accent_color as string,
    weekStartsOn: Number(row.week_starts_on),
    timeFormat: row.time_format as '12' | '24',
    defaultView: row.default_view as 'day' | 'week' | 'month' | 'year',
    pushEnabled: bool(row.push_enabled),
    emailEnabled: bool(row.email_enabled),
    soundEnabled: bool(row.sound_enabled),
    dailyDigest: bool(row.daily_digest),
    digestTime: row.digest_time as string,
    quietHoursEnabled: bool(row.quiet_hours_enabled),
    quietHoursStart: row.quiet_hours_start as string,
    quietHoursEnd: row.quiet_hours_end as string,
    defaultReminderOffsets: String(row.default_reminder_offsets)
      .split(',')
      .filter(Boolean)
      .map(Number),
    smartRemindersEnabled: bool(row.smart_reminders_enabled),
    smartRescheduleEnabled: bool(row.smart_reschedule_enabled),
    analyticsOptIn: bool(row.analytics_opt_in),
    profilePublic: bool(row.profile_public),
  };
});
