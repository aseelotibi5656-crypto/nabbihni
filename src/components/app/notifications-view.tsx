'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bell, BellOff, Check, CheckCheck, Trash2, Info, CalendarClock, Flame, Sparkles } from 'lucide-react';
import { useApp } from './app-provider';
import { Button } from '@/components/ui/button';
import { EmptyState, Tabs } from '@/components/ui/primitives';
import { ConfirmDialog } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api-client';
import { humanizeUntil, formatDateShort, formatTime } from '@/lib/datetime';
import { cn } from '@/lib/utils';
import type { AppNotification, NotificationType } from '@/lib/types';

const ICONS: Record<NotificationType, { icon: React.ComponentType<{ className?: string }>; tone: string }> = {
  reminder: { icon: Bell, tone: 'text-brand bg-brand/10' },
  reschedule: { icon: CalendarClock, tone: 'text-warning bg-warning/10' },
  streak: { icon: Flame, tone: 'text-orange-500 bg-orange-500/10' },
  digest: { icon: Sparkles, tone: 'text-violet-500 bg-violet-500/10' },
  system: { icon: Info, tone: 'text-muted bg-fg/5' },
};

export function NotificationsView({ initial }: { initial: AppNotification[] }) {
  const { user, refresh } = useApp();
  const toast = useToast();
  const [items, setItems] = useState(initial);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [clearing, setClearing] = useState(false);
  const [testing, setTesting] = useState(false);

  const visible = filter === 'unread' ? items.filter((n) => !n.readAt) : items;
  const unread = items.filter((n) => !n.readAt).length;

  async function markRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
    try {
      await api.notifications.markRead(id);
      refresh();
    } catch {
      /* تجاهل */
    }
  }

  async function markAll() {
    setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    try {
      await api.notifications.markAllRead();
      toast.success('تم تعليم الكل كمقروء');
      refresh();
    } catch {
      toast.error('تعذّر التحديث');
    }
  }

  async function remove(id: string) {
    setItems((prev) => prev.filter((n) => n.id !== id));
    try {
      await api.notifications.remove(id);
      refresh();
    } catch {
      toast.error('تعذّر الحذف');
    }
  }

  async function clearAll() {
    try {
      await api.notifications.clear();
      setItems([]);
      setClearing(false);
      toast.success('تم مسح كل الإشعارات');
      refresh();
    } catch {
      toast.error('تعذّر المسح');
    }
  }

  async function sendTest() {
    setTesting(true);
    try {
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
      }
      const result = await api.push.test();
      toast.success('أرسلنا إشعارًا تجريبيًا 🔔', result.message);
      const { notifications } = await api.notifications.list();
      setItems(notifications);
      refresh();
    } catch {
      toast.error('تعذّر إرسال الإشعار التجريبي');
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">الإشعارات</h1>
          <p className="mt-1 text-sm text-muted">
            {unread > 0 ? (
              <>
                لديك <span className="num font-bold text-fg">{unread}</span> إشعار غير مقروء
              </>
            ) : (
              'كل إشعاراتك مقروءة'
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={sendTest} loading={testing} icon={<Bell className="h-4 w-4" />}>
            إشعار تجريبي
          </Button>
          {unread > 0 && (
            <Button variant="secondary" size="sm" onClick={markAll} icon={<CheckCheck className="h-4 w-4" />}>
              تعليم الكل
            </Button>
          )}
          {items.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setClearing(true)} icon={<Trash2 className="h-4 w-4" />}>
              مسح الكل
            </Button>
          )}
        </div>
      </header>

      <Tabs
        tabs={[
          { value: 'all' as const, label: 'الكل', count: items.length },
          { value: 'unread' as const, label: 'غير المقروءة', count: unread },
        ]}
        value={filter}
        onChange={setFilter}
        className="max-w-xs"
      />

      {visible.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<BellOff className="h-7 w-7" />}
            title={filter === 'unread' ? 'لا إشعارات غير مقروءة' : 'لا توجد إشعارات بعد'}
            description={
              filter === 'unread'
                ? 'أنت على اطّلاع بكل شيء 👌'
                : 'ستظهر هنا تذكيرات مهامك ومواعيدك فور اقترابها.'
            }
            action={
              <Button size="sm" variant="secondary" onClick={sendTest} loading={testing}>
                جرّب إشعارًا الآن
              </Button>
            }
          />
        </div>
      ) : (
        <div className="space-y-2.5">
          {visible.map((item) => {
            const meta = ICONS[item.type] ?? ICONS.system;
            const unreadItem = !item.readAt;
            return (
              <article
                key={item.id}
                className={cn(
                  'group relative flex items-start gap-3.5 rounded-2xl border bg-surface p-4 transition-all',
                  unreadItem ? 'border-brand/30 bg-brand/[.03]' : 'border-line',
                )}
              >
                <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', meta.tone)}>
                  <meta.icon className="h-4.5 w-4.5" />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[15px] font-bold leading-snug">{item.title}</p>
                    {unreadItem && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />}
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted">{item.body}</p>

                  <div className="mt-2.5 flex flex-wrap items-center gap-3">
                    <span className="text-[11px] text-faint">
                      {formatDateShort(item.createdAt, user.timezone)} ·{' '}
                      <span className="num">{formatTime(item.createdAt, user.timezone)}</span>
                    </span>
                    {item.link && (
                      <Link
                        href={item.link}
                        onClick={() => markRead(item.id)}
                        className="text-[12px] font-semibold text-brand hover:underline"
                      >
                        عرض التفاصيل
                      </Link>
                    )}
                    {unreadItem && (
                      <button
                        onClick={() => markRead(item.id)}
                        className="inline-flex items-center gap-1 text-[12px] font-semibold text-muted hover:text-fg"
                      >
                        <Check className="h-3.5 w-3.5" />
                        تعليم كمقروء
                      </button>
                    )}
                    <button
                      onClick={() => remove(item.id)}
                      className="mr-auto inline-flex items-center gap-1 text-[12px] font-semibold text-faint transition-colors hover:text-danger"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      حذف
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={clearing}
        onClose={() => setClearing(false)}
        onConfirm={clearAll}
        title="مسح كل الإشعارات"
        message="سيتم حذف كل الإشعارات نهائيًا. لن يؤثر ذلك على مهامك أو تذكيراتك القادمة."
        confirmLabel="مسح الكل"
      />
    </div>
  );
}

export { humanizeUntil };
