import { useEffect, useCallback } from 'react';
import { useFirestore } from '../contexts/FirestoreContext';
import { parseISO, isToday, differenceInMinutes } from 'date-fns';

export function useNotifications() {
  const { tasks } = useFirestore();

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return false;
    
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }, []);

  const sendNotification = useCallback((title: string, body: string, icon?: string) => {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    new Notification(title, {
      body,
      icon: icon || '/icon.png',
      badge: '/badge.png',
      tag: 'todolist-reminder',
      requireInteraction: false,
    });
  }, []);

  // Check for due tasks and send notifications
  useEffect(() => {
    const checkNotifications = () => {
      const pendingTasks = tasks.filter(t => 
        t.status === 'pending' && 
        t.dueDate && 
        t.dueTime &&
        isToday(parseISO(t.dueDate))
      );

      pendingTasks.forEach(task => {
        const [hours, minutes] = task.dueTime.split(':').map(Number);
        const dueTime = new Date();
        dueTime.setHours(hours, minutes, 0, 0);
        
        const diff = differenceInMinutes(dueTime, new Date());
        
        // Notify 15 minutes before or at due time
        if (diff <= 15 && diff >= 0) {
          const key = `notified-${task.id}-${new Date().toDateString()}`;
          if (!sessionStorage.getItem(key)) {
            sendNotification(
              `Task Due Soon: ${task.title}`,
              diff <= 0 
                ? 'This task is due now!' 
                : `Due in ${diff} minutes`,
              '/icon.png'
            );
            sessionStorage.setItem(key, 'true');
          }
        }
      });
    };

    requestPermission();
    
    // Check every minute
    const interval = setInterval(checkNotifications, 60000);
    checkNotifications();

    return () => clearInterval(interval);
  }, [tasks, sendNotification, requestPermission]);

  // Check for overdue tasks
  useEffect(() => {
    const now = new Date();
    const overdue = tasks.filter(t => 
      t.status === 'pending' && 
      t.dueDate && 
      parseISO(t.dueDate) < now
    );

    if (overdue.length > 0) {
      const key = `notified-overdue-${new Date().toDateString()}`;
      if (!sessionStorage.getItem(key)) {
        sendNotification(
          'You have overdue tasks!',
          `${overdue.length} task${overdue.length > 1 ? 's' : ''} overdue`,
          '/icon.png'
        );
        sessionStorage.setItem(key, 'true');
      }
    }
  }, [tasks, sendNotification]);

  return { requestPermission, sendNotification };
}