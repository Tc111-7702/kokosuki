'use client';

import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';

interface Props {
  favoriteIps: string[];
  likedGachaIds: string[];
  onBack: () => void;
}

export function Register({ favoriteIps, likedGachaIds, onBack }: Props) {
  const router = useRouter();
  const [name, setName]         = useState('');
  const [handle, setHandle]     = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  // @を除いた英数字・アンダースコアのみ許可
  const handleInput = (v: string) => setHandle(v.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: signUpError } = await authClient.signUp.email({ name, email, password });
    if (signUpError) {
      setError('登録に失敗しました。もう一度お試しください。');
      setLoading(false);
      return;
    }

    const res = await fetch('/api/profile/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ favoriteIps, likedGachaIds, handle: handle || null }),
    });

    if (res.status === 409) {
      setError('このアカウントIDはすでに使われています。別のIDを試してください。');
      setLoading(false);
      return;
    }

    router.push('/home');
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#FFFEEF] px-6 pt-12 pb-8">
      <button onClick={onBack} className="self-start mb-6 w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#F0ECD8' }}>
        <ArrowLeft size={18} color="#555" />
      </button>
      <h2 className="text-2xl font-black text-[#111] mb-2">アカウントを作成</h2>
      <p className="text-[#888] text-[13px] mb-8">あと少しで完了です</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-[12px] font-bold text-[#888] mb-1 block">ユーザー名</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例：たろう"
            required
            className="w-full px-4 py-3 rounded-xl text-[15px] outline-none"
            style={{ background: 'white', border: '1.5px solid #EDE9D8' }}
          />
        </div>

        <div>
          <label className="text-[12px] font-bold text-[#888] mb-1 block">
            アカウントID <span className="font-normal text-[#BBB]">（任意）</span>
          </label>
          <div className="flex items-center rounded-xl overflow-hidden"
            style={{ background: 'white', border: '1.5px solid #EDE9D8' }}>
            <span className="pl-4 pr-1 text-[15px] font-bold text-[#BBB]">@</span>
            <input
              type="text"
              value={handle}
              onChange={(e) => handleInput(e.target.value)}
              placeholder="英数字・アンダースコアのみ"
              maxLength={30}
              className="flex-1 px-2 py-3 text-[15px] outline-none bg-transparent"
            />
          </div>
          <p className="text-[11px] text-[#BBB] mt-1">
            空欄の場合はランダムなIDが設定されます
          </p>
        </div>

        <div>
          <label className="text-[12px] font-bold text-[#888] mb-1 block">メールアドレス</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@email.com"
            required
            className="w-full px-4 py-3 rounded-xl text-[15px] outline-none"
            style={{ background: 'white', border: '1.5px solid #EDE9D8' }}
          />
        </div>

        <div>
          <label className="text-[12px] font-bold text-[#888] mb-1 block">パスワード</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="8文字以上"
            required
            minLength={8}
            className="w-full px-4 py-3 rounded-xl text-[15px] outline-none"
            style={{ background: 'white', border: '1.5px solid #EDE9D8' }}
          />
        </div>

        {error && <p className="text-red-500 text-[13px]">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-4 w-full py-4 rounded-2xl font-black text-white text-[16px]"
          style={{ background: '#F2B800', opacity: loading ? 0.6 : 1 }}
        >
          {loading ? '登録中...' : 'はじめる'}
        </button>
      </form>
    </div>
  );
}
