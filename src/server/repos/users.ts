import 'server-only';
import { db, int, nul, type SqlParam } from '../db/client';
import { newId, nowIso } from '../db/ids';
import { hashPassword } from '../auth/password';
import { seedDefaultCategories } from './categories';
import { mapUser } from '../auth/current-user';
import { HttpError } from '../api/http';
import type { PublicUser, UserSettings } from '@/lib/types';
import type { SettingsInput } from '@/lib/validation';

export function findUserByEmail(email: string) {
  return db.get<{ id: string; email: string; password_hash: string; name: string; email_verified: string | null }>(
    'SELECT id, email, password_hash, name, email_verified FROM users WHERE email = ?',
    [email.toLowerCase().trim()],
  );
}

export function getUserById(id: string): PublicUser | null {
  const row = db.get<Parameters<typeof mapUser>[0]>(
    `SELECT id, email, name, avatar_url, email_verified, locale, timezone, plan, created_at
     FROM users WHERE id = ?`,
    [id],
  );
  return row ? mapUser(row) : null;
}

/**
 * إنشاء مستخدم جديد مع كل ما يحتاجه:
 * إعدادات افتراضية + مساحة عمل شخصية + تصنيفات جاهزة.
 * كل ذلك في معاملة واحدة حتى لا يبقى حساب ناقص عند أي خطأ.
 */
export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  timezone?: string;
}): Promise<PublicUser> {
  const email = input.email.toLowerCase().trim();
  if (findUserByEmail(email)) {
    throw new HttpError(409, 'email_taken', 'هذا البريد الإلكتروني مسجّل بالفعل.');
  }

  const passwordHash = await hashPassword(input.password);
  const id = newId('usr_');
  const now = nowIso();
  const tz = input.timezone || 'Asia/Riyadh';

  db.transaction(() => {
    db.run(
      `INSERT INTO users (id, email, password_hash, name, locale, timezone, plan, role, created_at, updated_at)
       VALUES (?,?,?,?,'ar',?,'free','user',?,?)`,
      [id, email, passwordHash, input.name.trim(), tz, now, now],
    );
    db.run(
      `INSERT INTO user_settings (user_id, created_at, updated_at) VALUES (?,?,?)`,
      [id, now, now],
    );
    const wsId = newId('wsp_');
    db.run(
      `INSERT INTO workspaces (id, name, slug, owner_id, is_personal, plan, created_at, updated_at)
       VALUES (?,?,?,?,1,'free',?,?)`,
      [wsId, `مساحة ${input.name.trim()}`, `ws-${id.slice(-10)}`, id, now, now],
    );
    db.run(
      `INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at) VALUES (?,?,?,'owner',?)`,
      [newId('wsm_'), wsId, id, now],
    );
    seedDefaultCategories(id);
  });

  return getUserById(id)!;
}

export function personalWorkspaceId(userId: string): string | null {
  const row = db.get<{ id: string }>(
    'SELECT id FROM workspaces WHERE owner_id = ? AND is_personal = 1 LIMIT 1',
    [userId],
  );
  return row?.id ?? null;
}

export function touchLogin(userId: string) {
  db.run('UPDATE users SET last_login_at = ? WHERE id = ?', [nowIso(), userId]);
}

export function updateProfile(
  userId: string,
  input: { name?: string; avatarUrl?: string | null; timezone?: string; locale?: string },
): PublicUser | null {
  const sets: string[] = [];
  const params: SqlParam[] = [];
  if (input.name !== undefined) {
    sets.push('name = ?');
    params.push(input.name.trim());
  }
  if (input.avatarUrl !== undefined) {
    sets.push('avatar_url = ?');
    params.push(nul(input.avatarUrl));
  }
  if (input.timezone !== undefined) {
    sets.push('timezone = ?');
    params.push(input.timezone);
  }
  if (input.locale !== undefined) {
    sets.push('locale = ?');
    params.push(input.locale);
  }
  if (!sets.length) return getUserById(userId);
  sets.push('updated_at = ?');
  params.push(nowIso());
  db.run(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, [...params, userId]);
  return getUserById(userId);
}

export async function changePassword(userId: string, newPassword: string) {
  const hash = await hashPassword(newPassword);
  db.run('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?', [hash, nowIso(), userId]);
}

export function markEmailVerified(userId: string) {
  db.run('UPDATE users SET email_verified = ?, updated_at = ? WHERE id = ?', [nowIso(), nowIso(), userId]);
}

export function deleteUser(userId: string) {
  db.run('DELETE FROM users WHERE id = ?', [userId]);
}

// ------------------------------- الإعدادات -------------------------------

const SETTINGS_COLUMNS: Record<keyof SettingsInput, string> = {
  theme: 'theme',
  accentColor: 'accent_color',
  weekStartsOn: 'week_starts_on',
  timeFormat: 'time_format',
  defaultView: 'default_view',
  pushEnabled: 'push_enabled',
  emailEnabled: 'email_enabled',
  soundEnabled: 'sound_enabled',
  dailyDigest: 'daily_digest',
  digestTime: 'digest_time',
  quietHoursEnabled: 'quiet_hours_enabled',
  quietHoursStart: 'quiet_hours_start',
  quietHoursEnd: 'quiet_hours_end',
  defaultReminderOffsets: 'default_reminder_offsets',
  smartRemindersEnabled: 'smart_reminders_enabled',
  smartRescheduleEnabled: 'smart_reschedule_enabled',
  analyticsOptIn: 'analytics_opt_in',
  profilePublic: 'profile_public',
};

const BOOLEAN_KEYS = new Set<keyof SettingsInput>([
  'pushEnabled', 'emailEnabled', 'soundEnabled', 'dailyDigest', 'quietHoursEnabled',
  'smartRemindersEnabled', 'smartRescheduleEnabled', 'analyticsOptIn', 'profilePublic',
]);

export function updateSettings(userId: string, input: SettingsInput) {
  const sets: string[] = [];
  const params: SqlParam[] = [];
  for (const [key, column] of Object.entries(SETTINGS_COLUMNS) as [keyof SettingsInput, string][]) {
    const value = input[key];
    if (value === undefined) continue;
    sets.push(`${column} = ?`);
    if (key === 'defaultReminderOffsets') params.push((value as number[]).join(','));
    else if (BOOLEAN_KEYS.has(key)) params.push(int(value as boolean));
    else params.push(value as SqlParam);
  }
  if (!sets.length) return;
  sets.push('updated_at = ?');
  params.push(nowIso());
  db.run(`UPDATE user_settings SET ${sets.join(', ')} WHERE user_id = ?`, [...params, userId]);
}

export function ensureSettings(userId: string) {
  const exists = db.get('SELECT user_id FROM user_settings WHERE user_id = ?', [userId]);
  if (!exists) {
    db.run('INSERT INTO user_settings (user_id, created_at, updated_at) VALUES (?,?,?)', [
      userId,
      nowIso(),
      nowIso(),
    ]);
  }
}

export type { UserSettings };
