'use client';

import { useState } from 'react';
import { List, Map as MapIcon, Navigation, Flag, Check, X, HelpCircle, Search, ArrowLeft, Plus } from 'lucide-react';
import { useSunlit } from '@/lib/sunlit/store';
import type { Spot } from '@/lib/sunlit/types';
import { GACHA_ITEMS } from '@/lib/sunlit/gacha-data';
import type { GachaItem } from '@/lib/sunlit/gacha-data';
import {
  STOCK_DISPLAY, stockPhrase, spotEntries,
} from '@/lib/sunlit/map-data';
import type { SpotStockEntry } from '@/lib/sunlit/map-data';

function StockPip({ icon, color, size = 16 }: { icon: 'check' | 'q' | 'x'; color: string; size?: number }) {
  const I = icon === 'check' ? Check : icon === 'x' ? X : HelpCircle;
  return (
    <span className="rounded-full flex items-center justify-center"
      style={{ width: size, height: size, background: color, border: '2px solid white', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
      <I size={size - 7} color="white" strokeWidth={3.5} />
    </span>
  );
}

type MapMode = 'map' | 'list';
type Target  = 'all' | string; // 'all' or gachaId

const SPOT_POSITIONS: Record<string, { x: number; y: number }> = {
  s1: { x: 72, y: 28 }, s2: { x: 35, y: 18 }, s3: { x: 22, y: 68 },
  s4: { x: 74, y: 35 }, s5: { x: 88, y: 58 }, s6: { x: 24, y: 72 },
};

function gacha(id: string): GachaItem | undefined {
  return GACHA_ITEMS.find((g) => g.id === id);
}

/* ─── 顔ピン（シリーズのアートワーク＝グラデ） ─── */
function SeriesPin({
  spot, entries, dimmed, isSelected, onClick,
}: {
  spot: Spot; entries: SpotStockEntry[]; dimmed: boolean; isSelected: boolean; onClick: () => void;
}) {
  const pos = SPOT_POSITIONS[spot.id] ?? { x: 50, y: 50 };

  /* お気に入りが1件もない店 → 極薄の小ピン（位置感のみ） */
  if (entries.length === 0) {
    return (
      <button className="absolute" onClick={onClick}
        style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%,-100%)', zIndex: 5, opacity: 0.35 }}>
        <svg width="16" height="20" viewBox="0 0 30 36" fill="none">
          <path d="M15 0C6.72 0 0 6.72 0 15c0 11.25 15 21 15 21S30 26.25 30 15C30 6.72 23.28 0 15 0Z" fill="#B8B2A4" />
        </svg>
      </button>
    );
  }

  const primary  = entries[0];
  const disp     = STOCK_DISPLAY[primary.state];
  const pGacha   = gacha(primary.gachaId);
  const second   = entries[1];
  const sGacha   = second ? gacha(second.gachaId) : undefined;
  // 在庫状態のリング：引ける＝緑、未確認＝グレー点線、なし＝赤
  const ringColor = disp.category === 'available' ? '#22C55E' : disp.category === 'none' ? '#EF4444' : '#9CA3AF';
  const dashed    = disp.category === 'unknown';

  /* フォーカス外だが別のお気に入りを持つ店 → 薄い顔ピン。タップでそのシリーズに乗り換え */
  if (dimmed && pGacha) {
    return (
      <button className="absolute" onClick={onClick}
        style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%,-100%)', zIndex: 6, opacity: 0.5 }}>
        <div className="rounded-full" style={{
          width: 26, height: 26,
          background: `linear-gradient(145deg, ${pGacha.gradientFrom}, ${pGacha.gradientTo})`,
          border: '2px solid white', boxShadow: '0 2px 5px rgba(0,0,0,0.25)',
        }} />
      </button>
    );
  }

  return (
    <button className="absolute" onClick={onClick}
      style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%,-100%)', zIndex: isSelected ? 30 : 12 }}>
      {/* 新鮮（＝今すぐ引ける）だけ脈動で目を引く */}
      {disp.pulse && (
        <span className="absolute rounded-full animate-ping"
          style={{ width: 44, height: 44, background: 'rgba(34,197,94,0.45)', top: -7, left: -7, zIndex: -1 }} />
      )}


      <div style={{ transform: isSelected ? 'scale(1.18)' : 'scale(1)', transition: 'transform 0.2s ease', opacity: disp.faded ? 0.62 : 1 }}>
        <div className="relative" style={{ width: 42, height: 42 }}>
          {/* facepile：2件目を後ろにずらして重ねる */}
          {sGacha && (
            <div className="absolute rounded-full"
              style={{
                width: 30, height: 30, left: -10, top: 8,
                background: `linear-gradient(145deg, ${sGacha.gradientFrom}, ${sGacha.gradientTo})`,
                border: '2px solid white', boxShadow: '0 2px 5px rgba(0,0,0,0.25)',
              }} />
          )}
          {/* 主役のアートワーク（リングは状態色・中身はシリーズ） */}
          {pGacha && (
            <div className="absolute rounded-full"
              style={{
                width: 38, height: 38, right: 0, top: 0,
                background: `linear-gradient(145deg, ${pGacha.gradientFrom}, ${pGacha.gradientTo})`,
                border: `3px ${dashed ? 'dashed' : 'solid'} ${ringColor}`,
                boxShadow: '0 3px 8px rgba(0,0,0,0.3)',
              }} />
          )}
          {/* 状態ピップ（✓ / ? / ✕）＝色に頼らず一目で */}
          <span className="absolute" style={{ right: -4, bottom: -2, zIndex: 2 }}>
            <StockPip icon={disp.icon} color={disp.pip} />
          </span>
          {/* 複数バッジ（左上に逃がす） */}
          {entries.length > 1 && (
            <span className="absolute -top-1.5 -left-2 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[9px] font-black text-white"
              style={{ background: '#111' }}>
              {entries.length}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

/* ─── 凡例 ─── */
function MapLegend() {
  const items: { icon: 'check' | 'q' | 'x'; c: string; t: string }[] = [
    { icon: 'check', c: '#22C55E', t: '在庫の報告あり' },
    { icon: 'q',     c: '#9CA3AF', t: '未確認・報告募集' },
    { icon: 'x',     c: '#EF4444', t: '売り切れの報告' },
  ];
  return (
    <div className="absolute bottom-4 right-4 bg-white rounded-2xl px-3 py-2.5"
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.12)', zIndex: 10, maxWidth: 178 }}>
      <div className="space-y-2 mb-2">
        {items.map((e) => (
          <div key={e.t} className="flex items-center gap-2">
            <StockPip icon={e.icon} color={e.c} size={14} />
            <span className="text-[9px] font-bold text-[#555]">{e.t}</span>
          </div>
        ))}
      </div>
      {/* 期待値の契約：保証でなくみんなの報告だと明示 */}
      <p className="text-[8px] leading-tight text-[#AAA]" style={{ borderTop: '1px solid #F0ECD8', paddingTop: 6 }}>
        みんなの報告です。在庫は変わります。
      </p>
    </div>
  );
}

/* ─── リスト（目当てに合う店を距離感で並べる簡易版） ─── */
function ListView({ spots, favIds, target, onSelect }: {
  spots: Spot[]; favIds: Set<string>; target: Target; onSelect: (id: string) => void;
}) {
  const rows = spots
    .map((spot) => ({ spot, entries: spotEntries(spot.id, favIds, target) }))
    .filter((r) => r.entries.length > 0);

  return (
    <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
      {rows.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-[14px] font-bold text-[#CCC]">この目当ての在庫情報がまだありません</p>
        </div>
      ) : rows.map(({ spot, entries }) => {
        const top  = entries[0];
        const disp = STOCK_DISPLAY[top.state];
        const barColor = disp.category === 'available' ? '#22C55E' : disp.category === 'none' ? '#EF4444' : '#9CA3AF';
        const ph = stockPhrase(top);
        return (
          <button key={spot.id} className="mikke-feed-card w-full text-left flex items-center gap-3.5 px-4 py-3.5"
            onClick={() => onSelect(spot.id)}>
            <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: barColor, minHeight: 48 }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <StockPip icon={disp.icon} color={disp.pip} size={15} />
                <span className="text-[13px] font-black" style={{ color: barColor }}>{ph.lead}</span>
                {entries.length > 1 && (
                  <span className="text-[10px] font-bold text-[#AAA]">お気に入り{entries.length}件</span>
                )}
              </div>
              <p className="text-[14px] font-bold text-[#111] leading-snug">{spot.name}</p>
              {/* 観測の報告として時刻・人で属性化（断定しない） */}
              <p className="text-[11px] text-[#AAA] mt-1">{ph.sub}</p>
            </div>
            {top.state === 'unreported' && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black flex-shrink-0"
                style={{ background: '#FFF7E0', color: '#C8960A' }}>
                <Flag size={10} />報告する
              </span>
            )}
          </button>
        );
      })}
      <div className="h-4" />
    </div>
  );
}

