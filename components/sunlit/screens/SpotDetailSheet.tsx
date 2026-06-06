'use client';

import { useState } from 'react';
import { X, MapPin, Navigation, Lock, Check, HelpCircle, Flag } from 'lucide-react';
import { useSunlit } from '@/lib/sunlit/store';
import { USER_LOCATION } from '@/lib/sunlit/mock-data';
import { distanceMeters, formatDistance, POST_RADIUS_M } from '@/lib/sunlit/geo';
import { GACHA_ITEMS } from '@/lib/sunlit/gacha-data';
import { spotEntries, stockPhrase, STOCK_DISPLAY } from '@/lib/sunlit/map-data';
import { getUserColor, getInitials } from '@/lib/sunlit/colors';

const DIV = '#F0ECD8'; // 区切り線

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'たった今';
  if (diff < 3600) return `${Math.floor(diff / 60)}分前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}時間前`;
  return `${Math.floor(diff / 86400)}日前`;
}

function Ava({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <div className="rounded-full flex items-center justify-center flex-shrink-0 text-white font-black"
      style={{ width: size, height: size, background: getUserColor(name), fontSize: size * 0.38 }}>
      {getInitials(name)}
    </div>
  );
}

function Pip({ icon, color, size = 14 }: { icon: 'check' | 'q' | 'x'; color: string; size?: number }) {
  const I = icon === 'check' ? Check : icon === 'x' ? X : HelpCircle;
  return (
    <span className="rounded-full flex items-center justify-center flex-shrink-0" style={{ width: size, height: size, background: color }}>
      <I size={size - 6} color="white" strokeWidth={3.5} />
    </span>
  );
}

