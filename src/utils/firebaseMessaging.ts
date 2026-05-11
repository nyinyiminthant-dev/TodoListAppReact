import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { auth } from './firebase';

type NotificationStatus = 'granted' | 'denied' | 'blocked' | 'unsupported';

export const requestNotificationPermission = async (): Promise<NotificationStatus> => {
  if (!('Notification' in window)) {
    return 'unsupported';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      return 'granted';
    }
    return 'blocked';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return 'denied';
  }
};

export const getFCMToken = async (): Promise<string | null> => {
  return 'browser-notification-enabled';
};

export const saveTokenToUser = async (token: string): Promise<void> => {
  if (!auth.currentUser) return;

  try {
    const userRef = doc(db, 'users', auth.currentUser.uid);
    await setDoc(userRef, { 
      fcmToken: token,
      notificationsEnabled: true 
    }, { merge: true });
  } catch (error) {
    console.error('Error saving token:', error);
  }
};

export const removeTokenFromUser = async (): Promise<void> => {
  if (!auth.currentUser) return;

  try {
    const userRef = doc(db, 'users', auth.currentUser.uid);
    await setDoc(userRef, { 
      fcmToken: null,
      notificationsEnabled: false 
    }, { merge: true });
  } catch (error) {
    console.error('Error removing token:', error);
  }
};