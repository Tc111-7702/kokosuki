'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { Screen, FeedItem, Spot, FeedFilter } from './types';
import { MOCK_FEED, MOCK_SPOTS } from './mock-data';
import { SPOT_QA_SEED } from './map-data';
import type { QAItem } from './map-data';

export type OnboardingStep = 0 | 1 | 2 | 3 | 4 | 5; // 起動/種別選択/IP選択/位置情報/通知/サインアップ
export type HomeTab = 'new' | 'community' | 'favorites';
export interface UserVoice { id: string; userName: string; text: string; createdAt: string }

interface MikkeState {
  isOnboarded: boolean;
  onboardingStep: OnboardingStep;
  selectedIps: string[];
  screen: Screen;
  prevScreen: Screen;
  feedItems: FeedItem[];
  spots: Spot[];
  feedFilter: FeedFilter;
  selectedSpotId: string | null;
  selectedFeedItemId: string | null;
  selectedGachaItemId: string | null;
  selectedUserId: string | null;
  likedGachaItemIds: Set<string>;
  locationGranted: boolean;
  rankings: Record<string, string[]>; // gachaId → ほしい順のアイテム名配列
  homeTab: HomeTab;
  userVoices: Record<string, UserVoice[]>; // gachaId → 自分が投稿した楽しみの声
  spotQA: Record<string, QAItem[]>;        // spotId → その店のQ&A
}

interface MikkeActions {
  nextOnboardingStep: () => void;
  toggleIp: (ip: string) => void;
  finishOnboarding: () => void;
  navigateTo: (screen: Screen) => void;
  goBack: () => void;
  setFeedFilter: (f: FeedFilter) => void;
  selectSpot: (id: string | null) => void;
  selectFeedItem: (id: string | null) => void;
  selectGachaItem: (id: string | null) => void;
  selectUser: (id: string | null) => void;
  toggleLike: (feedItemId: string) => void;
  toggleGachaLike: (id: string) => void;
  setLocationGranted: (granted: boolean) => void;
  toggleRank: (gachaId: string, itemName: string) => void;
  setHomeTab: (tab: HomeTab) => void;
  addVoice: (gachaId: string, text: string) => void;
  addQuestion: (spotId: string, text: string) => void;
  addAnswer: (spotId: string, questionId: string, text: string) => void;
}

type MikkeContextValue = MikkeState & MikkeActions;

const MikkeContext = createContext<MikkeContextValue | null>(null);

