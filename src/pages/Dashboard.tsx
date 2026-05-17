import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFirestore } from '../contexts/FirestoreContext';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  CheckCircle2,
  Target,
  Zap,
  Plus,
  ArrowRight,
  Calendar,
  Clock,
  Flame,
  Trophy,
  FileText,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { format, isToday, isPast, parseISO } from 'date-fns';

export default function Dashboard() {
  const { tasks, plans } = useFirestore();
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const pending = total - completed;
    const overdue = tasks.filter(t =>
      t.status === 'pending' && t.dueDate && isPast(parseISO(t.dueDate))
    ).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, pending, overdue, completionRate };
  }, [tasks]);

  const todayTasks = useMemo(() => {
    return tasks.filter(t =>
      t.status === 'pending' && t.dueDate && isToday(parseISO(t.dueDate))
    ).slice(0, 4);
  }, [tasks]);

  const recentActivity = useMemo(() => {
    return tasks
      .filter(t => t.status === 'completed' && t.completedAt)
      .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
      .slice(0, 5);
  }, [tasks]);

  const activePlans = useMemo(() => {
    return plans.filter(p => p.status !== 'failed').slice(0, 2);
  }, [plans]);

  const getStatValue = (id: string) => {
    switch (id) {
      case 'total': return stats.total;
      case 'completed': return stats.completed;
      case 'pending': return stats.pending;
      case 'overdue': return stats.overdue;
      default: return 0;
    }
  };

  const getStatColor = (id: string) => {
    const map: Record<string, string> = {
      completed: '#10b981',
      pending: '#f59e0b',
      overdue: '#ef4444',
      total: '#8b5cf6'
    };
    return map[id] || '#6366f1';
  };

  const getHoverBorderClass = (id: string) => {
    const map: Record<string, string> = {
      completed: 'hover:border-emerald-400/50',
      pending: 'hover:border-amber-400/50',
      overdue: 'hover:border-rose-400/50',
      total: 'hover:border-violet-400/50',
    };

    return map[id] || 'hover:border-violet-400/50';
  };

  const getStatIcon = (id: string) => {
    switch (id) {
      case 'total': return Zap;
      case 'completed': return Trophy;
      case 'pending': return Clock;
      case 'overdue': return Flame;
      default: return Zap;
    }
  };

  const getStatBorderColor = (id: string) => {
    switch (id) {
      case 'total': return 'border-violet-500/30';
      case 'completed': return 'border-emerald-500/30';
      case 'pending': return 'border-amber-500/30';
      case 'overdue': return 'border-rose-500/30';
      default: return 'border-violet-500/30';
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('goodMorning');
    if (hour < 18) return t('goodAfternoon');
    return t('goodEvening');
  };

  return (
    <div>
      {/* Mobile Header - Greeting */}
      <div className="lg:hidden mb-6 md:mb-8">
        <div className="flex items-center gap-4 mb-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30 shrink-0">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-white">
              {getGreeting()}, <span className="gradient-text">{user?.displayName?.split(' ')[0] || t('user')}</span>
            </h1>
            <p className="text-slate-400 text-sm mt-0.5">{t('todayOverview')}</p>
          </div>
        </div>
      </div>

      {/* 4-Column Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8 pb-4">
        {['total', 'completed', 'pending', 'overdue'].map((id, index) => {
          const value = getStatValue(id);
          const color = getStatColor(id);
          const Icon = getStatIcon(id);
          const borderColor = getStatBorderColor(id);

          return (
            <div
              key={id}
              className={`
                relative overflow-hidden group rounded-2xl p-4 md:p-6
                bg-white/5 backdrop-blur-md border ${borderColor}
                hover:bg-white/10 ${getHoverBorderClass(id)}
                transition-all duration-300 cursor-pointer
                animate-fade-in
              `}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="relative mb-4 flex items-start gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-slate-400">
                    <div className={`rounded-lg p-2 bg-white/5 border ${borderColor}`}>
                      <Icon size={20} style={{ color }} />
                    </div>
                    <p className="text-xs md:text-sm text-slate-400">{t(id as 'totalTasks' | 'completed' | 'pending' | 'overdue')}</p>
                  </div>
                </div>
              </div>

              <div className="relative flex items-baseline gap-2 flex-wrap">
                <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-white">{value}</p>
                {id === 'completed' && stats.completionRate > 0 && (
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 shrink-0">
                    +{stats.completionRate}%
                  </span>
                )}
              </div>

              <div
                className="absolute -bottom-8 -right-8 w-20 h-20 rounded-full opacity-20 blur-2xl"
                style={{ background: `linear-gradient(to bottom right, ${color}, transparent)` }}
              />
            </div>
          );
        })}
      </div>

      {/* Recent Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Today's Tasks */}
        <div className="rounded-2xl p-5 md:p-6 bg-white/5 backdrop-blur-md border border-white/10">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/10 border border-violet-500/30 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-violet-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">{t('todaysTasks')}</h2>
            </div>
            <button
              onClick={() => navigate('/tasks')}
              className="text-sm text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors"
            >
              {t('viewAll')} <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {todayTasks.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <p className="text-white font-medium">{t('allCaughtUp')}</p>
              <p className="text-slate-400 text-sm">{t('noTasksDueToday')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all cursor-pointer group"
                >
                  <div className={`w-2.5 h-2.5 rounded-full ${task.priority === 'high' ? 'bg-gradient-to-r from-rose-500 to-red-500' :
                    task.priority === 'medium' ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
                      'bg-gradient-to-r from-emerald-500 to-teal-500'
                    }`} />
                  <span className="flex-1 text-white text-sm truncate group-hover:text-violet-300 transition-colors">{task.title}</span>
                  {task.dueTime && (
                    <span className="text-xs text-slate-400 bg-white/5 px-2 py-1 rounded-full">{task.dueTime}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity Feed */}
        <div className="rounded-2xl p-5 md:p-6 bg-white/5 backdrop-blur-md border border-white/10">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">{t('recentActivity')}</h2>
            </div>
          </div>

          {recentActivity.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-slate-500/20 to-slate-500/10 border border-slate-500/30 flex items-center justify-center">
                <FileText className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-white font-medium">{t('noActivityYet')}</p>
              <p className="text-slate-400 text-sm">{t('completeTaskToSeeHere')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">{task.title}</p>
                    <p className="text-xs text-slate-400">
                      {task.completedAt ? format(new Date(task.completedAt), 'MMM d, h:mm a') : t('completed')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Active Plans - Empty State */}
      <div className="mt-6 md:mt-8">
        <div className="rounded-2xl p-5 md:p-6 bg-white/5 backdrop-blur-md border border-white/10">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500/20 to-rose-500/10 border border-pink-500/30 flex items-center justify-center">
                <Target className="w-5 h-5 text-pink-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">{t('activePlans')}</h2>
            </div>
            <button
              onClick={() => navigate('/plans')}
              className="text-sm text-pink-400 hover:text-pink-300 flex items-center gap-1 transition-colors"
            >
              {t('viewAll')} <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {activePlans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10">
              <div className="w-20 h-20 mb-4 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/10 border border-violet-500/30 flex items-center justify-center animate-float">
                <Target className="w-10 h-10 text-violet-400" />
              </div>
              <p className="text-white font-medium mb-2">{t('noActivePlans')}</p>
              <p className="text-slate-400 text-sm mb-4">{t('setGoalToTrack')}</p>
              <button
                onClick={() => navigate('/plans?new=true')}
                className="px-5 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-violet-500/30"
              >
                <Plus className="w-4 h-4" />
                {t('createPlan')}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activePlans.map((plan) => (
                <div
                  key={plan.id}
                  className="p-4 rounded-xl bg-white/5 border border-white/5"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white font-medium truncate">{plan.title}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${plan.status === 'on_track' ? 'bg-emerald-500/20 text-emerald-400' :
                        plan.status === 'at_risk' ? 'bg-amber-500/20 text-amber-400' :
                          plan.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                            plan.status === 'overdue' ? 'bg-rose-500/20 text-rose-400' :
                              'bg-rose-500/20 text-rose-400'
                      }`}>
                      {plan.status === 'on_track' ? t('onTrack') :
                        plan.status === 'at_risk' ? t('atRisk') :
                          plan.status === 'completed' ? t('completedGroup') :
                            plan.status === 'overdue' ? t('overdue') :
                              t('failed')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-violet-500 to-pink-500"
                        style={{ width: `${Math.min((plan.completedCount / plan.targetCount) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-400">
                      {plan.completedCount}/{plan.targetCount}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => navigate('/tasks?new=true')}
        className="fixed bottom-24 right-4 md:bottom-6 md:right-6 w-14 h-14 md:w-16 md:h-16 bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-110 transition-all duration-300 z-50 animate-glow"
      >
        <Plus className="w-6 md:w-8 h-6 md:h-8" />
      </button>
    </div>
  );
}
