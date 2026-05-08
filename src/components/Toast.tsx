import { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'loading';

export interface ToastState {
    type: ToastType;
    message: string;
}

interface ToastProps extends ToastState {
    onClose: () => void;
}

export default function Toast({ type, message, onClose }: ToastProps) {
    useEffect(() => {
        if (type === 'loading') return;
        const t = setTimeout(onClose, 3000);
        return () => clearTimeout(t);
    }, [type, onClose]);

    const styles = {
        success: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
        error: 'bg-rose-500/20    border-rose-500/40    text-rose-300',
        loading: 'bg-violet-500/20  border-violet-500/40  text-violet-300',
    };

    return (
        <div className="fixed top-5 right-5 z-[200] animate-slide-in">
            <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-xl border min-w-[220px] ${styles[type]}`}>
                {type === 'loading' && <Loader2 className="w-4 h-4 shrink-0 animate-spin" />}
                {type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                {type === 'error' && <AlertCircle className="w-4 h-4 shrink-0" />}
                <span className="text-sm font-medium flex-1">{message}</span>
                {type !== 'loading' && (
                    <button onClick={onClose} className="hover:opacity-60 transition-opacity shrink-0">
                        <X className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>
        </div>
    );
}
