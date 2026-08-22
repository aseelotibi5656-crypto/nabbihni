'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { api, ApiError } from '@/lib/api-client';
import { browserTimezone } from '@/lib/datetime';
import { cn } from '@/lib/utils';

type Errors = Record<string, string>;

function useFormErrors() {
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const handle = (error: unknown) => {
    if (error instanceof ApiError) {
      if (error.details) setErrors(error.details);
      setFormError(error.details ? null : error.message);
    } else {
      setFormError('حدث خطأ غير متوقع. حاول مرة أخرى.');
    }
  };

  const clear = () => {
    setErrors({});
    setFormError(null);
  };

  return { errors, formError, handle, clear, setFormError };
}

function FormBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded-xl border border-danger/30 bg-danger/8 px-4 py-3 text-sm font-medium text-danger" role="alert">
      {message}
    </div>
  );
}

function PasswordField({
  value,
  onChange,
  error,
  label = 'كلمة المرور',
  autoComplete = 'current-password',
  showMeter = false,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
  label?: string;
  autoComplete?: string;
  showMeter?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const score = (() => {
    let s = 0;
    if (value.length >= 8) s++;
    if (value.length >= 12) s++;
    if (/[a-z]/.test(value) && /[A-Z]/.test(value)) s++;
    if (/\d/.test(value)) s++;
    if (/[^\w\s]/.test(value)) s++;
    return Math.min(4, s);
  })();
  const labels = ['ضعيفة جدًا', 'ضعيفة', 'متوسطة', 'جيدة', 'قوية'];
  const tones = ['bg-danger', 'bg-danger', 'bg-warning', 'bg-success', 'bg-success'];

  return (
    <div>
      <div className="relative">
        <Input
          label={label}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          error={error}
          autoComplete={autoComplete}
          placeholder="••••••••"
          className="pr-10"
          required
        />
        <Lock className="pointer-events-none absolute right-3 top-[38px] h-4 w-4 text-faint" />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute left-3 top-[34px] rounded-lg p-1 text-faint transition-colors hover:text-fg"
          aria-label={visible ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      {showMeter && value.length > 0 && (
        <div className="mt-2 flex items-center gap-2">
          <div className="flex flex-1 gap-1">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={cn('h-1 flex-1 rounded-full transition-colors', i < score ? tones[score] : 'bg-line')}
              />
            ))}
          </div>
          <span className="text-[11px] font-medium text-muted">{labels[score]}</span>
        </div>
      )}
    </div>
  );
}

