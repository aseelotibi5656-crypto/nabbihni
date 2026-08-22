import { settingsSchema } from '@/lib/validation';
import { updateSettings } from '@/server/repos/users';
import { db, bool } from '@/server/db/client';
import { ok, parseBody, withAuth } from '@/server/api/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function readSettings(userId: string) {
  const row = db.get<Record<string, unknown>>('SELECT * FROM user_settings WHERE user_id = ?', [userId]);
  if (!row) return null;
  return {
    theme: row.theme,
    accentColor: row.accent_color,
    weekStartsOn: Number(row.week_starts_on),
    timeFormat: row.time_format,
    defaultView: row.default_view,
    pushEnabled: bool(row.push_enabled),
    emailEnabled: bool(row.email_enabled),
    soundEnabled: bool(row.sound_enabled),
    dailyDigest: bool(row.daily_digest),
    digestTime: row.digest_time,
    quietHoursEnabled: bool(row.quiet_hours_enabled),
    quietHoursStart: row.quiet_hours_start,
    quietHoursEnd: row.quiet_hours_end,
    defaultReminderOffsets: String(row.default_reminder_offsets).split(',').filter(Boolean).map(Number),
    smartRemindersEnabled: bool(row.smart_reminders_enabled),
    smartRescheduleEnabled: bool(row.smart_reschedule_enabled),
    analyticsOptIn: bool(row.analytics_opt_in),
    profilePublic: bool(row.profile_public),
  };
}

export const GET = withAuth(async (auth) => ok({ settings: readSettings(auth.user.id) }));

export const PATCH = withAuth(async (auth, request: Request) => {
  const input = await parseBody(request, settingsSchema);
  updateSettings(auth.user.id, input);
  return ok({ settings: readSettings(auth.user.id) });
});
