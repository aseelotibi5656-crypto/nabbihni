import type { Metadata } from 'next';
import { AnalyticsView } from '@/components/app/analytics-view';
import { requireUser } from '@/server/auth/current-user';
import { buildAnalytics } from '@/server/services/analytics';

export const metadata: Metadata = { title: 'الإحصائيات' };
export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  const user = await requireUser('/analytics');
  return <AnalyticsView initial={buildAnalytics(user.id, user.timezone, 30)} />;
}
