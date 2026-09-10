'use client';

import { useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, X } from 'lucide-react';

interface Suggestion {
  id?: string;
  label: string;
  type: 'gacha' | 'genre';
  imageUrl?: string | null;
}

interface HomeSearchBarProps {
  placeholder?: string;
  wrapperClassName?: string;
  /** フォーカス時・未入力時に表示する候補（店舗の人気IP等） */
  focusSuggestions?: readonly Suggestion[];
  /** 店舗ページ等: このID集合に含まれる候補・結果のみ */
  scopeGachaIds?: readonly string[];
  /** scopeGachaIds 利用時: ガチャID → ipName */
  gachaIpById?: ReadonlyMap<string, string>;
  /** scopeGachaIds 利用時: 一覧を絞り込む（ページ遷移しない） */
  onApplyFilter?: (gachaIds: string[], label: string) => void;
  /** 検索絞り込み中（解除ボタン表示） */
  filterActive?: boolean;
  /** 検索絞り込み解除（× とは別） */
  onDismissFilter?: () => void;
}

function filterSuggestionsForScope(
  suggestions: Suggestion[],
  scopeSet: Set<string>,
  gachaIpById: ReadonlyMap<string, string>,
): Suggestion[] {
  const storeIps = new Set<string>();
  for (const id of scopeSet) {
    const ip = gachaIpById.get(id);
    if (ip) storeIps.add(ip);
  }
  return suggestions.filter(s => {
    if (s.type === 'gacha') return s.id != null && scopeSet.has(s.id);
    if (s.type === 'genre') return storeIps.has(s.label);
    return false;
  });
}

function intersectScope(ids: string[], scopeSet: Set<string>): string[] {
  return ids.filter(id => scopeSet.has(id));
}

export function HomeSearchBar({
  placeholder = '気になっているガチャをさがす',
  wrapperClassName,
  focusSuggestions,
  scopeGachaIds,
  gachaIpById,
  onApplyFilter,
  filterActive = false,
  onDismissFilter,
}: HomeSearchBarProps) {
  const router = useRouter();
  const scopeSet = useMemo(
    () => (scopeGachaIds ? new Set(scopeGachaIds) : null),
    [scopeGachaIds],
  );
  const isScopeMode = scopeSet != null && onApplyFilter != null;

  const [value, setValue] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<Suggestion[]>([]);
  const [focused, setFocused] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const suggestions = useMemo(() => {
    if (focused && !value.trim()) {
      return focusSuggestions?.length ? [...focusSuggestions] : [];
    }
    return searchSuggestions;
  }, [focused, value, focusSuggestions, searchSuggestions]);

  const applyFilter = (gachaIds: string[], label: string) => {
    if (!scopeSet || !onApplyFilter) return;
    const scoped = intersectScope(gachaIds, scopeSet);
    onApplyFilter(scoped, label);
  };

  const fetchSuggestions = (v: string) => {
    if (timer.current) clearTimeout(timer.current);
    if (!v.trim()) { setSearchSuggestions([]); return; }
    timer.current = setTimeout(async () => {
      try {
        const data = await fetch(`/api/gacha/search?q=${encodeURIComponent(v)}&suggest=1`).then(r => r.json());
        let items: Suggestion[] = data.suggestions ?? [];
        if (isScopeMode && scopeSet && gachaIpById) {
          items = filterSuggestionsForScope(items, scopeSet, gachaIpById);
        }
        setSearchSuggestions(items);
      } catch {}
    }, 150);
  };

  const resolveBySuggestion = (s: Suggestion) => {
    setValue(s.label);
    setSearchSuggestions([]);
    if (isScopeMode && scopeSet && gachaIpById) {
      if (s.type === 'genre') {
        const ids = [...scopeSet].filter(id => gachaIpById.get(id) === s.label);
        applyFilter(ids, s.label);
      } else if (s.id && scopeSet.has(s.id)) {
        applyFilter([s.id], s.label);
      } else {
        resolveByQuery(s.label);
      }
      return;
    }
    if (s.type === 'genre') {
      router.push(`/home/search?ipName=${encodeURIComponent(s.label)}&label=${encodeURIComponent(s.label)}`);
    } else if (s.id) {
      router.push(`/gacha/${s.id}`);
    } else {
      resolveByQuery(s.label);
    }
  };

  const resolveByQuery = async (q: string) => {
    if (!q.trim() || navigating) return;
    setSearchSuggestions([]);
    setNavigating(true);
    try {
      const data = await fetch(`/api/gacha/search?q=${encodeURIComponent(q)}`).then(r => r.json());
      if (isScopeMode && scopeSet && onApplyFilter) {
        let ids: string[] = [];
        let label = q.trim();
        if (Array.isArray(data.gachaIds) && data.gachaIds.length > 0) {
          ids = data.gachaIds;
          label = data.label ?? data.ipName ?? label;
        }
        applyFilter(ids, label);
      } else if (data.type === 'gacha' && data.gachaIds?.length > 0) {
        router.push(`/gacha/${data.gachaIds[0]}`);
      } else if (data.type === 'genre' && data.ipName) {
        const lbl = data.label ?? data.ipName;
        router.push(`/home/search?ipName=${encodeURIComponent(data.ipName)}&label=${encodeURIComponent(lbl)}`);
      }
    } catch {}
    setNavigating(false);
  };

  const clearInput = () => {
    setValue('');
    setSearchSuggestions([]);
  };

  const dismissFilter = () => {
    setValue('');
    setSearchSuggestions([]);
    onDismissFilter?.();
  };

  const showDrop = focused && suggestions.length > 0;

  return (
    <div className={`relative px-4 py-1.5 lg:py-2 ${wrapperClassName ?? ''}`}>
      <div className="flex items-center gap-1.5">
        {filterActive && onDismissFilter && (
          <button
            type="button"
            onClick={dismissFilter}
            aria-label="検索を解除"
            style={{
              width: 32, height: 32, borderRadius: 16, border: 'none', flexShrink: 0,
              background: 'rgba(0,0,0,0.07)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <ArrowLeft size={16} color="#555" />
          </button>
        )}
        <div className="relative flex-1 min-w-0">
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
              onKeyDown={e => e.key === 'Enter' && resolveByQuery(value)}
              placeholder={placeholder}
              disabled={navigating}
              className="flex-1 bg-transparent border-none outline-none text-xs lg:text-sm text-gray-800 min-w-0"
            />
            {value && (
              <button
                type="button"
                onMouseDown={e => { e.preventDefault(); clearInput(); }}
                aria-label="入力をクリア"
                style={{ padding: 0, background: 'none', border: 'none', cursor: 'pointer', lineHeight: 0, flexShrink: 0 }}
              >
                <X size={13} color="#bbb" />
              </button>
            )}
          </div>
          {showDrop && (
            <div
              className="absolute z-50 rounded-xl overflow-hidden"
              style={{ top: 'calc(100% - 4px)', left: 0, right: 0, background: 'white', boxShadow: '0 6px 24px rgba(0,0,0,0.14)', border: '1px solid #f0f0f0', maxHeight: 280, overflowY: 'auto' }}
            >
              <div className="px-3 py-1 lg:py-1.5 text-[10px] lg:text-xs font-bold text-gray-400 bg-gray-50 border-b border-gray-100">ガチャ・IP</div>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  className={'w-full flex items-center justify-between px-3 py-2 lg:py-2.5 active:bg-amber-50 text-left ' + (i < suggestions.length - 1 ? 'border-b border-gray-100' : '')}
                  onMouseDown={e => { e.preventDefault(); resolveBySuggestion(s); }}
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
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
