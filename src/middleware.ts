import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value || request.cookies.get('session')?.value;
  const { pathname } = request.nextUrl;

  // 1. إذا كان المستخدم مسجلاً ودخل لصفحة التسجيل أو الدخول، وجهه للداشبورد
  if (token && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 2. إذا لم يكن مسجلاً وحاول دخول الداشبورد، وجهه للتسجيل
  if (!token && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register'],
};