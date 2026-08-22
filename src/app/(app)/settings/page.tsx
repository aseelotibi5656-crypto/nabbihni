import type { Metadata } from 'next';
import { SettingsView } from '@/components/app/settings-view';
import { requireUser, getUserSettings } from '@/server/auth/current-user';
import type { UserSettings } from '@/lib/types';

export const metadata: Metadata = { title: 'الإعدادات' };
export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const user = await requireUser('/settings');
  const settings = await getUserSettings(user.id);
  return <SettingsView initialSettings={settings as UserSettings} />;
}
