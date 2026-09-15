'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ChevronLeft, Search, X } from 'lucide-react';
import { SignupFavoriteStepHeader } from '@/components/SignupFavoriteStepHeader';
import { ipGradient } from '@/components/SpotGachaCard';
import { useAuthPrimaryButtonStyle } from '@/lib/useAuthPrimaryButtonStyle';
import { getThemeSnapshot, subscribeTheme } from '@/lib/appThemeStore';

type SignupIpItem = {
  ipName: string;
  imageUrl: string | null;
};

const IP_SEARCH_RESULT_LIMIT = 9;

interface Props {
  onBack: () => void;
  onContinue: (selectedIpNames: string[]) => void;
}

function SignupIpCircle({
  item,
  selected,
  onToggle,
}: {
  item: SignupIpItem;
  selected: boolean;
  onToggle: () => void;
}) {
  const [from, to] = ipGradient(item.ipName);

  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex flex-col items-center gap-1 max-md:gap-0.5 md:gap-2 active:opacity-80 w-full"
      aria-pressed={selected}
    >
      <span
        className="flex items-center justify-center rounded-full overflow-hidden w-[60px] h-[60px] md:w-[72px] md:h-[72px]"
        style={{
          border: selected ? '2.5px solid #F2B800' : '1.5px solid #EDE9D8',
          background: item.imageUrl ? '#fff' : `linear-gradient(135deg, ${from}, ${to})`,
        }}
      >
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : null}
      </span>
      <span
        className="text-[9px] md:text-[11px] font-bold text-center leading-tight w-full break-words"
        style={{ color: '#333' }}
      >
        {item.ipName}
      </span>
    </button>
  );
}

