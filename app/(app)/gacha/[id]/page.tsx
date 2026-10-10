'use client';

import { useParams, useRouter } from 'next/navigation';
import { GachaDetailView } from '@/components/GachaDetailView';

// 直リンク（共有URL等で /gacha/[id] に直接アクセス）用のページ。
// アプリ内の遷移は GachaDetailProvider のオーバーレイ（useGachaDetail().openGacha）を使い、
// こちらはフォールバックのフルページ表示。閉じる（戻る）は履歴を1つ戻す。
export default function GachaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  return <GachaDetailView gachaId={id} onClose={() => router.back()} />;
}
