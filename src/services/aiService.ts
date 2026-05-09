import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

initializeApp(firebaseConfig);

export interface PlanRecommendation {
  targetDate: string;
  targetCount: number;
  suggestedFrequency: string;
  reasoning: string;
}

export interface PlanRequest {
  goal: string;
  availableHoursPerWeek?: number;
  preferredFrequency?: string;
}

export interface GeneratedTask {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  dueDate: string;
  dueTime: string;
  category: 'work' | 'personal' | 'health' | 'shopping' | 'studying' | 'planning';
}

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || 'AIzaSyAuVZyKrgtbojlP7atrvf7N8IcKLxbvqMM';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';

function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export async function generatePlanRecommendation(
  goal: string,
  availableHoursPerWeek = 10,
  preferredFrequency = 'daily'
): Promise<PlanRecommendation> {
  const today = new Date();
  const todayStr = formatDateLocal(today);
  
  let defaultDays = 30;
  if (preferredFrequency === 'weekly') defaultDays = 84;
  else if (preferredFrequency === 'monthly') defaultDays = 90;

  const prompt = `You are a productivity planning assistant. Based on the user's goal and available time, recommend optimal plan settings.

Goal: "${goal}"
Available hours per week: ${availableHoursPerWeek}
Preferred frequency: ${preferredFrequency}

Today's date: ${todayStr}

Respond ONLY with valid JSON in this exact format, no markdown or explanation:
{
  "targetCount": number (how many times user should complete this goal, be realistic),
  "suggestedFrequency": "daily|weekly|monthly",
  "reasoning": "brief explanation (max 100 chars)"
}

Rules:
- targetCount should be achievable given available hours
- Consider the complexity of the goal when setting targets`;

  const response = await fetch(GEMINI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-goog-api-key': GEMINI_API_KEY,
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }]
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to generate recommendation');
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    let result: { targetCount?: number; suggestedFrequency?: string; reasoning?: string };
    
    if (jsonMatch) {
      result = JSON.parse(jsonMatch[0]);
    } else {
      result = JSON.parse(text);
    }

    const targetDate = formatDateLocal(addDays(today, defaultDays));
    
    return {
      targetDate,
      targetCount: result.targetCount || Math.ceil(defaultDays / 3),
      suggestedFrequency: result.suggestedFrequency || preferredFrequency,
      reasoning: result.reasoning || 'Based on your available time and goals',
    };
  } catch {
    const targetDate = formatDateLocal(addDays(today, defaultDays));
    return {
      targetDate,
      targetCount: Math.ceil(defaultDays / 3),
      suggestedFrequency: preferredFrequency,
      reasoning: 'Default recommendation based on your settings',
    };
  }
}

export async function generateTasksFromPlan(
  planTitle: string,
  planDescription: string,
  targetCount: number,
  targetDate: string,
  frequency: string = 'daily'
): Promise<GeneratedTask[]> {
  const today = new Date();
  const todayStr = formatDateLocal(today);
  const endDate = new Date(targetDate);
  const totalDays = Math.max(1, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

  let tasksPerWeek = 1;
  if (frequency === 'daily') tasksPerWeek = 7;
  else if (frequency === 'weekly') tasksPerWeek = 1;
  else if (frequency === 'monthly') tasksPerWeek = 0.25;

  const estimatedTotalTasks = Math.min(targetCount, Math.max(5, Math.ceil(totalDays * tasksPerWeek / 7)));

  const prompt = `You are a task breakdown assistant. Break down a plan into specific, actionable tasks.

Plan Title: "${planTitle}"
Plan Description: "${planDescription}"
Target: ${targetCount} completions
Target Date: ${targetDate}
Frequency: ${frequency}
Today's Date: ${todayStr}
Days until deadline: ${totalDays}

Respond ONLY with valid JSON array in this exact format, no markdown or explanation:
[
  {
    "title": "specific action item (max 60 chars)",
    "description": "brief detail about this task (max 100 chars)",
    "priority": "high|medium|low",
    "dueDate": "YYYY-MM-DD",
    "dueTime": "HH:MM or empty string",
    "category": "work|personal|health|shopping|studying|planning"
  }
]

Rules:
- Generate exactly ${estimatedTotalTasks} diverse, specific tasks
- First task must be today (${todayStr}) or tomorrow (${formatDateLocal(addDays(today, 1))})
- All dueDate values must be between ${todayStr} and ${targetDate} (inclusive)
- Distribute tasks evenly across the timeline
- Mix priorities realistically (more medium/low than high)
- dueTime should be empty string (not "00:00")
- Include relevant category based on the goal`;

  const response = await fetch(GEMINI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-goog-api-key': GEMINI_API_KEY,
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }]
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to generate tasks');
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    let tasks: GeneratedTask[];
    
    if (jsonMatch) {
      tasks = JSON.parse(jsonMatch[0]);
    } else {
      tasks = JSON.parse(text);
    }

    return tasks.map(task => {
      let dueDate = task.dueDate;
      const taskDate = new Date(dueDate);
      
      if (taskDate < today) {
        dueDate = todayStr;
      } else if (taskDate > endDate) {
        dueDate = targetDate;
      }
      
      return {
        ...task,
        dueDate,
        dueTime: task.dueTime === '00:00' ? '' : (task.dueTime || ''),
      };
    });
  } catch {
    const fallbackTasks: GeneratedTask[] = [];
    const interval = Math.max(1, Math.floor(totalDays / estimatedTotalTasks));
    
    for (let i = 0; i < estimatedTotalTasks; i++) {
      const date = addDays(today, i * interval);
      if (date <= endDate) {
        fallbackTasks.push({
          title: `${planTitle} - Step ${i + 1}`,
          description: `Part ${i + 1} of your ${planTitle} plan`,
          priority: i === 0 ? 'high' : 'medium',
          dueDate: formatDateLocal(date),
          dueTime: '',
          category: 'planning',
        });
      }
    }
    
    return fallbackTasks;
  }
}
