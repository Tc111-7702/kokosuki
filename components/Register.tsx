'use client';

import { useState, useRef } from 'react';
import { ArrowLeft, Camera } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { avatarColor } from '@/components/ui/Avatar';
import { useRouter } from 'next/navigation';

interface Props {
  likedGachaIds: string[];
  onBack: () => void;
}

export function Register({ likedGachaIds, onBack }: Props) {
  const router = useRouter();
  const [name, setName]         = useState('');
  const [handle, setHandle]     = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // @を除いた英数字・アンダースコアのみ許可
  const handleInput = (v: string) => setHandle(v.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase());

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (res.ok && data.url) setAvatarUrl(data.url);
    } catch {
      /* silent */
    } finally {
      setUploading(false);
    }
  };

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
      body: JSON.stringify({ likedGachaIds, handle: handle || null, avatarUrl }),
    });

    if (res.status === 409) {
      setError('このアカウントIDはすでに使われています。別のIDを試してください。');
      setLoading(false);
      return;
    }

    router.push('/home');
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-screen bg-[#FFFEEF]">
      <div className="flex-1 overflow-y-auto px-6 pt-12 pb-4">
        <button type="button" onClick={onBack} className="mb-6 w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#F0ECD8' }}>
          <ArrowLeft size={18} color="#555" />
        </button>
        <h2 className="text-2xl font-black text-[#111] mb-2">アカウントを作成</h2>
        <p className="text-[#888] text-[13px] mb-8">あと少しで完了です</p>

        <div className="flex flex-col gap-4">
        {/* アイコン（任意） */}
        <div className="flex flex-col items-center mb-1">
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="relative active:opacity-70">
            <div
              className="flex items-center justify-center overflow-hidden text-white font-bold"
              style={{ width: 88, height: 88, borderRadius: 44, background: avatarUrl ? '#F0ECD8' : avatarColor(name || '?'), fontSize: 36 }}
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                (name || '?').charAt(0)
              )}
            </div>
            <span className="absolute flex items-center justify-center" style={{ bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, background: '#F2B800', border: '2.5px solid #FFFEEF' }}>
              <Camera size={14} color="white" />
            </span>
          </button>
          <p className="text-[11px] mt-2" style={{ color: '#AAA' }}>アイコン（任意）</p>
          {uploading && <p className="text-[11px]" style={{ color: '#AAA' }}>アップロード中…</p>}
          {avatarUrl && !uploading && (
            <button type="button" onClick={() => setAvatarUrl(null)} className="mt-1 text-[12px] font-bold active:opacity-60" style={{ color: '#E5484D' }}>
              画像を削除
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>

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
        </div>
      </div>

      {/* 固定フッター: はじめる */}
      <div
        className="flex-shrink-0 px-6 pt-4"
        style={{ background: '#FFFEEF', borderTop: '1.5px solid #EDE9D8', paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      >
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 rounded-2xl font-black text-white text-[16px]"
          style={{ background: '#F2B800', opacity: loading ? 0.6 : 1 }}
        >
          {loading ? '登録中...' : 'はじめる'}
        </button>
      </div>
    </form>
  );
}
