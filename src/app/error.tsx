'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[nabbihni]', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-danger/12 text-danger">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <h1 className="mt-6 text-2xl font-extrabold">حدث خطأ غير متوقع</h1>
      <p className="mt-3 max-w-sm text-[15px] leading-loose text-muted">
        اعتذارنا — واجه التطبيق مشكلة. بياناتك بأمان، جرّب إعادة المحاولة.
      </p>
      {error.digest && <p className="num mt-2 text-[11px] text-faint">رمز الخطأ: {error.digest}</p>}
      <div className="mt-7 flex gap-2">
        <button
          onClick={reset}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-6 font-semibold text-brand-fg"
        >
          <RotateCcw className="h-4 w-4" />
          إعادة المحاولة
        </button>
        <Link href="/dashboard" className="inline-flex h-11 items-center rounded-xl border border-line px-6 font-semibold">
          لوحة التحكم
        </Link>
      </div>
    </div>
  );
}
