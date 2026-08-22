import { z } from 'zod';
import { buildAnalytics } from '@/server/services/analytics';
import { ok, parseQuery, withAuth } from '@/server/api/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({ days: z.coerce.number().int().min(7).max(365).optional() });

export const GET = withAuth(async (auth, request: Request) => {
  const { days } = parseQuery(request, schema);
  return ok({ analytics: buildAnalytics(auth.user.id, auth.user.timezone, days ?? 30) });
});
