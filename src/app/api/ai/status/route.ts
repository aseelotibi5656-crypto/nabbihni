import { aiStatus } from '@/server/services/ai';
import { ok, withAuth } from '@/server/api/http';

export const runtime = 'nodejs';

export const GET = withAuth(async () => ok(aiStatus()));
