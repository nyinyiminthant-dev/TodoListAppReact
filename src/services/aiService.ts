const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

if (!OPENROUTER_API_KEY) {
  throw new Error('VITE_OPENROUTER_API_KEY is not set in environment variables');
}

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
  startDate: string;
  startTime: string;
  priority: 'high' | 'medium' | 'low';
  dueDate: string;
  dueTime: string;
  category: 'work' | 'personal' | 'health' | 'shopping' | 'studying' | 'planning';
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

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'TodoList App',
    },
    body: JSON.stringify({
      model: 'openrouter/free',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to generate recommendation');
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content?.trim() || '';

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
  frequency: string = 'daily',
  language: string = 'en'
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

  const langInstruction = language === 'my' 
    ? 'Generate all task titles and descriptions in Burmese (Myanmar) language using Myanmar script.'
    : 'Generate all task titles and descriptions in English language.';

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
    "startDate": "YYYY-MM-DD",
    "startTime": "HH:MM or empty string",
    "priority": "high|medium|low",
    "dueDate": "YYYY-MM-DD",
    "dueTime": "HH:MM or empty string",
    "category": "work|personal|health|shopping|studying|planning"
  }
]

Rules:
- Generate exactly ${estimatedTotalTasks} diverse, specific tasks
- First task must be today (${todayStr}) or tomorrow (${formatDateLocal(addDays(today, 1))})
- All startDate and dueDate values must be between ${todayStr} and ${targetDate} (inclusive)
- Distribute tasks evenly across the timeline
- Mix priorities realistically (more medium/low than high)
- dueTime and startTime should be empty string (not "00:00")
- Include relevant category based on the goal
- ${langInstruction}`;

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'TodoList App',
    },
    body: JSON.stringify({
      model: 'openrouter/free',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to generate tasks');
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content?.trim() || '';

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
      let startDate = task.startDate || dueDate;
      const taskDate = new Date(dueDate);
      const startTaskDate = new Date(startDate);
      
      if (taskDate < today) {
        dueDate = todayStr;
      } else if (taskDate > endDate) {
        dueDate = targetDate;
      }
      
      if (startTaskDate < today) {
        startDate = todayStr;
      } else if (startTaskDate > endDate) {
        startDate = targetDate;
      }
      
      return {
        ...task,
        title: task.title || `${planTitle} - Task`,
        description: task.description || `${planTitle} - Step ${tasks.indexOf(task) + 1}`,
        startDate,
        startTime: task.startTime === '00:00' ? '' : (task.startTime || ''),
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
          startDate: formatDateLocal(date),
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