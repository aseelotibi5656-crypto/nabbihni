import { habitCreateSchema } from '@/lib/validation';
import { listHabits, createHabit } from '@/server/repos/habits';
import { ok, created, parseBody, withAuth } from '@/server/api/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withAuth(async (auth, request: Request) => {
  const includeArchived = new URL(request.url).searchParams.get('archived') === '1';
  const habits = listHabits(auth.user.id, auth.user.timezone, includeArchived);
  return ok({ habits, count: habits.length });
});

export const POST = withAuth(async (auth, request: Request) => {
  const input = await parseBody(request, habitCreateSchema);
  const habit = createHabit(auth.user.id, auth.user.timezone, input);
  return created({ habit });
});