/** 新規登録: お気に入りガチャ登録の最初のステップ（IP選択） */
export function SignupIpSelectStep({ onBack, onContinue }: Props) {
  const [defaultIps, setDefaultIps] = useState<SignupIpItem[]>([]);
  const [displayedIps, setDisplayedIps] = useState<SignupIpItem[]>([]);
  const [selectedIps, setSelectedIps] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/gacha/signup-popular-ips?limit=9');
        const data = await res.json().catch(() => null);
        const ips: SignupIpItem[] = data?.ips ?? [];
        if (!cancelled) {
          setDefaultIps(ips);
          setDisplayedIps(ips);
        }
      } catch {
        if (!cancelled) {
          setDefaultIps([]);
          setDisplayedIps([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const fetchIconsForIpNames = useCallback(async (ipNames: string[]) => {
    if (ipNames.length === 0) return [] as SignupIpItem[];
    const params = new URLSearchParams();
    ipNames.forEach((name) => params.append('ipName', name));
    const res = await fetch(`/api/gacha/signup-popular-ips?${params.toString()}`);
    const data = await res.json().catch(() => null);
    return (data?.ips ?? []) as SignupIpItem[];
  }, []);

  const runSearch = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setDisplayedIps(defaultIps);
      return;
    }

    setSearching(true);
    try {
      const res = await fetch(`/api/gacha/search?q=${encodeURIComponent(trimmed)}&suggest=1`);
      const data = await res.json().catch(() => null);
      const ipNames = [...new Set(
        (data?.suggestions ?? [])
          .filter((s: { type?: string }) => s.type === 'genre')
          .map((s: { label: string }) => s.label.trim())
          .filter(Boolean),
      )].slice(0, IP_SEARCH_RESULT_LIMIT) as string[];

      if (ipNames.length === 0) {
        setDisplayedIps([]);
        return;
      }

      const ips = await fetchIconsForIpNames(ipNames);
      const order = new Map(ipNames.map((name, i) => [name.toLowerCase(), i]));
      ips.sort((a, b) => (order.get(a.ipName.toLowerCase()) ?? 999) - (order.get(b.ipName.toLowerCase()) ?? 999));
      setDisplayedIps(ips);
    } catch {
      setDisplayedIps([]);
    } finally {
      setSearching(false);
    }
  }, [defaultIps, fetchIconsForIpNames]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { void runSearch(value); }, 150);
  };

  const toggleIp = (ipName: string) => {
    setSelectedIps((prev) => {
      const next = new Set(prev);
      if (next.has(ipName)) next.delete(ipName);
      else next.add(ipName);
      return next;
    });
  };

  const selectedCount = selectedIps.size;
  const canProceed = selectedCount > 0;
  const submitStyle = useAuthPrimaryButtonStyle(canProceed);
  const isDark = useSyncExternalStore(
    subscribeTheme,
    () => getThemeSnapshot() === 'dark',
    () => false,
  );
  const clearBtnBg = isDark ? '#2a2a2a' : '#d1d5db';
  const clearBtnIcon = isDark ? '#a3a3a3' : '#888888';
  const backIconColor = isDark ? '#ffffff' : '#111111';

  return (
    <div className="login-email-step signup-app-font font-sans flex flex-col min-h-[100dvh] max-md:h-[100dvh] max-md:overflow-hidden px-6 pt-4 max-md:pt-2 pb-8 max-md:pb-5 md:pb-10 bg-white">
      <div className="w-full max-w-[360px] md:max-w-[520px] mx-auto flex flex-col flex-1 min-h-0 max-md:overflow-hidden md:justify-center md:py-4">
        <button
          type="button"
          onClick={onBack}
          className="self-start -ml-1 p-1 active:opacity-60 disabled:opacity-50 md:hidden shrink-0"
          aria-label="戻る"
        >
          <ChevronLeft size={28} strokeWidth={2} color={backIconColor} />
        </button>

        <div className="flex flex-col items-center w-full flex-1 min-h-0 max-md:overflow-hidden md:flex-none max-md:-mt-1">
          <div className="w-full flex flex-col flex-1 min-h-0 max-md:overflow-hidden md:translate-y-6">
          <SignupFavoriteStepHeader title="好きなキャラクターは？" selectedCount={selectedCount} layout="ip" />

            <div className="relative w-full mt-2 md:mt-3 max-md:translate-y-4">
              <button
                type="button"
                onClick={onBack}
                className="hidden md:block absolute left-0 bottom-full -ml-1 mb-8 p-1 active:opacity-60 disabled:opacity-50"
                aria-label="戻る"
              >
                <ChevronLeft size={28} strokeWidth={2} color={backIconColor} />
              </button>
              <Search
                size={18}
                strokeWidth={2.25}
                className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: '#94a3b8' }}
              />
              <input
                type="text"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder="キャラクター・IP検索"
                className="login-email-input w-full h-[44px] md:h-[48px] rounded-2xl pl-11 pr-11 text-[13px] md:text-[14px] outline-none"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setDisplayedIps(defaultIps);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center active:opacity-60"
                  style={{ backgroundColor: clearBtnBg }}
                  aria-label="入力をクリア"
                >
                  <X size={14} color={clearBtnIcon} strokeWidth={2.5} />
                </button>
              ) : null}
            </div>

          <div className="w-full flex-1 min-h-0 max-md:overflow-hidden md:flex-none md:overflow-visible mt-3 md:mt-3 max-md:pb-2 flex flex-col justify-center md:h-[358px] md:shrink-0">
            <div className="grid grid-cols-3 gap-x-2 gap-y-2.5 md:gap-x-3 md:gap-y-5 justify-items-center content-start w-full min-h-[242px] md:min-h-[358px] md:pt-1 md:-translate-y-1">
              {loading || searching ? (
                <p className="col-span-3 text-[13px] text-center w-full" style={{ color: '#94a3b8' }}>
                  {loading ? '読み込み中…' : '検索中…'}
                </p>
              ) : displayedIps.length === 0 ? (
                <p className="col-span-3 text-[13px] text-center w-full" style={{ color: '#94a3b8' }}>
                  {query.trim() ? '該当するIPが見つかりません' : '表示できるIPがありません'}
                </p>
              ) : (
                displayedIps.map((item) => (
                  <SignupIpCircle
                    key={item.ipName}
                    item={item}
                    selected={selectedIps.has(item.ipName)}
                    onToggle={() => toggleIp(item.ipName)}
                  />
                ))
              )}
            </div>
          </div>
          </div>

          <button
            type="button"
            disabled={!canProceed}
            onClick={() => onContinue([...selectedIps])}
            style={submitStyle}
            className="login-otp-send-btn w-full h-[48px] md:h-[52px] rounded-full text-[16px] font-bold text-white active:opacity-80 disabled:cursor-not-allowed shrink-0 max-md:mt-2 md:mt-5 md:-translate-y-2"
          >
            次へ
          </button>
        </div>
      </div>
    </div>
  );
}
