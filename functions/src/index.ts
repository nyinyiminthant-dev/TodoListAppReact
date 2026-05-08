import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';

admin.initializeApp();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'AIzaSyAXeoiq81F359GMzIDSKMoGyemVEqBw7Xc');

interface PlanRequest {
  goal: string;
  availableHoursPerWeek?: number;
  preferredFrequency?: string;
}

interface PlanRecommendation {
  targetDate: string;
  targetCount: number;
  suggestedFrequency: string;
  reasoning: string;
}

export const generatePlanRecommendation = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { goal, availableHoursPerWeek = 10, preferredFrequency = 'daily' } = req.body as PlanRequest;

    if (!goal) {
      res.status(400).json({ error: 'Goal is required' });
      return;
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `You are a productivity planning assistant. Based on the user's goal and available time, recommend optimal plan settings.

Goal: "${goal}"
Available hours per week: ${availableHoursPerWeek}
Preferred frequency: ${preferredFrequency}

Respond ONLY with valid JSON in this exact format, no markdown or explanation:
{
  "targetDate": "YYYY-MM-DD",
  "targetCount": number,
  "suggestedFrequency": "daily|weekly|monthly|custom",
  "reasoning": "brief explanation (max 100 chars)"
}

Rules:
- targetDate must be 1-12 weeks from today
- targetCount should be achievable given available hours
- Consider the complexity of the goal when setting targets`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text().trim();

    let recommendation: PlanRecommendation;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        recommendation = JSON.parse(jsonMatch[0]);
      } else {
        recommendation = JSON.parse(text);
      }
    } catch {
      res.status(500).json({ error: 'Failed to parse AI response' });
      return;
    }

    res.json(recommendation);
  } catch (error) {
    console.error('AI Error:', error);
    res.status(500).json({ error: 'Failed to generate recommendation' });
  }
});