import { useState } from 'react';
import { Sparkles, X, Loader2, Calendar, Hash, Zap } from 'lucide-react';
import { generatePlanRecommendation, PlanRecommendation } from '../services/aiService';
import { format } from 'date-fns';

interface AIPlanAssistantProps {
  onApply: (data: { title: string; targetDate: string; targetCount: number; suggestedFrequency: string }) => void;
}

export default function AIPlanAssistant({ onApply }: AIPlanAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [goal, setGoal] = useState('');
  const [hoursPerWeek, setHoursPerWeek] = useState(10);
  const [frequency, setFrequency] = useState('daily');
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<PlanRecommendation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGetRecommendation = async () => {
    if (!goal.trim()) return;
    
    setLoading(true);
    setError(null);
    setRecommendation(null);

    try {
      const result = await generatePlanRecommendation(goal, hoursPerWeek, frequency);
      setRecommendation(result);
    } catch (err) {
      setError('Failed to get recommendation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!recommendation) return;
    onApply({
      title: goal,
      targetDate: recommendation.targetDate,
      targetCount: recommendation.targetCount,
      suggestedFrequency: recommendation.suggestedFrequency,
    });
    handleClose();
  };

  const handleClose = () => {
    setIsOpen(false);
    setGoal('');
    setHoursPerWeek(10);
    setFrequency('daily');
    setRecommendation(null);
    setError(null);
  };

  const presetGoals = [
    'Read 20 books this year',
    'Exercise 3x per week',
    'Learn a new language',
    'Save $5000',
    'Meditate daily',
  ];

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-amber-500/30"
      >
        <Sparkles className="w-4 h-4" />
        AI Assist
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={e => e.target === e.currentTarget && handleClose()}
        >
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-white/10 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">AI Plan Assistant</h2>
                  <p className="text-xs text-slate-400">Get smart recommendations</p>
                </div>
              </div>
              <button onClick={handleClose} className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1.5">What's your goal?</label>
                <textarea
                  className="input resize-none"
                  rows={2}
                  placeholder="e.g. Complete 50 coding challenges in 3 months"
                  value={goal}
                  onChange={e => setGoal(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1.5 flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Hours/week
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    className="input"
                    value={hoursPerWeek}
                    onChange={e => setHoursPerWeek(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1.5">Frequency</label>
                  <div className="relative">
                    <select
                      className="input pr-8 cursor-pointer"
                      style={{ background: 'rgba(255, 255, 255, 0.06)' }}
                      value={frequency}
                      onChange={e => setFrequency(e.target.value)}
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-500 mb-2">Quick start:</p>
                <div className="flex flex-wrap gap-2">
                  {presetGoals.map(g => (
                    <button
                      key={g}
                      onClick={() => setGoal(g)}
                      className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300 hover:bg-amber-500/20 hover:border-amber-500/40 hover:text-amber-300 transition-all"
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleGetRecommendation}
                disabled={!goal.trim() || loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium hover:opacity-90 transition-all shadow-lg shadow-amber-500/30 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Thinking...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Get Recommendation
                  </>
                )}
              </button>

              {error && (
                <p className="text-sm text-rose-400 text-center">{error}</p>
              )}

              {recommendation && (
                <div className="rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 p-4 space-y-3 animate-slide-in">
                  <p className="text-xs font-medium text-amber-400 uppercase tracking-wider">AI Recommendation</p>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-300">Target: {format(new Date(recommendation.targetDate), 'MMM d, yyyy')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-300">Target count: {recommendation.targetCount}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-300">Suggested: {recommendation.suggestedFrequency}</span>
                    </div>
                  </div>

                  {recommendation.reasoning && (
                    <p className="text-xs text-slate-400 italic">"{recommendation.reasoning}"</p>
                  )}

                  <button
                    onClick={handleApply}
                    className="w-full py-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-medium text-sm hover:opacity-90 transition-all"
                  >
                    Apply to Plan
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}