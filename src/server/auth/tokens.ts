import 'server-only';
import { db } from '../db/client';
import { newId, newToken, nowIso } from '../db/ids';
import { sha256 } from './session';

/**
 * رموز التحقق المؤقتة (تفعيل البريد / إعادة تعيين كلمة المرور).
 * يُخزَّن التجزئة فقط، والرمز الأصلي يظهر مرة واحدة في الرابط.
 */

const TTL: Record<TokenType, number> = {
  email_verification: 24 * 3600_000,
  password_reset: 3600_000,
};

export type TokenType = 'email_verification' | 'password_reset';

export function issueVerificationToken(userId: string, type: TokenType) {
  // إبطال الرموز السابقة من نفس النوع
  db.run('DELETE FROM verification_tokens WHERE user_id = ? AND type = ? AND used_at IS NULL', [
    userId,
    type,
  ]);

  const token = newToken();
  const expiresAt = new Date(Date.now() + TTL[type]).toISOString();
  db.run(
    `INSERT INTO verification_tokens (id, user_id, token_hash, type, expires_at, created_at)
     VALUES (?,?,?,?,?,?)`,
    [newId('vtk_'), userId, sha256(token), type, expiresAt, nowIso()],
  );

  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const path = type === 'email_verification' ? '/verify-email' : '/reset-password';
  return { token, url: `${base}${path}?token=${token}`, expiresAt };
}

export function consumeToken(token: string, type: TokenType): string | null {
  const row = db.get<{ id: string; user_id: string; expires_at: string; used_at: string | null }>(
    'SELECT id, user_id, expires_at, used_at FROM verification_tokens WHERE token_hash = ? AND type = ?',
    [sha256(token), type],
  );
  if (!row || row.used_at) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.run('DELETE FROM verification_tokens WHERE id = ?', [row.id]);
    return null;
  }
  db.run('UPDATE verification_tokens SET used_at = ? WHERE id = ?', [nowIso(), row.id]);
  return row.user_id;
}
