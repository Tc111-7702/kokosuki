'use client';

import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { Avatar } from '@/components/ui/Avatar';
import { ScrapingPanel } from '@/components/admin/ScrapingPanel';
import { FeaturedPanel } from '@/components/admin/FeaturedPanel';
import type { ScheduleConfig } from '@/lib/scrapeSchedule';

interface Props {
  name: string;
  handle: string | null;
  email: string;
  avatarUrl: string | null;
  gachaSchedule: ScheduleConfig;
  phoneSchedule: ScheduleConfig;
}

// 管理者画面：プロフィール ＋ メンテナンス（スクレイピング / コンテンツ管理）
export function AdminScreen({ name, handle, email, avatarUrl, gachaSchedule, phoneSchedule }: Props) {
  const router = useRouter();

  const handleLogout = async () => {
    await authClient.signOut();
    router.push('/login');
  };

  return (
    <div className="flex flex-col h-full bg-[#FFFEEF]">
      {/* タイトル */}
      <div className="flex-shrink-0 bg-white flex items-center px-4" style={{ height: 52, borderBottom: '1.5px solid #EDE9D8' }}>
        <h1 className="text-[16px] font-black" style={{ color: '#111' }}>管理者</h1>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-3 px-4 pt-6 w-full">
        {/* プロフィール（横並び・コンパクト） */}
        <div
          className="w-full bg-white rounded-2xl px-4 py-3 flex items-center gap-3"
          style={{ border: '1.5px solid #EDE9D8' }}
        >
          <Avatar user={{ name, image: avatarUrl }} size={56} />
          <div className="flex-1 min-w-0 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <span className="text-[16px] font-black" style={{ color: '#111' }}>{name}</span>
            {handle && <span className="text-[12px]" style={{ color: '#AAA' }}>@{handle}</span>}
            <span className="text-[13px]" style={{ color: '#666', wordBreak: 'break-all' }}>{email}</span>
          </div>
        </div>

        {/* アプリを利用する / ログアウト（デスクトップ=左右半分ずつ, モバイル=上下） */}
        <div className="flex flex-col lg:flex-row gap-3 w-full">
          <button
            onClick={() => router.push('/home')}
            className="w-full lg:flex-1 py-4 rounded-2xl font-black text-white text-[16px] active:opacity-80"
            style={{ background: '#F2B800' }}
          >
            アプリを利用する
          </button>
          <button
            onClick={handleLogout}
            className="w-full lg:flex-1 py-4 rounded-2xl font-black text-[16px] active:opacity-80"
            style={{ background: '#F4F1E4', color: '#888' }}
          >
            ログアウト
          </button>
        </div>

        {/* メンテナンス */}
        <section className="w-full flex flex-col gap-3 mt-4">
          <h2 className="text-[15px] font-black" style={{ color: '#111' }}>メンテナンス</h2>

          {/* スクレイピング */}
          <div className="w-full bg-white rounded-2xl px-4 py-4" style={{ border: '1.5px solid #EDE9D8' }}>
            <h3 className="text-[13px] font-bold mb-3" style={{ color: '#888' }}>スクレイピング</h3>
            <ScrapingPanel initialGacha={gachaSchedule} initialPhone={phoneSchedule} />
          </div>

          {/* コンテンツ管理（今週発売・再販 など） */}
          <div className="w-full bg-white rounded-2xl px-4 py-4" style={{ border: '1.5px solid #EDE9D8' }}>
            <h3 className="text-[13px] font-bold mb-3" style={{ color: '#888' }}>コンテンツ管理</h3>
            <div className="mb-6">
              <p className="text-[13px] font-black mb-2" style={{ color: '#111' }}>今週発売</p>
              <FeaturedPanel section="weekly" badge="今週発売" />
            </div>
            <div>
              <p className="text-[13px] font-black mb-2" style={{ color: '#111' }}>再販・また引ける！</p>
              <FeaturedPanel section="reissue" badge="発売中" />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
