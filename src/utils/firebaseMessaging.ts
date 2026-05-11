import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { getToken, onMessage, Messaging } from 'firebase/messaging';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let messaging: Messaging | null = null;
let messageListenerSetup = false;

export const initializeFCM = async (): Promise<Messaging | null> => {
  try {
    const { getMessaging, isSupported } = await import('firebase/messaging');
    const supported = await isSupported();
    if (supported) {
      messaging = getMessaging(app);
      return messaging;
    }
  } catch (error) {
    console.log('Firebase messaging not supported:', error);
  }
  return null;
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!messaging) {
    await initializeFCM();
  }

  if (!messaging) {
    console.warn('Messaging not supported');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Error requesting permission:', error);
    return false;
  }
};

export const getFCMToken = async (): Promise<string | null> => {
  if (!messaging) {
    await initializeFCM();
  }

  if (!messaging) return null;

  try {
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    return token;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
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

export const setupForegroundListener = (onMessageCallback: (payload: any) => void): void => {
  if (messageListenerSetup || !messaging) return;

  onMessage(messaging, (payload) => {
    console.log('Foreground message received:', payload);
    onMessageCallback(payload);
  });
  messageListenerSetup = true;
};

export const showLocalNotification = (title: string, body: string, icon?: string): void => {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  new Notification(title, {
    body,
    icon: icon || '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'todolist-notification',
    requireInteraction: false,
  });
};

interface Task {
  id: string;
  title: string;
  status: string;
  dueDate: string;
  dueTime: string;
  startDate: string | null;
  startTime: string;
}

interface Plan {
  id: string;
  title: string;
  status: string;
}

export const checkAndNotify = (tasks: Task[], plans: Plan[]): void => {
  const now = new Date();

  const taskStatuses = tasks
    .filter(t => t.status !== 'completed')
    .map(t => {
      const notifications: string[] = [];

      if (t.startDate && t.startTime && t.startDate === formatDate(now)) {
        const startH = parseInt(t.startTime.split(':')[0]);
        const startM = parseInt(t.startTime.split(':')[1]);
        const startTime = now.getHours() * 60 + now.getMinutes();
        const taskStart = startH * 60 + startM;
        const diff = taskStart - startTime;

        if (diff <= 5 && diff >= 0) {
          notifications.push(`Start: ${t.title} ${diff === 0 ? 'now' : `in ${diff} min`}`);
        }
      }

      if (t.dueDate && t.dueTime && t.dueDate === formatDate(now)) {
        const dueH = parseInt(t.dueTime.split(':')[0]);
        const dueM = parseInt(t.dueTime.split(':')[1]);
        const nowTime = now.getHours() * 60 + now.getMinutes();
        const taskDue = dueH * 60 + dueM;
        const diff = taskDue - nowTime;

        if (diff <= 5 && diff >= 0) {
          notifications.push(`${t.title} due ${diff === 0 ? 'now' : `in ${diff} min`}`);
        }

        if (diff < 0) {
          notifications.push(`${t.title} overdue!`);
        }
      }

      return { task: t, notifications };
    });

  for (const { task, notifications } of taskStatuses) {
    for (const notif of notifications) {
      const key = `${task.id}-${notif}`;
      if (!sessionStorage.getItem(key)) {
        showLocalNotification(
          notif.includes('overdue') ? 'Task Overdue!' : 'TodoList Reminder',
          notif
        );
        sessionStorage.setItem(key, 'true');
      }
    }
  }

  for (const plan of plans) {
    if (plan.status === 'at_risk') {
      const key = `plan-${plan.id}`;
      if (!sessionStorage.getItem(key)) {
        showLocalNotification('Plan At Risk!', `"${plan.title}" needs attention`);
        sessionStorage.setItem(key, 'true');
      }
    }
  }
};

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}