export function SunlitProvider({ children }: { children: ReactNode }) {
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>(0);
  const [selectedIps, setSelectedIps] = useState<string[]>([]);
  const [screen, setScreen] = useState<Screen>('home');
  const [prevScreen, setPrevScreen] = useState<Screen>('home');
  const [feedItems, setFeedItems] = useState<FeedItem[]>(MOCK_FEED);
  const [spots] = useState<Spot[]>(MOCK_SPOTS);
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('all');
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [selectedFeedItemId, setSelectedFeedItemId]   = useState<string | null>(null);
  const [selectedGachaItemId, setSelectedGachaItemId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId]           = useState<string | null>(null);
  const [likedGachaItemIds, setLikedGachaItemIds]     = useState<Set<string>>(new Set(['g1', 'g4']));
  const [locationGranted, setLocationGranted]         = useState(true);
  const [rankings, setRankings]                       = useState<Record<string, string[]>>({});
  const [homeTab, setHomeTab]                         = useState<HomeTab>('new');
  const [userVoices, setUserVoices]                   = useState<Record<string, UserVoice[]>>({});
  const [spotQA, setSpotQA]                           = useState<Record<string, QAItem[]>>(
    () => JSON.parse(JSON.stringify(SPOT_QA_SEED)),
  );

  const addQuestion = useCallback((spotId: string, text: string) => {
    const t = text.trim();
    if (!t) return;
    const q: QAItem = { id: `q_${Date.now()}`, userName: 'たいよう', text: t, createdAt: new Date().toISOString(), answers: [] };
    setSpotQA((prev) => ({ ...prev, [spotId]: [q, ...(prev[spotId] ?? [])] }));
  }, []);

  const addAnswer = useCallback((spotId: string, questionId: string, text: string) => {
    const t = text.trim();
    if (!t) return;
    setSpotQA((prev) => ({
      ...prev,
      [spotId]: (prev[spotId] ?? []).map((q) =>
        q.id === questionId
          ? { ...q, answers: [...q.answers, { id: `a_${Date.now()}`, userName: 'たいよう', text: t, createdAt: new Date().toISOString() }] }
          : q,
      ),
    }));
  }, []);

  const addVoice = useCallback((gachaId: string, text: string) => {
    const t = text.trim();
    if (!t) return;
    const voice: UserVoice = {
      id: `uv_${Date.now()}`, userName: 'たいよう', text: t, createdAt: new Date().toISOString(),
    };
    setUserVoices((prev) => ({ ...prev, [gachaId]: [voice, ...(prev[gachaId] ?? [])] }));
  }, []);

  const toggleRank = useCallback((gachaId: string, itemName: string) => {
    setRankings((prev) => {
      const cur  = prev[gachaId] ?? [];
      const next = cur.includes(itemName)
        ? cur.filter((n) => n !== itemName)   // 解除（以降は自動で繰り上がる）
        : [...cur, itemName];                 // タップ順に追加
      return { ...prev, [gachaId]: next };
    });
  }, []);

  const nextOnboardingStep = useCallback(() => {
    setOnboardingStep((s) => Math.min(s + 1, 5) as OnboardingStep);
  }, []);

  const toggleIp = useCallback((ip: string) => {
    setSelectedIps((prev) =>
      prev.includes(ip) ? prev.filter((i) => i !== ip) : [...prev, ip]
    );
  }, []);

  const finishOnboarding = useCallback(() => {
    setIsOnboarded(true);
  }, []);

  const navigateTo = useCallback((s: Screen) => {
    setScreen((prev) => { setPrevScreen(prev); return s; });
  }, []);

  const goBack = useCallback(() => {
    setScreen(prevScreen);
  }, [prevScreen]);

  const selectSpot = useCallback((id: string | null) => {
    setSelectedSpotId(id);
    if (id) setScreen('spot_detail');
    else setScreen('map');
  }, []);

  const selectFeedItem = useCallback((id: string | null) => {
    setSelectedFeedItemId(id);
    if (id) setScreen('feed_detail');
  }, []);

  const selectGachaItem = useCallback((id: string | null) => {
    setSelectedGachaItemId(id);
    if (id) navigateTo('gacha_detail');
  }, [navigateTo]);

  const selectUser = useCallback((id: string | null) => {
    setSelectedUserId(id);
    if (id) navigateTo('user_profile');
  }, [navigateTo]);

  const toggleGachaLike = useCallback((id: string) => {
    setLikedGachaItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleLike = useCallback((feedItemId: string) => {
    setFeedItems((prev) =>
      prev.map((item) =>
        item.id === feedItemId
          ? { ...item, liked: !item.liked, likeCount: item.liked ? item.likeCount - 1 : item.likeCount + 1 }
          : item
      )
    );
  }, []);

  return (
    <MikkeContext.Provider
      value={{
        isOnboarded, onboardingStep, selectedIps,
        screen, prevScreen, feedItems, spots, feedFilter,
        selectedSpotId, selectedFeedItemId, selectedGachaItemId, selectedUserId, likedGachaItemIds,
        locationGranted, rankings, homeTab, userVoices, spotQA,
        nextOnboardingStep, toggleIp, finishOnboarding,
        navigateTo, goBack, setFeedFilter,
        selectSpot, selectFeedItem, selectGachaItem, selectUser,
        toggleLike, toggleGachaLike, setLocationGranted, toggleRank,
        setHomeTab, addVoice, addQuestion, addAnswer,
      }}
    >
      {children}
    </MikkeContext.Provider>
  );
}

export function useSunlit() {
  const ctx = useContext(MikkeContext);
  if (!ctx) throw new Error('useSunlit must be used within SunlitProvider');
  return ctx;
}
