import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface Window {
    pwaDeferredPrompt: BeforeInstallPromptEvent | null;
  }
}

export function usePWAInstall() {
  const [showDialog, setShowDialog] = useState(false);

  const showDialogFn = useCallback(() => {
    setShowDialog(true);
  }, []);

  const dismissDialog = useCallback(() => {
    setShowDialog(false);
  }, []);

  const confirmInstall = useCallback(async () => {
    const prompt = window.pwaDeferredPrompt;
    if (prompt) {
      try {
        await prompt.prompt();
        const { outcome } = await prompt.userChoice;
        if (outcome === 'accepted') {
          console.log('App installed');
        }
      } catch (e) {
        console.error('Install failed:', e);
      }
    }
    setShowDialog(false);
  }, []);

  return { showInstallDialog: showDialog, showDialog: showDialogFn, dismissDialog, confirmInstall };
}