'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  User, Bell, Palette, Globe, Shield, Lock, Moon, Sun, Monitor, Check,
  LogOut, Trash2, KeyRound, Smartphone, Clock,
} from 'lucide-react';
import { useApp } from './app-provider';
import { subscribeToPush } from './pwa';
import { Button } from '@/components/ui/button';
import { Input, Select, Switch, Tabs } from '@/components/ui/primitives';
import { ConfirmDialog } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { api, ApiError } from '@/lib/api-client';
import { REMINDER_PRESETS, TIMEZONES } from '@/lib/constants';
import { reminderLabel } from '@/lib/datetime';
import { cn } from '@/lib/utils';
import type { UserSettings, ThemeMode } from '@/lib/types';

type Section = 'account' | 'notifications' | 'appearance' | 'region' | 'privacy' | 'security';

export function SettingsView({ initialSettings }: { initialSettings: UserSettings }) {
  const { refresh } = useApp();
  const toast = useToast();
  const [section, setSection] = useState<Section>('account');
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);

  async function update(patch: Partial<UserSettings>) {
    const previous = settings;
    setSettings({ ...settings, ...patch });
    setSaving(true);
    try {
      const { settings: saved } = await api.settings.update(patch);
      setSettings(saved);
      refresh();
    } catch {
      setSettings(previous);
      toast.error('تعذّر حفظ الإعداد');
    } finally {
      setSaving(false);
    }
  }

  const sections: { value: Section; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { value: 'account', label: 'الحساب', icon: User },
    { value: 'notifications', label: 'الإشعارات', icon: Bell },
    { value: 'appearance', label: 'المظهر', icon: Palette },
    { value: 'region', label: 'اللغة والمنطقة', icon: Globe },
    { value: 'privacy', label: 'الخصوصية', icon: Shield },
    { value: 'security', label: 'الأمان', icon: Lock },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">الإعدادات</h1>
        <p className="mt-1 text-sm text-muted">
          خصّص نَبّهني كما يناسبك
          {saving && <span className="mr-2 text-brand">· يحفظ…</span>}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        {/* التنقّل الجانبي */}
        <nav className="lg:sticky lg:top-20 lg:self-start">
          <div className="no-scrollbar flex gap-1 overflow-x-auto rounded-xl bg-elevated p-1 lg:flex-col">
            {sections.map((item) => (
              <button
                key={item.value}
                onClick={() => setSection(item.value)}
                className={cn(
                  'flex shrink-0 items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-sm font-semibold transition-all lg:w-full',
                  section === item.value ? 'bg-surface text-brand shadow-soft' : 'text-muted hover:text-fg',
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </div>
        </nav>

        <div className="space-y-5">
          {section === 'account' && <AccountSection />}
          {section === 'notifications' && <NotificationsSection settings={settings} update={update} />}
          {section === 'appearance' && <AppearanceSection settings={settings} update={update} />}
          {section === 'region' && <RegionSection settings={settings} update={update} />}
          {section === 'privacy' && <PrivacySection settings={settings} update={update} />}
          {section === 'security' && <SecuritySection />}
        </div>
      </div>
    </div>
  );
}

/* --------------------------------- بطاقة --------------------------------- */

function Card({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-5">
      <h2 className="text-[15px] font-bold">{title}</h2>
      {description && <p className="mt-1 text-[13px] text-muted">{description}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

/* --------------------------------- الحساب --------------------------------- */

function AccountSection() {
  const { user, refresh } = useApp();
  const toast = useToast();
  const [name, setName] = useState(user.name);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await api.profile.update({ name });
      toast.success('تم حفظ التغييرات');
      refresh();
    } catch (error) {
      toast.error('تعذّر الحفظ', error instanceof ApiError ? error.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  async function resend() {
    setVerifying(true);
    try {
      const result = await api.auth.resendVerification();
      toast.success('تم الإرسال', result.message);
    } catch {
      toast.error('تعذّر إرسال رسالة التفعيل');
    } finally {
      setVerifying(false);
    }
  }

  return (
    <>
      <Card title="معلومات الحساب" description="تظهر في تحيّة لوحة التحكم وفي إشعاراتك.">
        <Input label="الاسم" value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="البريد الإلكتروني" value={user.email} disabled dir="ltr" className="text-left" />
        <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-bg/50 p-3.5">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold">
              حالة البريد:{' '}
              <span className={user.emailVerified ? 'text-success' : 'text-warning'}>
                {user.emailVerified ? 'مُفعَّل ✓' : 'غير مُفعَّل'}
              </span>
            </p>
            {!user.emailVerified && (
              <p className="mt-0.5 text-[12px] text-muted">فعّل بريدك لاستقبال التذكيرات عبر البريد.</p>
            )}
          </div>
          {!user.emailVerified && (
            <Button size="sm" variant="secondary" onClick={resend} loading={verifying}>
              إرسال الرابط
            </Button>
          )}
        </div>
        <Button onClick={save} loading={saving} className="w-full sm:w-auto">
          حفظ التغييرات
        </Button>
      </Card>

      <Card title="الخطة الحالية" description="ابدأ مجانًا وترقَّ عندما تحتاج المزيد.">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-brand/25 bg-brand/[.05] p-4">
          <div>
            <p className="text-[15px] font-bold text-brand">
              {user.plan === 'free' ? 'الخطة المجانية' : user.plan === 'pro' ? 'الخطة الاحترافية' : 'خطة الأعمال'}
            </p>
            <p className="mt-0.5 text-[12px] text-muted">
              كل ما تحتاجه لتنظيم يومك — بلا حدود على المهام والمواعيد.
            </p>
          </div>
        </div>
        <p className="text-[12px] text-faint">
          بنية الاشتراكات جاهزة للربط بمزوّد دفع لاحقًا دون تغيير في قاعدة البيانات.
        </p>
      </Card>
    </>
  );
}

/* -------------------------------- الإشعارات -------------------------------- */

function NotificationsSection({
  settings,
  update,
}: {
  settings: UserSettings;
  update: (patch: Partial<UserSettings>) => void;
}) {
  const toast = useToast();
  const [testing, setTesting] = useState(false);
  const [permission, setPermission] = useState<string>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default',
  );

  async function enableBrowser() {
    if (!('Notification' in window)) {
      toast.error('متصفحك لا يدعم الإشعارات');
      return;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') {
      await subscribeToPush();
      toast.success('تم تفعيل إشعارات المتصفح 🔔');
    } else {
      toast.info('لم يُمنح الإذن', 'يمكنك تفعيله من إعدادات المتصفح.');
    }
  }

  async function test() {
    setTesting(true);
    try {
      const result = await api.push.test();
      toast.success('تم الإرسال', result.message);
    } catch {
      toast.error('تعذّر الإرسال');
    } finally {
      setTesting(false);
    }
  }

  const toggleOffset = (value: number) => {
    const current = settings.defaultReminderOffsets;
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value].slice(0, 6);
    update({ defaultReminderOffsets: next.sort((a, b) => a - b) });
  };

  return (
    <>
      <Card title="قنوات الإشعارات" description="اختر كيف نصل إليك عند اقتراب المواعيد.">
        <div
          className={cn(
            'flex items-center justify-between gap-3 rounded-xl border p-3.5',
            permission === 'granted' ? 'border-success/30 bg-success/[.06]' : 'border-warning/30 bg-warning/[.06]',
          )}
        >
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[13px] font-semibold">
              <Smartphone className="h-4 w-4" />
              إشعارات المتصفح والجهاز
            </p>
            <p className="mt-0.5 text-[12px] text-muted">
              {permission === 'granted'
                ? 'مفعّلة — ستصلك التذكيرات في وقتها.'
                : permission === 'denied'
                  ? 'مرفوضة من إعدادات المتصفح. فعّلها من إعدادات الموقع.'
                  : 'لم تُفعّل بعد.'}
            </p>
          </div>
          {permission !== 'granted' && (
            <Button size="sm" onClick={enableBrowser}>
              تفعيل
            </Button>
          )}
        </div>

        <Switch
          checked={settings.pushEnabled}
          onChange={(v) => update({ pushEnabled: v })}
          label="الإشعارات الدافعة"
          description="تصلك حتى والتطبيق مغلق بعد تثبيته على جهازك."
        />
        <Switch
          checked={settings.emailEnabled}
          onChange={(v) => update({ emailEnabled: v })}
          label="التذكير عبر البريد الإلكتروني"
          description="نسخة إضافية من التذكير تصل إلى بريدك."
        />
        <Switch
          checked={settings.soundEnabled}
          onChange={(v) => update({ soundEnabled: v })}
          label="نغمة التنبيه"
          description="صوت خفيف عند ظهور التذكير داخل التطبيق."
        />

        <Button variant="secondary" size="sm" onClick={test} loading={testing} icon={<Bell className="h-4 w-4" />}>
          أرسل إشعارًا تجريبيًا
        </Button>
      </Card>

      <Card
        title="التذكير الذكي"
        description="التذكيرات الافتراضية التي تُضاف تلقائيًا لكل مهمة جديدة."
      >
        <div className="flex flex-wrap gap-2">
          {REMINDER_PRESETS.map((preset) => {
            const active = settings.defaultReminderOffsets.includes(preset.value);
            return (
              <button
                key={preset.value}
                onClick={() => toggleOffset(preset.value)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-all',
                  active ? 'border-brand bg-brand/12 text-brand' : 'border-line text-muted hover:border-brand/30',
                )}
              >
                {reminderLabel(preset.value)}
              </button>
            );
          })}
        </div>
        {settings.defaultReminderOffsets.length > 0 && (
          <p className="rounded-xl bg-brand/8 px-3 py-2 text-[12px] text-brand">
            سيتم تذكيرك: {settings.defaultReminderOffsets.map((o) => reminderLabel(o)).join('، ')}
          </p>
        )}
        <Switch
          checked={settings.smartRemindersEnabled}
          onChange={(v) => update({ smartRemindersEnabled: v })}
          label="تذكير متدرّج"
          description="تذكيرات متتابعة قبل الموعد بدل تنبيه واحد."
        />
        <Switch
          checked={settings.smartRescheduleEnabled}
          onChange={(v) => update({ smartRescheduleEnabled: v })}
          label="اقتراح إعادة الجدولة"
          description="عند تأخّر مهمة، نقترح أوقاتًا مناسبة لنقلها."
        />
      </Card>

      <Card title="الملخص اليومي وساعات الهدوء">
        <Switch
          checked={settings.dailyDigest}
          onChange={(v) => update({ dailyDigest: v })}
          label="ملخص الصباح"
          description="نظرة سريعة على مهام يومك."
        />
        {settings.dailyDigest && (
          <Input
            label="وقت الملخص"
            type="time"
            value={settings.digestTime}
            onChange={(e) => update({ digestTime: e.target.value })}
            className="max-w-[180px]"
          />
        )}
        <Switch
          checked={settings.quietHoursEnabled}
          onChange={(v) => update({ quietHoursEnabled: v })}
          label="ساعات الهدوء"
          description="لا تصلك إشعارات خلال هذه الفترة."
        />
        {settings.quietHoursEnabled && (
          <div className="grid max-w-sm grid-cols-2 gap-3">
            <Input
              label="من"
              type="time"
              value={settings.quietHoursStart}
              onChange={(e) => update({ quietHoursStart: e.target.value })}
            />
            <Input
              label="إلى"
              type="time"
              value={settings.quietHoursEnd}
              onChange={(e) => update({ quietHoursEnd: e.target.value })}
            />
          </div>
        )}
      </Card>
    </>
  );
}

/* --------------------------------- المظهر --------------------------------- */

function AppearanceSection({
  settings,
  update,
}: {
  settings: UserSettings;
  update: (patch: Partial<UserSettings>) => void;
}) {
  const [theme, setTheme] = useState<ThemeMode>(settings.theme);

  function applyTheme(mode: ThemeMode) {
    setTheme(mode);
    localStorage.setItem('nabbihni-theme', mode);
    const dark =
      mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
    update({ theme: mode });
  }

  return (
    <>
      <Card title="السمة" description="اختر ما يريح عينك.">
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              { value: 'light', label: 'فاتح', icon: Sun },
              { value: 'dark', label: 'داكن', icon: Moon },
              { value: 'system', label: 'حسب النظام', icon: Monitor },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              onClick={() => applyTheme(option.value)}
              className={cn(
                'flex flex-col items-center gap-2 rounded-2xl border p-4 transition-all',
                theme === option.value ? 'border-brand bg-brand/8 text-brand' : 'border-line text-muted hover:border-brand/30',
              )}
            >
              <option.icon className="h-5 w-5" />
              <span className="text-[13px] font-semibold">{option.label}</span>
              {theme === option.value && <Check className="h-3.5 w-3.5" />}
            </button>
          ))}
        </div>
      </Card>

      <Card title="عرض التقويم" description="العرض الافتراضي عند فتح التقويم.">
        <Select
          label="العرض الافتراضي"
          value={settings.defaultView}
          onChange={(e) => update({ defaultView: e.target.value as UserSettings['defaultView'] })}
          className="max-w-[220px]"
        >
          <option value="day">يومي</option>
          <option value="week">أسبوعي</option>
          <option value="month">شهري</option>
          <option value="year">سنوي</option>
        </Select>
      </Card>
    </>
  );
}

/* ----------------------------- اللغة والمنطقة ----------------------------- */

function RegionSection({
  settings,
  update,
}: {
  settings: UserSettings;
  update: (patch: Partial<UserSettings>) => void;
}) {
  const { user, refresh } = useApp();
  const toast = useToast();
  const [timezone, setTimezone] = useState(user.timezone);
  const [saving, setSaving] = useState(false);

  async function saveTimezone(value: string) {
    setTimezone(value);
    setSaving(true);
    try {
      await api.profile.update({ timezone: value });
      toast.success('تم تحديث المنطقة الزمنية', 'ستظهر كل مواعيدك بتوقيتك الجديد.');
      refresh();
    } catch {
      toast.error('تعذّر الحفظ');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Card
        title="المنطقة الزمنية"
        description="كل الأوقات تُخزَّن بتوقيت UTC وتُعرض بتوقيتك المحلي — فتبقى مواعيدك صحيحة حتى لو سافرت."
      >
        <Select
          label="المنطقة الزمنية"
          value={timezone}
          onChange={(e) => saveTimezone(e.target.value)}
          disabled={saving}
        >
          {TIMEZONES.map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </Select>
        <p className="flex items-center gap-2 rounded-xl bg-elevated px-3 py-2.5 text-[12px] text-muted">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          توقيتك الحالي:{' '}
          <span className="num font-semibold text-fg">
            {new Intl.DateTimeFormat('en-GB', {
              timeZone: timezone,
              hour: '2-digit',
              minute: '2-digit',
            }).format(new Date())}
          </span>
        </p>
      </Card>

      <Card title="اللغة وصيغة الوقت">
        <Select label="اللغة" value="ar" disabled>
          <option value="ar">العربية</option>
        </Select>
        <Select
          label="صيغة الوقت"
          value={settings.timeFormat}
          onChange={(e) => update({ timeFormat: e.target.value as '12' | '24' })}
          className="max-w-[220px]"
        >
          <option value="12">١٢ ساعة (ص/م)</option>
          <option value="24">٢٤ ساعة</option>
        </Select>
        <Select
          label="بداية الأسبوع"
          value={String(settings.weekStartsOn)}
          onChange={(e) => update({ weekStartsOn: Number(e.target.value) })}
          className="max-w-[220px]"
        >
          <option value="0">الأحد</option>
          <option value="1">الاثنين</option>
          <option value="6">السبت</option>
        </Select>
      </Card>
    </>
  );
}

/* -------------------------------- الخصوصية -------------------------------- */

function PrivacySection({
  settings,
  update,
}: {
  settings: UserSettings;
  update: (patch: Partial<UserSettings>) => void;
}) {
  return (
    <>
      <Card title="الخصوصية" description="أنت المتحكّم ببياناتك.">
        <Switch
          checked={settings.analyticsOptIn}
          onChange={(v) => update({ analyticsOptIn: v })}
          label="حساب إحصائيات الإنتاجية"
          description="نحسب أرقامك محليًا داخل حسابك فقط لعرضها لك."
        />
        <Switch
          checked={settings.profilePublic}
          onChange={(v) => update({ profilePublic: v })}
          label="ملف شخصي قابل للمشاركة"
          description="يُستخدم لاحقًا عند مشاركة القوائم مع الآخرين."
        />
      </Card>

      <Card title="بياناتك" description="كل ما ينشئه حسابك يخصّك وحدك.">
        <ul className="space-y-2.5 text-[13px] leading-relaxed text-muted">
          {[
            'كل استعلام في النظام مقيَّد بمعرّف حسابك — لا يمكن لأي مستخدم آخر الوصول لبياناتك.',
            'كلمات المرور تُخزَّن مجزّأة بـ bcrypt ولا تُحفظ أبدًا كنص واضح.',
            'حذف حسابك يحذف كل مهامك ومواعيدك وعاداتك وإشعاراتك فورًا ونهائيًا.',
          ].map((line) => (
            <li key={line} className="flex items-start gap-2">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
              {line}
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}

/* --------------------------------- الأمان --------------------------------- */

function SecuritySection() {
  const toast = useToast();
  const router = useRouter();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function changePassword() {
    setErrors({});
    setSaving(true);
    try {
      await api.auth.changePassword(form.currentPassword, form.newPassword);
      toast.success('تم تغيير كلمة المرور ✅', 'تم تسجيل الخروج من بقية الأجهزة.');
      setForm({ currentPassword: '', newPassword: '' });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.details) setErrors(error.details);
        else toast.error('تعذّر التغيير', error.message);
      }
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    await api.auth.logout();
    router.push('/login');
    router.refresh();
  }

  async function deleteAccount() {
    setDeleting(true);
    try {
      await api.profile.remove();
      toast.success('تم حذف الحساب');
      router.push('/');
      router.refresh();
    } catch {
      toast.error('تعذّر حذف الحساب');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Card title="تغيير كلمة المرور" description="ستُسجَّل الخروج من بقية الأجهزة تلقائيًا.">
        <Input
          label="كلمة المرور الحالية"
          type="password"
          value={form.currentPassword}
          onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
          error={errors.currentPassword}
          autoComplete="current-password"
        />
        <Input
          label="كلمة المرور الجديدة"
          type="password"
          value={form.newPassword}
          onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
          error={errors.newPassword}
          hint="٨ أحرف على الأقل، وتحتوي على حرف ورقم."
          autoComplete="new-password"
        />
        <Button
          onClick={changePassword}
          loading={saving}
          disabled={!form.currentPassword || !form.newPassword}
          icon={<KeyRound className="h-4 w-4" />}
        >
          تغيير كلمة المرور
        </Button>
      </Card>

      <Card title="الجلسات" description="أنهِ جلستك على هذا الجهاز.">
        <Button variant="secondary" onClick={logout} icon={<LogOut className="h-4 w-4" />}>
          تسجيل الخروج
        </Button>
      </Card>

      <section className="rounded-2xl border border-danger/30 bg-danger/[.04] p-5">
        <h2 className="text-[15px] font-bold text-danger">حذف الحساب</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-muted">
          سيُحذف حسابك وكل مهامك ومواعيدك وعاداتك وإشعاراتك نهائيًا. لا يمكن التراجع عن هذا الإجراء.
        </p>
        <Button
          variant="danger"
          className="mt-4"
          onClick={() => setConfirmDelete(true)}
          icon={<Trash2 className="h-4 w-4" />}
        >
          حذف حسابي نهائيًا
        </Button>
      </section>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={deleteAccount}
        loading={deleting}
        title="حذف الحساب نهائيًا"
        message="هذا الإجراء لا يمكن التراجع عنه. سيتم حذف كل بياناتك فورًا."
        confirmLabel="نعم، احذف حسابي"
      />
    </>
  );
}

export { Tabs };
