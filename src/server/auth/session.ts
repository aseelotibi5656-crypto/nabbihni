import 'server-only';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { db } from '../db/client';

/**
 * إدارة الجلسات
 * ---------------------------------------------------------------------------
 * جلسة مزدوجة الطبقة:
 *   1) JWT موقّع (HS256) داخل كوكي HttpOnly — تحقق سريع بدون قاعدة بيانات.
 *   2) سجل جلسة في قاعدة البيانات — يسمح بإبطال الجلسة فوراً (تسجيل خروج
 *      من كل الأجهزة، أو عند تغيير كلمة المرور).
 * التوكن نفسه لا يُخزَّن أبداً؛ يُخزَّن تجزئته SHA-256 فقط.
 */

export const SESSION_COOKIE = 'nabbihni_session';
const SESSION_DAYS = 30;

function secret(): Uint8Array {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 24) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('AUTH_SECRET غير معرّف أو قصير جداً — عيّنه في متغيرات البيئة.');
    }
    return new TextEncoder().encode('nabbihni-development-secret-key-0123456789');
  }
  return new TextEncoder().encode(value);
}

export const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

export interface SessionPayload {
  sub: string;
  sid: string;
  email: string;
}

export async function createSession(
  userId: string,
  email: string,
  meta: { userAgent?: string | null; ip?: string | null } = {},
): Promise<{ token: string; expiresAt: Date }> {
  const sid = randomUUID();
  const raw = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  const now = new Date().toISOString();

  const token = await new SignJWT({ sub: userId, sid, email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer('nabbihni')
    .setExpirationTime(`${SESSION_DAYS}d`)
    .setJti(raw)
    .sign(secret());

  db.run(
    `INSERT INTO sessions (id, user_id, token_hash, user_agent, ip, expires_at, created_at, last_active_at)
     VALUES (?,?,?,?,?,?,?,?)`,
    [sid, userId, sha256(raw), meta.userAgent ?? null, meta.ip ?? null, expiresAt.toISOString(), now, now],
  );

  return { token, expiresAt };
}

export async function readSession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { issuer: 'nabbihni' });
    const sid = payload.sid as string;
    const jti = payload.jti as string;
    if (!sid || !jti) return null;

    const row = db.get<{ id: string; user_id: string; expires_at: string }>(
      `SELECT id, user_id, expires_at FROM sessions WHERE id = ? AND token_hash = ?`,
      [sid, sha256(jti)],
    );
    if (!row) return null;
    if (new Date(row.expires_at).getTime() < Date.now()) {
      db.run('DELETE FROM sessions WHERE id = ?', [sid]);
      return null;
    }
    db.run('UPDATE sessions SET last_active_at = ? WHERE id = ?', [new Date().toISOString(), sid]);
    return { sub: row.user_id, sid, email: payload.email as string };
  } catch {
    return null;
  }
}

export async function destroySession(sid: string) {
  db.run('DELETE FROM sessions WHERE id = ?', [sid]);
}

export async function destroyAllSessions(userId: string) {
  db.run('DELETE FROM sessions WHERE user_id = ?', [userId]);
}

export function cookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    expires: expiresAt,
  };
}

export async function setSessionCookie(token: string, expiresAt: Date) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, cookieOptions(expiresAt));
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set(SESSION_COOKIE, '', { ...cookieOptions(new Date(0)), expires: new Date(0) });
}

/** حذف الجلسات المنتهية — يُستدعى دورياً من مهمة التنظيف */
export function purgeExpiredSessions() {
  db.run('DELETE FROM sessions WHERE expires_at < ?', [new Date().toISOString()]);
}
