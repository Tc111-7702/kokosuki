'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { SignupFavoriteStepHeader } from '@/components/SignupFavoriteStepHeader';
import { GachaCard, type GachaItem } from '@/components/ui/GachaCard';
import { useIsMobile } from '@/lib/useIsMobile';
import { useAuthBackIconColor, useAuthPrimaryButtonStyle } from '@/lib/useAuthPrimaryButtonStyle';

type GachaGroup = {
  ipName: string;
  gachas: GachaItem[];
};

interface Props {
  selectedIpNames: string[];
  favoriteGachaIds: string[];
  onFavoriteGachaIdsChange: (ids: string[]) => void;
  onBack: () => void;
  onContinue?: () => void;
}

function SignupGachaIpNav({
  onPrev,
  onNext,
  canGoPrev,
  canGoNext,
}: {
  onPrev: () => void;
  onNext: () => void;
  canGoPrev: boolean;
  canGoNext: boolean;
}) {
  return (
    <div
      className="flex items-center justify-center gap-1 w-full"
      style={{ color: '#64748b' }}
    >
      <button
        type="button"
        onClick={onPrev}
        disabled={!canGoPrev}
        aria-label="前のIPを見る"
        className="p-0.5 active:opacity-60 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronsLeft size={14} strokeWidth={2.5} />
      </button>
      <span className="text-[10px] md:text-[13px] font-bold whitespace-nowrap">
        ほかのIPを見る
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={!canGoNext}
        aria-label="次のIPを見る"
        className="p-0.5 active:opacity-60 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronsRight size={14} strokeWidth={2.5} />
      </button>
    </div>
  );
}

/** 新規登録: 選択 IP ごとにいいね上位4件のガチャを選ぶ */
export function SignupGachaSelectStep({
  selectedIpNames,
  favoriteGachaIds,
  onFavoriteGachaIdsChange,
  onBack,
  onContinue,
}: Props) {
  const isMobile = useIsMobile();
  const [groups, setGroups] = useState<GachaGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIpIndex, setActiveIpIndex] = useState(0);

  useEffect(() => {
    setActiveIpIndex(0);
  }, [selectedIpNames]);

  useEffect(() => {
    if (selectedIpNames.length === 0) {
      setGroups([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          ipNames: selectedIpNames.join(','),
          limit: '4',
        });
        const res = await fetch(`/api/gacha/signup-gachas?${params.toString()}`);
        const data = await res.json().catch(() => null);
        const nextGroups = (data?.groups ?? []) as GachaGroup[];
        if (!cancelled) setGroups(nextGroups);
      } catch {
        if (!cancelled) setGroups([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [selectedIpNames]);

  const activeIpName = selectedIpNames[activeIpIndex] ?? selectedIpNames[0] ?? '';
  const activeGachas = useMemo(() => {
    if (!activeIpName) return [];
    return groups.find((g) => g.ipName === activeIpName)?.gachas ?? [];
  }, [groups, activeIpName]);

  const showIpNav = selectedIpNames.length > 1;
  const canGoPrev = activeIpIndex > 0;
  const canGoNext = activeIpIndex < selectedIpNames.length - 1;

  const toggleGachaLike = (gachaId: string) => {
    onFavoriteGachaIdsChange(
      favoriteGachaIds.includes(gachaId)
        ? favoriteGachaIds.filter((id) => id !== gachaId)
        : [...favoriteGachaIds, gachaId],
    );
  };

  const selectedCount = favoriteGachaIds.length;
  const canProceed = selectedCount > 0;
  const submitStyle = useAuthPrimaryButtonStyle(canProceed);
  const backIconColor = useAuthBackIconColor();

  return (
    <div className="login-email-step signup-app-font font-sans flex flex-col min-h-[100dvh] max-md:h-[100dvh] max-md:overflow-hidden px-6 pt-4 max-md:pt-2 pb-8 max-md:pb-5 md:pb-10 bg-white">
      <div className="w-full max-w-[360px] md:max-w-[720px] mx-auto flex flex-col flex-1 min-h-0 max-md:overflow-hidden md:justify-center md:py-4">
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
          <SignupFavoriteStepHeader
            title="気になる・狙っている商品は？"
            selectedCount={selectedCount}
            layout="gacha"
            onDesktopBack={onBack}
            countRowRight={
              showIpNav ? (
                <SignupGachaIpNav
                  onPrev={() => setActiveIpIndex((i) => Math.max(0, i - 1))}
                  onNext={() => setActiveIpIndex((i) => Math.min(selectedIpNames.length - 1, i + 1))}
                  canGoPrev={canGoPrev}
                  canGoNext={canGoNext}
                />
              ) : undefined
            }
          />

          <div className="w-full flex-1 min-h-0 max-md:overflow-hidden md:flex-none md:overflow-visible mt-2 md:mt-3 max-md:pb-2 flex flex-col justify-center md:h-[240px] md:shrink-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 w-full min-h-[242px] md:min-h-[240px] content-start">
              {loading ? (
                <p className="col-span-2 md:col-span-4 text-[13px] md:text-[15px] text-center w-full" style={{ color: '#94a3b8' }}>
                  読み込み中…
                </p>
              ) : activeGachas.length === 0 ? (
                <p className="col-span-2 md:col-span-4 text-[13px] md:text-[15px] text-center w-full" style={{ color: '#94a3b8' }}>
                  表示できるガチャがありません
                </p>
              ) : (
                activeGachas.map((gacha, rank) => (
                  <GachaCard
                    key={gacha.id}
                    gacha={gacha}
                    rank={rank}
                    showRank={false}
                    isMobile={isMobile}
                    variant="favorite"
                    fullWidth
                    onClick={() => toggleGachaLike(gacha.id)}
                    likedOverride={favoriteGachaIds.includes(gacha.id)}
                    onToggleLike={toggleGachaLike}
                    showIpName={false}
                  />
                ))
              )}
            </div>
          </div>
          </div>

          <button
            type="button"
            disabled={!canProceed}
            onClick={onContinue}
            style={submitStyle}
            className="login-otp-send-btn w-full h-[48px] md:h-[52px] rounded-full text-[16px] font-bold text-white active:opacity-80 disabled:cursor-not-allowed shrink-0 max-md:mt-2 md:mt-10"
          >
            次へ
          </button>
        </div>
      </div>
    </div>
  );
}
