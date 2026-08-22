import { categorySchema } from '@/lib/validation';
import { updateCategory, deleteCategory } from '@/server/repos/categories';
import { ok, notFound, parseBody, withAuth } from '@/server/api/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withAuth(async (auth, request: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const input = await parseBody(request, categorySchema.partial());
  const category = updateCategory(auth.user.id, id, input);
  return category ? ok({ category }) : notFound('التصنيف غير موجود.');
});

export const DELETE = withAuth(async (auth, _request: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  return deleteCategory(auth.user.id, id) ? ok({ success: true }) : notFound('التصنيف غير موجود.');
});
