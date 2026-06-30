'use client';

import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { LogOut } from 'lucide-react';

export default function MyPage() {
  const router = useRouter();

  const handleLogout = async () => {
    await authClient.signOut();
    router.push('/login');
  };

  return (
    <div className="flex flex-col h-full bg-[#F7F6F3] items-center justify-center p-6">
      <button
        onClick={handleLogout}
        className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-[15px]"
        style={{ background: '#EDE9D8', color: '#555' }}
      >
        <LogOut size={18} />
        ログアウト
      </button>
    </div>
  );
}
