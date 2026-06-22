'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronRight, Bell, MapPin, User, Lock, Info, LogOut } from 'lucide-react';
import { authClient } from '@/lib/auth-client';

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="flex-shrink-0 rounded-full transition-colors"
      style={{ width: 44, height: 26, background: on ? '#FFCD31' : '#E5E1CE', padding: 3 }}>
      <span className="block rounded-full bg-white transition-transform"
        style={{ width: 20, height: 20, transform: on ? 'translateX(18px)' : 'translateX(0)', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </button>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-1.5 px-5 mb-1.5">
        {icon}<p className="text-[12px] font-black text-[#AAA]">{title}</p>
      </div>
      <div className="bg-white" style={{ borderTop: '1px solid #F0ECD8', borderBottom: '1px solid #F0ECD8' }}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, value, danger, last, onClick }: { label: string; value?: string; danger?: boolean; last?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between px-5 py-3.5 text-left"
      style={{ borderBottom: last ? 'none' : '1px solid #F5F2E8' }}>
      <span className="text-[14px] font-bold" style={{ color: danger ? '#EF4444' : '#111' }}>{label}</span>
      <span className="flex items-center gap-1.5">
        {value && <span className="text-[13px] text-[#AAA]">{value}</span>}
        {!danger && <ChevronRight size={16} color="#CCC" />}
      </span>
    </button>
  );
}

function ToggleRow({ label, on, onToggle, last }: { label: string; on: boolean; onToggle: () => void; last?: boolean }) {
  return (
    <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: last ? 'none' : '1px solid #F5F2E8' }}>
      <span className="text-[14px] font-bold text-[#111]">{label}</span>
      <Toggle on={on} onToggle={onToggle} />
    </div>
  );
}

export function SettingsScreen({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [notif, setNotif] = useState({ release: true, restock: true, qa: true });
  const [favPublic, setFavPublic] = useState(true);
  const toggleNotif = (k: keyof typeof notif) => setNotif((p) => ({ ...p, [k]: !p[k] }));

  const handleLogout = async () => {
    if (!window.confirm('ログアウトしますか？')) return;
    await authClient.signOut();
    router.push('/login');
  };

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-[#FFFEEF]">
      {/* ヘッダー */}
      <div className="flex-shrink-0 bg-white flex items-center gap-3 px-4 pt-12 pb-3" style={{ borderBottom: '1.5px solid #EDE9D8' }}>
        <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#F5F0E0' }}>
          <ArrowLeft size={18} color="#111" />
        </button>
        <p className="text-[16px] font-black text-[#111]">設定</p>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <Section icon={<Bell size={13} color="#AAA" />} title="通知">
          <ToggleRow label="お気に入りの発売・再販" on={notif.release} onToggle={() => toggleNotif('release')} />
          <ToggleRow label="近くで在庫が復活したとき" on={notif.restock} onToggle={() => toggleNotif('restock')} />
          <ToggleRow label="自分の質問への回答" on={notif.qa} onToggle={() => toggleNotif('qa')} last />
        </Section>

        <Section icon={<MapPin size={13} color="#AAA" />} title="エリア">
          <Row label="地図の検索範囲" value="5km" last />
        </Section>

        <Section icon={<User size={13} color="#AAA" />} title="アカウント">
          <Row label="プロフィールを編集" />
          <Row label="メールアドレス" value="taiyo@…" />
          <Row label="X（Twitter）連携" value="未連携" last />
        </Section>

        <Section icon={<Lock size={13} color="#AAA" />} title="プライバシー">
          <ToggleRow label="お気に入りを公開する" on={favPublic} onToggle={() => setFavPublic((v) => !v)} />
          <Row label="位置情報の精度" value="高" />
          <Row label="ブロックリスト" last />
        </Section>

        <Section icon={<Info size={13} color="#AAA" />} title="その他">
          <Row label="ヘルプ・お問い合わせ" />
          <Row label="利用規約" />
          <Row label="プライバシーポリシー" />
          <Row label="バージョン" value="1.0.0" last />
        </Section>

        <div className="bg-white" style={{ borderTop: '1px solid #F0ECD8', borderBottom: '1px solid #F0ECD8' }}>
          <Row label="ログアウト" onClick={handleLogout} />
          <Row label="退会" danger last />
        </div>

        <div className="h-6" />
      </div>
    </div>
  );
}