/* この店のQ&A（Xのスレッド風・フラット） */
function QASection({ spotId }: { spotId: string }) {
  const { spotQA, addQuestion, addAnswer } = useSunlit();
  const items = spotQA[spotId] ?? [];
  const [q, setQ]           = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [aText, setAText]   = useState('');

  const ask = () => { if (q.trim()) { addQuestion(spotId, q); setQ(''); } };

  return (
    <div>
      {/* セクション見出し */}
      <div className="flex items-center justify-between px-5 pt-3 pb-2">
        <p className="text-[14px] font-black text-[#111]">この店に聞く</p>
        <span className="text-[12px] font-bold text-[#BBB]">{items.length}</span>
      </div>

      {/* 質問コンポーズ（X返信欄風・枠なし） */}
      <div className="flex items-center gap-2.5 px-5 pb-3">
        <Ava name="たいよう" size={32} />
        <input value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="列は？在庫は？ 近くの人に聞く"
          className="flex-1 bg-transparent outline-none text-[14px] text-[#111] placeholder:text-[#BBB]"
          onKeyDown={(e) => { if (e.key === 'Enter') ask(); }} />
        <button disabled={!q.trim()} onClick={ask}
          className="text-[13px] font-black flex-shrink-0"
          style={{ color: q.trim() ? '#F2B800' : '#D8D3C4' }}>
          質問
        </button>
      </div>

      {/* スレッド */}
      {items.map((item) => (
        <div key={item.id} className="px-5 py-3" style={{ borderTop: `1px solid ${DIV}` }}>
          <div className="flex gap-2.5">
            <Ava name={item.userName} size={34} />
            <div className="flex-1 min-w-0">
              <p className="text-[13px]">
                <span className="font-black text-[#111]">{item.userName}</span>
                <span className="text-[#AAA] ml-1.5">{timeAgo(item.createdAt)}</span>
              </p>
              <p className="text-[14px] text-[#111] leading-snug mt-0.5">{item.text}</p>

              {/* 回答（少しインデント） */}
              <div className="mt-2.5 space-y-2.5">
                {item.answers.map((a) => (
                  <div key={a.id} className="flex gap-2">
                    <Ava name={a.userName} size={26} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px]">
                        <span className="font-bold text-[#111]">{a.userName}</span>
                        <span className="text-[#AAA] ml-1.5">{timeAgo(a.createdAt)}</span>
                      </p>
                      <p className="text-[13px] text-[#333] leading-snug">{a.text}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* 返信 */}
              {openId === item.id ? (
                <div className="flex items-center gap-2 mt-2">
                  <input value={aText} autoFocus onChange={(e) => setAText(e.target.value)} placeholder="答える…"
                    className="flex-1 bg-transparent outline-none text-[13px] border-b border-[#EDE9D8] pb-1"
                    onKeyDown={(e) => { if (e.key === 'Enter' && aText.trim()) { addAnswer(spotId, item.id, aText); setAText(''); setOpenId(null); } }} />
                  <button onClick={() => { if (aText.trim()) { addAnswer(spotId, item.id, aText); setAText(''); setOpenId(null); } }}
                    className="text-[12px] font-black flex-shrink-0" style={{ color: '#F2B800' }}>送信</button>
                </div>
              ) : (
                <button onClick={() => { setOpenId(item.id); setAText(''); }} className="text-[12px] font-bold text-[#AAA] mt-1.5">
                  答える
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SpotDetailSheet() {
  const { spots, selectedSpotId, selectSpot, navigateTo, locationGranted, setLocationGranted, likedGachaItemIds } = useSunlit();
  const spot = spots.find((s) => s.id === selectedSpotId);
  if (!spot) return null;

  const dist       = distanceMeters(USER_LOCATION.lat, USER_LOCATION.lng, spot.lat, spot.lng);
  const inRange    = dist <= POST_RADIUS_M;
  const canPost    = locationGranted && inRange;
  const favEntries  = spotEntries(spot.id, likedGachaItemIds, 'all');
  const reported    = favEntries.filter((e) => e.state !== 'unreported');     // 報告あり（あり/なし）
  const unreported  = favEntries.filter((e) => e.state === 'unreported');     // 未報告＝報告募集中
  const seriesName  = (id: string) => GACHA_ITEMS.find((g) => g.id === id)?.seriesName ?? '';

  return (
    <>
      <div className="absolute inset-0 bg-black/10" onClick={() => selectSpot(null)} style={{ zIndex: 20 }} />

      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl flex flex-col"
        style={{ zIndex: 30, boxShadow: '0 -4px 32px rgba(0,0,0,0.15)', maxHeight: '85%' }}>

        {/* ハンドル */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-[#E5E7EB]" />
        </div>

        {/* ヘッダー */}
        <div className="flex items-start justify-between px-5 pt-1 pb-3 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="text-[18px] font-black text-[#111] leading-snug">{spot.name}</h2>
            <div className="flex items-center gap-2.5 mt-1 text-[12px]">
              <span className="flex items-center gap-1 text-[#AAA] truncate">
                <MapPin size={11} />{spot.address}
              </span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <Navigation size={11} color={inRange ? '#16A34A' : '#9CA3AF'} />
              <span className="text-[12px] font-bold" style={{ color: inRange ? '#16A34A' : '#9CA3AF' }}>
                現在地から {formatDistance(dist)}{inRange && ' ・ 投稿できます'}
              </span>
            </div>
          </div>
          <button className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F0EFEC] flex-shrink-0 ml-3"
            onClick={() => selectSpot(null)}>
            <X size={16} color="#444" />
          </button>
        </div>

        {/* スクロール領域 */}
        <div className="flex-1 overflow-y-auto">

          {/* 報告あり（あり/なし）の在庫状態：フラット行 */}
          {reported.map((e) => {
            const g    = GACHA_ITEMS.find((x) => x.id === e.gachaId);
            const disp = STOCK_DISPLAY[e.state];
            const ph   = stockPhrase(e);
            const col  = disp.category === 'available' ? '#16A34A' : disp.category === 'none' ? '#EF4444' : '#9CA3AF';
            return (
              <div key={e.gachaId} className="flex items-center gap-3 px-5 py-3" style={{ borderTop: `1px solid ${DIV}` }}>
                {g && (
                  <div className="w-10 h-10 rounded-full flex-shrink-0"
                    style={{ background: `linear-gradient(145deg, ${g.gradientFrom}, ${g.gradientTo})` }} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-bold text-[#888] truncate">{g?.seriesName}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Pip icon={disp.icon} color={disp.pip} />
                    <span className="text-[15px] font-black" style={{ color: col }}>{ph.lead}</span>
                    <span className="text-[12px] text-[#AAA]">・ {ph.sub}</span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* 未報告＝報告募集中：報告CTAを主役に（コールドスタートを埋める） */}
          {unreported.length > 0 && (
            <div className="px-5 py-3.5" style={{ borderTop: `1px solid ${DIV}`, background: '#FFFBEC' }}>
              <div className="flex items-center gap-1.5 mb-1">
                <Flag size={14} color="#C8960A" />
                <span className="text-[13px] font-black text-[#92620A]">報告募集中</span>
              </div>
              <p className="text-[13px] font-bold text-[#111] leading-snug">
                {unreported.map((e) => seriesName(e.gachaId)).join('・')}は、まだ在庫情報がありません。
              </p>
              <p className="text-[11px] text-[#999] mt-0.5">
                {canPost ? '最初の報告で、近くの人を助けよう。' : '近くにいる人が最初の報告者になれます。'}
              </p>
              {canPost && (
                <button onClick={() => navigateTo('report_flow')}
                  className="mt-2.5 w-full py-2.5 rounded-full font-black text-[13px] flex items-center justify-center gap-1.5"
                  style={{ background: '#FFCD31', color: '#111' }}>
                  <Flag size={13} />最初に在庫を報告する
                </button>
              )}
            </div>
          )}

          {/* お気に入りの在庫情報が一切ない店 */}
          {favEntries.length === 0 && (
            <div className="px-5 py-4" style={{ borderTop: `1px solid ${DIV}` }}>
              <p className="text-[13px] font-bold text-[#999]">お気に入りの在庫報告はまだありません</p>
              <p className="text-[11px] text-[#BBB] mt-0.5">近くにいるなら、最初の報告者になろう</p>
            </div>
          )}

          {/* Q&A */}
          <div style={{ borderTop: `1px solid ${DIV}` }}>
            <QASection spotId={spot.id} />
          </div>
        </div>

        {/* フッター（固定・位置ゲート） */}
        <div className="flex-shrink-0 px-4 pt-3 pb-7" style={{ borderTop: `1.5px solid #EDE9D8` }}>
          {canPost ? (
            <div className="flex gap-2.5">
              <button className="flex-1 py-3 rounded-full font-black text-[14px]"
                style={{ background: '#F5F2E8', color: '#555' }} onClick={() => navigateTo('report_flow')}>
                在庫を報告
              </button>
              <button className="flex-1 py-3 rounded-full font-black text-[14px]"
                style={{ background: '#FFCD31', color: '#111' }} onClick={() => navigateTo('pull_flow')}>
                引いた！
              </button>
            </div>
          ) : !locationGranted ? (
            <button className="w-full py-3 rounded-full font-black text-[14px] flex items-center justify-center gap-2"
              style={{ background: '#FFCD31', color: '#111' }} onClick={() => setLocationGranted(true)}>
              <MapPin size={15} />位置情報をオンにして報告
            </button>
          ) : (
            <div className="flex items-center justify-center gap-1.5 py-2 text-[12px] text-[#AAA]">
              <Lock size={13} />近くにいないと投稿できません（{formatDistance(dist)}）
            </div>
          )}
        </div>
      </div>
    </>
  );
}
