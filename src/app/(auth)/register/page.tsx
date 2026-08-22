import { Suspense } from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { RegisterForm } from '@/components/app/auth-forms';
import { getCurrentUser } from '@/server/auth/current-user';

export const metadata: Metadata = { title: 'إنشاء حساب' };
export const dynamic = 'force-dynamic';

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect('/dashboard');
  return (
    <Suspense fallback={<div className="skeleton h-96 w-full rounded-2xl" />}>
      <RegisterForm />
    </Suspense>
  );
}
