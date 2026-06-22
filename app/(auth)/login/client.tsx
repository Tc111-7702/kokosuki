'use client';

import { useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginClient() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: signInError } = await authClient.signIn.email({ email, password });

    if (signInError) {
      setError('メールアドレスまたはパスワードが正しくありません');
      setLoading(false);
      return;
    }

    router.push('/home');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#FFFEEF] px-6">
      <h1 className="text-3xl font-black text-[#F2B800] mb-2" style={{ letterSpacing: '-0.5px' }}>Mikke！</h1>
      <p className="text-[#AAA] text-[13px] mb-10">ログインして続ける</p>

      <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col gap-4">
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
            placeholder="パスワード"
            required
            className="w-full px-4 py-3 rounded-xl text-[15px] outline-none"
            style={{ background: 'white', border: '1.5px solid #EDE9D8' }}
          />
        </div>

        {error && <p className="text-red-500 text-[13px]">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 w-full py-4 rounded-2xl font-black text-white text-[16px]"
          style={{ background: '#F2B800', opacity: loading ? 0.6 : 1 }}
        >
          {loading ? 'ログイン中...' : 'ログイン'}
        </button>
      </form>

      <p className="mt-6 text-[13px] text-[#AAA]">
        アカウントをお持ちでない方は
        <Link href="/signup" className="text-[#F2B800] font-bold ml-1">新規登録</Link>
      </p>
    </div>
  );
}
