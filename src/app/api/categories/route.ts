import { categorySchema } from '@/lib/validation';
import { listCategories, createCategory } from '@/server/repos/categories';
import { ok, created, parseBody, withAuth } from '@/server/api/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withAuth(async (auth) => ok({ categories: listCategories(auth.user.id) }));

export const POST = withAuth(async (auth, request: Request) => {
  const input = await parseBody(request, categorySchema);
  return created({ category: createCategory(auth.user.id, input) });
});
