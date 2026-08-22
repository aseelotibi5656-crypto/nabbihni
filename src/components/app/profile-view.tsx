'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Camera, Trash2, Check, Globe, Mail, CalendarDays, ListChecks, Target, Flame } from 'lucide-react';
import { useApp } from './app-provider';
import { Avatar } from './app-shell';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { api, ApiError } from '@/lib/api-client';
import { TIMEZONES } from '@/lib/constants';
import { formatDateFull, browserTimezone } from '@/lib/datetime';
import { cn } from '@/lib/utils';

export function ProfileView({
  stats,
}: {
  stats: { tasks: number; completed: number; habits: number; bestStreak: number };
}) {
  const { user, refresh } = useApp();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: user.name,
    timezone: user.timezone,
    avatarUrl: user.avatarUrl,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const dirty =
    form.name !== user.name || form.timezone !== user.timezone || form.avatarUrl !== user.avatarUrl;

  async function pickAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 400_000) {
      toast.error('الصورة كبيرة', 'اختر صورة أصغر من ٤٠٠ كيلوبايت.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setForm((prev) => ({ ...prev, avatarUrl: String(reader.result) }));
    reader.readAsDataURL(file);
  }

  async function save() {
    setErrors({});
    setSaving(true);
    try {
      await api.profile.update(form);
      toast.success('تم حفظ ملفك الشخصي ✅');
      refresh();
    } catch (error) {
      if (error instanceof ApiError && error.details) setErrors(error.details);
      else toast.error('تعذّر الحفظ');
    } finally {
      setSaving(false);
    }
  }

  const detected = browserTimezone();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">الملف الشخصي</h1>
        <p className="mt-1 text-sm text-muted">معلوماتك كما تظهر داخل نَبّهني.</p>
      </header>

      {/* بطاقة الهوية */}
      <section className="card overflow-hidden">
        <div className="mesh h-24" />
        <div className="px-5 pb-5">
          <div className="-mt-10 flex items-end gap-4">
            <div className="relative">
              {form.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={form.avatarUrl}
                  alt={form.name}
                  className="h-20 w-20 rounded-2xl border-4 border-surface object-cover"
                />
              ) : (
                <div className="rounded-2xl border-4 border-surface">
                  <Avatar user={{ ...user, avatarUrl: null }} size={72} />
                </div>
              )}
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -left-1 flex h-8 w-8 items-center justify-center rounded-xl bg-brand text-brand-fg shadow-soft transition-transform active:scale-90"
                aria-label="تغيير الصورة"
              >
                <Camera className="h-4 w-4" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={pickAvatar} />
            </div>

            <div className="min-w-0 flex-1 pb-1">
              <p className="truncate text-lg font-extrabold">{user.name}</p>
              <p className="truncate text-[13px] text-muted" dir="ltr">
                {user.email}
              </p>
            </div>

            {form.avatarUrl && (
              <button
                onClick={() => setForm({ ...form, avatarUrl: null })}
                className="mb-1 rounded-lg p-2 text-faint transition-colors hover:text-danger"
                aria-label="إزالة الصورة"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-3 text-[12px] text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              {user.emailVerified ? (
                <span className="text-success">بريد مُفعَّل</span>
              ) : (
                <Link href="/settings" className="text-warning hover:underline">
                  فعّل بريدك
                </Link>
              )}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" />
              {user.timezone}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              عضو منذ {formatDateFull(user.createdAt, user.timezone)}
            </span>
          </div>
        </div>
      </section>

      {/* الإحصائيات السريعة */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'إجمالي المهام', value: stats.tasks, icon: ListChecks, tone: 'text-brand bg-brand/10' },
          { label: 'مهام منجزة', value: stats.completed, icon: Check, tone: 'text-success bg-success/10' },
          { label: 'عادات نشطة', value: stats.habits, icon: Target, tone: 'text-emerald-500 bg-emerald-500/10' },
          { label: 'أطول سلسلة', value: stats.bestStreak, icon: Flame, tone: 'text-orange-500 bg-orange-500/10' },
        ].map((stat) => (
          <div key={stat.label} className="card flex items-center gap-3.5 p-4">
            <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', stat.tone)}>
              <stat.icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="num text-xl font-extrabold leading-none">{stat.value}</p>
              <p className="mt-1 truncate text-[12px] text-muted">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* تعديل البيانات */}
      <section className="card p-5">
        <h2 className="text-[15px] font-bold">تعديل المعلومات</h2>
        <div className="mt-4 space-y-4">
          <Input
            label="الاسم"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            error={errors.name}
          />
          <Input label="البريد الإلكتروني" value={user.email} disabled dir="ltr" className="text-left" />
          <Select
            label="المنطقة الزمنية"
            value={form.timezone}
            onChange={(e) => setForm({ ...form, timezone: e.target.value })}
            hint={
              detected !== form.timezone
                ? `يبدو أنك في ${detected} — يمكنك اختيارها من القائمة.`
                : 'كل مواعيدك تُعرض بهذا التوقيت.'
            }
          >
            {[...new Set([...TIMEZONES, detected])].map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </Select>
          <Select label="اللغة" value="ar" disabled>
            <option value="ar">العربية</option>
          </Select>

          <div className="flex gap-2">
            <Button onClick={save} loading={saving} disabled={!dirty}>
              حفظ التغييرات
            </Button>
            {dirty && (
              <Button
                variant="ghost"
                onClick={() => setForm({ name: user.name, timezone: user.timezone, avatarUrl: user.avatarUrl })}
              >
                تراجع
              </Button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
