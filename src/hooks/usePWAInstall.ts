import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let dialogState = false;
let listeners: (() => boolean)[] = [];

export function usePWAInstall() {
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || 
        (window.navigator as any).standalone === true) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e as BeforeInstallPromptEvent;
      // Auto-show dialog when browser is ready to install
      if (!dialogState && !isInstalled) {
        setTimeout(() => setShowInstallDialog(true), 100);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallDialog(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    setShowInstallDialog(dialogState);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isInstalled]);

  const showDialog = () => {
    dialogState = true;
    setShowInstallDialog(true);
  };

  const dismissDialog = () => {
    dialogState = false;
    setShowInstallDialog(false);
  };

  const confirmInstall = async () => {
    dialogState = false;
    
    if (!deferredPrompt) {
      setShowInstallDialog(false);
      return;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
    } catch (e) {
      console.error('Install failed:', e);
    }
    setShowInstallDialog(false);
  };

  return { showInstallDialog, isInstalled, showDialog, dismissDialog, confirmInstall };
}

export function triggerInstallDialog() {
  dialogState = true;
}