/* ================================ تسجيل الدخول ================================ */

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const { errors, formError, handle, clear } = useFormErrors();
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });

  const next = params.get('next') || '/dashboard';
  const registered = params.get('registered') === '1';
  const reset = params.get('reset') === '1';

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    clear();
    setLoading(true);
    try {
      await api.auth.login(form);
      toast.success('أهلًا بعودتك 👋');
      startTransition(() => {
        router.push(next);
        router.refresh();
      });
    } catch (error) {
      handle(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">تسجيل الدخول</h1>
      <p className="mt-2 text-[15px] text-muted">أهلًا بعودتك — لنكمل من حيث توقّفت.</p>

      {registered && (
        <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-success/25 bg-success/8 px-4 py-3 text-sm text-success">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          تم إنشاء حسابك بنجاح. سجّل الدخول للمتابعة.
        </div>
      )}
      {reset && (
        <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-success/25 bg-success/8 px-4 py-3 text-sm text-success">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          تم تعيين كلمة المرور الجديدة. يمكنك الدخول الآن.
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-7 space-y-4" noValidate>
        <FormBanner message={formError} />

        <div className="relative">
          <Input
            label="البريد الإلكتروني"
            type="email"
            inputMode="email"
            dir="ltr"
            className="pr-10 text-left"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            error={errors.email}
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
          <Mail className="pointer-events-none absolute right-3 top-[38px] h-4 w-4 text-faint" />
        </div>

        <PasswordField
          value={form.password}
          onChange={(password) => setForm({ ...form, password })}
          error={errors.password}
        />

        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-sm font-semibold text-brand hover:underline">
            نسيت كلمة المرور؟
          </Link>
        </div>

        <Button type="submit" loading={loading || pending} className="w-full" size="lg">
          تسجيل الدخول
        </Button>
      </form>

      <p className="mt-7 text-center text-sm text-muted">
        ليس لديك حساب؟{' '}
        <Link href="/register" className="font-semibold text-brand hover:underline">
          أنشئ حسابًا مجانًا
        </Link>
      </p>
    </div>
  );
}

/* ================================ إنشاء حساب ================================ */

export function RegisterForm() {
  const router = useRouter();
  const toast = useToast();
  const { errors, formError, handle, clear } = useFormErrors();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    clear();
    setLoading(true);
    try {
      await api.auth.register({ ...form, timezone: browserTimezone() });
      toast.success('تم إنشاء حسابك 🎉', 'أضف أول مهمة الآن ودعنا نذكّرك بها.');
      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      handle(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">أنشئ حسابك</h1>
      <p className="mt-2 text-[15px] text-muted">مجانًا وبلا بطاقة بنكية — أقل من دقيقة.</p>

      <form onSubmit={onSubmit} className="mt-7 space-y-4" noValidate>
        <FormBanner message={formError} />

        <div className="relative">
          <Input
            label="الاسم"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            error={errors.name}
            autoComplete="name"
            placeholder="اسمك الكامل"
            className="pr-10"
            required
          />
          <User className="pointer-events-none absolute right-3 top-[38px] h-4 w-4 text-faint" />
        </div>

        <div className="relative">
          <Input
            label="البريد الإلكتروني"
            type="email"
            inputMode="email"
            dir="ltr"
            className="pr-10 text-left"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            error={errors.email}
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
          <Mail className="pointer-events-none absolute right-3 top-[38px] h-4 w-4 text-faint" />
        </div>

        <PasswordField
          label="كلمة المرور"
          autoComplete="new-password"
          showMeter
          value={form.password}
          onChange={(password) => setForm({ ...form, password })}
          error={errors.password}
        />
        <p className="hint">٨ أحرف على الأقل، وتحتوي على حرف ورقم.</p>

        <Button type="submit" loading={loading} className="w-full" size="lg">
          إنشاء الحساب
        </Button>

        <p className="text-center text-[12px] leading-relaxed text-muted">
          بإنشائك حسابًا فأنت توافق على شروط الاستخدام وسياسة الخصوصية.
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        لديك حساب بالفعل؟{' '}
        <Link href="/login" className="font-semibold text-brand hover:underline">
          سجّل الدخول
        </Link>
      </p>
    </div>
  );
}

/* ============================== نسيت كلمة المرور ============================== */

export function ForgotPasswordForm() {
  const { formError, handle, clear } = useFormErrors();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState('');

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    clear();
    setLoading(true);
    try {
      await api.auth.forgotPassword(email);
      setSent(true);
    } catch (error) {
      handle(error);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-success/12 text-success">
          <Mail className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-extrabold">تحقّق من بريدك</h1>
        <p className="mt-3 text-[15px] leading-loose text-muted">
          إذا كان <span className="font-semibold text-fg">{email}</span> مسجّلًا لدينا، فستصلك رسالة
          تحتوي رابط إعادة التعيين. الرابط صالح لمدة ساعة.
        </p>
        <p className="mt-4 rounded-xl bg-elevated px-4 py-3 text-[13px] leading-relaxed text-muted">
          في وضع التطوير يُطبع الرابط في طرفية الخادم بدل إرساله بالبريد.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          العودة لتسجيل الدخول
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">نسيت كلمة المرور؟</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">
        اكتب بريدك وسنرسل لك رابطًا لتعيين كلمة مرور جديدة.
      </p>

      <form onSubmit={onSubmit} className="mt-7 space-y-4" noValidate>
        <FormBanner message={formError} />
        <div className="relative">
          <Input
            label="البريد الإلكتروني"
            type="email"
            dir="ltr"
            className="pr-10 text-left"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
          <Mail className="pointer-events-none absolute right-3 top-[38px] h-4 w-4 text-faint" />
        </div>
        <Button type="submit" loading={loading} className="w-full" size="lg">
          إرسال الرابط
        </Button>
      </form>

      <Link
        href="/login"
        className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold text-muted hover:text-fg"
      >
        <ArrowLeft className="h-4 w-4" />
        العودة لتسجيل الدخول
      </Link>
    </div>
  );
}

/* ============================== إعادة تعيين كلمة المرور ============================== */

export function ResetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const { errors, formError, handle, clear, setFormError } = useFormErrors();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const token = params.get('token') ?? '';

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    clear();
    if (!token) {
      setFormError('الرابط غير مكتمل. افتح الرابط من رسالة البريد مباشرة.');
      return;
    }
    setLoading(true);
    try {
      await api.auth.resetPassword(token, password);
      router.push('/login?reset=1');
    } catch (error) {
      handle(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">كلمة مرور جديدة</h1>
      <p className="mt-2 text-[15px] text-muted">اختر كلمة مرور قوية لن تنساها.</p>

      <form onSubmit={onSubmit} className="mt-7 space-y-4" noValidate>
        <FormBanner message={formError} />
        <PasswordField
          label="كلمة المرور الجديدة"
          autoComplete="new-password"
          showMeter
          value={password}
          onChange={setPassword}
          error={errors.password}
        />
        <Button type="submit" loading={loading} className="w-full" size="lg">
          حفظ كلمة المرور
        </Button>
      </form>

      <Link
        href="/login"
        className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold text-muted hover:text-fg"
      >
        <ArrowLeft className="h-4 w-4" />
        العودة لتسجيل الدخول
      </Link>
    </div>
  );
}

/* ================================ تفعيل البريد ================================ */

export function VerifyEmailForm() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function verify() {
    setState('loading');
    try {
      const result = await api.auth.verifyEmail(token);
      setMessage(result.message);
      setState('done');
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : 'تعذّر تفعيل البريد.');
      setState('error');
    }
  }

  if (!token) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-extrabold">رابط غير مكتمل</h1>
        <p className="mt-3 text-[15px] leading-loose text-muted">
          افتح رابط التفعيل من رسالة البريد التي وصلتك.
        </p>
        <Link href="/dashboard" className="mt-6 inline-block text-sm font-semibold text-brand hover:underline">
          العودة للوحة التحكم
        </Link>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div
        className={cn(
          'mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl',
          state === 'done' ? 'bg-success/12 text-success' : 'bg-brand/12 text-brand',
        )}
      >
        {state === 'done' ? <CheckCircle2 className="h-6 w-6" /> : <Mail className="h-6 w-6" />}
      </div>

      <h1 className="text-2xl font-extrabold">
        {state === 'done' ? 'تم تفعيل بريدك ✅' : 'تفعيل البريد الإلكتروني'}
      </h1>
      <p className="mt-3 text-[15px] leading-loose text-muted">
        {message || 'اضغط الزر لتأكيد بريدك الإلكتروني وتفعيل كل مزايا حسابك.'}
      </p>

      {state !== 'done' ? (
        <Button onClick={verify} loading={state === 'loading'} className="mt-6 w-full" size="lg">
          تأكيد البريد
        </Button>
      ) : (
        <Link
          href="/dashboard"
          className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-xl bg-brand font-semibold text-brand-fg"
        >
          الذهاب للوحة التحكم
        </Link>
      )}
    </div>
  );
}
