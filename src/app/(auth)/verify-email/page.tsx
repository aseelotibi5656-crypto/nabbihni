import { Suspense } from 'react';
import type { Metadata } from 'next';
import { VerifyEmailForm } from '@/components/app/auth-forms';

export const metadata: Metadata = { title: 'تفعيل البريد' };

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="skeleton h-64 w-full rounded-2xl" />}>
      <VerifyEmailForm />
    </Suspense>
  );
}
