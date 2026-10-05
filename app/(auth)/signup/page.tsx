'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Check, ChevronLeft, Search, SlidersHorizontal, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { SignupFavoriteStepHeader } from '@/components/SignupFavoriteStepHeader';
import { ipGradient } from '@/components/SpotGachaCard';
import { useAuthPrimaryButtonStyle } from '@/hooks/useAuthPrimaryButtonStyle';
import { getThemeSnapshot, subscribeTheme } from '@/lib/appThemeStore';
import { clearSignupGachaIds, getSignupFavorites, setSignupGachaIds, setSignupIpNames } from '@/lib/signupFavorites';

type SignupIpItem = {
  ipName: string;
  imageUrl: string | null;
};

const IP_SEARCH_RESULT_LIMIT = 9;

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
      <span className="relative inline-flex">
        <span
          className="flex items-center justify-center rounded-full overflow-hidden w-[76px] h-[76px] md:w-[72px] md:h-[72px]"
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
        {/* 選択済みを色だけに頼らず示すチェックバッジ（WCAG 1.4.1）。状態は aria-pressed で伝達済み。 */}
        {selected ? (
          <span
            className="absolute bottom-0 right-0 w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center"
            style={{ background: '#F2B800', border: '2px solid #ffffff' }}
            aria-hidden="true"
          >
            <Check size={12} color="#ffffff" strokeWidth={3} />
          </span>
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

// 新規登録: 推しIP選択（エントリ・旧 SignupIpSelectStep を直書き）。
// 再訪時はガチャ選択をクリアして最新IPへ整合させる。
export default function SignupIpSelectPage() {
  const router = useRouter();
  const onBack = () => router.push('/login');
  const onContinue = (selectedIpNames: string[]) => {
    setSignupIpNames(selectedIpNames);
    router.push('/signup/gacha');
  };
  // スキップ: IP・ガチャ両方を空配列で登録し、ガチャ選択を飛ばして intro へ。
  const onSkip = () => {
    setSignupIpNames([]);
    setSignupGachaIds([]);
    router.push('/signup/intro');
  };

  useEffect(() => {
    clearSignupGachaIds();
  }, []);

  const [defaultIps, setDefaultIps] = useState<SignupIpItem[]>([]);
  const [displayedIps, setDisplayedIps] = useState<SignupIpItem[]>([]);
  // ガチャ選択ページから戻ってきたときに選択済みIPを復元する（sessionStorage）。
  // これが無いと再訪時に選択が 0 件に見え、そのまま次へで空配列に上書きされてしまう。
  const [selectedIps, setSelectedIps] = useState<Set<string>>(
    () => new Set(getSignupFavorites()?.ipNames ?? []),
  );
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 最新の入力値（stale な検索応答を弾くために参照する）。
  const latestQueryRef = useRef('');
  // 「選択中のみ」表示モード。ON の間は検索バーを無効化して選択済みIPだけ表示する。
  const [selectedOnly, setSelectedOnly] = useState(false);
  // 画像付きチップを「選択中のみ」で出せるよう、一度でも表示したIPの情報を控えておく。
  const knownIpsRef = useRef<Map<string, SignupIpItem>>(new Map());

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

  // 一度でも表示したIP（人気/検索結果）を控える。選択中のみ表示でも画像を出せるようにする。
  useEffect(() => {
    for (const it of defaultIps) knownIpsRef.current.set(it.ipName, it);
  }, [defaultIps]);
  useEffect(() => {
    for (const it of displayedIps) knownIpsRef.current.set(it.ipName, it);
  }, [displayedIps]);

  const runSearch = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setDisplayedIps(defaultIps);
      return;
    }

    setSearching(true);
    try {
      const params = new URLSearchParams({
        q: trimmed,
        limit: String(IP_SEARCH_RESULT_LIMIT),
      });
      const res = await fetch(`/api/gacha/signup-ip-search?${params.toString()}`);
      const data = await res.json().catch(() => null);
      // 応答が届いた時点で入力が空なら、直前の検索結果で上書きせずデフォルト一覧に戻す。
      // （クリア直後に前回の検索が遅れて解決し、デフォルトに戻らない競合を防ぐ）
      if (latestQueryRef.current.trim() === '') {
        setDisplayedIps(defaultIps);
        return;
      }
      // 入力が別のクエリに変わっていたら、この結果は古いので捨てる。
      if (latestQueryRef.current.trim() !== trimmed) return;
      setDisplayedIps((data?.ips ?? []) as SignupIpItem[]);
    } catch {
      if (latestQueryRef.current.trim() === '') setDisplayedIps(defaultIps);
      else setDisplayedIps([]);
    } finally {
      setSearching(false);
    }
  }, [defaultIps]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    latestQueryRef.current = value;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { void runSearch(value); }, 150);
  };

  const toggleSelectedOnly = () => {
    setSelectedOnly((v) => {
      const next = !v;
      if (next) {
        // 検索をクリアして、解除時に通常の一覧へ戻れるようにする。
        setQuery('');
        latestQueryRef.current = '';
        if (timerRef.current) clearTimeout(timerRef.current);
        setDisplayedIps(defaultIps);
      }
      return next;
    });
  };

  const toggleIp = (ipName: string) => {
    const nextSize = selectedIps.has(ipName) ? selectedIps.size - 1 : selectedIps.size + 1;
    setSelectedIps((prev) => {
      const next = new Set(prev);
      if (next.has(ipName)) next.delete(ipName);
      else next.add(ipName);
      return next;
    });
    // 「選択中のみ」表示で最後の1件を外して0件になったら、自動的に解除して通常一覧へ戻す。
    if (selectedOnly && nextSize === 0) {
      setSelectedOnly(false);
      setDisplayedIps(defaultIps);
    }
  };

  const selectedCount = selectedIps.size;
  const canProceed = selectedCount > 0;
  const canSkip = selectedCount === 0;
  const submitStyle = useAuthPrimaryButtonStyle(canProceed);
  const skipStyle = useAuthPrimaryButtonStyle(canSkip);
  const isDark = useSyncExternalStore(
    subscribeTheme,
    () => getThemeSnapshot() === 'dark',
    () => false,
  );
  const clearBtnBg = isDark ? '#2a2a2a' : '#d1d5db';
  const clearBtnIcon = isDark ? '#a3a3a3' : '#888888';
  const backIconColor = isDark ? '#ffffff' : '#111111';

  // 「選択中のみ」表示用の一覧（控えておいた情報から画像付きで復元。無ければグラデ丸）。
  const selectedOnlyIps: SignupIpItem[] = [...selectedIps].map(
    (name) => knownIpsRef.current.get(name) ?? { ipName: name, imageUrl: null },
  );
  const gridIps = selectedOnly ? selectedOnlyIps : displayedIps;
  const showLoading = !selectedOnly && (loading || searching);

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
              {/* 検索バー右上: 「選択中のみ」トグル。マップのフィルターボタンと同じ大きめのピルUI。
                  色はそのまま（通常=黄 / 選択中のみ解除=赤）。ONで選択済みIPのみ表示。 */}
              <button
                type="button"
                onClick={toggleSelectedOnly}
                aria-pressed={selectedOnly}
                // 選択0件のときは押せない。ただし選択中のみ表示中は解除できるよう有効のままにする。
                disabled={selectedCount === 0 && !selectedOnly}
                className="absolute right-0 bottom-full mb-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] md:text-[14px] font-bold active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                style={
                  selectedOnly
                    ? { background: '#FDECEA', border: '1px solid #C4483C', color: '#C4483C' }
                    : { background: '#FFF8E1', border: '1px solid #F2B800', color: '#F2B800' }
                }
              >
                <SlidersHorizontal size={15} />
                {selectedOnly ? '選択中のみ解除' : '選択中のみ'}
              </button>
              <Search
                size={18}
                strokeWidth={2.25}
                className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: selectedOnly ? '#cbd5e1' : '#94a3b8' }}
              />
              <input
                type="text"
                aria-label="キャラクター・IP検索"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder="キャラクター・IP検索"
                disabled={selectedOnly}
                className="login-email-input w-full h-[44px] md:h-[48px] rounded-2xl pl-11 pr-11 text-[16px] md:text-[14px] outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              />
              {!selectedOnly && query ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    latestQueryRef.current = '';
                    if (timerRef.current) clearTimeout(timerRef.current);
                    setDisplayedIps(defaultIps);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center active:opacity-60"
                  style={{ backgroundColor: clearBtnBg }}
                  aria-label="入力をクリア"
                >
                  <X size={14} color={clearBtnIcon} strokeWidth={2.5} />
                </button>
              ) : null}
              {selectedOnly ? (
                <p className="absolute top-full left-0 mt-1.5 text-[11px] md:text-[12px] font-bold" style={{ color: '#C4483C' }}>
                  検索を使用するには選択中のみ解除を押してください
                </p>
              ) : null}
            </div>

          <div className="w-full flex-1 min-h-0 max-md:overflow-hidden md:flex-none md:overflow-visible mt-3 md:mt-3 max-md:pb-2 flex flex-col justify-center md:h-[358px] md:shrink-0">
            <div className="grid grid-cols-3 gap-x-2 gap-y-2.5 md:gap-x-3 md:gap-y-5 justify-items-center content-start w-full min-h-[242px] md:min-h-[358px] md:pt-1 md:-translate-y-1">
              {showLoading ? (
                <p className="col-span-3 text-[13px] text-center w-full" style={{ color: '#94a3b8' }}>
                  {loading ? '読み込み中…' : '検索中…'}
                </p>
              ) : gridIps.length === 0 ? (
                <p className="col-span-3 text-[13px] text-center w-full" style={{ color: '#94a3b8' }}>
                  {selectedOnly
                    ? '選択中のIPがありません'
                    : query.trim()
                      ? '該当するIPが見つかりません'
                      : '表示できるIPがありません'}
                </p>
              ) : (
                gridIps.map((item) => (
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

          <div className="w-full flex gap-3 shrink-0 max-md:mt-2 max-md:-translate-y-3 md:mt-5 md:-translate-y-2">
            <button
              type="button"
              disabled={!canSkip}
              onClick={onSkip}
              style={skipStyle}
              className="login-otp-send-btn flex-1 h-[48px] md:h-[52px] rounded-full text-[16px] font-bold active:opacity-80 disabled:cursor-not-allowed"
            >
              スキップ
            </button>
            <button
              type="button"
              disabled={!canProceed}
              onClick={() => onContinue([...selectedIps])}
              style={submitStyle}
              className="login-otp-send-btn flex-1 h-[48px] md:h-[52px] rounded-full text-[16px] font-bold active:opacity-80 disabled:cursor-not-allowed"
            >
              次へ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
