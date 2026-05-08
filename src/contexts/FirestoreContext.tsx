import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  getDocs
} from 'firebase/firestore';
import { db } from '../utils/firebase';
import { Task, Plan, CategoryData } from '../types';
import { useAuth } from './AuthContext';

interface FirestoreContextType {
  tasks: Task[];
  plans: Plan[];
  categories: CategoryData[];
  loading: boolean;
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'completedAt'>) => Promise<string>;
  updateTask: (id: string, data: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  addPlan: (plan: Omit<Plan, 'id' | 'createdAt' | 'completedCount'>) => Promise<string>;
  updatePlan: (id: string, data: Partial<Plan>) => Promise<void>;
  deletePlan: (id: string) => Promise<void>;
  exportData: () => string;
  importData: (data: string) => Promise<void>;
  clearAllData: () => Promise<void>;
}

const FirestoreContext = createContext<FirestoreContextType | undefined>(undefined);

const defaultCategories: CategoryData[] = [
  { id: 'work', name: 'Work', color: '#6366f1', icon: 'Briefcase' },
  { id: 'personal', name: 'Personal', color: '#8b5cf6', icon: 'User' },
  { id: 'health', name: 'Health', color: '#10b981', icon: 'Heart' },
  { id: 'shopping', name: 'Shopping', color: '#f59e0b', icon: 'ShoppingCart' },
  { id: 'studying', name: 'Studying', color: '#06b6d4', icon: 'BookOpen' },
  { id: 'planning', name: 'Planning', color: '#ec4899', icon: 'Calendar' },
];

export function FirestoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [categories] = useState<CategoryData[]>(defaultCategories);
  const [loading, setLoading] = useState(true);

  // Subscribe to tasks
  useEffect(() => {
    if (!user) {
      setTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(collection(db, 'tasks'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Task[];
      setTasks(tasksData);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  // Subscribe to plans
  useEffect(() => {
    if (!user) {
      setPlans([]);
      return;
    }

    const q = query(collection(db, 'plans'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const plansData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Plan[];
      setPlans(plansData);
    });

    return unsubscribe;
  }, [user]);

  const addTask = useCallback(async (taskData: Omit<Task, 'id' | 'createdAt' | 'completedAt'>) => {
    const docRef = await addDoc(collection(db, 'tasks'), {
      ...taskData,
      userId: user?.uid ?? '',
      createdAt: serverTimestamp(),
      completedAt: null
    });
    return docRef.id;
  }, [user]);

  const updateTask = useCallback(async (id: string, data: Partial<Task>) => {
    const docRef = doc(db, 'tasks', id);
    await updateDoc(docRef, data);
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    await deleteDoc(doc(db, 'tasks', id));
  }, []);

  const addPlan = useCallback(async (planData: Omit<Plan, 'id' | 'createdAt' | 'completedCount'>) => {
    const docRef = await addDoc(collection(db, 'plans'), {
      ...planData,
      userId: user?.uid ?? '',
      createdAt: serverTimestamp(),
      completedCount: 0
    });
    return docRef.id;
  }, [user]);

  const updatePlan = useCallback(async (id: string, data: Partial<Plan>) => {
    const docRef = doc(db, 'plans', id);
    await updateDoc(docRef, data);
  }, []);

  const deletePlan = useCallback(async (id: string) => {
    await deleteDoc(doc(db, 'plans', id));
  }, []);

  const exportData = useCallback(() => {
    const data = { tasks, plans, categories, exportedAt: new Date().toISOString() };
    return JSON.stringify(data, null, 2);
  }, [tasks, plans, categories]);

  const importData = useCallback(async (data: string) => {
    try {
      const parsed = JSON.parse(data);
      if (parsed.tasks && Array.isArray(parsed.tasks)) {
        for (const task of parsed.tasks) {
          const { id, ...taskData } = task;
          await addDoc(collection(db, 'tasks'), {
            ...taskData,
            userId: user?.uid,
            createdAt: serverTimestamp(),
            completedAt: task.status === 'completed' ? serverTimestamp() : null
          });
        }
      }
      if (parsed.plans && Array.isArray(parsed.plans)) {
        for (const plan of parsed.plans) {
          const { id, ...planData } = plan;
          await addDoc(collection(db, 'plans'), {
            ...planData,
            userId: user?.uid,
            createdAt: serverTimestamp()
          });
        }
      }
    } catch (error) {
      console.error('Import error:', error);
      throw error;
    }
  }, [user]);

  const clearAllData = useCallback(async () => {
    for (const task of tasks) {
      await deleteDoc(doc(db, 'tasks', task.id));
    }
    for (const plan of plans) {
      await deleteDoc(doc(db, 'plans', plan.id));
    }
  }, [tasks, plans]);

  return (
    <FirestoreContext.Provider value={{
      tasks,
      plans,
      categories,
      loading,
      addTask,
      updateTask,
      deleteTask,
      addPlan,
      updatePlan,
      deletePlan,
      exportData,
      importData,
      clearAllData
    }}>
      {children}
    </FirestoreContext.Provider>
  );
}

export function useFirestore() {
  const context = useContext(FirestoreContext);
  if (!context) {
    throw new Error('useFirestore must be used within FirestoreProvider');
  }
  return context;
}