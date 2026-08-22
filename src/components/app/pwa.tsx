'use client';

import { useEffect, useState } from 'react';
import { Download, X, BellRing } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api-client';

/**
 * تسجيل Service Worker + الاشتراك في الإشعارات الدافعة + دعوة التثبيت.
 * كل شيء اختياري ولا يعطّل التطبيق إن رفض المستخدم أو لم يدعمه المتصفح.
 */
export function PwaManager({ pushEnabled }: { pushEnabled: boolean }) {
  const toast = useToast();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [showPermission, setShowPermission] = useState(false);

  // 1) تسجيل Service Worker
  useEffect(() => {
    if (!('serviceWorker' in navigator) || process.env.NODE_ENV === 'development') return;
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
  }, []);

  // 2) دعوة التثبيت
  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      if (!localStorage.getItem('nabbihni-install-dismissed')) {
        setTimeout(() => setShowInstall(true), 20_000);
      }
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  // 3) طلب إذن الإشعارات بعد أن يستقر المستخدم في التطبيق
  useEffect(() => {
    if (!pushEnabled || !('Notification' in window)) return;
    if (Notification.permission !== 'default') {
      if (Notification.permission === 'granted') void subscribeToPush();
      return;
    }
    if (localStorage.getItem('nabbihni-perm-dismissed')) return;
    const timer = setTimeout(() => setShowPermission(true), 8000);
    return () => clearTimeout(timer);
  }, [pushEnabled]);

  async function requestPermission() {
    setShowPermission(false);
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        await subscribeToPush();
        toast.success('تم تفعيل الإشعارات 🔔', 'سنذكّرك بمهامك في وقتها.');
      } else {
        toast.info('لن تصلك إشعارات المتصفح', 'يمكنك تفعيلها لاحقًا من الإعدادات.');
      }
    } catch {
      toast.error('تعذّر تفعيل الإشعارات');
    }
    localStorage.setItem('nabbihni-perm-dismissed', '1');
  }

  async function install() {
    setShowInstall(false);
    localStorage.setItem('nabbihni-install-dismissed', '1');
    if (!installPrompt) return;
    await installPrompt.prompt();
    setInstallPrompt(null);
  }

  return (
    <>
      {showPermission && (
        <Prompt
          icon={<BellRing className="h-5 w-5" />}
          title="فعّل التذكيرات"
          body="اسمح بالإشعارات ليصلك تنبيه في وقت كل مهمة، حتى لو كان التطبيق في الخلفية."
          actionLabel="تفعيل"
          onAction={requestPermission}
          onDismiss={() => {
            setShowPermission(false);
            localStorage.setItem('nabbihni-perm-dismissed', '1');
          }}
        />
      )}

      {showInstall && installPrompt && (
        <Prompt
          icon={<Download className="h-5 w-5" />}
          title="ثبّت نَبّهني على جهازك"
          body="افتحه كتطبيق مستقل من شاشتك الرئيسية، بسرعة أكبر وإشعارات أفضل."
          actionLabel="تثبيت"
          onAction={install}
          onDismiss={() => {
            setShowInstall(false);
            localStorage.setItem('nabbihni-install-dismissed', '1');
          }}
        />
      )}
    </>
  );
}

function Prompt({
  icon,
  title,
  body,
  actionLabel,
  onAction,
  onDismiss,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="fixed inset-x-4 bottom-24 z-40 animate-slide-in-bottom rounded-2xl border border-line bg-elevated p-4 shadow-lift sm:inset-x-auto sm:left-6 sm:bottom-6 sm:w-[360px] lg:bottom-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/12 text-brand">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">{title}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">{body}</p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={onAction}
              className="h-9 flex-1 rounded-xl bg-brand text-[13px] font-bold text-brand-fg transition-colors hover:bg-brand-strong"
            >
              {actionLabel}
            </button>
            <button
              onClick={onDismiss}
              className="h-9 rounded-xl border border-line px-4 text-[13px] font-semibold text-muted transition-colors hover:text-fg"
            >
              لاحقًا
            </button>
          </div>
        </div>
        <button onClick={onDismiss} className="shrink-0 rounded-lg p-1 text-faint hover:text-fg" aria-label="إغلاق">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/** الاشتراك في Web Push إذا كانت مفاتيح VAPID مضبوطة على الخادم */
export async function subscribeToPush(): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
    const { configured, publicKey } = await api.push.vapid();
    if (!configured || !publicKey) return false;

    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      }));

    const json = subscription.toJSON() as { endpoint?: string; keys?: { p256dh: string; auth: string } };
    if (!json.endpoint || !json.keys) return false;

    await api.push.subscribe({ endpoint: json.endpoint, keys: json.keys });
    return true;
  } catch {
    return false;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
