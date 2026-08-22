import { NextResponse, type NextRequest } from 'next/server';

/**
 * حارس المسارات
 * ---------------------------------------------------------------------------
 * يتحقق من وجود كوكي الجلسة قبل عرض أي صفحة محميّة، فيمنع حتى بدء تصييرها.
 * التحقق الكامل (توقيع الرمز + وجود الجلسة في قاعدة البيانات) يبقى في
 * طبقة الخادم — هذه الطبقة للتوجيه السريع فقط، وليست بديلاً عن التحقق.
 */

const PROTECTED = [
  '/dashboard',
  '/tasks',
  '/calendar',
  '/habits',
  '/analytics',
  '/notifications',
  '/settings',
  '/profile',
];

const GUEST_ONLY = ['/login', '/register'];

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get('nabbihni_session')?.value);

  if (!hasSession && PROTECTED.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url, 307);
  }

  if (hasSession && GUEST_ONLY.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    url.search = '';
    return NextResponse.redirect(url, 307);
  }

  return NextResponse.next();
}

export const config = {
  // نتجاوز أصول Next والملفات الثابتة حتى لا نضيف زمنًا على كل طلب
  matcher: ['/((?!api|_next/static|_next/image|icons|favicon.ico|manifest.webmanifest|sw.js).*)'],
};
