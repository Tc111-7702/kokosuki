'use client';

import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { StoreDetailView } from '@/components/StoreDetailView';

export default function StorePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const openReplyType = searchParams.get('type') === 'stock' ? 'stock' : 'post';

  return (
    <StoreDetailView
      spotId={params.id as string}
      contentSearch={searchParams.get('contentSearch') ?? ''}
      noFilter={searchParams.get('noFilter') === '1'}
      openReplyId={searchParams.get('openReply')}
      openReplyType={openReplyType}
      openReviewId={searchParams.get('openReview')}
      onClose={() => router.back()}
    />
  );
}
