'use client';

import { useState } from 'react';
import { useSunlit } from '@/lib/sunlit/store';
import { Check, Search, MapPin, Heart } from 'lucide-react';
import { GACHA_ITEMS, getStatusLabel, getStatusStyle } from '@/lib/sunlit/gacha-data';

/* ════════════════════════════════════════
   マスコット — 通常（虫眼鏡）
   ════════════════════════════════════════ */
function MascotSearch({ size = 100 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      {/* 耳 */}
      <circle cx="20" cy="26" r="13" fill="#FFCD31" />
      <circle cx="80" cy="26" r="13" fill="#FFCD31" />
      <circle cx="20" cy="26" r="7.5" fill="#F9A8C5" opacity="0.45" />
      <circle cx="80" cy="26" r="7.5" fill="#F9A8C5" opacity="0.45" />
      {/* 顔 */}
      <circle cx="50" cy="58" r="38" fill="#FFCD31" />
      {/* 目 */}
      <circle cx="37" cy="52" r="6" fill="#1A1A1A" />
      <circle cx="63" cy="52" r="6" fill="#1A1A1A" />
      <circle cx="39.5" cy="49.5" r="2.2" fill="white" />
      <circle cx="65.5" cy="49.5" r="2.2" fill="white" />
      {/* ほっぺ */}
      <circle cx="23" cy="64" r="7"  fill="#F9A8C5" opacity="0.38" />
      <circle cx="77" cy="64" r="7"  fill="#F9A8C5" opacity="0.38" />
      {/* 鼻 */}
      <ellipse cx="50" cy="62" rx="5" ry="3.5" fill="#FF8C69" />
      {/* 腕 */}
      <circle cx="80" cy="76" r="7"  fill="#FFCD31" />
      {/* 虫眼鏡 */}
      <circle cx="86" cy="83" r="13" fill="none" stroke="#1A1A1A" strokeWidth="3.5" />
      <circle cx="86" cy="83" r="8"  fill="white" opacity="0.2" />
      <line x1="95" y1="92" x2="100" y2="97" stroke="#1A1A1A" strokeWidth="4.5" strokeLinecap="round" />
    </svg>
  );
}

/* ════════════════════════════════════════
   マスコット — 嬉しい（両手上げ）
   ════════════════════════════════════════ */
function MascotHappy({ size = 100 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      {/* 耳 */}
      <circle cx="20" cy="26" r="13" fill="#FFCD31" />
      <circle cx="80" cy="26" r="13" fill="#FFCD31" />
      <circle cx="20" cy="26" r="7.5" fill="#F9A8C5" opacity="0.45" />
      <circle cx="80" cy="26" r="7.5" fill="#F9A8C5" opacity="0.45" />
      {/* 顔 */}
      <circle cx="50" cy="58" r="38" fill="#FFCD31" />
      {/* 目（大きめ、ハッピー） */}
      <circle cx="37" cy="51" r="7"   fill="#1A1A1A" />
      <circle cx="63" cy="51" r="7"   fill="#1A1A1A" />
      <circle cx="40" cy="48"  r="2.8" fill="white" />
      <circle cx="66" cy="48"  r="2.8" fill="white" />
      {/* ほっぺ（濃いめ） */}
      <circle cx="22" cy="63" r="8"  fill="#F9A8C5" opacity="0.45" />
      <circle cx="78" cy="63" r="8"  fill="#F9A8C5" opacity="0.45" />
      {/* 鼻 */}
      <ellipse cx="50" cy="61" rx="5" ry="3.5" fill="#FF8C69" />
      {/* スマイル */}
      <path d="M 37 70 Q 50 81 63 70" stroke="#1A1A1A" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* 左腕（上げる） */}
      <path d="M 18 60 Q 10 46 16 36" stroke="#FFCD31" strokeWidth="9" fill="none" strokeLinecap="round" />
      <circle cx="16" cy="36" r="5.5" fill="#FFCD31" />
      {/* 右腕（上げる） */}
      <path d="M 82 60 Q 90 46 84 36" stroke="#FFCD31" strokeWidth="9" fill="none" strokeLinecap="round" />
      <circle cx="84" cy="36" r="5.5" fill="#FFCD31" />
    </svg>
  );
}

/* ════════════════════════════════════════
   進捗ドット
   ════════════════════════════════════════ */
