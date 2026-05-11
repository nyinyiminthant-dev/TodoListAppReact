import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Bell, PlayCircle, CheckCircle, Play } from 'lucide-react';
import { useFirestore } from '../contexts/FirestoreContext';
import { parseISO, isToday, differenceInMinutes, setHours, setMinutes } from 'date-fns';

interface TaskNotification {
  id: string;
  title: string;
  type: 'start' | 'due';
}

export function useNotificationChecker() {
  const { tasks, updateTask } = useFirestore();
  const [currentNotification, setCurrentNotification] = useState<TaskNotification | null>(null);
  const [dismissedTasks, setDismissedTasks] = useState<Set<string>>(new Set());
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const notifiedRef = useRef<Set<string>>(new Set());

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  }, []);

  const playSound = useCallback(async () => {
    try {
      requestPermission();
      const audio = new Audio();
      audio.src = 'https://www.soundjay.com/buttons/sounds/button-09a.mp3';
      audio.volume = 1.0;
      audio.play();
      currentAudioRef.current = audio;
    } catch (e) {
      console.log('Sound error:', e);
    }
  }, [requestPermission]);

  const showBrowserNotification = useCallback(async (task: TaskNotification) => {
    try {
      const hasPerm = await requestPermission();
      if (!hasPerm) return;
      
      new Notification(task.type === 'start' ? 'Time to Start' : 'Due Now', {
        body: task.title,
        icon: '/icon-192.png',
        tag: `task-${task.id}`,
        requireInteraction: true,
        vibrate: [200, 100, 200, 100, 200],
      });
    } catch (e) {
      console.log('Browser notification error:', e);
    }
  }, [requestPermission]);

  const stopSound = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
  }, []);

  const markAsStarted = useCallback(async (taskId: string) => {
    try {
      stopSound();
      await updateTask(taskId, { status: 'in_progress' });
      setDismissedTasks(prev => new Set(prev).add(taskId));
      setCurrentNotification(null);
    } catch (e) {
      console.log('Error marking task as started:', e);
    }
  }, [updateTask, stopSound]);

  const dismissTask = useCallback((taskId: string) => {
    setDismissedTasks(prev => new Set(prev).add(taskId));
    setCurrentNotification(null);
  }, []);

  useEffect(() => {
    return () => {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    requestPermission();
    
    const checkNotifications = () => {
      const now = new Date();
      const todayStr = now.toDateString();
      
      for (const task of tasks) {
        if (task.status === 'completed') continue;
        if (dismissedTasks.has(task.id)) continue;
        
        const key = `${task.id}-${task.type}-${todayStr}`;
        if (notifiedRef.current.has(key)) continue;

        if (task.startDate && task.startTime) {
          const startDateParsed = parseISO(task.startDate);
          if (isToday(startDateParsed)) {
            const [hours, minutes] = task.startTime.split(':').map(Number);
            const startDateTime = setMinutes(setHours(startDateParsed, hours), minutes);
            if (differenceInMinutes(startDateTime, now) === 0) {
              notifiedRef.current.add(key);
              playSound();
              showBrowserNotification({ id: task.id, title: task.title, type: 'start' });
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
              notifiedRef.current.add(key);
              playSound();
              showBrowserNotification({ id: task.id, title: task.title, type: 'due' });
              setCurrentNotification({ id: task.id, title: task.title, type: 'due' });
              return;
            }
          }
        }
      }
    };

    const interval = setInterval(checkNotifications, 10000);
    checkNotifications();

    return () => clearInterval(interval);
  }, [tasks, playSound, dismissedTasks, showBrowserNotification, requestPermission]);

  const dismissNotification = () => {
    if (currentNotification) {
      stopSound();
      dismissTask(currentNotification.id);
    }
  };

  return { currentNotification, dismissNotification, markAsStarted, dismissTask, stopSound };
}

export function TaskNotificationPopup({ notification, onClose, onStart }: { 
  notification: TaskNotification; 
  onClose: () => void;
  onStart: (taskId: string) => void;
}) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 px-4">
      <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl shadow-2xl p-4 max-w-sm w-full transform animate-slide-down">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
            {notification.type === 'start' ? (
              <PlayCircle className="w-7 h-7 text-white animate-pulse" />
            ) : (
              <CheckCircle className="w-7 h-7 text-white animate-pulse" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-white/80 text-xs font-medium uppercase tracking-wide">
              {notification.type === 'start' ? 'Time to Start' : 'Due Now'}
            </p>
            <p className="text-white font-semibold text-lg truncate">
              {notification.title}
            </p>
          </div>
          
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center shrink-0 transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
        
        {notification.type === 'start' && (
          <button
            onClick={() => onStart(notification.id)}
            className="mt-3 w-full py-2.5 bg-white text-violet-600 font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-white/90 transition-colors"
          >
            <Play className="w-4 h-4" />
            Start Task
          </button>
        )}
        
        <div className="mt-3 flex items-center gap-2 text-white/60 text-xs">
          <Bell className="w-3 h-3" />
          <span>Tap X to dismiss</span>
        </div>
      </div>
    </div>
  );
}