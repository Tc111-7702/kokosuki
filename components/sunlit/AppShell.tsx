'use client';

import { useSunlit } from '@/lib/sunlit/store';
import { BottomNav } from './BottomNav';
import { OnboardingFlow } from './OnboardingFlow';
import { HomeScreen } from './screens/HomeScreen';
import { HomeMapScreen } from './screens/HomeMapScreen';
import { MyPageScreen } from './screens/MyPageScreen';
import { SpotDetailSheet } from './screens/SpotDetailSheet';
import { FeedDetailScreen } from './screens/FeedDetailScreen';
import { GachaDetailScreen } from './screens/GachaDetailScreen';
import { ReportFlowScreen } from './screens/ReportFlowScreen';
import { PullFlowScreen } from './screens/PullFlowScreen';
import { UserProfileScreen } from './screens/UserProfileScreen';

export function AppShell() {
  const { isOnboarded, screen } = useSunlit();

  const showBottomNav = !['feed_detail', 'gacha_detail', 'report_flow', 'pull_flow', 'result_modal', 'user_profile'].includes(screen);

  return (
    <div
      className="relative flex flex-col bg-[#F7F6F3] overflow-hidden"
      style={{
        width: '390px',
        height: '844px',
        maxHeight: '100dvh',
        borderRadius: '44px',
        boxShadow: '0 24px 80px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.06)',
      }}
    >
      {!isOnboarded ? (
        <OnboardingFlow />
      ) : (
        <>
          <div className="flex-1 relative overflow-hidden">
            {/* マップは常時マウント */}
            <div className={`absolute inset-0 ${screen === 'map' || screen === 'spot_detail' ? '' : 'invisible pointer-events-none'}`}>
              <HomeMapScreen />
            </div>

            {screen === 'home'        && <HomeScreen />}
            {screen === 'mypage'      && <MyPageScreen />}
            {screen === 'feed_detail' && <FeedDetailScreen />}

            {screen === 'spot_detail'  && <SpotDetailSheet />}
            {screen === 'gacha_detail' && <GachaDetailScreen />}
            {screen === 'report_flow'  && <ReportFlowScreen />}
            {screen === 'pull_flow'    && <PullFlowScreen />}
            {screen === 'user_profile' && <UserProfileScreen />}
          </div>

          {showBottomNav && <BottomNav />}
        </>
      )}
    </div>
  );
}
