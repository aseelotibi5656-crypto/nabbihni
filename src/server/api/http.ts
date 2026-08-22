import 'server-only';
import { NextResponse } from 'next/server';
import { ZodError, type ZodType } from 'zod';
import { getAuth, type AuthContext } from '../auth/current-user';
import { db } from '../db/client';

/**
 * أدوات موحّدة لكل مسارات الـ API:
 * استجابات ثابتة الشكل، تحقق بـ Zod، حماية المسارات، وحدّ للمعدّل.
 */

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, { status: 200, ...init });
}

export function created<T>(data: T) {
  return NextResponse.json(data, { status: 201 });
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}

export function fail(status: number, error: string, message: string, details?: unknown) {
  return NextResponse.json({ error, message, ...(details ? { details } : {}) }, { status });
}

export const unauthorized = (message = 'يجب تسجيل الدخول للمتابعة.') =>
  fail(401, 'unauthorized', message);
export const forbidden = (message = 'لا تملك صلاحية الوصول لهذا العنصر.') =>
  fail(403, 'forbidden', message);
export const notFound = (message = 'العنصر غير موجود.') => fail(404, 'not_found', message);
export const badRequest = (message: string, details?: unknown) =>
  fail(400, 'bad_request', message, details);
export const serverError = (message = 'حدث خطأ غير متوقع، حاول مرة أخرى.') =>
  fail(500, 'server_error', message);

/** تغليف المسار بجلسة مستخدم صالحة + معالجة أخطاء موحّدة */
export function withAuth<T extends unknown[]>(
  handler: (auth: AuthContext, ...args: T) => Promise<Response>,
) {
  return async (...args: T): Promise<Response> => {
    try {
      const auth = await getAuth();
      if (!auth) return unauthorized();
      return await handler(auth, ...args);
    } catch (error) {
      return handleError(error);
    }
  };
}

/** تغليف مسار عام (بدون جلسة) بمعالجة أخطاء موحّدة */
export function withGuard<T extends unknown[]>(handler: (...args: T) => Promise<Response>) {
  return async (...args: T): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleError(error);
    }
  };
}

export function handleError(error: unknown): Response {
  if (error instanceof ZodError) {
    return badRequest('البيانات المُرسلة غير صالحة.', flattenZod(error));
  }
  if (error instanceof HttpError) {
    return fail(error.status, error.code, error.message);
  }
  console.error('[API]', error);
  return serverError();
}

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

function flattenZod(error: ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'form';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** قراءة جسم الطلب والتحقق منه */
export async function parseBody<S extends ZodType>(request: Request, schema: S): Promise<S['_output']> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new HttpError(400, 'bad_request', 'الطلب لا يحتوي على JSON صالح.');
  }
  return schema.parse(raw);
}

/** التحقق من معاملات الاستعلام */
export function parseQuery<S extends ZodType>(request: Request, schema: S): S['_output'] {
  const url = new URL(request.url);
  const obj: Record<string, string> = {};
  url.searchParams.forEach((v, k) => {
    obj[k] = v;
  });
  return schema.parse(obj);
}

/**
 * حدّ المعدّل — نافذة منزلقة مبسّطة مخزّنة في قاعدة البيانات.
 * كافٍ لنشر بخادم واحد؛ للتوسّع الأفقي استبدل التخزين بـ Redis
 * عبر تعديل هذه الدالة وحدها.
 */
export function rateLimit(key: string, limit: number, windowSeconds: number): boolean {
  const now = Date.now();
  const row = db.get<{ count: number; window_start: string }>(
    'SELECT count, window_start FROM rate_limits WHERE key = ?',
    [key],
  );
  if (!row) {
    db.run('INSERT INTO rate_limits (key, count, window_start) VALUES (?,?,?)', [
      key,
      1,
      new Date(now).toISOString(),
    ]);
    return true;
  }
  const started = new Date(row.window_start).getTime();
  if (now - started > windowSeconds * 1000) {
    db.run('UPDATE rate_limits SET count = 1, window_start = ? WHERE key = ?', [
      new Date(now).toISOString(),
      key,
    ]);
    return true;
  }
  if (row.count >= limit) return false;
  db.run('UPDATE rate_limits SET count = count + 1 WHERE key = ?', [key]);
  return true;
}

export function clientIp(request: Request): string {
  const h = request.headers;
  return (
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    h.get('x-real-ip') ||
    '0.0.0.0'
  );
}

/** يرمي خطأ 429 عند تجاوز الحد */
export function enforceRateLimit(request: Request, scope: string, limit: number, windowSeconds: number) {
  const key = `${scope}:${clientIp(request)}`;
  if (!rateLimit(key, limit, windowSeconds)) {
    throw new HttpError(429, 'rate_limited', 'محاولات كثيرة خلال وقت قصير. انتظر قليلاً ثم أعد المحاولة.');
  }
}
