'use client';

import { useState } from 'react';
import { Welcome } from './steps/Welcome';
import { CharacterChoose } from './steps/CharacterChoose';
import { GachaHeart } from './steps/GachaHeart';
import { Location } from './steps/Location';
import { Notification } from './steps/Notification';
import { Register } from './steps/Register';

type Step = 'welcome' | 'character' | 'gacha' | 'location' | 'notification' | 'register';

const PREV: Partial<Record<Step, Step>> = {
  character:    'welcome',
  gacha:        'character',
  location:     'gacha',
  notification: 'location',
  register:     'notification',
};

export default function SignupClient() {
  const [step, setStep] = useState<Step>('welcome');
  const [selectedIps, setSelectedIps] = useState<string[]>([]);
  const [likedGachaIds, setLikedGachaIds] = useState<string[]>([]);

  const goBack = () => { const p = PREV[step]; if (p) setStep(p); };

  const toggleIp = (ip: string) =>
    setSelectedIps((prev) => prev.includes(ip) ? prev.filter((i) => i !== ip) : [...prev, ip]);
  const toggleGacha = (id: string) =>
    setLikedGachaIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);

  if (step === 'welcome')      return <Welcome onNext={() => setStep('character')} />;
  if (step === 'character')    return <CharacterChoose selected={selectedIps} onToggle={toggleIp} onNext={() => setStep('gacha')} onBack={goBack} />;
  if (step === 'gacha')        return <GachaHeart liked={likedGachaIds} onToggle={toggleGacha} onNext={() => setStep('location')} onBack={goBack} />;
  if (step === 'location')     return <Location onAllow={() => setStep('notification')} onSkip={() => setStep('notification')} onBack={goBack} />;
  if (step === 'notification') return <Notification onAllow={() => setStep('register')} onSkip={() => setStep('register')} onBack={goBack} />;
  return <Register favoriteIps={selectedIps} likedGachaIds={likedGachaIds} onBack={goBack} />;
}
