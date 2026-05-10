import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, Pencil, Trash2, ChevronDown, ChevronUp, Calendar, CheckCircle2, Sparkles, Loader2, ListChecks, ExternalLink } from 'lucide-react';
import { useFirestore } from '../contexts/FirestoreContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Plan, PlanStatus } from '../types';
import { parseISO, differenceInDays, format } from 'date-fns';
import Toast, { ToastState } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import AIPlanAssistant from '../components/AIPlanAssistant';
import CustomSelect from '../components/CustomSelect';
import { generateTasksFromPlan, GeneratedTask, } from '../services/aiService';

// Firestore returns serverTimestamp fields as Timestamp objects, not strings.
// This helper converts either format to a JS Date safely.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toDate(val: any): Date {
    if (!val) return new Date();
    if (val instanceof Date) return val;
    if (typeof val === 'string') return parseISO(val);
    if (typeof val.toDate === 'function') return val.toDate(); // Firestore Timestamp
    return new Date(val);
}

// ── Status calc ────────────────────────────────────────────────
function calculatePlanStatus(plan: Plan): PlanStatus {
    if (plan.completedCount >= plan.targetCount) return 'completed';

    const now = new Date();
    const created = toDate(plan.createdAt);
    const target = toDate(plan.targetDate);

    if (target < now) return 'failed';

    const totalDays = differenceInDays(target, created) || 1;
    const daysPassed = differenceInDays(now, created);
    const expected = (daysPassed / totalDays) * plan.targetCount;

    if (plan.completedCount >= expected) return 'on_track';
    if (plan.completedCount >= expected * 0.7) return 'at_risk';
    return 'overdue';
}