function ProgressDots({ step }: { step: 1 | 2 | 3 | 4 }) {
  return (
    <div className="flex items-center gap-1.5 justify-center">
      {([1, 2, 3, 4] as const).map((i) => (
        <div
          key={i}
          style={{
            borderRadius: 99,
            width: i === step ? 24 : 8,
            height: 8,
            background: i < step ? '#FFCD31' : i === step ? '#FFCD31' : '#DDD9CF',
            transition: 'width 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      ))}
    </div>
  );
}

/* ════════════════════════════════════════
   Step 0: 起動
   ════════════════════════════════════════ */
function Step0Launch({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col h-full mikke-screen-in" style={{ background: '#FFCD31' }}>
      {/* メインビジュアル */}
      <div className="flex-1 flex flex-col items-center justify-center pb-4">
        <div className="mikke-mascot-in">
          <MascotHappy size={180} />
        </div>
        <div className="mt-5 text-center">
          <p
            className="font-bold text-[#111] mb-1"
            style={{ fontSize: 13, letterSpacing: '0.12em', opacity: 0.42 }}
          >
            やっと！
          </p>
          <h1
            className="font-black text-[#111]"
            style={{ fontSize: 52, letterSpacing: '-1.5px', lineHeight: 1 }}
          >
            Mikke!
          </h1>
          <p className="text-sm text-[#111] mt-2.5" style={{ opacity: 0.5 }}>
            ガチャの在庫、リアルタイムで見つける
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="flex-shrink-0 px-6 pb-14">
        <button className="mikke-btn-dark" onClick={onNext}>
          はじめる
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   Step 1: IP（推し）選択 — ※種別選択は撤去（MVPはガチャガチャのみ）
   ════════════════════════════════════════ */
const ALL_IPS = [
  'ポケモン', 'ワンピース', 'ドラゴンボール', 'ハイキュー!!',
  '鬼滅の刃', 'チェンソーマン', 'ジョジョ', '呪術廻戦',
  'SPY×FAMILY', '進撃の巨人', 'ブルーロック', 'ナルト',
  'リゼロ', 'ゆるキャン', 'プリキュア', 'ガンダム',
  'エヴァ', 'ハローキティ', 'ちいかわ', 'すみっコぐらし',
  'ポムポムプリン', 'シナモロール', 'リラックマ', 'スヌーピー',
];

function Step2IpSelect({ onNext }: { onNext: () => void }) {
  const { selectedIps, toggleIp } = useSunlit();
  const [search, setSearch] = useState('');
  const displayed = search ? ALL_IPS.filter((ip) => ip.includes(search)) : ALL_IPS;

  return (
    <div className="flex flex-col h-full bg-white mikke-screen-in">
      {/* ヘッダー */}
      <div className="flex-shrink-0 flex flex-col items-center px-6 pt-10 pb-2">
        <div className="mikke-mascot-in">
          <MascotSearch size={80} />
        </div>
        <div className="mt-3.5">
          <ProgressDots step={1} />
        </div>
        <h2
          className="font-black text-[#111] text-center mt-4"
          style={{ fontSize: 24, letterSpacing: '-0.5px' }}
        >
          好きなキャラクターは？
        </h2>
      </div>

      {/* 検索 */}
      <div className="flex-shrink-0 px-5 pt-3 pb-2">
        <div
          className="flex items-center gap-2.5 px-3.5 py-3 rounded-2xl"
          style={{ background: '#F5F2E8', border: '1.5px solid #EDE9D8' }}
        >
          <Search size={15} color="#BBB" />
          <input
            type="text"
            placeholder="キャラクターを検索"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none placeholder-[#CCC] text-[#111]"
          />
        </div>
      </div>

      {/* グリッド */}
      <div className="flex-1 overflow-y-auto px-4 pb-2">
        <div className="grid grid-cols-3 gap-2">
          {displayed.map((ip) => {
            const isSelected = selectedIps.includes(ip);
            return (
              <button
                key={ip}
                className="mikke-card relative py-3.5 px-1 text-xs font-bold text-center"
                data-selected={isSelected}
                onClick={() => toggleIp(ip)}
              >
                {isSelected && (
                  <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-[#111] flex items-center justify-center">
                    <Check size={8} color="white" strokeWidth={3} />
                  </span>
                )}
                <span style={{ color: isSelected ? '#111' : '#555' }}>{ip}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* CTA */}
      <div
        className="flex-shrink-0 px-5 pb-10 pt-3"
        style={{ borderTop: '1.5px solid #F0EFEC' }}
      >
        <div className="flex gap-3">
          <button className="mikke-btn-ghost flex-1" onClick={onNext}>
            飛ばす
          </button>
          <button
            className="mikke-btn-yellow"
            disabled={selectedIps.length === 0}
            onClick={onNext}
            style={{ flex: 2, boxShadow: selectedIps.length > 0 ? '0 5px 0 #C8960A' : 'none' }}
          >
            {selectedIps.length > 0 ? `次へ  (${selectedIps.length})` : '次へ'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   Step 2: お気に入りオンボーディング（選んだIPのガチャをハート＝コールドスタート解決）
   ════════════════════════════════════════ */
function Step2Favorites({ onNext }: { onNext: () => void }) {
  const { selectedIps, likedGachaItemIds, toggleGachaLike } = useSunlit();

  const matched = GACHA_ITEMS.filter((g) => selectedIps.includes(g.ipName));
  const items   = matched.length > 0
    ? matched
    : GACHA_ITEMS.filter((g) => g.status === 'on_sale').slice(0, 8); // 選んだIPが無ければ人気で代替
  const likedCount = items.filter((g) => likedGachaItemIds.has(g.id)).length;

  return (
    <div className="flex flex-col h-full bg-white mikke-screen-in">
      <div className="flex-shrink-0 flex flex-col items-center px-6 pt-10 pb-2">
        <div className="mikke-mascot-in"><MascotSearch size={80} /></div>
        <div className="mt-3.5"><ProgressDots step={2} /></div>
        <h2 className="font-black text-[#111] text-center mt-4" style={{ fontSize: 22, letterSpacing: '-0.5px', lineHeight: 1.3 }}>
          気になるガチャをハート
        </h2>
        <p className="text-[13px] text-[#AAA] mt-1.5 text-center">マップと新着が、あなた専用になります</p>
      </div>

      {/* グリッド（ハートでお気に入り即登録） */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="grid grid-cols-2 gap-3">
          {items.map((g) => {
            const liked = likedGachaItemIds.has(g.id);
            const stCfg = getStatusStyle(g.status);
            return (
              <div key={g.id} onClick={() => toggleGachaLike(g.id)}
                className="relative rounded-[18px] overflow-hidden active:scale-[0.97] transition-transform"
                style={{ aspectRatio: '3/4', cursor: 'pointer' }}>
                <div className="absolute inset-0" style={{ background: `linear-gradient(150deg, ${g.gradientFrom}, ${g.gradientTo})` }} />
                <div className="absolute top-2 left-2 right-2 flex items-start justify-between">
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black" style={{ background: stCfg.bg, color: stCfg.text }}>{getStatusLabel(g)}</span>
                  <span className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.28)' }}>
                    <Heart size={14} fill={liked ? '#FF4D4D' : 'none'} color={liked ? '#FF4D4D' : 'white'} />
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 px-2.5 pb-2.5 pt-8" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65), transparent)' }}>
                  <p className="text-[9px] font-bold mb-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>{g.ipName}</p>
                  <p className="text-[11px] font-black text-white leading-tight line-clamp-2">{g.seriesName}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-shrink-0 px-6 pb-10 pt-3" style={{ borderTop: '1.5px solid #F0EFEC' }}>
        <button className="mikke-btn-yellow" disabled={likedCount === 0} onClick={onNext}
          style={{ boxShadow: likedCount > 0 ? '0 5px 0 #C8960A' : 'none' }}>
          {likedCount > 0 ? `次へ  (${likedCount})` : 'ハートして次へ'}
        </button>
        <button onClick={onNext} className="w-full pt-3 text-xs text-[#CCC] font-medium text-center">あとで</button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   Step 3: 位置情報
   ════════════════════════════════════════ */
function Step3Location({ onNext }: { onNext: () => void }) {
  const { setLocationGranted } = useSunlit();
  return (
    <div className="flex flex-col h-full bg-white mikke-screen-in">
      {/* ヘッダー */}
      <div className="flex-shrink-0 flex flex-col items-center px-6 pt-10 pb-0">
        <div className="mikke-mascot-in">
          <MascotSearch size={80} />
        </div>
        <div className="mt-3.5">
          <ProgressDots step={3} />
        </div>
      </div>

      {/* コンテンツ */}
      <div className="flex-1 flex flex-col items-center justify-center px-7">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
          style={{ background: '#FFCD31', boxShadow: '0 4px 0 #C8960A' }}
        >
          <MapPin size={30} color="#111" strokeWidth={2.2} />
        </div>
        <h2
          className="font-black text-[#111] text-center mb-3"
          style={{ fontSize: 26, letterSpacing: '-0.5px', lineHeight: 1.3 }}
        >
          位置情報をオンにして、
          <br />今引けるガチャを近くで
          <br />見つけよう！
        </h2>
        <p className="text-[14px] text-[#999] text-center leading-relaxed">
          現在地は在庫マップの表示にのみ使用し、
          <br />第三者への提供は行いません。
        </p>
        <div
          className="mt-5 px-4 py-3 rounded-2xl w-full"
          style={{ background: '#FFFAE0', border: '1.5px solid #FFCD31' }}
        >
          <p className="text-[12px] text-[#666] text-center leading-relaxed">
            位置情報の許可を求めるダイアログが表示されます
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="flex-shrink-0 px-6 pb-12 space-y-3">
        <button className="mikke-btn-yellow" onClick={() => { setLocationGranted(true); onNext(); }}>
          現在地を使う
        </button>
        <button
          onClick={() => { setLocationGranted(false); onNext(); }}
          className="w-full py-3 text-[14px] font-semibold text-[#BBB] text-center"
        >
          あとで設定する
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   Step 4: 通知
   ════════════════════════════════════════ */
function Step4Notification({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col h-full bg-white mikke-screen-in">
      {/* ヘッダー */}
      <div className="flex-shrink-0 flex flex-col items-center px-6 pt-10 pb-0">
        <div className="mikke-mascot-in">
          <MascotSearch size={80} />
        </div>
        <div className="mt-3.5">
          <ProgressDots step={4} />
        </div>
      </div>

      {/* コンテンツ */}
      <div className="flex-1 flex flex-col items-center justify-center px-7">
        <h2
          className="font-black text-[#111] text-center mb-3"
          style={{ fontSize: 26, letterSpacing: '-0.5px', lineHeight: 1.3 }}
        >
          売り切れる前に動けるように、
          <br />通知設定をね！
        </h2>
        <p className="text-[14px] text-[#999] text-center leading-relaxed mb-6">
          お気に入りIPの入荷情報を
          <br />リアルタイムでお届けします。
        </p>

        {/* 通知プレビュー */}
        <div
          className="w-full rounded-2xl overflow-hidden"
          style={{
            background: '#1C1C1E',
            padding: '14px 16px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: '#FFCD31', boxShadow: '0 2px 0 #C8960A' }}
            >
              <span className="text-sm font-black text-[#111]">M</span>
            </div>
            <div className="pt-0.5">
              <p className="text-xs font-bold text-white">Mikke!</p>
              <p className="text-xs text-[#AEAEB2] mt-1 leading-snug">
                ポケモン ミニフィギュア vol.4 が近くで見つかりました
              </p>
            </div>
            <span className="text-[10px] text-[#555] ml-auto flex-shrink-0 pt-0.5">今</span>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="flex-shrink-0 px-6 pb-12 space-y-3">
        <button className="mikke-btn-yellow" onClick={onNext}>
          通知を受け取る
        </button>
        <button
          onClick={onNext}
          className="w-full py-3 text-[14px] font-semibold text-[#BBB] text-center"
        >
          あとで設定する
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   Step 5: サインアップ
   ════════════════════════════════════════ */
function Step5Signup({ onFinish }: { onFinish: () => void }) {
  return (
    <div className="flex flex-col h-full bg-white mikke-screen-in">
      <div className="flex-1 flex flex-col items-center justify-center px-7">
        <div className="mikke-mascot-in">
          <MascotHappy size={140} />
        </div>
        <h2
          className="font-black text-[#111] text-center mt-6 mb-3"
          style={{ fontSize: 26, letterSpacing: '-0.5px', lineHeight: 1.3 }}
        >
          アカウントを作って、
          <br />あなたの推し活を
          <br />記録しよう！
        </h2>
        <p className="text-[13px] text-[#CCC] text-center">プロフィールはあとから変更できます</p>
      </div>

      <div className="flex-shrink-0 px-6 pb-14 space-y-3">
        <button className="mikke-btn-yellow" onClick={onFinish}>
          アカウントを登録・ログイン
        </button>
        <button
          onClick={onFinish}
          className="w-full py-3 text-[14px] font-semibold text-[#CCC] text-center"
        >
          あとで設定する
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   メイン
   ════════════════════════════════════════ */
export function OnboardingFlow() {
  const { onboardingStep, nextOnboardingStep, finishOnboarding } = useSunlit();

  return (
    <div className="absolute inset-0 overflow-hidden">
      {onboardingStep === 0 && <Step0Launch onNext={nextOnboardingStep} />}
      {onboardingStep === 1 && <Step2IpSelect onNext={nextOnboardingStep} />}
      {onboardingStep === 2 && <Step2Favorites onNext={nextOnboardingStep} />}
      {onboardingStep === 3 && <Step3Location onNext={nextOnboardingStep} />}
      {onboardingStep === 4 && <Step4Notification onNext={nextOnboardingStep} />}
      {onboardingStep === 5 && <Step5Signup onFinish={finishOnboarding} />}
    </div>
  );
}
