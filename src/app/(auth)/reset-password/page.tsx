import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ResetPasswordForm } from '@/components/app/auth-forms';

export const metadata: Metadata = { title: 'إعادة تعيين كلمة المرور' };

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="skeleton h-64 w-full rounded-2xl" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
