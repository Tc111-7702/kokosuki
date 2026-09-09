'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';

interface Suggestion {
  id?: string;              // gacha候補はガチャIDを持つ（直接遷移用）
  label: string;
  type: 'gacha' | 'genre';
  imageUrl?: string | null;
}

interface HomeSearchBarProps {
  placeholder?: string;
}

export function HomeSearchBar({ placeholder = '気になっているガチャをさがす' }: HomeSearchBarProps) {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [focused, setFocused] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = (v: string) => {
    if (timer.current) clearTimeout(timer.current);
    if (!v.trim()) { setSuggestions([]); return; }
    timer.current = setTimeout(async () => {
      try {
        const data = await fetch(`/api/gacha/search?q=${encodeURIComponent(v)}&suggest=1`).then(r => r.json());
        setSuggestions(data.suggestions ?? []);
      } catch {}
    }, 150);
  };

  const navigateBySuggestion = (s: Suggestion) => {
    setValue(s.label);
    setSuggestions([]);
    if (s.type === 'genre') {
      router.push(`/home/search?ipName=${encodeURIComponent(s.label)}&label=${encodeURIComponent(s.label)}`);
    } else if (s.id) {
      router.push(`/gacha/${s.id}`);   // gacha候補は id を持つので直接遷移（2回目のAPI解決が不要）
    } else {
      navigateByQuery(s.label);        // 保険: id が無い場合のみ従来の解決経路
    }
  };

  const navigateByQuery = async (q: string) => {
    if (!q.trim() || navigating) return;
    setSuggestions([]);
    setNavigating(true);
    try {
      const data = await fetch(`/api/gacha/search?q=${encodeURIComponent(q)}`).then(r => r.json());
      if (data.type === 'gacha' && data.gachaIds?.length > 0) {
        router.push(`/gacha/${data.gachaIds[0]}`);
      } else if (data.type === 'genre' && data.ipName) {
        const lbl = data.label ?? data.ipName;
        router.push(`/home/search?ipName=${encodeURIComponent(data.ipName)}&label=${encodeURIComponent(lbl)}`);
      }
    } catch {}
    setNavigating(false);
  };

  const showDrop = focused && suggestions.length > 0;

  return (
    <div className="relative px-4 py-2">
      <div
        className="flex items-center gap-2 px-3 py-2.5 rounded-2xl"
        style={{
          background: '#F5F3ED',
          border: focused ? '1.5px solid #F2B800' : '1.5px solid transparent',
          transition: 'border-color 0.15s',
        }}
      >
        <input
          type="text"
          value={value}
          onChange={e => { setValue(e.target.value); fetchSuggestions(e.target.value); }}
          onFocus={() => { setFocused(true); fetchSuggestions(value); }}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          onKeyDown={e => e.key === 'Enter' && navigateByQuery(value)}
          placeholder={placeholder}
          disabled={navigating}
          style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 13, width: '100%', color: '#333' }}
        />
        {value && (
          <button
            onMouseDown={e => { e.preventDefault(); setValue(''); setSuggestions([]); }}
            style={{ padding: 0, background: 'none', border: 'none', cursor: 'pointer', lineHeight: 0 }}
          >
            <X size={13} color="#bbb" />
          </button>
        )}
      </div>
      {showDrop && (
        <div
          className="absolute z-50 rounded-xl overflow-hidden"
          style={{ top: 'calc(100% - 4px)', left: 16, right: 16, background: 'white', boxShadow: '0 6px 24px rgba(0,0,0,0.14)', border: '1px solid #f0f0f0', maxHeight: 280, overflowY: 'auto' }}
        >
          {suggestions.map((s, i) => (
            <button
              key={i}
              className="w-full text-left px-3 py-2.5 active:bg-amber-50"
              style={{ display: 'block', borderBottom: i < suggestions.length - 1 ? '1px solid #f5f5f5' : 'none' }}
              onMouseDown={e => { e.preventDefault(); navigateBySuggestion(s); }}
            >
              <div className="flex items-center gap-2">
                {s.type === 'gacha' && s.imageUrl ? (
                  <img src={s.imageUrl} alt={s.label}
                    style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <div style={{ width: 28, height: 28, flexShrink: 0 }} />
                )}
                <span style={{ fontSize: 13, fontWeight: 600, color: '#222', flex: 1, textAlign: 'left' }}>{s.label}</span>
                {s.type === 'genre' && (
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 10, flexShrink: 0,
                    background: '#e0f2fe', color: '#0369a1',
                  }}>ジャンル</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
