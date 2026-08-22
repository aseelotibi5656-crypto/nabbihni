import { randomBytes } from 'node:crypto';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

/**
 * معرّف قصير مرتّب زمنياً (شبيه بـ ULID مبسّط):
 * الطابع الزمني بنظام 36 + عشوائية آمنة. المعرّفات المرتّبة تحسّن
 * أداء الفهارس وتجعل التصفح حسب وقت الإنشاء طبيعياً.
 */
export function newId(prefix = ''): string {
  const time = Date.now().toString(36);
  const bytes = randomBytes(10);
  let rand = '';
  for (const b of bytes) rand += ALPHABET[b % ALPHABET.length];
  return `${prefix}${time}${rand}`;
}

/** رمز عشوائي آمن للروابط (تفعيل البريد / إعادة التعيين) */
export function newToken(): string {
  return randomBytes(32).toString('base64url');
}

export const nowIso = () => new Date().toISOString();
