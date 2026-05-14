import { useState, useEffect, useCallback } from 'react';

interface RegistrationEvent extends Event {
  readonly registration: ServiceWorkerRegistration;
}

export function usePWAUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const refreshApp = useCallback(() => {
    setIsUpdating(true);
    window.location.reload();
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const checkForUpdate = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        
        registration.addEventListener('updatefound', (event: RegistrationEvent) => {
          const newWorker = event.registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
            }
          });
        });

        if (registration.active && !navigator.serviceWorker.controller) {
          return;
        }

        const updateFound = await navigator.serviceWorker.getRegistration();
        if (updateFound) {
          await updateFound.update();
        }
      } catch (error) {
        console.error('SW update check failed:', error);
      }
    };

    checkForUpdate();
  }, []);

  const dismissUpdate = useCallback(() => {
    setUpdateAvailable(false);
  }, []);

  return { updateAvailable, isUpdating, refreshApp, dismissUpdate };
}