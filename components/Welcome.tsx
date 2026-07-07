'use client';

import { useRouter } from 'next/navigation';

interface Props {
  onNext: () => void;
}

export function Welcome({ onNext }: Props) {
  const router = useRouter();
  return (
    <div className="flex flex-col min-h-screen bg-[#FFFEEF] px-6 pt-12">
      <div className="flex-1 flex flex-col items-center justify-center">
        <h1 className="text-4xl font-black text-[#F2B800] mb-4" style={{ letterSpacing: '-1px' }}>
          Mikke！
        </h1>
        <p className="text-[#666] text-center text-[15px] mb-12 leading-relaxed">
          ガチャの在庫情報をみんなでシェア。<br />
          お気に入りのIPが今どこで引けるか、すぐわかる。
        </p>
        <button
          onClick={onNext}
          className="w-full max-w-xs py-4 rounded-2xl font-black text-white text-[16px]"
          style={{ background: '#F2B800' }}
        >
          はじめる
        </button>
        <button
          onClick={() => router.push('/login')}
          className="mt-5 text-[13px] text-[#999] underline underline-offset-2"
        >
          ログインページに戻る
        </button>
      </div>
    </div>
  );
}
