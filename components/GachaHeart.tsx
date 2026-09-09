'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Heart } from 'lucide-react';

interface GachaItem {
  id: string;
  seriesName: string;
  ipName: string;
  gradientFrom: string;
  gradientTo: string;
  imageUrl?: string;
}

interface Props {
  liked: string[];
  selectedIps: string[];
  onToggle: (id: string) => void;
  onNext: () => void;
  onBack: () => void;
  /** 選択中IP配下のガチャIDだけを渡す。親はこれで likedGachaIds を剪定する（選択解除IPのハートを除去） */
  onPrune: (validIds: Set<string>) => void;
}

const MIN_PER_IP = 3;

export function GachaHeart({ liked, selectedIps, onToggle, onNext, onBack, onPrune }: Props) {
  const [items, setItems] = useState<GachaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedIps.length === 0) { queueMicrotask(() => setLoading(false)); return; }
    const params = encodeURIComponent(selectedIps.join(','));
    fetch(`/api/gacha/by-ips?ipNames=${params}`)
      .then(r => r.json())
      .then(data => {
        const gachas: GachaItem[] = data.gachas ?? [];
        setItems(gachas);
        // 選択中IPに属さないハート（＝IP選択に戻って外したIPのガチャ）を剪定する。
        // 取得成功時のみ実行（catch時は items が不確定なため剪定しない）。
        onPrune(new Set(gachas.map((g) => g.id)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedIps, onPrune]);

  // IPごとにグループ化（selectedIpsの順序を維持）
  const groups = selectedIps
    .map((ip) => ({ ipName: ip, gachas: items.filter((g) => g.ipName === ip) }))
    .filter((g) => g.gachas.length > 0);

  // バリデーション：各IPで min(MIN_PER_IP, グループ数) 以上ハート済みか
  const unmetGroups = groups.filter((group) => {
    const required = Math.min(MIN_PER_IP, group.gachas.length);
    const count = group.gachas.filter((g) => liked.includes(g.id)).length;
    return count < required;
  });
  const canProceed = !loading && groups.length > 0 && unmetGroups.length === 0;

  return (
    <div className="flex flex-col h-screen bg-[#FFFFFF]">
      {/* ヘッダー（固定） */}
      <div className="shrink-0 px-6 pt-6 sm:pt-12 pb-2">
        <button
          onClick={onBack}
          className="self-start mb-3 w-9 h-9 rounded-full flex items-center justify-center sm:hidden"
          style={{ background: '#F0ECD8' }}
        >
          <ArrowLeft size={18} color="#555" />
        </button>
        <h2 className="text-lg sm:text-2xl font-black text-[#111] mb-1 whitespace-nowrap">気になるガチャをハートしよう</h2>
        <p className="text-[#888] text-[13px] mb-1">マップに表示し、在庫情報を通知します</p>
        <p className="text-[11px] mb-3" style={{ color: '#F2B800' }}>
          ※各IPから{MIN_PER_IP}個以上ハートしてください
        </p>
      </div>

      {/* スクロールエリア */}
      <div className="flex-1 overflow-y-auto px-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div style={{ width: 32, height: 32, border: '3px solid #F2B800', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          </div>
        ) : groups.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-[#AAA] text-[14px]">
            表示できるガチャがありません
          </div>
        ) : (
          <div className="pb-4">
            {groups.map((group) => {
              const required = Math.min(MIN_PER_IP, group.gachas.length);
              const likedCount = group.gachas.filter((g) => liked.includes(g.id)).length;
              const met = likedCount >= required;
              return (
                <div key={group.ipName} className="mb-6">
                  {/* IPセクションヘッダー */}
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-[13px] font-black whitespace-nowrap" style={{ color: met ? '#F2B800' : '#F2B800' }}>{group.ipName}</span>
                    <div className="flex-1 h-px" style={{ background: '#EDE9D8' }} />
                    <span className="text-[11px] font-bold whitespace-nowrap" style={{ color: met ? '#4CAF50' : '#CCC' }}>
                      {likedCount}/{required}
                    </span>
                  </div>
                  {/* ガチャカード一覧 */}
                  <div className="flex flex-col gap-2">
                    {group.gachas.map((g) => {
                      const isLiked = liked.includes(g.id);
                      return (
                        <button
                          key={g.id}
                          onClick={() => onToggle(g.id)}
                          className="flex items-center gap-3 w-full rounded-xl px-3 py-2 text-left transition-colors"
                          style={{
                            background: 'white',
                            border: isLiked ? '2px solid #F2B800' : '2px solid #EDE9D8',
                          }}
                        >
                          {g.imageUrl ? (
                            <img
                              src={g.imageUrl}
                              alt={g.seriesName}
                              className="w-10 h-10 rounded-lg object-cover shrink-0"
                            />
                          ) : (
                            <div
                              className="w-10 h-10 rounded-lg shrink-0"
                              style={{ background: `linear-gradient(145deg, ${g.gradientFrom}, ${g.gradientTo})` }}
                            />
                          )}
                          <span className="flex-1 text-[13px] font-bold text-[#111] leading-snug">{g.seriesName}</span>
                          <Heart
                            size={18}
                            fill={isLiked ? '#F2B800' : 'none'}
                            color={isLiked ? '#F2B800' : '#CCC'}
                            className="shrink-0"
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* フッター（固定） */}
      <div className="shrink-0 px-6 pt-3 pb-8" style={{ borderTop: '1.5px solid #EDE9D8' }}>
        {!canProceed && !loading && groups.length > 0 && (
          <p className="text-center text-[11px] mb-2" style={{ color: '#CCC' }}>
            未達成のIPがあります（{unmetGroups.map(g => g.ipName).join('・')}）
          </p>
        )}
        <button
          onClick={onNext}
          disabled={!canProceed}
          className="w-full py-4 rounded-2xl font-black text-[16px] transition-opacity"
          style={{ background: '#F2B800', color: 'white', opacity: canProceed ? 1 : 0.4 }}
        >
          次へ（{liked.length}件）
        </button>
        <button onClick={onBack} className="hidden sm:block mt-4 text-[13px] text-[#999] underline underline-offset-2 w-full text-center">
          戻る
        </button>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
