'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api-client';

/**
 * مراقب التذكيرات داخل التطبيق.
 * ---------------------------------------------------------------------------
 * يسأل الخادم كل ٣٠ ثانية عن التذكيرات المستحقة، فيعرضها بثلاث طبقات:
 *   1) تنبيه داخل التطبيق (Toast) — يعمل دائمًا.
 *   2) إشعار المتصفح (Notification API) — يعمل بعد منح الإذن، حتى في تبويب آخر.
 *   3) إشعار دافع من الخادم (Web Push) — يعمل والتطبيق مغلق، عند ضبط مفاتيح VAPID.
 * يتوقف السؤال تلقائيًا عندما تكون الصفحة مخفية توفيرًا للبطارية والشبكة.
 */
export function ReminderWatcher({ soundEnabled = true }: { soundEnabled?: boolean }) {
  const toast = useToast();
  const router = useRouter();
  const seen = useRef(new Set<string>());

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      if (document.visibilityState !== 'visible') return;
      try {
        const { reminders } = await api.notifications.due();
        if (cancelled || !reminders.length) return;

        for (const reminder of reminders) {
          if (seen.current.has(reminder.id)) continue;
          seen.current.add(reminder.id);

          toast.toast({
            kind: 'reminder',
            title: reminder.title,
            description: reminder.body,
            duration: 15_000,
            action: { label: 'عرض التفاصيل', onClick: () => router.push(reminder.link) },
          });

          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              const registration = await navigator.serviceWorker?.getRegistration();
              const options: NotificationOptions = {
                body: reminder.body,
                icon: '/icons/icon-192.png',
                badge: '/icons/badge.png',
                tag: reminder.id,
                dir: 'rtl',
                lang: 'ar',
                data: { url: reminder.link },
              };
              if (registration) await registration.showNotification(reminder.title, options);
              else new Notification(reminder.title, options);
            } catch {
              /* تجاهل — التنبيه الداخلي ظهر بالفعل */
            }
          }

          if (soundEnabled) playChime();
        }

        router.refresh();
      } catch {
        /* الشبكة قد تكون منقطعة — سنحاول في الدورة التالية */
      }
    }

    void poll();
    const interval = setInterval(poll, 30_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void poll();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [toast, router, soundEnabled]);

  return null;
}

/** نغمة تنبيه قصيرة مولّدة برمجيًا — لا حاجة لملف صوتي */
function playChime() {
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    const now = ctx.currentTime;

    [880, 1174.7].forEach((frequency, index) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, now + index * 0.16);
      gain.gain.linearRampToValueAtTime(0.14, now + index * 0.16 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.16 + 0.32);
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start(now + index * 0.16);
      oscillator.stop(now + index * 0.16 + 0.34);
    });

    setTimeout(() => void ctx.close(), 900);
  } catch {
    /* الصوت اختياري */
  }
}
