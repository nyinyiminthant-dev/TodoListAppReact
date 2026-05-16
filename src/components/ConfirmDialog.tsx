import { motion } from 'framer-motion';
import { Trash2, LogOut, LucideIcon } from 'lucide-react';

interface ConfirmDialogProps {
    title: string;
    message: string;
    confirmLabel?: string;
    icon?: LucideIcon;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmDialog({ title, message, confirmLabel = 'Delete', icon: Icon = Trash2, onConfirm, onCancel }: ConfirmDialogProps) {
    const isSignOut = Icon === LogOut;
    
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={e => e.target === e.currentTarget && onCancel()}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="w-full max-w-sm rounded-3xl bg-slate-900 border border-white/10 shadow-2xl p-6"
            >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
                    isSignOut 
                        ? 'bg-rose-500/20 border border-rose-500/30' 
                        : 'bg-rose-500/20 border border-rose-500/30'
                }`}>
                    <Icon className={`w-7 h-7 ${isSignOut ? 'text-rose-400' : 'text-rose-400'}`} />
                </div>

                <h3 className="text-white font-semibold text-center text-lg mb-1.5">{title}</h3>
                <p className="text-slate-400 text-sm text-center mb-6 leading-relaxed">{message}</p>

                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-3 rounded-2xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-all text-sm font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 py-3 rounded-2xl bg-rose-500 text-white font-medium text-sm hover:bg-rose-600 active:scale-95 transition-all shadow-lg shadow-rose-500/30"
                    >
                        {confirmLabel}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}