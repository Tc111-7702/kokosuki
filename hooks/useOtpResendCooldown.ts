'use client';

import { useCallback, useEffect, useState } from 'react';

export function useOtpResendCooldown(seconds = 30, startReady = false) {
  const [remaining, setRemaining] = useState(startReady ? 0 : seconds);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = window.setInterval(() => {
      setRemaining((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [remaining]);

  const restart = useCallback(() => {
    setRemaining(seconds);
  }, [seconds]);

  return { remaining, canResend: remaining <= 0, restart };
}
