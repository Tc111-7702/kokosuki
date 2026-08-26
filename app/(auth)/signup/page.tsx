'use client';

import { useState, useCallback } from 'react';
import { Welcome }         from '@/components/Welcome';
import { IpChoose }        from '@/components/IpChoose';
import { GachaHeart }      from '@/components/GachaHeart';
import { Location }        from '@/components/Location';
import { Register }        from '@/components/Register';

type Step = 'welcome' | 'character' | 'gacha' | 'location' | 'register';

const PREV: Partial<Record<Step, Step>> = {
  location:  'welcome',
  character: 'location',
  gacha:     'character',
  register:  'gacha',
};

export default function SignupPage() {
  const [step, setStep] = useState<Step>('welcome');
  const [selectedIps, setSelectedIps] = useState<string[]>([]);
  const [likedGachaIds, setLikedGachaIds] = useState<string[]>([]);

  const goBack = () => { const p = PREV[step]; if (p) setStep(p); };
  const toggleIp = (ip: string) =>
    setSelectedIps((prev) => prev.includes(ip) ? prev.filter((i) => i !== ip) : [...prev, ip]);
  const toggleGacha = (id: string) =>
    setLikedGachaIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  // 選択中IP配下のガチャだけにハートを剪定（IP選択に戻って外したIPのハートが残る不具合の是正）
  const pruneLiked = useCallback((validIds: Set<string>) => {
    setLikedGachaIds((prev) => {
      const next = prev.filter((id) => validIds.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, []);

  if (step === 'welcome')      return <Welcome onNext={() => setStep('location')} />;
  if (step === 'location')     return <Location onAllow={() => setStep('character')} onSkip={() => setStep('character')} onBack={goBack} />;
  if (step === 'character')    return <IpChoose selected={selectedIps} onToggle={toggleIp} onNext={() => setStep('gacha')} onBack={goBack} />;
  if (step === 'gacha')        return <GachaHeart liked={likedGachaIds} selectedIps={selectedIps} onToggle={toggleGacha} onPrune={pruneLiked} onNext={() => setStep('register')} onBack={goBack} />;
  return <Register likedGachaIds={likedGachaIds} onBack={goBack} />;
}
