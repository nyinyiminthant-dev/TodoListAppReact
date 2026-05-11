import { useState, useEffect, useRef } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePWAInstall() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || 
        (window.navigator as any).standalone === true) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      promptRef.current = e as BeforeInstallPromptEvent;
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (isInstalled) {
      alert('App is already installed!');
      return;
    }

    const prompt = promptRef.current;

    if (prompt) {
      try {
        await prompt.prompt();
        const { outcome } = await prompt.userChoice;
        if (outcome === 'accepted') {
          setIsInstalled(true);
        }
        promptRef.current = null;
        setIsInstallable(false);
      } catch (e) {
        console.error('Install failed:', e);
      }
      return;
    }

    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('chrome') && !ua.includes('edg')) {
      alert('In Chrome: Click the install icon in the address bar (right side of URL)');
    } else if (ua.includes('safari') && ua.includes('iphone')) {
      alert('In Safari iOS: Tap Share button → Add to Home Screen');
    } else {
      alert('To install: Open browser menu → Add to Home Screen');
    }
  };

  return { isInstallable, isInstalled, install };
}