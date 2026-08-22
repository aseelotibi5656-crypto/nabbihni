import 'server-only';
import webpush from 'web-push';
import { db } from '../db/client';
import { newId, nowIso } from '../db/ids';

/**
 * طبقة الإشعارات الدافعة (Web Push)
 * ---------------------------------------------------------------------------
 * هذه طبقة تكامل مستقلة: التطبيق يستدعي `sendPush` فقط، ولا يعرف شيئاً عن
 * المزوّد. للتشغيل الفعلي:
 *   1) نفّذ:  npm run generate:vapid
 *   2) ضع المفتاحين في .env:
 *        NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
 *        VAPID_PRIVATE_KEY=...
 * بدون المفاتيح، يبقى النظام يعمل بالكامل عبر إشعارات المتصفح المحلية
 * (Notification API داخل Service Worker) ومركز الإشعارات داخل التطبيق.
 */

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

let configured: boolean | null = null;

export function pushConfigured(): boolean {
  if (configured !== null) return configured;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (publicKey && privateKey) {
    try {
      webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:hello@nabbihni.app',
        publicKey,
        privateKey,
      );
      configured = true;
    } catch {
      configured = false;
    }
  } else {
    configured = false;
  }
  return configured;
}

export function saveSubscription(
  userId: string,
  sub: { endpoint: string; keys: { p256dh: string; auth: string } },
  userAgent?: string | null,
) {
  db.run(
    `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, user_agent, created_at)
     VALUES (?,?,?,?,?,?,?)
     ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth, user_id = excluded.user_id`,
    [newId('psb_'), userId, sub.endpoint, sub.keys.p256dh, sub.keys.auth, userAgent ?? null, nowIso()],
  );
}

export function removeSubscription(endpoint: string) {
  db.run('DELETE FROM push_subscriptions WHERE endpoint = ?', [endpoint]);
}

export function subscriptionsFor(userId: string) {
  return db.all<{ endpoint: string; p256dh: string; auth: string }>(
    'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?',
    [userId],
  );
}

/** إرسال إشعار دافع لكل أجهزة المستخدم. يعيد عدد الأجهزة التي وصلها الإشعار. */
export async function sendPush(userId: string, payload: PushPayload): Promise<number> {
  if (!pushConfigured()) return 0;
  const subs = subscriptionsFor(userId);
  let delivered = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
        );
        delivered++;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        // 404/410 = اشتراك منتهٍ، نحذفه حتى لا نحاول مجدداً
        if (status === 404 || status === 410) removeSubscription(sub.endpoint);
      }
    }),
  );

  return delivered;
}

export function vapidPublicKey(): string | null {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null;
}
