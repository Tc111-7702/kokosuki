'use client';

import { useEffect, useRef, useState } from 'react';
import { User, Camera } from 'lucide-react';
import { SettingsSheet } from '@/components/settings/SettingsSheet';

interface FavoriteGacha {
  id: string;
  ipName: string;
}

export function ProfileSettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [favoriteIps, setFavoriteIps] = useState<string[]>([]);
  const [ipCandidates, setIpCandidates] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // 開いたときに最新のプロフィールを取得
  useEffect(() => {
    if (!open) return;
    setError(null);
    fetch('/api/mypage/summary')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setName(d.name ?? '');
        setHandle(d.handle ?? '');
        setBio(d.bio ?? '');
        setAvatarUrl(d.avatarUrl ?? null);
        setFavoriteIps(d.favoriteIps ?? []);
      })
      .finally(() => setLoaded(true));

    fetch('/api/gacha/favorites')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const gachas: FavoriteGacha[] = d?.gachas ?? [];
        setIpCandidates([...new Set(gachas.map((g) => g.ipName).filter(Boolean))]);
      })
      .catch(() => {});
  }, [open]);

  const toggleIp = (ip: string) =>
    setFavoriteIps((prev) => (prev.includes(ip) ? prev.filter((i) => i !== ip) : prev.length < 10 ? [...prev, ip] : prev));

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? 'アップロードに失敗しました');
      setAvatarUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'アップロードに失敗しました');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/profile/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          ...(handle.trim() ? { handle: handle.trim() } : {}),
          bio,
          ...(avatarUrl ? { avatarUrl } : {}),
          favoriteIps,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? '保存に失敗しました');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const saveDisabled = !loaded || saving || !name.trim();

  return (
    <SettingsSheet
      open={open}
      onClose={onClose}
      title="プロフィール設定"
      headerRight={
        <button
          onClick={handleSave}
          disabled={saveDisabled}
          className="px-4 py-1.5 rounded-full text-[13px] font-bold"
          style={{ background: saveDisabled ? '#F0F0F0' : '#F2B800', color: saveDisabled ? '#BBB' : 'white' }}
        >
          {saving ? '保存中…' : '保存'}
        </button>
      }
    >
      <div className="px-5 py-6">
        {/* アイコン */}
        <div className="flex flex-col items-center">
          <button onClick={() => fileRef.current?.click()} disabled={uploading} className="relative active:opacity-70">
            <div className="flex items-center justify-center overflow-hidden" style={{ width: 88, height: 88, borderRadius: 44, background: '#F0ECD8' }}>
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <User size={40} color="#B0AC98" />
              )}
            </div>
            <span className="absolute flex items-center justify-center" style={{ bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, background: '#F2B800', border: '2.5px solid #FFFEEF' }}>
              <Camera size={14} color="white" />
            </span>
          </button>
          {uploading && <p className="mt-2 text-[11px]" style={{ color: '#AAA' }}>アップロード中…</p>}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>

        {/* 名前 */}
        <Field label="名前">
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={30} placeholder="表示される名前"
            className="w-full px-4 py-3 rounded-2xl text-[14px]"
            style={{ background: 'white', border: '1.5px solid #EDE9D8', color: '#111', outline: 'none' }} />
        </Field>

        {/* ユーザーID */}
        <Field label="ユーザーID" hint="3〜20文字の半角英数字と_">
          <div className="flex items-center gap-1 px-4 py-3 rounded-2xl" style={{ background: 'white', border: '1.5px solid #EDE9D8' }}>
            <span className="text-[14px]" style={{ color: '#AAA' }}>@</span>
            <input value={handle} onChange={(e) => setHandle(e.target.value)} maxLength={20} placeholder="user_id"
              className="flex-1 text-[14px]" style={{ color: '#111', outline: 'none', background: 'transparent' }} />
          </div>
        </Field>

        {/* 一言 */}
        <Field label="一言">
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={200} rows={3} placeholder="好きなガチャ・推しなど自由に"
            className="w-full px-4 py-3 rounded-2xl text-[14px] resize-none"
            style={{ background: 'white', border: '1.5px solid #EDE9D8', color: '#111', outline: 'none' }} />
        </Field>

        {/* 好きIP */}
        <Field label="好きIP" hint="お気に入りガチャのIPから選べます（10件まで）">
          {ipCandidates.length === 0 && favoriteIps.length === 0 ? (
            <p className="text-[12px] px-1" style={{ color: '#AAA' }}>お気に入りのガチャを登録すると、ここにIPが並びます</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {[...new Set([...favoriteIps, ...ipCandidates])].map((ip) => {
                const selected = favoriteIps.includes(ip);
                return (
                  <button key={ip} onClick={() => toggleIp(ip)}
                    className="text-[12px] font-bold px-3 py-1.5 rounded-full"
                    style={{
                      background: selected ? '#FFF8D0' : 'white',
                      color: selected ? '#B45309' : '#888',
                      border: selected ? '1.5px solid #F2B800' : '1.5px solid #EDE9D8',
                    }}>
                    {ip}
                  </button>
                );
              })}
            </div>
          )}
        </Field>

        {error && <p className="mt-4 text-[12px] font-bold" style={{ color: '#DC2626' }}>{error}</p>}
      </div>
    </SettingsSheet>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <div className="flex items-baseline gap-2 mb-2">
        <p className="text-[13px] font-bold" style={{ color: '#555' }}>{label}</p>
        {hint && <p className="text-[11px]" style={{ color: '#BBB' }}>{hint}</p>}
      </div>
      {children}
    </div>
  );
}
