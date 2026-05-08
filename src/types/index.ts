export type Priority = 'high' | 'medium' | 'low';
export type Category = 'work' | 'personal' | 'health' | 'shopping' | 'studying' | 'planning';
export type Recurring = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
export type TaskStatus = 'pending' | 'completed';
export type PlanStatus = 'on_track' | 'at_risk' | 'completed' | 'overdue' | 'failed';

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  category: Category;
  status: TaskStatus;
  dueDate: string;
  dueTime: string;
  startDate: string | null;
  recurring: Recurring;
  createdAt: string;
  completedAt: string | null;
  userId: string;
  planId: string | null;
}

export interface Plan {
  id: string;
  title: string;
  description: string;
  targetDate: string;
  targetCount: number;
  completedCount: number;
  linkedTaskIds: string[];
  status: PlanStatus;
  createdAt: string;
  userId: string;
}

export interface CategoryData {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface ShareInvitation {
  id: string;
  listOwnerId: string;
  sharedWithEmail: string;
  permission: 'view' | 'edit';
  status: 'pending' | 'accepted';
  createdAt: string;
}

export interface UserData {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
}