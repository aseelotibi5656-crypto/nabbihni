import { vapidPublicKey, pushConfigured } from '@/server/services/push';
import { ok, withGuard } from '@/server/api/http';

export const runtime = 'nodejs';

/** يخبر الواجهة هل Web Push مُفعَّل، وبأي مفتاح عام تشترك */
export const GET = withGuard(async () =>
  ok({ configured: pushConfigured(), publicKey: vapidPublicKey() }),
);
