import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let showDialogState = false;
let listeners: ((show: boolean) => void)[] = [];

export function usePWAInstall() {
  const [showInstallDialog, setShowInstallDialog] = useState(showDialogState);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || 
        (window.navigator as any).standalone === true) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e as BeforeInstallPromptEvent;
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      showDialogState = false;
      listeners.forEach(fn => fn(false));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    listeners.push(setShowInstallDialog);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      listeners = listeners.filter(fn => fn !== setShowInstallDialog);
    };
  }, []);

  const showDialog = () => {
    if (isInstalled) return;
    showDialogState = true;
    setShowInstallDialog(true);
    listeners.forEach(fn => fn(true));
  };

  const dismissDialog = () => {
    showDialogState = false;
    setShowInstallDialog(false);
    listeners.forEach(fn => fn(false));
  };

  const confirmInstall = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsInstalled(true);
        }
      } catch (e) {
        console.error('Install failed:', e);
      }
    }
    showDialogState = false;
    setShowInstallDialog(false);
    listeners.forEach(fn => fn(false));
  };

  return { showInstallDialog, isInstalled, showDialog, dismissDialog, confirmInstall };
}

export function triggerInstallDialog() {
  showDialogState = true;
  listeners.forEach(fn => fn(true));
}