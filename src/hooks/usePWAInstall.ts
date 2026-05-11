import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const checkInstalled = () => {
      if (window.matchMedia('(display-mode: standalone)').matches || 
          (window.navigator as any).standalone === true) {
        setIsInstalled(true);
      }
    };
    checkInstalled();

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
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
    console.log('Install clicked, deferredPrompt:', deferredPrompt, 'isInstallable:', isInstallable);
    
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || 
        (window.navigator as any).standalone === true) {
      alert('App is already installed!');
      return;
    }

    // If we have deferred prompt, use it
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
      setIsInstallable(false);
      return;
    }

    // Fallback: Try to check navigator.standalone directly
    const isCapable = !!(window.navigator as any).standalone || 
                   !!(window.matchMedia('(display-mode: standalone)').matches);
    
    // Direct prompt attempt - works on some browsers
    try {
      const p = (window as any).beforeInstallPrompt;
      if (p) {
        await p.prompt();
        const { outcome } = await p.userChoice;
        if (outcome === 'accepted') {
          setIsInstalled(true);
        }
        return;
      }
    } catch (e) {
      console.log('Direct prompt failed:', e);
    }

    // Show instructions
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('chrome') && !ua.includes('edg')) {
      // Chrome on desktop
      alert('In Chrome: Click the install icon in the address bar (right side of URL)');
    } else if (ua.includes('safari')) {
      alert('In Safari iOS: Tap Share button → Add to Home Screen');
    } else if (ua.includes('firefox')) {
      alert('In Firefox: Click the install icon in address bar or menu → Add Page → Homescreen');
    } else {
      alert('To install this app:\n1. Open browser menu\n2. Find "Add to Home Screen" or "Install App" option');
    }
  };

  const dismiss = () => {
    setDeferredPrompt(null);
  };

  return { isInstallable, isInstalled, install, dismiss };
}