/* ─── 目当て検索（お気に入り以外のシリーズも狙い撃ち） ─── */
function MapSearchOverlay({ onPick, onClose }: { onPick: (id: string) => void; onClose: () => void }) {
  const [q, setQ] = useState('');
  const query   = q.trim();
  const results = query
    ? GACHA_ITEMS.filter((g) => g.status !== 'coming_soon' && (g.seriesName.includes(query) || g.ipName.includes(query)))
    : GACHA_ITEMS.filter((g) => g.status !== 'coming_soon').slice(0, 6);

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-[#FFFEEF]">
      <div className="flex-shrink-0 bg-white flex items-center gap-2 px-4 pt-12 pb-3" style={{ borderBottom: '1.5px solid #EDE9D8' }}>
        <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#F5F0E0' }}>
          <ArrowLeft size={18} color="#111" />
        </button>
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-full" style={{ background: '#F5F0E0' }}>
          <Search size={15} color="#999" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="シリーズ・IPを探して目当てに"
            className="flex-1 bg-transparent outline-none text-[14px] text-[#111] placeholder:text-[#AAA]" />
          {q && <button onClick={() => setQ('')}><X size={14} color="#999" /></button>}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {!query && <p className="px-5 pt-4 pb-1 text-[12px] font-bold text-[#AAA]">人気のシリーズ</p>}
        {results.map((g) => (
          <button key={g.id} onClick={() => onPick(g.id)}
            className="w-full flex items-center gap-3 px-5 py-3 text-left" style={{ borderBottom: '1px solid #F0ECD8' }}>
            <div className="w-10 h-10 rounded-full flex-shrink-0"
              style={{ background: `linear-gradient(145deg, ${g.gradientFrom}, ${g.gradientTo})` }} />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-black text-[#111] truncate">{g.seriesName}</p>
              <p className="text-[11px] text-[#AAA]">{g.ipName}</p>
            </div>
            <Search size={14} color="#CCC" />
          </button>
        ))}
        {query && results.length === 0 && (
          <p className="text-center text-[13px] font-bold text-[#CCC] py-16">「{query}」は見つかりませんでした</p>
        )}
      </div>
    </div>
  );
}

export function HomeMapScreen() {
  const { spots, selectedSpotId, selectSpot, likedGachaItemIds } = useSunlit();
  const [mapMode, setMapMode]     = useState<MapMode>('map');
  const [target, setTarget]       = useState<Target>('all');
  const [searchOpen, setSearchOpen] = useState(false);

  const favItems = GACHA_ITEMS.filter((g) => likedGachaItemIds.has(g.id));
  const favIds   = likedGachaItemIds;
  const [locToast, setLocToast] = useState(false);
  // 非お気に入りを目当てにしている場合のチップ
  const nonFavTarget = target !== 'all' && !likedGachaItemIds.has(target)
    ? GACHA_ITEMS.find((g) => g.id === target) : null;

  const recenter = () => { setLocToast(true); setTimeout(() => setLocToast(false), 1800); };

  return (
    <div className="relative h-full flex flex-col bg-[#FFFEEF]">

      {/* ヘッダー */}
      <div className="flex-shrink-0 bg-white" style={{ borderBottom: '1.5px solid #EDE9D8' }}>
        <div className="flex items-center justify-between px-5 pt-12 pb-2">
          <h1 className="font-black" style={{ fontSize: 22, letterSpacing: '-0.5px', color: '#F2B800' }}>マップ</h1>
          <div className="flex items-center gap-2">
            <button onClick={() => setMapMode(mapMode === 'map' ? 'list' : 'map')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold"
              style={{ background: '#F5F2E8', color: '#888' }}>
              {mapMode === 'map' ? <><List size={13} />リスト</> : <><MapIcon size={13} />マップ</>}
            </button>
            <button onClick={recenter} className="w-8 h-8 flex items-center justify-center rounded-full active:scale-90 transition-transform"
              style={{ background: '#F5F2E8' }}>
              <Navigation size={16} color="#888" />
            </button>
          </div>
        </div>

        {/* 目当てセレクタ */}
        <div className="flex items-center gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
          <span className="text-[11px] font-black text-[#AAA] flex-shrink-0">目当て</span>
          <button onClick={() => setTarget('all')}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] font-bold transition-colors"
            style={target === 'all' ? { background: '#F2B800', color: 'white' } : { background: '#F5F0E0', color: '#888' }}>
            お気に入り全部
          </button>
          {favItems.map((g) => (
            <button key={g.id} onClick={() => setTarget(g.id)}
              className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[12px] font-bold transition-colors"
              style={target === g.id ? { background: '#F2B800', color: 'white' } : { background: '#F5F0E0', color: '#888' }}>
              <span className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                style={{ background: `linear-gradient(145deg, ${g.gradientFrom}, ${g.gradientTo})` }} />
              {g.ipName}
            </button>
          ))}

          {/* 検索で選んだ非お気に入りの目当て（アクティブ表示） */}
          {nonFavTarget && (
            <button onClick={() => setTarget('all')}
              className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[12px] font-bold"
              style={{ background: '#F2B800', color: 'white' }}>
              <span className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                style={{ background: `linear-gradient(145deg, ${nonFavTarget.gradientFrom}, ${nonFavTarget.gradientTo})` }} />
              {nonFavTarget.ipName}
              <X size={11} />
            </button>
          )}

          {/* 探す（お気に入り以外も目当てに） */}
          <button onClick={() => setSearchOpen(true)}
            className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[12px] font-bold"
            style={{ background: 'white', color: '#888', border: '1.5px solid #EDE9D8' }}>
            <Plus size={13} />探す
          </button>
        </div>
      </div>

      {searchOpen && (
        <MapSearchOverlay
          onPick={(id) => { setTarget(id); setSearchOpen(false); }}
          onClose={() => setSearchOpen(false)}
        />
      )}

      {mapMode === 'list' ? (
        <ListView spots={spots} favIds={favIds} target={target} onSelect={selectSpot} />
      ) : (
        <div className="flex-1 relative overflow-hidden">
          {/* 背景マップ */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 390 680" preserveAspectRatio="xMidYMid slice">
            <rect width="390" height="680" fill="#E8E4DC" />
            <line x1="0" y1="280" x2="390" y2="280" stroke="#C8C3B5" strokeWidth="4" />
            <line x1="0" y1="420" x2="390" y2="420" stroke="#C8C3B5" strokeWidth="3" />
            <line x1="120" y1="0" x2="120" y2="680" stroke="#C8C3B5" strokeWidth="3" />
            <line x1="260" y1="0" x2="260" y2="680" stroke="#C8C3B5" strokeWidth="4" />
            <rect x="70" y="80" width="40" height="80" rx="4" fill="#D4CFBF" opacity="0.7" />
            <rect x="130" y="60" width="60" height="100" rx="4" fill="#D4CFBF" opacity="0.7" />
            <rect x="270" y="50" width="40" height="70" rx="4" fill="#D4CFBF" opacity="0.7" />
            <rect x="70" y="320" width="40" height="90" rx="4" fill="#C8D9BC" opacity="0.6" />
            <rect x="140" y="440" width="70" height="50" rx="4" fill="#D4CFBF" opacity="0.6" />
            <rect x="330" y="300" width="20" height="180" rx="4" fill="#C5D8E8" opacity="0.5" />
            <defs>
              <pattern id="mikke-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#B8B2A4" strokeWidth="0.5" opacity="0.4" />
              </pattern>
            </defs>
            <rect width="390" height="680" fill="url(#mikke-grid)" />
          </svg>

          {/* ピン */}
          <div className="absolute inset-0">
            {spots.map((spot) => {
              const focusEntries = spotEntries(spot.id, favIds, target);
              const allEntries   = spotEntries(spot.id, favIds, 'all');

              // フォーカス中で対象を持たないが、別のお気に入りはある店 → 薄い顔ピン（タップで乗り換え）
              if (target !== 'all' && focusEntries.length === 0 && allEntries.length > 0) {
                const other = allEntries[0];
                return (
                  <SeriesPin key={spot.id} spot={spot} entries={[other]} dimmed
                    isSelected={selectedSpotId === spot.id}
                    onClick={() => setTarget(other.gachaId)} />
                );
              }
              // 通常（全部 or 対象あり）／ お気に入りなし
              return (
                <SeriesPin key={spot.id} spot={spot} entries={focusEntries} dimmed={false}
                  isSelected={selectedSpotId === spot.id} onClick={() => selectSpot(spot.id)} />
              );
            })}
          </div>

          <MapLegend />

          {/* 現在地 */}
          <div className="absolute" style={{ left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }}>
            <span className="absolute rounded-full animate-ping"
              style={{ width: locToast ? 32 : 20, height: locToast ? 32 : 20, background: 'rgba(59,130,246,0.3)', top: locToast ? -10 : -4, left: locToast ? -10 : -4, transition: 'all .2s' }} />
            <div className="w-3 h-3 rounded-full bg-[#3B82F6] border-2 border-white"
              style={{ boxShadow: '0 1px 4px rgba(59,130,246,0.5)' }} />
          </div>

          {/* 現在地トースト */}
          {locToast && (
            <div className="absolute left-1/2 -translate-x-1/2 px-3.5 py-2 rounded-full text-[12px] font-bold text-white"
              style={{ top: 12, background: 'rgba(17,17,17,0.85)', zIndex: 20 }}>
              現在地：秋葉原周辺を表示中
            </div>
          )}
        </div>
      )}
    </div>
  );
}