const statusConfig: Record<PlanStatus, { label: string; color: string; bg: string }> = {
    on_track: { label: 'On Track', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
    at_risk: { label: 'At Risk', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
    completed: { label: 'Completed', color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
    overdue: { label: 'Overdue', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
    failed: { label: 'Failed', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
};

// ── Circular progress ──────────────────────────────────────────
function CircularProgress({ percentage, color, size = 64 }: { percentage: number; color: string; size?: number }) {
    const r = (size - 10) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (Math.min(percentage, 100) / 100) * circ;

    return (
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={6} />
            <circle
                cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke={color} strokeWidth={6} strokeLinecap="round"
                strokeDasharray={circ} strokeDashoffset={offset}
                style={{ transition: 'stroke-dashoffset 0.6s ease' }}
            />
            <text
                x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
                fill="white" fontSize={size * 0.22} fontWeight="700"
                style={{ transform: `rotate(90deg) translate(0, -${size}px)`, transformOrigin: 'center' }}
            >
                {Math.round(percentage)}%
            </text>
        </svg>
    );
}

// ── Templates ──────────────────────────────────────────────────
const templates = [
    { label: 'Weekly Goal', days: 7, count: 7 },
    { label: 'Monthly Goal', days: 30, count: 20 },
    { label: '30-Day Challenge', days: 30, count: 30 },
];

const getDefaultTargetDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
};

const emptyForm = { title: '', description: '', startDate: '', targetDate: getDefaultTargetDate(), targetCount: 10 };

export default function Plans() {
    const { plans, tasks, addPlan, updatePlan, deletePlan, addTask } = useFirestore();
    const { t, isMyanmar } = useLanguage();
    const navigate = useNavigate();
    const [showForm, setShowForm] = useState(false);
    const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
    const [formData, setFormData] = useState({ ...emptyForm });
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState<ToastState | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string } | null>(null);
    const [isClosing, setIsClosing] = useState(false);
    const [aiTaskModal, setAiTaskModal] = useState<{ plan: Plan; tasks: EditableTask[] } | null>(null);
    const [generatingTasks, setGeneratingTasks] = useState(false);
    const [creatingTasks, setCreatingTasks] = useState(false);
    const [tasksModal, setTasksModal] = useState<Plan | null>(null);

    interface EditableTask extends GeneratedTask {
        id: string;
        startDate: string;
    }

    const closeToast = useCallback(() => setToast(null), []);

    // Auto-sync completedCount and status from linked tasks
    useEffect(() => {
        plans.forEach(plan => {
            const linked = tasks.filter(t => t.planId === plan.id && t.status === 'completed').length;
            if (linked !== plan.completedCount || plan.completedCount >= plan.targetCount) {
                const newStatus = calculatePlanStatus({ ...plan, completedCount: linked });
                updatePlan(plan.id, { completedCount: linked, status: newStatus });
            }
        });
    }, [tasks, plans, updatePlan]);

    const plansWithStatus = useMemo(() =>
        plans.map(p => ({ ...p, calculatedStatus: calculatePlanStatus(p) })),
        [plans]
    );

    const overallStats = useMemo(() => {
        const on_track = plansWithStatus.filter(p => p.calculatedStatus === 'on_track').length;
        const at_risk = plansWithStatus.filter(p => p.calculatedStatus === 'at_risk').length;
        const completed = plansWithStatus.filter(p => p.calculatedStatus === 'completed').length;
        const overdue = plansWithStatus.filter(p => ['overdue', 'failed'].includes(p.calculatedStatus)).length;
        return { on_track, at_risk, completed, overdue };
    }, [plansWithStatus]);

    const linkedTasks = useMemo(() =>
        selectedPlan ? tasks.filter(t => t.planId === selectedPlan) : [],
        [selectedPlan, tasks]
    );

    const resetForm = () => { setFormData({ ...emptyForm }); setEditingPlan(null); };
    const closeForm = () => {
        setIsClosing(true);
        setTimeout(() => {
            setShowForm(false);
            setIsClosing(false);
            resetForm();
        }, 200);
    };

    const handleAIApply = (data: { title: string; targetDate: string; targetCount: number; suggestedFrequency: string }) => {
        setFormData({
            title: data.title,
            description: '',
            targetDate: data.targetDate,
            targetCount: data.targetCount,
        });
        setShowForm(true);
    };

    const handleEdit = (plan: Plan) => {
        setEditingPlan(plan);
        setFormData({ title: plan.title, description: plan.description, startDate: plan.startDate || '', targetDate: plan.targetDate, targetCount: plan.targetCount });
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title.trim() || !formData.targetDate) return;

        setSubmitting(true);
        setToast({ type: 'loading', message: editingPlan ? 'Saving changes…' : 'Creating plan…' });

        try {
            if (editingPlan) {
                const newStatus = calculatePlanStatus({ ...editingPlan, ...formData });
                await updatePlan(editingPlan.id, { ...formData, status: newStatus });
            } else {
                await addPlan({ ...formData, linkedTaskIds: [], status: 'on_track', userId: '' });
            }
            closeForm();
            setToast({ type: 'success', message: editingPlan ? 'Plan updated!' : 'Plan created successfully!' });
        } catch {
            setToast({ type: 'error', message: 'Something went wrong. Please try again.' });
        } finally {
            setSubmitting(false);
        }
    };

    const applyTemplate = (t: typeof templates[number]) => {
        const d = new Date();
        d.setDate(d.getDate() + t.days);
        setFormData(f => ({ ...f, title: t.label, startDate: '', targetDate: d.toISOString().slice(0, 10), targetCount: t.count }));
        setShowForm(true);
    };

    const handleDeleteConfirm = async () => {
        if (!confirmDelete) return;
        try {
            await deletePlan(confirmDelete.id);
            setToast({ type: 'success', message: 'Plan deleted.' });
        } catch {
            setToast({ type: 'error', message: 'Failed to delete plan.' });
        } finally {
            setConfirmDelete(null);
        }
    };

    const handleAIGenerateTasks = async (plan: Plan) => {
        setGeneratingTasks(true);
        try {
            const generated = await generateTasksFromPlan(
                plan.title,
                plan.description,
                plan.targetCount,
                plan.targetDate,
                'daily',
                isMyanmar ? 'my' : 'en'
            );
            const editableTasks: EditableTask[] = generated.map((t, i) => ({
                ...t,
                id: `task-${i}-${Date.now()}`,
                startDate: t.startDate || '',
            }));
            setAiTaskModal({ plan, tasks: editableTasks });
        } catch {
            setToast({ type: 'error', message: 'Failed to generate tasks.' });
        } finally {
            setGeneratingTasks(false);
        }
    };

    const handleUpdateModalTask = (id: string, field: keyof GeneratedTask, value: string) => {
        if (!aiTaskModal) return;
        setAiTaskModal({
            ...aiTaskModal,
            tasks: aiTaskModal.tasks.map(t => t.id === id ? { ...t, [field]: value } : t)
        });
    };

    const handleDeleteModalTask = (id: string) => {
        if (!aiTaskModal) return;
        setAiTaskModal({
            ...aiTaskModal,
            tasks: aiTaskModal.tasks.filter(t => t.id !== id)
        });
    };

    const handleCreateTasksFromModal = async () => {
        if (!aiTaskModal || aiTaskModal.tasks.length === 0) return;
        setCreatingTasks(true);
        try {
            for (const task of aiTaskModal.tasks) {
                await addTask({
                    title: task.title,
                    description: task.description,
                    priority: task.priority,
                    category: task.category,
                    status: 'pending',
                    dueDate: task.dueDate,
                    dueTime: task.dueTime || '',
                    startDate: task.startDate || null,
                    recurring: 'none',
                    planId: aiTaskModal.plan.id,
                    userId: '',
                });
            }
            setToast({ type: 'success', message: `${aiTaskModal.tasks.length} ${t('tasksReadyToCreate')}` });
            setAiTaskModal(null);
        } catch {
            setToast({ type: 'error', message: 'Failed to create tasks.' });
        } finally {
            setCreatingTasks(false);
        }
    };

    return (
        <div>
            {/* Toast */}
            {toast && <Toast {...toast} onClose={closeToast} />}

            {/* Confirm Delete Dialog */}
            {confirmDelete && (
                <ConfirmDialog
                    title="Delete Plan?"
                    message={`"${confirmDelete.title}" and all its progress will be permanently removed.`}
                    onConfirm={handleDeleteConfirm}
                    onCancel={() => setConfirmDelete(null)}
                />
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white">{t('plans')}</h1>
                    <p className="text-slate-400 text-sm mt-1">{plans.length} {t('totalGoals')}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <AIPlanAssistant onApply={handleAIApply} />
                    <button
                        onClick={() => { resetForm(); setShowForm(true); }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-violet-500/30"
                    >
                        <Plus className="w-4 h-4" />
                        {t('newPlan')}
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {[
                    { labelKey: 'onTrack', value: overallStats.on_track, color: '#10b981' },
                    { labelKey: 'atRisk', value: overallStats.at_risk, color: '#f59e0b' },
                    { labelKey: 'completedGroup', value: overallStats.completed, color: '#6366f1' },
                    { labelKey: 'overdue', value: overallStats.overdue, color: '#ef4444' },
                ].map(s => (
                    <div key={s.labelKey} className="rounded-2xl p-4 bg-white/5 border border-white/10 text-center">
                        <p className="text-2xl font-bold text-white">{s.value}</p>
                        <p className="text-xs text-slate-400 mt-1">{t(s.labelKey as 'onTrack' | 'atRisk' | 'completedGroup' | 'overdue')}</p>
                        <div className="mt-2 h-0.5 rounded-full mx-auto w-12" style={{ backgroundColor: s.color }} />
                    </div>
                ))}
            </div>

            {/* Quick templates */}
            <div className="mb-6">
                <p className="text-xs text-slate-400 font-medium mb-2 uppercase tracking-wider">{t('quickTemplates')}</p>
                <div className="flex flex-wrap gap-2">
                    {[
                        { label: t('weeklyGoal'), days: 7, count: 7 },
                        { label: t('monthlyGoal'), days: 30, count: 20 },
                        { label: t('dayChallenge'), days: 30, count: 30 },
                    ].map(tmpl => (
                        <button
                            key={tmpl.label}
                            onClick={() => {
                                const d = new Date();
                                d.setDate(d.getDate() + tmpl.days);
                                setFormData(f => ({ ...f, title: tmpl.label, targetDate: d.toISOString().slice(0, 10), targetCount: tmpl.count }));
                                setShowForm(true);
                            }}
                            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm hover:bg-violet-500/20 hover:border-violet-500/40 hover:text-white transition-all"
                        >
                            {tmpl.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Plans list */}
            {plansWithStatus.length === 0 ? (
                <div className="text-center py-20 text-slate-400">
                    <p className="text-lg font-medium text-white mb-2">{t('noActivePlans')}</p>
                    <p className="text-sm">{t('setGoalToTrack')}</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {plansWithStatus.map(plan => {
                        const pct = plan.targetCount > 0 ? (plan.completedCount / plan.targetCount) * 100 : 0;
                        const cfg = statusConfig[plan.calculatedStatus];
                        const daysLeft = differenceInDays(toDate(plan.targetDate), new Date());
                        const isExpanded = selectedPlan === plan.id;

                        return (
                            <div key={plan.id} className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden hover:border-white/20 transition-all">
                                {/* Status bar */}
                                <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${cfg.color} ${Math.min(pct, 100)}%, rgba(255,255,255,0.06) 0%)` }} />

                                <div className="p-5">
                                    <div className="flex items-start gap-4">
                                        {/* Circular progress */}
                                        <div className="shrink-0">
                                            <CircularProgress percentage={pct} color={cfg.color} size={64} />
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                <h3 className="text-white font-semibold truncate">{plan.title}</h3>
                                                <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                                            </div>
                                            {plan.description && <p className="text-xs text-slate-400 mb-2 truncate">{plan.description}</p>}
                                            <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{format(toDate(plan.targetDate), 'MMM d, yyyy')}</span>
                                                <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />{plan.completedCount} / {plan.targetCount}</span>
                                                <span style={{ color: daysLeft < 0 ? '#ef4444' : daysLeft < 3 ? '#f59e0b' : '#94a3b8' }}>
                                                    {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? 'Due today' : `${daysLeft}d left`}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-1 shrink-0">
                                            <button onClick={() => setSelectedPlan(isExpanded ? null : plan.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                            </button>
                                            <button onClick={() => handleEdit(plan)} className="p-1.5 rounded-lg text-slate-400 hover:text-violet-400 hover:bg-violet-500/10 transition-all">
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => setConfirmDelete({ id: plan.id, title: plan.title })} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Linked tasks */}
                                    {isExpanded && (
                                        <div className="mt-4 pt-4 border-t border-white/10 animate-slide-in">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-xs text-slate-400 font-medium">{t('linkedTasks')} ({linkedTasks.length})</p>
                                                <button
                                                    onClick={() => handleAIGenerateTasks(plan)}
                                                    disabled={generatingTasks}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-teal-500/20 to-cyan-500/20 border border-teal-500/30 text-teal-400 text-xs font-medium hover:from-teal-500/30 hover:to-cyan-500/30 transition-all disabled:opacity-50"
                                                >
                                                    {generatingTasks ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        <Sparkles className="w-3.5 h-3.5" />
                                                    )}
                                                    {t('generateMoreTasks')}
                                                </button>
                                            </div>
                                            {linkedTasks.length === 0 ? (
                                                <p className="text-xs text-slate-500">{t('noTasksLinked')}</p>
                                            ) : (
                                                <div className="space-y-1.5">
                                                    {linkedTasks.map(t => (
                                                        <div key={t.id} className="flex items-center gap-2 text-xs">
                                                            <CheckCircle2 className={`w-3.5 h-3.5 ${t.status === 'completed' ? 'text-emerald-400' : 'text-slate-600'}`} />
                                                            <span className={t.status === 'completed' ? 'line-through text-slate-500' : 'text-slate-300'}>{t.title}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {linkedTasks.length > 0 && (
                                                <button
                                                    onClick={() => setTasksModal(plan)}
                                                    className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 text-xs font-medium hover:bg-white/10 hover:text-white transition-all"
                                                >
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                    {t('viewInTasks')}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Form modal */}
            {showForm && (
                <div
                    className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}
                    onClick={e => e.target === e.currentTarget && closeForm()}
                >
                    <div className={`w-full max-w-lg rounded-3xl bg-slate-900 border border-white/10 shadow-2xl ${isClosing ? 'animate-scale-out' : 'animate-scale-in'}`}>
                        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/10">
                            <h2 className="text-lg font-semibold text-white">{editingPlan ? 'Edit Plan' : 'New Plan'}</h2>
                            <button onClick={closeForm} className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-medium text-slate-400 block mb-1.5">Title *</label>
                                <input className="input" placeholder="e.g. Complete 30 workouts" value={formData.title} onChange={e => setFormData(f => ({ ...f, title: e.target.value }))} required autoFocus />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-400 block mb-1.5">Description</label>
                                <textarea className="input resize-none" rows={2} placeholder="Optional details…" value={formData.description} onChange={e => setFormData(f => ({ ...f, description: e.target.value }))} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-medium text-slate-400 block mb-1.5">Start Date</label>
                                    <input type="date" className="input" value={formData.startDate} min={new Date().toISOString().split('T')[0]} onChange={e => setFormData(f => ({ ...f, startDate: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-400 block mb-1.5">Target Date *</label>
                                    <input type="date" className="input" value={formData.targetDate} min={new Date().toISOString().split('T')[0]} onChange={e => setFormData(f => ({ ...f, targetDate: e.target.value }))} required />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-400 block mb-1.5">Target Count</label>
                                <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setFormData(f => ({ ...f, targetCount: Math.max(1, f.targetCount - 1) }))}
                                            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all text-lg font-bold flex items-center justify-center"
                                        >
                                            -
                                        </button>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            className="input text-center w-20"
                                            value={formData.targetCount}
                                            onChange={e => {
                                                const val = e.target.value.replace(/[^0-9]/g, '');
                                                if (val === '') {
                                                    setFormData(f => ({ ...f, targetCount: 1 }));
                                                } else {
                                                    setFormData(f => ({ ...f, targetCount: parseInt(val, 10) || 1 }));
                                                }
                                            }}
                                            onBlur={e => {
                                                if (!e.target.value || parseInt(e.target.value, 10) < 1) {
                                                    setFormData(f => ({ ...f, targetCount: 1 }));
                                                }
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setFormData(f => ({ ...f, targetCount: f.targetCount + 1 }))}
                                            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all text-lg font-bold flex items-center justify-center"
                                        >
                                            +
                                        </button>
                                    </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={closeForm} className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all text-sm font-medium">Cancel</button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-medium text-sm hover:opacity-90 transition-all shadow-lg shadow-violet-500/30 disabled:opacity-60 flex items-center justify-center gap-2"
                                >
                                    {submitting && (
                                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                        </svg>
                                    )}
                                    {submitting ? 'Saving…' : editingPlan ? 'Save Changes' : 'Create Plan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* AI Task Generation Modal */}
            {aiTaskModal && (
                <div
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
                    onClick={e => e.target === e.currentTarget && setAiTaskModal(null)}
                >
                    <div className="w-full max-w-2xl rounded-3xl bg-slate-900 border border-white/10 shadow-2xl animate-scale-in max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/10 shrink-0">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
                                    <Sparkles className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-white">{t('generatedTasks')}</h2>
                                    <p className="text-xs text-slate-400">For: {aiTaskModal.plan.title}</p>
                                </div>
                            </div>
                            <button onClick={() => setAiTaskModal(null)} className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 space-y-3">
                            {aiTaskModal.tasks.map((task, index) => (
                                <div key={task.id} className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
                                    <div className="flex items-start gap-3">
                                        <span className="text-xs text-slate-500 shrink-0 pt-1">#{index + 1}</span>
                                        <div className="flex-1 space-y-2">
                                            <input
                                                type="text"
                                                className="input text-sm font-medium"
                                                value={task.title}
                                                onChange={e => handleUpdateModalTask(task.id, 'title', e.target.value)}
                                                placeholder={t('title')}
                                            />
                                            <textarea
                                                className="input text-xs resize-none"
                                                rows={2}
                                                value={task.description}
                                                onChange={e => handleUpdateModalTask(task.id, 'description', e.target.value)}
                                                placeholder={t('description')}
                                            />
                                        </div>
                                        <button
                                            onClick={() => handleDeleteModalTask(task.id)}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all shrink-0"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-4 gap-2 ml-8">
                                        <div>
                                            <label className="text-xs text-slate-500 block mb-1">Start Date</label>
                                            <input
                                                type="date"
                                                className="input text-xs"
                                                value={task.startDate}
                                                onChange={e => handleUpdateModalTask(task.id, 'startDate', e.target.value)}
                                                min={new Date().toISOString().split('T')[0]}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-500 block mb-1">Due Date</label>
                                            <input
                                                type="date"
                                                className="input text-xs"
                                                value={task.dueDate}
                                                onChange={e => handleUpdateModalTask(task.id, 'dueDate', e.target.value)}
                                                min={new Date().toISOString().split('T')[0]}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-500 block mb-1">Due Time</label>
                                            <input
                                                type="time"
                                                className="input text-xs"
                                                value={task.dueTime}
                                                onChange={e => handleUpdateModalTask(task.id, 'dueTime', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-500 block mb-1">Priority</label>
                                            <CustomSelect
                                                value={task.priority}
                                                onChange={(val) => handleUpdateModalTask(task.id, 'priority', val)}
                                                options={[
                                                    { value: 'high', label: 'High' },
                                                    { value: 'medium', label: 'Medium' },
                                                    { value: 'low', label: 'Low' },
                                                ]}
                                                size="sm"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-6 pt-4 border-t border-white/10 shrink-0">
                            <button
                                onClick={handleCreateTasksFromModal}
                                disabled={creatingTasks || aiTaskModal.tasks.length === 0}
                                className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-medium hover:opacity-90 transition-all shadow-lg shadow-teal-500/30 disabled:opacity-60 flex items-center justify-center gap-2"
                            >
                                {creatingTasks ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Creating Tasks...
                                    </>
                                ) : (
                                    <>
                                        <ListChecks className="w-4 h-4" />
                                        Create {aiTaskModal.tasks.length} Tasks
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Tasks Modal */}
            {tasksModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
                    onClick={e => e.target === e.currentTarget && setTasksModal(null)}
                >
                    <div className="w-full max-w-2xl rounded-3xl bg-slate-900 border border-white/10 shadow-2xl animate-scale-in max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/10 shrink-0">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                                    <ListChecks className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-white">{t('linkedTasks')}</h2>
                                    <p className="text-xs text-slate-400">{tasksModal.title}</p>
                                </div>
                            </div>
                            <button onClick={() => setTasksModal(null)} className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 space-y-2">
                            {tasks.filter(t => t.planId === tasksModal.id).length === 0 ? (
                                <p className="text-sm text-slate-500 text-center py-8">{t('noTasksLinked')}</p>
                            ) : (
                                tasks.filter(t => t.planId === tasksModal.id).map(task => (
                                    <div 
                                        key={task.id} 
                                        onClick={() => {
                                            setTasksModal(null);
                                            navigate(`/tasks?task=${task.id}`);
                                        }}
                                        className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 hover:border-white/20 transition-all"
                                    >
                                        <CheckCircle2 className={`w-5 h-5 shrink-0 ${task.status === 'completed' ? 'text-emerald-400' : 'text-slate-600'}`} />
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm ${task.status === 'completed' ? 'line-through text-slate-500' : 'text-white'}`}>{task.title}</p>
                                            {(task.dueDate || task.dueTime) && (
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    {task.dueDate && format(parseISO(task.dueDate), 'MMM d, yyyy')}
                                                    {task.dueTime && ` at ${task.dueTime}`}
                                                </p>
                                            )}
                                        </div>
                                        <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                                            task.priority === 'high' ? 'bg-rose-500/20 text-rose-400' :
                                            task.priority === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                                            'bg-emerald-500/20 text-emerald-400'
                                        }`}>
                                            {task.priority}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
