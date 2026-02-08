import { useCallback, useRef, useEffect } from 'react';

const LOOP_INTERVAL = 3000; // Repeat sound every 3 seconds

export function useNotificationSound() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const isEnabledRef = useRef(true);
  const loopIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isLoopingRef = useRef(false);

  useEffect(() => {
    // Load preference from localStorage
    const saved = localStorage.getItem('notification-sound-enabled');
    isEnabledRef.current = saved !== 'false';
    
    return () => {
      // Cleanup on unmount
      if (loopIntervalRef.current) {
        clearInterval(loopIntervalRef.current);
      }
    };
  }, []);

  const playBeep = useCallback(() => {
    if (!isEnabledRef.current) return;

    try {
      // Create or resume AudioContext
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const ctx = audioContextRef.current;
      
      // Resume if suspended (browser autoplay policy)
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Create oscillator for notification beep
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Notification tone settings - more urgent sound
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5
      oscillator.frequency.setValueAtTime(1100, ctx.currentTime + 0.1); // C#6
      oscillator.frequency.setValueAtTime(880, ctx.currentTime + 0.2); // Back to A5

      // Envelope
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.02);
      gainNode.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.25);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);

      // Play second beep after a short pause
      setTimeout(() => {
        if (!audioContextRef.current) return;
        const ctx2 = audioContextRef.current;
        
        const osc2 = ctx2.createOscillator();
        const gain2 = ctx2.createGain();

        osc2.connect(gain2);
        gain2.connect(ctx2.destination);

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1100, ctx2.currentTime);
        osc2.frequency.setValueAtTime(1320, ctx2.currentTime + 0.1);

        gain2.gain.setValueAtTime(0, ctx2.currentTime);
        gain2.gain.linearRampToValueAtTime(0.4, ctx2.currentTime + 0.02);
        gain2.gain.linearRampToValueAtTime(0.4, ctx2.currentTime + 0.15);
        gain2.gain.linearRampToValueAtTime(0, ctx2.currentTime + 0.2);

        osc2.start(ctx2.currentTime);
        osc2.stop(ctx2.currentTime + 0.2);
      }, 350);

    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }, []);

  // Play once (single notification)
  const playNotificationSound = useCallback(() => {
    playBeep();
  }, [playBeep]);

  // Start looping sound until stopped
  const startLoopingSound = useCallback(() => {
    if (isLoopingRef.current) return; // Already looping
    
    isLoopingRef.current = true;
    
    // Play immediately
    playBeep();
    
    // Then repeat every LOOP_INTERVAL
    loopIntervalRef.current = setInterval(() => {
      if (isEnabledRef.current && isLoopingRef.current) {
        playBeep();
      }
    }, LOOP_INTERVAL);
  }, [playBeep]);

  // Stop looping sound
  const stopLoopingSound = useCallback(() => {
    isLoopingRef.current = false;
    if (loopIntervalRef.current) {
      clearInterval(loopIntervalRef.current);
      loopIntervalRef.current = null;
    }
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    isEnabledRef.current = enabled;
    localStorage.setItem('notification-sound-enabled', String(enabled));
    
    // Stop looping if sound is disabled
    if (!enabled) {
      stopLoopingSound();
    }
  }, [stopLoopingSound]);

  const isEnabled = useCallback(() => {
    return isEnabledRef.current;
  }, []);

  const isLooping = useCallback(() => {
    return isLoopingRef.current;
  }, []);

  return { 
    playNotificationSound, 
    startLoopingSound, 
    stopLoopingSound, 
    setEnabled, 
    isEnabled,
    isLooping 
  };
}
