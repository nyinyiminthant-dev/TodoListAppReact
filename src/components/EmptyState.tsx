import { ReactNode } from 'react';
import { Target } from 'lucide-react';

interface EmptyStateProps {
    title: string;
    description?: string;
    action?: ReactNode;
    icon?: ReactNode;
}

export default function EmptyState({ title, description, action, icon }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-20 h-20 mb-5 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/10 border border-violet-500/30 flex items-center justify-center animate-float">
                {icon ?? <Target className="w-10 h-10 text-violet-400" />}
            </div>
            <h3 className="text-white font-semibold text-lg mb-2">{title}</h3>
            {description && <p className="text-slate-400 text-sm mb-5 max-w-xs">{description}</p>}
            {action && <div>{action}</div>}
        </div>
    );
}
