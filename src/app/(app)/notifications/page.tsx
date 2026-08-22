import type { Metadata } from 'next';
import { NotificationsView } from '@/components/app/notifications-view';
import { requireUser } from '@/server/auth/current-user';
import { listNotifications } from '@/server/repos/notifications';

export const metadata: Metadata = { title: 'الإشعارات' };
export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const user = await requireUser('/notifications');
  return <NotificationsView initial={listNotifications(user.id)} />;
}
