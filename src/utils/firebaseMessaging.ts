import { db } from './firebase';
import { doc, setDoc } from 'firebase/firestore';
import { auth } from './firebase';

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.warn('Notifications not supported in this browser');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

export const getFCMToken = async (): Promise<string | null> => {
  return 'browser-notification';
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
  console.log('Using native notifications, no foreground handler');
};

export const showLocalNotification = (title: string, body: string, icon?: string): void => {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  new Notification(title, {
    body,
    icon: icon || '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'todolist-notification',
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

  for (const task of tasks) {
    if (task.status === 'completed') continue;

    if (task.startDate && task.startTime && task.startDate === formatDate(now)) {
      const startH = parseInt(task.startTime.split(':')[0]);
      const startM = parseInt(task.startTime.split(':')[1]);
      const startTime = now.getHours() * 60 + now.getMinutes();
      const taskStart = startH * 60 + startM;
      const diff = taskStart - startTime;

      if (diff <= 5 && diff >= 0) {
        const key = `start-${task.id}`;
        if (!sessionStorage.getItem(key)) {
          showLocalNotification(
            'Start Reminder',
            diff === 0 ? `Time to start: ${task.title}` : `Starting in ${diff} min: ${task.title}`
          );
          sessionStorage.setItem(key, 'true');
        }
      }
    }

    if (task.dueDate && task.dueTime && task.dueDate === formatDate(now)) {
      const dueH = parseInt(task.dueTime.split(':')[0]);
      const dueM = parseInt(task.dueTime.split(':')[1]);
      const nowTime = now.getHours() * 60 + now.getMinutes();
      const taskDue = dueH * 60 + dueM;
      const diff = taskDue - nowTime;

      if (diff <= 5 && diff >= 0) {
        const key = `due-${task.id}`;
        if (!sessionStorage.getItem(key)) {
          showLocalNotification(
            'Due Reminder',
            diff === 0 ? `Due now: ${task.title}` : `Due in ${diff} min: ${task.title}`
          );
          sessionStorage.setItem(key, 'true');
        }
      }

      if (diff < 0) {
        const key = `overdue-${task.id}`;
        if (!sessionStorage.getItem(key)) {
          showLocalNotification(
            'Task Overdue!',
            `${task.title} is past due time`
          );
          sessionStorage.setItem(key, 'true');
        }
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