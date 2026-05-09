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

export async function generatePlanRecommendation(
  goal: string,
  availableHoursPerWeek = 10,
  preferredFrequency = 'daily'
): Promise<PlanRecommendation> {
  const today = new Date();
  const prompt = `You are a productivity planning assistant. Based on the user's goal and available time, recommend optimal plan settings.

Goal: "${goal}"
Available hours per week: ${availableHoursPerWeek}
Preferred frequency: ${preferredFrequency}

Today's date: ${today.toISOString().split('T')[0]}

Respond ONLY with valid JSON in this exact format, no markdown or explanation:
{
  "targetDate": "YYYY-MM-DD",
  "targetCount": number,
  "suggestedFrequency": "daily|weekly|monthly",
  "reasoning": "brief explanation (max 100 chars)"
}

Rules:
- targetDate must be 1-12 weeks from today (${today.toISOString().split('T')[0]})
- targetCount should be achievable given available hours`;

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
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(text);
  } catch {
    throw new Error('Failed to parse AI response');
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
  const endDate = new Date(targetDate);
  const totalDays = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  let tasksPerWeek = 1;
  if (frequency === 'daily') tasksPerWeek = 7;
  else if (frequency === 'weekly') tasksPerWeek = 1;
  else if (frequency === 'monthly') tasksPerWeek = 0.25;

  const estimatedTotalTasks = Math.min(targetCount, Math.ceil(totalDays * tasksPerWeek / 7));

  const prompt = `You are a task breakdown assistant. Break down a plan into specific, actionable tasks.

Plan Title: "${planTitle}"
Plan Description: "${planDescription}"
Target: ${targetCount} completions
Target Date: ${targetDate}
Frequency: ${frequency}
Today's Date: ${today.toISOString().split('T')[0]}
Days until deadline: ${totalDays}

Respond ONLY with valid JSON array in this exact format, no markdown or explanation:
[
  {
    "title": "specific action item (max 60 chars)",
    "description": "brief detail about this task (max 100 chars)",
    "priority": "high|medium|low",
    "dueDate": "YYYY-MM-DD (within the deadline)",
    "dueTime": "HH:MM (optional, e.g. 09:00 or leave empty string)",
    "category": "work|personal|health|shopping|studying|planning"
  }
]

Rules:
- Generate ${Math.min(estimatedTotalTasks, 20)} diverse, specific tasks
- Distribute tasks evenly across the timeline from today to ${targetDate}
- Tasks should be actionable and specific
- First task should be today or tomorrow
- Mix priorities realistically (more medium/low than high)
- Include relevant category based on the goal
- dueTime can be empty string if not specified
- Use today's date: ${today.toISOString().split('T')[0]}`;

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
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(text);
  } catch {
    throw new Error('Failed to parse AI response');
  }
}
