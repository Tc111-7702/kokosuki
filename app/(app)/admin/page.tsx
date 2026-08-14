import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import * as db from '@/lib/db';
import { getSchedule } from '@/lib/scrapeSchedule';
import { AdminScreen } from '@/components/AdminScreen';

// 管理者専用ページ。サーバー側で role を検証し、admin 以外は /home へ。
export default async function AdminPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user as
    | { id: string; name: string; email: string; image?: string | null; role?: string }
    | undefined;

  if (!user) redirect('/login');
  if (user.role !== 'admin') redirect('/home');

  const [profile, gachaSchedule, phoneSchedule] = await Promise.all([
    db.findProfileByUserId(user.id),
    getSchedule('gacha'),
    getSchedule('phone'),
  ]);

  return (
    <AdminScreen
      name={user.name}
      email={user.email}
      handle={profile?.handle ?? null}
      avatarUrl={profile?.avatarUrl ?? user.image ?? null}
      gachaSchedule={gachaSchedule}
      phoneSchedule={phoneSchedule}
    />
  );
}
