"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePlanRecommendation = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const generative_ai_1 = require("@google/generative-ai");
admin.initializeApp();
const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'AIzaSyAXeoiq81F359GMzIDSKMoGyemVEqBw7Xc');
exports.generatePlanRecommendation = functions.https.onRequest(async (req, res) => {
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
        const { goal, availableHoursPerWeek = 10, preferredFrequency = 'daily' } = req.body;
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
        let recommendation;
        try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                recommendation = JSON.parse(jsonMatch[0]);
            }
            else {
                recommendation = JSON.parse(text);
            }
        }
        catch {
            res.status(500).json({ error: 'Failed to parse AI response' });
            return;
        }
        res.json(recommendation);
    }
    catch (error) {
        console.error('AI Error:', error);
        res.status(500).json({ error: 'Failed to generate recommendation' });
    }
});
//# sourceMappingURL=index.js.map