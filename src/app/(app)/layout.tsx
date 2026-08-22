import { redirect } from 'next/navigation';
import { AppProvider } from '@/components/app/app-provider';
import { getAuth, getUserSettings } from '@/server/auth/current-user';
import { listCategories } from '@/server/repos/categories';
import { unreadCount } from '@/server/repos/notifications';
import { ensureSettings } from '@/server/repos/users';
import type { UserSettings } from '@/lib/types';

export const dynamic = 'force-dynamic';

const FALLBACK_SETTINGS: UserSettings = {
  theme: 'system',
  accentColor: 'indigo',
  weekStartsOn: 0,
  timeFormat: '12',
  defaultView: 'week',
  pushEnabled: true,
  emailEnabled: false,
  soundEnabled: true,
  dailyDigest: true,
  digestTime: '08:00',
  quietHoursEnabled: false,
  quietHoursStart: '23:00',
  quietHoursEnd: '07:00',
  defaultReminderOffsets: [10],
  smartRemindersEnabled: true,
  smartRescheduleEnabled: true,
  analyticsOptIn: true,
  profilePublic: false,
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const auth = await getAuth();
  if (!auth) redirect('/login');

  ensureSettings(auth.user.id);
  const settings = (await getUserSettings(auth.user.id)) ?? FALLBACK_SETTINGS;

  return (
    <AppProvider
      user={auth.user}
      settings={settings}
      categories={listCategories(auth.user.id)}
      unreadCount={unreadCount(auth.user.id)}
    >
      {children}
    </AppProvider>
  );
}
