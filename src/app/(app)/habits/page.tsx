import type { Metadata } from 'next';
import { HabitsView } from '@/components/app/habits-view';
import { requireUser } from '@/server/auth/current-user';
import { listHabits } from '@/server/repos/habits';

export const metadata: Metadata = { title: 'العادات' };
export const dynamic = 'force-dynamic';

export default async function HabitsPage() {
  const user = await requireUser('/habits');
  return <HabitsView initialHabits={listHabits(user.id, user.timezone)} />;
}
