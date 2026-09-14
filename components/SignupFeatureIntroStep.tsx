'use client';

import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import discoverImg from '@/components/ui/assets/signup-feature-discover.png';
import mapImg from '@/components/ui/assets/signup-feature-map.png';
import shareImg from '@/components/ui/assets/login-service-intro.png';
import { loginDisplayFont } from '@/lib/loginFonts';

type Slide = {
  image: { src: string; width: number; height: number };
  titleBefore: string;
  titleHighlight: string;
  titleAfter: string;
  subtitle: string;
};

const SLIDES: Slide[] = [
  {
    image: discoverImg,
    titleBefore: 'ココスキで',
    titleHighlight: '好き',
    titleAfter: 'を発見！',
    subtitle: '新作をチェックしてお気に入りに',
  },
  {
    image: mapImg,
    titleBefore: 'ココスキで',
    titleHighlight: '行き先',
    titleAfter: 'を決める！',
    subtitle: 'お気に入りの取扱情報を、マップで確認',
  },
  {
    image: shareImg,
    titleBefore: 'ココスキで',
    titleHighlight: 'ガチャ活',
    titleAfter: 'を共有！',
    subtitle: 'お店の状況も、引いた記録もかんたんに',
  },
];

function SignupFeaturePageIndicator({ activeIndex, total }: { activeIndex: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 h-2" aria-label={`${activeIndex + 1} / ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`block rounded-full transition-all duration-300 ease-out ${
            i === activeIndex ? 'w-6 h-2 bg-[#FFCD31]' : 'w-2 h-2 bg-[#FFCD31]/30'
          }`}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

interface Props {
  initialStep?: number;
  onBack: () => void;
  onComplete: () => void;
}

/** 新規登録: ガチャ選択後の3画面機能紹介 */
export function SignupFeatureIntroStep({ initialStep = 0, onBack, onComplete }: Props) {
  const [step, setStep] = useState(initialStep);
  const slide = SLIDES[step] ?? SLIDES[0];

  const handleBack = () => {
    if (step > 0) {
      setStep((current) => current - 1);
      return;
    }
    onBack();
  };

  const handleContinue = () => {
    if (step >= SLIDES.length - 1) {
      onComplete();
      return;
    }
    setStep((current) => current + 1);
  };

  return (
    <div
      className={`signup-feature-intro ${loginDisplayFont.className} flex flex-col min-h-[100dvh] bg-white px-6 pt-6 pb-8 max-md:pb-6 md:pb-10`}
    >
      <div className="w-full max-w-[360px] md:max-w-[400px] mx-auto flex flex-col flex-1 min-h-0">
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center md:justify-start md:pt-4">
          <div className="relative w-full flex items-center justify-center shrink-0">
            <button
              type="button"
              onClick={handleBack}
              className="absolute left-0 bottom-full -ml-1 mb-2 md:mb-0 md:translate-y-5 p-1 active:opacity-60 disabled:opacity-50 z-10"
              aria-label="戻る"
            >
              <ChevronLeft size={28} strokeWidth={2} color="#111111" />
            </button>
            <img
              src={slide.image.src}
              alt=""
              width={slide.image.width}
              height={slide.image.height}
              className="block w-full max-w-[220px] md:max-w-[260px] h-auto"
              style={{ objectFit: 'contain' }}
            />
          </div>

          <div className="w-full mt-6 md:mt-4 flex flex-col items-center text-center shrink-0">
            <h1 className="signup-feature-intro-title text-[19px] md:text-[24px] font-bold leading-snug text-[#111111]">
              {slide.titleBefore}
              <span className="text-[#FFCD31]">{slide.titleHighlight}</span>
              {slide.titleAfter}
            </h1>
            <p className="mt-3 text-[12px] md:text-[14px] font-bold leading-relaxed text-[#64748b]">
              {slide.subtitle}
            </p>
          </div>
        </div>

        <div className="w-full shrink-0 mt-6 md:mt-8 max-md:-translate-y-12 flex flex-col items-center gap-5 md:gap-6">
          <SignupFeaturePageIndicator activeIndex={step} total={SLIDES.length} />
          <button
            type="button"
            onClick={handleContinue}
            className="login-otp-send-btn w-full h-[48px] md:h-[52px] rounded-full text-[16px] font-bold text-white active:opacity-80"
          >
            つづける
          </button>
        </div>
      </div>
    </div>
  );
}
