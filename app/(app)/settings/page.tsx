'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { getThemeSnapshot, subscribeTheme } from '@/lib/appThemeStore';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { markLoginFromLogout } from '@/lib/loginSplash';
import { signOutAndClearSession } from '@/lib/signOutClient';
import { clearSavedLoginAccount } from '@/lib/persistSavedLoginAccount';
import { SettingsSheet } from '@/components/SettingsSheet';
import { DisplaySettingsSheet } from '@/components/DisplaySettingsSheet';
import { ProfileSettingsSheet } from '@/components/ProfileSettingsSheet';
import { HelpContent, PrivacyContent, TermsContent } from '@/components/StaticContents';

const APP_VERSION = '1.0.0';

type Sheet = 'profile' | 'display' | 'help' | 'terms' | 'privacy' | null;

const RADIUS_OPTIONS = [
  { value: 5_000,  label: '5km' },
  { value: 10_000, label: '10km' },
  { value: 20_000, label: '20km' },
  { value: 50_000, label: '50km' },
];

interface Settings {
  mapRadiusM: number;
}

export default function SettingsPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [settings, setSettings] = useState<Settings | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const closeSheet = () => setSheet(null);
  const isDark = useSyncExternalStore(
    subscribeTheme,
    () => getThemeSnapshot() === 'dark',
    () => false,
  );
  const itemBorder = isDark ? '#262626' : '#e5e7eb';

  useEffect(() => {
    fetch('/api/mypage/summary')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setEmail(d.email ?? '');
        setSettings(d.settings);
      })
      .catch(() => {});
  }, []);

  const patch = (data: Partial<Settings>) => {
    setSettings((prev) => (prev ? { ...prev, ...data } : prev));
    fetch('/api/profile/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch(() => {});
  };

  const handleLogout = async () => {
    await signOutAndClearSession();
    markLoginFromLogout();
    window.location.href = '/login';
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('退会すると、投稿・お気に入りなどすべてのデータが削除されます。本当に退会しますか？')) return;
    if (!window.confirm('この操作は取り消せません。よろしいですか？')) return;
    setDeleting(true);
    const res = await fetch('/api/me', { method: 'DELETE', credentials: 'include' }).catch(() => null);
    if (res?.ok) {
      await clearSavedLoginAccount(email);
      await signOutAndClearSession();
      markLoginFromLogout();
      window.location.href = '/login';
    } else {
      setDeleting(false);
      window.alert('退会に失敗しました。時間をおいて再度お試しください');
    }
  };

  return (
    <div className="relative flex flex-col h-full bg-[#FFFFFF] overflow-hidden">
      <div className="flex-shrink-0 bg-white flex items-center gap-2 px-3" style={{ height: 52, borderBottom: '1.5px solid #EDE9D8' }}>
        <button onClick={() => router.push('/mypage')} className="p-2 active:opacity-60" aria-label="戻る">
          <ArrowLeft size={20} color="#555" />
        </button>
        <h1 className="text-[16px] font-black" style={{ color: '#111' }}>設定</h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-6 md:pb-10">
        {/* 地図 */}
        <SectionTitle>地図</SectionTitle>
        <div className="bg-white px-4 py-3.5" style={{ borderTop: `1px solid ${itemBorder}`, borderBottom: `1px solid ${itemBorder}` }}>
          <p className="text-[14px] font-bold" style={{ color: '#111' }}>検索範囲</p>
          <div className="flex gap-2 mt-2.5">
            {RADIUS_OPTIONS.map((opt) => {
              const selected = settings?.mapRadiusM === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => patch({ mapRadiusM: opt.value })}
                  className="flex-1 py-2 rounded-xl text-[13px] font-bold"
                  style={{
                    background: selected ? '#FFF8D0' : '#FAFAF5',
                    color: selected ? '#B45309' : '#888',
                    border: selected ? '1.5px solid #F2B800' : `1.5px solid ${itemBorder}`,
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* アカウント */}
        <SectionTitle>アカウント</SectionTitle>
        <div className="bg-white" style={{ borderTop: `1px solid ${itemBorder}`, borderBottom: `1px solid ${itemBorder}` }}>
          <RowLink label="プロフィール設定" borderColor={itemBorder} onClick={() => setSheet('profile')} />
          <RowLink label="メールアドレス" detail={email || '…'} borderColor={itemBorder} onClick={() => router.push('/settings/email')} />
          <RowLink label="パスワードの再設定" borderColor={itemBorder} onClick={() => router.push('/settings/password')} />
        </div>

        {/* その他 */}
        <SectionTitle>その他</SectionTitle>
        <div className="bg-white" style={{ borderTop: `1px solid ${itemBorder}`, borderBottom: `1px solid ${itemBorder}` }}>
          <RowLink label="表示" borderColor={itemBorder} onClick={() => setSheet('display')} />
          <RowLink label="ヘルプ・お知らせ" borderColor={itemBorder} onClick={() => setSheet('help')} />
          <RowLink label="利用規約" borderColor={itemBorder} onClick={() => setSheet('terms')} />
          <RowLink label="プライバシーポリシー" borderColor={itemBorder} onClick={() => setSheet('privacy')} />
          <div className="flex items-center justify-between px-4 py-2.5 md:py-3.5">
            <p className="text-[14px] font-bold" style={{ color: '#111' }}>バージョン</p>
            <p className="text-[12px]" style={{ color: '#AAA' }}>{APP_VERSION}</p>
          </div>
        </div>

        {/* ログアウト・退会 */}
        <div className="mt-6 md:mt-8 px-4 flex flex-col gap-2">
          <button
            onClick={handleLogout}
            className={`w-full py-2.5 md:py-3.5 rounded-2xl text-[14px] font-bold active:scale-95 transition-transform${isDark ? ' map-list-toggle-btn' : ''}`}
            style={isDark ? undefined : { background: '#EDE9D8', color: '#555' }}
          >
            ログアウト
          </button>
          <button onClick={handleDeleteAccount} disabled={deleting} className="w-full py-2 md:py-3 text-[13px] font-bold" style={{ color: '#DC2626', opacity: deleting ? 0.5 : 1 }}>
            {deleting ? '処理中…' : '退会する'}
          </button>
        </div>
      </div>

      {/* サブ画面（ページ遷移なしのオーバーレイ） */}
      <ProfileSettingsSheet open={sheet === 'profile'} onClose={closeSheet} />
      <DisplaySettingsSheet open={sheet === 'display'} onClose={closeSheet} />
      <SettingsSheet open={sheet === 'help'} onClose={closeSheet} title="ヘルプ・お知らせ"><HelpContent /></SettingsSheet>
      <SettingsSheet open={sheet === 'terms'} onClose={closeSheet} title="利用規約"><TermsContent /></SettingsSheet>
      <SettingsSheet open={sheet === 'privacy'} onClose={closeSheet} title="プライバシーポリシー"><PrivacyContent /></SettingsSheet>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="px-4 pt-6 pb-2 text-[12px] font-bold" style={{ color: '#AAA' }}>{children}</p>;
}

function RowLink({ label, detail, borderColor, onClick }: { label: string; detail?: string; borderColor: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between px-4 py-2.5 md:py-3.5 active:opacity-60" style={{ borderBottom: `1px solid ${borderColor}` }}>
      <p className="text-[14px] font-bold" style={{ color: '#111' }}>{label}</p>
      <div className="flex items-center gap-1 min-w-0">
        {detail ? (
          <p className="text-[12px] truncate max-w-[180px]" style={{ color: '#AAA' }}>{detail}</p>
        ) : null}
        <ChevronRight size={17} color="#C4C3C0" />
      </div>
    </button>
  );
}
