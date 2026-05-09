import { useState } from 'react';
import { Sparkles, X, Loader2, Calendar, Hash, Zap, ListChecks, Trash2, CheckCircle2 } from 'lucide-react';
import { generatePlanRecommendation, generateTasksFromPlan, GeneratedTask } from '../services/aiService';
import { format } from 'date-fns';
import { useFirestore } from '../contexts/FirestoreContext';
import CustomSelect from './CustomSelect';

interface AIPlanAssistantProps {
  onApply: (data: { title: string; targetDate: string; targetCount: number; suggestedFrequency: string }) => void;
}

interface EditableTask extends GeneratedTask {
  id: string;
  completed: boolean;
}

export default function AIPlanAssistant({ onApply }: AIPlanAssistantProps) {
  const { addTask } = useFirestore();
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [step, setStep] = useState<'plan' | 'tasks'>('plan');
  const [goal, setGoal] = useState('');
  const [hoursPerWeek, setHoursPerWeek] = useState(10);
  const [frequency, setFrequency] = useState('daily');
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<{
    targetDate: string;
    targetCount: number;
    suggestedFrequency: string;
    reasoning: string;
  } | null>(null);
  const [generatedTasks, setGeneratedTasks] = useState<EditableTask[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creatingTasks, setCreatingTasks] = useState(false);
  const [tasksCreated, setTasksCreated] = useState(false);

  const handleGetRecommendation = async () => {
    if (!goal.trim()) return;
    
    setLoading(true);
    setError(null);
    setRecommendation(null);

    try {
      const result = await generatePlanRecommendation(goal, hoursPerWeek, frequency);
      setRecommendation(result);
    } catch {
      setError('Failed to get recommendation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTasks = async () => {
    if (!recommendation) return;
    
    setLoading(true);
    setError(null);

    try {
      const tasks = await generateTasksFromPlan(
        goal,
        '',
        recommendation.targetCount,
        recommendation.targetDate,
        recommendation.suggestedFrequency
      );
      
      const editableTasks: EditableTask[] = tasks.map((t, i) => ({
        ...t,
        id: `task-${i}-${Date.now()}`,
        completed: false,
      }));
      
      setGeneratedTasks(editableTasks);
      setStep('tasks');
    } catch {
      setError('Failed to generate tasks. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTask = (id: string, field: keyof GeneratedTask, value: string) => {
    setGeneratedTasks(tasks =>
      tasks.map(t => t.id === id ? { ...t, [field]: value } : t)
    );
  };

  const handleDeleteTask = (id: string) => {
    setGeneratedTasks(tasks => tasks.filter(t => t.id !== id));
  };

  const handleCreateTasks = async () => {
    if (generatedTasks.length === 0) return;
    
    setCreatingTasks(true);
    setError(null);

    try {
      for (const task of generatedTasks) {
        await addTask({
          title: task.title,
          description: task.description,
          priority: task.priority,
          category: task.category,
          status: 'pending',
          dueDate: task.dueDate,
          dueTime: task.dueTime || '',
          startDate: null,
          recurring: 'none',
          planId: null,
        });
      }
      setTasksCreated(true);
    } catch {
      setError('Failed to create tasks. Please try again.');
    } finally {
      setCreatingTasks(false);
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
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      setGoal('');
      setHoursPerWeek(10);
      setFrequency('daily');
      setRecommendation(null);
      setGeneratedTasks([]);
      setError(null);
      setStep('plan');
      setTasksCreated(false);
    }, 200);
  };

  const handleBack = () => {
    setStep('plan');
    setGeneratedTasks([]);
  };

  const presetGoals = [
    'Read 20 books this year',
    'Exercise 3x per week',
    'Learn a new language',
    'Save $5000',
    'Meditate daily',
  ];

  const priorityOptions = [
    { value: 'high', label: 'High', color: '#ef4444' },
    { value: 'medium', label: 'Medium', color: '#f59e0b' },
    { value: 'low', label: 'Low', color: '#10b981' },
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
          className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}
          onClick={e => e.target === e.currentTarget && handleClose()}
        >
          <div className={`w-full max-w-2xl rounded-3xl bg-slate-900 border border-white/10 shadow-2xl ${isClosing ? 'animate-scale-out' : 'animate-scale-in'} max-h-[90vh] overflow-hidden flex flex-col`}>
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {step === 'plan' ? 'AI Plan Assistant' : 'Generated Tasks'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {step === 'plan' ? 'Get smart recommendations' : `${generatedTasks.length} tasks ready to create`}
                  </p>
                </div>
              </div>
              <button onClick={handleClose} className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {step === 'plan' ? (
                <div className="space-y-4">
                  {tasksCreated && (
                    <div className="rounded-2xl bg-emerald-500/20 border border-emerald-500/30 p-4 mb-4">
                      <div className="flex items-center gap-2 text-emerald-400">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="font-medium">Tasks created successfully!</span>
                      </div>
                    </div>
                  )}

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
                        type="text"
                        inputMode="numeric"
                        pattern="[1-9][0-9]*"
                        className="input"
                        value={hoursPerWeek || ''}
                        onChange={e => {
                          const val = e.target.value.replace(/\D/g, '');
                          setHoursPerWeek(val ? Math.min(60, Math.max(1, parseInt(val, 10))) : 0);
                        }}
                        placeholder="10"
                      />
                    </div>
                    <CustomSelect
                      label="Frequency"
                      value={frequency}
                      onChange={setFrequency}
                      options={[
                        { value: 'daily', label: 'Daily' },
                        { value: 'weekly', label: 'Weekly' },
                        { value: 'monthly', label: 'Monthly' },
                      ]}
                    />
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

                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={handleGenerateTasks}
                          className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-medium text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2"
                        >
                          <ListChecks className="w-4 h-4" />
                          Generate Tasks
                        </button>
                        <button
                          onClick={handleApply}
                          className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-medium text-sm hover:opacity-90 transition-all"
                        >
                          Apply to Plan
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={handleBack}
                      className="text-sm text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                    >
                      ← Back to plan
                    </button>
                    <span className="text-sm text-slate-400">
                      {generatedTasks.length} tasks
                    </span>
                  </div>

                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {generatedTasks.map((task, index) => (
                      <div
                        key={task.id}
                        className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3"
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-xs text-slate-500 shrink-0 pt-1">#{index + 1}</span>
                          <div className="flex-1 space-y-2">
                            <input
                              type="text"
                              className="input text-sm font-medium"
                              value={task.title}
                              onChange={e => handleUpdateTask(task.id, 'title', e.target.value)}
                              placeholder="Task title"
                            />
                            <input
                              type="text"
                              className="input text-xs"
                              value={task.description}
                              onChange={e => handleUpdateTask(task.id, 'description', e.target.value)}
                              placeholder="Description (optional)"
                            />
                          </div>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-3 gap-2 ml-8">
                          <div>
                            <label className="text-xs text-slate-500 block mb-1">Due Date</label>
                            <input
                              type="date"
                              className="input text-xs"
                              value={task.dueDate}
                              onChange={e => handleUpdateTask(task.id, 'dueDate', e.target.value)}
                              min={new Date().toISOString().split('T')[0]}
                            />
                          </div>
                          <div>
                            <label className="text-xs text-slate-500 block mb-1">Due Time</label>
                            <input
                              type="time"
                              className="input text-xs"
                              value={task.dueTime}
                              onChange={e => handleUpdateTask(task.id, 'dueTime', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="text-xs text-slate-500 block mb-1">Priority</label>
                            <CustomSelect
                              value={task.priority}
                              onChange={(val) => handleUpdateTask(task.id, 'priority', val)}
                              options={priorityOptions}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {error && (
                    <p className="text-sm text-rose-400 text-center">{error}</p>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleApply}
                      className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-medium hover:opacity-90 transition-all"
                    >
                      Create Plan Only
                    </button>
                    <button
                      onClick={handleCreateTasks}
                      disabled={creatingTasks || generatedTasks.length === 0}
                      className="flex-1 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-medium hover:opacity-90 transition-all shadow-lg shadow-teal-500/30 disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {creatingTasks ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <ListChecks className="w-4 h-4" />
                          Create {generatedTasks.length} Tasks
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
