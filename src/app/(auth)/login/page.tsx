import { Suspense } from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/app/auth-forms';
import { getCurrentUser } from '@/server/auth/current-user';

export const metadata: Metadata = { title: 'تسجيل الدخول' };
export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  if (await getCurrentUser()) redirect('/dashboard');
  return (
    <Suspense fallback={<div className="skeleton h-80 w-full rounded-2xl" />}>
      <LoginForm />
    </Suspense>
  );
}
