import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Plus, Search, SlidersHorizontal, X, Circle, CheckCircle2,
    Pencil, Trash2, ArrowUpDown, Calendar, Clock, RefreshCw, Tag, Link2,
    Briefcase, User2, HeartPulse, ShoppingBag, BookOpen, CalendarDays, PlayCircle
} from 'lucide-react';
import { useFirestore } from '../contexts/FirestoreContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Task, Plan, Priority, Category } from '../types';
import { parseISO, isToday, isTomorrow, isYesterday, isPast, format, isWithinInterval, addDays, addMonths, addYears, setHours, setMinutes, isBefore, differenceInMinutes, isAfter, startOfDay } from 'date-fns';
import Toast, { ToastState } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';

const priorityColors: Record<Priority, string> = {
    high: '#ef4444',
    medium: '#f59e0b',
    low: '#10b981',
};

const getDateLabel = (dateStr: string) => {
    if (!dateStr) return '';
    try {
        const date = parseISO(dateStr);
        if (isToday(date)) return 'Today';
        if (isTomorrow(date)) return 'Tomorrow';
        return format(date, 'MMM d');
    } catch {
        return dateStr;
    }
};

const getDueDateLabel = (dateStr: string) => {
    if (!dateStr) return '';
    try {
        const date = parseISO(dateStr);
        return format(date, 'MMM d');
    } catch {
        return dateStr;
    }
};

const categoryColors: Record<Category, string> = {
    work: '#6366f1',
    personal: '#8b5cf6',
    health: '#10b981',
    shopping: '#f59e0b',
    studying: '#06b6d4',
    planning: '#ec4899',
};

const emptyForm = {
    title: '',
    description: '',
    priority: 'medium' as Priority,
    category: 'personal' as Category,
    dueDate: '',
    dueTime: '',
    startDate: '',
    startTime: '',
    recurring: 'none' as Task['recurring'],
    planId: null as string | null,
};

const isOverdue = (task: Task): boolean => {
        if (!task.dueDate || task.status === 'completed') return false;
        
        const now = new Date();
        const dueDate = parseISO(task.dueDate);
        
        if (isPast(dueDate)) {
          if (isToday(dueDate) && task.dueTime) {
            const [hours, minutes] = task.dueTime.split(':').map(Number);
            const dueDateTime = setMinutes(setHours(dueDate, hours), minutes);
            return isBefore(dueDateTime, now);
          }
          return true;
        }
        return false;
    };

    function groupCompletedTasks(tasks: Task[]) {
        const groups: Record<string, Task[]> = {};
        
        for (const task of tasks) {
            if (task.status !== 'completed' || !task.completedAt) continue;
            
            const completedDate = parseISO(task.completedAt);
            let label: string;
            
            if (isToday(completedDate)) {
                label = 'Today';
            } else if (isYesterday(completedDate)) {
                label = 'Yesterday';
            } else if (isWithinInterval(completedDate, { start: addDays(new Date(), -7), end: new Date() })) {
                label = 'This Week';
            } else if (isWithinInterval(completedDate, { start: addDays(new Date(), -30), end: addDays(new Date(), -7) })) {
                label = 'This Month';
            } else {
                label = format(completedDate, 'MMM d, yyyy');
            }
            
            if (!groups[label]) groups[label] = [];
            groups[label].push(task);
        }
        
        return groups;
    }

    function groupTasks(tasks: Task[], t: (key: string) => string) {
        const now = new Date();
        const groups: Record<string, Task[]> = {
            [t('overdue')]: [],
            [t('today')]: [],
            [t('tomorrow')]: [],
            [t('thisWeek')]: [],
            [t('later')]: [],
            [t('noDueDate')]: [],
        };

        const overdueKey = t('overdue');
        const todayKey = t('today');
        const tomorrowKey = t('tomorrow');
        const thisWeekKey = t('thisWeek');
        const laterKey = t('later');
        const noDueDateKey = t('noDueDate');

        for (const task of tasks) {
            if (task.status === 'completed') continue;
            
            const groupDate = task.startDate ? parseISO(task.startDate) : (task.dueDate ? parseISO(task.dueDate) : null);
            
            if (!groupDate) { groups[noDueDateKey].push(task); continue; }
            
            if (task.dueDate && isOverdue(task)) { groups[overdueKey].push(task); continue; }
            
            if (isToday(groupDate)) { groups[todayKey].push(task); continue; }
            if (isTomorrow(groupDate)) { groups[tomorrowKey].push(task); continue; }
            if (isWithinInterval(groupDate, { start: now, end: addDays(now, 7) })) { groups[thisWeekKey].push(task); continue; }
            groups[laterKey].push(task);
        }

        return groups;
    }

