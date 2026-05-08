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

const GEMINI_API_KEY = 'AIzaSyDgKkRvYFHZmyWWgwwLO_Cwyl9YjQ0dxl8';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';

export async function generatePlanRecommendation(
  goal: string,
  availableHoursPerWeek = 10,
  preferredFrequency = 'daily'
): Promise<PlanRecommendation> {
  const prompt = `You are a productivity planning assistant. Based on the user's goal and available time, recommend optimal plan settings.

Goal: "${goal}"
Available hours per week: ${availableHoursPerWeek}
Preferred frequency: ${preferredFrequency}

Respond ONLY with valid JSON in this exact format, no markdown or explanation:
{
  "targetDate": "YYYY-MM-DD",
  "targetCount": number,
  "suggestedFrequency": "daily|weekly|monthly",
  "reasoning": "brief explanation (max 100 chars)"
}

Rules:
- targetDate must be 1-12 weeks from today
- targetCount should be achievable given available hours`;

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
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