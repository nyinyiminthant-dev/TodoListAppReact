import { useState, useEffect, useCallback } from 'react';
import { X, Bell, PlayCircle, CheckCircle } from 'lucide-react';
import { useFirestore } from '../contexts/FirestoreContext';
import { parseISO, isToday, differenceInMinutes, setHours, setMinutes } from 'date-fns';

interface TaskNotification {
  id: string;
  title: string;
  type: 'start' | 'due';
}

export function useNotificationChecker() {
  const { tasks } = useFirestore();
  const [currentNotification, setCurrentNotification] = useState<TaskNotification | null>(null);

  const showBrowserNotification = useCallback((task: any, type: string) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    
    const title = type === 'start' ? 'Time to Start' : 'Due Now';
    new Notification(title, {
      body: task.title,
      icon: '/icon-192.png',
      tag: `task-${task.id}`,
    });
  }, []);

  useEffect(() => {
    const checkNotifications = () => {
      const now = new Date();
      
      for (const task of tasks) {
        if (task.status === 'completed') continue;

        if (task.startDate && task.startTime) {
          const startDateParsed = parseISO(task.startDate);
          if (isToday(startDateParsed)) {
            const [hours, minutes] = task.startTime.split(':').map(Number);
            const startDateTime = setMinutes(setHours(startDateParsed, hours), minutes);
            if (differenceInMinutes(startDateTime, now) === 0) {
              showBrowserNotification(task, 'start');
              setCurrentNotification({ id: task.id, title: task.title, type: 'start' });
              return;
            }
          }
        }

        if (task.dueDate && task.dueTime) {
          const dueDateParsed = parseISO(task.dueDate);
          if (isToday(dueDateParsed)) {
            const [hours, minutes] = task.dueTime.split(':').map(Number);
            const dueDateTime = setMinutes(setHours(dueDateParsed, hours), minutes);
            if (differenceInMinutes(dueDateTime, now) === 0) {
              showBrowserNotification(task, 'due');
              setCurrentNotification({ id: task.id, title: task.title, type: 'due' });
              return;
            }
          }
        }
      }
    };

    const interval = setInterval(checkNotifications, 30000);
    checkNotifications();

    return () => clearInterval(interval);
  }, [tasks, showBrowserNotification]);

  const dismissNotification = () => {
    setCurrentNotification(null);
  };

  return { currentNotification, dismissNotification };
}

export function TaskNotificationPopup({ notification, onClose }: { 
  notification: TaskNotification; 
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-slide-down">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-4 border border-white/10 max-w-sm mx-4">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
        
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            notification.type === 'start' ? 'bg-violet-500/20' : 'bg-blue-500/20'
          }`}>
            {notification.type === 'start' ? (
              <PlayCircle className="w-5 h-5 text-violet-500" />
            ) : (
              <CheckCircle className="w-5 h-5 text-blue-500" />
            )}
          </div>
          
          <div>
            <p className={`text-xs font-medium uppercase ${
              notification.type === 'start' ? 'text-violet-500' : 'text-blue-500'
            }`}>
              {notification.type === 'start' ? 'Time to Start' : 'Due Now'}
            </p>
            <p className="font-medium text-gray-900 dark:text-white text-sm">
              {notification.title}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}