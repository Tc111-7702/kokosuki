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
    <div className="relative px-4 py-1.5 lg:py-2">
      <div
        className="flex items-center gap-2 px-3 py-1.5 lg:py-2.5 rounded-2xl"
        style={{ background: '#F5F3ED' }}
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
          className="flex-1 bg-transparent border-none outline-none text-xs lg:text-sm text-gray-800"
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
          <div className="px-3 py-1 lg:py-1.5 text-[10px] lg:text-xs font-bold text-gray-400 bg-gray-50 border-b border-gray-100">ガチャ・IP</div>
          {suggestions.map((s, i) => (
            <button
              key={i}
              className={'w-full flex items-center justify-between px-3 py-2 lg:py-2.5 active:bg-amber-50 text-left ' + (i < suggestions.length - 1 ? 'border-b border-gray-100' : '')}
              onMouseDown={e => { e.preventDefault(); navigateBySuggestion(s); }}
            >
              <span className="text-xs lg:text-sm font-medium text-gray-800 min-w-0 pr-2">{s.label}</span>
              {s.type === 'genre' ? (
                <span className="text-[9px] lg:text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 bg-blue-100 text-blue-700">IP</span>
              ) : s.imageUrl ? (
                <img src={s.imageUrl} alt={s.label}
                  className="w-6 h-6 lg:w-7 lg:h-7 rounded-md object-cover flex-shrink-0"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              ) : null}
            </button>
          ))}
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
