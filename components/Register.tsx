'use client';

import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Camera } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { PasswordPolicyHint } from '@/components/PasswordPolicyHint';
import { isPasswordPolicyValid, validatePasswordPolicy } from '@/lib/passwordPolicy';
import { avatarColor } from '@/components/ui/Avatar';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Props {
  likedGachaIds: string[];
  onBack: () => void;
}

// アカウントID（handle）の形式: 英数字・アンダースコア 1〜30文字
const HANDLE_RE = /^[a-z0-9_]{1,30}$/;
type HandleStatus = 'idle' | 'checking' | 'ok' | 'taken' | 'invalid';

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
  const [emailTaken, setEmailTaken] = useState(false);
  const [handleStatus, setHandleStatus] = useState<HandleStatus>('idle');
  const fileRef = useRef<HTMLInputElement>(null);
  const signedUpRef   = useRef(false);                                  // signUp 成功済みフラグ（再実行防止）
  const handleDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestHandleRef = useRef('');                                   // 最新入力（デバウンス応答の陳腐化検知）

  useEffect(() => () => { if (handleDebounce.current) clearTimeout(handleDebounce.current); }, []);

  // @を除いた英数字・アンダースコアのみ許可。入力中に空き確認をデバウンス実行。
  const handleInput = (v: string) => {
    const next = v.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
    setHandle(next);
    latestHandleRef.current = next;
    if (handleDebounce.current) clearTimeout(handleDebounce.current);
    if (!next)                 { setHandleStatus('idle');    return; }
    if (!HANDLE_RE.test(next)) { setHandleStatus('invalid'); return; }
    setHandleStatus('checking');
    handleDebounce.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/profile/handle-available?handle=${encodeURIComponent(next)}`);
        const d = await r.json();
        if (latestHandleRef.current !== next) return;                   // 応答到着時に入力が変わっていたら破棄
        setHandleStatus(d.available ? 'ok' : 'taken');
      } catch {
        if (latestHandleRef.current === next) setHandleStatus('idle');
      }
    }, 400);
  };

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
    setError('');
    setEmailTaken(false);
    setLoading(true);

    const trimmedHandle = handle.trim();

    // ⑥ handle の pre-flight: signUp の前に形式＋空きを確認し、不正/重複なら User を作らない
    if (trimmedHandle) {
      if (!HANDLE_RE.test(trimmedHandle)) {
        setError('アカウントIDは英数字・アンダースコア（1〜30文字）で入力してください。');
        setLoading(false);
        return;
      }
      try {
        const r = await fetch(`/api/profile/handle-available?handle=${encodeURIComponent(trimmedHandle)}`);
        const d = await r.json();
        if (!r.ok || !d.available) {
          setError('このアカウントIDはすでに使われています。別のIDを試してください。');
          setLoading(false);
          return;
        }
      } catch {
        setError('通信エラーが発生しました。もう一度お試しください。');
        setLoading(false);
        return;
      }
    }

    const policyError = validatePasswordPolicy(password);
    if (policyError) {
      setError(policyError);
      setLoading(false);
      return;
    }

    // signUp（既に成功済みなら再実行しない＝二重作成防止）
    if (!signedUpRef.current) {
      const { error: signUpError } = await authClient.signUp.email({ name, email, password });
      if (signUpError) {
        // ③ メール重複を判別して専用文言＋ログイン導線を出す
        const dup = signUpError.code === 'USER_ALREADY_EXISTS'
          || signUpError.status === 422
          || /exist|already/i.test(signUpError.message ?? '');
        if (dup) {
          setEmailTaken(true);
          setError('このメールアドレスは既に登録されています。');
        } else {
          setError('登録に失敗しました。もう一度お試しください。');
        }
        setLoading(false);
        return;
      }
      signedUpRef.current = true;
    }

    // プロフィール作成（失敗を握りつぶさずハンドリング）
    try {
      const res = await fetch('/api/profile/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ likedGachaIds, handle: trimmedHandle || null, avatarUrl }),
      });
      if (res.status === 409) {
        setError('このアカウントIDはすでに使われています。別のIDを試してください。');
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setError('プロフィールの作成に失敗しました。もう一度お試しください。');
        setLoading(false);
        return;
      }
    } catch {
      setError('通信エラーが発生しました。もう一度お試しください。');
      setLoading(false);
      return;
    }

    router.push('/home');
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-screen bg-[#FFFFFF]">
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
            <span className="absolute flex items-center justify-center" style={{ bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, background: '#F2B800', border: '2.5px solid #FFFFFF' }}>
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
          {handleStatus === 'checking' ? (
            <p className="text-[11px] mt-1" style={{ color: '#AAA' }}>確認中…</p>
          ) : handleStatus === 'ok' ? (
            <p className="text-[11px] mt-1" style={{ color: '#4CAF50' }}>このIDは使えます</p>
          ) : handleStatus === 'taken' ? (
            <p className="text-[11px] mt-1" style={{ color: '#E5484D' }}>このIDはすでに使われています</p>
          ) : handleStatus === 'invalid' ? (
            <p className="text-[11px] mt-1" style={{ color: '#E5484D' }}>英数字・アンダースコアのみ（1〜30文字）</p>
          ) : (
            <p className="text-[11px] text-[#BBB] mt-1">空欄の場合はランダムなIDが設定されます</p>
          )}
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
            placeholder="パスワード"
            required
            className="w-full px-4 py-3 rounded-xl text-[15px] outline-none"
            style={{ background: 'white', border: '1.5px solid #EDE9D8' }}
          />
          <PasswordPolicyHint className="text-[11px] mt-1" />
        </div>

        {error && (
          <div className="text-[13px]">
            <p className="text-red-500">{error}</p>
            {emailTaken && (
              <Link href="/login" className="inline-block mt-1 font-bold underline underline-offset-2" style={{ color: '#F2B800' }}>
                ログインする
              </Link>
            )}
          </div>
        )}
        </div>
      </div>

      {/* 固定フッター: はじめる */}
      <div
        className="flex-shrink-0 px-6 pt-4"
        style={{ background: '#FFFFFF', borderTop: '1.5px solid #EDE9D8', paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      >
        <button
          type="submit"
          disabled={loading || handleStatus === 'taken' || handleStatus === 'invalid' || !isPasswordPolicyValid(password)}
          className="w-full py-4 rounded-2xl font-black text-white text-[16px]"
          style={{ background: '#F2B800', opacity: (loading || handleStatus === 'taken' || handleStatus === 'invalid' || !isPasswordPolicyValid(password)) ? 0.6 : 1 }}
        >
          {loading ? '登録中...' : 'はじめる'}
        </button>
      </div>
    </form>
  );
}
