import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { useFirestore } from '../contexts/FirestoreContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
    startOfMonth, endOfMonth, startOfWeek, endOfWeek,
    startOfYear, endOfYear, eachDayOfInterval, eachWeekOfInterval,
    eachMonthOfInterval, format, isSameDay, isSameMonth,
    addMonths, subMonths, addYears, subYears, isWithinInterval, parseISO
} from 'date-fns';

type ViewType = 'month' | 'week' | 'year';

const categoryColors: Record<string, string> = {
    work: '#6366f1',
    personal: '#8b5cf6',
    health: '#10b981',
    shopping: '#f59e0b',
    studying: '#06b6d4',
    planning: '#ec4899',
};

const tooltipStyle = {
    backgroundColor: '#1e293b',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    color: '#f1f5f9',
    fontSize: 12,
};

export default function Analytics() {
    const { tasks, categories } = useFirestore();
    const { t } = useLanguage();
    const [viewType, setViewType] = useState<ViewType>('month');
    const [currentDate, setCurrentDate] = useState(new Date());

    const handlePrev = () => {
        if (viewType === 'month' || viewType === 'week') setCurrentDate(d => subMonths(d, 1));
        else setCurrentDate(d => subYears(d, 1));
    };

    const handleNext = () => {
        if (viewType === 'month' || viewType === 'week') setCurrentDate(d => addMonths(d, 1));
        else setCurrentDate(d => addYears(d, 1));
    };

    const dateRange = useMemo(() => {
        if (viewType === 'year') {
            return { start: startOfYear(currentDate), end: endOfYear(currentDate), label: format(currentDate, 'yyyy') };
        }
        return { start: startOfMonth(currentDate), end: endOfMonth(currentDate), label: format(currentDate, 'MMMM yyyy') };
    }, [viewType, currentDate]);

    const tasksInRange = useMemo(() =>
        tasks.filter(t => t.dueDate && isWithinInterval(parseISO(t.dueDate), dateRange)),
        [tasks, dateRange]
    );

    const stats = useMemo(() => {
        const total = tasksInRange.length;
        const completed = tasksInRange.filter(t => t.status === 'completed').length;
        const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
        return { total, completed, rate };
    }, [tasksInRange]);

    const monthlyData = useMemo(() => {
        const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
        return days.map(day => {
            const dayTasks = tasks.filter(t => t.dueDate && isSameDay(parseISO(t.dueDate), day));
            return {
                date: format(day, 'd'),
                completed: dayTasks.filter(t => t.status === 'completed').length,
                total: dayTasks.length,
            };
        });
    }, [tasks, dateRange]);

    const weeklyData = useMemo(() => {
        const weeks = eachWeekOfInterval({ start: dateRange.start, end: dateRange.end });
        return weeks.map(weekStart => {
            const weekEnd = endOfWeek(weekStart);
            const weekTasks = tasks.filter(t => t.dueDate && isWithinInterval(parseISO(t.dueDate), { start: weekStart, end: weekEnd }));
            return {
                week: `${format(weekStart, 'MMM d')}`,
                weekFull: `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`,
                completed: weekTasks.filter(t => t.status === 'completed').length,
                total: weekTasks.length,
            };
        });
    }, [tasks, dateRange]);

    const yearlyData = useMemo(() => {
        const months = eachMonthOfInterval({ start: dateRange.start, end: dateRange.end });
        return months.map(month => {
            const monthTasks = tasks.filter(t => t.dueDate && isSameMonth(parseISO(t.dueDate), month));
            return {
                month: format(month, 'MMM'),
                completed: monthTasks.filter(t => t.status === 'completed').length,
                total: monthTasks.length,
            };
        });
    }, [tasks, dateRange]);

    const categoryData = useMemo(() => {
        return categories.map(cat => ({
            name: cat.name,
            value: tasksInRange.filter(t => t.category === cat.id && t.status === 'completed').length,
            color: categoryColors[cat.id] || cat.color,
        })).filter(c => c.value > 0);
    }, [categories, tasksInRange]);

    return (
        <div>
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-white">{t('analytics')}</h1>
                <p className="text-slate-400 text-sm mt-1">{t('trackYourTrends')}</p>
            </div>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
                {/* View toggle */}
                <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 gap-1">
                    {(['month', 'week', 'year'] as ViewType[]).map(v => (
                        <button
                            key={v}
                            onClick={() => setViewType(v)}
                            className={`px-3 sm:px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${viewType === v ? 'bg-violet-500 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            {t(v as 'month' | 'week' | 'year')}
                        </button>
                    ))}
                </div>

                {/* Date navigator */}
                <div className="flex items-center gap-2">
                    <button onClick={handlePrev} className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-medium text-white min-w-[130px] text-center">{dateRange.label}</span>
                    <button onClick={handleNext} className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                    { labelKey: 'total', value: stats.total, color: '#6366f1' },
                    { labelKey: 'completed', value: stats.completed, color: '#10b981' },
                    { labelKey: 'successRate', value: `${stats.rate}%`, color: '#8b5cf6' },
                ].map(s => (
                    <div key={s.labelKey} className="rounded-2xl p-4 bg-white/5 border border-white/10 text-center">
                        <p className="text-xl md:text-2xl font-bold text-white">{s.value}</p>
                        <p className="text-xs text-slate-400 mt-1">{t(s.labelKey as 'total' | 'completed' | 'successRate')}</p>
                    </div>
                ))}
            </div>

            {/* Main chart */}
            <div className="rounded-2xl p-5 bg-white/5 border border-white/10 mb-6">
                <h2 className="text-sm font-semibold text-slate-300 mb-4">
                    {viewType === 'month' ? t('dailyCompletions') : viewType === 'week' ? t('weeklyTrend') : t('monthlyOverview')}
                </h2>
                <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                        {viewType === 'week' ? (
                            <LineChart data={weeklyData} margin={{ top: 4, right: 8, bottom: 4, left: -20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                <XAxis dataKey="week" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} interval={0} dy={5} />
                                <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={tooltipStyle} labelFormatter={(label) => {
                                    const data = weeklyData.find(d => d.week === label);
                                    return data?.weekFull || label;
                                }} />
                                <Line type="monotone" dataKey="completed" stroke="#6366f1" strokeWidth={2.5} dot={{ fill: '#6366f1', r: 4 }} activeDot={{ r: 6 }} name={t('completed')} />
                                <Line type="monotone" dataKey="total" stroke="#a5b4fc" strokeWidth={2} dot={{ fill: '#a5b4fc', r: 3 }} name={t('total')} />
                            </LineChart>
                        ) : (
                            <BarChart data={viewType === 'month' ? monthlyData : yearlyData} margin={{ top: 4, right: 8, bottom: 4, left: -20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                <XAxis dataKey={viewType === 'month' ? 'date' : 'month'} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={tooltipStyle} />
                                <Bar dataKey="completed" name={t('completed')} fill="#6366f1" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="total" name={t('total')} fill="rgba(99,102,241,0.25)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        )}
                    </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-center gap-6 mt-3 pt-3 border-t border-white/10">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-1.5 rounded-full bg-violet-500" />
                        <span className="text-sm text-slate-300 font-medium">{t('completed')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-1.5 rounded-full bg-indigo-300" />
                        <span className="text-sm text-slate-300 font-medium">{t('total')}</span>
                    </div>
                </div>
            </div>

            {/* Category pie */}
            {categoryData.length > 0 && (
                <div className="rounded-2xl p-5 bg-white/5 border border-white/10">
                    <h2 className="text-sm font-semibold text-slate-300 mb-4">{t('completedByCategory')}</h2>
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                        <div className="h-48 w-full sm:w-1/2">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={categoryData} cx="50%" cy="50%" innerRadius={52} outerRadius={80} paddingAngle={3} dataKey="value">
                                        {categoryData.map((entry, i) => (
                                            <Cell key={i} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={tooltipStyle} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex flex-col gap-2 flex-1">
                            {categoryData.map(c => (
                                <div key={c.name} className="flex items-center gap-2 text-sm">
                                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                                    <span className="text-slate-300 flex-1 capitalize">{c.name}</span>
                                    <span className="text-white font-medium">{c.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
