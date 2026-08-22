import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ForgotPasswordForm } from '@/components/app/auth-forms';

export const metadata: Metadata = { title: 'نسيت كلمة المرور' };

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="skeleton h-64 w-full rounded-2xl" />}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
