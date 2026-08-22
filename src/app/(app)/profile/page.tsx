import type { Metadata } from 'next';
import { ProfileView } from '@/components/app/profile-view';
import { requireUser } from '@/server/auth/current-user';
import { db } from '@/server/db/client';
import { listHabits } from '@/server/repos/habits';

export const metadata: Metadata = { title: 'الملف الشخصي' };
export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const user = await requireUser('/profile');

  const row = db.get<{ total: number; done: number }>(
    `SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS done
     FROM tasks WHERE user_id = ?`,
    [user.id],
  );
  const habits = listHabits(user.id, user.timezone);

  return (
    <ProfileView
      stats={{
        tasks: Number(row?.total ?? 0),
        completed: Number(row?.done ?? 0),
        habits: habits.length,
        bestStreak: habits.reduce((m, h) => Math.max(m, h.stats.longestStreak), 0),
      }}
    />
  );
}
