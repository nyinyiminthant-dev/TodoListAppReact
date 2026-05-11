import { useEffect, useCallback } from 'react';
import { useFirestore } from '../contexts/FirestoreContext';
import { parseISO, isToday, isBefore, isAfter, differenceInMinutes, setHours, setMinutes } from 'date-fns';

export function useNotifications() {
  const { tasks } = useFirestore();

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return false;
    
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }, []);

  const sendNotification = useCallback((title: string, body: string) => {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    new Notification(title, {
      body,
      icon: '/icon-192.png',
      tag: 'todolist-reminder',
      requireInteraction: false,
    });
  }, []);

  const checkOverdue = useCallback((task: Task) => {
    if (!task.dueDate || task.status === 'completed') return false;
    
    const now = new Date();
    const dueDate = parseISO(task.dueDate);
    
    if (isBefore(dueDate, now)) {
      if (isToday(dueDate) && task.dueTime) {
        const [hours, minutes] = task.dueTime.split(':').map(Number);
        const dueDateTime = setMinutes(setHours(dueDate, hours), minutes);
        return isBefore(dueDateTime, now);
      }
      return true;
    }
    return false;
  }, []);

  const checkStartTime = useCallback((task: Task) => {
    if (!task.startDate || !task.startTime || task.status === 'completed') return null;
    
    const now = new Date();
    const startDate = parseISO(task.startDate);
    
    if (isToday(startDate)) {
      const [hours, minutes] = task.startTime.split(':').map(Number);
      const startDateTime = setMinutes(setHours(startDate, hours), minutes);
      const diff = differenceInMinutes(startDateTime, now);
      
      if (diff <= 5 && diff >= -5) {
        return diff <= 0 ? 'now' : `in ${diff} minutes`;
      }
    }
    return null;
  }, []);

  const checkDueTime = useCallback((task: Task) => {
    if (!task.dueDate || !task.dueTime || task.status === 'completed') return null;
    
    const now = new Date();
    const dueDate = parseISO(task.dueDate);
    
    if (isToday(dueDate)) {
      const [hours, minutes] = task.dueTime.split(':').map(Number);
      const dueDateTime = setMinutes(setHours(dueDate, hours), minutes);
      const diff = differenceInMinutes(dueDateTime, now);
      
      if (diff <= 15 && diff >= -5) {
        return diff <= 0 ? 'now' : `in ${diff} minutes`;
      }
    }
    return null;
  }, []);

  useEffect(() => {
    const checkNotifications = () => {
      const now = new Date();
      
      tasks.forEach(task => {
        if (task.status === 'completed') return;
        
        const startStatus = checkStartTime(task);
        if (startStatus) {
          const key = `start-${task.id}-${new Date().toDateString()}`;
          if (!sessionStorage.getItem(key)) {
            sendNotification(
              `Start: ${task.title}`,
              startStatus === 'now' ? 'Time to start this task!' : `Starting ${startStatus}`,
            );
            sessionStorage.setItem(key, 'true');
          }
        }
        
        const dueStatus = checkDueTime(task);
        if (dueStatus) {
          const key = `due-${task.id}-${new Date().toDateString()}`;
          if (!sessionStorage.getItem(key)) {
            sendNotification(
              task.title,
              dueStatus === 'now' ? 'Due now!' : `Due ${dueStatus}`,
            );
            sessionStorage.setItem(key, 'true');
          }
        }
      });
    };

    requestPermission();
    
    const interval = setInterval(checkNotifications, 60000);
    checkNotifications();

    return () => clearInterval(interval);
  }, [tasks, sendNotification, requestPermission, checkStartTime, checkDueTime]);

  useEffect(() => {
    const now = new Date();
    
    tasks.forEach(task => {
      if (task.status === 'completed') return;
      
      if (checkOverdue(task)) {
        const key = `overdue-${task.id}-${new Date().toDateString()}`;
        if (!sessionStorage.getItem(key)) {
          sendNotification(
            'Task Overdue!',
            `"${task.title}" is past due time`,
          );
          sessionStorage.setItem(key, 'true');
        }
      }
    });
  }, [tasks, sendNotification, checkOverdue]);

  return { requestPermission, sendNotification, checkOverdue, checkStartTime, checkDueTime };
}

interface Task {
  id: string;
  title: string;
  status: string;
  dueDate: string;
  dueTime: string;
  startDate: string | null;
  startTime: string;
}