export default function Tasks() {
    const { tasks, plans, addTask, updateTask, deleteTask, updatePlan } = useFirestore();
    const { t } = useLanguage();
    const [searchParams, setSearchParams] = useSearchParams();

    const [showForm, setShowForm] = useState(searchParams.get('new') === 'true');
    const [filterPlan, setFilterPlan] = useState<string | null>(searchParams.get('plan'));
    const [highlightedTask, setHighlightedTask] = useState<string | null>(null);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [formData, setFormData] = useState(emptyForm);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');
    const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all');
    const [filterCategory, setFilterCategory] = useState<Category | 'all'>('all');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [showFilters, setShowFilters] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState<ToastState | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string } | null>(null);
    const [isClosing, setIsClosing] = useState(false);
    const [completedGroupsExpanded, setCompletedGroupsExpanded] = useState<Record<string, boolean>>({});
    const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

    const closeToast = useCallback(() => setToast(null), []);

    useEffect(() => {
        const planParam = searchParams.get('plan');
        if (planParam) {
            setFilterPlan(planParam);
        }
    }, [searchParams, setSearchParams]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (expandedTaskId && !(e.target as HTMLElement).closest('[data-task-expanded]')) {
                setExpandedTaskId(null);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [expandedTaskId]);

    const resetForm = () => {
        setFormData(emptyForm);
        setEditingTask(null);
    };

    const openForm = () => {
        resetForm();
        setShowForm(true);
    };

    const closeForm = () => {
        setIsClosing(true);
        setTimeout(() => {
            setShowForm(false);
            setIsClosing(false);
            setSearchParams({});
            resetForm();
        }, 200);
    };

    const handleEdit = (task: Task) => {
        setEditingTask(task);
        setFormData({
            title: task.title,
            description: task.description,
            priority: task.priority,
            category: task.category,
            dueDate: task.dueDate,
            dueTime: task.dueTime,
            startDate: task.startDate ?? '',
            startTime: task.startTime ?? '',
            recurring: task.recurring,
            planId: task.planId ?? null,
        });
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title.trim()) return;

        if (formData.dueTime && !formData.dueDate) {
            setToast({ type: 'error', message: 'Please enter due date when setting due time' });
            return;
        }

        if (formData.startTime && !formData.startDate) {
            setToast({ type: 'error', message: 'Please enter start date when setting start time' });
            return;
        }

        if (!editingTask && !formData.startDate) {
            setToast({ type: 'error', message: 'Please select a start date to create a task' });
            return;
        }

        setSubmitting(true);
        setToast({ type: 'loading', message: editingTask ? 'Saving changes…' : 'Adding task…' });

        try {
            if (editingTask) {
                await updateTask(editingTask.id, formData);
            } else {
                await addTask({
                    ...formData,
                    status: 'pending',
                    startDate: formData.startDate || null,
                    planId: formData.planId,
                    userId: '',
                });
            }
            closeForm();
            setToast({ type: 'success', message: editingTask ? 'Task updated!' : 'Task added successfully!' });
        } catch {
            setToast({ type: 'error', message: 'Something went wrong. Please try again.' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleComplete = async (task: Task) => {
        const now = new Date();
        const todayStr = format(now, 'yyyy-MM-dd');
        
        const taskDate = task.startDate || task.dueDate;
        if (!taskDate) {
            const next = task.status === 'completed' ? 'pending' : 'completed';
            await updateTask(task.id, {
                status: next,
                completedAt: next === 'completed' ? new Date().toISOString() : null,
            });
            return;
        }

        const taskDateStr = taskDate.split('T')[0];
        
        if (task.status !== 'completed' && taskDateStr > todayStr) {
            setToast({ type: 'error', message: `Cannot complete future tasks. Complete from Today only.` });
            return;
        }

        const next = task.status === 'completed' ? 'pending' : 'completed';
        await updateTask(task.id, {
            status: next,
            completedAt: next === 'completed' ? new Date().toISOString() : null,
        });

        if (next === 'completed' && task.recurring !== 'none') {
            const today = new Date();
            
            if (task.dueDate) {
                const dueDate = parseISO(task.dueDate);
                if (isBefore(dueDate, today)) {
                    setToast({ type: 'info', message: `Task completed! Recurring ended as due date passed.` });
                } else {
                    await createNextRecurringTask(task, today);
                }
            } else {
                await createNextRecurringTask(task, today);
            }
        }

        if (task.planId) {
            const plan = plans.find(p => p.id === task.planId);
            if (plan) {
                const newCount = next === 'completed' ? plan.completedCount + 1 : Math.max(0, plan.completedCount - 1);
                await updatePlan(task.planId, { completedCount: newCount });
            }
        }
    };

    const createNextRecurringTask = async (task: Task, baseDate: Date) => {
        let newDueDate = '';
        let newStartDate = '';
        
        if (task.recurring === 'daily') {
            newStartDate = format(addDays(baseDate, 1), 'yyyy-MM-dd');
            newDueDate = task.dueDate ? format(addDays(parseISO(task.dueDate), 1), 'yyyy-MM-dd') : '';
        } else if (task.recurring === 'weekly') {
            newStartDate = format(addDays(baseDate, 7), 'yyyy-MM-dd');
            newDueDate = task.dueDate ? format(addDays(parseISO(task.dueDate), 7), 'yyyy-MM-dd') : '';
        } else if (task.recurring === 'monthly') {
            newStartDate = format(addMonths(baseDate, 1), 'yyyy-MM-dd');
            newDueDate = task.dueDate ? format(addMonths(parseISO(task.dueDate), 1), 'yyyy-MM-dd') : '';
        } else if (task.recurring === 'yearly') {
            newStartDate = format(addYears(baseDate, 1), 'yyyy-MM-dd');
            newDueDate = task.dueDate ? format(addYears(parseISO(task.dueDate), 1), 'yyyy-MM-dd') : '';
        }
        
        if (newStartDate) {
            await addTask({
                title: task.title,
                description: task.description,
                priority: task.priority,
                category: task.category,
                status: 'pending',
                dueDate: newDueDate || task.dueDate || '',
                dueTime: task.dueTime,
                startDate: newStartDate,
                startTime: task.startTime,
                recurring: task.recurring,
                planId: task.planId,
                userId: '',
            });
        }
    };

    const handleDeleteConfirm = async () => {
        if (!confirmDelete) return;
        try {
            await deleteTask(confirmDelete.id);
            setToast({ type: 'success', message: 'Task deleted.' });
        } catch {
            setToast({ type: 'error', message: 'Failed to delete task.' });
        } finally {
            setConfirmDelete(null);
        }
    };

    const filteredTasks = useMemo(() => {
        let list = tasks.filter(t => {
            if (filterPlan && t.planId !== filterPlan) return false;
            if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.description?.toLowerCase().includes(search.toLowerCase())) return false;
            if (filterStatus !== 'all' && t.status !== filterStatus) return false;
            if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
            if (filterCategory !== 'all' && t.category !== filterCategory) return false;
            return true;
        });

        list = list.sort((a, b) => {
            const da = a.dueDate ? parseISO(a.dueDate).getTime() : Infinity;
            const db = b.dueDate ? parseISO(b.dueDate).getTime() : Infinity;
            return sortOrder === 'asc' ? da - db : db - da;
        });

        return list;
    }, [tasks, filterPlan, search, filterStatus, filterPriority, filterCategory, sortOrder]);

    const grouped = useMemo(() => groupTasks(filteredTasks, t), [filteredTasks, t]);
    const groupedCompleted = useMemo(() => groupCompletedTasks(filteredTasks), [filteredTasks]);

    const groupOrder = [
        t('overdue'),
        t('today'),
        t('tomorrow'),
        t('thisWeek'),
        t('later'),
        t('noDueDate'),
    ];

    const completedGroupOrder = Object.keys(groupedCompleted).sort((a, b) => {
        const order = ['Today', 'Yesterday', 'This Week', 'This Month'];
        const aIndex = order.indexOf(a);
        const bIndex = order.indexOf(b);
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return 0;
    });

    return (
        <div>
            {/* Toast */}
            {toast && <Toast {...toast} onClose={closeToast} />}

            {/* Confirm Delete Dialog */}
            <AnimatePresence>
                {confirmDelete && (
                    <ConfirmDialog
                        title="Delete Task?"
                        message={`"${confirmDelete.title}" will be permanently removed.`}
                        onConfirm={handleDeleteConfirm}
                        onCancel={() => setConfirmDelete(null)}
                    />
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white">{t('tasks')}</h1>
                    <p className="text-slate-400 text-sm mt-1">{tasks.length} total · {tasks.filter(t => t.status === 'pending').length} pending</p>
                </div>
                <button
                    onClick={openForm}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-violet-500/30 shrink-0"
                >
                    <Plus className="w-4 h-4" />
                    {t('newTask')}
                </button>
            </div>

            {/* Search + filter bar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder={t('searchTasks')}
                        className="input !pl-9"
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${showFilters ? 'bg-violet-500/20 border-violet-500/40 text-violet-300' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}
                    >
                        <SlidersHorizontal className="w-4 h-4" />
                        {t('all')}
                    </button>
                    <button
                        onClick={() => setSortOrder(s => s === 'asc' ? 'desc' : 'asc')}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-medium text-slate-400 hover:text-white transition-all"
                    >
                        <ArrowUpDown className="w-4 h-4" />
                        {sortOrder === 'asc' ? t('earliest') : t('latest')}
                    </button>
                    {filterPlan && (
                        <button
                            onClick={() => setFilterPlan(null)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-300 text-sm font-medium hover:bg-teal-500/30 transition-all"
                        >
                            <X className="w-4 h-4" />
                            {t('clearFilter')}
                        </button>
                    )}
                </div>
            </div>

            {/* Filter panel */}
            {showFilters && (
                <div className="rounded-2xl p-4 bg-white/5 border border-white/10 mb-4 animate-slide-in flex flex-wrap gap-3">
                    <div className="flex flex-wrap gap-1.5">
                        {(['all', 'pending', 'completed'] as const).map(s => (
                            <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${filterStatus === s ? 'bg-violet-500/30 text-violet-300 border border-violet-500/40' : 'bg-white/5 text-slate-400 border border-white/10 hover:text-white'}`}>{s}</button>
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {(['all', 'high', 'medium', 'low'] as const).map(p => (
                            <button key={p} onClick={() => setFilterPriority(p)} className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${filterPriority === p ? 'bg-violet-500/30 text-violet-300 border border-violet-500/40' : 'bg-white/5 text-slate-400 border border-white/10 hover:text-white'}`}>{p}</button>
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {(['all', 'work', 'personal', 'health', 'shopping', 'studying', 'planning'] as const).map(c => (
                            <button key={c} onClick={() => setFilterCategory(c)} className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${filterCategory === c ? 'bg-violet-500/30 text-violet-300 border border-violet-500/40' : 'bg-white/5 text-slate-400 border border-white/10 hover:text-white'}`}>{c}</button>
                        ))}
                    </div>
                </div>
            )}

            {/* Task groups */}
            <div className="space-y-6">
                {groupOrder.map(groupName => {
                    const items = grouped[groupName];
                    if (!items || items.length === 0) return null;

                    return (
                        <div key={groupName}>
                            <div className="flex items-center gap-2 mb-3">
                                <h2 className={`text-sm font-semibold uppercase tracking-wider ${groupName === 'Overdue' ? 'text-rose-400' : groupName === 'Today' ? 'text-violet-400' : 'text-slate-400'}`}>
                                    {groupName}
                                </h2>
                                <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">{items.length}</span>
                            </div>

                            <div className="space-y-2">
                                {items.map(task => (
                                    <div key={task.id} data-task-expanded={expandedTaskId === task.id ? 'true' : undefined}>
                                        <div
                                            onClick={(e) => {
                                                if ((e.target as HTMLElement).closest('button')) return;
                                                setExpandedTaskId(expandedTaskId === task.id ? null : task.id);
                                            }}
                                            className={`flex items-start gap-3 p-4 rounded-2xl bg-white/5 border transition-all hover:bg-white/8 group ${task.status === 'completed' ? 'opacity-60 border-white/5' : 'border-white/10 hover:border-white/20'} ${highlightedTask === task.id ? 'animate-border-pulse border-violet-400' : ''} ${expandedTaskId === task.id ? '!bg-white/10' : ''}`}
                                            style={{ borderLeftWidth: '3px', borderLeftColor: priorityColors[task.priority] }}
                                        >
                                            {/* Checkbox */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setExpandedTaskId(expandedTaskId === task.id ? null : task.id);
                                                }}
                                                className="shrink-0 mt-0.5 transition-transform active:scale-90"
                                            >
                                                {task.status === 'completed'
                                                    ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                                    : <Circle className="w-5 h-5 text-slate-500 hover:text-violet-400 transition-colors" />
                                                }
                                            </button>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <p className={`font-medium text-sm ${task.status === 'completed' ? 'line-through text-slate-500' : 'text-white'}`}>{task.title}</p>
                                                {task.description && (
                                                    <p className="text-xs text-slate-400 mt-0.5 truncate">{task.description}</p>
                                                )}
                                                <div className="flex flex-wrap gap-1.5 mt-2">
                                                    <span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize" style={{ background: `${priorityColors[task.priority]}20`, color: priorityColors[task.priority] }}>
                                                        {task.priority}
                                                    </span>
                                                    <span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize flex items-center gap-1" style={{ background: `${categoryColors[task.category]}20`, color: categoryColors[task.category] }}>
                                                        {task.category === 'work' && <Briefcase className="w-3 h-3" />}
                                                        {task.category === 'personal' && <User2 className="w-3 h-3" />}
                                                        {task.category === 'health' && <HeartPulse className="w-3 h-3" />}
                                                        {task.category === 'shopping' && <ShoppingBag className="w-3 h-3" />}
                                                        {task.category === 'studying' && <BookOpen className="w-3 h-3" />}
                                                        {task.category === 'planning' && <CalendarDays className="w-3 h-3" />}
                                                        {task.category}
                                                    </span>
                                                    {task.startDate && (
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 flex items-center gap-1">
                                                            <PlayCircle className="w-3 h-3" />Start: {getDateLabel(task.startDate)}
                                                        </span>
                                                    )}
                                                    {task.dueDate && (
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" />Due: {getDueDateLabel(task.dueDate)}
                                                        </span>
                                                    )}
                                                    {task.dueTime && (
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-slate-400 flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />{task.dueTime}
                                                        </span>
                                                    )}
                                                    {task.recurring !== 'none' && (
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 flex items-center gap-1 capitalize">
                                                            <RefreshCw className="w-3 h-3" />{task.recurring}
                                                        </span>
                                                    )}
                                                    {task.planId && (() => {
                                                        const linked = plans.find((p: Plan) => p.id === task.planId);
                                                        return linked ? (
                                                            <span className="text-xs px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-400 flex items-center gap-1">
                                                                <Link2 className="w-3 h-3" />{linked.title}
                                                            </span>
                                                        ) : null;
                                                    })()}
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex">
                                                <button onClick={(e) => { e.stopPropagation(); handleEdit(task); }} className="p-1.5 rounded-lg hover:bg-violet-500/20 text-slate-400 hover:text-violet-400 transition-all">
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); setConfirmDelete({ id: task.id, title: task.title }); }} className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="flex gap-1 shrink-0 sm:hidden">
                                                <button onClick={(e) => { e.stopPropagation(); handleEdit(task); }} className="p-1.5 rounded-lg hover:bg-violet-500/20 text-slate-400 hover:text-violet-400 transition-all">
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); setConfirmDelete({ id: task.id, title: task.title }); }} className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        
                                        {/* Expandable Confirm/Cancel buttons */}
                                        <AnimatePresence>
                                            {expandedTaskId === task.id && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="flex gap-2 pt-2 pl-8">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleToggleComplete(task);
                                                                setExpandedTaskId(null);
                                                                setToast({ 
                                                                    type: 'success', 
                                                                    message: task.status === 'completed' ? 'Task restored!' : 'Task completed successfully!' 
                                                                });
                                                            }}
                                                            className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-2 ${task.status === 'completed' ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 hover:bg-amber-500/30' : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30'}`}
                                                        >
                                                            <CheckCircle2 className="w-4 h-4" />
                                                            {task.status === 'completed' ? 'Restore' : 'Complete'}
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setExpandedTaskId(null);
                                                            }}
                                                            className="flex-1 py-2 px-4 rounded-lg bg-white/5 border border-white/10 text-slate-400 text-sm font-medium hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2"
                                                        >
                                                            <X className="w-4 h-4" />
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}

                {/* Completed tasks grouped by date */}
                {completedGroupOrder.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-white/10">
                        <div className="flex items-center gap-2 mb-4">
                            <h2 className="text-sm font-semibold uppercase tracking-wider text-emerald-400">
                                Completed
                            </h2>
                            <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">
                                {Object.values(groupedCompleted).flat().length}
                            </span>
                        </div>
                        
                        {completedGroupOrder.map(groupName => {
                            const items = groupedCompleted[groupName];
                            if (!items || items.length === 0) return null;
                            
                            const isExpanded = completedGroupsExpanded[groupName] ?? true;
                            
                            return (
                                <div key={groupName} className="mb-4">
                                    <button
                                        onClick={() => setCompletedGroupsExpanded(prev => ({ ...prev, [groupName]: !prev[groupName] }))}
                                        className="flex items-center gap-3 w-full mb-2 hover:bg-white/5 p-3 rounded-lg transition-all min-h-[44px]"
                                    >
                                        <svg 
                                            className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} 
                                            fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide flex-1 text-left">
                                            {groupName}
                                        </h3>
                                        <span className="text-xs text-slate-500 bg-white/5 px-2.5 py-1 rounded-full">{items.length}</span>
                                    </button>
                                    
                                    <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                        <div className="space-y-2 pl-4">
                                            {items.map(task => (
                                                <div
                                                    key={task.id}
                                                    className="flex items-start gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 opacity-60"
                                                    style={{ borderLeftWidth: '3px', borderLeftColor: priorityColors[task.priority] }}
                                                >
                                                    <button
                                                        onClick={() => handleToggleComplete(task)}
                                                        className="shrink-0 mt-0.5 transition-transform active:scale-90"
                                                    >
                                                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                                    </button>
                                                    
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-sm line-through text-slate-500">{task.title}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {filteredTasks.length === 0 && (
                    <div className="text-center py-20 text-slate-400">
                        <p className="text-lg font-medium text-white mb-2">{t('noTasksFound')}</p>
                        <p className="text-sm">{t('tryAdjustingFilters')}</p>
                    </div>
                )}
            </div>

            {/* Form Modal */}
            {showForm && (
                <div
                    className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}
                    onClick={e => e.target === e.currentTarget && closeForm()}
                >
                    <div className={`w-full max-w-lg rounded-3xl bg-slate-900 border border-white/10 shadow-2xl ${isClosing ? 'animate-scale-out' : 'animate-scale-in'}`}>
                        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/10">
                            <h2 className="text-lg font-semibold text-white">{editingTask ? t('editTask') : t('newTask')}</h2>
                            <button onClick={closeForm} className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
                            {/* Title */}
                            <div>
                                <label className="text-xs font-medium text-slate-400 block mb-1.5">{t('title')} *</label>
                                <input
                                    className="input"
                                    placeholder={t('description')}
                                    value={formData.title}
                                    onChange={e => setFormData(f => ({ ...f, title: e.target.value }))}
                                    required
                                    autoFocus
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="text-xs font-medium text-slate-400 block mb-1.5">{t('description')}</label>
                                <textarea
                                    className="input resize-none"
                                    rows={2}
                                    placeholder={t('description')}
                                    value={formData.description}
                                    onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                                />
                            </div>

                            {/* Priority — pill buttons */}
                            <div>
                                <label className="text-xs font-medium text-slate-400 block mb-2">{t('priority')}</label>
                                <div className="flex gap-2">
                                    {([
                                        { value: 'high', label: `🔴 ${t('high')}`, active: 'bg-rose-500/25 border-rose-500/60 text-rose-300' },
                                        { value: 'medium', label: `🟡 ${t('medium')}`, active: 'bg-amber-500/25 border-amber-500/60 text-amber-300' },
                                        { value: 'low', label: `🟢 ${t('low')}`, active: 'bg-emerald-500/25 border-emerald-500/60 text-emerald-300' },
                                    ] as const).map(p => (
                                        <button
                                            key={p.value}
                                            type="button"
                                            onClick={() => setFormData(f => ({ ...f, priority: p.value }))}
                                            className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all border ${formData.priority === p.value ? p.active : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'}`}
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Category — grid buttons */}
                            <div>
                                <label className="text-xs font-medium text-slate-400 block mb-2">{t('category')}</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {([
                                        { value: 'work', label: t('work'), Icon: Briefcase },
                                        { value: 'personal', label: t('personal'), Icon: User2 },
                                        { value: 'health', label: t('health'), Icon: HeartPulse },
                                        { value: 'shopping', label: t('shopping'), Icon: ShoppingBag },
                                        { value: 'studying', label: t('studying'), Icon: BookOpen },
                                        { value: 'planning', label: t('planning'), Icon: CalendarDays },
                                    ] as const).map(c => {
                                        const isActive = formData.category === c.value;
                                        const color = categoryColors[c.value];
                                        return (
                                            <button
                                                key={c.value}
                                                type="button"
                                                onClick={() => setFormData(f => ({ ...f, category: c.value, planId: c.value !== 'planning' ? null : f.planId }))}
                                                className="py-2.5 rounded-xl text-xs font-medium transition-all border flex flex-col items-center gap-1"
                                                style={isActive
                                                    ? { background: `${color}20`, borderColor: `${color}60`, color }
                                                    : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)', color: '#94a3b8' }
                                                }
                                            >
                                                <c.Icon className="w-5 h-5 mb-1" />
                                                {c.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Link to Plan — shown only when category is 'planning' */}
                            {formData.category === 'planning' && (
                                <div className="animate-slide-in">
                                    <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5 mb-2">
                                        <Link2 className="w-3.5 h-3.5" /> {t('linkToPlan')}
                                    </label>
                                    {plans.length === 0 ? (
                                        <p className="text-xs text-slate-500 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10">
                                            {t('noActivePlans')}
                                        </p>
                                    ) : (
                                        <div className="flex flex-col gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => setFormData(f => ({ ...f, planId: null }))}
                                                className={`px-3 py-2 rounded-xl text-xs font-medium transition-all border text-left ${formData.planId === null
                                                    ? 'bg-white/10 border-white/25 text-white'
                                                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/8'
                                                    }`}
                                            >
                                                {t('none')}
                                            </button>
                                            {(plans as Plan[]).map(plan => (
                                                <button
                                                    key={plan.id}
                                                    type="button"
                                                    onClick={() => setFormData(f => ({ ...f, planId: plan.id }))}
                                                    className={`px-3 py-2.5 rounded-xl text-xs font-medium transition-all border text-left flex items-center justify-between gap-2 ${formData.planId === plan.id
                                                        ? 'bg-pink-500/20 border-pink-500/50 text-pink-300'
                                                        : 'bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/8'
                                                        }`}
                                                >
                                                    <span className="truncate flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" /> {plan.title}</span>
                                                    {formData.planId === plan.id && (
                                                        <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-pink-500/30 text-pink-300">linked</span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Dates */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-medium text-slate-400 block mb-1.5">{t('startDate')}</label>
                                    <input type="date" className="input" value={formData.startDate} onChange={e => setFormData(f => ({ ...f, startDate: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-400 block mb-1.5">{t('startTime')}</label>
                                    <input type="time" className="input" value={formData.startTime} onChange={e => setFormData(f => ({ ...f, startTime: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-400 block mb-1.5">{t('dueDate')}</label>
                                    <input type="date" className="input" value={formData.dueDate} onChange={e => setFormData(f => ({ ...f, dueDate: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-400 block mb-1.5">{t('dueTime')}</label>
                                    <input type="time" className="input" value={formData.dueTime} onChange={e => setFormData(f => ({ ...f, dueTime: e.target.value }))} />
                                </div>
                            </div>

                            {/* Recurring */}
                            <div>
                                <label className="text-xs font-medium text-slate-400 block mb-2">{t('recurring')}</label>
                                <div className="flex flex-wrap gap-2">
                                    {([
                                        { value: 'none', label: t('none') },
                                        { value: 'daily', label: t('daily') },
                                        { value: 'weekly', label: t('weekly') },
                                        { value: 'monthly', label: t('monthly') },
                                        { value: 'yearly', label: t('yearly') },
                                    ] as const).map(r => (
                                        <button
                                            key={r.value}
                                            type="button"
                                            onClick={() => setFormData(f => ({ ...f, recurring: r.value }))}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all border ${formData.recurring === r.value ? 'bg-blue-500/20 border-blue-500/50 text-blue-300' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'}`}
                                        >
                                            {r.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-1">
                                <button type="button" onClick={closeForm} className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all text-sm font-medium">
                                    {t('cancel')}
                                </button>
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
                                    {submitting ? t('save') : editingTask ? t('save') : t('newTask')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
