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
  const audioContextRef = useRef<AudioContext | null>(null);

  const playSound = useCallback(async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      
      const response = await fetch('https://cdn.freesound.org/previews/612/612095_5674468-lq.mp3');
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      
      const gainNode = ctx.createGain();
      gainNode.gain.value = 4.0;
      
      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      source.start(0);
    } catch (e) {
      console.log('Sound error:', e);
    }
  }, []);

  const markAsStarted = useCallback(async (taskId: string) => {
    try {
      await updateTask(taskId, { status: 'in_progress' });
      setDismissedTasks(prev => new Set(prev).add(taskId));
      setCurrentNotification(null);
    } catch (e) {
      console.log('Error marking task as started:', e);
    }
  }, [updateTask]);

  const dismissTask = useCallback((taskId: string) => {
    setDismissedTasks(prev => new Set(prev).add(taskId));
    setCurrentNotification(null);
  }, []);

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    const checkNotifications = () => {
      const now = new Date();
      
      for (const task of tasks) {
        if (task.status === 'completed') continue;
        if (dismissedTasks.has(task.id)) continue;

        if (task.startDate && task.startTime) {
          const startDateParsed = parseISO(task.startDate);
          if (isToday(startDateParsed)) {
            const [hours, minutes] = task.startTime.split(':').map(Number);
            const startDateTime = setMinutes(setHours(startDateParsed, hours), minutes);
            if (differenceInMinutes(startDateTime, now) === 0) {
              playSound();
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
              playSound();
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
  }, [tasks, playSound, dismissedTasks]);

  const dismissNotification = () => {
    if (currentNotification) {
      dismissTask(currentNotification.id);
    }
  };

  return { currentNotification, dismissNotification, markAsStarted, dismissTask };
}

export function TaskNotificationPopup({ notification, onClose, onStart }: { 
  notification: TaskNotification; 
  onClose: () => void;
  onStart: (taskId: string) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 6000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 px-4">
      <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl shadow-2xl p-4 max-w-sm w-full transform animate-slide-down">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 animate-pulse">
            {notification.type === 'start' ? (
              <PlayCircle className="w-7 h-7 text-white" />
            ) : (
              <CheckCircle className="w-7 h-7 text-white" />
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
        
        <div className="mt-3 flex gap-1">
          <div className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
            <div className="h-full bg-white animate-progress-6s w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}